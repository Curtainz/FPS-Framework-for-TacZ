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
    server.runCommandSilent(
        'execute in ' + p.dimension + ' run tp ' + player.username + ' ' + p.x + ' ' + p.y + ' ' + p.z
    );
};

global.FPS.teleportSpawn = function(player, team, server) {
    const game = global.FPS.game;
    if (!game) return;
    const map = global.FPS.getMap(game.map);
    const points = map.spawns[team] || map.spawns.red;
    const p = points[Math.floor(Math.random() * points.length)];

    // 优先通过原生 teleportTo 传维度与坐标，彻底免疫权限拦截
    try {
        player.teleportTo(map.dimension, p.x, p.y, p.z, p.yaw, 0);
        console.info('[FPS Debug] Player ' + player.username + ' teleported to ' + map.dimension + ' via native API.');
    } catch (err) {
        console.error('[FPS Error] Native teleport failed, fallback to command: ' + err);
        server.runCommandSilent(
            'execute in ' + map.dimension + ' run tp ' + player.username + ' ' + p.x + ' ' + p.y + ' ' + p.z + ' ' + p.yaw + ' 0'
        );
    }
};