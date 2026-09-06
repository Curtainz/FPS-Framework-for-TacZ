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
    countdownTicks: 100,
    timeLimitTicks: 20 * 60 * 20,
    scoreLimit: 20,
    dropsEnabled: true,
    lobby: { dimension: 'minecraft:overworld', x: 0, y: 80, z: 0 }
};

global.FPS.game = null;
global.FPS.players = {};
global.FPS.cleanupOnLogin = {};

global.FPS.msg = function(server, text) {
    server.runCommandSilent('tellraw @a ' + JSON.stringify({text: '[FPS] ' + text}));
};

global.FPS.resetPlayer = function(player, server) {
    player.runCommandSilent('gamemode adventure');
    player.runCommandSilent('clear');
    player.runCommandSilent('effect clear');
    player.setHealth(20);
    player.setFoodLevel(20);
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

global.FPS.setDrops = function(server, enabled) {
    global.FPS.CONFIG.dropsEnabled = enabled;
    server.runCommandSilent('gamerule doEntityDrops ' + enabled);
};

global.FPS.startRound = function(server) {
    const currentGame = global.FPS.game;
    if (!currentGame) return;

    currentGame.state = global.FPS.STATE.PLAYING;
    currentGame.tick = 0;
    server.runCommandSilent('gamerule doImmediateRespawn true');
    server.runCommandSilent('gamerule doEntityDrops ' + global.FPS.CONFIG.dropsEnabled);

    const onlinePlayers = server.getPlayerList().getPlayers();
    for (let i = 0; i < onlinePlayers.size(); i++) {
        const player = onlinePlayers.get(i);
        const id = global.FPS.playerId(player);
        const playerState = global.FPS.players[id];
        if (currentGame.players.indexOf(id) === -1 || !playerState || !playerState.team) continue;

        player.runCommandSilent('gamemode adventure');
        global.FPS.teleportSpawn(player, playerState.team, server);
        global.FPS.giveLoadout(player, playerState.loadout, server);
        playerState.alive = true;
    }
    global.FPS.msg(server, '§c§l战斗正式开始！');
};

global.FPS.hardReset = function(server) {
    if (!global.FPS.game) {
        server.runCommandSilent('execute as @a at @s if dimension fps:test run gamemode adventure @s');
        server.runCommandSilent('execute as @a at @s if dimension fps:test run clear @s');
        server.runCommandSilent('execute as @a at @s if dimension fps:test run effect clear @s');
        server.runCommandSilent('execute as @a at @s if dimension fps:test run execute in minecraft:overworld run tp @s 0 80 0');
        const onlinePlayers = server.getPlayerList().getPlayers();
        for (let i = 0; i < onlinePlayers.size(); i++) {
            onlinePlayers.get(i).setHealth(20);
            onlinePlayers.get(i).setFoodLevel(20);
        }
        server.runCommandSilent('gamerule doImmediateRespawn false');
        server.runCommandSilent('gamerule doEntityDrops true');
        global.FPS.msg(server, '没有活动游戏。');
        return;
    }

    const participantIds = {};
    global.FPS.game.players.forEach(id => {
        participantIds[String(id)] = true;
    });

    const onlinePlayers = server.getPlayerList().getPlayers();
    const playersToReset = [];
    for (let i = 0; i < onlinePlayers.size(); i++) {
        const p = onlinePlayers.get(i);
        const id = global.FPS.playerId(p);
        if (participantIds[id]) {
            playersToReset.push(p);
        }
    }

    playersToReset.forEach(player => {
        player.runCommandSilent('gamemode spectator');
        global.FPS.teleportLobby(player, server);
        global.FPS.resetPlayer(player, server);
    });

    server.runCommandSilent('execute as @a at @s if dimension fps:test run gamemode adventure @s');
    server.runCommandSilent('execute as @a at @s if dimension fps:test run clear @s');
    server.runCommandSilent('execute as @a at @s if dimension fps:test run effect clear @s');
    server.runCommandSilent('execute as @a at @s if dimension fps:test run execute in minecraft:overworld run tp @s 0 80 0');

    server.runCommandSilent('gamerule doImmediateRespawn false');
    server.runCommandSilent('gamerule doEntityDrops true');
    global.FPS.game = null;
    global.FPS.players = {};
    global.FPS.msg(server, 'Framework 状态已重置。');
};
