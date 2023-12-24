'use strict'
//2023.08.06
Creep.prototype.edgeOfTheRoom = function (offset = 0) {
    if (this.pos.x < 1 + offset || this.pos.y < 1 + offset || this.pos.x > 48 - offset || this.pos.y > 48 - offset) return true
    else return false
}
Creep.prototype.attack1Range = function (move = false, owner = false) {
    if (this.memory.attack1RangeCreep) {
        const enemy = _obj(this.memory.attack1RangeCreep)
        if (enemy) {
            if (this.pos.inRangeTo(enemy), 1) { this.attack(enemy); if (move) { this.move(enemy); return enemy } }
            else { delete this.memory.attack1Range }
        } else { delete this.memory.attack1Range }
    }
    let enemiesId
    if (owner) { enemiesId = _.filter(cache.enemies, e => e.pos.roomName == this.pos.roomName && e.owner == owner).map(e => e.id) }
    else { enemiesId = _.filter(cache.enemies, e => e.pos.roomName == this.pos.roomName).map(e => e.id) }
    const enemies1Range = idToObj(enemiesId).filter(e => this.pos.inRangeTo(e, 1)).sort((a, b) => a.hits - b.hits)

    if (enemies1Range.length) { this.attack(enemies1Range[0]); this.memory.attack1Range = enemies1Range[0].id; if (move) { this.move(enemies1Range[0]) }; return enemies1Range[0] }
    else if(this.room.controller && !this.room.controller.my){
        if (this.memory.attack1RangeStructure) {
            const structure = _obj(this.memory.attack1RangeStructure)
            if (structure && this.pos.inRangeTo(structure, 1)) { this.attack(structure); return }
        }
        const structures = this.pos.findInRange(FIND_STRUCTURES, 1,{filter:s=>!s.my}).sort((a, b) => a.hits - b.hits)
        if (structures.length) {
            this.attack(structures[0]); 
            this.memory.attack1RangeStructure = structures[0].id
        }
    }
}

