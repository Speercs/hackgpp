'use strict'
//2023.07.18
global.squads = {}
global.squadTools = {}
global.Squad = class {
    constructor(name, type, pos) {
        const cpu = settings.writePerformanceLog ? Game.cpu.getUsed() : 0
        this.name = name
        this.pos = pos
        this.type = type
        this.creeps = _.filter(Game.creeps, creep => creep.memory.squad == this.name)
        switch (type) {
            case 'rangedAttack + heal (1)':
                this.roles = { rangedAttack: { role: 'rangedAttack', amount: 1 }, heal: { role: 'heal', amount: 1 } }
                break;
            case 'trhm':
                this.roles = { rangedAttack: { role: 'rangedAttack', amount: 1 } }
                break
            case 'dismantle':
                this.roles = { dismantle: { role: 'dismantle', amount: 1 }, heal: { role: 'heal', amount: 1 } }
                break
            case 'attack':
                this.roles = { attack: { role: 'attack', amount: 1 }, heal: { role: 'heal', amount: 1 } }
                break
        }
        if (pos) {
            const spawnRoom = tools.findNearestRoom({ roomName: pos.roomName, minimumLevel: 8 })
            if (spawnRoom) { this.spawnRoom = myRooms[spawnRoom] }
        }

        settings.writePerformanceLog ? performance.newLog(cpu, 'Squad.constructor') : false
    }
}
squadTools.main = function () {
    Object.values(squads).forEach(squad => {
        if (each10) { squad.checkSpawn() }
        squad.cache = {}

        squad.action()
    })
}
squadTools.createSquad = function (name, type, pos) {
    if (!squads[name]) {
        if (type == 'Flag1') { type = 'trhm' }
        const newSquad = new Squad(name, type, pos)
        squads[name] = newSquad
        squads[name].backup()
        console.log(`create squad: ${name}, type: ${type}`);
    }
}
Squad.prototype.checkSpawn = function () {
    if (!this.spawnRoom) { console.log(`dont choosed spawn room for squad: ${this.name}`); return }
    const countByRole = {}
    const creeps = _.filter(Game.creeps, creep => creep.memory.squad == this.name)

    creeps.forEach(creep => {
        const role = creep.memory.role
        if (!countByRole[role]) { countByRole[role] = { role: role, amount: 1 } }
        else { countByRole[role].amount += 1 }
    })

    try {
        Object.keys(this.roles).forEach(role => {
            const inQueues = this.spawnRoom.queues.spawn.filter(s => s.role == role).length
            const different = this.roles[role].amount - ((countByRole[role]) ? countByRole[role].amount : 0) - inQueues
            if (different > 0) { for (let i = 0; i < different; i++) { this.spawn({ role: role }) } }
        })
    }
    catch { console.log(`checkSpawn error:${JSON.squad}`) }
}
Squad.prototype.spawn = function (specifications) {
    const role = specifications.role
    let body = squadTools.getBody(role, this.spawnRoom.room.energyCapacityAvailable)

    const memory = { role: role, squad: this.name, }
    this.spawnRoom.registerSpawn({ role: role, priority: 5, creepBody: body, memory: memory })
}
squadTools.getBody = function (role, energy) {
    let move = 0, attack = 0, rangedAttack = 0, heal = 0, tough = 0, work
    const body = []
    switch (role) {
        case 'rangedAttack':
            switch (true) {
                case energy > 5900:
                    tough = 5; rangedAttack = 28; heal = 7; move = 10
                    // tough = 15; rangedAttack = 10; heal = 15; move = 10
                    break;
                case energy == 5600:
                    tough = 10; rangedAttack = 10; heal = 20; move = 10
                    // rangedAttack = 20; heal = 5; move = 25
                    break;
            }; break
        case 'attack':
            switch (true) {
                case energy > 3000: tough = 10; attack = 30; move = 10; break
            }; break
        case 'dismantle':
            switch (true) {
                case energy > 3600: tough = 11; work = 29; move = 10; break
            }; break
        case 'heal':
            switch (true) {
                case energy >= 5500: tough = 11; heal = 29; move = 10; break
                case energy >= 5460: tough = 21; heal = 19; move = 10; break
            }; break
    }

    for (let i = 0; i < tough; i++) { body.push(TOUGH) }
    for (let i = 0; i < attack; i++) { body.push(ATTACK) }
    for (let i = 0; i < rangedAttack; i++) { body.push(RANGED_ATTACK) }
    for (let i = 0; i < heal; i++) { body.push(HEAL) }
    for (let i = 0; i < move; i++) { body.push(MOVE) }
    for (let i = 0; i < work; i++) { body.push(WORK) }
    return body
}
Squad.prototype.action = function () {
    const cpu = settings.writePerformanceLog ? Game.cpu.getUsed() : 0
    this.creeps = _.filter(Game.creeps, creep => creep.memory.squad == this.name)
    if (!this.creeps.length) { settings.writePerformanceLog ? performance.newLog(cpu, 'Squad.prototype.action') : false; return }

    this.creeps = _.filter(Game.creeps, creep => creep.memory.squad == this.name)

    if (this.type == 'dismantle') {
        this.dismantle()
    }
    else if (this.type == 'attack') {
        this.squadTypeAttack()
    }
    else {
        this.moveTo()
        if (this.type == 'trhm') {
            this.heal()
            this.attack()
        }
    }

    settings.writePerformanceLog ? performance.newLog(cpu, 'Squad.prototype.action') : false
}
Squad.prototype.dismantle = function () {
    const dismantle = this.creeps.find(c => c.memory.role == 'dismantle' && !c.spawning)
    const healList = this.creeps.filter(c => c.memory.role == 'heal')
    const pos = new RoomPosition(this.pos.x, this.pos.y, this.pos.roomName)
    if (dismantle) {
        if (!dismantle.getBoosted()) {
            if (dismantle.memory.debug) { console.log(dismantle.hits) }
            if (dismantle.hits > (dismantle.hitsMax - (dismantle.hitsMax * 0.1))) {
                // if (dismantle.hits  == dismantle.hitsMax) {
                if (healList.length && this.roles.heal && healList.length == this.roles.heal.amount) {
                    const inRange1 = [], inRange3 = []
                    healList.forEach(h => inRange1.push(h.pos.inRangeTo(dismantle, 1)))
                    healList.forEach(h => inRange3.push(h.pos.inRangeTo(dismantle, 3)))

                    if (dismantle.edgeOfTheRoom() || (dismantle.edgeOfTheRoom(1) && inRange1.includes(true)) || (inRange1.includes(true) && !inRange3.includes(false) && !healList.find(c => c.fatigue))) {
                        if (dismantle.room.name == pos.roomName) {
                            if (this.dismantleAll) {
                                const objects = Game.rooms[pos.roomName].lookForAt(LOOK_STRUCTURES, pos.x, pos.y)
                                if (objects.length) {
                                    const res = dismantle.dismantle(objects[0])
                                    if (res == OK) { dismantle.memory.isStuck = false }
                                    if (res == ERR_NOT_IN_RANGE) { dismantle.travelTo(pos, { ignoreRoads: true }) }
                                }
                                else {
                                    if (!dismantle.memory.dismantleId) {
                                        let dismantleObject
                                        if (this.ignoreStructures && this.ignoreStructures.length) {
                                            dismantleObject = dismantle.pos.findClosestByPath(FIND_STRUCTURES, { filter: str => str.structureType !== STRUCTURE_CONTROLLER && !this.ignoreStructures.includes(str.structureType) })
                                        }
                                        else {
                                            dismantleObject = pos.findClosestByPath(FIND_STRUCTURES, { filter: str => str.structureType !== STRUCTURE_CONTROLLER })
                                        }
                                        if (dismantleObject) { dismantle.memory.dismantleId = dismantleObject.id; if (dismantle.dismantle(dismantleObject) == ERR_NOT_IN_RANGE) { dismantle.travelTo(dismantleObject, { ignoreRoads: true }) } }
                                    }
                                    else {
                                        const dismantleObject = _obj(dismantle.memory.dismantleId)
                                        if (dismantleObject) { if (dismantle.dismantle(dismantleObject) == ERR_NOT_IN_RANGE) { dismantle.travelTo(dismantleObject, { ignoreRoads: true }) } }
                                        else { delete dismantle.memory.dismantleId }
                                    }
                                }

                            }
                            else {
                                const objects = Game.rooms[pos.roomName].lookForAt(LOOK_STRUCTURES, pos.x, pos.y)
                                if (objects.length) {
                                    const res = dismantle.dismantle(objects[0])
                                    if (res == OK) { dismantle.memory.isStuck = false }
                                    if (res == ERR_NOT_IN_RANGE) { dismantle.travelTo(pos, { ignoreRoads: true }) }
                                }
                                else { dismantle.travelTo(pos, { ignoreRoads: true }) }
                            }
                        }
                        else { dismantle.travelTo(pos, { ignoreRoads: true }) }
                    }
                }
                else {
                    if (dismantle.room.name == pos.roomName) {
                        const objects = Game.rooms[pos.roomName].lookForAt(LOOK_STRUCTURES, pos.x, pos.y)
                        if (objects.length) {
                            if (dismantle.dismantle(objects[0]) == ERR_NOT_IN_RANGE) { dismantle.travelTo(pos) }
                        }
                        else { dismantle.travelTo(pos) }
                    }
                    else { dismantle.travelTo(pos) }
                }
            }
            //else { dismantle.travelTo(myRooms[dismantle.memory.spawnRoom].room.controller) }
        }
    }
    healList.forEach(heal => {
        if (!heal.getBoosted()) {
            if (dismantle) {
                if (heal.pos.inRangeTo(dismantle, 1)) {
                    // if ((dismantle.pos.x == pos.x && dismantle.pos.y == pos.y && dismantle.pos.roomName == pos.roomName) 
                    heal.memory.isStuck = false
                    if (dismantle.memory.isStuck
                        && (dismantle.pos.x == 1 || dismantle.pos.x == 48 || dismantle.pos.y == 1 || dismantle.pos.y == 48)
                        && (heal.pos.x == 0 || heal.pos.x == 49 || heal.pos.y == 0 || heal.pos.y == 49)) {
                        if (dismantle.pos.x == 1 || dismantle.pos.x == 48) {
                            if (chekPosForMove({ x: dismantle.pos.x, y: dismantle.pos.y - 1, roomName: dismantle.pos.roomName }, heal)) { heal.moveTo(dismantle.pos.x, dismantle.pos.y - 1) }
                            else if (chekPosForMove({ x: dismantle.pos.x, y: dismantle.pos.y + 1, roomName: dismantle.pos.roomName }, heal)) { heal.moveTo(dismantle.x, dismantle.y + 1) }
                        }
                        else if (dismantle.pos.y == 1 || dismantle.pos.y == 48) {
                            if (chekPosForMove({ x: dismantle.pos.x - 1, y: dismantle.pos.y, roomName: dismantle.pos.roomName }, heal)) { heal.moveTo(dismantle.pos.x - 1, dismantle.pos.y) }
                            else if (chekPosForMove({ x: dismantle.pos.x + 1, y: dismantle.pos.y, roomName: dismantle.pos.roomName }, heal)) { heal.moveTo(dismantle.pos.x + 1, dismantle.pos.y) }
                        }
                    }
                    else { heal.move(dismantle) }
                    if (dismantle.hits < dismantle.hitsMax) { heal.heal(dismantle) }
                    else {
                        if (heal.hits == heal.hitsMax) { heal.heal(dismantle) }
                        else { heal.heal(heal) }
                    }

                }
                else {
                    heal.travelTo(dismantle);
                    if (heal.pos.inRangeTo(dismantle, 3)) {
                        if (heal.hits == heal.hitsMax) { heal.rangedHeal(dismantle) }
                        else { if (heal.heal(heal) == OK) { heal.memory.isStuck = false } }
                    }
                    else { heal.heal(heal) }
                }
            }
        }
    })


    function chekPosForMove(position, creep) {
        // console.log(JSON.stringify(position))
        if (position.x < 1 || position.x > 48 || position.y < 1 || position.y > 48) { return false }
        const pos = new RoomPosition(position.x, position.y, position.roomName)
        if (!creep.pos.inRangeTo(pos, 1)) { return false }
        const objAtPos = Game.rooms[position.roomName].lookAt(position.x, position.y)
        let res = true
        objAtPos.forEach(o => {
            if (o.type == 'terrain') { if (o.terrain == 'wall') { res = false } }
            if (o.type == 'creep') { res = false }
        })
        return res
    }
}
Squad.prototype.squadTypeAttack = function () {
    const attack = this.creeps.find(c => c.memory.role == 'attack')
    const heal = this.creeps.find(c => c.memory.role == 'heal')
    const pos = new RoomPosition(this.pos.x, this.pos.y, this.pos.roomName)
    function attackStructures(creep, pos) {
        const objects = Game.rooms[pos.roomName].lookForAt(LOOK_STRUCTURES, pos.x, pos.y)
        if (objects.length) { delete creep.memory.structure; if (creep.attack(objects[0]) == ERR_NOT_IN_RANGE) { creep.travelTo(pos) } }
        else {
            if (creep.memory.structure) {
                const strObj = _obj(creep.memory.structure)
                if (strObj) { creep._attack(strObj) }
                else { delete creep.memory.structure; findAndAttack(creep, pos) }
            }
            else { findAndAttack(creep, pos) }
        }
        function findAndAttack(creep, pos) {
            const structure = creep.pos.findClosestByPath(FIND_STRUCTURES, { filter: s => s.structureType !== 'controller' && s.structureType !== STRUCTURE_POWER_BANK })
            if (structure) { creep._attack(structure); creep.memory.structure = structure.id } else { creep.travelTo(pos) }
        }
    }
    if (attack) {
        if (!attack.getBoosted()) {
            // if (attack.hits > (attack.hitsMax - (attack.hitsMax * 0.2))) {
            if (heal) {
                if (attack.room.name == heal.room.name) {
                    if (attack.pull(heal) == OK) {
                        if (attack.room.name == pos.roomName) {
                            if (!killthemall(attack, pos)) { attack.travelTo(pos) }
                        }
                        else { attack.travelTo(pos, { ignoreRoads: true }) }
                    }
                    // else { attack.travelTo(heal) }
                }
                else { attack.travelTo(pos, { ignoreRoads: true }) }
            }
            else {
                if (attack.room.name == pos.roomName) { if (!killthemall(attack, pos)) { attack.travelTo(pos) } }
                else { attack.travelTo(pos, { ignoreRoads: true }) }
            }

            // }
            // else { attack.travelTo(myRooms[attack.memory.spawnRoom].room.controller, { ignoreRoads: true }) }
        }
    }
    if (heal) {
        if (!heal.getBoosted()) {
            if (attack) {
                if (heal.pos.inRangeTo(attack, 1)) {
                    heal.move(attack);
                    if (attack.hits < attack.hitsMax) { heal.heal(attack) }
                    else {
                        if (heal.hits == heal.hitsMax) { heal.heal(attack) }
                        else { heal.heal(heal) }
                    }
                }
                else {
                    heal.travelTo(attack);
                    if (heal.pos.inRangeTo(attack, 3)) {
                        if (heal.hits == heal.hitsMax) { heal.rangedHeal(attack) }
                        else { heal.heal(heal) }
                    }
                    else { heal.heal(heal) }
                }
            }
        }
    }
    function killthemall(attack, pos) {
        if (attack.memory.enemy) {
            const enemy = _obj(attack.memory.enemy)
            if (attack.memory.debug) { console.log(`${attack}, 1: ${enemy} `) }
            if (enemy && (enemy ? (attack.pos.roomName == enemy.pos.roomName) : false)) {
                delete attack.memory.structure
                if (attack.pos.inRangeTo(enemy, 1)) {
                    attack.attack(enemy); attack.move(enemy);; return true
                }
                else {
                    if (attack.memory.debug) { console.log(`${attack}, 2: `) }
                    const range = attack.pos.getRangeTo(enemy)
                    const anotherEnemys = attack.pos.findInRange(FIND_HOSTILE_CREEPS, range - 1, { filter: creep => creep.owner.username !== 'ChicoFlex' }).concat(attack.pos.findInRange(FIND_HOSTILE_CREEPS, range - 1))
                    let anotherEnemy
                    if (anotherEnemys.length) {
                        anotherEnemy = pos.findClosestByPath(anotherEnemys)
                    }
                    if (attack.memory.debug) { console.log(`${attack}, anotherEnemy: ${anotherEnemy}`) }
                    if (anotherEnemy) {
                        attack.memory.enemy = anotherEnemy.id
                        const rangeToAnotherEnemy = attack.pos.getRangeTo(anotherEnemy)
                        if (rangeToAnotherEnemy == 1) { attack.attack(anotherEnemy); attack.move(anotherEnemy) }
                        else { attack.moveTo(anotherEnemy) }
                        return true
                    }
                    else { attack.moveTo(enemy); return true }
                }
            }
            else {
                delete attack.memory.enemy
                const anotherEnemy = pos.findClosestByPath(FIND_HOSTILE_CREEPS, { filter: creep => creep.owner.username !== 'ChicoFlex' })
                if (anotherEnemy) {
                    delete attack.memory.structure
                    attack.memory.enemy = anotherEnemy.id
                    if (attack.pos.inRangeTo(anotherEnemy), 1) {
                        attack.attack(anotherEnemy); attack.move(anotherEnemy)
                    }
                    else { attack.moveTo(anotherEnemy) }
                }
                else { attack.travelTo(pos, { ignoreRoads: true }) }
            }
        }
        else {
            const anotherEnemy = pos.findClosestByPath(FIND_HOSTILE_CREEPS, { filter: creep => creep.owner.username !== 'ChicoFlex' })
            if (anotherEnemy) {
                attack.memory.enemy = anotherEnemy.id
                if (attack.pos.inRangeTo(anotherEnemy), 1) {
                    attack.attack(anotherEnemy); attack.move(anotherEnemy)
                }
                else { attack.moveTo(anotherEnemy) }
            }
            else if (!_.find(cache.myRooms, mr => mr.name == pos.roomName) && (Game.rooms[pos.roomName] && Game.rooms[pos.roomName].controller && Game.rooms[pos.roomName].controller.owner && Game.rooms[pos.roomName].controller.owner.username !== 'ChicoFlex')) { attackStructures(attack, pos) }
        }
    }
}
Squad.prototype.together = function () {
    if (this.creeps.length == 1) { return true }


    this.togetherDone = true
    this.otherCreeps.forEach(creep => {
        if (creep.pos.roomName !== officer.pos.roomName) { creep.say(`<`); creep.moveTo(officer); this.togetherDone = false }
        else if (!creep.pos.inRangeTo(officer, 1)) { creep.say(`<`); creep.moveTo(officer); this.togetherDone = false }
    })
}
Squad.prototype.delete = function () {
    this.creeps.forEach(creep => this.spawnRoom.queues.boost.filter(t => t.creepName == creep.name).forEach(t => this.spawnRoom.queues.boost.splice(this.spawnRoom.queues.boost.indexOf(t))));
    this.creeps.forEach(creep => creep.suicide())
    if (this.spawnRoom) {
        this.spawnRoom.queues.spawn.filter(t => t.memory.squad == this.name).forEach(t => this.spawnRoom.queues.spawn.splice(this.spawnRoom.queues.spawn.indexOf(t)))
        this.spawnRoom.boostBackup()
    }
    delete Memory.squads[this.name]
    console.log(`delete squad: ${this.name}`);

    delete squads[this.name]
}
Squad.prototype.moveTo = function () {
    if (!this.creeps.length) { return }
    if (!this.pos) { return }
    if (this.pos.x == undefined || this.pos.y == undefined || !this.pos.roomName) { console.log(`squad ${this.name} dont have a pos: ${JSON.stringify(this.pos)}`); return }
    const pos = new RoomPosition(this.pos.x, this.pos.y, this.pos.roomName)
    let pos2
    if (this.pos2) pos2 = new RoomPosition(this.pos2.x, this.pos2.y, this.pos2.roomName)

    const boosting = []
    this.creeps.forEach(creep => { if (creep.getBoosted()) { boosting.push(creep) } })
    const creeps = this.creeps.filter(creep => !creep.spawning && !boosting.includes(creep))

    if (!creeps.length) { return }

    creeps.forEach(creep => {
        if (creep.hits < creep.hitsMax * 0.99 && pos2) {
            creep.travelTo(pos2)
            creep.say('back')
        }
        else { creep.travelTo(pos) }
    })
    // return

    // let leaderAtPos = false, path
    // // const boosting = []
    // if (this.creeps[0].pos.roomName == this.pos.roomName) {
    //     if (this.creeps[0].pos.x == this.pos.x && this.creeps[0].pos.y == this.pos.y) { leaderAtPos = true }
    // }
    // // const creeps = this.creeps.filter(creep => !creep.spawning && !boosting.includes(creep))

    // if (!creeps.length) { return }

    // new RoomVisual(creeps[0].pos.roomName).circle(creeps[0].pos, {
    //     radius: .25, fill: "transparent", stroke: 'black', strokeWidth: .15, opacity: 1
    // })
    // new RoomVisual(this.pos.roomName).circle(this.pos, {
    //     radius: .25, fill: "transparent", stroke: tools.getColor(this.name), strokeWidth: .15, opacity: 1
    // })

    // for (let i = 0; i < creeps.length; i++) {
    //     const creep = creeps[i];
    //     if (i == 0) {
    //         if (creep.pos.roomName !== this.pos.roomName || (creep.pos.x !== this.pos.x || creep.pos.y !== this.pos.y)) {
    //             path = creep.pos.findPathTo(new RoomPosition(this.pos.x, this.pos.y, this.pos.roomName), { ignoreCreeps: true });
    //             if (path.length) { moveByPath(creep, path) }
    //             else { path = false }
    //         }
    //         else { leaderAtPos = true }
    //     }
    //     else {
    //         if (leaderAtPos) {
    //             if (creeps[i - 1].pos.inRangeTo(creeps[0], 1)) { if (creep.pos.getRangeTo(creeps[0]) > 1) { creep.say(`1`); creep.moveTo(creeps[0]) } }
    //             else { creep.say(`2`); creep.moveTo(creeps[i - 1]) }
    //         }
    //         else if (creep.pos.getRangeTo(creeps[0]) < 2) {
    //             if (!moveByPath(creep, path)) {
    //                 if (leaderAtPos) { creep.say(`3`); creep.moveTo(creeps[0]) } else { creep.say(`4`); creep.moveTo(creeps[i - 1]) }
    //             }
    //         }
    //         else { creep.say(`5`); creep.moveTo(creeps[i - 1]) }
    //     }
    // }


    // function moveByPath(creep, path) {
    //     if (!path) { return false }
    //     const nextPos = tools.posByDirection(creep.pos, path[0].direction)
    //     if (canMoveToPos(nextPos, creep)) { creep.say(`6`); creep.move(path[0].direction); return true }
    //     return false
    // }
    // function moveOneByOne(squad, creep) {
    //     if (creep.pos.inRangeTo(squad.officer, 1)) { return }
    //     const indexOfCreep = squad.otherCreeps.indexOf(creep)
    //     if (indexOfCreep == 0) { creep.travelTo(squad.officer); return }
    //     const prevCreep = squad.otherCreeps[indexOfCreep - 1]
    //     if (!creep.pos.inRangeTo(prevCreep, 1)) { creep.travelTo(prevCreep) }
    // }
    // function canMoveToPos(position, creep) {
    //     if (!position) { return false }
    //     const objAtPos = Game.rooms[position.roomName].lookAt(position.x, position.y)
    //     let res = true
    //     objAtPos.forEach(o => {
    //         if (o.type == 'terrain') { if (o.terrain == 'wall') { res = false } }
    //         if (o.type == 'structure') {
    //             if (o.structure.structureType == 'rampart') {
    //                 if (o.structure.owner.username !== settings.username) { res = false }
    //             }
    //             else { if (o.structure.structureType !== 'road' && o.structure.structureType !== 'container') { res = false } }
    //         }
    //         if (o.type == 'creep') { if (o.creep.owner.username == settings.username) { return true } else { res = false } }
    //     })
    //     return res
    // }
}
squadTools.checkPlaceForSquad = function (position) {
    const room = Game.rooms[position.roomName]
    const arenaAround = room.lookAtArea(position.y - 1, position.x - 1, position.y + 1, position.x + 1, true)
    const pos = new RoomPosition(position.x, position.y, position.roomName)

    const fields = room.lookForAtArea(LOOK_TERRAIN, position.y - 1, position.x - 1, position.y + 1, position.x + 1, true)
    const accessibleFields = _.filter(fields, f => f.terrain !== "wall")
    // const structures = room.lookForAtArea(, position.y - 1, position.x - 1, position.y + 1, position.x + 1, true)
}
Squad.prototype.heal = function () {
    const creeps = this.creeps
    const enemiesId = _.filter(cache.enemies, e => e.pos.roomName == this.pos.roomName)
    const creepsWithLowHits = creeps.filter(creep => creep.hits < creep.hitsMax)

    creepsWithLowHits.sort((a, b) => a.hits - b.hits)
    creeps.forEach(creep => { creep._heal() })
    // creeps.forEach(creep => {
    //     const myRoom = creep.room.myRoom

    //     if (!creepsWithLowHits.length && !enemiesId.length) { return }
    //     if (creep.hits < creep.hitsMax) { creep.heal(creep) }
    //     else {
    //         let heal = false
    //         for (const lowerHits of creepsWithLowHits) {
    //             if (creep.pos.roomName == lowerHits.pos.roomName) {
    //                 const range = creep.pos.getRangeTo(lowerHits)
    //                 if (range == 1) { creep.heal(lowerHits); heal = true; break }
    //                 else if (range < 4) { creep.rangedHeal(lowerHits); heal = true; break }
    //             }
    //         }
    //         if (!heal) {
    //             const needToHeal = creep.pos.findInRange(FIND_MY_CREEPS, 3, { filter: c => c.hits < c.hitsMax })
    //             if (needToHeal.length) {
    //                 needToHeal.sort((a, b) => a.hits - b.hits)
    //                 if (creep.pos.inRangeTo(needToHeal, 1)) { creep.heal(needToHeal[0]) }
    //                 else { creep.rangedHeal(needToHeal[0]) }
    //             }
    //             // creep.heal(creep)
    //             else { creep.heal(creep) }
    //         }
    //     }
    // })
}
Squad.prototype.attack = function () {
    const creeps = this.creeps
    const pos = new RoomPosition(this.pos.x, this.pos.y, this.pos.roomName)
    const enemiesId = _.filter(cache.enemies, e => e.pos.roomName == this.pos.roomName).map(e => e.id)
    let enemies = idToObj(enemiesId)

    creeps.forEach(creep => {
        if (this.move) {
            const enemy = creep.pos.findClosestByPath(enemies.filter(e => pos.inRangeTo(e, this.move)))
            if (enemy) {
                creep.travelTo(enemy, { movingTarget: true })
                if (creep.hits == creep.hitsMax && creep.pos.inRangeTo(enemy, 1)) { creep.cancelOrder('heal'); creep.attack(enemy); return }
                if (creep.pos.inRangeTo(enemy, 3)) { creep.rangedAttack(enemy); return }
            }
        }
        let structures = []
        if (creep.room.controller && creep.room.controller.owner && creep.room.controller.owner.username !== settings.username) { structures = creep.pos.findInRange(FIND_STRUCTURES, 3, { filter: str => str.structureType !== 'controller' && str.structureType !== 'powerBank' && str.structureType !== 'portal' }) }

        enemies = creep.pos.findInRange(FIND_HOSTILE_CREEPS, 3).filter(c => !tools.lookRampart(c.pos)).concat(creep.pos.findInRange(FIND_HOSTILE_POWER_CREEPS, 3).filter(c => !tools.lookRampart(c.pos)))
        if (enemies.length) {
            if (creep.pos.findInRange(enemies, 1).length) { creep.rangedMassAttack() }
            else { enemies.sort((a, b) => a.hits - b.hits); creep.rangedAttack(enemies[0]) }
        }
        // else if (structures) { if (structures.length) { structures.sort((a, b) => !tools.lookRampart(a.pos) - !tools.lookRampart(b.pos) && a.hits - b.hits); creep.rangedAttack(structures[0]) } }
        else if (structures) {
            if (structures.length) {
                let str
                str = structures.filter(s => s.structureType !== 'constructedWall' && !tools.lookRampart(s.pos))

                if (str.length) {
                    if (str.filter(s => s.structureType !== 'road' && s.structureType !== 'constructedWall').length > 2) { creep.rangedMassAttack() }
                    else { str.sort((a, b) => a.hits - b.hits); creep.rangedAttack(str[0]) }
                }
                else {
                    str = structures.filter(s => s.structureType == 'rampart')
                    if (str.length > 2) { creep.rangedMassAttack() }
                    else { structures.sort((a, b) => a.hits - b.hits); creep.rangedAttack(structures[0]) }
                }
            }
        }
    })
}
Squad.prototype.backup = function () {
    const cpu = settings.writePerformanceLog ? Game.cpu.getUsed() : 0
    try {
        Memory.squads[this.name] = {}
        const task = Memory.squads[this.name]
        Object.keys(this).forEach(key => {
            switch (key) {
                case 'spawnRoom': task[key] = this[key].name; break;
                case 'creeps': break;
                default: task[key] = this[key]; break;
            }
        })
    } catch (error) {
        console.log('Squad.prototype.backup', JSON.stringify(this.name), error)
    }
    settings.writePerformanceLog ? performance.newLog(cpu, 'Squad.prototype.backup') : false
}
squadTools.restoreSquads = function () {
    const cpu = settings.writePerformanceLog ? Game.cpu.getUsed() : 0
    Object.values(Memory.squads).forEach(squadMemory => {
        const newSquad = new Squad(squadMemory.type, squadMemory.pos, squadMemory.name)
        squads[squadMemory.name] = newSquad
        const squad = squads[squadMemory.name]
        Object.keys(squadMemory).forEach(key => {
            switch (key) {
                case 'spawnRoom': squad.spawnRoom = myRooms[squadMemory.spawnRoom]; break;
                default: squad[key] = squadMemory[key]; break;
            }
        })
        console.log(`create squad ${squad.name}, type: ${squad.type}, room: ${squad.pos}`);
    })
    settings.writePerformanceLog ? performance.newLog(cpu, 'restoreSquads') : false
}
