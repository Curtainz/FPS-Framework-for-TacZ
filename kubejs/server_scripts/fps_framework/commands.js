const Component = Java.loadClass('net.minecraft.network.chat.Component');
const IntegerArgumentType = Java.loadClass('com.mojang.brigadier.arguments.IntegerArgumentType');

ServerEvents.commandRegistry(event => {
    const { commands: Commands } = event;
    const msg = (ctx, text, broadcast) => ctx.source.sendSuccess(Component.literal('[FPS] ' + text), broadcast === true);
    const getPlayer = ctx => ctx.source.player;

    const game = Commands.literal('game');
    game.then(Commands.literal('start').requires(s => s.hasPermission(2)).then(Commands.literal('tdm').then(Commands.literal('test').executes(ctx => {
        if (global.FPS.game) { msg(ctx, '已有活动游戏，请先执行 /fps game stop。'); return 0; }
        global.FPS.createGame(ctx.source.server, 'tdm', 'test');
        msg(ctx, 'TDM/test 已创建。', true);
        return 1;
    }))));
    game.then(Commands.literal('begin').requires(s => s.hasPermission(2)).executes(ctx => {
        if (!global.FPS.game) global.FPS.createGame(ctx.source.server, 'tdm', 'test');
        global.FPS.startRound(ctx.source.server);
        return 1;
    }));
    ['stop', 'reset'].forEach(command => game.then(Commands.literal(command).requires(s => s.hasPermission(2)).executes(ctx => {
        global.FPS.hardReset(ctx.source.server);
        return 1;
    })));

    const player = Commands.literal('player');
    player.then(Commands.literal('join').executes(ctx => {
        const target = getPlayer(ctx);
        if (!target) { msg(ctx, '该命令只能由玩家执行。'); return 0; }
        global.FPS.joinGame(target, ctx.source.server);
        return 1;
    }));
    player.then(Commands.literal('leave').executes(ctx => {
        const target = getPlayer(ctx);
        if (!target) { msg(ctx, '该命令只能由玩家执行。'); return 0; }
        global.FPS.leaveGame(target, ctx.source.server);
        return 1;
    }));
    const team = Commands.literal('team');
    ['red', 'blue'].forEach(teamId => team.then(Commands.literal(teamId).executes(ctx => {
        const target = getPlayer(ctx);
        if (!target || !global.FPS.game) { msg(ctx, '需要玩家和活动游戏。'); return 0; }
        const playerState = global.FPS.ensurePlayer(target);
        if (global.FPS.game.state !== global.FPS.STATE.PREPARING) { msg(ctx, '比赛开始后不能更换队伍。'); return 0; }
        if (playerState.gameId !== global.FPS.game.id) global.FPS.joinGame(target, ctx.source.server);
        msg(ctx, global.FPS.setTeam(target, teamId) ? '队伍设置为 ' + teamId.toUpperCase() + '。' : '队伍设置失败。');
        return 1;
    })));
    player.then(team);
    player.then(Commands.literal('loadout').then(Commands.literal('assault').executes(ctx => {
        const target = getPlayer(ctx);
        if (!target) return 0;
        const playerState = global.FPS.ensurePlayer(target);
        playerState.loadout = 'assault';
        global.FPS.giveLoadout(target, 'assault', ctx.source.server);
        return 1;
    })));

    const config = Commands.literal('config');
    config.then(Commands.literal('scorelimit').requires(s => s.hasPermission(2)).then(Commands.argument('limit', IntegerArgumentType.integer(1, 100000)).executes(ctx => {
        const limit = IntegerArgumentType.getInteger(ctx, 'limit');
        global.FPS.CONFIG.scoreLimit = limit;
        msg(ctx, 'score limit 已设置为 ' + limit + '。', true);
        return 1;
    })));
    config.then(Commands.literal('drops').requires(s => s.hasPermission(2))
        .then(Commands.literal('on').executes(ctx => { global.FPS.setDrops(ctx.source.server, true); msg(ctx, '玩家死亡掉落物已开启。', true); return 1; }))
        .then(Commands.literal('off').executes(ctx => { global.FPS.setDrops(ctx.source.server, false); msg(ctx, '玩家死亡掉落物已关闭。', true); return 1; })));

    const info = Commands.literal('info');
    info.then(Commands.literal('status').executes(ctx => {
        const currentGame = global.FPS.game;
        if (!currentGame) { msg(ctx, '当前没有进行中的游戏。'); return 1; }
        msg(ctx, '状态=' + currentGame.state + ' | 玩家=' + currentGame.players.length + '/' + global.FPS.CONFIG.maxPlayers + ' | 红队=' + currentGame.teams.red.length + ' | 蓝队=' + currentGame.teams.blue.length + ' | 比分=' + currentGame.score.red + ':' + currentGame.score.blue + ' | 上限=' + global.FPS.CONFIG.scoreLimit);
        return 1;
    }));
    info.then(Commands.literal('maps').executes(ctx => {
        Object.keys(global.FPS.MAPS || {}).forEach(id => msg(ctx, id + ' | ' + global.FPS.MAPS[id].dimension));
        return 1;
    }));
    info.then(Commands.literal('debug').requires(s => s.hasPermission(2)).executes(ctx => {
        msg(ctx, global.FPS.game ? JSON.stringify(global.FPS.game) : 'game=null');
        return 1;
    }));

    const root = Commands.literal('fps');
    root.then(game);
    root.then(player);
    root.then(config);
    root.then(info);
    event.register(root);
});

console.info('[FPS] Command registry installed: /fps game, /fps player, /fps config, /fps info');