Creep.prototype._attack = function (object, useTraveler = true) {
    if (this.attack(object) == ERR_NOT_IN_RANGE) { useTraveler ? this.travelTo(object, { movingTarget: true }) : this.moveTo(object) }
}
Creep.prototype._dismantle = function (object) {
    if (this.dismantle(object) == ERR_NOT_IN_RANGE) { this.travelTo(object) }
}
Creep.prototype.harvestSource = function (source = false) {
    const sourceObj = (source) ? source : _obj(this.memory.SourceId)
    const result = this.harvest(sourceObj)
    switch (result) {
        case OK: this.memory.isStuck = false; break
        case ERR_NOT_ENOUGH_RESOURCES:
            if (this.pos.getRangeTo(sourceObj) > 1) { this.travelTo(sourceObj) }
            break
        case ERR_NOT_IN_RANGE:
            this.travelTo(sourceObj)
            break
        case -1:
            console.log(`${this.pos.roomName}, harvest source task was halted becouse -1`);
            break
    }
}
Creep.prototype._build = function () {
    this.say('build')
    const myRoom = myRooms[this.memory.roomName]
    if (this.memory.targetId) {
        const target = _obj(this.memory.targetId)
        if (target) { build(this, target) }
        else { myRoom.constructionSites.splice(myRoom.constructionSites.indexOf(this.memory.targetId), 1); this.resetStatus(); myRoom.registerSheduledTask('updateStructures') }
    }
    else {
        if (this.room.name == myRoom.name) {
            const constructionSites = idToObj(myRoom.constructionSites)
            if (constructionSites.length) {
                const target = this.pos.findClosestByPath(constructionSites, { ignoreCreeps: true, maxOps: 300 })
                if (target) { this.memory.targetId = target.id; build(this, target) }
                else { myRoom.constructionSites.splice(myRoom.constructionSites.indexOf(this.memory.targetId), 1); myRoom.registerSheduledTask('updateStructures') }
            }
            else { this.resetStatus() }
        }
        else { this.travelTo(myRoom.room.controller, { useFindRoute: true }) }
    }
    function build(creep, target) {
        if (!target.pos) { return }
        if (creep.pos.x == 0 || creep.pos.y == 0 || creep.pos.x == 49 || creep.pos.y == 49) { creep.travelTo(target) }
        switch (creep.build(target)) {
            case ERR_NOT_IN_RANGE: creep.travelTo(target, { range: 3 }); break
            case OK: if (target.structureType == STRUCTURE_RAMPART || target.structureType == STRUCTURE_WALL) { myRoom.registerSheduledTask('updateStructures') }; creep.resetStatus(); break
        }
    }
}
Creep.prototype._repair = function () {
    const myRoom = myRooms[this.memory.roomName]
    const rampartsId = myRoom.structures.ramparts
    if (this.memory.targetId) {
        const target = _obj(this.memory.targetId)
        if (target) {
            if (target.hits == target.hitsMax) { this.resetStatus(); return }
            repair(this, target)
        }
        else { rampartsId.splice(rampartsId.indexOf(this.memory.targetId), 1); this.resetStatus(); myRoom.registerSheduledTask('updateStructures') }
    }
    else { creep.resetStatus(); return }

    function repair(creep, target) {
        if (!target.pos) { return }
        if (creep.pos.x == 0 || creep.pos.y == 0 || creep.pos.x == 49 || creep.pos.y == 49) { creep.travelTo(target) }
        else if (creep.repair(target) == ERR_NOT_IN_RANGE) {
            creep.travelTo(target, { range: 3 })
        }
    }
}
Creep.prototype.resetStatus = function () {
    let keys = ['role', 'isStuck', '_trav', 'spawnRoom', 'roomName', 'task', 'squad', 'debug']
    let addKeys = []
    switch (this.memory.role) {
        case 'harvest source': addKeys = ['id']; break
        case 'repair': addKeys = ['withdrawObject']; break
        case 'upgrade': addKeys = ['withdrawObject']; break
    }
    keys = keys.concat(addKeys)
    const keysToDelete = Object.keys(this.memory).filter(key => !keys.includes(key))
    keysToDelete.forEach(key => delete this.memory[key])
    if (this.memory.debug) { this.say('!') }
}
Creep.prototype.goToDie = function () {
    if (this.getFreeStore()) {
        if (this.memory.spawn) {
            let spawn = _obj(this.memory.spawn)
            if (!spawn) getSpawn(this)
            else {
                if (this.pos.inRangeTo(spawn, 1) && spawn.recycleCreep(this) == OK) { actionsIfDie(this) }
                else { this.travelTo(spawn) }
            }
        }
        else {
            const spawn = getSpawn(this)
            if (spawn) { this.memory.spawn = spawn.id; this.travelTo(spawn) }
        }
        if (this.ticksToLive == 1 && this.suicide() == OK) { actionsIfDie(this) }

        function actionsIfDie(creep) {
            if (creep.memory.role == 'manage') { myRooms[creep.memory.roomName].clearManageMicroTasks(creep.name) }
            else if (creep.memory.role == 'harvest deposit') { tasks[creep.memory.task].creepsCounter++ }
            const myRoom = myRooms[creep.pos.roomName]
            if (myRoom && myRoom.my) { myRoom.registerSheduledTask('updateTombstones') }
        }
    }
    function getSpawn(creep) {
        if (creep.memory.restrictToFindSpawns && Game.time < creep.memory.restrictToFindSpawns) return
        const myRoom = myRooms[creep.memory.spawnRoom]
        if (myRoom && myRoom.structures && myRoom.structures.spawns.length) {
            const spawns = idToObj(myRoom.structures.spawns)
            if (spawns.length) {
                const closestSpawn = creep.pos.findClosestByPath(spawns, { ignoreCreeps: true, maxOps: 300 })
                if (closestSpawn) { if (closestSpawn) return closestSpawn }
                else { creep.memory.restrictToFindSpawns = Game.time + 10 }
            }
            else { creep.memory.restrictToFindSpawns = Game.time + 10 }
        }
    }
}
Creep.prototype._transfer = function (object, resourceType = false, amount = false) { //return true if transfer OK
    if (!resourceType) { resourceType = Object.keys(this.store)[0] }
    if (amount) {
        const res = this.transfer(object, resourceType, amount)
        if (res == ERR_NOT_IN_RANGE) { this.travelTo(object, { obstacles: tools.getObstacles() }) }
        if (res == OK) { return true }
    }
    else {
        const res = this.transfer(object, resourceType)
        if (res == ERR_NOT_IN_RANGE) { this.travelTo(object, { obstacles: tools.getObstacles() }) }
        if (res == OK) { return true }
    }
}
Creep.prototype._pickup = function (object, resourceType = false, amount = false) { //return true if transfer OK
    if (!resourceType) { resourceType = RESOURCE_ENERGY }
    const res = this.pickup(object, resourceType, amount)
    if (res == ERR_NOT_IN_RANGE) { this.travelTo(object) }
    if (res == OK) { return true }
}
Creep.prototype._withdraw = function (object, resourceType = RESOURCE_ENERGY, amount = false) {
    if (amount) {
        const res = this.withdraw(object, resourceType, amount)
        if (res == OK) { return true }
        if (res == ERR_NOT_IN_RANGE) { this.travelTo(object, { obstacles: tools.getObstacles() }) }
    }
    else {
        const res = this.withdraw(object, resourceType)
        if (this.memory.debug) { console.log(this, `withdraw: ${res}`) }
        if (res == OK) { return true }
        if (res == ERR_NOT_IN_RANGE) { this.travelTo(object, { obstacles: tools.getObstacles() }) }
    }
}
Creep.prototype.getFreeStore = function () {
    const isPC = this instanceof PowerCreep
    let myRoom
    if (isPC) myRoom = myRooms[this.memory.room]
    else {
        if (this.memory.roomName) (myRoom = myRooms[this.memory.roomName])
        if (this.memory.spawnRoom) (myRoom = myRooms[this.memory.spawnRoom])
    }
    if (!myRoom) { return true }
    if (this.store.getUsedCapacity() > 0) {
        if (this.memory.role == 'harvest source') {
            const link = _obj(myRoom.tasks.harvestSource[this.memory.id].link)
            if (link) { if (this._transfer(link)) { return true } }
        }
        else {
            const resources = Object.keys(this.store)
            const terminal = myRoom.terminal
            const storage = myRoom.storage
            if (terminal) { if (terminal.store.getFreeCapacity() > 0) { if (this.transfer(terminal, resources[0]) == ERR_NOT_IN_RANGE) { this.travelTo(terminal) }; return } false }
            if (storage) { if (storage.store.getFreeCapacity() > 0) { if (this.transfer(storage, resources[0]) == ERR_NOT_IN_RANGE) { this.travelTo(storage) }; return false } }
            if (myRoom.level < 4) {
                let containerBase
                const containerBaseInfo = myRoom.structures.containers.find(c => !c.type)
                if (containerBaseInfo) containerBase = _obj(containerBaseInfo.id)
                if (containerBase) {
                    if (containerBase.store.getFreeCapacity() > 0) { if (this.transfer(containerBase, resources[0]) == ERR_NOT_IN_RANGE) { this.travelTo(containerBase) }; return false }
                }
            }
            this.drop(resources[0])
        }
        return false
    }
    else { return true }
}
Creep.prototype.renew = function () {
    if (this.memory.spawnToRenew) {
        const spawn = _obj(this.memory.spawnToRenew)
        if (spawn.spawning) { delete this.memory.spawnToRenew; return false }
        renew(spawn, this)
    }
    else {
        const myRoom = myRooms[this.memory.roomName]
        const spawns = idToObj(myRoom.structures.spawns).filter(spawn => !spawn.spawning)
        if (spawns.length) {
            if (spawns.length == 1) {
                const spawn = spawns[0]
                this.memory.spawnToRenew = spawn.id
                renew(spawn, this); return true
            }
            else {
                const spawn = this.pos.findClosestByPath(spawns, { ignoreCreeps: true })
                if (spawn) { renew(spawn, this); return true }
                else { return false }
            }
        }
        else { return false }
    }
    function renew(spawn, creep) {
        if (creep.pos.inRangeTo(spawn, 1)) {
            const res = spawn.renewCreep(creep)
            if (res == OK) { delete creep.memory.spawnToRenew }
        }
        else { creep.travelTo(spawn) }
        return true
    }

}
Creep.prototype.registerBoost = function (bodyPart = false) {
    const myRoom = myRooms[this.memory.spawnRoom]
    myRoom.registerBoost(this.memory.role, this.name, this.body, bodyPart)
}
Creep.prototype.getBoosted = function () {
    if (this.pos.roomName !== this.memory.spawnRoom) { return false }

    const myRoom = myRooms[this.memory.spawnRoom]; if (!myRoom || !myRoom.queues || !myRoom.queues.boost) return false
    if (myRoom.room.memory.labsBoostMode) {
        const boostQueue = myRoom.queues.boost.filter(b => b.creepName == this.name)
        if (boostQueue.length) {
            const boost = boostQueue[0]
            const labObj = _.find(myRoom.room.memory.labs, lab => lab.resourceType == boost.resourceType); if (!labObj) return
            const labId = labObj.id; if (!labId) return
            const lab = _obj(labId); if (!lab) return

            if (!this.pos.inRangeTo(lab, 1)) {
                this.travelTo(lab)
                this.say('boost')
                return true
            }
        }
    }
    else {
        const boostQueue = myRoom.queues.boost.filter(b => b.ready && b.creepName == this.name)
        if (boostQueue.length) {
            const boost = boostQueue[0]
            const lab = _obj(boost.lab)
            if (!lab) { boostQueue.splice(0, 1); return }
            const res = lab.boostCreep(this)
            switch (res) {
                case ERR_NOT_IN_RANGE: this.travelTo(lab); break
                case OK:
                    myRoom.registerSheduledTask('update labs')
                    myRoom.queues.boost.cut(boost); myRoom.boostBackup();
                    if (this.memory.role == 'harvest source') { this.memory.updateHarvestPower = gameTime }
                    break
                case ERR_NOT_FOUND: myRoom.queues.boost.splice(myRoom.queues.boost.indexOf(boost), 1); myRoom.boostBackup(); break
                case ERR_NOT_ENOUGH_RESOURCES: myRoom.queues.boost.splice(myRoom.queues.boost.indexOf(boost), 1); myRoom.boostBackup(); break
            }
            this.say('boost')
            return true
        }
        else if (!['repair', 'upgrade', 'defend_attack', 'defend_rangedAttack'].includes(this.memory.role) && myRoom.queues.boost.filter(b => b.creepName == this.name).length) {
            this.say('w8 4 b'); return true
        }
    }
}
Creep.prototype.rescueFromNuke = function () {
    const myRoom = myRooms[this.memory.roomName]
    if (!myRoom || !myRoom.my || !myRoom.nukes.length || !myRoom.timeToLandForNukes.length) { return false }
    const landingTime = myRoom.timeToLandForNukes[0]
    if (this.ticksToLive > landingTime - gameTime && gameTime + 100 > landingTime) {
        if (myRoom.rescuePosition) { this.say('nuk'); this.travelTo(myRoom.rescuePosition); return true }
    }
}
Creep.prototype.updateHarvestPower = function () {
    if (this.memory.harvestPower && this.memory.updateHarvestPower && gameTime == this.memory.updateHarvestPower) { return }
    this.memory.harvestPower = 0
    let multiplier
    if (this.memory.role == 'harvest mineral') { multiplier = 1 }
    else { multiplier = 2 }
    this.body.filter(b => b.type == WORK).forEach(part => {
        const boost = part.boost
        if (boost) {
            if (boost == 'XUHO2') { this.memory.harvestPower += 7 * multiplier }
            else if (boost == 'UHO2') { this.memory.harvestPower += 5 * multiplier }
            else if (boost == 'UO') { this.memory.harvestPower += 3 * multiplier }
        }
        else { this.memory.harvestPower += multiplier }
    })
    delete this.memory.updateHarvestPower
}
Creep.prototype._signController = function (text = '', object = false) {
    if (object) {
        if (this.signController(object, text) !== OK) { this.travelTo(object) }
    }
    else {
        if (this.signController(this.room.controller, text) !== OK) { this.travelTo(object) }
    }
}
Creep.prototype.moveByPathList1 = function () {
    if (!this.memory.task || this.memory.moveByPathList_done) { return }
    const task = tasks[this.memory.task]
    if (!task || !task.pathList || !task.pathList.length) { return }
    const step = task.pathList.indexOf(task.pathList.find(p => p.roomName == this.pos.roomName)) || 0, pathList = task.pathList
    if (step + 1 == pathList.length) { this.memory.moveByPathList_done = true; return }
    const stepData = pathList[step + 1], pos = new RoomPosition(stepData.x, stepData.y, stepData.roomName)
    this.travelTo(pos); return true
}
Creep.prototype.moveByPathList = function () {
    if (!this.memory.task || this.memory.moveByPathList_done) { return }
    const task = tasks[this.memory.task], room = this.room
    if (!task) { this.memory.moveByPathList_done = true; return }
    if (!task.pathList || !task.pathList.length) {
        const pos = new RoomPosition(task.pos.x, task.pos.y, task.pos.roomName)
        if (this.memory.debug) console.log(`this.pos.roomName == pos.roomName:${this.pos.roomName == pos.roomName}`)
        if (this.pos.roomName == pos.roomName) { this.memory.moveByPathList_done = true; return }
        else { this.travelTo(pos); return true }
    }
    if ((room.controller && room.controller.owner && room.controller.owner.username !== settings.username)
        || this.hits < this.hitsMax) { this.heal(this) }
    const step = this.memory.moveByPathList_step || 0, pathList = task.pathList, stepData = pathList[step]
    if (!stepData) { this.memory.moveByPathList_done = true; return }
    const pos = new RoomPosition(stepData.pos.x, stepData.pos.y, stepData.pos.roomName)
    if (step == 0) {
        if (tools.comparePositions(this.pos, pos)) { this.memory.moveByPathList_step = 1; this.moveByPathList(); return true }
        else { this.travelTo(pos); return true }
    }
    else {
        if (tools.comparePositions(this.pos, pos)) {
            if (pathList.length - 1 == step) { this.memory.moveByPathList_done = true; return }
            else { this.memory.moveByPathList_step++; this.moveByPathList(); return true }
        }
        else { this.moveByPath(stepData.path); return true }
    }
}
Creep.prototype._heal = function () {
    if (this.hits < this.hitsMax * 0.9) { this.heal(this); return }
    const range1 = this.pos.findInRange(FIND_MY_CREEPS, 1, { filter: c => c.hits < c.hitsMax })
    if (range1.length) { this.heal(range1.sort((a, b) => a.hits - b.hits)[0]); return }
    else {
        const range3 = this.pos.findInRange(FIND_MY_CREEPS, 3, { filter: c => c.hits < c.hitsMax })
        if (range3.length) { this.rangedHeal(range3.sort((a, b) => a.hits - b.hits)[0]); return true }
        else { this.heal(this) }
    }
}
Creep.prototype.__heal = function (creep) {
    if (this.pos.inRangeTo(creep, 1)) return this.heal(creep)
    if (this.pos.inRangeTo(creep, 3)) return this.rangedHeal(creep)
}
Creep.prototype.rangedAttack3 = function () {
    // const hostileCreeps = this.pos.findInRange(FIND_HOSTILE_CREEPS, 3, { filter: c => !tools.lookRampart(c.pos) })
    // if (hostileCreeps.length) {
    //     const hostile = hostileCreeps.sort((a, b) => a.hits - b.hits)
    //     if (this.pos.getRangeTo(hostile) == 1) { if (this.rangedMassAttack() == OK) { return true } }
    //     else { if (this.rangedAttack(hostile) == OK) { return true } }
    // }

    let structures = []
    if (this.room.controller && this.room.controller.owner && this.room.controller.owner.username !== settings.username) { structures = this.pos.findInRange(FIND_STRUCTURES, 3, { filter: str => str.structureType !== 'controller' && str.structureType !== 'powerBank' && str.structureType !== 'portal' }) }

    let enemies = this.pos.findInRange(FIND_HOSTILE_CREEPS, 3).concat(this.pos.findInRange(FIND_HOSTILE_POWER_CREEPS, 3)).filter(c => !tools.lookRampart(c.pos))
    if (enemies.length) {
        if (this.pos.findInRange(enemies, 1).length) { this.cancelOrder('rangedHeal'); this.rangedMassAttack() }
        else { enemies.sort((a, b) => a.hits - b.hits); this.cancelOrder('rangedHeal'); this.rangedAttack(enemies[0]) }
    }
    // else if (structures) { if (structures.length) { structures.sort((a, b) => !tools.lookRampart(a.pos) - !tools.lookRampart(b.pos) && a.hits - b.hits); this.rangedAttack(structures[0]) } }
    else if (structures) {
        if (structures.length) {
            let str
            str = structures.filter(s => !tools.lookRampart(s.pos))

            if (str.length) {
                if (str.filter(s => s.structureType !== 'road' && s.structureType !== 'constructedWall').length > 2) { this.rangedMassAttack() }
                else { str.sort((a, b) => a.hits - b.hits); this.rangedAttack(str[0]) }
            }
            else {
                str = structures.filter(s => s.structureType == 'rampart')
                if (str.length > 2) { this.rangedMassAttack() }
                else { structures.sort((a, b) => a.hits - b.hits); this.rangedAttack(structures[0]) }
            }
        }
    }
}
Creep.prototype.stepBack = function (target = false) {
    let task
    if (this.memory.task) { task = tasks[this.memory.tasks] }
    if (!target) {
        if (task && task.pathList.length) {
            const last = _.last(task.pathList).pos
            this.travelTo(new RoomPosition(last.x, last.y, last.roomName))
        }
    }
    else {
        const reverseDirection = tools.reverseDirection(this.pos.getDirectionTo(target))
        this.move(reverseDirection)
    }
}
Creep.prototype.leavingTheEdge = function (creep = false) {
    // const x = this.pos.x, y = this.pos.y
    // if (!this.memory.isStuck) return false
    // if (x == 0 || x == 49 )
    // if (this.memory.isStuck
    //     && (x == 1 || x == 48 || y == 1 || y == 48)
    //     && (heal.pos.x == 0 || heal.pos.x == 49 || heal.pos.y == 0 || heal.pos.y == 49)) {
    //     if (x == 1 || x == 48) {
    //         if (chekPosForMove({ x: x, y: y - 1, roomName: dismantle.pos.roomName }, heal)) { heal.moveTo(x, y - 1) }
    //         else if (chekPosForMove({ x: x, y: y + 1, roomName: dismantle.pos.roomName }, heal)) { heal.moveTo(dismantle.x, dismantle.y + 1) }
    //     }
    //     else if (y == 1 || y == 48) {
    //         if (chekPosForMove({ x: x - 1, y: y, roomName: dismantle.pos.roomName }, heal)) { heal.moveTo(x - 1, y) }
    //         else if (chekPosForMove({ x: x + 1, y: y, roomName: dismantle.pos.roomName }, heal)) { heal.moveTo(x + 1, y) }
    //     }
    // }
}