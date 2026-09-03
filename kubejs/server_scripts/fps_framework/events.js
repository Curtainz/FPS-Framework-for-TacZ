// 玩家登录初始化
PlayerEvents.loggedIn(event => {
    global.FPS.ensurePlayer(event.player);
    event.player.tell('§e[FPS] 系统就绪，输入 /fps help 查看指令。');
});

// 玩家离线处理
PlayerEvents.loggedOut(event => {
    if (!global.FPS.game) return;
    let player = event.player;
    let id = global.FPS.playerId(player);
    let ps = global.FPS.players[id];

    if (!ps || ps.gameId !== global.FPS.game.id) return;

    global.FPS.game.players = global.FPS.game.players.filter(x => String(x) !== id);
    global.FPS.game.teams.red = global.FPS.game.teams.red.filter(x => String(x) !== id);
    global.FPS.game.teams.blue = global.FPS.game.teams.blue.filter(x => String(x) !== id);

    delete global.FPS.players[id];

    if (global.FPS.game.players.length === 0) {
        global.FPS.game = null;
    }
});

// 伤害累计
EntityEvents.hurt(event => {
    if (!global.FPS.game || global.FPS.game.state !== global.FPS.STATE.PLAYING) return;
    let victim = event.entity;
    let attacker = event.source.actual;

    if (victim && victim.isPlayer() && attacker && attacker.isPlayer()) {
        let aData = global.FPS.ensurePlayer(attacker);
        let vData = global.FPS.ensurePlayer(victim);
        if (aData.gameId === global.FPS.game.id && aData.team !== vData.team) {
            aData.damage += Math.round(event.damage);
        }
    }
});

// 死亡判定
EntityEvents.death(event => {
    if (!global.FPS.game || global.FPS.game.state !== global.FPS.STATE.PLAYING) return;
    let victim = event.entity;
    if (!victim || !victim.isPlayer()) return;

    let attacker = event.source.actual;
    if (attacker && attacker.isPlayer()) {
        global.FPS.onKill(attacker, victim, event.server);
    } else {
        global.FPS.handleDeath(victim, event.server);
    }
});

// 原生与 FirstAid 重生恢复
PlayerEvents.respawned(event => {
    if (!global.FPS.game || global.FPS.game.state !== global.FPS.STATE.PLAYING) return;
    let player = event.player;
    let id = global.FPS.playerId(player);
    let ps = global.FPS.players[id];

    if (ps && ps.gameId === global.FPS.game.id) {
        ps.alive = true;
        ps.respawnTimer = 0;

        event.server.runCommandSilent('gamemode adventure ' + player.username);
        global.FPS.teleportSpawn(player, ps.team, event.server);
        global.FPS.giveLoadout(player, ps.loadout, event.server);

        player.tell('§a[FPS] 你已重返战场！');
    }
});

// 主状态机 Tick (使用纯 let 与前置声明，彻底根除 Rhino redeclaration of var 报错)
ServerEvents.tick(event => {
    let server = event.server;
    if (!global.FPS.game) return;
    let g = global.FPS.game;

    // 1. PREPARING 阶段
    if (g.state === global.FPS.STATE.PREPARING) {
        g.tick++;
        if (g.players.length >= global.FPS.CONFIG.minPlayers) {
            g.state = global.FPS.STATE.COUNTDOWN;
            g.tick = global.FPS.CONFIG.countdownTicks;
            g.countdownAnnounced = -1;
            global.FPS.msg(server, '§a人数达标，比赛倒计时开始！');
        }
    }

    // 2. COUNTDOWN 阶段
    else if (g.state === global.FPS.STATE.COUNTDOWN) {
        if (g.players.length < global.FPS.CONFIG.minPlayers) {
            g.state = global.FPS.STATE.PREPARING;
            g.tick = 0;
            g.countdownAnnounced = -1;
            global.FPS.msg(server, '§c人数不足，倒计时已取消。');
            return;
        }

        let cdSec = Math.ceil(g.tick / 20);
        if (cdSec !== g.countdownAnnounced && cdSec <= 5 && cdSec > 0) {
            g.countdownAnnounced = cdSec;
            global.FPS.msg(server, '§e倒计时: ' + cdSec);
        }

        g.tick--;
        if (g.tick <= 0) {
            g.state = global.FPS.STATE.PLAYING;
            g.tick = 0;

            server.runCommandSilent('gamerule doImmediateRespawn true');
            console.info('[FPS Start] Countdown done. Teleporting players: ' + JSON.stringify(g.players));

            let allOnline = server.getPlayerList().getPlayers();
            for (let i = 0; i < allOnline.size(); i++) {
                let target = allOnline.get(i);
                let targetId = global.FPS.playerId(target);

                if (g.players.indexOf(targetId) !== -1) {
                    let ps = global.FPS.players[targetId];
                    if (ps) {
                        ps.alive = true;
                        ps.respawnTimer = 0;

                        server.runCommandSilent('gamemode adventure ' + target.username);
                        global.FPS.teleportSpawn(target, ps.team, server);
                        global.FPS.giveLoadout(target, ps.loadout, server);

                        console.info('[FPS Start] Initialized player: ' + target.username + ' (' + ps.team + ')');
                    }
                }
            }

            global.FPS.msg(server, '§c§l战斗正式开始！');
        }
    }

    // 3. PLAYING 阶段
    else if (g.state === global.FPS.STATE.PLAYING) {
        g.tick++;

        if (g.tick >= global.FPS.CONFIG.timeLimitTicks) {
            let winner = g.score.red === g.score.blue ? null : (g.score.red > g.score.blue ? 'red' : 'blue');
            global.FPS.endGame(server, winner);
            return;
        }

        let currentPlayers = server.getPlayerList().getPlayers();
        for (let j = 0; j < currentPlayers.size(); j++) {
            let p = currentPlayers.get(j);
            let pid = global.FPS.playerId(p);
            let pstate = global.FPS.players[pid];
            if (!pstate || pstate.gameId !== g.id) continue;

            if (g.tick % 10 === 0) {
                global.FPS.updateHUD(p);
            }
        }
    }

    // 4. ENDING 阶段
    else if (g.state === global.FPS.STATE.ENDING) {
        g.tick++;
        if (g.tick >= 100) {
            g.state = global.FPS.STATE.RESULT;
            g.tick = 0;
        }
    }

    // 5. RESULT 阶段
    else if (g.state === global.FPS.STATE.RESULT) {
        g.tick++;
        if (g.tick >= 100) {
            server.runCommandSilent('gamerule doImmediateRespawn false');
            global.FPS.hardReset(server);
        }
    }
});