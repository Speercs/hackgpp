'use strict'
//2023.08.23 task halted when defend room
roles.harvestSource = {}
MyRoom.prototype.harvestSource = function (sourceId) {
    if (this.settings.debug.harvestSource) { console.log(this.name, 'harvestSource: ', sourceId) }
    if (this.halted || Game.cpu.bucket < settings.bucket.harvestSource) {
        if (this.settings.debug.harvestSource) { console.log(this.name, 'harvestSource: ', sourceId), `Game.cpu.bucket < settings.bucket.harvestSource` }; return
    }
    if (cache.cpu.functionsCurrentTick.modules['MyRoom.prototype.harvestSource']) {
        if (this.settings.debug.harvestSource) { console.log(this.name, 'harvestSource:', 'cpuUsed:', cache.cpu.functionsCurrentTick.modules['MyRoom.prototype.harvestSource'].cpuUsed, 'cpuUsed > settings.tasks.harvestSourceCPU:', settings.tasks.harvestSourceCPU, cache.cpu.functionsCurrentTick.modules['MyRoom.prototype.harvestSource'].cpuUsed > settings.tasks.harvestSourceCPU) }
        if (cache.cpu.functionsCurrentTick.modules['MyRoom.prototype.harvestSource'].cpuUsed > settings.tasks.harvestSourceCPU) { return }
    }
    let zeroManagers = this.zeroManagers()
    if (this.storage) { if (!this.storage.store.getFreeCapacity('energy')) { zeroManagers = true } }
    const cpu = settings.writePerformanceLog ? Game.cpu.getUsed() : 0

    const task = this.tasks.harvestSource[sourceId]
    let container
    if (task.container) {
        container = _obj(task.container)
        if (container) {
            const containers_base = idToObj(this.structures.containers.filter(c => !c.type).map(c => c.id))
            let containerBase
            if (containers_base.length) containerBase = containers_base.sort((a, b) => a.store['energy'] - b.store['energy'])[0]
            if (containerBase) {
                const priority = containerBase.store['energy'] > 1000 ? 6 : 5
                if (container.store['energy'] > 500) {
                    this.registerManageTask({ object1: container, object2: containerBase, resourceType: 'energy', amount: container.store['energy'], type: 'transfer', priority: priority })
                }
            }
            else if (this.storage) {
                const priority = this.storage.store['energy'] > 1000 ? 6 : 5
                this.registerManageTask({ object1: container, object2: this.storage, resourceType: 'energy', amount: container.store['energy'], type: 'transfer', priority: priority })
            }
        }
    }
    const creeps = this.creeps.filter(creep => !creep.spawning && creep.memory.role == 'harvest source' && creep.memory.id == sourceId)
    if (creeps.length) {
        let enemies = _.filter(cache.enemies, e => !e.hiden && e.owner !== 'Invader' && e.pos.roomName == this.name && e.parameters && (e.parameters.dismantle || e.parameters.attack || e.parameters.rangedAttack))
        if (enemies.length && !task.inBase) {
            task.halted = true
            creeps.forEach(creep => {
                creep.memory.role = 'repair'; if (settings.tasks.boostRepair) { creep.registerBoost(WORK); creep.registerBoost(CARRY) }
                creep.resetStatus()
            })
            return
        }
        else { task.halted = false }
    }
    creeps.sort((a, b) => a.ticksToLive - b.ticksToLive)
    creeps.forEach(creep => {
        if (this.settings.debug.harvestSource) { console.log('harvest source', this.name, creep.spawning || creep.getBoosted() || creep.rescueFromNuke()) }
        if (creep.memory.goToDie) { creep.goToDie(); return }
        if (creep.spawning || creep.getBoosted() || creep.rescueFromNuke()) { return }
        if (!task.requiredWorkers && !scriptLoadTime) { if (creeps.length > 1) { if (creep == creeps[0]) { creep.goToDie(); return } } }
        if (!creep.memory.harvestPower || creep.memory.updateHarvestPower) { creep.updateHarvestPower() }
        if (creep.store.getCapacity() == null && task.container) {
            if (container) if (creep.pos.getRangeTo(container) !== 0) creep.travelTo(container)
            if (container.store.getFreeCapacity(RESOURCE_ENERGY) > creep.memory.harvestPower) { creep.harvest(_obj(sourceId)) }
            return
        }
        if (!creep.store.getUsedCapacity(RESOURCE_ENERGY) && creep.memory.status !== 'harvest') { creep.resetStatus(creep) }

        // task.link = false
        if (creep.memory.status == 'manage' && !zeroManagers) { creep.resetStatus() }
        //set status
        if (!creep.memory.status) {
            if (!creep.store.getUsedCapacity(RESOURCE_ENERGY)) { creep.memory.status = 'harvest' }
            else if (zeroManagers || (this.level < 5 && !task.container)) { creep.memory.status = 'manage' }
            else {
                if (this.storage) {
                    if (task.link) { creep.memory.status = 'transfer to link' }
                    else { creep.memory.status = 'manage' }
                }
                else if (task.container) {
                    const container = _obj(task.container)
                    if (container) creep._transfer(container)
                    else { delete task.container }
                }
                else { if (zeroManagers) { creep.memory.status = 'manage' } else { creep.memory.status = 'upgrade' } }
            }
        }
        if (creep.memory.debug) { console.log(creep, 'status:', creep.memory.status) }
        switch (creep.memory.status) {
            case 'harvest':
                if (!task.requiredWorkers && task.workPos) {
                    if (creep.pos.x !== task.workPos.x || creep.pos.y !== task.workPos.y) { creep.travelTo(new RoomPosition(task.workPos.x, task.workPos.y, task.workPos.roomName)); return }
                }
                if (creep.store.getFreeCapacity(RESOURCE_ENERGY) < creep.memory.harvestPower) {
                    if (task.link && !zeroManagers) {
                        const link = _obj(task.link)
                        if (link && link.store.getFreeCapacity(RESOURCE_ENERGY) >= creep.memory.harvestPower - creep.store.getFreeCapacity(RESOURCE_ENERGY)) {
                            const res = creep.transfer(link, RESOURCE_ENERGY)
                            if (res == OK) { creep.harvestSource(_obj(sourceId)); break }
                            else { creep.resetStatus(); break }
                        }
                        else if (link) { creep.transfer(link, RESOURCE_ENERGY) }
                        if (!link) delete task.link
                    }
                    else if (task.container && !zeroManagers) {
                        const container = _obj(task.container)
                        if (container && container.store.getFreeCapacity(RESOURCE_ENERGY) >= creep.memory.harvestPower - creep.store.getFreeCapacity(RESOURCE_ENERGY)) {
                            const res = creep.transfer(container, RESOURCE_ENERGY)
                            if (res == OK) { creep.harvestSource(_obj(sourceId)); break }
                            else { creep.resetStatus(); break }
                        }
                        else if (container) { creep.transfer(container, RESOURCE_ENERGY) }
                        if (!container) delete task.container
                    }
                    creep.resetStatus(); break
                } // due to dont drop energy
                if (creep.pos.roomName == task.pos.roomName) {
                    if (creep.memory.droppedEnergy && _.filter(cache.enemies, e => !e.hiden && e.pos.roomName == this.name).length == 0) {
                        const drop = _obj(creep.memory.droppedEnergy)
                        if (!drop) { creep.resetStatus(); return }
                        const res = creep.pickup(drop)
                        if (res == OK) { creep.memory.status = task.status; return }
                        if (res == ERR_NOT_IN_RANGE) { creep.travelTo(drop) }
                        return
                    }
                    if (this.level < 6 && !creep.store.getUsedCapacity(RESOURCE_ENERGY) && this.droppedResources.length && _.filter(cache.enemies, e => !e.hiden && e.pos.roomName == this.name).length == 0) {
                        const choosedDrRes = this.creeps.filter(creep => creep.memory.droppedEnergy).map(creep => creep.memory.droppedEnergy)
                        const droppedEnergy = idToObj(this.droppedResources.filter(dr => !choosedDrRes.includes(dr)))
                        if (droppedEnergy.length) {
                            // const closestDroppedEnergy = creep.pos.findClosestByPath(droppedEnergy)
                            const closestDroppedEnergy = creep.pos.findInRange(droppedEnergy, 1)
                            if (closestDroppedEnergy.length) { creep.memory.droppedEnergy = closestDroppedEnergy[0].id; return }
                        }
                    }

                    const source = _obj(sourceId)
                    creep.harvestSource(source); break
                }
                else {
                    const sourcePos = new RoomPosition(task.pos.x, task.pos.y, task.pos.roomName)
                    creep.travelTo(sourcePos); break
                }
            case 'transfer to link': creep._transfer(_obj(task.link), RESOURCE_ENERGY); break
            case 'manage':
                if (zeroManagers) {
                    if (!creep.fillEnergyToStructures()) {
                        if (this.storage) {
                            if (task.link) { creep._transfer(_obj(task.link), RESOURCE_ENERGY) }
                            else { creep._transfer(this.storage, RESOURCE_ENERGY) }
                        }
                        else if (this.constructionSites.length) { creep._build() }
                        else { creep._upgradeController() }
                    }
                }
                else {
                    if (this.storage) {
                        if (task.link) { creep._transfer(_obj(task.link), RESOURCE_ENERGY) }
                        else if (task.container) {
                            const container = _obj(task.container)
                            if (container) creep._transfer(container)
                            else { delete task.container }
                        }
                        else { creep._transfer(this.storage, RESOURCE_ENERGY) }
                    }
                    else {
                        const containers_base = idToObj(this.structures.containers.filter(c => !c.type).map(c => c.id))
                        if (containers_base.length && containers_base.filter(c => c.store.getFreeCapacity()).length) {
                            creep._transfer(containers_base.filter(c => c.store.getFreeCapacity()).sort((a, b) => b.store.getFreeCapacity() - a.store.getFreeCapacity())[0], RESOURCE_ENERGY)
                        }
                        else if (this.constructionSites.length) { creep._build() }
                        else { creep._upgradeController() }
                    }
                }
                break
        }
    })
    settings.writePerformanceLog ? performance.newLog(cpu, 'MyRoom.prototype.harvestSource', this.name) : false
}
Creep.prototype.fillEnergyToStructures = function () {
    if (this.memory.targetId) {
        const target = _obj(this.memory.targetId)
        if (target) {
            if (!target.progress && target.progress !== 0) { if (target.store.getFreeCapacity(RESOURCE_ENERGY) > 0) { transfer(this, target); return true } else { this.resetStatus() } }
            else { this.resetStatus() }
        }
        else { this.resetStatus() }

    }
    function transfer(creep, target) {
        if (creep.transfer(target, RESOURCE_ENERGY) == ERR_NOT_IN_RANGE) { creep.travelTo(target) }
    }
    if ((this.memory.roomName && this.room.name == this.memory.roomName) || (this.memory.task && this.room.name == tasks[this.memory.task].pos.roomName)) {
        const myRoom = this.memory.roomName ? myRooms[this.memory.roomName] : myRooms[tasks[this.memory.task].pos.roomName]
        const spawns = idToObj(myRoom.structures.spawns).filter(s => s.store.getFreeCapacity(RESOURCE_ENERGY))
        const extensions = idToObj(myRoom.structures.extensions).filter(s => s.store.getFreeCapacity(RESOURCE_ENERGY))
        const towers = idToObj(myRoom.structures.towers).filter(s => s.store.getFreeCapacity(RESOURCE_ENERGY))
        const structures = spawns.concat(extensions, towers)
        if (structures.length) {
            const target = this.pos.findClosestByPath(structures, { ignoreCreeps: true })
            if (target) {
                this.memory.targetId = target.id
                transfer(this, target)
                return true
            }
        }
        return false
    }
    else if (this.memory.roomName) { this.travelTo(Game.rooms[this.memory.roomName].controller) }
    else if (this.memory.task && Game.rooms[tasks[this.memory.task].pos.roomName]) { this.travelTo(Game.rooms[tasks[this.memory.task].pos.roomName].controller) }
}
MyRoom.prototype.manageTaskHarvestSource = function () {
    const cpu = settings.writePerformanceLog ? Game.cpu.getUsed() : 0
    if (!this.structures.spawns.length) { return }
    if (Game.cpu.bucket < settings.bucket.spawnHarvestSource) { return }

    const role = 'harvest source'
    if (settings.tasks.maxHarvestSource) {
        let QueuesCounter = 0

        cache.myRooms.forEach(myRoom => QueuesCounter += myRoom.queues.spawn.filter(q => q.role == role).length)
        if (_.filter(Memory.creeps, creepMemory => creepMemory.role == role).length + QueuesCounter >= settings.tasks.maxHarvestSource) {
            settings.writePerformanceLog ? performance.newLog(cpu, 'MyRoom.prototype.manageTaskHarvestSource') : false
            return
        }
    }

    const tasks = Object.values(this.tasks.harvestSource)
    for (const task of tasks) {
        if (task.halted) { continue }
        const creeps = _.filter(Game.creeps, creep => creep.memory.role == role && creep.memory.id == task.id)
        if (this.settings.debug.harvestSource) { console.log(this.name, 'harvest source', task.id, `creeps: ${creeps.length}`) }
        const ticksToLive = settings.tasks.harvestSource_ecoBody ? (settings.tasks.harvestSource_boost ? 30 : 40) : 200
        const willDie = creeps.filter(creep => creep.ticksToLive < ticksToLive).length
        if (this.settings.debug.harvestSource) { console.log(this.name, 'harvest source', task.id, `willDie: ${willDie}`) }
        const requiredWorkers = (task.requiredWorkers) ? task.requiredWorkers : (task.link) ? 1 : (task.pos.roomName == this.name) ? 1 : 2
        if (this.settings.debug.harvestSource) { console.log(this.name, 'harvest source', task.id, `requiredWorkers: ${requiredWorkers}`) }
        if (this.queues.spawn.filter(st => st.role == role && st.memory.id == task.id).length + creeps.length - willDie >= requiredWorkers) {
            if (this.settings.debug.harvestSource) { console.log(this.name, 'harvest source', task.id, `spawn: ${this.queues.spawn.filter(st => st.role == role && st.memory.id == task.id).length}`, '-continue') }
            continue
        }
        let creepBody, priority
        if (!this.creeps.filter(c => c.memory.role == 'harvest source').length && task.container) {
            if (this.room.energyAvailable >= 750) creepBody = [WORK, WORK, WORK, WORK, WORK, MOVE, MOVE, MOVE, MOVE, MOVE]
            else if (this.room.energyAvailable >= 550) creepBody = [WORK, WORK, WORK, WORK, WORK, MOVE]
            else if (this.room.energyAvailable >= 500) creepBody = [WORK, WORK, WORK, WORK, MOVE, MOVE]
            else if (this.room.energyAvailable >= 450) creepBody = [WORK, WORK, WORK, WORK, MOVE]
            else if (this.room.energyAvailable >= 400) creepBody = [WORK, WORK, WORK, MOVE, MOVE]
            else if (this.room.energyAvailable >= 350) creepBody = [WORK, WORK, WORK, MOVE]
            else creepBody = [WORK, WORK, MOVE, MOVE]

            priority = settings.spawn.priority.manage - 1
        }
        else { creepBody = spawnLogick.getBody(role, this.room.energyCapacityAvailable, { id: task.id, link: task.link, roomName: this.name, requiredWorkers: task.requiredWorkers, container: task.container }) }
        const specifications = {
            role: role,
            priority: priority || settings.spawn.priority.harvestSource,
            creepBody: creepBody,
            memory: {
                id: task.id,
                roomName: this.name,
                role: role,
            }
        }
        this.registerSpawn(specifications)
        if (this.settings.debug.harvestSource) { console.log(this.name, 'harvest source', task.id, `find in queues: ${this.queues.spawn.find(s => s.role == 'harvest source' && s.memory.id == task.id)}`) }
    }
    settings.writePerformanceLog ? performance.newLog(cpu, 'MyRoom.prototype.manageTaskHarvestSource', this.name) : false
}