'use strict'
//2023.05.07
roles.harvestMineral = {}
MyRoom.prototype.harvestMineral = function () {
    const cpu = settings.writePerformanceLog ? Game.cpu.getUsed() : 0
    if (Game.cpu.bucket < settings.bucket.harvestMineral) { return }
    const debug = this.settings.debug.harvestMineral; let debugText = `harvestMineral ${this.name}`
    const task = this.tasks.harvestMineral
    const mineral = _obj(task.id)
    this.tasks.harvestMineral.amount = mineral.mineralAmount || 0
    // if (!task.workPos) { task.workPos = tools.getWorkPosition(task.id, 'harvestMineral') }

    if (task.container) { }
    const creeps = this.creeps.filter(creep => creep.memory.role == 'harvest mineral').sort((a, b) => a.ticksToLive - b.ticksToLive)
    if (!creeps.length) { settings.writePerformanceLog ? performance.newLog(cpu, 'MyRoom.prototype.harvestMineral') : false; return }

    if (creeps.length) {
        let enemies = _.filter(cache.enemies, e => e.owner !== 'Invader' && e.pos.roomName == this.name && e.parameters && (e.parameters.dismantle || e.parameters.attack || e.parameters.rangedAttack))
        if (enemies.length && !task.inBase) {
            creeps.forEach(creep => {
                creep.memory.role == 'repair'; if (settings.tasks.boostRepair) { creep.registerBoost(WORK); creep.registerBoost(CARRY) }
                creep.resetStatus()
            })
            return
        }
    }
    let container, lab
    if (task.container) { container = _obj(task.container); if (!container) { delete task.container } }
    if (task.lab) { lab = _obj(task.lab); if (!lab) { delete task.lab } }
    const transferMineralTask = this.tasks.manage.tasks.find(t => t.type == 'transfer mineral' && t.creepName)
    let transferCreep; if (!lab && transferMineralTask) { transferCreep = Game.creeps[transferMineralTask.creepName] }

    if (mineral.ticksToRegeneration) { this.tasks.harvestMineral.regenMineral = gameTime + mineral.ticksToRegeneration }
    creeps.forEach(creep => {
        if (creep.spawning || creep.getBoosted() || creep.rescueFromNuke()) { return }
        if (!creep.memory.harvestPower || creep.memory.updateHarvestPower) { creep.updateHarvestPower() }
        if (creeps.length > 1 && creep == creeps[0] && creep.pos.inRangeTo(creeps[1], 1)) creep.suicide()
        if (creep.ticksToLive < task.distance + 10) { creep.goToDie(); return }
        if (mineral.ticksToRegeneration) { creep.goToDie(); return }
        if (creep.ticksToLive > 1000) { if (creep.getBoosted()) { return } }
        if (!container && !creep.store.getCapacity()) { creep.suicide() }
        if (container) {
            if (container && container.store.getUsedCapacity() > container.store.getFreeCapacity()) {
                let priority = 6
                this.registerManageTask({ object1: container.id, resourceType: this.tasks.harvestMineral.resourceType, amount: container.store.getUsedCapacity(), type: 'transfer mineral', priority: priority })
            }
        }
        if (creep.store.getCapacity() && !creep.store.getUsedCapacity(task.resourceType)) { creep.resetStatus(creep) }
        //set status
        if (!creep.memory.status) {
            if (!creep.store.getUsedCapacity(task.resourceType)) { creep.memory.status = 'harvest' }
            else { creep.memory.status = 'transfer' }
        }
        switch (creep.memory.status) {
            case 'harvest':
                if (debug) { debugText += `workPos:${task.workPos} - creep.pos: ${creep.pos}, compare: ${!tools.comparePositions(task.workPos && creep.pos)}` }
                if (task.workPos && !tools.comparePositions(task.workPos, creep.pos)) { creep.travelTo(task.workPos); return }
                if (container && !creep.store.getCapacity()) { if (!container.store.getFreeCapacity(task.resourceType)) { return } }
                if (transferCreep) { transferMineral(this, creep, transferCreep, transferMineralTask, mineral) }
                if (creep.store.getCapacity() && creep.store.getFreeCapacity(task.resourceType) < creep.memory.harvestPower) { creep.resetStatus(); break }
                creep.harvestSource(mineral); break
            case 'transfer':
                if (lab) { creep._transfer(lab, task.resourceType); return }
                if (transferCreep) { transferMineral(this, creep, transferCreep, transferMineralTask, mineral); return }
                if (creep.memory.transferId) { creep._transfer(_obj(creep.memory.transferId, task.resourceType)) }
                else {
                    const terminal = this.terminal
                    if (terminal.store.getFreeCapacity(task.resourceType) >= creep.store.getUsedCapacity(task.resourceType)) { creep.memory.transferId = terminal.id; creep._transfer(terminal, task.resourceType); return }
                    const storage = this.storage
                    if (storage.store.getFreeCapacity(task.resourceType) >= creep.store.getUsedCapacity(task.resourceType)) { creep.memory.transferId = storage.id; creep._transfer(storage, task.resourceType); return }
                }
                break
        }
    })
    function transferMineral(myRoom, creep, transferCreep, transferMineralTask, mineral) {
        if (creep.pos.inRangeTo(transferCreep, 1)) {
            let res = creep.transfer(transferCreep, task.resourceType)
            if (res == OK) {
                if (mineral.mineralAmount) { transferMineralTask.amount = mineral.mineralAmount; transferMineralTask.creepName = false; }
                else { myRoom.tasks.manage.tasks.cut(transferMineralTask) }
            }
        }
    }
    if (debug) { console.log(debugText) }
    settings.writePerformanceLog ? performance.newLog(cpu, 'MyRoom.prototype.harvestMineral') : false
}
myRooms_tool.updateTaskHarvestMineral = function () {
    const cpu = settings.writePerformanceLog ? Game.cpu.getUsed() : 0
    let usedWorkers = 0; const maxWorkers = settings.tasks.maxHarvestMineral
    //reset requiredWorkers 
    cache.myRooms.forEach(myRoom => myRoom.tasks.harvestMineral.requiredWorkers = 0)
    const resources = ['L', 'K', 'X', 'O', 'U', 'Z', 'H'].sort((a, b) => cache.resources[a] - cache.resources[b])
    resources.forEach(resourceType => {
        if (usedWorkers < maxWorkers) {
            cache.myRooms.filter(myRoom => checkRoomWithStatus(myRoom) && myRoom.tasks.harvestMineral.resourceType == resourceType && myRoom.structures.extractor
                && myRoom.tasks.harvestMineral.amount).sort((a, b) => a.tasks.harvestMineral.amount - b.tasks.harvestMineral.amount).forEach(myRoom => {
                    if (usedWorkers < maxWorkers) {
                        myRoom.tasks.harvestMineral.requiredWorkers = 1; usedWorkers++; myRoom.updateMineralContainer()                        
                    }
                })
        }
    })
    function checkRoomWithStatus(myRoom) {
        if (settings.rotateRooms) {
            if (myRoom.room.memory.status !== 'halted' && myRoom.room.memory.status !== 'prepare to halt') return true
        }
        else if (!myRoom.room.memory.status) return true
    }
    settings.writePerformanceLog ? performance.newLog(cpu, 'myRooms_tool.updateTaskHarvestMineral') : false
}
myRooms_tool.manageTaskHarvestMineral = function () {
    const cpu = settings.writePerformanceLog ? Game.cpu.getUsed() : 0
    if (Game.cpu.bucket < settings.bucket.spawnHarvestMineral) { return }
    const role = 'harvest mineral'
    let freeWorkers = settings.tasks.maxHarvestMineral - _.map(cache.myRooms, myRoom => myRoom.queues.spawn.filter(st => st.role == role).length).reduce((a, b) => a + b, 0) - _.filter(Game.creeps, creep => creep.memory.role == role).length
    if (freeWorkers > 0) {
        _.filter(cache.myRooms, mr => mr.tasks.harvestMineral.requiredWorkers).forEach(myRoom => {
            const inQueues = myRoom.queues.spawn.filter(st => st.role == role).length
            const workersCount = myRoom.creeps.filter(c => c.memory.role == role).length
            if (freeWorkers > 0 && !inQueues && !workersCount) { myRoom.spawnHarvestMineral(freeWorkers--) }
        })
    }

    settings.writePerformanceLog ? performance.newLog(cpu, 'myRooms_tool.manageTaskHarvestMineral') : false
}
MyRoom.prototype.spawnHarvestMineral = function () {
    if (this.settings.debug.harvestMineral) { console.log(this.name, 'spawnHarvestMineral') }
    this.updateMineralContainer()
    const task = this.tasks.harvestMineral, role = 'harvest mineral'
    const creepBody = spawnLogick.getBody(role, this.room.energyCapacityAvailable, { distance: task.distance, boost: settings.tasks.useBoostForHarvestMineral, spawnRoom: this, lab: task.lab, container: task.container })
    const newSpawnTask = {
        role: role,
        priority: settings.spawn.priority.harvestMineral,
        tick: gameTime,
        creepBody: creepBody,
        creepPrice: tools.getCreepPrice(creepBody),
        memory: {
            id: task.id,
            roomName: this.name,
            role: role,
        }
    }
    this.queues.spawn.push(newSpawnTask)
}
MyRoom.prototype.updateMineralContainer = function (updateWorkPos = false) {
    const task = this.tasks.harvestMineral
    if (task.workPos) {
        let structures = this.room.lookForAt(LOOK_STRUCTURES, task.workPos)
        let structure = structures.find(str => str.structureType == 'container')
        if (structure) { task.container = structure.id }
        else if (task.requiredWorkers) {
            const constructionSites = this.room.lookForAt(LOOK_CONSTRUCTION_SITES, task.workPos)
            let constructionSite = constructionSites.find(str => str.structureType == 'container')
            if (!constructionSite) {
                let res = this.room.createConstructionSite(task.workPos, 'container')
                if (res == OK) { this.registerSheduledTask('updateStructures') }
            }
        }
    }
    else if (!updateWorkPos) { task.workPos = tools.getWorkPosition(task.id, 'harvestMineral'); this.updateMineralContainer(true) }
}