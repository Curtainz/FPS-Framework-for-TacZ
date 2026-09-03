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

    global.FPS.game.players = global.FPS.game.players.filter(x => String(x) !== id);
    global.FPS.game.teams.red = global.FPS.game.teams.red.filter(x => String(x) !== id);
    global.FPS.game.teams.blue = global.FPS.game.teams.blue.filter(x => String(x) !== id);

    delete global.FPS.players[id];

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

// 死亡与击杀计分（仅统计数据，不强切模式，防止卡死在死亡界面）
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

// 核心修复：捕获原生/FirstAid重生完成事件，此时玩家实体管道已正常重置
PlayerEvents.respawned(event => {
    if (!global.FPS.game || global.FPS.game.state !== global.FPS.STATE.PLAYING) return;
    const player = event.player;
    const id = global.FPS.playerId(player);
    const ps = global.FPS.players[id];

    // 只有局内玩家在当局生效
    if (ps && ps.gameId === global.FPS.game.id) {
        ps.alive = true;
        ps.respawnTimer = 0;

        // 确保模式为冒险模式
        event.server.runCommandSilent('gamemode adventure ' + player.username);

        // 传送回己方出生点并重置装备与FirstAid肢体
        global.FPS.teleportSpawn(player, ps.team, event.server);
        global.FPS.giveLoadout(player, ps.loadout, event.server);

        player.tell('§a[FPS] 你已重返战场！');
    }
});

// 房间状态主循环 Tick
ServerEvents.tick(event => {
    const server = event.server;
    if (!global.FPS.game) return;
    const g = global.FPS.game;

    // 1. 准备阶段：等待满足最低玩家数
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

            // 开启即时重生，彻底消除死亡界面卡死 Bug
            server.runCommandSilent('gamerule doImmediateRespawn true');

            console.info('[FPS Start] Teleporting all participants: ' + JSON.stringify(g.players));

            // 通过 UUID 获取所有参赛玩家实体
            g.players.forEach(uuidStr => {
                let targetPlayer = null;
                const playerList = server.getPlayerList().getPlayers();
                for (let i = 0; i < playerList.size(); i++) {
                    const candidate = playerList.get(i);
                    if (global.FPS.playerId(candidate) === uuidStr) {
                        targetPlayer = candidate;
                        break;
                    }
                }

                if (!targetPlayer) {
                    console.warn('[FPS Start] Player UUID not found online: ' + uuidStr);
                    return;
                }

                const ps = global.FPS.players[uuidStr];
                if (!ps) {
                    console.warn('[FPS Start] Player state missing for: ' + targetPlayer.username);
                    return;
                }

                ps.alive = true;
                ps.respawnTimer = 0;

                // 统一设为冒险模式
                server.runCommandSilent('gamemode adventure ' + targetPlayer.username);

                // 传送并分发装备
                global.FPS.teleportSpawn(targetPlayer, ps.team, server);
                global.FPS.giveLoadout(targetPlayer, ps.loadout, server);

                console.info('[FPS Start] Initialized player: ' + targetPlayer.username + ' (Team: ' + ps.team + ')');
            });

            global.FPS.msg(server, '§c§l战斗正式开始！');
        }
    }

    // 3. 战斗阶段
    else if (g.state === global.FPS.STATE.PLAYING) {
        g.tick++;

        // 比赛超时判定
        if (g.tick >= global.FPS.CONFIG.timeLimitTicks) {
            const winner = g.score.red === g.score.blue ? null : (g.score.red > g.score.blue ? 'red' : 'blue');
            global.FPS.endGame(server, winner);
            return;
        }

        // HUD 与状态维护
        const onlineList = server.getPlayerList().getPlayers();
        for (let j = 0; j < onlineList.size(); j++) {
            const p = onlineList.get(j);
            const id = global.FPS.playerId(p);
            const ps = global.FPS.players[id];
            if (!ps || ps.gameId !== g.id) continue;

            // 每 10 ticks (0.5s) 刷新 Actionbar 计分栏
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
            // 恢复默认即时重生规则为 false，避免干扰大厅原版机制
            server.runCommandSilent('gamerule doImmediateRespawn false');
            global.FPS.hardReset(server);
        }
    }
});