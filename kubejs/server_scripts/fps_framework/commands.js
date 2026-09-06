const Component = Java.loadClass('net.minecraft.network.chat.Component');

ServerEvents.commandRegistry(event => {
    const { commands: Commands } = event;

    const msg = function(ctx, text, broadcast) {
        if (broadcast === undefined) broadcast = false;
        ctx.source.sendSuccess(Component.literal('[FPS] ' + text), broadcast);
    };

    const root = Commands.literal('fps');

    root.executes(ctx => {
        msg(ctx, 'FPS Framework v0.1.1 已加载。输入 /fps help 查看命令。');
        return 1;
    });

    root.then(Commands.literal('help')
        .executes(ctx => {
            msg(ctx, '可用命令：');
            msg(ctx, '/fps help');
            msg(ctx, '/fps status');
            msg(ctx, '/fps maps');
            msg(ctx, '/fps start tdm test');
            msg(ctx, '/fps join');
            msg(ctx, '/fps leave');
            msg(ctx, '/fps team red|blue');
            msg(ctx, '/fps stats');
            msg(ctx, '/fps loadout assault');
            msg(ctx, '/fps stop');
            msg(ctx, '/fps reset');
            msg(ctx, '/fps debug');
            return 1;
        })
    );

    root.then(Commands.literal('status')
        .executes(ctx => {
            const g = global.FPS.game;
            if (!g) {
                msg(ctx, '当前没有进行中的游戏。');
                return 1;
            }

            msg(ctx,
                '状态=' + g.state +
                ' | 模式=' + g.mode +
                ' | 地图=' + g.map +
                ' | 玩家=' + g.players.length + '/' + global.FPS.CONFIG.maxPlayers +
                ' | 红队=' + g.teams.red.length +
                ' | 蓝队=' + g.teams.blue.length +
                ' | 比分=' + g.score.red + ':' + g.score.blue
            );
            return 1;
        })
    );

    root.then(Commands.literal('maps')
        .executes(ctx => {
            const maps = global.FPS.MAPS || {};
            const ids = Object.keys(maps);

            if (ids.length === 0) {
                msg(ctx, '当前没有注册地图。');
                return 1;
            }

            msg(ctx, '已注册地图：');
            ids.forEach(id => {
                const map = maps[id];
                msg(ctx,
                    id + ' — ' + (map.name || id) +
                    ' | 维度=' + (map.dimension || 'unknown')
                );
            });
            return 1;
        })
    );

    root.then(Commands.literal('start')
        .requires(source => source.hasPermission(2))
        .then(Commands.literal('tdm')
            .then(Commands.literal('test')
                .executes(ctx => {
                    const server = ctx.source.server;

                    if (global.FPS.game) {
                        msg(ctx, '已有活动游戏，请先执行 /fps stop。');
                        return 0;
                    }

                    if (!global.FPS.getMap('test')) {
                        msg(ctx, '地图 test 未注册。');
                        return 0;
                    }

                    global.FPS.createGame(server, 'tdm', 'test');
                    msg(ctx, 'TDM/test 已创建，玩家可执行 /fps join。', true);
                    return 1;
                })
            )
        )
    );

    root.then(Commands.literal('join')
        .executes(ctx => {
            const p = ctx.source.player;
            if (!p) {
                msg(ctx, '该命令只能由玩家执行。');
                return 0;
            }
            global.FPS.joinGame(p, ctx.source.server);
            return 1;
        })
    );

    root.then(Commands.literal('leave')
        .executes(ctx => {
            const p = ctx.source.player;
            if (!p) {
                msg(ctx, '该命令只能由玩家执行。');
                return 0;
            }
            global.FPS.leaveGame(p, ctx.source.server);
            return 1;
        })
    );

    root.then(Commands.literal('team')
        .then(Commands.literal('red').executes(ctx => {
            const p = ctx.source.player;
            if (!p || !global.FPS.game) {
                msg(ctx, '当前没有活动游戏。');
                return 0;
            }

            const ps = global.FPS.ensurePlayer(p);
            if (ps.gameId !== global.FPS.game.id) {
                msg(ctx, '你尚未加入当前游戏，请先执行 /fps join。');
                return 0;
            }

            if (global.FPS.game.state !== global.FPS.STATE.PREPARING) {
                msg(ctx, '比赛开始后不能更换队伍。');
                return 0;
            }

            global.FPS.setTeam(p, 'red');
            msg(ctx, '队伍设置为 RED。');
            return 1;
        }))
        .then(Commands.literal('blue').executes(ctx => {
            const p = ctx.source.player;
            if (!p || !global.FPS.game) {
                msg(ctx, '当前没有活动游戏。');
                return 0;
            }

            const ps = global.FPS.ensurePlayer(p);
            if (ps.gameId !== global.FPS.game.id) {
                msg(ctx, '你尚未加入当前游戏，请先执行 /fps join。');
                return 0;
            }

            if (global.FPS.game.state !== global.FPS.STATE.PREPARING) {
                msg(ctx, '比赛开始后不能更换队伍。');
                return 0;
            }

            global.FPS.setTeam(p, 'blue');
            msg(ctx, '队伍设置为 BLUE。');
            return 1;
        }))
    );

    root.then(Commands.literal('stats')
        .executes(ctx => {
            const p = ctx.source.player;
            if (!p) {
                msg(ctx, '该命令只能由玩家执行。');
                return 0;
            }

            const ps = global.FPS.ensurePlayer(p);
            msg(ctx, 'K=' + ps.kills + ' D=' + ps.deaths + ' DMG=' + ps.damage);
            return 1;
        })
    );

    // Alias retained for the originally requested command name.
    root.then(Commands.literal('statistics')
        .executes(ctx => {
            const p = ctx.source.player;
            if (!p) return 0;
            const ps = global.FPS.ensurePlayer(p);
            msg(ctx, 'K=' + ps.kills + ' D=' + ps.deaths + ' DMG=' + ps.damage);
            return 1;
        })
    );

    root.then(Commands.literal('loadout')
        .then(Commands.literal('assault').executes(ctx => {
            const p = ctx.source.player;
            if (!p) return 0;

            const ps = global.FPS.ensurePlayer(p);
            ps.loadout = 'assault';
            global.FPS.giveLoadout(p, 'assault', ctx.source.server);
            msg(ctx, '已装备 assault 配置。');
            return 1;
        }))
    );

    root.then(Commands.literal('stop')
        .requires(source => source.hasPermission(2))
        .executes(ctx => {
            global.FPS.hardReset(ctx.source.server);
            return 1;
        })
    );

    root.then(Commands.literal('reset')
        .requires(source => source.hasPermission(2))
        .executes(ctx => {
            global.FPS.hardReset(ctx.source.server);
            return 1;
        })
    );

    root.then(Commands.literal('debug')
        .requires(source => source.hasPermission(2))
        .executes(ctx => {
            const g = global.FPS.game;
            const text = g
                ? 'game=' + g.id +
                  ' mode=' + g.mode +
                  ' map=' + g.map +
                  ' state=' + g.state +
                  ' players=' + g.players.length +
                  ' score=' + g.score.red + ':' + g.score.blue
                : 'game=null';

            msg(ctx, text);
            return 1;
        })
    );

    event.register(root);
});

console.info('[FPS] Command registry installed: /fps help, /fps status, /fps maps, ...');
