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

    // 全部使用 server 权限执行指令
    server.runCommandSilent('clear ' + name);
    server.runCommandSilent('effect clear ' + name);
    server.runCommandSilent('firstaid reset ' + name);
    
    // KubeJS 原生方法恢复状态
    player.setHealth(20);
    player.setFoodLevel(20);

    // 发放装备
    config.items.forEach(itemStr => {
        server.runCommandSilent('give ' + name + ' ' + itemStr);
    });

    // 出生 3 秒无敌抗性与微弱发光保护
    server.runCommandSilent('effect give ' + name + ' minecraft:resistance 3 255 true');

    player.tell('§a[FPS] 已加载配置: ' + config.name);
};