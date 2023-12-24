'use strict'
//2023.08.17 always upgrade dont spread to rooms < 8lvl
MyRoom.prototype.upgrade = function () {
    const cpu = settings.writePerformanceLog ? Game.cpu.getUsed() : 0
    if (Game.cpu.bucket < settings.bucket.upgrade && this.room.controller.ticksToDowngrade > 1000) { return }

    const creeps = this.creeps.filter(creep => creep.memory.role == 'upgrade')
    if (!creeps.length) { settings.writePerformanceLog ? performance.newLog(cpu, 'MyRoom.prototype.upgrade', this.name) : false; return }
    const task = this.tasks.upgrade
    task.withdrawObjects = []
    const linkMem = _.find(this.structures.links, l => l.type == 'controller')
    let link
    if (linkMem) link = _obj(linkMem.id)
    if (link && link.store.getUsedCapacity(RESOURCE_ENERGY) < 600) {
        const linkStorageMem = _.find(this.structures.links, l => l.type == 'storage')
        if (linkStorageMem) {
            const linkStorage = _obj(linkStorageMem.id)
            this.registerManageTask({ object1: linkStorage, amount: 800, type: 'fill structure', priority: 6 })
        }

    }
    if (creeps.filter(creep => !creep.store.getUsedCapacity(RESOURCE_ENERGY)).length) {
        if (this.storage) { if (this.storage.store[RESOURCE_ENERGY] > 10000) { task.withdrawObjects.push(this.storage) } }
        if (this.terminal) { if (this.terminal.store[RESOURCE_ENERGY] > 5000) { task.withdrawObjects.push(this.terminal) } }
        // if (this.level < 7) {
        let containerControllers
        const containerControllerInfo = this.structures.containers.filter(c => c.type == 'controller').map(c => c.id)
        if (containerControllerInfo.length) containerControllers = idToObj(containerControllerInfo).filter(c => c.store['energy'])
        if (containerControllers && containerControllers.length) {
            containerControllers.forEach(containerController => task.withdrawObjects.push(containerController))
        }
        // }
        let controllerLinkWasAdd

        if (link) {
            if (link.store.getUsedCapacity(RESOURCE_ENERGY)) { task.withdrawObjects.push(link); controllerLinkWasAdd = true }
        }

        const enemies = _.filter(cache.enemies, e => e.pos.roomName == this.name)
        if (!enemies.length && !controllerLinkWasAdd) {
            const towers = idToObj(this.structures.towers)
            const towersWithEnergy = towers.filter(tower => tower.store.getUsedCapacity(RESOURCE_ENERGY) > 500)
            towersWithEnergy.forEach(tower => task.withdrawObjects.push(tower))
        }
        if (!task.withdrawObjects.length && each10) { console.log(this.name, `upgraders dont have energy to work`) }        
    }

    creeps.forEach(creep => {
        if (creep.spawning || creep.getBoosted() || creep.rescueFromNuke()) { return }
        if (creep.ticksToLive < 30 || creep.memory.goToDie) { creep.goToDie(); return }
        if (!creep.store.getUsedCapacity(RESOURCE_ENERGY)) { creep.resetStatus(creep) }
        //set status        
        if (creep.memory.status == 'withdraw' && creep.store.getUsedCapacity(RESOURCE_ENERGY)) { creep.memory.status = 'upgrade' }

        if (creep.memory.status == 'upgrade' && !creep.store.getUsedCapacity(RESOURCE_ENERGY)) { creep.resetStatus() }
        if (!creep.memory.status) {
            if (!creep.store.getUsedCapacity(RESOURCE_ENERGY)) { creep.memory.status = 'withdraw' }
            else { creep.memory.status = 'upgrade' }
        }
        switch (creep.memory.status) {
            case 'withdraw':
                if (task.withdrawObjects.length) {
                    let target
                    if (task.withdrawObjects.length == 1) { target = task.withdrawObjects[0] }
                    else { target = Game.rooms[creep.memory.roomName].controller.pos.findClosestByPath(task.withdrawObjects, { ignoreCreeps: true, maxOps: 100 }) }
                    if (target) {
                        creep.memory.withdrawObject = target.id;
                        if (creep._withdraw(target) == OK) {
                            if (target.structureType == 'tower') {
                                // const amountToFill = (target.store.getUsedCapacity('energy') - creep.store.getFreeCapacity() < 0) ? 1000 : (target.store.getUsedCapacity('energy') - creep.store.getFreeCapacity())
                                // this.registerManageTask({ object1: target, amount: amountToFill, type: 'fill structure', priority: 6 })
                                this.registerManageTask({ object1: target, amount: 1000, type: 'fill structure', priority: 6 })
                            }
                        }
                    }
                    else { creep._withdraw(this.storage, RESOURCE_ENERGY) }
                }; break
            case 'upgrade':
                // if (this.room.controller.level == 8 && this.room.controller.ticksToDowngrade == 200000 && !settings.tasks.alwaysUpgrade && gameTime !== settings.scriptLoadTime) { creep.memory.goToDie = true; creep.goToDie(); return }
                if (this.level < 4 || (this.level >= 4 && this.resources.energy > 10000)) { creep._upgradeController() }
                if (creep.memory.withdrawObject) {
                    if (creep.store.getUsedCapacity('energy') <= creep.body.filter(b => b.type == WORK).length) {
                        const withdrawObject = _obj(creep.memory.withdrawObject)
                        if (withdrawObject) {
                            if (this.room.controller.level == 8 && withdrawObject.structureType == 'tower') { delete creep.memory.withdrawObject; return }
                            if (creep.pos.inRangeTo(withdrawObject), 1) {
                                if (withdrawObject.structureType == STRUCTURE_STORAGE) { if (withdrawObject.store[RESOURCE_ENERGY] > 10000) { creep.withdraw(withdrawObject, RESOURCE_ENERGY) } }
                                else {
                                    if (creep.withdraw(withdrawObject, RESOURCE_ENERGY) == OK) {
                                        if (withdrawObject.structureType == 'tower') {
                                            // const amountToFill = (withdrawObject.store.getUsedCapacity('energy') - creep.store.getFreeCapacity() < 0) ? 1000 : (withdrawObject.store.getUsedCapacity('energy') - creep.store.getFreeCapacity())
                                            this.registerManageTask({ object1: withdrawObject, amount: 1000, type: 'fill structure', priority: 6 })
                                        }
                                    }
                                }
                            }
                        }
                    }
                }; break
        }
    })
    if (this.settings.debug.upgrade) { console.log(this.name, `upgrade cpu: ${Game.cpu.getUsed() - cpu}`) }
    settings.writePerformanceLog ? performance.newLog(cpu, 'MyRoom.prototype.upgrade', this.name) : false
}
MyRoom.prototype.updateTaskUpgrade = function () {
    const cpu = settings.writePerformanceLog ? Game.cpu.getUsed() : 0
    const controller = this.room.controller

    if (controller.level == 8) {
        if (!cache.RoomsSortedByTicksToDowngrade) { tools.sortMyRoomsByTicksToDowngrade() }
        const countOfRooms = cache.RoomsSortedByTicksToDowngrade.length
        // if (countOfRooms < 10) {
        //     if (controller.ticksToDowngrade < 195000) { this.tasks.upgrade.requiredWorkers = 1 }
        //     else if (controller.ticksToDowngrade == 200000) { this.tasks.upgrade.requiredWorkers = 0 }
        // }
        // else {
        const upgraders = _.filter(Game.creeps, c => c.memory.role == 'upgrade' && myRooms[c.memory.spawnRoom].level == 8).length
        if (this.name == cache.RoomsSortedByTicksToDowngrade[0].name) {
            if (!upgraders || (controller.ticksToDowngrade < countOfRooms * 10000)) { this.tasks.upgrade.requiredWorkers = 1 } else { this.tasks.upgrade.requiredWorkers = 0 }
        }
        else { this.tasks.upgrade.requiredWorkers = 0 }

    }
    settings.writePerformanceLog ? performance.newLog(cpu, 'MyRoom.prototype.updateTaskUpgrade') : false
}
MyRoom.prototype.manageTaskUpgrade = function () {
    const cpu = settings.writePerformanceLog ? Game.cpu.getUsed() : 0

    if (this.level < 8 || (this.level == 8 && this.room.controller.ticksToDowngrade < 190000) || settings.tasks.alwaysUpgrade) {
        const role = 'upgrade'

        if (!this.storage && !this.terminal && !this.structures.containers.find(c => c.type == 'controller')) { return }
        const task = this.tasks.upgrade
        if (task.halted) { return }
        if (this.level == 8 && settings.tasks.alwaysUpgrade && !this.room.memory.status) { if (!task.requiredWorkers) { task.requiredWorkers = 1 } }
        const requiredWorkers = (task.requiredWorkers) ? task.requiredWorkers : 0

        const workers = _.filter(Game.creeps, creep => creep.memory.role == role && creep.memory.roomName == this.name)
        const willDie = workers.filter(w => w.ticksToLive < 200).length

        if (this.queues.spawn.filter(st => st.role == role).length + workers.length - willDie >= requiredWorkers) { return }

        const specifications = {
            role: role,
            priority: settings.spawn.priority.upgrade,
            creepBody: spawnLogick.getBody(role, this.room.energyCapacityAvailable, { roomLevel: this.level }),
            memory: {
                role: role,
                roomName: this.name,
            },
        }
        this.registerSpawn(specifications)
    }

    settings.writePerformanceLog ? performance.newLog(cpu, 'MyRoom.prototype.manageTaskUpgrade') : false
}
Creep.prototype._upgradeController = function () {
    const controller = Game.rooms[this.memory.roomName].controller
    if (this.upgradeController(controller) == ERR_NOT_IN_RANGE) { this.travelTo(controller, { range: 3 }) }
}