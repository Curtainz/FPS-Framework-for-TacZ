global.FPS = global.FPS || {};

global.FPS.ensurePlayer = function(player) {
    const id = global.FPS.playerId(player);

    if (!global.FPS.players[id]) {
        global.FPS.players[id] = {
            uuid: id,
            name: player.username,
            gameId: null,
            team: null,
            alive: true,
            respawnTimer: 0,
            kills: 0,
            deaths: 0,
            assists: 0,
            damage: 0,
            loadout: 'assault'
        };
    }

    return global.FPS.players[id];
};

global.FPS.setTeam = function(player, team) {
    const g = global.FPS.game;
    const ps = global.FPS.ensurePlayer(player);

    if (!g || (team !== 'red' && team !== 'blue')) return false;

    g.teams.red = g.teams.red.filter(x => x !== ps.uuid);
    g.teams.blue = g.teams.blue.filter(x => x !== ps.uuid);

    g.teams[team].push(ps.uuid);
    ps.team = team;
    return true;
};

global.FPS.joinGame = function(player, server) {
    if (!global.FPS.game) {
        player.tell('[FPS] 没有可加入的游戏，请管理员使用 /fps start tdm test。');
        return;
    }

    const g = global.FPS.game;
    const ps = global.FPS.ensurePlayer(player);

    if (ps.gameId === g.id) {
        player.tell('[FPS] 你已经在游戏中。');
        return;
    }

    if (g.state !== global.FPS.STATE.PREPARING &&
        g.state !== global.FPS.STATE.LOBBY) {
        player.tell('[FPS] 当前游戏已经开始，暂时不能加入。');
        return;
    }

    if (g.players.length >= global.FPS.CONFIG.maxPlayers) {
        player.tell('[FPS] 游戏已满。');
        return;
    }

    ps.gameId = g.id;
    ps.alive = true;
    ps.kills = 0;
    ps.deaths = 0;
    ps.assists = 0;
    ps.damage = 0;

    g.players.push(ps.uuid);

    const team = g.teams.red.length <= g.teams.blue.length ? 'red' : 'blue';
    global.FPS.setTeam(player, team);

    player.tell('[FPS] 已加入 ' + ps.team.toUpperCase() + ' 队。');
    global.FPS.updateHUD(player);

    if (g.players.length >= global.FPS.CONFIG.minPlayers &&
        g.state === global.FPS.STATE.PREPARING) {
        g.state = global.FPS.STATE.COUNTDOWN;
        g.tick = global.FPS.CONFIG.countdownTicks;
        g.countdownAnnounced = -1;
        global.FPS.msg(server, '人数满足，倒计时开始。');
    }
};

global.FPS.leaveGame = function(player, server) {
    const ps = global.FPS.ensurePlayer(player);

    if (!ps.gameId || !global.FPS.game) {
        global.FPS.teleportLobby(player, server);
        return;
    }

    const g = global.FPS.game;
    g.players = g.players.filter(x => x !== ps.uuid);
    g.teams.red = g.teams.red.filter(x => x !== ps.uuid);
    g.teams.blue = g.teams.blue.filter(x => x !== ps.uuid);

    ps.gameId = null;
    ps.team = null;
    ps.alive = true;

    global.FPS.teleportLobby(player, server);
    global.FPS.resetPlayer(player, server);

    player.tell('[FPS] 已离开游戏。');

    if (g.players.length < global.FPS.CONFIG.minPlayers &&
        g.state === global.FPS.STATE.COUNTDOWN) {
        g.state = global.FPS.STATE.PREPARING;
        g.tick = 0;
        g.countdownAnnounced = -1;
        global.FPS.msg(server, '人数不足，倒计时取消。');
    }
};
