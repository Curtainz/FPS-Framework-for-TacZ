global.FPS = global.FPS || {};

global.FPS.VERSION = '0.1.0';

global.FPS.STATE = {
    LOBBY: 'LOBBY',
    PREPARING: 'PREPARING',
    COUNTDOWN: 'COUNTDOWN',
    PLAYING: 'PLAYING',
    ENDING: 'ENDING',
    RESULT: 'RESULT'
};

global.FPS.CONFIG = {
    minPlayers: 2,
    maxPlayers: 8,
    prepareTicks: 100,
    countdownTicks: 100,
    timeLimitTicks: 20 * 60 * 20,
    respawnDelayTicks: 100,
    scoreLimit: 20,
    lobby: { dimension: 'minecraft:overworld', x: 0, y: 80, z: 0 }
};

global.FPS.game = null;
global.FPS.players = {};

global.FPS.msg = function(server, text) {
    server.runCommandSilent('tellraw @a ' + JSON.stringify({text: '[FPS] ' + text}));
};

global.FPS.playerId = function(player) {
    return String(player.uuid);
};

global.FPS.getState = function() {
    return global.FPS.game ? global.FPS.game.state : global.FPS.STATE.LOBBY;
};

global.FPS.requireGame = function(player) {
    if (!global.FPS.game) {
        player.tell('[FPS] 当前没有进行中的游戏。');
        return false;
    }
    return true;
};

global.FPS.resetPlayer = function(player, server) {
    const id = global.FPS.playerId(player);
    delete global.FPS.players[id];
    player.runCommandSilent('gamemode adventure');
    player.runCommandSilent('clear');
    player.runCommandSilent('effect clear');
};

global.FPS.createGame = function(server, mode, mapId) {
    if (global.FPS.game) {
        throw new Error('A game already exists.');
    }

    global.FPS.game = {
        id: 'game_001',
        mode: mode,
        map: mapId,
        state: global.FPS.STATE.PREPARING,
        tick: 0,
        countdownAnnounced: -1,
        players: [],
        teams: { red: [], blue: [] },
        score: { red: 0, blue: 0 },
        winner: null
    };

    global.FPS.msg(server, '创建游戏：' + mode + ' / ' + mapId);
};

global.FPS.endGame = function(server, winner) {
    if (!global.FPS.game) return;

    global.FPS.game.winner = winner;
    global.FPS.game.state = global.FPS.STATE.ENDING;
    global.FPS.game.tick = 0;

    global.FPS.msg(server, winner ? '胜利方：' + winner.toUpperCase() : '游戏结束。');
};

global.FPS.hardReset = function(server) {
    if (!global.FPS.game) {
        global.FPS.msg(server, '没有活动游戏。');
        return;
    }

    Object.keys(global.FPS.players).forEach(id => {
        const p = server.getPlayerList().find(x => String(x.uuid) === id);
        if (p) {
            global.FPS.teleportLobby(p, server);
            global.FPS.resetPlayer(p, server);
        }
    });

    global.FPS.game = null;
    global.FPS.players = {};
    global.FPS.msg(server, 'Framework 状态已重置。');
};
