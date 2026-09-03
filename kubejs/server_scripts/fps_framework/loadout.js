global.FPS = global.FPS || {};

global.FPS.LOADOUTS = {
    assault: {
        name: '突击手 (AK47)',
        items: [
            'tacz:modern_kinetic_gun{GunId:"tacz:ak47",HasBulletInBarrel:1b,AmmoCount:30}',
            'tacz:ammo{AmmoId:"tacz:762x39"} 64',
            'tacz:ammo{AmmoId:"tacz:762x39"} 64',
            'minecraft:iron_chestplate',
            'minecraft:iron_leggings',
            'minecraft:iron_boots'
        ]
    }
};

global.FPS.giveLoadout = function(player, loadoutId, server) {
    const config = global.FPS.LOADOUTS[loadoutId] || global.FPS.LOADOUTS.assault;
    const name = player.username;

    // 1. 清包
    server.runCommandSilent('clear ' + name);
    server.runCommandSilent('effect clear ' + name);

    // 2. 状态重置（隔离 FirstAid 可能导致的异常）
    try {
        server.runCommandSilent('firstaid reset ' + name);
    } catch (e) {
        console.warn('[FPS Warning] Firstaid reset failed for ' + name + ': ' + e);
    }

    // 3. 原生设置血量饱食度
    player.setHealth(20);
    player.setFoodLevel(20);

    // 4. 发装
    config.items.forEach(itemStr => {
        const cmd = 'give ' + name + ' ' + itemStr;
        const result = server.runCommandSilent(cmd);
        console.info('[FPS Debug] Give item to ' + name + ': [' + itemStr + '], result: ' + result);
    });

    // 5. 短暂抗性提升，防落地暴毙
    server.runCommandSilent('effect give ' + name + ' minecraft:resistance 3 255 true');
    player.tell('§a[FPS] 已加载配置: ' + config.name);
};