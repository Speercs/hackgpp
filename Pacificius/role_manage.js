'use strict'
//2023.07.20
MyRoom.prototype.manage_deleteMiniTask = function (task) { this.tasks.manage.tasks.cut(task) }
Creep.prototype.manage_transfer = PowerCreep.prototype.manage_transfer = function () {
    const isPC = this instanceof PowerCreep, debug = this.memory.debug;
    const myRoom = isPC ? myRooms[this.memory.room] : myRooms[this.memory.roomName]
    const resourceType = this.memory.resourceType ? this.memory.resourceType : (this.store.getUsedCapacity() ? Object.keys(this.store)[0] : false)
    if (!resourceType) { return }
    const amount = this.memory.amount ? this.memory.amount : this.store[resourceType]
    const storage = myRoom.storage
    if (storage) { if (storage.store.getFreeCapacity() >= amount) { this._transfer(storage, resourceType, amount) }; return }
    const terminal = myRoom.terminal
    if (terminal) { if (terminal.store.getFreeCapacity() >= amount) { this._transfer(terminal, resourceType, amount) }; return }
    let containerBase
    if (myRoom.level <= 4) {
        const containerBaseInfo = myRoom.structures.containers.find(c => !c.type)
        if (containerBaseInfo) containerBase = _obj(containerBaseInfo.id)
        if (debug) debugText += `containerBase:${containerBase}\n`
        if (containerBase && containerBase.store.getFreeCapacity() >= amount) {
            this._transfer(containerBase, resourceType, amount)
        }
    }
}
const manage_withdraw = function () {
    const isPC = this instanceof PowerCreep, debug = this.memory.debug; let debugText = `manage_withdraw - ${this}\n`

    const myRoom = isPC ? myRooms[this.memory.room] : myRooms[this.memory.roomName]
    const resourceType = this.memory.resourceType, amount = this.memory.amount - this.store[resourceType]
    if (amount < 0) { console.log(`manage_withdraw - ${this} amount < 0`); this.resetStatus(); return }
    if (debug) debugText += `resourceType:${resourceType}, amount: ${amount}\n`
    const storage = myRoom.storage
    const terminal = myRoom.terminal
    if (storage && terminal) {
        if (storage.store.getUsedCapacity(resourceType) > terminal.store.getUsedCapacity(resourceType)) { this._withdraw(storage, resourceType, amount); return }
        else { this._withdraw(terminal, resourceType, amount); return }
    }
    else {
        if (storage) { if (storage.store.getUsedCapacity(resourceType) >= amount) { this._withdraw(storage, resourceType, amount); return } }
        if (terminal) { if (terminal.store.getUsedCapacity(resourceType) >= amount) { this._withdraw(terminal, resourceType, amount); return } }
        let containerBase
        if (myRoom.level <= 4) {
            const containerBaseInfo = myRoom.structures.containers.find(c => !c.type)
            if (containerBaseInfo) containerBase = _obj(containerBaseInfo.id)
            if (debug) debugText += `containerBase:${containerBase}\n`
            if (containerBase) {
                if (containerBase.store.getUsedCapacity(resourceType) >= amount) {
                    if (debug) debugText += `_withdraw\n`
                    this._withdraw(containerBase, resourceType, amount); if (debug) { console.log(debugText) }; return
                }
            }
        }
        //if room have not resource delete tasks

        _.filter(myRoom.tasks.manage.tasks, t => t.creepName == this.name && t.resourceType == resourceType).forEach(task => {
            console.log(myRoom.name, `room have not resource ${task.resourceType}, amount:${task.amount} - delete tasks`)
            myRoom.tasks.manage.tasks.cut(task)
        })
        this.resetStatus()
    }
}
Creep.prototype.manage_withdraw = PowerCreep.prototype.manage_withdraw = manage_withdraw
const manage_setResourceToWithdraw = function () {
    const isPC = this instanceof PowerCreep, debug = this.memory.debug; let debugText = `manage_setResourceToWithdraw - ${this}\n`
    const myRoom = isPC ? myRooms[this.memory.room] : myRooms[this.memory.roomName]
    if (!myRoom || !myRoom.my) return
    if (isPC) { this.memory.manage_status = 'get resources' } else { this.memory.status = 'get resources' }
    let done = true
    for (const resourceType of Object.keys(this.memory.resources)) {
        const creepStoreAmount = this.store[resourceType], creepMemoryAmount = this.memory.resources[resourceType].amount
        if (creepStoreAmount !== creepMemoryAmount) {
            done = false
            this.memory.resourceType = resourceType; this.memory.amount = creepMemoryAmount - creepStoreAmount;
            this.manage_withdraw(); break
        }
    }
    if (done) { if (isPC) { this.memory.manage_status = 'manage' } else { this.memory.status = 'manage' }; this.manage() }
}
Creep.prototype.manage_setResourceToWithdraw = PowerCreep.prototype.manage_setResourceToWithdraw = manage_setResourceToWithdraw

