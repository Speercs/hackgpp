'use strict'
//2023.08.19 operate tower when operatespawn 
//2023.07.31 fix tower boost
//2023.07.18 - move to storage
//2023.07.07 - update tasks for extensions after operate extensions
//2023.06.19 - status for move

global.powerCreepsLogick = {}
powerCreepsLogick.main = function () {
    const powerCreeps = Object.keys(Game.powerCreeps)
    powerCreeps.forEach(pcName => {
        const pc = Game.powerCreeps[pcName]; if (!pc) { return }
        if (!pc.memory) { Memory.powerCreeps[pcName] = {} }
        if (!pc.memory.room) { return }
        if (myRooms[pc.memory.room]) {
            if (myRooms[pc.memory.room].my) {
                pc.powerSpawn = _obj(myRooms[pc.memory.room].structures.powerSpawn)
            }
        }
        if (pc.rescueFromNuke()) { return }
        powerCreepsLogick.run(pc)
    })
}
PowerCreep.prototype.getFreeStore = Creep.prototype.getFreeStore
PowerCreep.prototype._transfer = Creep.prototype._transfer
PowerCreep.prototype._withdraw = Creep.prototype._withdraw
PowerCreep.prototype.resetStatus = function () {
    let keys = ['operateSpawn', 'isStuck', '_trav', 'room', 'roomName', 'debug']

    const keysToDelete = Object.keys(this.memory).filter(key => !keys.includes(key))
    keysToDelete.forEach(key => delete this.memory[key])
    if (this.memory.debug) { this.say('!') }

    this.spliceTask()
}
PowerCreep.prototype.activatePower = function () {
    const myRoom = myRooms[this.memory.room]
    const controller = myRoom.room.controller
    if (this.enableRoom(controller) == ERR_NOT_IN_RANGE) { this.travelTo(controller) }
}
PowerCreep.prototype._spawn = function () {
    if (this.ticksToLive) { return }
    if (this.powerSpawn) { const res = this.spawn(this.powerSpawn); if (res == OK) { console.log(`${this}, was spawn in room: ${this.memory.room}`); }; return }
}
PowerCreep.prototype._renew = function () {
    this.say('renew')
    if (!this.ticksToLive) { return }
    if (this.powerSpawn) {
        if (this.room.name == this.memory.room) {
            if (this.pos.inRangeTo(this.powerSpawn, 1)) { this.renew(this.powerSpawn) }
            else { this.travelTo(this.powerSpawn) }
        }
    }
}
PowerCreep.prototype.regenMineral = function () {
    const power = PWR_REGEN_MINERAL
    if (this.store.getUsedCapacity(RESOURCE_OPS) < POWER_INFO[power].ops) { this.spliceTask() }
    else {
        const myRoom = myRooms[this.memory.room]
        if (!this.memory.object) { this.memory.object = Object.keys(myRoom.minerals)[0] }
        let operateSource = false

        const mineral = _obj(this.memory.object)
        if (mineral) {
            if (!mineral.ticksToRegeneration) {
                const res = this.usePower(power, mineral)
                if (res !== OK) { this.travelTo(mineral, { range: 3 }); operateSource = true }
                else if (res == OK) { this.spliceTask() }
            }
            else { this.spliceTask() }
        }
        else { this.spliceTask() }
        if (operateSource) { this.say('mineral') }
    }
}
PowerCreep.prototype.operateSpawn = function () {
    const power = PWR_OPERATE_SPAWN
    if (this.store.getUsedCapacity(RESOURCE_OPS) < POWER_INFO[power].ops) { this.spliceTask() }
    else {
        const myRoom = myRooms[this.memory.room]
        const spawns = idToObj(myRoom.structures.spawns)
        const spawnsWithoutBoost1 = spawns.filter(s => !s.effects)
        const spawnsWithoutBoost2 = spawns.filter(s => s.effects).filter(s => !s.effects.length)
        const spawnsWithoutBoost3 = spawns.filter(s => s.effects).filter(s => s.effects.length).filter(s => s.effects[0].ticksRemaining < 20)
        const spawnsWithoutBoost = spawnsWithoutBoost1.concat(spawnsWithoutBoost2, spawnsWithoutBoost3).sort((a, b) => b.spawning - a.spawning)
        if (spawnsWithoutBoost.length) {
            const spawn = spawnsWithoutBoost[0]
            const res = this.usePower(power, spawn)
            if (res !== OK) { this.travelTo(spawn, { range: 3 }) }
            else if (res == OK) { this.spliceTask() }
        }
        else { this.spliceTask() }
    }
}
PowerCreep.prototype.operatePower = function () {
    const myRoom = myRooms[this.memory.room]
    if (!this.memory.object) { this.memory.object = myRoom.structures.powerSpawn }
    let operateSource = false

    const powerSpawn = _obj(this.memory.object)
    if (powerSpawn) {
        const res = this.usePower(PWR_OPERATE_POWER, powerSpawn)
        if (res !== OK) { this.travelTo(powerSpawn, { range: 3 }); operateSource = true }
        else if (res == OK) { this.spliceTask() }
    }
    else { this.spliceTask() }
    if (operateSource) { this.say('power') }
}
PowerCreep.prototype.spliceTask = function () {
    delete this.memory.object
    delete this.memory.status

    const taskList = cache.powerCreepsTasks[this.name]
    if (!taskList) { return }
    if (!taskList.length) { return }
    taskList.splice(0, 1)
}
PowerCreep.prototype.rescueFromNuke = function () {
    const myRoom = myRooms[this.memory.room]
    if (!myRoom || !myRoom.my || !myRoom.nukes.length || !myRoom.timeToLandForNukes.length) { return false }
    const landingTime = myRoom.timeToLandForNukes[0]
    if (this.ticksToLive > landingTime - gameTime && gameTime + 100 > landingTime) {
        if (myRoom.rescuePosition) { this.say('nuk'); this.travelTo(myRoom.rescuePosition); return true }
    }
}
PowerCreep.prototype.regenSource = function () {
    const power = PWR_REGEN_SOURCE, debug = this.memory.debug; let debugText = `${this} regenSource\n`
    if (this.store.getUsedCapacity(RESOURCE_OPS) < POWER_INFO[power].ops) { this.spliceTask() }
    else {
        const myRoom = myRooms[this.memory.room]
        let enemies = _.filter(myRoom.enemies, e => e.owner !== 'Invader' && !e.hiden && e.parameters && (e.parameters.attack || e.parameters.rangedAttack))
        if (debug) debugText += `this.memory.object: ${this.memory.object}\n`
        if (!this.memory.object) {
            const sources = idToObj(Object.keys(myRoom.sources)).filter(s => s.energy !== s.energyCapacity)
            if (debug) debugText += `sources: ${sources}\n`
            const sourcesWithoutBoost1 = sources.filter(s => !s.effects)
            if (debug) debugText += `sourcesWithoutBoost1: ${sourcesWithoutBoost1}\n`
            const sourcesWithoutBoost2 = sources.filter(s => s.effects).filter(s => !s.effects.length)
            if (debug) debugText += `sourcesWithoutBoost2: ${sourcesWithoutBoost2}\n`
            const sourcesWithoutBoost3 = sources.filter(s => s.effects).filter(s => s.effects.length).filter(s => s.effects[0].ticksRemaining < 50)
            if (debug) debugText += `sourcesWithoutBoost3: ${sourcesWithoutBoost3}\n`
            let sourcesWithoutBoost = sourcesWithoutBoost1.concat(sourcesWithoutBoost2, sourcesWithoutBoost3)
            if (enemies.length) { sourcesWithoutBoost = sourcesWithoutBoost.filter(s => myRoom.tasks.harvestSource[s.id].inBase) }
            if (debug) debugText += `sourcesWithoutBoost: ${sourcesWithoutBoost}\n`
            if (sourcesWithoutBoost.length) {
                let source = this.pos.findClosestByPath(sourcesWithoutBoost)
                if (!source) { source = sourcesWithoutBoost[0] }
                this.memory.object = source.id
            }
            else { this.spliceTask() }
        }
        const obj = _obj(this.memory.object)
        if (debug) debugText += `obj: ${obj}\n`
        let operateSource
        if (obj) {
            if (myRoom.tasks.harvestSource[obj.id].halted) { this.spliceTask(); return }
            const sourceWorkers = _.filter(myRoom.creeps, c => c.memory.role == 'harvest source' && c.memory.id == obj.id).length
            if (debug) debugText += `sourceWorkers: ${sourceWorkers}\n`
            if (sourceWorkers) {
                const res = this.usePower(power, obj)
                if (debug) debugText += `this.usePower(power, obj): ${res}\n`
                if (res !== OK) { this.travelTo(obj, { range: 3 }); operateSource = true }
                else if (res == OK) { this.spliceTask() }
            }
            else { this.spliceTask() }
        }
        else { this.spliceTask() }
        if (debug) console.log(debugText + `operateSource: ${operateSource}`)
        if (operateSource) { this.say('source'); return true }
    }
}
PowerCreep.prototype.operateFactory = function () {
    const power = PWR_OPERATE_FACTORY
    if (this.store.getUsedCapacity(RESOURCE_OPS) < POWER_INFO[power].ops) { this.spliceTask() }
    else {
        const myRoom = myRooms[this.memory.room]
        const factory = _obj(myRoom.structures.factory)

        if (factory) {
            const res = this.usePower(power, factory)
            if (res !== OK) { this.travelTo(factory, { range: 3 }); return }
            else if (res == OK) { this.spliceTask() }
        }
        else { this.spliceTask() }
    }
}
PowerCreep.prototype.operateLab = function () {
    const power = PWR_OPERATE_LAB
    if (this.store.getUsedCapacity(RESOURCE_OPS) < POWER_INFO[power].ops) { this.spliceTask() }
    else {
        const myRoom = myRooms[this.memory.room]

        if (!this.memory.object) {
            const labsForBoost = myRoom.queues.boost.filter(b => b.lab).map(b => b.lab)
            const labsIn = idToObj(_.filter(myRoom.structures.labs, lab => lab.role == 'in' && !labsForBoost.includes(lab.id)).map(lab => lab.id))
            let labs = labsIn.filter(lab => lab.effects).filter(lab => !lab.effects.length)
            if (!labs.length) { labs = labsIn.filter(lab => !lab.effects && lab.cooldown) }

            if (labs.length) {
                const lab = this.pos.findClosestByPath(labs)
                if (lab) { this.memory.object = lab.id }
            }
            else { }
        }
        let operateLab = false
        const lab = _obj(this.memory.object)
        if (lab) {
            const res = this.usePower(power, lab)
            if (res !== OK) { this.travelTo(lab, { range: 3 }); operateLab = true }
            else if (res == OK) { this.spliceTask() }
        }
        else { this.spliceTask() }
        if (operateLab) { this.say('labs'); return true }
    }
}
PowerCreep.prototype.operateExtensions = function () {
    const power = PWR_OPERATE_LAB
    if (this.store.getUsedCapacity(RESOURCE_OPS) < POWER_INFO[power].ops) { this.spliceTask() }
    const myRoom = myRooms[this.memory.room]
    if (!myRoom.storage) { this.spliceTask(); return }
    // if (this.powers[PWR_OPERATE_EXTENSION]) {
    // if (!this.powers[PWR_OPERATE_EXTENSION].cooldown) {
    if (myRoom.room.energyAvailable < myRoom.room.energyCapacityAvailable) {
        const res = this.usePower(PWR_OPERATE_EXTENSION, myRoom.storage)
        if (res !== OK) { this.travelTo(myRoom.storage, { range: 3 }); this.say('ext'); return }
        else if (res == OK) { this.spliceTask(); if (myRoom.queues.spawn.length) {myRoom.registerSheduledTask('update extensions')} }
    }
    else { this.spliceTask() }
}
PowerCreep.prototype.operateTower = function () {
    const power = PWR_OPERATE_TOWER
    if (this.store.getUsedCapacity(RESOURCE_OPS) < POWER_INFO[power].ops) { this.spliceTask() }
    else {
        const myRoom = myRooms[this.memory.room]
        const towers = idToObj(myRoom.structures.towers)
        const towersWithoutBoost1 = towers.filter(s => !s.effects)
        const towersWithoutBoost2 = towers.filter(s => s.effects).filter(s => !s.effects.length)
        const towersWithoutBoost3 = towers.filter(s => s.effects).filter(s => s.effects.length).filter(s => s.effects[0].ticksRemaining < 20)
        const towersWithoutBoost = towersWithoutBoost1.concat(towersWithoutBoost2, towersWithoutBoost3)
        if (towersWithoutBoost.length) {
            const tower = towersWithoutBoost[0]
            const res = this.usePower(power, tower)
            if (res !== OK) { this.travelTo(tower, { range: 3 }) }
            else if (res == OK) { this.spliceTask() }
        }
        else { this.spliceTask() }
    }
}
PowerCreep.prototype._manage = function () {
    const debug = this.memory.debug
    if (this.memory.manage_status == 'manage') { this.manage(); if (debug) { console.log(this, 'manage') } }
    else if (this.memory.manage_status == 'get resources') {
        this.manage_setResourceToWithdraw(); if (debug) console.log(this, 'manage_setResourceToWithdraw')
    }
    else { this.manage_gettingTasks(); if (debug) { console.log(this, 'manage_gettingTasks') } }
    if (!this.memory.manage_status) this.resetStatus(); if (debug) { console.log(this, 'resetStatus') }
    // const myRoom = myRooms[this.memory.room]
    // && !myRoom.tasks.manage.tasks.filter(t => t.creepName == this.name).length) this.manage_gettingTasks()
}
PowerCreep.prototype.getOps = function () {
    const debug = this.memory.debug
    const myRoom = myRooms[this.memory.room]
    if (Object.keys(this.store).filter(r => r !== 'ops').length && !this.getFreeStore()) { if (debug) { console.log(this, 'getFreeStore') }; return }
    if (this.store.getFreeCapacity(RESOURCE_OPS) > 0) {
        const withdrawObj = (myRoom.storage.store.getUsedCapacity(RESOURCE_OPS) > myRoom.terminal.store.getUsedCapacity(RESOURCE_OPS)) ? myRoom.storage : myRoom.terminal
        let amount; if (this.level > 1) { amount = this.store.getCapacity() - this.store.getUsedCapacity(RESOURCE_OPS) - 100 }
        const amountInObj = withdrawObj.store.getUsedCapacity('ops')
        if (amount && amountInObj < amount) { amount = amountInObj }
        if (amount) this._withdraw(withdrawObj, RESOURCE_OPS, amount)
        else if (amountInObj) this._withdraw(withdrawObj, RESOURCE_OPS)
    }
}
PowerCreep.prototype.setOps = function () {
    const myRoom = myRooms[this.memory.room]
    let store
    if (myRoom.terminal) { if (myRoom.terminal.store.getFreeCapacity('ops') >= 100) { store = myRoom.terminal } }
    if (myRoom.storage) { if (myRoom.storage.store.getFreeCapacity('ops') >= 100) { store = myRoom.storage } }
    if (store) {
        if (this.transfer(store, RESOURCE_OPS, 100) == ERR_NOT_IN_RANGE) { this.travelTo(store); return true }
    }
    else { if (this.memory.debug) { console.log(this.name, 'cant setOps') }; return false }
}
PowerCreep.prototype.getStatus = function () {
    const debug = this.memory.debug;
    let debugText = `${this} getStatus\n`
    delete this.memory.status; delete this.memory.object
    const myRoom = myRooms[this.memory.room], myRoomStatus = myRoom.room.memory.status
    let enemies = _.filter(cache.enemies, e => e.owner !== 'Invader' && e.pos.roomName == myRoom.name && e.parameters && (e.parameters.dismantle || e.parameters.attack || e.parameters.rangedAttack))
    if (debug) debugText += `enemies: ${JSON.stringify(enemies)}\n`
    let readyPowers = Object.keys(this.powers).filter(p => p !== PWR_GENERATE_OPS && p !== PWR_FORTIFY)
    if (myRoom.tasks.manage.tasks.filter(t => !t.creepName).length > myRoom.tasks.manage.requiredWorkers) readyPowers.push('manage')
    if (this.memory.operateSpawn) { readyPowers = Object.keys(this.powers).filter(p => p == PWR_OPERATE_EXTENSION || p == PWR_OPERATE_SPAWN || p == PWR_OPERATE_TOWER) }
    const priority = {
        [PWR_OPERATE_EXTENSION]: 5,
        [PWR_OPERATE_SPAWN]: 2,
        [PWR_OPERATE_TOWER]: 3,
        [PWR_FORTIFY]: 4,
        [PWR_OPERATE_FACTORY]: 5,
        [PWR_REGEN_MINERAL]: 6,
        [PWR_REGEN_SOURCE]: 7,
        [PWR_OPERATE_LAB]: 8,
        manage: 9
    }
    const taskList = cache.powerCreepsTasks[this.name]

    if (debug) debugText += `taskList: ${JSON.stringify(taskList)}\n`
    if (taskList.length) { setStatus(taskList, this); if (debug) { console.log(debugText) }; return }
    if (debug) debugText += `readyPowers: ${JSON.stringify(readyPowers)}\n`
    readyPowers.forEach(power => {
        const cooldown = (power == 'manage') ? 0 : this.powers[power].cooldown
        if (power == PWR_OPERATE_TOWER && !cooldown) {
            if (!myRoomStatus && enemies.length) {
                if (debug) debugText += `push PWR_OPERATE_TOWER\n`
                taskList.push({ power: power, priority: priority[power] })
            }
        }
        if (power == 'manage') { taskList.push({ power: power, priority: priority[power] }) }
        if ((!myRoomStatus && power == PWR_OPERATE_SPAWN && !cooldown) || this.memory.operateSpawn) {
            if (myRoom.queues.spawn.length > 1 || this.memory.operateSpawn) {
                taskList.push({ power: power, priority: priority[power] })
            }
        }
        else if (!myRoomStatus && power == PWR_FORTIFY && !cooldown) {
            if (enemies.length) {
                taskList.push({ power: power, priority: priority[power] })
            }
        }
        else if (power == PWR_OPERATE_FACTORY) {
            if (myRoom.structures.factory) {
                const factory = _obj(myRoom.structures.factory)
                if (factory) {
                    if (factory.effects) {
                        if (factory.effects.length) {
                            const ticksRemaining = factory.effects[0].ticksRemaining
                            const distance = myRoom.getDistanceByPath(this, factory, true)
                            if (ticksRemaining <= distance) { taskList.push({ power: power, priority: priority[power] }) }
                        }
                        else { taskList.push({ power: power, priority: priority[power] }) }
                    }
                    else { taskList.push({ power: power, priority: priority[power] }) }
                }
            }
        }
        else if (power == PWR_OPERATE_EXTENSION) {
            if (this.memory.debug) { console.log(this.name, 'PWR_OPERATE_EXTENSION') }
            if (this.memory.debug) { console.log(this.name, `myRoom.room.energyAvailable < myRoom.room.energyCapacityAvailable : ${myRoom.room.energyAvailable < myRoom.room.energyCapacityAvailable}`) }
            if (myRoom.room.energyAvailable < myRoom.room.energyCapacityAvailable) {
                if (this.memory.debug) { console.log(this.name, `cooldown:${cooldown}`) }
                if (this.memory.debug) { console.log(this.name, `myRoom.storage:${myRoom.storage}`) }
                if (cooldown) {
                    if (myRoom.storage && myRoom.storage.store['energy'] > 1000) {
                        const distance = myRoom.getDistanceByPath(this, myRoom.storage, true)
                        if (this.memory.debug) { console.log(this.name, `distance >= cooldown:${distance >= cooldown}`) }
                        if (distance >= cooldown) { taskList.push({ power: power, priority: priority[power] }) }
                    }
                }
                else if (myRoom.storage) { taskList.push({ power: power, priority: priority[power] }) }
            }

        }
        else if (!myRoomStatus && power == PWR_OPERATE_LAB) {
            if (!cooldown) {
                const labsForBoost = myRoom.queues.boost.filter(b => b.lab).map(b => b.lab)
                const labsIn = idToObj(_.filter(myRoom.structures.labs, lab => lab.role == 'in' && !labsForBoost.includes(lab.id)).map(lab => lab.id))
                if (this.memory.debug) { console.log(this.name, `get status pwr lab, labsin: ${labsIn}`) }
                let labs = labsIn.filter(lab => !lab.effects && lab.cooldown > 0).concat(labsIn.filter(lab => lab.effects).filter(lab => !lab.effects.length && lab.cooldown > 0))
                if (this.memory.debug) { console.log(this.name, `get status pwr lab, labs: ${labs}`) }
                if (labs.length) { taskList.push({ power: power, priority: priority[power] }) }
            }

        }
        else if (power == PWR_REGEN_MINERAL) {
            const mineral = _obj(Object.keys(myRoom.minerals)[0])
            if (mineral) {
                if (myRoom.structures.extractor) {
                    if (!enemies.length || myRoom.tasks.harvestMineral.inBase) {
                        if (cooldown) {
                            const distance = myRoom.getDistanceByPath(this, mineral, true)
                            if (distance >= cooldown && !mineral.ticksToRegeneration) { taskList.push({ power: power, priority: priority[power] }) }
                        }
                        else if (!mineral.ticksToRegeneration) {
                            if (mineral.effects) {
                                if (mineral.effects.length) {
                                    if (mineral.effects[0].ticksRemaining < 50) { taskList.push({ power: power, priority: priority[power] }) }

                                }
                                else { taskList.push({ power: power, priority: priority[power] }) }
                            }
                            else { taskList.push({ power: power, priority: priority[power] }) }
                        }
                    }
                }
            }
        }
        else if (!myRoomStatus && power == PWR_REGEN_SOURCE) {
            if (!cooldown) {
                const sources = idToObj(Object.keys(myRoom.sources))
                const sourcesWithoutBoost1 = sources.filter(s => !s.effects)
                const sourcesWithoutBoost2 = sources.filter(s => s.effects).filter(s => !s.effects.length)
                const sourcesWithoutBoost3 = sources.filter(s => s.effects).filter(s => s.effects.length).filter(s => s.effects[0].ticksRemaining < 50)
                let sourcesWithoutBoost = sourcesWithoutBoost1.concat(sourcesWithoutBoost2, sourcesWithoutBoost3)
                if (enemies.length) { sourcesWithoutBoost = sourcesWithoutBoost.filter(source => myRoom.tasks.harvestSource[source.id].inBase) }
                if (sourcesWithoutBoost.length) { taskList.push({ power: power, priority: priority[power] }) }
            }
        }
        else if (!myRoomStatus && power == PWR_OPERATE_POWER) {
            const powerSpawn = _obj(myRoom.structures.powerSpawn)
            if (powerSpawn && Game.cpu.bucket > settings.bucket.processPower) {
                if (powerSpawn.store['energy']) {
                    if (cooldown) {
                        const distance = myRoom.getDistanceByPath(this, powerSpawn, true)
                        if (distance >= cooldown && !powerSpawn.ticksToRegeneration) { taskList.push({ power: power, priority: priority[power] }) }
                    }
                    else if (powerSpawn.effects) {
                        if (powerSpawn.effects.length) {
                            if (powerSpawn.effects[0].ticksRemaining < 50) { taskList.push({ power: power, priority: priority[power] }) }

                        }
                        else { taskList.push({ power: power, priority: priority[power] }) }
                    }
                    else { taskList.push({ power: power, priority: priority[power] }) }
                }
            }
        }
        //else { taskList.push({ power: power, priority: priority[power] }) }
    })
    taskList.sort((a, b) => a.priority - b.priority)
    if (debug) debugText += `taskList: ${JSON.stringify(taskList)}\n`
    if (taskList.length) { setStatus(taskList, this) }
    function setStatus(taskList, powerCreep) {
        const task = taskList[0]
        if (task.power == PWR_OPERATE_EXTENSION) { powerCreep.memory.status = 'extensions' }
        else if (task.power == PWR_OPERATE_TOWER) { powerCreep.memory.status = 'tower' }
        else if (task.power == PWR_OPERATE_SPAWN) { powerCreep.memory.status = 'spawn' }
        else if (task.power == PWR_OPERATE_FACTORY) { powerCreep.memory.status = 'factory' }
        else if (task.power == PWR_REGEN_MINERAL) { powerCreep.memory.status = 'mineral' }
        else if (task.power == PWR_REGEN_SOURCE) { powerCreep.memory.status = 'source' }
        else if (task.power == PWR_FORTIFY) { powerCreep.memory.status = 'fortify' }
        else if (task.power == PWR_OPERATE_LAB) { powerCreep.memory.status = 'lab' }
        else if (task.power == PWR_OPERATE_POWER) { powerCreep.memory.status = 'power' }
        else if (task.power == 'manage') { powerCreep.memory.status = 'manage' }
    }
    if (debug) debugText += `status: ${this.memory.status}`
    if (debug) console.log(debugText)
}
powerCreepsLogick.run = function (pc) {
    const cpu = settings.writePerformanceLog ? Game.cpu.getUsed() : 0
    const myRoom = myRooms[pc.memory.room], debug = pc.memory.debug

    if (debug) { console.log(`powerCreepsLogick.run : ${pc.name}`) }
    if (!cache.powerCreepsTasks[pc.name]) { cache.powerCreepsTasks[pc.name] = [] }
    if (!pc.ticksToLive) { pc._spawn(); if (debug) console.log(pc.name, `pc.ticksToLive:`); return }
    if (pc.room.name !== pc.memory.room && pc.memory.status == 'move') {
        const mr = myRooms[pc.memory.room]
        if (mr) { if (mr.my) { pc.travelTo(mr.room.controller); return } }
        pc.travelTo(new RoomPosition(25, 25, pc.memory.room), { reusePath: 50 }); pc.usePower(PWR_GENERATE_OPS); return
    }
    else if (pc.room.name == pc.memory.room && pc.memory.status == 'move') pc.resetStatus()
    const powers = pc.powers
    if (powers[PWR_GENERATE_OPS] && pc.memory.status !== 'manage' && pc.memory.manage_status !== 'get resources') {
        pc.usePower(PWR_GENERATE_OPS)
        if (pc.store.getCapacity(RESOURCE_OPS) == pc.store.getUsedCapacity(RESOURCE_OPS)) { if (pc.setOps()) { return } }
    }
  
    if (pc.ticksToLive < 1000) { pc._renew(); return }
    if (!myRoom) { return }
    if (!myRoom.my) { return }
    if (!myRoom.room.controller.isPowerEnabled) { pc.activatePower(); return }
    if ((pc.memory.status !== 'manage' && pc.store.getCapacity(RESOURCE_OPS) / pc.store.getUsedCapacity(RESOURCE_OPS)) > 2 && myRoom.terminal) {
        if (myRoom.terminal.store.getUsedCapacity('ops')) { pc.getOps(); return }
    }
    const status = pc.memory.status
    if (!status) { pc.getStatus() }
    if (status == 'tower') { pc.operateTower() }
    else if (status == 'spawn') { pc.operateSpawn() }
    else if (status == 'extensions') { pc.operateExtensions() }
    else if (status == 'factory') { pc.operateFactory() }
    else if (status == 'mineral') { pc.regenMineral() }
    else if (status == 'lab') { pc.operateLab() }
    else if (status == 'source') { pc.regenSource() }
    else if (status == 'power') { pc.operatePower() }
    else if (status == 'manage') { pc._manage() }
    else if (status == 'fortify') { pc.spliceTask() }
    else { if (myRoom.storage) { if (pc.pos.getRangeTo(myRoom.storage) > 3) { pc.travelTo(myRoom.storage, { range: 3 }) } } }


    // else { if (!pc.pos.inRangeTo(pc.powerSpawn, 1)) { pc.travelTo(pc.powerSpawn) } }
    settings.writePerformanceLog ? performance.newLog(cpu, 'powerCreeps.run') : false
}