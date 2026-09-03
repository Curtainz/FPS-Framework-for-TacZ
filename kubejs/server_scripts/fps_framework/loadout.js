global.FPS = global.FPS || {};

// v0.1 uses vanilla fallback equipment intentionally.
// Once your actual TaCZ gun NBT/ID is confirmed, this module will be replaced
// with TaCZ-specific loadouts.

global.FPS.LOADOUTS = {
    assault: {
        items: [
            'minecraft:iron_sword',
            'minecraft:crossbow',
            'minecraft:arrow 64',
            'minecraft:cooked_beef 16'
        ]
    }
};

global.FPS.giveLoadout = function(player, id, server) {
    const loadout = global.FPS.LOADOUTS[id] || global.FPS.LOADOUTS.assault;

    player.runCommandSilent('clear');

    loadout.items.forEach(item => {
        player.runCommandSilent('give ' + player.username + ' ' + item);
    });

    player.tell('[FPS] Loadout: ' + id);
};