const manage_gettingTasks = function () {
    const isPC = this instanceof PowerCreep, debug = this.memory.debug;
    let debugText = `${this} manage_gettingTasks\n`
    if (!this.getFreeStore()) { if (isPC) { this.memory.manage_status = 'getFreeStore' }; if (debug) { console.log(debugText, 'getFreeStore') }; return }
    const myRoom = isPC ? myRooms[this.memory.room] : myRooms[this.memory.roomName]
    if (!myRoom || !myRoom.my) return
    myRoom.clearManageMicroTasks(this.name)
    const tasks = isPC ? myRoom.tasks.manage.tasks.filter(t => !t.creepName && t.type !== 'sign') : myRoom.tasks.manage.tasks.filter(t => !t.creepName)
    if (debug) debugText += `tasks: ${JSON.stringify(tasks)}\n`
    const prioritetes = []; tasks.forEach(t => { if (!prioritetes.includes(t.priority)) { prioritetes.push(t.priority) } })
    prioritetes.sort((a, b) => a - b)
    const priority = prioritetes[0]
    const taskWithPriority = tasks.filter(t => t.priority == priority); taskWithPriority.sort((a, b) => a.time - b.time)
    const capacity = this.store.getCapacity(); if (debug) debugText += `capacity: ${capacity}\n`
    let usedCapacity = 0
    this.memory.resources = {}
    const objects = []
    taskWithPriority.map(t => t.object1).forEach(tobj => {
        const obj = _obj(tobj);
        if (!obj) { myRoom.manage_deleteMiniTask(taskWithPriority.find(t => t.object1 == tobj)) }
        else { objects.push(obj) }
    })
    //deleteTask(myRoom, task)
    let containerBase
    if (myRoom.level <= 4) {
        const containerBaseInfo = myRoom.structures.containers.find(c => !c.type)
        if (containerBaseInfo) containerBase = _obj(containerBaseInfo.id)
    }

    let lastObj = myRoom.storage || containerBase

    if (!lastObj) { if (debug) { console.log(debugText, '!lastObj') } return }
    let lastPos
    while (usedCapacity < capacity) {
        if (!objects.length) { break }
        let closestObject
        if (!lastPos) {
            closestObject = lastObj.pos.findClosestByPath(objects, { ignoreCreeps: true, maxOps: 200 }); lastPos = lastObj.pos
            if (!closestObject) { closestObject = objects[0] }
        }
        else { closestObject = lastPos.findClosestByPath(objects, { ignoreCreeps: true, maxOps: 200 }) }
        if (this.memory.debug) { console.log(this, `closestObject:${closestObject}`) }
        if (closestObject) {
            // console.log(`lastPos:${lastPos}, closestObject:${closestObject}`);
            if (closestObject !== myRoom.storage) {
                let path = lastPos.findPathTo(closestObject, { ignoreCreeps: true, maxOps: 200 })
                let lastPosElement = path.slice(-1)[0]
                if (lastPosElement) {
                    lastPos = new RoomPosition(lastPosElement.x, lastPosElement.y, myRoom.name)
                    lastObj = closestObject; objects.cut(closestObject)
                }
            }
            // console.log(`lastPosElement:${lastPosElement}`);

            const task = taskWithPriority.find(t => t.object1 == closestObject.id)
            if (task.type == 'transfer mineral') { task.creepName = this.name; if (isPC) { this.memory.manage_status = 'manage' } else { this.memory.status = 'manage' }; break }
            if (task.type == 'tombstone') { task.creepName = this.name; if (isPC) { this.memory.manage_status = 'manage' } else { this.memory.status = 'manage' }; break }
            if (task.type == 'clearing storage link' || task.type == 'transfer' || task.type == 'prepare lab to boost') {
                task.creepName = this.name
                if (Object.keys(this.memory.resources).length) {
                    if (isPC) { this.memory.manage_status = 'get resources' } else { this.memory.status = 'get resources' }
                    if (this.memory.debug) { console.log(this, `this.memory.status = 'get resources'  - 1`) }
                    break
                }
                else {
                    if (isPC) { this.memory.manage_status = 'manage' } else { this.memory.status = 'manage' }
                    if (this.memory.debug) { console.log(this, `this.memory.status = 'manage' - 1`) }
                    break
                }
            }
            const resourceType = task.resourceType

            task.creepName = this.name
            const amount = (capacity - usedCapacity > task.amount) ? task.amount : (capacity - usedCapacity)
            usedCapacity += amount

            if (!this.memory.resources[resourceType]) { this.memory.resources[resourceType] = { resourceType: resourceType, amount: amount } }
            else { this.memory.resources[resourceType].amount += amount }

        }
        else { break }
        if (usedCapacity >= capacity) { if (isPC) { this.memory.manage_status = 'get resources' } else { this.memory.status = 'get resources' }; if (this.memory.debug) { console.log(this, `this.memory.status = 'get resources' - 2`) } }
    }
    if (debug) debugText += `resources : ${JSON.stringify(this.memory.resources)}\n`
    if (Object.keys(this.memory.resources).length) {
        if (isPC) { this.memory.manage_status = 'get resources' } else { this.memory.status = 'get resources' };
        if (debug) { debugText += `status = 'get resources' - 3` }
    }
    else { if (isPC) { this.memory.manage_status = 'manage' } else { this.memory.status = 'manage' }; if (debug) { debugText += `status = 'manage' - 2` } }
    // if (this.memory.resources) { if (Object.keys(this.memory.resources).length) { this.memory.status = 'get resources' } }
    if (debug) console.log(debugText)
}
Creep.prototype.manage_gettingTasks = PowerCreep.prototype.manage_gettingTasks = manage_gettingTasks
const manage = function () {
    const isPC = this instanceof PowerCreep
    const myRoom = isPC ? myRooms[this.memory.room] : myRooms[this.memory.roomName]
    if (!myRoom || !myRoom.my) return
    const tasks = myRoom.tasks.manage.tasks
    const creepTasks = tasks.filter(t => t.creepName == this.name)
    if (!creepTasks.length) { this.resetStatus(); return }

    const objectsId = creepTasks.map(t => t.object1)
    const objects = idToObj(objectsId)
    if (objects.length < objectsId.length) {
        const really = objects.map(o => o.id)
        objectsId.filter(o => !really.includes(o)).forEach(objectId => {
            const task = creepTasks.find(t => t.object1 == objectId)
            myRoom.manage_deleteMiniTask(task)
        })
    }
    objects.forEach(obj => {
        new RoomVisual(obj.pos.roomName).circle(obj.pos, {
            radius: .45, fill: "transparent", stroke: 'red', strokeWidth: .15, opacity: 0.5
        });
    })


    let task
    if (this.memory.object1) { task = creepTasks.find(t => t.object1 == this.memory.object1) }
    else {
        const objects = idToObj(creepTasks.map(t => t.object1))
        let closestObject
        if (!objects.length) { this.resetStatus(); return }
        else if (objects.length == 1) { closestObject = objects[0] }
        else { closestObject = this.pos.findClosestByPath(objects, { ignoreCreeps: true, maxOps: 200 }) }
        if (!closestObject) { closestObject = objects[0] }
        if (closestObject) { task = creepTasks.find(t => t.object1 == closestObject.id); this.memory.object1 = closestObject.id }
        else { this.travelTo(myRoom.room.controller); console.log(`${this.name} cant find closest object`); }
    }

    if (!task) { this.resetStatus(); return }
    const object1 = _obj(this.memory.object1)
    if (!object1) {
        // if (task.type == 'tombstone') { deleteTask(myRoom, task) }
        myRoom.manage_deleteMiniTask(task)
        this.resetStatus(); return
    }
    if (task.type == 'prepare lab to boost') {
        const terminal = myRoom.terminal, lab = object1, storage = myRoom.storage
        if (!task.status) {
            const energyAmount = object1.store.getFreeCapacity(RESOURCE_ENERGY)
            if (energyAmount) { task.status = 'fill energy'; task.energyAmount = energyAmount }
            else if (task.amount > 0) { task.status = 'fill resource' }
            else if (lab.store.getUsedCapacity(task.resourceType) == task.amount) { delete this.memory.object1; myRoom.manage_deleteMiniTask(task); task.boost.ready = true; this.resetStatus(); return }
        }

        if (task.status == 'fill energy') {
            if (!lab.store.getFreeCapacity(RESOURCE_ENERGY)) { delete task.status; delete task.energyAmount }
            const energyInCreepStore = this.store.getUsedCapacity(RESOURCE_ENERGY)
            if (energyInCreepStore) {
                const res = this.transfer(lab, RESOURCE_ENERGY)
                switch (res) {
                    case OK: if (task.energyAmount > energyInCreepStore) { task.energyAmount -= energyInCreepStore } else { delete task.status; delete task.energyAmount }
                    case ERR_NOT_IN_RANGE: this.travelTo(lab, { useFindRoute: true })
                }
            }
            else {
                const amount = (task.energyAmount > this.store.getFreeCapacity(RESOURCE_ENERGY)) ? this.store.getFreeCapacity(RESOURCE_ENERGY) : task.energyAmount
                let targets = []
                if (myRoom.storage) { targets.push(myRoom.storage) }
                if (myRoom.terminal) { targets.push(myRoom.terminal) }
                let target
                if (targets.length) { target = targets.sort((a, b) => b.store[RESOURCE_ENERGY] - a.store[RESOURCE_ENERGY])[0] }
                if (target) { this._withdraw(target, RESOURCE_ENERGY, amount) }
                else { this.resetStatus(); delete task.creepName; task.priority += 1 }

            }
        }
        else if (task.status == 'fill resource') {
            //clearing lab                
            const exEnergyRes = Object.keys(lab.store).filter(s => s !== RESOURCE_ENERGY)
            let resInLab
            if (exEnergyRes.length) {
                resInLab = exEnergyRes[0]
                if (resInLab !== task.resourceType) {
                    if (!this.store.getUsedCapacity()) { this._withdraw(lab, resInLab); return }
                    else { this._transfer(terminal, Object.keys(this.store)[0]); return }
                }
                else { if (lab.store.getUsedCapacity(task.resourceType) == task.amount) { delete this.memory.object1; myRoom.manage_deleteMiniTask(task); task.boost.ready = true; this.resetStatus(); return } }
            }
            // get free store of this if resource type error
            if (this.store.getUsedCapacity()) { if (Object.keys(this.store)[0] !== task.resourceType) { this._transfer(terminal, Object.keys(this.store)[0]); return } }

            const resourceInCreepStore = this.store.getUsedCapacity(task.resourceType)
            if (resourceInCreepStore) {
                const res = this.transfer(lab, task.resourceType)
                switch (res) {
                    case OK: if (task.amount > resourceInCreepStore) { task.amount -= resourceInCreepStore } else { delete this.memory.object1; myRoom.manage_deleteMiniTask(task); task.boost.ready = true; this.resetStatus(); return }
                    case ERR_NOT_IN_RANGE: this.travelTo(lab, { useFindRoute: true })
                }
                return
            }
            else {
                const amount = (task.amount > this.store.getFreeCapacity(task.resourceType)) ? this.store.getFreeCapacity(task.resourceType) : task.amount
                let withdrawTarget
                if ((!storage && terminal) || (storage && !terminal)) { if (!storage) { withdrawTarget = terminal } else { withdrawTarget = storage } }
                else if (storage && terminal) {
                    withdrawTarget = (storage.store[task.resourceType] > terminal.store[task.resourceType]) ? storage : terminal
                }

                if (withdrawTarget.store[task.resourceType] < amount) { delete this.memory.object1; myRoom.manage_deleteMiniTask(task); task.boost.ready = true; this.resetStatus(); return }
                this._withdraw(withdrawTarget, task.resourceType, amount); return
            }
        }
    }
    else if (task.type == 'transfer mineral') {
        const harvestMineral = _obj(task.object1);
        if (object1 && object1 instanceof Creep) {
            this.travelTo(object1)
            if (!object1.store.getUsedCapacity() || object1.ticksToLive < myRoom.tasks.harvestMineral.distance + 10) { myRoom.manage_deleteMiniTask(task) }
        }
        else if (object1 && object1 instanceof Structure) {
            if (object1.structureType == 'container') {
                if (object1.store.getUsedCapacity() && this.store.getFreeCapacity()) {
                    this._withdraw(object1, Object.keys(object1.store)[0])
                }
                else { myRoom.manage_deleteMiniTask(task) }
            }
        }
    }
    else if (task.type == 'transfer') {
        const object2 = _obj(task.object2);
        if (!object2) { delete this.memory.object1; myRoom.manage_deleteMiniTask(task) }
        if (!object2.store.getFreeCapacity(task.resourceType)) {
            delete this.memory.object1; myRoom.manage_deleteMiniTask(task)
        }
        else {
            if (!task.transfer) {
                const usedCapacity = object1.store.getUsedCapacity(task.resourceType)
                if (!usedCapacity) { delete this.memory.object1; myRoom.manage_deleteMiniTask(task); return }
                else {
                    const res = this.withdraw(object1, task.resourceType)
                    switch (res) {
                        case OK: task.transfer = true; break
                        case ERR_NOT_IN_RANGE: this.travelTo(object1); break
                        case ERR_INVALID_TARGET: delete this.memory.object1; myRoom.manage_deleteMiniTask(task); break
                    }; return
                }
            }
            else { if (this._transfer(object2)) { if (this.store[task.resourceType] >= task.amount) { delete this.memory.object1; myRoom.manage_deleteMiniTask(task) } else { task.transfer = false; task.amount -= this.store[task.resourceType]; task.creepName = '' } } }
        }

    }
    else if (task.type == 'fill structure') {
        if (!this.store.getUsedCapacity()) { this.resetStatus(); return }

        const freeCapacity = object1.store.getFreeCapacity(task.resourceType)
        if (!freeCapacity) { delete this.memory.object1; myRoom.manage_deleteMiniTask(task); return }
        const resoucesAtStore = this.store[task.resourceType]
        if (!resoucesAtStore) { delete this.memory.object1; myRoom.manage_deleteMiniTask(task); return }
        let amount = (task.amount >= resoucesAtStore) ? resoucesAtStore : task.amount
        amount = (freeCapacity > amount) ? amount : freeCapacity
        const res = this._transfer(object1, task.resourceType)
        if (res) {
            if (amount == task.amount) { delete this.memory.object1; myRoom.manage_deleteMiniTask(task) }
            else { task.amount -= amount; task.creepName = '' }
        }
        return
    }
    else if (task.type == 'clearing storage link') {
        const usedCapacity = object1.store.getUsedCapacity(RESOURCE_ENERGY)
        if (!task.transfer) {
            if (!usedCapacity) { myRoom.manage_deleteMiniTask(task); return }
            else {
                const res = this.withdraw(object1, RESOURCE_ENERGY)
                switch (res) {
                    case OK: task.transfer = true; break
                    case ERR_NOT_IN_RANGE: this.travelTo(object1); break
                    case ERR_NOT_ENOUGH_RESOURCES: myRoom.manage_deleteMiniTask(task); break
                    default: myRoom.manage_deleteMiniTask(task); break
                }
            }
        }
        else {
            if (!this.store.getUsedCapacity(RESOURCE_ENERGY)) { myRoom.manage_deleteMiniTask(task) }
            else {
                let target
                if (myRoom.storage) { if (myRoom.storage.store.getFreeCapacity()) { target = myRoom.storage } }
                else if (myRoom.terminal) { if (myRoom.terminal.store.getFreeCapacity()) { target = myRoom.terminal } }
                if (target) {
                    if (this._transfer(target)) {
                        if (this.store[RESOURCE_ENERGY] >= task.amount) { myRoom.manage_deleteMiniTask(task) }
                        else { task.transfer = false; task.amount -= this.store[RESOURCE_ENERGY]; task.creepName = '' }
                    }
                }
                else { this.drop(RESOURCE_ENERGY); task.transfer = false; task.amount -= this.store[RESOURCE_ENERGY]; task.creepName = '' }
            }
        }
    }
    else if (task.type == 'fill storage link') {
        if (!object1.store.getFreeCapacity(RESOURCE_ENERGY)) { myRoom.manage_deleteMiniTask(task); return }
        if (!this.store.getUsedCapacity(RESOURCE_ENERGY)) { this.manage_withdraw(); return }
        if (this._transfer(object1)) { if (this.store[RESOURCE_ENERGY] >= task.amount) { myRoom.manage_deleteMiniTask(task) } else { task.transfer = false; task.amount -= this.store[RESOURCE_ENERGY]; task.creepName = '' } }
    }
    else if (task.type == 'tombstone') {
        if (!object1) { myRoom.manage_deleteMiniTask(task); return }
        if (!object1.store.getUsedCapacity()) { myRoom.manage_deleteMiniTask(task); return }
        if (!this.store.getUsedCapacity()) { task.transfer = false }
        if (!this.store.getFreeCapacity()) { task.transfer = true }
        if (task.transfer) { delete this.memory.resourceType; delete this.memory.amount; this.manage_transfer(); return }
        this._withdraw(object1, Object.keys(object1.store)[0]); return
    }
    else if (task.type == 'sign') {
        if (!object1) { myRoom.manage_deleteMiniTask(task); return }
        const sign = myRoom.room.memory.sign ? myRoom.room.memory.sign.text : ''
        if (sign !== myRoom.room.memory.sign) { this.travelTo(myRoom.room.controller); this.signController(this.room.controller, myRoom.room.memory.sign) }
        else { myRoom.manage_deleteMiniTask(task) }
    }
}
Creep.prototype.manage = PowerCreep.prototype.manage = manage
MyRoom.prototype.manage = function () {
    const cpu = settings.writePerformanceLog ? Game.cpu.getUsed() : 0
    if (each1000) { this.checkMiniTasks() }
    const task = this.tasks.manage
    const creeps = this.creeps.filter(creep => creep.memory.role == 'manage' && !creep.spawning).sort((a, b) => b.ticksToLive - a.ticksToLive)
    if (!creeps.length) { settings.writePerformanceLog ? performance.newLog(cpu, 'MyRoom.prototype.manage', this.name) : false; return }
    const enemiesAtRoom = _.filter(cache.enemies, e => e.pos.roomName == this.name).length
    if (each100) this.clearManageMicroTasks()
    creeps.sort((a, b) => a.ticksToLive - b.ticksToLive)

    creeps.forEach(creep => {
        if (creep.memory.goToDie) { creep.goToDie(); return }
        if (creep.spawning || creep.getBoosted() || creep.rescueFromNuke()) { return }
        // if (creep.pos.roomName !== this.name) { creep.travelTo(this.room.storage ? this.room.storage : this.room.controller); return }
        if (creep.ticksToLive < 30) { creep.say(`die`); creep.goToDie(); return }
        if (task.requiredWorkers && !scriptLoadTime && !enemiesAtRoom) { if (creeps.length > task.requiredWorkers) { if (creep == creeps[0]) { creep.goToDie(); return } } }
        if (!creep.memory.status) {
            creep.manage_gettingTasks()
            let requiredWorkers = 1; if (this.tasks.manage.requiredWorkers) { requiredWorkers = this.tasks.manage.requiredWorkers }
        }
        switch (creep.memory.status) {
            case 'manage': creep.manage(); break
            case 'get resources': creep.manage_setResourceToWithdraw(); break
        }
    })

    settings.writePerformanceLog ? performance.newLog(cpu, 'MyRoom.prototype.manage', this.name) : false
}
MyRoom.prototype.updateManageMicroTasks_extensionsAndSpawns = function () {
    this.lastUpdateMicroTasks_extensionsAndSpawns = gameTime
    const spawns = idToObj(this.structures.spawns).filter(s => s.store.getFreeCapacity(RESOURCE_ENERGY))
    let extensions = []
    const pwrCreeps = _.filter(Game.powerCreeps, c => c.room).filter(c => c.room.name == this.name && c.powers).filter(c => c.ticksToLive && c.powers[PWR_OPERATE_EXTENSION] && c.powers[PWR_OPERATE_EXTENSION].cooldown < 25).length
    if (!pwrCreeps || this.queues.spawn.length > 1) { extensions = idToObj(this.structures.extensions).filter(s => s.store.getFreeCapacity(RESOURCE_ENERGY) > 0) }
    const structures = spawns.concat(extensions)
    if (structures.length) {
        for (const structure of structures) {
            this.registerManageTask({ object1: structure, amount: structure.store.getFreeCapacity(RESOURCE_ENERGY), type: 'fill structure', priority: 6 })
        }
    }
}
MyRoom.prototype.updateManageMicroTasks_storage_terminal = function (resource = false) {
    this.lastUpdateMicroTasks_storage_terminal = gameTime
    const storage = this.storage, terminal = this.terminal, unclaimThisRoom = this.unclaim
    if (!terminal || !storage) return
    this.lastUpdateMicroTasks_TS = gameTime
    if (unclaimThisRoom && Object.keys(terminal.store).filter(key => key !== 'energy').length === 0 && Object.keys(storage.store).filter(key => key !== 'energy').length === 0) {
        let priority = 7
        if (storage.store['energy']) {
            this.registerManageTask({ object1: storage, object2: terminal, resourceType: 'energy', amount: storage.store['energy'], type: 'transfer', priority: priority })
        }
    }
    else {
        const list_terminal = resource ? [resource] : Object.keys(terminal.store)
        list_terminal.forEach(resourceType => {
            const maxRes = (resourceType == RESOURCE_ENERGY) ? 10000 : 5000
            let priority = 7, amount = terminal.store[resourceType] - maxRes
            if (resourceType == RESOURCE_ENERGY) { if (storage.store[RESOURCE_ENERGY] < 5000) { priority = 5; amount = 1250 } }
            if (terminal.store[resourceType] > maxRes) { this.registerManageTask({ object1: terminal, object2: storage, resourceType: resourceType, amount: amount, type: 'transfer', priority: priority, tag: 'terminal.store > storage.store' }) }
        })
        const list_storage = resource ? [resource] : Object.keys(storage.store)
        list_storage.forEach(resourceType => {
            const minResStorage = (resourceType == RESOURCE_ENERGY) ? 10000 : 0
            const minResTerminal = (resourceType == RESOURCE_ENERGY) ? 8000 : 3000
            const maxRes = (resourceType == RESOURCE_ENERGY) ? 10000 : 5000
            let priority = 7
            if (storage.store[resourceType] > minResStorage && terminal.store[resourceType] < minResTerminal) {
                this.registerManageTask({ object1: storage, object2: terminal, resourceType: resourceType, amount: (maxRes - terminal.store[resourceType]), type: 'transfer', priority: priority, tag: 'storage.store > terminal.store' })
            }
        })
    }
}
MyRoom.prototype.updateManageMicroTasks_labs = function () {
    this.lastUpdateMicroTasks_labs = gameTime; const debug = this.settings.debug.labsMicroTasks
    const terminal = this.terminal, storage = this.storage
    let mineralLab, debugText = `updateManageMicroTasks_labs, ${this.name}\n`
    if (this.tasks.harvestMineral.lab) { mineralLab = _obj(this.tasks.harvestMineral.lab) }
    if (this.status == 'halted' || (this.status == 'support' && !this.room.memory.labsBoostMode)) { return }
    if (this.unclaim && this.terminal) {
        const labs = idToObj(_.map(this.structures.labs, 'id'))
        for (const structure of labs) {
            const resourcesToGet = Object.keys(structure.store).filter(r => r !== 'energy')
            if (resourcesToGet.length) {
                const resourceType = resourcesToGet[0], amount = structure.store[resourceType]
                this.registerManageTask({ object1: structure, object2: this.terminal, resourceType: resourcesToGet[0], amount: ((this.terminal.store.getFreeCapacity(resourceType) >= amount) ? amount : this.terminal.store.getFreeCapacity(resourceType)), type: 'transfer', priority: 6, tag: 'clear labs' })
            }
        }
    }
    else {
        if (debug) { debugText += `mineralLab: ${mineralLab}` }
        if (mineralLab) {
            const resourcesToGet = Object.keys(mineralLab.store).filter(r => r !== 'energy')
            if (resourcesToGet.length) {
                const resourceType = resourcesToGet[0], amount = mineralLab.store[resourceType]
                if (debug) { debugText += `amount: ${amount}` }
                if (amount > 2000) {
                    this.registerManageTask({ object1: mineralLab, object2: this.terminal, resourceType: resourceType, amount: ((this.terminal.store.getFreeCapacity(resourceType) >= amount) ? amount : this.terminal.store.getFreeCapacity(resourceType)), type: 'transfer', priority: 6, tag: 'clear mineral lab' })
                }
            }
        }
        const labs = idToObj(_.map(this.structures.labs, lab => lab.id)).filter(s => s.store.getFreeCapacity(RESOURCE_ENERGY))
        if (labs.length) {
            for (const structure of labs) {
                this.registerManageTask({ object1: structure, amount: structure.store.getFreeCapacity(RESOURCE_ENERGY), type: 'fill structure', priority: 6 })
            }
        }
    }
    if (this.room.memory.labsBoostMode && terminal) {
        let priority = 5
        const labs = idToObj(_.map(this.structures.labs, lab => lab.id))
        labs.forEach(lab => {
            const boost = this.room.memory.labs[lab.id] ? this.room.memory.labs[lab.id].resourceType : false
            if (!boost) return
            //clear lab
            const resInLab = Object.keys(lab.store).filter(res => res !== 'energy')
            if (resInLab.length) {
                const res = resInLab[0]
                if (res !== boost) this.registerManageTask({ object1: lab, object2: terminal, resourceType: res, amount: lab.store[res], type: 'transfer', priority: priority })
                else {
                    const freeStore = lab.store.getFreeCapacity(boost)
                    if (freeStore) {
                        let amount = 0
                        if (freeStore > 1250) amount = freeStore
                        else { amount = 1250 }
                        if (amount) {
                            const withdrawObj = (terminal.store[boost] > storage.store[boost]) ? terminal : storage
                            amount = (withdrawObj.store[boost] >= amount) ? amount : withdrawObj.store[boost]
                            this.registerManageTask({ object1: withdrawObj, object2: lab, resourceType: boost, amount: amount, type: 'transfer', priority: priority })
                            tools.pushToResourcesUsedHistory(boost, amount)
                        }
                    }
                }
            }
            else {
                const withdrawObj = (terminal.store[boost] > storage.store[boost]) ? terminal : storage
                this.registerManageTask({ object1: withdrawObj, object2: lab, resourceType: boost, amount: 3000, type: 'transfer', priority: priority })
                tools.pushToResourcesUsedHistory(boost, 3000)
            }
        })
    }
    else if (!this.status && this.room.memory.labs.reaction && this.terminal) {
        let priority = 6.5
        const idOflabsForBoost = _.filter(this.queues.boost, b => b.lab).map(b => b.lab)
        const labsIn = idToObj(_.filter(this.structures.labs, lab => lab.role == 'in' && !idOflabsForBoost.includes(lab.id)).map(lab => lab.id))
        labsIn.filter(lab => !Object.keys(lab.store).includes(this.room.memory.labs.reaction)).forEach(lab => {
            const resInLab = Object.keys(lab.store).filter(res => res !== 'energy')
            if (resInLab.length) {
                const res = resInLab[0]
                this.registerManageTask({ object1: lab, object2: terminal, resourceType: res, amount: lab.store[res], type: 'transfer', priority: priority })
            }
        })
        labsIn.filter(lab => !lab.store.getFreeCapacity(this.room.memory.labs.reaction)).forEach(lab => {
            const resInLab = Object.keys(lab.store).filter(res => res !== 'energy')
            if (resInLab.length) {
                const res = resInLab[0]
                this.registerManageTask({ object1: lab, object2: terminal, resourceType: res, amount: lab.store[res], type: 'transfer', priority: priority })
            }
        })
        const labsOut = idToObj(_.filter(this.structures.labs, lab => lab.role == 'out').map(lab => lab.id))
        if (labsOut.length == 2) {
            const lab1 = labsOut[0], lab2 = labsOut[1], resource1 = this.room.memory.labs.resource1, resource2 = this.room.memory.labs.resource2
            let res1, res2, reverse = false
            const listOfResInLab1 = Object.keys(lab1.store).filter(resourceType => resourceType !== RESOURCE_ENERGY); const listOfResInLab2 = Object.keys(lab2.store).filter(resourceType => resourceType !== RESOURCE_ENERGY)

            if (listOfResInLab1.length) { res1 = listOfResInLab1[0] }; if (listOfResInLab2.length) { res2 = listOfResInLab2[0] }
            if (res1 == resource2 || res2 == resource1) { reverse = true }

            if (!reverse) {
                if (res1 && res1 !== resource1) { this.registerManageTask({ object1: lab1, object2: terminal, resourceType: res1, amount: lab1.store[res1], type: 'transfer', priority: priority }) }
                else if (!res1 || (res1 && res1 == resource1 && lab1.store[resource1] < 1250)) {
                    const withdrawObj = (terminal.store[resource1] > storage.store[resource1]) ? terminal : storage
                    const amount = (withdrawObj.store[resource1] >= 1250 - lab1.store[resource1]) ? 1250 - lab1.store[resource1] : withdrawObj.store[resource1]
                    if (!amount) { if (lab1.store[resource1] < 100) { this.updateLabReaction() }; return }
                    this.registerManageTask({ object1: withdrawObj, object2: lab1, resourceType: resource1, amount: amount, type: 'transfer', priority: priority });
                    tools.pushToResourcesUsedHistory(resource1, amount)
                }
                if (res2 && res2 !== resource2) { this.registerManageTask({ object1: lab2, object2: terminal, resourceType: res2, amount: lab2.store[res2], type: 'transfer', priority: priority }) }
                else if (!res2 || (res2 && res2 == resource2 && lab2.store[resource2] < 1250)) {
                    const withdrawObj = (terminal.store[resource2] > storage.store[resource2]) ? terminal : storage
                    const amount = (withdrawObj.store[resource2] >= 1250 - lab1.store[resource2]) ? 1250 - lab1.store[resource2] : withdrawObj.store[resource2]
                    if (!amount) { if (lab2.store[resource2]) { this.updateLabReaction() }; return }
                    this.registerManageTask({ object1: withdrawObj, object2: lab2, resourceType: resource2, amount: amount, type: 'transfer', priority: priority })
                    tools.pushToResourcesUsedHistory(resource2, amount)
                }
            }
            else {
                console.log(this.name, JSON.stringify(this.room.memory.labs));
                console.log(`1 - res2 ${res2} && res2 !== resource1 ${res2 !== resource1}, result: ${res2 && res2 !== resource1}`);
                console.log(`2 - !res2 ${!res2}|| (res2 && res2 == resource1 ${res2 && res2 == resource1} && lab1.store[resource2] < 1250) ${lab1.store[resource2] < 1250}, result: ${(!res2 || (res2 && res2 == resource1 && lab1.store[resource2] < 1250))}`);
                if (res2 && res2 !== resource1) { this.registerManageTask({ object1: lab1, object2: terminal, resourceType: res1, amount: lab1.store[res1], type: 'transfer', priority: priority }) }
                else if (!res2 || (res2 && res2 == resource1 && lab1.store[resource2] < 1250)) {
                    const withdrawObj = (terminal.store[resource2] > storage.store[resource2]) ? terminal : storage
                    const amount = (withdrawObj.store[resource2] >= 1250 - lab1.store[resource2]) ? 1250 - lab1.store[resource2] : withdrawObj.store[resource2]
                    if (!amount) { if (lab1.store[resource2]) { this.updateLabReaction() }; return }
                    this.registerManageTask({ object1: withdrawObj, object2: lab1, resourceType: resource2, amount: amount, type: 'transfer', priority: priority })
                    tools.pushToResourcesUsedHistory(resource2, amount)
                }
                console.log(`3 - res1 ${res1} && res1 !== resource2 ${res1 !== resource2}, result: ${(res1 && res1 !== resource2)}`);
                console.log(`4 - !res1 ${!res1} && (res1 && res1 == resource2 ${res1 && res1 == resource2} && lab2.store[resource1] < 1250) ${lab2.store[resource1] < 1250}, result: ${(!res1 && (res1 && res1 == resource2 && lab2.store[resource1] < 1250))}`);
                if (res1 && res1 !== resource2) { this.registerManageTask({ object1: lab2, object2: terminal, resourceType: res2, amount: lab2.store[res2], type: 'transfer', priority: priority }) }
                else if (!res1 && (res1 && res1 == resource2 && lab2.store[resource1] < 1250)) {
                    const withdrawObj = (terminal.store[resource1] > storage.store[resource1]) ? terminal : storage
                    const amount = (withdrawObj.store[resource1] >= 1250 - lab1.store[resource1]) ? 1250 - lab1.store[resource1] : withdrawObj.store[resource1]
                    if (!amount) { if (lab2.store[resource1]) { this.updateLabReaction() }; return }
                    this.registerManageTask({ object1: withdrawObj, object2: lab2, resourceType: resource1, amount: amount, type: 'transfer', priority: priority });
                    tools.pushToResourcesUsedHistory(resource1, amount)
                }
            }
        }
    }
    else if (this.status !== 'halted') {
        const priority = 7
        const idOflabsForBoost = _.filter(this.queues.boost, b => b.lab).map(b => b.lab)
        const labs = idToObj(_.filter(this.structures.labs, lab => !idOflabsForBoost.includes(lab.id)).map(lab => lab.id))
        labs.forEach(lab => {
            const resInLab = Object.keys(lab.store).filter(res => res !== 'energy')
            if (resInLab.length) {
                const res = resInLab[0]
                this.registerManageTask({ object1: lab, object2: terminal, resourceType: res, amount: lab.store[res], type: 'transfer', priority: priority })
            }
        })
    }
    if (debug) { console.log(debugText) }
}
MyRoom.prototype.updateManageMicroTasks_towers = function () {
    this.lastUpdateMicroTasks_towers = gameTime
    if (this.status == 'halted') { return }
    const towers = idToObj(this.structures.towers).filter(s => s.store.getFreeCapacity(RESOURCE_ENERGY))
    if (towers.length) {
        for (const structure of towers) {
            this.registerManageTask({ object1: structure, amount: structure.store.getFreeCapacity(RESOURCE_ENERGY), type: 'fill structure', priority: 6 })
        }
    }
}
MyRoom.prototype.updateManageMicroTasks_containers = function () {
    this.lastUpdateMicroTasks_containers = gameTime
    if (this.status == 'halted') { return }
    const storage = this.storage

    const containers_base = idToObj(this.structures.containers.filter(c => !c.type).map(c => c.id))

    if (storage && containers_base.length) {
        for (const container of containers_base) {
            if (container.store['energy']) {
                this.registerManageTask({ object1: container, object2: storage, resourceType: 'energy', amount: container.store['energy'], type: 'transfer', priority: 5 })
            }
            else { container.destroy() }
        }
    }

    const containers_source = idToObj(this.structures.containers.filter(c => c.type == 'source').map(c => c.id))

    if (storage && containers_source.length) {
        const priority = storage.store['energy'] > 1000 ? 6 : 5
        for (const container of containers_source) {
            if (container.store['energy']) {
                this.registerManageTask({ object1: container, object2: storage, resourceType: 'energy', amount: container.store['energy'], type: 'transfer', priority: priority })
            }
        }
    }

    let containerBase
    if (!storage && containers_base.length) containerBase = containers_base.sort((a, b) => a.store['energy'] - b.store['energy'])[0]
    if (!storage && containers_source.length && containerBase) {
        const priority = containerBase.store['energy'] ? 6 : 5
        for (const container of containers_source) {
            if (container.store['energy'] && containers_base.length) {
                this.registerManageTask({ object1: container, object2: containerBase, resourceType: 'energy', amount: container.store['energy'], type: 'transfer', priority: priority })
            }
        }
    }

    const containers_controller = idToObj(this.structures.containers.filter(c => c.type == 'controller').map(c => c.id))
    if (storage && containers_controller.length) {
        if (storage.store['energy'] > 10000) {
            for (const container of containers_controller) {
                if (container.store.getFreeCapacity('energy')) {
                    this.registerManageTask({ object1: storage, object2: container, resourceType: 'energy', amount: container.store.getFreeCapacity('energy'), type: 'transfer', priority: 7 })
                }
            }
        }
    }
    if (!storage && containers_controller.length && containerBase && containerBase.store['energy'] > 1000) {
        const containerController = containers_controller.sort((a, b) => a.store['energy'] - b.store['energy'])[0]
        if (containerController.store.getFreeCapacity('energy')) {
            this.registerManageTask({ object1: containerBase, object2: containerController, resourceType: 'energy', amount: containerBase.store['energy'] - 1000, type: 'transfer', priority: 7 })
        }
    }
}
MyRoom.prototype.updateManageMicroTasks_tombstones = function () {
    this.lastUpdateMicroTasks_tombstones = gameTime
    if (this.status) { return }
    const tombstones = idToObj(this.tombstones)
    if (tombstones.length) {
        for (const tombstone of tombstones) {
            if (tombstone.store.getUsedCapacity()) {
                const task = this.tasks.manage.tasks.find(t => t.type == 'tombstone' && t.id == tombstone.id)
                if (!task) { this.registerManageTask({ object1: tombstone, type: 'tombstone', resourceType: Object.keys(tombstone.store)[0], amount: tombstone.store[Object.keys(tombstone.store)[0]], priority: 5 }) }
            }
        }
    }
}
MyRoom.prototype.updateManageMicroTasks_checkSign = function () {
    this.lastUpdateMicroTasks_checkSign = gameTime
    if (this.status || this.room.memory.sign === undefined) { return }
    const sign = this.room.controller.sign ? this.room.controller.sign.text : ''
    if (this.room.memory.sign !== sign) {
        const task = this.tasks.manage.tasks.find(t => t.type == 'sign')
        if (!task) { this.registerManageTask({ object1: this.room.controller, type: 'sign', priority: 7 }) }
    }
}
MyRoom.prototype.updateTasksForBoost = function () {
    if (this.status == 'halted' || this.room.memory.labsBoostMode) { return }
    const terminal = this.terminal, storage = this.storage
    //boost
    const needToBoost = this.queues.boost.filter(b => !b.lab), debug = this.settings.debug.boost; let debugText = `${this.name} - debug boost\n`
    if (debug) debugText += `needToBoost.length: ${needToBoost.length}\n`
    if (needToBoost.length) {// && !readyToBoost) {
        const usedLabs = this.queues.boost.map(b => b.lab)
        const freeLabs = _.filter(this.structures.labs, l => l.canBoost && !usedLabs.includes(l.id))
        if (debug) debugText += `freeLabs.length: ${freeLabs.length}\n`
        if (freeLabs.length) {
            freeLabs.sort((a, b) => a.distanceToTerminal - b.distanceToTerminal)
            for (const boost of needToBoost) {
                if (!freeLabs.length) { break }
                if (!Game.creeps[boost.creepName]) { }
                let resources
                if (boost.spec) {//WORK body parts
                    switch (boost.spec) {
                        case 'upgradeController': resources = ['XGH2O', 'GH2O', 'GH']; break
                        case 'build': resources = ['XLH2O', 'LH2O', 'LH']; break
                        case 'repair': resources = ['XLH2O', 'LH2O', 'LH']; break
                        case 'harvest': resources = ['XUHO2', 'UHO2', 'UO']; break
                        case 'dismantle': resources = ['XZH2O', 'ZH2O', 'ZH']; break
                        case 'harvest deposit': resources = ['XUHO2', 'UHO2', 'UO']; break
                        case 'harvest mineral': resources = ['XUHO2', 'UHO2', 'UO']; break
                    }
                }
                else { resources = Object.keys(BOOSTS[boost.type]).reverse() }
                if (debug) debugText += `resources: ${resources}\n`
                let choosenResource
                for (const resource of resources) {
                    if (this.terminal) {
                        if (debug) debugText += `this.terminal.store[resource]: ${this.terminal.store[resource]} (${boost.bodyPartsCount * 30})\n`
                        if (this.terminal.store[resource] >= (boost.bodyPartsCount * 30)) {
                            boost.amount = boost.bodyPartsCount * 30; choosenResource = resource; break
                        }
                    }
                }
                if (debug) debugText += `choosenResource: ${choosenResource}\n`
                if (choosenResource) {
                    console.log(`room:${roomLink(this.name)} ${boost.creepName} type: ${boost.type}, choosenResource:${choosenResource}`);
                    tools.pushToResourcesUsedHistory(choosenResource, boost.amount)
                    boost.resourceType = choosenResource
                    boost.lab = freeLabs[0].id; freeLabs.splice(0, 1);
                    this.registerManageTask({ type: 'prepare lab to boost', object1: boost.lab, resourceType: boost.resourceType, amount: boost.amount, priority: 4, boost: boost })
                }
                else {
                    let deleteBoost = true
                    resources.forEach(resourceType => { if (cache.resources[resourceType] / cache.countOfMyRooms > boost.bodyPartsCount * 30) { deleteBoost = false } })
                    if (deleteBoost) { this.queues.boost.cut(boost); if (debug) debugText += 'delete boost' }
                }
            }
        }
    }

    if (debug) console.log(debugText)
}
MyRoom.prototype.updateManageMicroTasks_factory = function () {
    this.lastUpdateMicroTasks_factory = gameTime
    if (this.status == 'halted') { return }
    const terminal = Game.rooms[this.name].terminal, storage = Game.rooms[this.name].storage, unclaimThisRoom = this.unclaim
    const priorityBucket = 4000
    //factory
    const factoryId = this.structures.factory
    if (factoryId && storage && terminal) {
        const factory = _obj(factoryId)
        if (factory) {
            const lvl = factory.level
            let priority = 7; if (Game.cpu.bucket > priorityBucket) { priority = 6 }

            if (unclaimThisRoom || this.settings.clearFactory) {
                const resourcesToGet = Object.keys(factory.store)
                resourcesToGet.forEach(resource => { getRes(resource, factory.store[resource], storage, terminal, factory, this) })
            }
            else {
                if (this.settings.freeUpSpaceOfFactory) {
                    Object.keys(factory.store).forEach(resourceType => {
                        this.registerManageTask({ object1: factory, object2: terminal, resourceType: resourceType, amount: factory.store[resourceType], type: 'transfer', priority: priority })
                    })
                }
                else {
                    const energyMin = 5000, energyMax = 10000
                    if (factory.store['energy'] < energyMin && storage.store['energy'] > 10000) {
                        // this.registerManageTask({ object1: storage, object2: factory, resourceType: 'energy', amount: (20000 - factory.store['energy']), type: 'transfer', priority: priority })
                        setRes('energy', 1250, storage, terminal, factory, this, `factory.store['energy'] < energyMin`)
                    }
                    else if (factory.store['energy'] > energyMax) {
                        getRes('energy', 1250, storage, terminal, factory, this, `factory.store['energy'] > energyMax`)
                    }

                    const batteryMin = 1000, batteryMax = 3000
                    if (factory.store['battery'] < batteryMin && terminal.store['battery']) {
                        let amount = batteryMax - factory.store['battery']; if (terminal.store['battery'] < amount) { amount = terminal.store['battery'] }
                        setRes('battery', 100, storage, terminal, factory, this, `factory.store['battery'] < batteryMin`)
                    }
                    else if (factory.store['battery'] > batteryMax) {
                        getRes('battery', factory.store['battery'] - batteryMin, storage, terminal, factory, this, `factory.store['battery'] > batteryMax`)
                    }
                    if (this.status !== 'support' || settings.rotateRooms) {
                        if (!lvl) {
                            const lvl1 = ['G', 'L', 'K', 'X', 'O', 'U', 'Z', 'H', 'biomass', 'mist', 'metal', 'silicon']
                            lvl1.forEach(res => {
                                if (factory.store[res] < 1000) { setRes(res, 1250, storage, terminal, factory, this) }
                                if (factory.store[res] > 5000) { getRes(res, 1250, storage, terminal, factory, this) }
                            })
                            const lvl2 = ['cell', 'alloy', 'condensate', 'wire']
                            const amountlvl2 = (gameTime % 10000 == 0) ? 0 : 1250
                            lvl2.forEach(res => { if (factory.store[res] > amountlvl2) { getRes(res, (amountlvl2 == 0) ? factory.store[res] : 1250, storage, terminal, factory, this) } })
                            const lvl3 = [RESOURCE_GHODIUM_MELT, 'lemergium_bar', 'keanium_bar', 'purifier', 'oxidant', 'utrium_bar', 'zynthium_bar', 'reductant']
                            const amountlvl3 = (gameTime % 10000 == 0) ? 0 : 2000
                            lvl3.forEach(res => { if (factory.store[res] < 100 && terminal.store[res] >= 100) { setRes(res, (terminal.store[res] > 1250) ? 1250 : terminal.store[res], storage, terminal, factory, this, 'factory.store[res] < 100 && terminal.store[res] >= 100') } })
                            lvl3.forEach(res => { if (factory.store[res] > amountlvl3) { getRes(res, (amountlvl3 == 0) ? factory.store[res] : 1250, storage, terminal, factory, this) } })
                            const allres = lvl1.concat(lvl2, lvl3, ['energy', 'battery'])
                            const resourcesToGet = Object.keys(factory.store).filter(resource => !allres.includes(resource))
                            resourcesToGet.forEach(resource => { getRes(resource, factory.store[resource], storage, terminal, factory, this) })
                        }
                        else if (lvl === 1) {
                            const lvl1 = ['oxidant', 'lemergium_bar', 'zynthium_bar', 'utrium_bar', 'keanium_bar', 'purifier', 'reductant', 'cell', 'alloy', 'condensate', 'wire']
                            lvl1.forEach(res => { if (factory.store[res] < 1000) { setRes(res, 1250, storage, terminal, factory, this) } })
                            const lvl2 = ['tube', RESOURCE_PHLEGM, 'switch', 'concentrate', RESOURCE_COMPOSITE]
                            lvl2.forEach(res => { if (factory.store[res] > 100) { getRes(res, 100, storage, terminal, factory, this) } })
                            const allres = lvl1.concat(lvl2, ['energy', 'battery'])
                            const resourcesToGet = Object.keys(factory.store).filter(resource => !allres.includes(resource))
                            resourcesToGet.forEach(resource => { getRes(resource, factory.store[resource], storage, terminal, factory, this) })
                        }
                        else if (lvl === 2) {
                            const lvl1 = ['composite', 'oxidant', 'alloy', 'cell', 'reductant', 'lemergium_bar', 'keanium_bar', 'purifier', 'condensate', 'wire']
                            lvl1.forEach(res => { if (factory.store[res] < 1000) { setRes(res, 1250, storage, terminal, factory, this) } })
                            const lvl2 = [RESOURCE_PHLEGM, 'switch', 'concentrate']
                            lvl2.forEach(res => { if (factory.store[res] < 100) { setRes(res, 100, storage, terminal, factory, this) } })
                            const lvl3 = ['fixtures', 'tissue', 'transistor', 'crystal', 'extract']
                            lvl3.forEach(res => { if (factory.store[res] > 10) { getRes(res, 10, storage, terminal, factory, this) } })
                            const allres = lvl1.concat(lvl2, lvl3, ['energy', 'battery'])
                            const resourcesToGet = Object.keys(factory.store).filter(resource => !allres.includes(resource))
                            resourcesToGet.forEach(resource => { getRes(resource, factory.store[resource], storage, terminal, factory, this) })
                        }
                        else if (lvl === 3) {
                            const lvl1 = ['ghodium_melt', 'oxidant', 'reductant', 'zynthium_bar', RESOURCE_COMPOSITE, 'purifier', 'wire']
                            lvl1.forEach(res => { if (factory.store[res] < 1000) { setRes(res, 1250, storage, terminal, factory, this) } })
                            const lvl2 = ['tube', 'phlegm', 'switch', 'concentrate']
                            lvl2.forEach(res => { if (factory.store[res] < 100) { setRes(res, 100, storage, terminal, factory, this) } })
                            const lvl3 = ['fixtures', 'tissue', 'transistor', 'extract']
                            lvl3.forEach(res => { if (factory.store[res] < 10) { setRes(res, 10, storage, terminal, factory, this) } })
                            const lvl4 = ['frame', 'muscle', 'microchip', 'spirit']
                            lvl4.forEach(res => { if (factory.store[res] > 3) { getRes(res, 4, storage, terminal, factory, this) } })
                            const allres = lvl1.concat(lvl2, lvl3, lvl4, ['energy', 'battery'])
                            const resourcesToGet = Object.keys(factory.store).filter(resource => !allres.includes(resource))
                            resourcesToGet.forEach(resource => { getRes(resource, factory.store[resource], storage, terminal, factory, this) })
                        }
                        else if (lvl === 4) {
                            const lvl1 = [RESOURCE_LIQUID, 'purifier', 'oxidant', 'keanium_bar']
                            lvl1.forEach(res => { if (factory.store[res] < 1000) { setRes(res, 1250, storage, terminal, factory, this) } })
                            const lvl2 = ['tube']
                            lvl2.forEach(res => { if (factory.store[res] < 100) { setRes(res, 100, storage, terminal, factory, this) } })
                            const lvl3 = ['fixtures', 'tissue', 'muscle', 'microchip', 'transistor', 'switch', 'spirit', 'extract', 'concentrate']
                            lvl3.forEach(res => { if (factory.store[res] < 10) { setRes(res, 10, storage, terminal, factory, this) } })
                            const lvl4 = ['emanation', 'circuit', 'organoid', 'hydraulics']
                            lvl4.forEach(res => { if (factory.store[res] > 0) { getRes(res, 1, storage, terminal, factory, this) } })
                            const allres = lvl1.concat(lvl2, lvl3, lvl4, ['energy', 'battery'])
                            const resourcesToGet = Object.keys(factory.store).filter(resource => !allres.includes(resource))
                            resourcesToGet.forEach(resource => { getRes(resource, factory.store[resource], storage, terminal, factory, this) })
                        }
                        else if (lvl === 5) {
                            const lvl1 = ['liquid', 'cell', 'crystal', 'ghodium_melt']
                            lvl1.forEach(res => { if (factory.store[res] < 1000) { setRes(res, 1250, storage, terminal, factory, this) } })
                            const lvl2 = ['tube']
                            lvl2.forEach(res => { if (factory.store[res] < 100) { setRes(res, 100, storage, terminal, factory, this) } })
                            const lvl3 = ['emanation', 'hydraulics', 'frame', 'fixtures', 'organoid', 'circuit', 'microchip', 'tissue', 'spirit']
                            lvl3.forEach(res => { if (factory.store[res] < 10) { setRes(res, 10, storage, terminal, factory, this) } })
                            const lvl4 = ['machine', 'device', 'organism', 'essence']
                            lvl4.forEach(res => { if (factory.store[res] > 0) { getRes(res, 1, storage, terminal, factory, this) } })
                            const allres = lvl1.concat(lvl2, lvl3, lvl4, ['energy', 'battery'])
                            const resourcesToGet = Object.keys(factory.store).filter(resource => !allres.includes(resource))
                            resourcesToGet.forEach(resource => { getRes(resource, factory.store[resource], storage, terminal, factory, this) })
                        }
                    }
                }
            }
        }

        function setRes(resourceType, amount, storage, terminal, factory, myRoom, tag = '') {
            let priority = Game.cpu.bucket > priorityBucket ? 6 : 7, resStorage = storage.store[resourceType], resTerminal = terminal.store[resourceType]
            if ((resourceType == 'energy' || resourceType == 'battery') && settings.terminals.banOnEnergyExchange && myRoom.resources['energy'] < settings.terminals.minimumStock['energy'] * 0.9) { priority = 5 }
            if (!resStorage && !resTerminal) { return }
            const witdrawObj = ((resStorage > resTerminal) ? storage : terminal)
            myRoom.registerManageTask({ object1: witdrawObj, object2: factory, resourceType: resourceType, amount: ((witdrawObj.store[resourceType] >= amount) ? amount : witdrawObj.store[resourceType]), type: 'transfer', priority: priority, tag: tag })
        }
        function getRes(resourceType, amount, storage, terminal, factory, myRoom, tag = '') {
            let priority = Game.cpu.bucket > priorityBucket ? 6 : 7, resStorage = storage.store.getFreeCapacity(resourceType), resTerminal = terminal.store.getFreeCapacity(resourceType)
            if ((resourceType == 'energy' || resourceType == 'battery') && settings.terminals.banOnEnergyExchange && myRoom.resources['energy'] < settings.terminals.minimumStock['energy'] * 0.9) { priority = 5 }
            if (!resStorage && !resTerminal) { return }
            const transferObj = ((resStorage > amount && resTerminal > amount) ? terminal : ((resStorage > resTerminal) ? storage : terminal))
            myRoom.registerManageTask({ object1: factory, object2: transferObj, resourceType: resourceType, amount: ((transferObj.store.getFreeCapacity(resourceType) >= amount) ? amount : transferObj.store.getFreeCapacity(resourceType)), type: 'transfer', priority: priority, tag: tag })
        }

    }
}
MyRoom.prototype.updateManageMicroTasks_powerSpawn = function () {
    if (this.status) { return }
    this.lastUpdateMicroTasks_powerSpawn = gameTime
    const debug = this.settings.debug.powerSpawn; let debugText = `${this.name} debug powerSpawn\n`
    const powerSpawn = _obj(this.structures.powerSpawn); if (debug) debugText += `powerSpawn: ${powerSpawn}\n`
    if (powerSpawn && this.storage && this.terminal) {
        const needEnergy = powerSpawn.store.getFreeCapacity(RESOURCE_ENERGY)
        if (debug) debugText += `needEnergy: ${needEnergy}\n`
        if (needEnergy) {
            if (this.storage.store.getUsedCapacity(RESOURCE_ENERGY) > 20000 && this.resources[RESOURCE_ENERGY] > (settings.minimumEnergyToFillPowerSpawn ? settings.minimumEnergyToFillPowerSpawn : 100000)) {
                const amount = needEnergy //(needEnergy > 3000) ? 3000 : needEnergy
                if (debug) debugText += `register manage task for transfer energy to powerspawn: ${powerSpawn}\n`
                this.registerManageTask({ object1: this.storage, object2: powerSpawn, resourceType: RESOURCE_ENERGY, amount: amount, type: 'transfer', priority: 7, tag: '' })
            }
        }
        const needPower = powerSpawn.store.getFreeCapacity(RESOURCE_POWER)
        if (needPower) {
            if (this.terminal.store.getUsedCapacity(RESOURCE_POWER) > 100) {
                const amount = 100//(needPower > 1250) ? 1250 : needPower
                if (debug) debugText += `register manage task for transfer power to powerspawn: ${powerSpawn}\n`
                this.registerManageTask({ object1: this.terminal, object2: powerSpawn, resourceType: RESOURCE_POWER, amount: amount, type: 'transfer', priority: 7 })
            }
        }
    }
    if (debug) console.log(debugText)
}
MyRoom.prototype.updateManageMicroTasks = function (specifications = false) {
    const cpu = settings.writePerformanceLog ? Game.cpu.getUsed() : 0, status = this.room.memory.status
    if (status == 'halted') return
    const support = (status == 'support' || status == 'prepare to support')
    if (!specifications) { this.updateTasksForBoost() }
    const countOfManagers = this.creeps.filter(c => c.memory.role == 'manage').length

    if (this.lastUpdateMicroTasks && !specifications) {
        const frequency = countOfManagers == 1 ? 1000 : (countOfManagers > 2 ? 10 : 100)
        if (gameTime - this.lastUpdateMicroTasks <= frequency) { settings.writePerformanceLog ? performance.newLog(cpu, 'MyRoom.prototype.updateManageMicroTasks', this.name) : false; return }
    }
    // if (this.lastUpdateMicroTasks && !specifications) { if (gameTime - this.lastUpdateMicroTasks < (countOfManagers == 1 ? 1000 : (countOfManagers > 2 ? 10 : 100)) && this.tasks.manage.tasks.filter(t => t.priority < 7).length) { settings.writePerformanceLog ? performance.newLog(cpu, 'MyRoom.prototype.updateManageMicroTasks', this.name) : false; return } }
    if (!specifications) this.lastUpdateMicroTasks = gameTime
    const unclaimThisRoom = this.unclaim
    if (unclaimThisRoom) { this.tasks.manage.tasks.filter(t => t.type == 'fill structure').forEach(t => this.tasks.manage.tasks.cut(t)) }

    if (!unclaimThisRoom) {
        if (specifications) {
            if (specifications.extensions) { this.updateManageMicroTasks_extensionsAndSpawns() }
            else if (specifications.labs) { this.updateManageMicroTasks_labs() }
            else if (specifications.towers) { this.updateManageMicroTasks_towers() }
            else if (specifications.tombstones) { this.updateManageMicroTasks_tombstones() }
            else if (specifications.boost) { this.updateTasksForBoost() }
            else if (specifications.factory && this.structures.factory) { this.updateManageMicroTasks_factory() }
            else if (specifications.powerSpawn && this.structures.powerSpawn) { this.updateManageMicroTasks_powerSpawn() }
            else if (specifications.storage_terminal) { this.updateManageMicroTasks_storage_terminal() }
            settings.writePerformanceLog ? performance.newLog(cpu, 'MyRoom.prototype.updateManageMicroTasks', this.name) : false; return
        }
        else {
            if (!this.lastUpdateMicroTasks_extensionsAndSpawns || gameTime - this.lastUpdateMicroTasks_extensionsAndSpawns >= 100) { this.updateManageMicroTasks_extensionsAndSpawns() }
            if (!this.lastUpdateMicroTasks_labs || gameTime - this.lastUpdateMicroTasks_labs >= 100) { this.updateManageMicroTasks_labs() }
            if (!this.lastUpdateMicroTasks_towers || gameTime - this.lastUpdateMicroTasks_towers >= 10) { this.updateManageMicroTasks_towers() }
            if (!this.lastUpdateMicroTasks_tombstones || gameTime - this.lastUpdateMicroTasks_tombstones >= 10) { this.updateManageMicroTasks_tombstones() }
            if (!this.lastUpdateMicroTasks_factory || gameTime - this.lastUpdateMicroTasks_factory >= 10) { this.updateManageMicroTasks_factory() }
            if (!support) {
                if (!this.lastUpdateMicroTasks_powerSpawn || gameTime - this.lastUpdateMicroTasks_powerSpawn >= 10) { this.updateManageMicroTasks_powerSpawn() }
            }
        }
    }
    if (this.structures.containers.length) {
        this.updateManageMicroTasks_containers()
        this.lastUpdateMicroTasks_containers = gameTime
    }
    if (!this.lastUpdateMicroTasks_checkSign || gameTime - this.lastUpdateMicroTasks_checkSign >= 1000) { this.updateManageMicroTasks_checkSign() }
    if (Object.keys(this.structures.links).length) {
        this.lastUpdateMicroTasks_links = gameTime
        const controllerLinkId = _.find(this.structures.links, l => l.type == 'controller')
        const amountRoleRepair = _.filter(this.creeps, creep => creep.memory.role == 'repair').length
        const amountRoleUpgrade = _.filter(this.creeps, creep => creep.memory.role == 'upgrade').length && this.level < 8
        const storageLinkMemory = _.find(this.structures.links, l => l.type == 'storage')
        if (storageLinkMemory && this.storage) {
            const storageLink = _obj(storageLinkMemory.id)
            if ((this.storage.store['energy'] > 10000 && amountRoleRepair) || (this.storage.store['energy'] > 10000 && controllerLinkId && amountRoleUpgrade)) {
                if (storageLink.store.getUsedCapacity(RESOURCE_ENERGY) < 800) {
                    this.registerManageTask({ object1: storageLink.id, type: 'fill storage link', amount: 800 - storageLink.store[RESOURCE_ENERGY], priority: 5 })
                }
            }
            else if (storageLink.store[RESOURCE_ENERGY] > 0) {
                this.registerManageTask({ object1: storageLink.id, type: 'clearing storage link', amount: storageLink.store[RESOURCE_ENERGY], priority: 5 })
            }
        }
    }
    const terminal = this.terminal, storage = this.storage
    if (terminal && storage) { this.updateManageMicroTasks_storage_terminal() }

    //transfer mineral
    if (!this.status) {
        if (this.tasks.harvestMineral.container) {
            const container = _obj(this.tasks.harvestMineral.container)
            if (container && container.store.getUsedCapacity() > container.store.getFreeCapacity()) {
                let priority = 6
                const transferMineralTask = this.tasks.manage.tasks.find(t => t.type == 'transfer mineral')
                if (container && !transferMineralTask) {
                    this.registerManageTask({ object1: container.id, resourceType: this.tasks.harvestMineral.resourceType, amount: container.store.getUsedCapacity(), type: 'transfer mineral', priority: priority })
                }
            }
        }
        if (!this.tasks.harvestMineral.lab) {
            const harvestMineral = this.creeps.find(c => c.memory.role == 'harvest mineral')
            if (harvestMineral && harvestMineral.store.getUsedCapacity() > harvestMineral.store.getFreeCapacity()) {
                let priority = 7
                const transferMineralTask = this.tasks.manage.tasks.find(t => t.type == 'transfer mineral')
                if (harvestMineral && !transferMineralTask) {
                    this.registerManageTask({ object1: harvestMineral.id, resourceType: this.tasks.harvestMineral.resourceType, amount: harvestMineral.store.getUsedCapacity(), type: 'transfer mineral', priority: priority })
                }
            }
        }
    }

    //nuker
    if (this.structures.nuker && (!this.lastUpdateMicroTasks_nuker || gameTime - this.lastUpdateMicroTasks_nuker >= 1000)) {
        this.lastUpdateMicroTasks_nuker = gameTime
        const nuker = _obj(this.structures.nuker)
        if (nuker && this.terminal) {
            const needEnergy = nuker.store.getFreeCapacity(RESOURCE_ENERGY)
            if (needEnergy) {
                if (this.storage.store.getUsedCapacity(RESOURCE_ENERGY) > 20000) {
                    const amount = needEnergy > 10000 ? 10000 : needEnergy
                    this.registerManageTask({ object1: this.storage, object2: nuker, resourceType: RESOURCE_ENERGY, amount: amount, type: 'transfer', priority: 7 })
                }
            }
            const needGhodium = nuker.store.getFreeCapacity(RESOURCE_GHODIUM)
            if (needGhodium) {
                if (this.terminal.store.getUsedCapacity(RESOURCE_GHODIUM) > 1250) {
                    const amount = needGhodium > 1250 ? 1250 : needGhodium
                    this.registerManageTask({ object1: this.terminal, object2: nuker, resourceType: RESOURCE_GHODIUM, amount: amount, type: 'transfer', priority: 7 })
                }
            }
        }
    }


    if (this.settings.debug.manage) { console.log(this.name, 'MyRoom.prototype.updateManageMicroTasks cpu:', Game.cpu.getUsed() - cpu) }
    settings.writePerformanceLog ? performance.newLog(cpu, 'MyRoom.prototype.updateManageMicroTasks', this.name) : false
}
MyRoom.prototype.updateTaskBaseManage = function () {
    const cpu = settings.writePerformanceLog ? Game.cpu.getUsed() : 0, task = this.tasks.manage
    if (task.forced_requiredWorkers !== undefined) { task.requiredWorkers = task.forced_requiredWorkers; return }
    if (this.status == 'support') { task.requiredWorkers = 1; return }
    if (this.level < 4 && !this.structures.containers.find(c => !c.type)) { task.requiredWorkers = 0; return }
    const enemies = _.filter(cache.enemies, e => e.pos.roomName == this.name && e.owner !== 'Invader').length
    const pwrCreep = _.filter(Game.powerCreeps, c => c.room).filter(c => c.room.name == this.name && c.powers).find(c => c.ticksToLive && c.powers[PWR_OPERATE_EXTENSION])
    let xxx
    if (pwrCreep) { xxx = 450 }
    else { xxx = 550 }
    //calculate requiredWorkers
    let carry = (this.room.energyCapacityAvailable / 100) * 50
    if (carry > 1250) { carry = 1250 }
    let amountOfTasks = 0
    task.tasks.filter(t => t.type !== 'transfer mineral').forEach(t => amountOfTasks += t.amount)
    const requiredWorkers = Math.floor(amountOfTasks / (carry * 2))

    task.requiredWorkers = requiredWorkers ? (requiredWorkers > 2 ? (enemies ? (requiredWorkers > 4 ? 4 : requiredWorkers) : (Game.cpu.bucket < 5000 ? 1 : 2)) : requiredWorkers) : 1
    if (this.level < 5 && task.requiredWorkers == 1) { task.requiredWorkers = 3 }
    else if (this.level < 7 && task.requiredWorkers == 1) { task.requiredWorkers = 2 }
    if (this.settings.debug.manage) { console.log(this.name, 'manage requiredWorkers:', task.requiredWorkers) }

    settings.writePerformanceLog ? performance.newLog(cpu, 'MyRoom.prototype.updateBaseManage', this.name) : false
}
MyRoom.prototype.__updateTaskBaseManage = function () {
    const cpu = settings.writePerformanceLog ? Game.cpu.getUsed() : 0
    const task = this.tasks.manage
    const pwrCreep = _.filter(Game.powerCreeps, c => c.room).filter(c => c.room.name == this.name && c.powers).find(c => c.ticksToLive && c.powers[PWR_OPERATE_EXTENSION])
    let xxx
    if (pwrCreep) { xxx = 450 }
    else { xxx = 550 }
    //calculate requiredWorkers
    let bodyCounter = 0
    const creepSpawnedInRoom = _.filter(Game.creeps, cr => cr.memory.spawnRoom == this.name)
    for (const creep of creepSpawnedInRoom) { bodyCounter += creep.body.length }
    myRooms[this.name].queues.spawn.forEach(spawn => bodyCounter += spawn.creepBody.length)
    const bodyOfManageCreeps = Math.ceil(creepSpawnedInRoom.filter(c => c.memory.role == 'manage').map(c => c.body.filter(b => b.type == CARRY).length).reduce((a, b) => a + b, 0))
    const bodyNewCreep = spawnLogick.getBody('manage', Game.rooms[this.name].energyCapacityAvailable)

    let countOfCarry
    if (bodyNewCreep) { countOfCarry = bodyNewCreep.filter(b => b == CARRY).length }
    else { countOfCarry = 3 }

    const asd = 25 / countOfCarry
    const qwe = bodyCounter / xxx

    const requiredWorkers = Math.ceil(qwe * asd) + ((bodyOfManageCreeps < countOfCarry) ? 1 : 0)
    task.requiredWorkers = requiredWorkers
    if (this.settings.debug.manage) { console.log(this.name, 'manage requiredWorkers:', requiredWorkers) }

    settings.writePerformanceLog ? performance.newLog(cpu, 'MyRoom.prototype.updateBaseManage', this.name) : false
}
MyRoom.prototype.manageTaskBaseManage = function () {
    const cpu = settings.writePerformanceLog ? Game.cpu.getUsed() : 0

    const role = 'manage'
    if (!this.storage && !this.terminal && !this.structures.containers.find(c => !c.type)) { return }
    if (this.level < 4 && !this.structures.containers.find(c => !c.type)) { return }
    const task = this.tasks.manage
    if (task.halted) { return }

    const requiredWorkers = (task.requiredWorkers !== undefined) ? task.requiredWorkers : 1
    const workers = _.filter(Game.creeps, creep => creep.memory.role == role && creep.memory.roomName == this.name)
    const willDie = workers.filter(w => w.ticksToLive < 300).length

    if (this.queues.spawn.filter(st => st.role == role).length + workers.length - willDie >= requiredWorkers) { return }

    const creepBody = spawnLogick.getBody(role, this.room.energyCapacityAvailable, { roads: task.roads })
    const specifications = {
        role: role,
        priority: settings.spawn.priority.manage,
        creepBody: creepBody,
        memory: {
            role: role,
            roomName: this.name,
        }
    }
    this.registerSpawn(specifications)

    settings.writePerformanceLog ? performance.newLog(cpu, 'MyRoom.prototype.manageTaskBaseManage', this.name) : false
}
MyRoom.prototype.checkMiniTasks = function () {
    _.filter(this.tasks.manage.tasks, t => t.creepName).filter(t => !Game.creeps[t.creepName] && !Game.powerCreeps[t.creepName]).forEach(t => this.tasks.manage.tasks.cut(t))
}
MyRoom.prototype.registerManageTask = function (specifications) {
    const type = (specifications.type) ? specifications.type : 'fill structure'
    const object1 = (typeof specifications.object1 == 'string') ? specifications.object1 : specifications.object1.id
    const amount = specifications.amount
    const resourceType = specifications.resourceType ? specifications.resourceType : RESOURCE_ENERGY
    const object2 = specifications.object2 ? ((typeof specifications.object2 == 'string') ? specifications.object2 : specifications.object2.id) : false
    const priority = specifications.priority
    const boost = specifications.boost
    const updateTime = specifications.updateTime
    const tag = specifications.tag ? specifications.tag : ''
    //check
    const tasks = this.tasks.manage.tasks

    let task
    if (object2) { task = tasks.find(t => t.type == type && t.object1 == object1 && t.resourceType == resourceType && t.object2 == object2) }
    else { task = tasks.find(t => t.type == type && t.object1 == object1 && t.resourceType == resourceType) }

    if (task) {
        if (task && !amount) { tasks.cut(task); return }
        if (!task.creepName) { task.amount = amount; task.priority = priority; if (updateTime) { task.time = gameTime } }
        else if (type == 'clearing storage link') this.registerSheduledTask('clearing storage link')
    }
    else {
        if (!amount && type !== 'sign') { return }
        if (amount <= 0) { return }
        const newTask = {
            type: type,
            object1: object1,
            resourceType: resourceType,
            amount: amount,
            priority: priority,
            creepName: false,
            time: gameTime,
            tag: tag
        }
        if (object2) { newTask.object2 = object2 }
        if (boost) { newTask.boost = boost }
        tasks.push(newTask)
    }
}