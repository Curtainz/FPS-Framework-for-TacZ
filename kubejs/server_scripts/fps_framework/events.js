PlayerEvents.loggedIn(event => {
    global.FPS.ensurePlayer(event.player);
    event.player.tell('[FPS] Framework v0.1.3 已加载。输入 /fps help。');
});

PlayerEvents.loggedOut(event => {
    if (!global.FPS.game) return;

    var player = event.player;
    var id = global.FPS.playerId(player);
    var ps = global.FPS.players[id];

    if (!ps || ps.gameId !== global.FPS.game.id) return;

    global.FPS.game.players = global.FPS.game.players.filter(x => x !== id);
    global.FPS.game.teams.red = global.FPS.game.teams.red.filter(x => x !== id);
    global.FPS.game.teams.blue = global.FPS.game.teams.blue.filter(x => x !== id);

    delete global.FPS.players[id];

    if (global.FPS.game.players.length === 0) {
        global.FPS.game = null;
    }
});

ServerEvents.tick(event => {
    var server = event.server;
    if (!global.FPS.game) return;

    var g = global.FPS.game;

    // PREPARING
    if (g.state === global.FPS.STATE.PREPARING) {
        g.tick++;

        if (g.players.length >= global.FPS.CONFIG.minPlayers) {
            g.state = global.FPS.STATE.COUNTDOWN;
            g.tick = global.FPS.CONFIG.countdownTicks;
            g.countdownAnnounced = -1;
            global.FPS.msg(server, '人数满足，倒计时开始。');
        }
    }

    // COUNTDOWN
    else if (g.state === global.FPS.STATE.COUNTDOWN) {
        if (g.players.length < global.FPS.CONFIG.minPlayers) {
            g.state = global.FPS.STATE.PREPARING;
            g.tick = 0;
            g.countdownAnnounced = -1;
            global.FPS.msg(server, '人数不足，倒计时取消。');
            return;
        }

        var seconds = Math.ceil(g.tick / 20);

        if (seconds !== g.countdownAnnounced && seconds <= 5 && seconds > 0) {
            g.countdownAnnounced = seconds;
            global.FPS.msg(server, String(seconds) + '...');
        }

        g.tick--;

        if (g.tick <= 0) {
            g.state = global.FPS.STATE.PLAYING;
            g.tick = 0;

            g.players.forEach(id => {
                var p = null;
                var onlinePlayers = server.getPlayerList().getPlayers();
                for (var i = 0; i < onlinePlayers.size(); i++) {
                    var candidate = onlinePlayers.get(i);
                    if (String(candidate.uuid) === id) {
                        p = candidate;
                        break;
                    }
                }
                if (!p) return;

                var ps = global.FPS.players[id];
                if (!ps) return;

                ps.alive = true;
                ps.respawnTimer = 0;

                p.runCommandSilent('gamemode adventure');
                global.FPS.teleportSpawn(p, ps.team, server);
                global.FPS.giveLoadout(p, ps.loadout, server);
            });

            global.FPS.msg(server, '比赛开始！');
        }
    }

    // PLAYING
    else if (g.state === global.FPS.STATE.PLAYING) {
        g.tick++;

        if (g.tick >= global.FPS.CONFIG.timeLimitTicks) {
            var winner =
                g.score.red === g.score.blue ? null :
                (g.score.red > g.score.blue ? 'red' : 'blue');

            global.FPS.endGame(server, winner);
            return;
        }

        g.players.forEach(id => {
            var p = null;
                var onlinePlayers = server.getPlayerList().getPlayers();
                for (var i = 0; i < onlinePlayers.size(); i++) {
                    var candidate = onlinePlayers.get(i);
                    if (String(candidate.uuid) === id) {
                        p = candidate;
                        break;
                    }
                }
            var ps = global.FPS.players[id];

            if (!p || !ps) return;

            if (!ps.alive) {
                if (ps.respawnTimer > 0) {
                    ps.respawnTimer--;
                } else {
                    global.FPS.respawn(p, server);
                }
            }

            if (g.tick % 10 === 0) {
                global.FPS.updateHUD(p);
            }
        });
    }

    // ENDING
    else if (g.state === global.FPS.STATE.ENDING) {
        g.tick++;

        if (g.tick === 1) {
            g.players.forEach(id => {
                var p = null;
                var onlinePlayers = server.getPlayerList().getPlayers();
                for (var i = 0; i < onlinePlayers.size(); i++) {
                    var candidate = onlinePlayers.get(i);
                    if (String(candidate.uuid) === id) {
                        p = candidate;
                        break;
                    }
                }
                if (p) p.tell('[FPS] 本局结束。');
            });
        }

        if (g.tick >= 100) {
            g.state = global.FPS.STATE.RESULT;
            g.tick = 0;
        }
    }

    // RESULT
    else if (g.state === global.FPS.STATE.RESULT) {
        g.tick++;

        if (g.tick >= 100) {
            global.FPS.hardReset(server);
        }
    }
});
