global.FPS = global.FPS || {};

global.FPS.MAPS = {
    test: {
        id: 'test',
        name: 'FPS Test Range',
        dimension: 'fps:test',
        // 平坦地图总厚度为5格，地面站立Y应为5
        lobby: { x: 0, y: 5, z: 0 },
        spawns: {
            red: [
                { x: -20, y: 5, z: 0, yaw: 90 },
                { x: -20, y: 5, z: 5, yaw: 90 },
                { x: -20, y: 5, z: -5, yaw: 90 },
                { x: -25, y: 5, z: 0, yaw: 90 }
            ],
            blue: [
                { x: 20, y: 5, z: 0, yaw: -90 },
                { x: 20, y: 5, z: 5, yaw: -90 },
                { x: 20, y: 5, z: -5, yaw: -90 },
                { x: 25, y: 5, z: 0, yaw: -90 }
            ]
        }
    }
};

global.FPS.getMap = function(id) {
    return global.FPS.MAPS[id];
};

global.FPS.teleportLobby = function(player, server) {
    const p = global.FPS.CONFIG.lobby;
    server.runCommandSilent(
        'execute in ' + p.dimension + ' run tp ' +
        player.username + ' ' + p.x + ' ' + p.y + ' ' + p.z
    );
};

global.FPS.teleportSpawn = function(player, team, server) {
    const game = global.FPS.game;
    const map = global.FPS.getMap(game.map);
    const points = map.spawns[team];
    const p = points[Math.floor(Math.random() * points.length)];

    server.runCommandSilent(
        'execute in ' + map.dimension + ' run tp ' +
        player.username + ' ' + p.x + ' ' + p.y + ' ' + p.z + ' ' + p.yaw + ' 0'
    );
};