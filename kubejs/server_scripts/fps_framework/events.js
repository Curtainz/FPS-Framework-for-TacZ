// 玩家进服注册与初始化
PlayerEvents.loggedIn(event => {
    global.FPS.ensurePlayer(event.player);
    event.player.tell('§e[FPS] 系统就绪，输入 /fps help 查看指令。');
});

// 玩家离线退出处理
PlayerEvents.loggedOut(event => {
    if (!global.FPS.game) return;
    const player = event.player;
    const id = global.FPS.playerId(player);
    const ps = global.FPS.players[id];

    if (!ps || ps.gameId !== global.FPS.game.id) return;

    // 清除局内队伍与名单记录
    global.FPS.game.players = global.FPS.game.players.filter(x => x !== id);
    global.FPS.game.teams.red = global.FPS.game.teams.red.filter(x => x !== id);
    global.FPS.game.teams.blue = global.FPS.game.teams.blue.filter(x => x !== id);

    delete global.FPS.players[id];

    // 若当局玩家全退则关闭游戏
    if (global.FPS.game.players.length === 0) {
        global.FPS.game = null;
    }
});

// 伤害累计统计
EntityEvents.hurt(event => {
    if (!global.FPS.game || global.FPS.game.state !== global.FPS.STATE.PLAYING) return;
    const victim = event.entity;
    const attacker = event.source.actual;

    if (victim && victim.isPlayer() && attacker && attacker.isPlayer()) {
        const aData = global.FPS.ensurePlayer(attacker);
        const vData = global.FPS.ensurePlayer(victim);
        if (aData.gameId === global.FPS.game.id && aData.team !== vData.team) {
            aData.damage += Math.round(event.damage);
        }
    }
});

// 死亡与击杀事件监听
EntityEvents.death(event => {
    if (!global.FPS.game || global.FPS.game.state !== global.FPS.STATE.PLAYING) return;
    const victim = event.entity;
    if (!victim || !victim.isPlayer()) return;

    const attacker = event.source.actual;
    if (attacker && attacker.isPlayer()) {
        global.FPS.onKill(attacker, victim, event.server);
    } else {
        global.FPS.handleDeath(victim, event.server);
    }
});

// 房间状态主循环 Tick
ServerEvents.tick(event => {
    const server = event.server;
    if (!global.FPS.game) return;
    const g = global.FPS.game;

    // 1. 准备阶段：等待达到最低人数
    if (g.state === global.FPS.STATE.PREPARING) {
        g.tick++;
        if (g.players.length >= global.FPS.CONFIG.minPlayers) {
            g.state = global.FPS.STATE.COUNTDOWN;
            g.tick = global.FPS.CONFIG.countdownTicks;
            g.countdownAnnounced = -1;
            global.FPS.msg(server, '§a人数达标，比赛倒计时开始！');
        }
    }

    // 2. 倒计时阶段
    else if (g.state === global.FPS.STATE.COUNTDOWN) {
        if (g.players.length < global.FPS.CONFIG.minPlayers) {
            g.state = global.FPS.STATE.PREPARING;
            g.tick = 0;
            g.countdownAnnounced = -1;
            global.FPS.msg(server, '§c人数不足，倒计时已取消。');
            return;
        }

        const cdRemainingSeconds = Math.ceil(g.tick / 20);
        if (cdRemainingSeconds !== g.countdownAnnounced && cdRemainingSeconds <= 5 && cdRemainingSeconds > 0) {
            g.countdownAnnounced = cdRemainingSeconds;
            global.FPS.msg(server, '§e倒计时: ' + cdRemainingSeconds);
        }

        g.tick--;
        if (g.tick <= 0) {
            g.state = global.FPS.STATE.PLAYING;
            g.tick = 0;

            // 倒计时结束：所有参战玩家设为冒险模式、传送并领装
            const playerList = server.getPlayerList().getPlayers();
            for (let i = 0; i < playerList.size(); i++) {
                const p = playerList.get(i);
                const id = global.FPS.playerId(p);
                const ps = global.FPS.players[id];
                if (ps && ps.gameId === g.id) {
                    ps.alive = true;
                    ps.respawnTimer = 0;

                    // 核心修复：由 server 控制台强制切模式，非 OP 正常生效
                    server.runCommandSilent('gamemode adventure ' + p.username);
                    global.FPS.teleportSpawn(p, ps.team, server);
                    global.FPS.giveLoadout(p, ps.loadout, server);
                }
            }

            global.FPS.msg(server, '§c§l战斗开始！');
        }
    }

    // 3. 战斗阶段
    else if (g.state === global.FPS.STATE.PLAYING) {
        g.tick++;

        // 比赛限时判定
        if (g.tick >= global.FPS.CONFIG.timeLimitTicks) {
            const winner = g.score.red === g.score.blue ? null : (g.score.red > g.score.blue ? 'red' : 'blue');
            global.FPS.endGame(server, winner);
            return;
        }

        // 处理重生倒计时与 HUD 刷新
        const onlineList = server.getPlayerList().getPlayers();
        for (let j = 0; j < onlineList.size(); j++) {
            const p = onlineList.get(j);
            const id = global.FPS.playerId(p);
            const ps = global.FPS.players[id];
            if (!ps || ps.gameId !== g.id) continue;

            // 阵亡状态处理
            if (!ps.alive) {
                if (ps.respawnTimer > 0) {
                    ps.respawnTimer--;
                    if (ps.respawnTimer % 20 === 0) {
                        const deathSec = Math.ceil(ps.respawnTimer / 20);
                        p.tell('§7重生倒计时: ' + deathSec + 's');
                    }
                } else {
                    global.FPS.respawn(p, server);
                }
            }

            // 每 10 ticks (0.5s) 刷新底部计分板
            if (g.tick % 10 === 0) {
                global.FPS.updateHUD(p);
            }
        }
    }

    // 4. 结算展示
    else if (g.state === global.FPS.STATE.ENDING) {
        g.tick++;
        if (g.tick >= 100) {
            g.state = global.FPS.STATE.RESULT;
            g.tick = 0;
        }
    }

    // 5. 局后清理与大厅重置
    else if (g.state === global.FPS.STATE.RESULT) {
        g.tick++;
        if (g.tick >= 100) {
            global.FPS.hardReset(server);
        }
    }
});