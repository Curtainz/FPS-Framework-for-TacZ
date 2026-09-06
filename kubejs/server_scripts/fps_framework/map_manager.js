global.FPS = global.FPS || {};

global.FPS.MAPS = {
    test: {
        id: 'test',
        name: 'FPS Test Range',
        dimension: 'fps:test',
        lobby: { dimension: 'minecraft:overworld', x: 0, y: 80, z: 0 },
        spawns: {
            red: [
                { x: -20.5, y: 5.0, z: 0.5, yaw: 90 },
                { x: -20.5, y: 5.0, z: 5.5, yaw: 90 },
                { x: -20.5, y: 5.0, z: -5.5, yaw: 90 },
                { x: -25.5, y: 5.0, z: 0.5, yaw: 90 }
            ],
            blue: [
                { x: 20.5, y: 5.0, z: 0.5, yaw: -90 },
                { x: 20.5, y: 5.0, z: 5.5, yaw: -90 },
                { x: 20.5, y: 5.0, z: -5.5, yaw: -90 },
                { x: 25.5, y: 5.0, z: 0.5, yaw: -90 }
            ]
        }
    }
};

global.FPS.getMap = function(id) {
    return global.FPS.MAPS[id];
};

global.FPS.teleportLobby = function(player, server) {
    const p = global.FPS.CONFIG.lobby || { dimension: 'minecraft:overworld', x: 0, y: 80, z: 0 };
    global.FPS.teleportSafe(player, server, p.dimension, p.x, p.z, 0, 320, -64);
};

global.FPS.teleportSafe = function(player, server, dimension, x, z, yaw, maxY, minY) {
    for (let y = maxY; y >= minY; y--) {
        const command =
            'execute in ' + dimension + ' positioned ' + x + ' ' + y + ' ' + z +
            ' if block ~ ~ ~ minecraft:air if block ~ ~1 ~ minecraft:air' +
            ' unless block ~ ~-1 ~ minecraft:air run tp ' + player.username +
            ' ' + x + ' ' + y + ' ' + z + ' ' + yaw + ' 0';
        if (server.runCommandSilent(command) > 0) {
            console.info('[FPS Debug] Player ' + player.username + ' safely teleported to ' + dimension + ' at Y=' + y + '.');
            return true;
        }
    }

    console.error('[FPS Error] No safe teleport position found for ' + player.username + ' in ' + dimension + '.');
    return false;
};

global.FPS.teleportSpawn = function(player, team, server) {
    const game = global.FPS.game;
    if (!game) return;
    const map = global.FPS.getMap(game.map);
    const points = map.spawns[team] || map.spawns.red;
    const p = points[Math.floor(Math.random() * points.length)];

    global.FPS.teleportSafe(player, server, map.dimension, p.x, p.z, p.yaw, 320, -64);
};