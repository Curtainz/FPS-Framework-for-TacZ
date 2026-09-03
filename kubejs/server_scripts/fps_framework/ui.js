global.FPS = global.FPS || {};

global.FPS.updateHUD = function(player) {
    if (!global.FPS.game) {
        player.runCommandSilent(
            'title ' + player.username + ' actionbar ' +
            JSON.stringify({text:'FPS Framework | LOBBY'})
        );
        return;
    }

    const g = global.FPS.game;
    const ps = global.FPS.ensurePlayer(player);

    const text =
        g.mode.toUpperCase() +
        ' | ' + g.score.red + ' : ' + g.score.blue +
        ' | ' + ps.team.toUpperCase() +
        ' | K ' + ps.kills + ' / D ' + ps.deaths;

    player.runCommandSilent(
        'title ' + player.username + ' actionbar ' +
        JSON.stringify({text:text})
    );
};
