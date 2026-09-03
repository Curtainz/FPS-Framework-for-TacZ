global.FPS = global.FPS || {};

// 击杀事件处理
global.FPS.onKill = function(attacker, victim, server) {
    if (!global.FPS.game || global.FPS.game.state !== global.FPS.STATE.PLAYING) return;

    const aData = global.FPS.ensurePlayer(attacker);
    const vData = global.FPS.ensurePlayer(victim);

    // 过滤非当局玩家
    if (aData.gameId !== global.FPS.game.id || vData.gameId !== global.FPS.game.id) return;

    // 队友误伤不计分
    if (aData.team === vData.team) {
        attacker.tell('§c[FPS] 警告：请勿攻击队友！');
        return;
    }

    // 更新击杀者与受害者数据
    aData.kills++;
    vData.deaths++;
    vData.alive = false;
    vData.respawnTimer = global.FPS.CONFIG.respawnDelayTicks;

    // 团队比分增加
    global.FPS.game.score[aData.team]++;

    // 死亡玩家强制设为旁观模式（使用 server 权限，防止非 OP 玩家无权限）
    server.runCommandSilent('gamemode spectator ' + victim.username);
    victim.tell('§c[FPS] 你已被击杀，等待重生...');

    // 广播击杀信息
    const aColor = aData.team === 'red' ? '§c' : '§9';
    const vColor = vData.team === 'red' ? '§c' : '§9';
    global.FPS.msg(
        server,
        aColor + attacker.username + ' §7击杀了 ' + vColor + victim.username +
        ' §e[' + aData.team.toUpperCase() + ' ' + global.FPS.game.score[aData.team] +
        ' : ' + global.FPS.game.score[vData.team] + ']'
    );

    // 判定胜利条件
    if (global.FPS.game.score[aData.team] >= global.FPS.CONFIG.scoreLimit) {
        global.FPS.endGame(server, aData.team);
    }
};

// 玩家非敌方击杀死亡（自伤、虚空、跌落等）
global.FPS.handleDeath = function(victim, server) {
    if (!global.FPS.game || global.FPS.game.state !== global.FPS.STATE.PLAYING) return;

    const vData = global.FPS.ensurePlayer(victim);
    if (vData.gameId !== global.FPS.game.id) return;

    vData.deaths++;
    vData.alive = false;
    vData.respawnTimer = global.FPS.CONFIG.respawnDelayTicks;

    // 强制转为旁观者模式
    server.runCommandSilent('gamemode spectator ' + victim.username);
    victim.tell('§c[FPS] 你已阵亡，等待重生...');

    global.FPS.msg(server, '§7' + victim.username + ' 意外阵亡。');
};

// 玩家复活逻辑
global.FPS.respawn = function(player, server) {
    const ps = global.FPS.ensurePlayer(player);

    ps.alive = true;
    ps.respawnTimer = 0;

    // 使用 server 身份切为冒险模式
    server.runCommandSilent('gamemode adventure ' + player.username);
    
    // 传送到己方出生点并补满装备
    global.FPS.teleportSpawn(player, ps.team, server);
    global.FPS.giveLoadout(player, ps.loadout, server);

    player.tell('§a[FPS] 你已重生并重返战场！');
};