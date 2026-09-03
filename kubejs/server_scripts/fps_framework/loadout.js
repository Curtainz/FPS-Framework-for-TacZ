global.FPS = global.FPS || {};

// 标准 TaCZ 步枪/手枪配置（包含子弹与弹匣）
global.FPS.LOADOUTS = {
    assault: {
        name: '突击手 (AK47)',
        items: [
            // 默认膛内装满弹药的 AK47
            'tacz:modern_kinetic_gun{GunId:"tacz:ak47",HasBulletInBarrel:1b,AmmoCount:30}',
            // 备用弹药 180 发
            'tacz:ammo{AmmoId:"tacz:762x39"} 64',
            'tacz:ammo{AmmoId:"tacz:762x39"} 64',
            'tacz:ammo{AmmoId:"tacz:762x39"} 52',
            // 防护护甲
            'minecraft:iron_chestplate',
            'minecraft:iron_leggings',
            'minecraft:iron_boots'
        ]
    },
    marksman: {
        name: '精准射手 (M4A1)',
        items: [
            'tacz:modern_kinetic_gun{GunId:"tacz:m4a1",HasBulletInBarrel:1b,AmmoCount:30}',
            'tacz:ammo{AmmoId:"tacz:556x45"} 64',
            'tacz:ammo{AmmoId:"tacz:556x45"} 64',
            'minecraft:iron_chestplate',
            'minecraft:iron_leggings'
        ]
    }
};

global.FPS.giveLoadout = function(player, loadoutId, server) {
    const config = global.FPS.LOADOUTS[loadoutId] || global.FPS.LOADOUTS.assault;

    // 1. 清空背包与状态
    player.runCommandSilent('clear');
    player.runCommandSilent('effect clear ' + player.username);

    // 2. 彻底重置 FirstAid 肢体生命与 Debuff
    player.runCommandSilent('firstaid reset ' + player.username);
    player.setHealth(20);
    player.setFoodLevel(20);

    // 3. 发放装备
    config.items.forEach(itemStr => {
        player.runCommandSilent('give ' + player.username + ' ' + itemStr);
    });

    // 4. 重生短暂抗性，防止复活暴毙（3秒抗性提升与发光提示）
    player.runCommandSilent('effect give ' + player.username + ' minecraft:resistance 3 255 true');

    player.tell('§a[FPS] 已加载配置: ' + config.name);
};