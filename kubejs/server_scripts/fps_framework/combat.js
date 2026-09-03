global.FPS = global.FPS || {};

global.FPS.onKill = function(attacker, victim, server) {
    if (!global.FPS.game) return;

    const a = global.FPS.ensurePlayer(attacker);
    const v = global.FPS.ensurePlayer(victim);

    if (!a.gameId || a.gameId !== global.FPS.game.id) return;
    if (!v.gameId || v.gameId !== global.FPS.game.id) return;
    if (a.team === v.team) return;

    a.kills++;
    v.deaths++;
    v.alive = false;

    global.FPS.game.score[a.team]++;

    global.FPS.msg(
        server,
        attacker.username + ' 击杀了 ' + victim.username +
        '  [' + a.team.toUpperCase() + ' ' +
        global.FPS.game.score[a.team] + ']'
    );

    if (global.FPS.game.score[a.team] >= global.FPS.CONFIG.scoreLimit) {
        global.FPS.endGame(server, a.team);
    }
};

global.FPS.handleDeath = function(player, server) {
    if (!global.FPS.game) return;

    const ps = global.FPS.ensurePlayer(player);
    if (!ps.gameId || ps.gameId !== global.FPS.game.id) return;
    if (global.FPS.game.state !== global.FPS.STATE.PLAYING) return;

    ps.deaths++;
    ps.alive = false;
    ps.respawnTimer = global.FPS.CONFIG.respawnDelayTicks;

    player.runCommandSilent('gamemode spectator');
    player.tell('[FPS] 你已死亡，5 秒后重生。');
};

global.FPS.respawn = function(player, server) {
    const ps = global.FPS.ensurePlayer(player);

    ps.alive = true;
    ps.respawnTimer = 0;

    player.runCommandSilent('gamemode adventure');
    player.runCommandSilent('clear');

    global.FPS.teleportSpawn(player, ps.team, server);
    global.FPS.giveLoadout(player, ps.loadout, server);

    player.tell('[FPS] 已重生。');
};
