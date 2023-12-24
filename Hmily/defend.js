'use strict'
//2023.08.23 update choose rampart without structures
MyRoom.prototype.defend = function () {
    const cpu = settings.writePerformanceLog ? Game.cpu.getUsed() : 0

    const task = this.tasks.defend
    // const ramparts = idToObj(this.structures.ramparts)
    let enemies = this.enemies.filter(e => cache.enemies[e.id].parameters.dismantle || cache.enemies[e.id].parameters.attack)
    if (!enemies.length) { enemies = this.enemies }
    let towers = []
    // const activeTowers = towers.filter(t => t.store['energy'] >= 10)
    const defend_attack = this.creeps.filter(creep => creep.memory.role == 'defend_attack')
    if (defend_attack.length) { towers = idToObj(this.structures.towers) }

    const distancesEnemiesToRamparts = {}
    const distancesEnemiesToDefendersAttack = {}
    const distancesEnemiesToTowers = {}
    const towerHits = {}
    defend_attack.forEach(creep => {
        if (creep.spawning || (enemies.length && creep.getBoosted()) || creep.rescueFromNuke()) { return }
        if (creep.memory.enemyId) {
            const enemy = _obj(creep.memory.enemyId)
            if (enemy) {
                const rampart = enemy.pos.findClosestByRange(FIND_STRUCTURES, { filter: str => str.structureType == STRUCTURE_RAMPART && str.hits > 10000 && !checkPos(str.pos, creep) })
                if (rampart) {
                    creep.travelTo(rampart);
                    if (creep.attack(enemy) == OK) { this.towersAttack(enemy); this.cache.skipTowers = true; return }
                    else {
                        const resEnemy = creep.attack1Range()
                        if (resEnemy) {
                            this.towersAttack(resEnemy); this.cache.skipTowers = true; return
                        }
                    }
                    if (creep.pos.getRangeTo(enemy) > 1) { delete creep.memory.enemyId }
                }
            }
            else { delete creep.memory.enemyId }
        }
        else if (enemies.length) {
            const enemy = creep.pos.findClosestByPath(enemies)
            if (enemy) {
                creep.memory.enemyId = enemy.id
                const rampart = enemy.pos.findClosestByRange(FIND_STRUCTURES, { filter: str => str.structureType == STRUCTURE_RAMPART && !checkPos(str.pos, creep) })
                if (rampart) {
                    if (creep.attack(enemy) == OK) { this.towersAttack(enemy); this.cache.skipTowers = true; return }
                    if (tools.comparePositions(rampart.pos, creep.pos) && creep.hits == creep.hitsMax && rampart.pos.inRangeTo(enemy, 2)) { creep.travelTo(enemy) }
                    else { creep.travelTo(rampart) }
                }
            }
        }
        else {
            const tower = creep.pos.findClosestByPath(towers)
            if (tower) {
                if (creep.pos.getRangeTo(tower) > 3) { creep.travelTo(tower, { range: 3 }) }
            }
        }
    })

    function checkPos(pos, thisCreep) {
        const crPos = defend_attack.find(creep => creep !== thisCreep && creep.pos.x == pos.x && creep.pos.y == pos.y)
        if (crPos) { return true }
        else {
            if (pos.lookAtFor(LOOK_STRUCTURES).find(p => p.structure.structureType !== 'road' && p.structure.structureType !== 'rampart' && p.structure.structureType !== 'container')) return true
            else return false
        }
    }
    settings.writePerformanceLog ? performance.newLog(cpu, 'MyRoom.prototype.defend', this.name) : false
    return
    enemies.forEach(enemy => {
        ramparts.forEach(rampart => { distancesEnemiesToRamparts[enemy.id] = { enemy: enemy, rampart: rampart, distance: rampart.pos.getRangeTo(enemy) } })
        defend_attack.forEach(defend => { distanceEnemiesToDefendersAttack[enemy.id] = { enemy: enemy, defend: defend, distance: defend.pos.getRangeTo(enemy) } })
        let hits = 0
        activeTowers.forEach(tower => {
            const distance = tower.pos.getRangeTo(enemy)
            distancesEnemiesToTowers[enemy.id] = { enemy: enemy, tower: tower, distance: distance }
            let power, mod = 1
            if (distance <= 5) { power = 600 }
            else {
                if (distance >= 20) { power = 150 }
                else { power = 600 - ((distnace - 5) * 30) }
            }
            if (tower.effects) {
                const operateTower = tower.effects.find(e => e.effect == PWR_OPERATE_TOWER)
                if (boostUp) { mod = mod + (0.1 * operateTower.level) }
                const disruptTower = tower.effects.find(e => e.effect == PWR_DISRUPT_TOWER)
                if (boostUp) { mod = mod - (0.1 * disruptTower.level) }
            }
            hits += (power * mod)
        })
        towerHits[enemy.id] = hits
    })

    const enemiesAtackRampart = _.filter(distancesEnemiesToRamparts, enemy => enemy.distance <= 3).map(key => key.enemy)
    const defend_attack_readyToAttack = _.filter(distancesEnemiesToDefendersAttack, enemy => enemy.distance == 1).map(key => key.defend)
    defend_attack.forEach(creep => {
        if (creep.getBoosted()) { return }
        if (enemies.length) {
            if (creep.memory.enemy) {
                creep.memory.inRange = false
                const enemy = _obj(creep.memory.enemy)
                if (enemy) {
                    if (enemy.pos.roomName == this.name) {
                        if (creep.pos.getRangeTo(enemy) == 1) {
                            creep.memory.inRange = true; creep.attack(enemy); creep.moveTo(enemy); return
                        }
                    }

                }
            }
        }


    })
    function chooseTarget(creep, enemies) {
        const ranges = {}


    }
    tasks.filter(task.creep).forEach(name => {
        const creep = Game.creeps[name]
        if (creep.spawning) { return }
        if (creep.pos !== task.pos) { if (move) { creep.move(move) }; return }

    })
    settings.writePerformanceLog ? performance.newLog(cpu, 'MyRoom.prototype.defend') : false
}
MyRoom.prototype.updateRampartsForDefense = function () {
    const cpu = settings.writePerformanceLog ? Game.cpu.getUsed() : 0
    const ramparts = idToObj(this.structures.ramparts)
    this.structures.rampartsForDefense = []
    ramparts.forEach(rampart => { if (chekPos(rampart.pos)) { this.structures.rampartsForDefense.push(rampart.id) } })

    function chekPos(position) {
        const objAtPos = Game.rooms[position.roomName].lookAt(position.x, position.y)
        let res = true
        objAtPos.forEach(o => {
            if (o.type == 'terrain') { if (o.terrain == 'wall') { res = false } }
            if (o.type == 'structure') {
                if (o.structure.structureType == 'rampart') {
                    if (o.structure.owner.username !== settings.username) { res = false }
                }
                else { if (o.structure.structureType !== 'road' && o.structure.structureType !== 'container') { res = false } }
            }
            if (o.type == 'creep') { if (o.creep.owner.username == settings.username) { return true } else { res = false } }
        })
        return res
    }
    settings.writePerformanceLog ? performance.newLog(cpu, 'MyRoom.prototype.updateRampartsForDefense', this.name) : false
}
MyRoom.prototype.manageTaskDefend = function () {
    const cpu = settings.writePerformanceLog ? Game.cpu.getUsed() : 0
    // if (!this.structures.spawns.length) { return }
    if (this.room.controller.safeMode || !this.underAttack) { return }
    const task = this.tasks.defend

    const enemies = idToObj(_.filter(cache.enemies, e => e.pos.roomName == this.name && e.owner !== 'Invader').map(e => e.id))
    const dangerousEnemies = []; let meleeEnemies = 0, rangedEnemies = 0
    if (this.settings.debug.defend) { console.log(this.name, `enemies.length:${enemies.length}`) }
    if (enemies.length) {
        enemies.forEach(e => {
            if (e.body.filter(b => b.type !== 'move' && b.type !== 'carry').length == 0) { enemies.splice(enemies.indexOf(e), 1); return }
            if (e.body.filter(b => b.type == CLAIM || b.type == WORK || b.type == ATTACK).length) { dangerousEnemies.push(e); meleeEnemies++; return }
            if (e.body.filter(b => b.type == CLAIM || b.type == WORK || b.type == ATTACK).length || cache.enemies[e.id].parameters.rangedAttack > 300) { dangerousEnemies.push(e); rangedEnemies++; return }
            // if (e.body.includes(WORK) || e.body.includes(ATTACK) || e.body.includes(RANGED_ATTACK)) { dangerousEnemies.push(e); return }
        })
        const amountOfEnemies = dangerousEnemies.length
        if (amountOfEnemies > 5) { task.roles['defend_attack'].amount = 5 }
        else { task.roles['defend_attack'].amount = amountOfEnemies }
        if (this.settings.debug.defend) { console.log(this.name, `amountOfEnemies:${amountOfEnemies}`) }
    }
    else if (this.underAttack) {
        if (this.level < 7) task.roles['defend_attack'].amount = 2
        else task.roles['defend_attack'].amount = 1
    }
    else { { task.roles['defend_attack'].amount = 0 } }

    //activate safe mode
    if (dangerousEnemies.length && !this.structures.spawns.length) {
        this.room.controller.activateSafeMode()
        Game.notify(`${this.name} activate safe mode. tick: ${gameTime}`)
        info.new(3, 'safe mode', this.name, '', `${this.name} activated safe mode`)
    }
    const creeps = _.filter(this.creeps, creep => creep.memory.role == 'defend_rangeAttack' || creep.memory.role == 'defend_attack')

    const role = 'defend_attack'
    const toDie = creeps.filter(c => c.memory.role == role && c.ticksToLive < 300).length
    const inQueues = this.queues.spawn.filter(s => s.role == role).length
    const different = task.roles[role].amount + toDie - creeps.length - inQueues
    if (this.settings.debug.defend) { console.log(this.name, 'different defend:', creeps.length, different) }

    if (different > 0) {
        const creepBody = spawnLogick.getBody(role, this.room.energyCapacityAvailable)
        const specifications = {
            role: role,
            priority: settings.spawn.priority.defend,
            creepBody: creepBody,
            memory: {
                roomName: this.name,
                role: role,
            }
        }
        this.registerSpawn(specifications)
        // for (let i = 0; i < different; i++) { this.registerSpawn(specifications) }
    }


    settings.writePerformanceLog ? performance.newLog(cpu, 'MyRoom.prototype.manageTaskDefend', this.name) : false
}
global.gl_towers = { ramparts: {} }
MyRoom.prototype.towersLogick = function () {
    const cpu = settings.writePerformanceLog ? Game.cpu.getUsed() : 0, debug = this.settings.debug.towers
    let debugText = `towersLogick: ${this.name}\n`
    if (!this.structures.towers.length || this.cache.skipTowers) {
        if (debug) debugText += `return: this.structures.towers.length:${this.structures.towers.length} || this.cache.skipTowers:${this.cache.skipTowers}`
        if (debug) console.log(debugText)
        return
    }

    let towers = []

    //invaders
    const enemiesIdInvaders = _.filter(cache.enemies, e => e.pos.roomName == this.name && e.owner == 'Invader').map(e => e.id)
    const enemiesArrayInvaders = idToObj(enemiesIdInvaders)
    if (enemiesArrayInvaders.length || this.underAttack) { towers = idToObj(this.structures.towers) }
    if (debug) debugText += `enemiesIdInvaders: ${enemiesIdInvaders}\n enemiesArrayInvaders:${enemiesArrayInvaders}\n`
    if (enemiesArrayInvaders.length) {
        towers.forEach(t => t.attack(enemiesArrayInvaders[0]));
        if (debug) debugText += `return: towers attack invaders`
        if (debug) console.log(debugText)
        return
    }
    //enemy players
    if (this.underAttack) {
        const enemiesId = _.filter(cache.enemies, e => e.pos.roomName == this.name).map(e => e.id)
        if (enemiesId.length && towers.filter(t => t.store['energy'] == 0).length == 0) {
            let enemiesArray = idToObj(enemiesId)
            if (enemiesArray.length) {
                if (debug) debugText += `enemiesArray:${enemiesArray.map(e => `id:${e.id}, td:${cache.enemies[e.id].parameters.towersDamage}, ph:${cache.enemies[e.id].parameters.potentialHeal}`)}`
                let enemiesToAttack = enemiesArray.filter(e => cache.enemies[e.id].parameters.towersDamage > cache.enemies[e.id].parameters.potentialHeal
                    && ((!cache.enemies[e.id].hideCounter || cache.enemies[e.id].hideCounter < 4) || (cache.enemies[e.id].hideCounter >= 4 && !cache.enemies[e.id].pos.edgeOfTheRoom(1)))
                ).sort((a, b) => a.hits - b.hits)
                if (this.settings.debug.towers) { console.log(this.name, 'towers2', enemiesToAttack.length) }
                if (enemiesToAttack.length) {
                    this.towersAttack(enemiesToAttack[0]);
                    if (debug) console.log(debugText)
                    return
                }
            }
            else {
                heal(towers, this);
                if (debug) console.log(debugText)
                return
            }
        }
        else {
            const repairInRoom = _.find(this.creeps, creep => creep.memory.role == 'repair')
            if (repairInRoom) {
                const ramparts = idToObj(this.structures.ramparts)
                let ramparts1Hit = ramparts.filter(str => str.hits < 10000)
                if (this.level < 6) { ramparts1Hit = ramparts.filter(str => str.hits < 100000); ramparts1Hit.sort((a, b) => a.hits - b.hits) }
                if (ramparts1Hit.length) { towersRepair(towers, ramparts1Hit[0], this); return }
                else { heal(towers, this) }
            }
            else { heal(towers, this) }
        }
    }

    heal(towers, this)


    function towersRepair(towers, repairObj, myRoom) {
        towers.forEach(tower => {
            const res = tower.repair(repairObj)
            if (res == OK) {
                if (myRoom.settings.debug.towers) { console.log(gameTime, 'towers:', myRoom.name, tower.id, 'repair', repairObj.id) }
                myRoom.registerManageTask({ object1: tower, amount: 1000, type: 'fill structure', priority: 6 })
            }
        })
    }

    function heal(towers, myRoom) {
        const creepsToHeal = _.filter(Game.creeps, creep => creep.room.name == myRoom.name && creep.hits < creep.hitsMax)
        if (creepsToHeal.length) {
            if (!towers.length) { towers = idToObj(myRoom.structures.towers) }
            towers.forEach(tower => {
                const res = tower.heal(creepsToHeal[0])
                if (res == OK) {
                    myRoom.registerManageTask({ object1: tower, amount: 1000, type: 'fill structure', priority: 6 })
                    if (myRoom.settings.debug.towers) { console.log(gameTime, 'towers:', myRoom.name, tower.id, 'heal', creepsToHeal[0].name) }
                }
            })
        }
        else {
            const powerCreeps = _.filter(Game.powerCreeps, powerCreep => powerCreep.ticksToLive > 0).filter(powerCreep => powerCreep.room.name == myRoom.name && powerCreep.hits < powerCreep.hitsMax)
            if (powerCreeps.length) {
                if (!towers.length) { towers = idToObj(myRoom.structures.towers) }
                powerCreeps.sort((a, b) => a.hits - b.hits)
                towers.forEach(tower => {
                    const res = tower.heal(powerCreeps[0])
                    if (res == OK) {
                        myRoom.registerManageTask({ object1: tower, amount: 1000, type: 'fill structure', priority: 6 })
                        if (myRoom.settings.debug.towers) { console.log(gameTime, 'towers:', myRoom.name, tower.id, 'heal', powerCreeps[0].name) }
                    }
                })
            }
        }
    }
    if (this.settings.debug.towers) { console.log(gameTime, this.name, 'towersLogick cpu:', Game.cpu.getUsed() - cpu) }
    settings.writePerformanceLog ? performance.newLog(cpu, 'myRoom.prototype.towersLogick', this.name) : false
}
gl_towers.repairRamparts = function () {
    const cpu = settings.writePerformanceLog ? Game.cpu.getUsed() : 0
    const maxTowers = settings.towers.maxTowersForRepair, usedTowersId = []
    let usedTowers = 0
    if (usedTowers == maxTowers) { return }
    gl_towers.updateCacheRamparts()

    for (let rampart of cache.ramparts) {
        if (usedTowers == maxTowers) { break }
        if (myRooms[rampart.pos.roomName].resources['energy'] < 10000) { continue }
        const towers = idToObj(gl_towers.findTowerByRampart(rampart.id).filter(id => !usedTowersId.includes(id))).filter(t => t.store.energy > 400)
        if (towers.length) {
            for (const tower of towers) {
                const rampartObj = _obj(rampart.id)
                if (rampartObj) {
                    if (tower.repair(rampartObj) == OK) {
                        myRooms[tower.pos.roomName].registerManageTask({ object1: tower, amount: 1000, type: 'fill structure', priority: 6 })
                        rampart.hits += 800
                        if (gl_towers.debug) { console.log(tower.pos.roomName, `tower: ${tower.id}, rampart: ${rampartObj.id}`) }
                        usedTowers++; usedTowersId.push(tower.id); break
                    }
                }
                else { cache.ramparts.splice(cache.ramparts.indexOf(cache.ramparts.find(r => r.id == rampart.id))) }
            }
        }
    }


    settings.writePerformanceLog ? performance.newLog(cpu, 'repairRamparts') : false
}
gl_towers.findTowerByRampart = function (id) {
    if (gl_towers.ramparts[id]) {
        const towersId = Object.keys(gl_towers.ramparts[id])
        if (towersId.length) { return towersId } else { return [] }
    }
    else {
        const rampart = _obj(id)
        if (rampart) {
            const towers = idToObj(myRooms[rampart.pos.roomName].structures.towers)
            gl_towers.ramparts[id] = {}
            towers.forEach(tower => { if (tower.pos.inRangeTo(rampart, 5)) { gl_towers.ramparts[id][tower.id] = tower.id } })
            const towersId = Object.keys(gl_towers.ramparts[id])
            if (towersId.length) { return towersId } else { return [] }
        }
        else { return [] }
    }
}
gl_towers.updateCacheRamparts = function () {
    let mr = cache.myRooms.map(r => r.name);
    const enemies = _.filter(cache.enemies, e => e.owner !== 'Invader' && mr.includes(e.pos.roomName)).length
    const frequency = enemies ? 100 : 1000
    if (!cache.rampartsUpdateTick || gameTime - cache.rampartsUpdateTick > frequency) {
        cache.rampartsUpdateTick = gameTime
        let rampartsId = [], wallsId = []
        cache.myRooms.forEach(myRoom => { rampartsId = rampartsId.concat(myRoom.structures.ramparts); wallsId = wallsId.concat(myRoom.structures.walls) })
        // idToObj(rampartsId).filter(rampart => rampart.hits < settings.minimumHitsForRamParts[8]).sort((a, b) => a.hits - b.hits).forEach(rampart => cache.ramparts.push({ id: rampart.id, hits: rampart.hits, pos: rampart.pos }))
        cache.ramparts = []; idToObj(rampartsId).forEach(r => {
            const rampart = { id: r.id, hits: r.hits, pos: r.pos }; cache.ramparts.push(rampart)
        })
        cache.walls = []; idToObj(wallsId).forEach(w => {
            const wall = { id: w.id, hits: w.hits, pos: w.pos }; cache.walls.push(wall)
        })
    }

    cache.ramparts.sort((a, b) => a.hits - b.hits)
    cache.walls.sort((a, b) => a.hits - b.hits)
}
StructureTower.prototype.calculateDamage = function (enemy) {
    if (this.store.getUsedCapacity('energy') === 0) { return 0 }
    let towerDamage = 600; const range = this.pos.getRangeTo(enemy)
    if (range > 20) { towerDamage = 150 }
    else if (range > 5) { towerDamage = 600 - ((range - 5) * 30) }
    if (this.room.controller.isPowerEnabled) {
        [PWR_OPERATE_TOWER, PWR_DISRUPT_TOWER].forEach(power => {
            let effect = _.find(this.effects, { power });
            if (effect) { towerDamage *= POWER_INFO[power].effect[effect.level - 1]; }
        });
        towerDamage = Math.floor(towerDamage);
    }
    return towerDamage
}
MyRoom.prototype.calculateTowersDamage = function (enemy) {
    if (!enemy) { return 0 } else if (!enemy.pos) { return 0 } else if (this.name !== enemy.pos.roomName) { return 0 }
    const towers = idToObj(this.structures.towers), debug = this.settings.debug.towers
    let debugText = `calculateTowersDamage: ${this.name}\n`
    let damage = towers.map(t => t.calculateDamage(enemy)).reduce((a, b) => a + b, 0)
    if (debug) debugText += `towers damage:${damage}\n`
    const body = enemy.body.filter(b => b.hits)

    let totalDamage = 0
    for (const part of body) {
        if (debug) debugText += `${body.indexOf(part)} - damage:${damage}\n`
        if (damage == 0) break
        if (part.type == TOUGH) {
            if (part.boost == 'XGHO2') {
                const curDamage = part.hits * 10 / 3
                if (damage >= curDamage) { damage -= curDamage; totalDamage += part.hits }
                else { totalDamage += damage * 0.3; damage = 0 }
            }
            else if (part.boost == 'GHO2') {
                const curDamage = part.hits * 10 / 5
                if (damage >= curDamage) { damage -= curDamage; totalDamage += part.hits }
                else { totalDamage += damage * 0.5; damage = 0 }
            }
            else if (part.boost == 'GH') {
                const curDamage = part.hits * 10 / 7
                if (damage >= curDamage) { damage -= curDamage; totalDamage += part.hits }
                else { totalDamage += damage * 0.7; damage = 0 }
            }
        }
        else {
            if (damage >= part.hits) { damage -= part.hits; totalDamage += part.hits }
            else { totalDamage += damage; damage = 0 }
        }
    }
    if (debug) debugText += `totalDamage: ${totalDamage}\n`

    if (debug) console.log(debugText)
    return totalDamage + damage
}
MyRoom.prototype.findPerimetr = function () {
    const ramparts = idToObj(this.structures.ramparts)
    const left = new Set(), right = new Set(), up = new Set(), down = new Set()
    for (let x = 2; x < 49; x++) {
        const posY = ramparts.filter(r => r.pos.x == x).map(r => r.pos.y)
        if (posY.length) {
            const maxY = Math.max(...posY)
            down.add(ramparts.find(r => r.pos.x == x && r.pos.y == maxY))
            const maxY_1 = ramparts.find(r => r.pos.x == x && r.pos.y == maxY - 1)
            if (maxY_1) { down.add(maxY_1) }

            const minY = Math.min(...posY)
            up.add(ramparts.find(r => r.pos.x == x && r.pos.y == minY))
            const minY_1 = ramparts.find(r => r.pos.x == x && r.pos.y == minY + 1)
            if (minY_1) { up.add(minY_1) }
        }
    }

    for (let y = 2; y < 49; y++) {
        const posX = ramparts.filter(r => r.pos.y == y).map(r => r.pos.x)
        if (posX.length) {
            const maxX = Math.max(...posX)
            right.add(ramparts.find(r => r.pos.x == maxX && r.pos.y == y))
            const maxX_1 = ramparts.find(r => r.pos.x == maxX - 1 && r.pos.y == y)
            if (maxX_1) { right.add(maxX_1) }

            const minX = Math.min(...posX)
            left.add(ramparts.find(r => r.pos.x == minX && r.pos.y == y))
            const minX_1 = ramparts.find(r => r.pos.x == minX + 1 && r.pos.y == y)
            if (minX_1) { left.add(minX_1) }
        }
    }

    console.log('left :', Array.from(left).map(r => r.id))
    console.log('right :', Array.from(right).map(r => r.id))
    console.log('up :', Array.from(up).map(r => r.id))
    console.log('down :', Array.from(down).map(r => r.id))
}
MyRoom.prototype.towersAttack = function (enemy) {
    const towers = idToObj(this.structures.towers)
    if (this.settings.debug.towers) { console.log(this.name, 'towersAttack', towers.length) }
    towers.forEach(tower => {
        const res = tower.attack(enemy)
        if (res == OK) {
            if (!cache.enemies[enemy.id].counterOfTowersAttack) cache.enemies[enemy.id].counterOfTowersAttack = 0
            cache.enemies[enemy.id].counterOfTowersAttack++
            if (cache.enemies[enemy.id].counterOfTowersAttack > 30) cache.enemies[enemy.id].healModificatorForAttackTowers = 1.3
            else if (cache.enemies[enemy.id].counterOfTowersAttack > 20) cache.enemies[enemy.id].healModificatorForAttackTowers = 1.2
            else if (cache.enemies[enemy.id].counterOfTowersAttack > 10) cache.enemies[enemy.id].healModificatorForAttackTowers = 1.1
            if (this.settings.debug.towers) { console.log(gameTime, 'towers:', this.name, tower.id, 'attack', enemy.id) }
            this.registerManageTask({ object1: tower, amount: 1000, type: 'fill structure', priority: 6 })
        }
    })

}
RoomPosition.prototype.edgeOfTheRoom = function (offset = 0) {
    if (this.x < 1 + offset || this.y < 1 + offset || this.x > 48 - offset || this.y > 48 - offset) return true
    else return false
}