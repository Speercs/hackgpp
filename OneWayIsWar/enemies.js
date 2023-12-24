'use strict'
//2023.07.18
global.enemies = {}
enemies.clean = function () {
    const cpu = settings.writePerformanceLog ? Game.cpu.getUsed() : 0
    Object.keys(cache.enemies).forEach(id => {
        const enemy = _obj(id), data = cache.enemies[id]
        if (!enemy) {
            if (gameTime > data.time) { delete cache.enemies[id] }
            else if (Game.rooms[data.pos.roomName]) {
                if (!data.pos.edgeOfTheRoom(1)) delete cache.enemies[id]
                else if (!data.hiden) {
                    data.hiden = true; data.hideCounter = data.hideCounter || 0; data.hideCounter++
                }
            }
        }
        else { delete data.hiden }
    })
    settings.writePerformanceLog ? performance.newLog(cpu, 'enemies.clean') : false
}
MyRoom.prototype.updateEnemies = function (enemy = false) {
    const cpu = settings.writePerformanceLog ? Game.cpu.getUsed() : 0
    const room = Game.rooms[this.name]
    if (this.my || _.filter(Game.creeps, creep => creep.room.name == this.name).length) {
        let enemies = [];
        if (enemy) enemies.push(enemy)
        else enemies = room.find(FIND_HOSTILE_CREEPS)
        if (enemies.length) {
            enemies.forEach(enemy => {
                if (!cache.enemies[enemy.id]) {
                    const parameters = calculateParametersOfBody(enemy)
                    cache.enemies[enemy.id] = {
                        id: enemy.id,
                        pos: enemy.pos,
                        time: gameTime + enemy.ticksToLive,
                        hits: enemy.hits,
                        body: enemy.body,
                        // role: enemies.setRole(enemy.body),
                        parameters: {
                            move: parameters[0],
                            attack: parameters[1],
                            rangedAttack: parameters[2],
                            tough: parameters[3],
                            dismantle: parameters[4],
                            heal: parameters[5],
                            rangedHeal: parameters[6],
                            index: parameters[7],
                        },
                        owner: enemy.owner.username
                    }
                    if (this.my && cache.enemies[enemy.id].owner !== 'Invader') {
                        let priority = 2; const enPar = cache.enemies[enemy.id].parameters
                        if (enPar.attack || enPar.rangedAttack || enPar.dismantle || enPar.heal) { priority = 3 }
                        info.new(priority, 'enemy', this.name, enemy.id, `owner: ${cache.enemies[enemy.id].owner}; par: m:${enPar.move},a:${enPar.attack},ra:${enPar.rangedAttack},t:${enPar.tough},d:${enPar.dismantle},h:${enPar.heal}`)
                    }
                }
                else {
                    cache.enemies[enemy.id].pos = enemy.pos
                    cache.enemies[enemy.id].hits = enemy.hits
                    delete cache.enemies[enemy.id].hiden
                }
            })
        }
        //update potential heal && towers attack
        if (this.my && this.underAttack) {
            enemies.forEach(enemy => {
                const enemyCache = cache.enemies[enemy.id];
                enemyCache.parameters.potentialHeal = enemyCache.parameters.heal || 0
                enemyCache.parameters.towersDamage = this.calculateTowersDamage(enemy)
                const otherEnemies = enemies.filter(e => e !== enemy)
                otherEnemies.forEach(e => {
                    const range = enemy.pos.getRangeTo(e)
                    if (range == 1) { enemyCache.parameters.potentialHeal += cache.enemies[e.id].parameters.heal }
                    else if (range <= 3) { enemyCache.parameters.potentialHeal += cache.enemies[e.id].parameters.rangedHeal }
                })
                if (enemyCache.healModificatorForAttackTowers) enemyCache.parameters.potentialHeal *= enemyCache.healModificatorForAttackTowers
            })
        }
    }
    settings.writePerformanceLog ? performance.newLog(cpu, 'MyRoom.prototype.updateEnemies') : false
}

global.calculateParametersOfBody = function (creep) {
    let move = 0, attack = 0, rangedAttack = 0, tough = 0, dismantle = 0, heal = 0, rangedHeal = 0

    creep.body.filter(b => b.hits).forEach(part => {
        const boost = part.boost, type = part.type
        switch (type) {
            case MOVE:
                if (boost) {
                    if (part.boost == 'XZHO2') { move += 4 * 1.25 }
                    else if (part.boost == 'ZHO2') { move += 3 * 1.25 }
                    else if (part.boost == 'ZO') { move += 2 * 1.25 }
                }
                else { move += 2 }
                break;
            case ATTACK:
                if (boost) {
                    if (boost == 'XUH2O') { attack += 4 * 30 }
                    else if (boost == 'UH2O') { attack += 3 * 30 }
                    else if (boost == 'UH') { attack += 2 * 30 }
                }
                else { attack += 30 }
                break;
            case RANGED_ATTACK:
                if (boost) {
                    if (boost == 'XKHO2') { rangedAttack += 4 * 10 }
                    else if (boost == 'KHO2') { rangedAttack += 3 * 10 }
                    else if (boost == 'KO') { rangedAttack += 2 * 10 }
                }
                else { rangedAttack += 10 }
                break;
            case TOUGH:
                if (boost) {
                    if (boost == 'XGHO2') { tough += 330 }
                    else if (boost == 'GHO2') { tough += 200 }
                    else if (boost == 'GO') { tough += 150 }
                }
                break;
            case WORK:
                if (boost) {
                    if (boost == 'XZH2O') { dismantle += 4 * 50 }
                    else if (boost == 'ZH2O') { dismantle += 3 * 50 }
                    else if (boost == 'ZH') { dismantle += 2 * 50 }
                }
                else { dismantle += 50 }
                break;
            case HEAL:
                if (boost) {
                    if (boost == 'XLHO2') { heal += 4 * 12; rangedHeal += 4 * 4 }
                    else if (boost == 'LHO2') { heal += 3 * 12; rangedHeal += 4 * 3 }
                    else if (boost == 'LO') { heal += 2 * 12; rangedHeal += 4 * 2 }
                }
                else { heal += 12; rangedHeal += 4 }
                break;
        }
    })
    const answer = [], index = (heal * 0.5) + attack + rangedAttack + (tough * 0.5)
    answer.push(move); answer.push(attack); answer.push(rangedAttack); answer.push(tough); answer.push(dismantle);
    answer.push(heal); answer.push(rangedHeal); answer.push(index);
    // enemy.stats = { time: gameTime, move: move, attack: attack, rangedAttack: rangedAttack, tough: tough, dismantle: dismantle, heal: heal }
    return answer
}
enemies.setRole = function (enemy) {

}