global.FPS = global.FPS || {};

global.FPS.onKill = function(attacker, victim, server) {
    if (!global.FPS.game || global.FPS.game.state !== global.FPS.STATE.PLAYING) return;

    const aData = global.FPS.ensurePlayer(attacker);
    const vData = global.FPS.ensurePlayer(victim);

    if (aData.gameId !== global.FPS.game.id || vData.gameId !== global.FPS.game.id) return;

    aData.kills++;
    vData.deaths++;
    vData.alive = false;

    global.FPS.game.score[aData.team]++;

    const aColor = aData.team === 'red' ? '§c' : '§9';
    const vColor = vData.team === 'red' ? '§c' : '§9';
    global.FPS.msg(
        server,
        aColor + attacker.username + ' §7击杀了 ' + vColor + victim.username +
        ' §e[' + aData.team.toUpperCase() + ' ' + global.FPS.game.score[aData.team] +
        ' : ' + global.FPS.game.score[vData.team] + ']'
    );

    if (global.FPS.game.score[aData.team] >= global.FPS.CONFIG.scoreLimit) {
        global.FPS.endGame(server, aData.team);
    }
};

global.FPS.handleDeath = function(victim, server) {
    if (!global.FPS.game || global.FPS.game.state !== global.FPS.STATE.PLAYING) return;

    const vData = global.FPS.ensurePlayer(victim);
    if (vData.gameId !== global.FPS.game.id) return;

    vData.deaths++;
    vData.alive = false;
    global.FPS.msg(server, '§7' + victim.username + ' 意外阵亡。');
};