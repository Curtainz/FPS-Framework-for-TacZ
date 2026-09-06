global.FPS = global.FPS || {};

global.FPS.playerId = function(player) {
    if (!player) return '';
    return String(player.getStringUuid ? player.getStringUuid() : player.getUuid().toString());
};

global.FPS.ensurePlayer = function(player) {
    const id = global.FPS.playerId(player);

    if (!global.FPS.players[id]) {
        global.FPS.players[id] = {
            uuid: id,
            name: String(player.username),
            gameId: null,
            team: null,
            alive: true,
            kills: 0,
            deaths: 0,
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

    g.teams.red = g.teams.red.filter(x => String(x) !== ps.uuid);
    g.teams.blue = g.teams.blue.filter(x => String(x) !== ps.uuid);

    g.teams[team].push(ps.uuid);
    ps.team = team;
    console.info('[FPS] Player ' + ps.name + ' assigned to team ' + team.toUpperCase());
    return true;
};

global.FPS.joinGame = function(player, server) {
    if (!global.FPS.game) {
        player.tell('§c[FPS] 没有可加入的游戏，请先使用 /fps start tdm test。');
        return;
    }

    const g = global.FPS.game;
    const ps = global.FPS.ensurePlayer(player);

    if (ps.gameId === g.id) {
        player.tell('§e[FPS] 你已经在游戏中了。');
        return;
    }

    if (g.state !== global.FPS.STATE.PREPARING && g.state !== global.FPS.STATE.LOBBY) {
        player.tell('§c[FPS] 当前游戏已经开始或正在倒计时，暂时不能加入。');
        return;
    }

    if (g.players.length >= global.FPS.CONFIG.maxPlayers) {
        player.tell('§c[FPS] 游戏人数已满。');
        return;
    }

    ps.gameId = g.id;
    ps.alive = true;
    ps.kills = 0;
    ps.deaths = 0;
    ps.damage = 0;

    if (!g.players.includes(ps.uuid)) {
        g.players.push(ps.uuid);
    }

    // 队伍平衡：红队少进红，蓝队少进蓝
    const team = g.teams.red.length <= g.teams.blue.length ? 'red' : 'blue';
    global.FPS.setTeam(player, team);

    player.tell('§a[FPS] 成功加入！队伍: ' + ps.team.toUpperCase());
    console.info('[FPS Join] Current players in game: ' + g.players.length + ' / Min needed: ' + global.FPS.CONFIG.minPlayers);

};

global.FPS.leaveGame = function(player, server) {
    const ps = global.FPS.ensurePlayer(player);

    if (!ps.gameId || !global.FPS.game) {
        global.FPS.teleportLobby(player, server);
        return;
    }

    const g = global.FPS.game;
    const id = ps.uuid;
    g.players = g.players.filter(x => String(x) !== id);
    g.teams.red = g.teams.red.filter(x => String(x) !== id);
    g.teams.blue = g.teams.blue.filter(x => String(x) !== id);

    ps.gameId = null;
    ps.team = null;
    ps.alive = true;

    global.FPS.teleportLobby(player, server);
    global.FPS.resetPlayer(player, server);

    player.tell('§e[FPS] 你已离开比赛。');

    if (g.players.length < global.FPS.CONFIG.minPlayers && g.state === global.FPS.STATE.COUNTDOWN) {
        g.state = global.FPS.STATE.PREPARING;
        g.tick = 0;
        g.countdownAnnounced = -1;
        global.FPS.msg(server, '§c玩家退出导致人数不足，倒计时取消。');
    }
};