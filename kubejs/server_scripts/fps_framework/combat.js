global.FPS = global.FPS || {};

// 击杀结算
global.FPS.onKill = function(attacker, victim, server) {
    if (!global.FPS.game || global.FPS.game.state !== global.FPS.STATE.PLAYING) return;

    const aData = global.FPS.ensurePlayer(attacker);
    const vData = global.FPS.ensurePlayer(victim);

    // 非本局玩家或队友误伤不计分
    if (aData.gameId !== global.FPS.game.id || vData.gameId !== global.FPS.game.id) return;
    if (aData.team === vData.team) {
        attacker.tell('§c[FPS] 警告：请勿攻击队友！');
        return;
    }

    // 玩家数据统计
    aData.kills++;
    vData.deaths++;
    vData.alive = false;
    vData.respawnTimer = global.FPS.CONFIG.respawnDelayTicks;

    // 队伍计分
    global.FPS.game.score[aData.team]++;

    // 击杀播报（区分队伍颜色）
    const aColor = aData.team === 'red' ? '§c' : '§9';
    const vColor = vData.team === 'red' ? '§c' : '§9';
    global.FPS.msg(
        server,
        aColor + attacker.username + ' §7击杀了 ' + vColor + victim.username +
        ' §e[' + aData.team.toUpperCase() + ' ' + global.FPS.game.score[aData.team] +
        ' : ' + global.FPS.game.score[vData.team] + ']'
    );

    // 检查是否达到胜利分数
    if (global.FPS.game.score[aData.team] >= global.FPS.CONFIG.scoreLimit) {
        global.FPS.endGame(server, aData.team);
    }
};

// 玩家非玩家击杀死亡（跌落、虚空、自雷等）
global.FPS.handleDeath = function(victim, server) {
    if (!global.FPS.game || global.FPS.game.state !== global.FPS.STATE.PLAYING) return;

    const vData = global.FPS.ensurePlayer(victim);
    if (vData.gameId !== global.FPS.game.id) return;

    vData.deaths++;
    vData.alive = false;
    vData.respawnTimer = global.FPS.CONFIG.respawnDelayTicks;

    global.FPS.msg(server, '§7' + victim.username + ' 意外阵亡。');
};

// 复活处理
global.FPS.respawn = function(player, server) {
    const ps = global.FPS.ensurePlayer(player);

    ps.alive = true;
    ps.respawnTimer = 0;

    player.runCommandSilent('gamemode adventure');
    global.FPS.teleportSpawn(player, ps.team, server);
    global.FPS.giveLoadout(player, ps.loadout, server);

    player.tell('§a[FPS] 你已重新加入战斗！');
};