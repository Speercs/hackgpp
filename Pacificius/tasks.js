'use strict'
//2023.07.23
global.tasks = {}
global.taskTools = {}

global.Task = class {
    constructor(type, pos, number = false, specifications = false) {
        const cpu = settings.writePerformanceLog ? Game.cpu.getUsed() : 0
        if (!number) { this.number = taskTools.getNumber() } else { this.number = number }
        this.type = type
        this.roomName = pos.roomName
        this.pos = pos
        let spawnRoom
        if (!number) {
            switch (type) {
                // case 'harvest deposit': this.creepsCounter = 0, this.roles = { 'harvest deposit': { role: 'harvest deposit', amount: _.find(myRooms[pos.roomName].deposits, deposit => deposit.pos.x == pos.x && deposit.pos.y == pos.y).accessibleFields } }
                case 'harvest power': this.creepsCounter = 0, this.roles = { 'destroyPower': { role: 'destroyPower', amount: 1 }, 'healPower': { role: 'healPower', amount: 1 }, 'transferPower': { role: 'transferPower', amount: (Math.ceil(specifications.power / 1650) > 6 ? 6 : (Math.ceil(specifications.power / 1650))) } }
                    spawnRoom = tools.findNearestRoom({ roomName: pos.roomName, minimumLevel: 8 }); this.transferCounter = 0; break
                case 'harvest deposit': this.creepsCounter = 0, this.roles = { 'harvest deposit': { role: 'harvest deposit', amount: 1 } }
                    this.tombstones = []; spawnRoom = tools.findNearestRoom({ roomName: pos.roomName, minimumLevel: 7 }); this.transferCounter = 0; break
                case 'defend from invaders': this.roles = { defender: { role: 'defender', amount: 2 } }
                    spawnRoom = tools.findNearestRoom({ roomName: pos.roomName, minimumLevel: 6 }); break;
                case 'reserve': this.roles = { observer: { role: 'observer', amount: 1 }, claim: { role: 'claim', amount: 1 } }
                    spawnRoom = tools.findNearestRoom({ roomName: pos.roomName, minimumLevel: 3 }); break;
                case 'claim': this.roles = { observer: { role: 'observer', amount: 0 }, claim: { role: 'claim', amount: 1 } }
                    spawnRoom = tools.findNearestRoom({ roomName: pos.roomName, minimumLevel: 3 }); break;
                case 'build base': this.roles = { 'build base': { role: 'build base', amount: 1 } }
                    spawnRoom = tools.findNearestRoom({ roomName: pos.roomName, excludeRoom: true, minimumLevel: 8 }); break
                case 'build base to ally': this.roles = { 'build base': { role: 'build base', amount: 1 } }
                    spawnRoom = tools.findNearestRoom({ roomName: pos.roomName, excludeRoom: true, minimumLevel: 8 }); break
                case 'transfer': this.roles = { 'transfer': { role: 'transfer', amount: 1 } }
                    spawnRoom = tools.findNearestRoom({ roomName: pos.roomName, excludeRoom: true, minimumLevel: 6 }); break
                case 'remote harvest source': this.roles = {
                    'observer': { role: 'observer', amount: 1 },
                    'builder': { role: 'builder', amount: 0 },
                    'remote harvest source': { role: 'transfer', amount: 0 },
                    'transfer energy': { role: 'transfer energy', amount: 0 },
                    'defender': { role: 'transfer', amount: 0 }
                }
                    spawnRoom = tools.findNearestRoom({ roomName: pos.roomName, excludeRoom: true, minimumLevel: 1 }); break
                case 'observer': this.roles = { 'observer': { role: 'observer', amount: 1 } }
                    spawnRoom = tools.findNearestRoom({ roomName: pos.roomName, excludeRoom: false, minimumLevel: 1 }); break
                case 'punchingBag': this.roles = { 'punchingBag': { role: 'punchingBag', amount: 1 } }
                    spawnRoom = tools.findNearestRoom({ roomName: pos.roomName, excludeRoom: false, minimumLevel: 7 }); break
                case 'dryer': this.roles = { 'dryer': { role: 'dryer', amount: 1 } }
                    spawnRoom = tools.findNearestRoom({ roomName: pos.roomName, excludeRoom: false, minimumLevel: 8 }); break
                case 'dismantleRoom': this.roles = { 'dismantleRoom': { role: 'dismantleRoom', amount: 1 } }
                    spawnRoom = tools.findNearestRoom({ roomName: pos.roomName, excludeRoom: false, minimumLevel: 7 }); break
                case 'attackRoom': this.roles = { 'attackRoom': { role: 'attackRoom', amount: 1 } }
                    spawnRoom = tools.findNearestRoom({ roomName: pos.roomName, excludeRoom: false, minimumLevel: 7 }); break
                case 'attackGroup':
                    this.roles = {
                        'dismantle': { role: 'dismantle', amount: 3 },
                        'rangedAttack': { role: 'rangedAttack', amount: 3 },
                        'heal': { role: 'heal', amount: 3 }
                    }
                    spawnRoom = tools.findNearestRoom({ roomName: pos.roomName, excludeRoom: false, minimumLevel: 7 }); break
                case 'partizan': this.roles = { 'partizan_dismantle': { role: 'partizan_dismantle', amount: 1 }, 'partizan_attack': { role: 'partizan_attack', amount: 1 } }
                    spawnRoom = tools.findNearestRoom({ roomName: pos.roomName, excludeRoom: false, minimumLevel: 7 }); break
                case 'partizan_rangedAttack': this.roles = { 'partizan_rangedAttack': { role: 'partizan_rangedAttack', amount: 1 } }
                    spawnRoom = tools.findNearestRoom({ roomName: pos.roomName, excludeRoom: false, minimumLevel: 7 }); break
                case 'partizan_attack': this.roles = { 'partizan_attack': { role: 'partizan_attack', amount: 1 } }
                    spawnRoom = tools.findNearestRoom({ roomName: pos.roomName, excludeRoom: false, minimumLevel: 7 }); break
                case 'avengers': this.roles = specifications.roles; this.bodies = specifications.bodies
                    spawnRoom = tools.findNearestRoom({ roomName: pos.roomName, excludeRoom: false, minimumLevel: 7 }); break
                case 'heal': this.roles = { 'heal': { role: 'heal', amount: 1 } }
                    spawnRoom = tools.findNearestRoom({ roomName: pos.roomName, excludeRoom: false, minimumLevel: 7 }); break
                default:
                    break;
            }
            if (spawnRoom) { this.spawnRoom = myRooms[spawnRoom] }
            if (spawnRoom) {
                // if (!cache.avoidRooms) { cache.avoidRooms = [] }
                // const avoidRooms = Object.keys(cache.avoidRooms).filter(r => tools.getDistanceForRooms(r, spawnRoom) <= 10)
                const route = Game.map.findRoute(this.roomName, spawnRoom, {
                    routeCallback(roomName) {
                        if (cache.avoidRooms && cache.avoidRooms[roomName]) { return Infinity; }  // avoid this room
                        return 1;
                    }
                })
                if (route !== -2) { this.distance = (Math.ceil(route.length) * 55) + 50 }
                else if (this.type == 'harvest deposit') { this.distance = 600 }
                // console.log(avoidRooms.length, this.roomName, spawnRoom, this.distance, JSON.stringify(route))
            }
        }
    }
}
taskTools.create = function (type, pos, specifications = false) {
    const newTask = new Task(type, pos, false, specifications)
    if (specifications) { Object.keys(specifications).forEach(key => newTask[key] = specifications[key]) }
    tasks[newTask.number] = newTask
    newTask.backup()
    console.log(`create task ${newTask.number}, type: ${type}, room: ${roomLink(pos.roomName)}, distance: ${newTask.distance ? newTask.distance : ''}`);
}
taskTools.getNumber = function () {
    let number = 1
    while (tasks[number]) { number += 1 }
    return number
}

// taskTools.recoverFromMemory = function () { tasks = Memory.tasks }
Task.prototype.delete = function (reason = '') {
    this.suicide()
    if (this.spawnRoom) {
        if (this.spawnRoom.my) {
            const sp = this.spawnRoom.queues.spawn.filter(s => s.memory.task == this.number)
            sp.forEach(s => this.spawnRoom.queues.spawn.splice(this.spawnRoom.queues.spawn.indexOf(s), 1))
        }
        delete this.spawnRoom
    }

    console.log(`delete task ${this.type} due to ${reason}<details>${JSON.stringify(this, 0, 3)}!</details>`);

    if (this.type == 'harvest power' && this.active) {
        Game.notify(`harvest power: ${this.powerCounter}(${this.power}),room: ${this.roomName}, time: ${gameTime}`)
        if (info.new) { info.new(1, 'power', this.roomName, '', `${this.powerCounter} (${this.power})`) }
    }
    delete tasks[this.number]
    delete Memory.tasks[this.number]
}
Task.prototype.checkSpawn = function () {
    if (!this.spawnRoom) { console.log(`dont choosed spawn room for task: ${this.number} type: ${this.type} ${roomLink(this.pos.roomName)}`); return }
    if (!this.spawnRoom.my) { console.log(`choosed spawn room for task not my: ${this.number}`); return }
    if (this.type == 'transfer' && (!this.withdraw || (!this.transfer && !this.drop))) { return }
    const countByRole = {}
    const creeps = _.filter(Game.creeps, creep => creep.memory.task == this.number)

    creeps.forEach(creep => {
        const role = creep.memory.role
        if (!countByRole[role]) { countByRole[role] = { role: role, amount: 1 } }
        else { countByRole[role].amount += 1 }
    })
    if (this.type == 'claim') {
        Object.keys(this.roles).forEach(role => {
            const inQueues = this.spawnRoom.queues.spawn.filter(s => s.role == role).length
            const different = this.roles[role].amount - ((countByRole[role]) ? countByRole[role].amount : 0) - inQueues
            if (different > 0) {
                if (role == 'observer') { this.spawn({ role: role }) }
                else if (role == 'claim') {
                    if (this.upgradeBlocked === undefined) {
                        if (!this.roles['observer'] || (this.roles['observer'] && !this.roles['observer'].amount)) { this.spawn({ role: role }); return }
                    }
                    else {
                        if (this.upgradeBlocked < gameTime + this.distance + 30) { this.spawn({ role: role }); return }
                        else { return }
                    }
                }
            }
        })
        return
    }
    else if (this.type == 'observer') {
        const role = 'observer'
        const inQueues = this.spawnRoom.queues.spawn.filter(s => s.role == role).length
        const willDie = creeps.filter(creep => creep.ticksToLive < this.distance).length
        const different = this.roles[role].amount - willDie - ((countByRole[role]) ? countByRole[role].amount : 0) - inQueues
        if (different > 0) { for (let i = 0; i < different; i++) { this.spawn({ role: role }) } }
    }
    else if (this.type == 'reserve') {
        Object.keys(this.roles).forEach(role => {
            const inQueues = this.spawnRoom.queues.spawn.filter(s => s.role == role).length
            const different = this.roles[role].amount - ((countByRole[role]) ? countByRole[role].amount : 0) - inQueues
            if (different > 0 && role == 'observer') { this.spawn({ role: role }) }

            if (different > 0 && role == 'claim' && !(this.reservedTime === undefined)) {
                if (this.reservedTime < gameTime + 1000 - this.distance) { this.spawn({ role: role }) }
            }
        })
    }
    else if (this.type == 'harvest deposit') {
        if (this.distance) { if (this.distance > 700) { return } }
        if (this.spawnRoom.resources['XZHO2'] < 300 && settings.tasks.useBoostForHarvestDeposit) { return }
        if (this.creepsCounter && this.creepsCounter > settings.tasks.maxCreepsPerTaskHarvestDeposit) { return }
        if (Game.cpu.bucket < settings.bucket.harvestDeposit || this.lastCooldown > this.maxCooldown || !settings.tasks.harvestDeposit) { return }
        else if (!this.transferCounter && this.creepsCounter >= this.roles['harvest deposit'].amount + 1) { return }
    }
    else if (this.type == 'harvest power') {
        if (this.done) { return }
        const active = _.find(tasks, t => t.type == 'harvest power' && t.active)
        if (active && !this.active) { return }
        if (!active && this.time < 2500) { return }
        if (this.power < settings.tasks.harvestPower_minimumPower || (this.distance > 300 && this.power < settings.tasks.harvestPower_minimumPowerWhenDistanceMoreThan300)) { return }
        if (this.distance > 500) { return }
        if (!this.healPower && !this.destroyPower) {
            if (this.distance > 300) {
                if (this.spawnRoom.resources['XZHO2'] < 600 || this.spawnRoom.resources['XUH2O'] < 1050 || this.spawnRoom.resources['XLHO2'] < 1200) { return }
            }
            else if (this.spawnRoom.resources['XLHO2'] < 750 || this.spawnRoom.resources['XUH2O'] < 600) { return }
        }
        this.active = true
    }
    else if (this.type == 'partizan' || this.type == 'partizan_rangedAttack' || this.type == 'partizan_attack') { if (!this.ready) { return } else { this.ready = false; this.attackTime = Game.tim + this.frequency ? this.frequency : 1000 } }
    else if (this.type == 'build base' && (myRooms[this.pos.roomName] && !myRooms[this.pos.roomName].my)) { return }
    else if (this.type == 'attackGroup') {
        if (!_.filter(Game.creeps, creep => creep.memory.task).length) { this.spawnStatus = true; delete this.status }

        let needSpawn = false
        Object.keys(this.roles).forEach(role => {
            const inQueues = this.spawnRoom.queues.spawn.filter(s => s.role == role).length
            const different = this.roles[role].amount - ((countByRole[role]) ? countByRole[role].amount : 0) - inQueues
            if (different > 0) { needSpawn = true }
        })
        if (this.spawnStatus && !needSpawn) this.spawnStatus = false

        if (!this.spawnStatus) return
    }
    if (!this.roles) { console.log(`task without roles ${this.number}`); return }
    Object.keys(this.roles).forEach(role => {
        if (role == 'transferPower') { if (!this.inWork) { return } }
        const inQueues = this.spawnRoom.queues.spawn.filter(s => s.role == role).length
        const different = this.roles[role].amount - ((countByRole[role]) ? countByRole[role].amount : 0) - inQueues
        if (different > 0) { for (let i = 0; i < different; i++) { this.spawn({ role: role }) } }
    })

}
Task.prototype.spawn = function (specifications) {
    const role = specifications.role
    let body
    if (this.type == 'claim') {
        if (this.minimumBody) { body = [MOVE, CLAIM] }
        else { body = spawnLogick.getBody(role, this.spawnRoom.room.energyCapacityAvailable, { boost: this.boost, spawnRoom: this.spawnRoom, heal: this.heal }) }
    }
    else if (this.type == 'transfer') {
        let oneWay; if (!this.boost && this.distance > 375 && this.distance < 500) { oneWay = true }
        body = spawnLogick.getBody(role, this.spawnRoom.room.energyCapacityAvailable, { boost: this.boost, spawnRoom: this.spawnRoom, oneWay: oneWay })
        console.log('Task.prototype.spawn task:', this.number, 'move length:', body.filter(b => b == MOVE).length)
    }
    else if (this.type == 'harvest deposit') {
        const depositCreeps = _.filter(Memory.creeps, cm => cm.role == 'harvest deposit').length
        let depositCreepsInQueuesCounter = 0
        cache.myRooms.forEach(myRoom => depositCreepsInQueuesCounter += myRoom.queues.spawn.filter(q => q.role == 'harvest deposit').length)
        if ((depositCreeps + depositCreepsInQueuesCounter) >= settings.tasks.maxCountOfHarvestDepositCreeps) { return }
        body = spawnLogick.getBody(role, this.spawnRoom.room.energyCapacityAvailable, { distance: this.distance, lastCooldown: this.lastCooldown })
    }
    else if (this.type == 'harvest power') {
        body = spawnLogick.getBody(role, this.spawnRoom.room.energyCapacityAvailable, { distance: this.distance })
    }
    else if (this.type == 'build base') {
        body = spawnLogick.getBody(role, this.spawnRoom.room.energyCapacityAvailable, { spawnRoom: this.spawnRoom, task: this.number })
    }
    else if (this.type == 'avengers') { body = this.bodies[role] }
    else if (this.type == 'attackGroup') {
        body = []
        switch (role) {
            case 'attack':
                body.pushN(TOUGH, 5); body.pushN(ATTACK, 10); body.pushN(MOVE, 9); body.pushN(TOUGH, 5);
                body.pushN(ATTACK, 20); body.push(MOVE); break;
            case 'dismantle':
                body.pushN(TOUGH, 10); body.pushN(WORK, 10); body.pushN(MOVE, 9); body.pushN(TOUGH, 10);
                body.pushN(WORK, 10); body.push(MOVE); break;
            case 'heal':
                body.pushN(TOUGH, 3); body.pushN(MOVE, 9); body.pushN(TOUGH, 2); body.pushN(HEAL, 35); body.push(MOVE); break;
            case 'rangedAttack':
                body.pushN(TOUGH, 3); body.pushN(MOVE, 9); body.pushN(TOUGH, 2); body.pushN(RANGED_ATTACK, 10); body.pushN(HEAL, 25); body.push(MOVE); break;
        }
        //body = this.bodies[role]
    }

    else { body = spawnLogick.getBody(role, this.spawnRoom.room.energyCapacityAvailable, { spawnRoom: this.spawnRoom }) }
    const memory = { role: role, task: this.number }
    let priority = 6
    if (this.type == 'defend from invaders') { priority = 5 }
    this.spawnRoom.registerSpawn({ role: role, priority: priority, creepBody: body, memory: memory })
}
taskTools.main = function () {
    if (Game.cpu.bucket <= 10) { return }
    let cpu = Game.cpu.getUsed()
    const taskCreeps = _.filter(Game.creeps, creep => !creep.spawning && creep.memory.task)
    Object.values(tasks).forEach(task => {
        task.cache = {}
        task.creeps = taskCreeps.filter(creep => creep.memory.task == task.number)
    })
    settings.writePerformanceLog ? performance.newLog(cpu, 'tasks main') : false
    //harvest deposit
    _.filter(tasks, t => t.type == 'harvest deposit').sort((a, b) => a.lastCooldown - b.lastCooldown).forEach(task => {
        cpu = Game.cpu.getUsed()
        try {
            if (Game.rooms[task.pos.roomName]) { if (!_obj(task.id) && !task.creeps.length) { task.delete('room in access, deposit dont exist'); return } }
            if (!task.maxCooldown) { task.maxCooldown = tools.calculateHarvestDepositLastCooldown(task.distance, task.lastCooldown) }
            if (task.maxCooldown && (task.lastCooldown >= task.maxCooldown) && task.creeps) { if (!task.creeps.length) { return } }
            if (task.creepsCounter >= settings.tasks.maxCreepsPerTaskHarvestDeposit) { if (!task.creeps.length) { return } }
            task.harvestDeposit()
            if (each10) { task.checkSpawn() }
        } catch (error) { console.log('harvest deposit task error:', error + `\n${error.stack}`); }

        settings.writePerformanceLog ? performance.newLog(cpu, 'tasks deposit', task.number) : false
    })

    //harvest power
    let powerTasks = _.filter(tasks, t => t.type == 'harvest power')
    const activePowerTask = powerTasks.find(t => t.active)
    if (activePowerTask) {
        cpu = Game.cpu.getUsed()
        try {
            activePowerTask.harvestPower()
            if (each10) { activePowerTask.checkSpawn() }
        } catch (error) { console.log('harvest power task error:', error) }

        settings.writePerformanceLog ? performance.newLog(cpu, 'tasks power', activePowerTask.number) : false
    }
    if (!activePowerTask || each100) {
        powerTasks.sort((a, b) => b.power - a.power).forEach(task => {
            cpu = Game.cpu.getUsed()
            try {
                task.harvestPower()
                if (!activePowerTask && each10) { task.checkSpawn() }
            } catch (error) { console.log('harvest power task error:', error) }
            settings.writePerformanceLog ? performance.newLog(cpu, 'tasks power', task.number) : false
        })
    }

    _.filter(tasks, t => t.type !== 'harvest deposit' && t.type !== 'harvest power').forEach(task => {
        cpu = Game.cpu.getUsed()
        try {
            switch (task.type) {
                case 'observer': task.observer(); break;
                case 'punchingBag': task.punchingBag(); break;
                case 'dryer': task.dryer(); break;
                case 'transfer': task._transfer(); break;
                case 'build base': task.buildBase(); break;
                case 'build base to ally': task.buildBaseToAlly(); break;
                case 'dismantleRoom': task.dismantleRoom(); break;
                case 'attackRoom': task.attackRoom(); break;
                case 'attackGroup': task.attackGroup(); break;
                case 'partizan': task.partizan(); break;
                case 'partizan_rangedAttack': task.partizan_rangedAttack(); break;
                case 'partizan_attack': task.partizan_attack(); break;
                case 'avengers': task.avengers(); break
                case 'heal': task._heal(); break

                default: task.action(); break;
            }

            if (each10) { task.checkSpawn() }
        } catch (error) { console.log('error task', task.type, error + `\n${error.stack}`) }
        settings.writePerformanceLog ? performance.newLog(cpu, `task: ${task.type}, #${task.number}`) : false
    })
}
Task.prototype.backup = function () {
    const cpu = settings.writePerformanceLog ? Game.cpu.getUsed() : 0
    try {

        Memory.tasks[this.number] = {}
        const task = Memory.tasks[this.number]
        Object.keys(this).forEach(key => {
            switch (key) {
                case 'spawnRoom': task[key] = this[key].name; break;
                case 'creeps': break;
                default: task[key] = this[key]; break;
            }
        })
    } catch (error) {
        console.log(JSON.stringify(this.number), error)
    }
    settings.writePerformanceLog ? performance.newLog(cpu, 'Task.prototype.backup') : false
}
taskTools.restoreTasks = function () {
    const cpu = settings.writePerformanceLog ? Game.cpu.getUsed() : 0
    Object.values(Memory.tasks).forEach(taskMemory => {
        const newTask = new Task(taskMemory.type, taskMemory.pos, taskMemory.number)
        tasks[taskMemory.number] = newTask
        const task = tasks[taskMemory.number]
        Object.keys(taskMemory).forEach(key => {
            switch (key) {
                case 'spawnRoom': task[key] = myRooms[taskMemory[key]]; break;
                case 'pathList': task[key] = taskMemory[key]
                    task.pathList.forEach(p => { const newP = []; if (p.path) { p.path.forEach(pp => newP.push(new RoomPosition(pp.x, pp.y, pp.roomName))); p.path = newP } })
                    break
                default: task[key] = taskMemory[key]; break;
            }
        })
        console.log(`create task ${task.number}, type: ${task.type}, room: ${roomLink(task.pos.roomName)}`);
    })
    settings.writePerformanceLog ? performance.newLog(cpu, 'restoreTasks') : false
}
taskTools.checkTasksHarvestDeposits = function () {
    if (!settings.tasks.readyToCreateDepositTasks) { return }
    const cpu = settings.writePerformanceLog ? Game.cpu.getUsed() : 0
    const corridors = []; cache.map.corridors.forEach(name => { if (myRooms[name]) { corridors.push(myRooms[name]) } })
    console.log(`checkTasksHarvestDeposits`);
    const roomsWithDeposit = corridors.filter(myRoom => myRoom.deposits)
    roomsWithDeposit.forEach(myRoom => {
        Object.keys(myRoom.deposits).forEach(id => {
            if (!myRoom.deposits[id].lastCooldown || myRoom.deposits[id].lastCooldown <= settings.tasks.minimumCooldownToCreateTaskHarvestDeposit) { taskTools.createDepositTask(id, myRoom.deposits[id].pos) }
        })
    })
    if (Game.cpu.bucket < settings.bucket.harvestPower || !settings.tasks.harvestPower) { settings.tasks.readyToCreateDepositTasks = false; return }
    const roomsWithPowerBanks = corridors.filter(myRoom => myRoom.powerBanks)
    roomsWithPowerBanks.forEach(myRoom => {
        Object.keys(myRoom.powerBanks).forEach(id => {
            if (myRoom.powerBanks[id].ticksToDecay > 3000 && myRoom.powerBanks[id].hits > 1000000 && _.filter(tasks, t => t.type == 'harvest power' && _.filter(Memory.creeps, c => c.task == t.number).length > 0).length < 4) { taskTools.createHarvestPowerTask(id, myRoom.powerBanks[id].pos, myRoom.powerBanks[id].ticksToDecay) }
        })
    })

    settings.tasks.readyToCreateDepositTasks = false
    settings.writePerformanceLog ? performance.newLog(cpu, 'taskTools.checkTasksHarvestDeposits') : false
}
taskTools.createDepositTask = function (id, pos) {
    //const ignoreRooms = ['W40S7', 'W40S8', 'W40S9', 'W40S10', 'W40S11', 'W40S12', 'W40S13', 'W36S10', 'W37S10', 'W38S10', 'W38S10', 'W39S10', 'W41S10', 'W42S10', 'W43S10', 'W44S10', 'W45S10']
    // if (!_.find(tasks, task => task.id == id) && !ignoreRooms.includes(pos.roomName)) {
    if (!_.find(tasks, task => task.id == id)) {
        taskTools.create('harvest deposit', pos, { id: id })
    }
}
taskTools.createHarvestPowerTask = function (id, pos, ticksToDecay) {
    // const ignoreRooms1 = ['E45S60', 'E46S60', 'E47S60', 'E48S60', 'E49S60', 'E50S60']
    // const ignoreRooms2 = ['E23S30', 'E24S30', 'E25S30', 'E26S30', 'E27S30', 'E28S30', 'E29S30', 'E30S30', 'E31S30', 'E32S30', 'E33S30', 'E34S30', 'E35S30'] //6g3y
    // const ignoreRooms3 = ['E30S20', 'E30S21', 'E30S22', 'E30S23', 'E30S24', 'E30S25', 'E30S26', 'E30S27', 'E30S28', 'E30S29', 'E30S31', 'E30S32', 'E30S33', 'E30S34'] //6g3y
    // const ignoreRooms4 = ['E24S20', 'E25S20', 'E26S20', 'E27S20', 'E28S20', 'E29S20', 'E31S20', 'E32S20', 'E33S20', 'E34S20'] //6g3y

    // const ignoreRooms = [].concat(ignoreRooms1, ignoreRooms2, ignoreRooms3, ignoreRooms4)
    // if (!_.find(tasks, task => task.id == id) && !ignoreRooms.includes(pos.roomName)) {
    if (!_.find(tasks, task => task.id == id)) {
        taskTools.create('harvest power', pos, { id: id, power: myRooms[pos.roomName].powerBanks[id].power, hits: myRooms[pos.roomName].powerBanks[id].hits, ticksToDecay: (gameTime + ticksToDecay), powerCounter: 0 })
    }
}
Task.prototype.action = function () {
    const cpu = settings.writePerformanceLog ? Game.cpu.getUsed() : 0
    const task = this

    const pos = new RoomPosition(this.pos.x, this.pos.y, this.pos.roomName)

    if (task.type == 'defend from invaders') {
        const defenders = _.filter(Game.creeps, creep => !creep.spawning && creep.memory.task == task.number && creep.memory.role == 'defender')
        const enemiesId = _.filter(cache.enemies, enemy => enemy.pos.roomName == this.pos.roomName).map(enemy => enemy.id)
        const enemies = idToObj(enemiesId)

        defenders.forEach(creep => {
            if (creep.getBoosted()) { return }
            if (creep.room.name == this.pos.roomName) {
                const target = creep.pos.findClosestByPath(enemies)
                if (target) { if (creep.attack(target) == ERR_NOT_IN_RANGE) { creep.moveTo(target) } }
            }
            else { creep.travelTo(pos) }
        })
    }

    if (task.type == 'reserve') {
        const room = Game.rooms[this.roomName]
        if (room && room.controller.owner && room.controller.owner.username == settings.username) { task.delete('cant reserve becouse room is my'); return }
        //update reservedTime
        if (room) { if (room.controller.reservation) { this.reservedTime = gameTime + room.controller.reservation.ticksToEnd } else { this.reservedTime = gameTime } }
        //observer
        const observer = _.find(Game.creeps, creep => creep.memory.task == this.number && creep.memory.role == 'observer')
        if (observer) {
            if (observer.pos.roomName !== this.roomName) { observer.travelTo(pos) }
            else { if (!observer.pos.inRangeTo(pos)) { observer.travelTo(pos) } }
        }
        //claim
        const claim = _.find(Game.creeps, creep => creep.memory.task == task.number && creep.memory.role == 'claim')
        if (claim) {
            if (claim.memory.done) { claim.suicide(); return }
            if (claim.getBoosted()) { return }
            if (!room) { claim.travelTo(pos) }
            else {
                const controller = room.controller
                if (task.heal) { claim.heal(claim) }
                if (claim.pos.roomName == this.roomName) {
                    if (controller.reservation) {
                        if (controller.reservation.username == settings.username) { if (claim.reserveController(controller) == ERR_NOT_IN_RANGE) { claim.travelTo(controller) } }
                        else { if (claim.attackController(controller) == ERR_NOT_IN_RANGE) { claim.travelTo(controller) } }
                    }
                    else if (controller.owner) {
                        if (controller.owner !== settings.username) {
                            const res = claim.attackController(controller)
                            switch (res) {
                                case OK: claim.memory.done = true; break
                                case ERR_NOT_IN_RANGE: claim.travelTo(controller, { ignoreRoads: true }); break;
                            }
                        }
                        else { task.delete(`room ${task.pos.roomName} is my now`) }
                    }
                    else { if (claim.reserveController(controller) == ERR_NOT_IN_RANGE) { claim.travelTo(controller) } }
                }
                else { claim.travelTo(pos) }
            }
        }
    }
    if (task.type == 'claim') {
        const room = Game.rooms[pos.roomName]
        if (room) {
            if (room.controller.my) { this.delete('room under control'); return }
            if (room.controller.upgradeBlocked) { this.upgradeBlocked = gameTime + room.controller.upgradeBlocked }
            else { this.upgradeBlocked = 0 }
            if (!room.controller.owner) { task.minimumBody = true }
        }
        task.creeps.filter(c => !c.memory.moveByPathList_done).forEach(creep => {
            if (creep.getBoosted()) { return }
            else if (creep.moveByPathList()) { return }
        })
        const observer = _.find(Game.creeps, creep => creep.memory.task == this.number && creep.memory.role == 'observer')
        if (observer) {
            if (observer.pos.roomName !== this.roomName) { observer.travelTo(pos, { allowSK: true }) }
            else { if (observer.pos.getRangeTo(pos)) { observer.travelTo(pos, { allowSK: true }) } else if (!task.distanceUpdatedByCreep) { task.distanceUpdatedByCreep = true; task.distance = 1500 - observer.ticksToLive } }
        }
        const claimCreeps = _.filter(Game.creeps, creep => creep.memory.task == task.number && creep.memory.role == 'claim' && creep.memory.moveByPathList_done)
        claimCreeps.forEach(claim => {
            if (claim.room.controller && claim.pos.inRangeTo(claim.room.controller, 1)) { claim.memory.isStuck = false }
            if (claim.memory.done) {
                if (claim.room.controller) {
                    if (!claim.room.controller.owner) {
                        if (Game.gcl.level == cache.countOfMyRooms) task.roles.claim.amount = 0
                        const res = claim.claimController(claim.room.controller)
                        switch (res) {
                            case OK: claim.memory.done = true; delete myRooms[this.roomName]; break
                            case ERR_NOT_IN_RANGE: claim.travelTo(claim.room.controller, { allowSK: true }); break;
                        }
                    } else { claim.suicide(); return }
                }
                else { claim.suicide(); return }
            }
            claim.heal(claim)
            if (claim.getBoosted()) { return }
            if (claim.pos.roomName == pos.roomName) {
                if (claim.room.controller) {
                    if (claim.pos.getRangeTo(claim.room.controller) > 1) { claim.travelTo(claim.room.controller) }
                    else {
                        if (!task.distanceUpdatedByCreep) { task.distanceUpdatedByCreep = true; task.distance = 600 - claim.ticksToLive }
                        if (!claim.room.controller.upgradeBlocked) {
                            claim.cancelOrder('heal')

                            if (claim.room.controller.owner) {
                                if (claim.attackController(claim.room.controller) == OK) { claim.memory.done = true }
                            }
                            else if (claim.claimController(claim.room.controller) == OK) { claim.memory.done = true; delete myRooms[this.roomName] }
                        }
                        if (claim.room.controller.reservation && claim.room.controller.reservation.username !== settings.username) { claim.attackController(claim.room.controller) }
                    }
                }
                else { if (claim.pos.getRangeTo(pos)) { claim.travelTo(pos) } }
            }
            else { claim.travelTo(pos, { allowSK: true }) }
        })
    }
    settings.writePerformanceLog ? performance.newLog(cpu, 'tasks - other', task.number) : false
}
Task.prototype.suicide = function () { this.creeps.forEach(c => c.suicide()) }

Task.prototype._transfer = function () {
    const task = this, pos = new RoomPosition(this.pos.x, this.pos.y, this.pos.roomName)
    const resourceType = task.resourceType
    if (task.transferCounter === undefined) { task.transferCounter = 0 }
    const transferList = _.filter(Game.creeps, creep => !creep.spawning && creep.memory.task == task.number && creep.memory.role == 'transfer')
    const transferObj = _obj(task.transfer), withdrawObj = _obj(task.withdraw)
    if (Game.rooms[pos.roomName] && ((!transferObj && !this.drop) || !withdrawObj)) { task.roles.transfer.amount = 0; if (!task.creeps.filter(c => c.store.getUsedCapacity()).length) return }
    //set status     
    transferList.forEach(creep => {
        if (creep.getBoosted()) { return }
        // if (creep.hits < creep.hitsMax) { creep.travelTo(myRooms[creep.memory.spawnRoom].room.controller); return }
        if (!creep.store.getFreeCapacity()) { creep.memory.status = 'transfer' }
        else if (!creep.store.getUsedCapacity()) {
            if (this.drop) { if (creep.room.name == pos.roomName && creep.ticksToLive < task.distance * 2) { creep.goToDie(); return } }
            if (transferObj) { if (creep.room.name == transferObj.room.name && creep.ticksToLive < task.distance * 2) { creep.goToDie(); return } }
            if (withdrawObj) { if (creep.room.name == withdrawObj.room.name && creep.ticksToLive < task.distance) { creep.goToDie(); return } }
            creep.memory.status = 'withdraw'
        }

        if (creep.memory.status == 'withdraw') {
            if (withdrawObj && task.pickup) {
                creep._pickup(withdrawObj)
            }
            else if (withdrawObj) {
                if (resourceType) {
                    if (withdrawObj.store[resourceType]) { creep._withdraw(withdrawObj, resourceType) }
                    else {
                        if (!task.ignoreEmptyStore) task.roles.transfer.amount = 0;
                        if (creep.store.getUsedCapacity()) { creep.memory.status = 'transfer' }
                    }
                }
                else {
                    if (withdrawObj.store.getUsedCapacity()) {
                        if (task.notEnergy) {
                            if (withdrawObj.store.getUsedCapacity() - withdrawObj.store.getUsedCapacity(RESOURCE_ENERGY) == 0) { task.roles.transfer.amount = 0; return }
                            const resources = Object.keys(withdrawObj.store).filter(r => r !== 'energy')
                            if (resources.length) {
                                resources.sort((a, b) => withdrawObj.store[a] - withdrawObj.store[b])
                                creep._withdraw(withdrawObj, resources[0])
                            }
                            else { return }
                        }
                        else { creep._withdraw(withdrawObj, Object.keys(withdrawObj.store).sort((a, b) => withdrawObj.store[b] - withdrawObj.store[a])[0]) }
                    }
                    else { task.roles.transfer.amount = 0 }
                }
            }
            else {
                if (Game.rooms[pos.roomName]) { creep.goToDie(); task.roles.transfer.amount = 0; return }
                if (creep.room.name !== pos.roomName) { creep.travelTo(pos) }
            }
        }
        if (creep.memory.status == 'transfer') {
            if (this.drop) {
                if (!tools.comparePositions(creep.pos, pos)) { creep.travelTo(pos); return }
                else { creep.drop(Object.keys(creep.store)[0]); return }
            }
            if (transferObj) {
                const resultTansfer = creep.transfer(transferObj, Object.keys(creep.store)[0])
                if (resultTansfer == ERR_NOT_IN_RANGE) { creep.travelTo(transferObj) }
                if (resultTansfer == OK) { task.transferCounter += creep.store.getUsedCapacity(resourceType) }
            }
            else {
                if (Game.rooms[pos.roomName]) { creep.goToDie(); task.roles.transfer.amount = 0; return }
                if (creep.room.name !== pos.roomName) { creep.travelTo(pos) }
            }
        }
    })
}
Task.prototype.harvestPower = function () {
    const task = this, pos = new RoomPosition(this.pos.x, this.pos.y, this.pos.roomName)
    if (!task.creeps.length && (gameTime + 1500) > task.ticksToDecay) { this.delete(`task.creeps.length && (gameTime + 1500 )> task.ticksToDecay`) }
    task.inWork = false
    const room = Game.rooms[task.pos.roomName]
    const powerBank = _obj(task.id)
    const transferPower = task.creeps.filter(creep => creep.memory.role == 'transferPower')
    const destroyPower = task.creeps.find(creep => creep.memory.role == 'destroyPower')
    const healPower = task.creeps.find(creep => creep.memory.role == 'healPower')
    let ruin = _obj(task.ruinId)
    let droppedPower = _obj(task.powerId)
    if (room) {
        if (!powerBank) {
            if (!task.creeps.length) { task.delete('power bank dont exist, and no one creeps'); return } else { task.done = true }
            if (!task.ruinId) {
                const ruins = pos.findInRange(FIND_RUINS, 0)
                if (ruins.length) { task.ruinId = ruins[0].id; ruin = ruins[0] }
            }

            if (!task.powerId) {
                const dropRes = pos.findInRange(FIND_DROPPED_RESOURCES, 0)
                if (dropRes.length) { task.powerId = dropRes[0].id; droppedPower = dropRes[0] }
            }
        }
        if (powerBank) { task.hits = powerBank.hits } else { task.hits = '' }
    }

    if (task.done) {
        if (!_.filter(transferPower, c => c.store.getUsedCapacity()).length && !ruin && !droppedPower) { task.creeps.forEach(c => c.suicide()); task.delete('task done') }
    }

    if (destroyPower) {
        task.roles['destroyPower'].amount = 0
        if (task.done && !ruin && !droppedPower) { destroyPower.suicide() }
        else if (!destroyPower.getBoosted()) {
            if (healPower) {
                if (destroyPower.pull(healPower) == OK || destroyPower.pos.x == 0 || destroyPower.pos.x == 49 || destroyPower.pos.y == 0 || destroyPower.pos.y == 49) {
                    if (destroyPower.pos.roomName !== task.roomName) { destroyPower.travelTo(pos) }
                    else {
                        if (powerBank) {
                            if (!destroyPower.pos.inRangeTo(powerBank, 1)) { destroyPower.travelTo(pos) }
                            else {
                                healPower.heal(destroyPower)
                                const enemies = idToObj(_.filter(cache.enemies, e => e.pos.roomName == destroyPower.pos.roomName && e.parameters && e.parameters.attack && e.owner == 'Monero!!!!'))
                                let attackEnemy
                                for (const enemy of enemies) {
                                    if (attackEnemy) { break }
                                    if (enemy.pos.inRangeTo(destroyPower, 3)) {
                                        attackEnemy = true
                                        const res = destroyPower.attack(enemy)
                                        if (res == ERR_NOT_IN_RANGE) { destroyPower.travelTo(enemy) }
                                    }
                                }
                                if (destroyPower.hits == destroyPower.hitsMax && !attackEnemy) {
                                    if (powerBank.hits > 10000 || powerBank.ticksToDecay < 10) {
                                        const res1 = destroyPower.attack(powerBank);
                                        if (res1 == OK) { task.inWork = true }
                                    }
                                    else {
                                        task.inWork = true
                                        if ((destroyPower.ticksToLive < 10 || healPower.ticksToLive < 10) || (transferPower.length == task.roles.transferPower.amount && !transferPower.find(creep => creep.pos.roomName !== task.pos.roomName))) {
                                            destroyPower.attack(powerBank)
                                        }
                                    }
                                }
                            }
                        }
                        else { task.roles['destroyPower'].amount = 0; task.roles['healPower'].amount = 0 }
                    }
                }
            }
        }
    }

    if (healPower) {
        task.roles['healPower'].amount = 0
        if (task.done && !ruin && !droppedPower) { healPower.suicide() }
        else if (!healPower.getBoosted()) {
            if (destroyPower) {
                if (healPower.pos.inRangeTo(destroyPower, 1)) {
                    healPower.move(destroyPower)
                    if (healPower.pos.roomName == task.roomName || _.filter(cache.enemies, e => e.pos.roomName == healPower.pos.roomName).length) {
                        const res = healPower.heal(destroyPower)
                        if (res == OK && !(ruin || droppedPower)) { healPower.memory.isStuck = false }
                    }
                }
                else { healPower.travelTo(destroyPower) }
            }
        }
    }

    transferPower.forEach(creep => {
        if (!creep.store.getUsedCapacity(RESOURCE_POWER)) {
            if (task.done && !ruin && !droppedPower) { creep.goToDie(); return }
            if (creep.room.name !== task.pos.roomName) { creep.travelTo(pos) }
            else {
                if (ruin) { creep._withdraw(ruin, RESOURCE_POWER) }
                else if (droppedPower) {
                    if (creep.pickup(droppedPower) == ERR_NOT_IN_RANGE) { creep.travelTo(droppedPower) }
                }
                else { if (!creep.pos.inRangeTo(pos, 2)) { creep.travelTo(pos, { range: 2 }) } }
            }
        }
        else {
            let transferObj
            if (myRooms[creep.memory.spawnRoom]) { if (myRooms[creep.memory.spawnRoom].terminal) { if (myRooms[creep.memory.spawnRoom].terminal.store.getFreeCapacity()) { transferObj = myRooms[creep.memory.spawnRoom].terminal } } }
            if (!transferObj) { transferObj = myRooms[creep.memory.spawnRoom].storage }
            if (creep._transfer(transferObj)) {
                if (!task.powerCounter) { task.powerCounter = 0 }
                task.powerCounter += creep.store.getUsedCapacity('power')
            }
        }
    })
}
Task.prototype.observer = function () {
    const task = this, pos = new RoomPosition(this.pos.x, this.pos.y, this.pos.roomName)
    task.creeps.forEach(creep => {
        if (creep.moveByPathList()) { return }
        if (creep.pos.roomName !== pos.roomName || !task.destroyConstructionSites) {
            creep.travelTo(pos, { obstacles: tools.getObstacles() }); return
        }
        if (task.destroyConstructionSites) {
            let constructionSite
            if (creep.memory.constructionSite) { constructionSite = _obj(creep.memory.constructionSite) }
            if (!constructionSite) {
                delete creep.memory.constructionSite
                constructionSite = pos.findClosestByPath(FIND_CONSTRUCTION_SITES, { filter: str => str.progress > 0 || str.structureType == 'constructedWall' })
            }
            if (constructionSite) { creep.moveTo(constructionSite); creep.memory.constructionSite = constructionSite.id }
            else {
                if (creep.pos.x !== pos.x || creep.pos.y !== pos.y) { creep.moveTo(pos) }
            }
        }
    })
}
Task.prototype.punchingBag = function () {
    const task = this, pos = new RoomPosition(this.pos.x, this.pos.y, this.pos.roomName)
    task.creeps.filter(c => c.pos.roomName !== pos.roomName).forEach(creep => {
        if (creep.getBoosted()) { return }
        else if (creep.moveByPathList()) { return }
    })
    task.creeps.filter(c => c.pos.roomName == pos.roomName).forEach(creep => {
        creep.notifyWhenAttacked(false)
        creep.travelTo(pos, { obstacles: tools.getObstacles() })
        creep.heal(creep)
        if (gameTime % 2 == 0 && task.text1) { creep.say(task.text1, true) }
        else if (task.text2) { creep.say(task.text2, true) }
    })
}
Task.prototype.harvestDeposit = function () {
    const task = this, pos = new RoomPosition(this.pos.x, this.pos.y, this.pos.roomName)

    //update lastCooldown
    if (myRooms[pos.roomName]) { if (myRooms[pos.roomName].deposits) { if (myRooms[pos.roomName].deposits[task.id]) { task.lastCooldown = myRooms[pos.roomName].deposits[task.id].lastCooldown } } }

    task.creeps.forEach(creep => {
        if (creep.getBoosted()) { return }
        if (!creep.store.getUsedCapacity() && Game.cpu.bucket < 100) { return }
        if (!creep.store.getUsedCapacity() && (!creep.memory.status || creep.memory.status == 'transfer')) { if (creep.ticksToLive > task.distance * 2 + task.lastCooldown) { creep.memory.status = 'harvest' } else { creep.goToDie(); return } }
        if (creep.memory.status == 'transfer') { transfer(creep); return }
        else {
            if (creep.ticksToLive == 1) { task.tombstones.push(creep.pos); task.creepsCounter++; return }
            const deposit = _obj(task.id)
            let lastCooldown = 0
            if (deposit) { lastCooldown = deposit.cooldown }
            if (!creep.store.getFreeCapacity()) {
                if (!task.distanceUpdatedByCreep) { if (!creep.memory.startTransferTime) { creep.memory.startTransferTime = gameTime } }
                creep.memory.status = 'transfer'; transfer(creep); return
            }
            if (creep.ticksToLive < (task.distance * 1.1) + lastCooldown) {
                if (!task.distanceUpdatedByCreep) { if (!creep.memory.startTransferTime) { creep.memory.startTransferTime = gameTime } }
                creep.memory.status = 'transfer'; transfer(creep); return
            }
            if (creep.room.name !== pos.roomName) {
                // if(task.tombstones.length){
                //     const tombstonePos = task.tombstones.find(t=>t.roomName == creep.room.name)
                //     if(tombstonePos){
                //         const tombstones = creep.room.find(FIND_TOMBSTONES)
                //         if(tombstones.length){
                //             const tombstone = creep.pos.findClosestByPath(tombstones)
                //             if(tombstone){
                //                 if(creep.pos.inRangeTo(tombstone),1){}
                //                 creep.travelTo
                //             }
                //         }
                //         creep.travelTo()
                //     }
                // }
                creep.travelTo(pos); return
            }
            else {
                if (deposit) {
                    const result = creep.harvest(deposit)
                    if (result == ERR_NOT_IN_RANGE) {
                        if (creep.pos.roomName == deposit.pos.roomName) {
                            if (creep.pos.getRangeTo(deposit) == 2) {
                                const enemiesId = _.filter(cache.enemies, e => e.pos.roomName == creep.pos.roomName).map(e => e.id)
                                if (enemiesId.length) {
                                    const enemiesArray = idToObj(enemiesId)
                                    if (enemiesArray.length < myRooms[deposit.room.name].deposits[deposit.id].accessibleFields) { creep.travelTo(deposit, { obstacles: tools.getObstacles() }) }
                                    else {
                                        let enemiesCounterAroundDeposit = 0
                                        enemiesArray.forEach(enemy => { if (enemy.pos.inRangeTo(deposit, 1)) { enemiesCounterAroundDeposit++ } })
                                        if (enemiesCounterAroundDeposit < myRooms[deposit.room.name].deposits[deposit.id].accessibleFields) { creep.moveTo(deposit) }
                                    }
                                }
                                else { creep.travelTo(deposit, { obstacles: tools.getObstacles() }) }
                            }
                            else { creep.travelTo(deposit, { obstacles: tools.getObstacles() }) }
                        }
                        else { creep.travelTo(deposit, { obstacles: tools.getObstacles() }) }

                    }
                    else if (result == ERR_TIRED) {
                        if (creep.pos.inRangeTo(task.pos), 1) { creep.memory.isStuck = false } else { creep.travelTo(pos) }
                    }
                    else if (result == OK) { creep.memory.isStuck = false }
                }
                else { task.delete('creep come to deposit, but dont exist') }
            }
        }
        function transfer(creep) {
            if (creep.memory.debug) { console.log(creep.name, 'status: transfer') }
            let transferObj
            if (creep.ticksToLive == 1) {
                task.tombstones.push(creep.pos)
                task.creepsCounter++
                info.new(1, 'deposit', creep.pos.roomName, creep.id, `${creep.name} die before transfer, task: ${creep.memory.task}`)
                creep.suicide(); return
            }
            if (myRooms[creep.memory.spawnRoom].structures.factory && settings.tasks.transferDepositToFactory) {
                const factory = _obj(myRooms[creep.memory.spawnRoom].structures.factory)
                if (factory) { if (!factory.level && factory.store.getFreeCapacity()) { transferObj = factory } }
            }
            if (!transferObj) {
                if (!myRooms[creep.memory.spawnRoom].terminal || !myRooms[creep.memory.spawnRoom].storage) {
                    if (creep.memory.debug) { console.log(creep.name, `!myRooms[creep.memory.spawnRoom].terminal || myRooms[creep.memory.spawnRoom].storage`) }
                    return
                }
                if (myRooms[creep.memory.spawnRoom].terminal.store.getFreeCapacity()) { transferObj = myRooms[creep.memory.spawnRoom].terminal }
                else if (myRooms[creep.memory.spawnRoom].storage.store.getFreeCapacity()) { transferObj = myRooms[creep.memory.spawnRoom].terminal }
            }

            const result = creep.transfer(transferObj, Object.keys(creep.store)[0])
            if (creep.memory.debug) { console.log(creep.name, 'result transfer:', result) }
            if (result == OK) {
                const amount = creep.store.getUsedCapacity(Object.keys(creep.store)[0])
                if (!creep.room.memory.counter_deposit) { creep.room.memory.counter_deposit = amount } else { creep.room.memory.counter_deposit += amount }
                task.transferCounter += amount
                // info.new(1, 'deposit', creep.pos.roomName, creep.id, `task:${task.number}, transferCounter:${task.transferCounter}, store:${amount}`)

                if (creep.memory.startTransferTime && !task.distanceUpdatedByCreep) {
                    const distance = gameTime - creep.memory.startTransferTime; delete creep.memory.startTransferTime
                    const maxCooldown = tools.calculateHarvestDepositLastCooldown(distance, task.lastCooldown)
                    console.log(`task:${task.number} updated distance from ${task.distance} to ${distance}, maxCooldown: ${task.maxCooldown} to ${maxCooldown}`)
                    task.distance = distance; task.maxCooldown = maxCooldown
                    task.distanceUpdatedByCreep = true
                }
                task.backup()
            }
            else if (result == ERR_NOT_IN_RANGE) { creep.travelTo(transferObj) }
        }
    })
}
Task.prototype.buildBase = function () {
    const cpu = settings.writePerformanceLog ? Game.cpu.getUsed() : 0
    const rape = false, rapePos = new RoomPosition(12, 25, 'E44S42')
    const task = this, pos = new RoomPosition(this.pos.x, this.pos.y, this.pos.roomName)
    const myRoom = myRooms[pos.roomName]; if (!myRoom || !myRoom.my) { return }
    let towers = []
    if (myRoom.zeroManagers()) { towers = idToObj(myRoom.structures.towers).filter(t => t.store.getFreeCapacity(RESOURCE_ENERGY) >= 500) }

    //update task status
    if (towers.length) { task.status = 'fill towers' }
    else if (taskUpdateBuildObject(task)) { task.status = 'build' }
    else { task.status = 'upgrade'; delete task.buildObject }

    task.creeps.forEach(creep => {
        if (creep.getBoosted()) { return }
        else if (Game.cpu.bucket < 100) { return }
        else if (creep.moveByPathList()) { return }

        if (!creep.store.getUsedCapacity(RESOURCE_ENERGY)) { creep.memory.status = 'withdraw' }
        else if (!creep.memory.status || creep.memory.status !== 'withdraw') { creep.memory.status = task.status; delete creep.memory.source }
        else if (creep.memory.status == 'withdraw' && !creep.store.getFreeCapacity(RESOURCE_ENERGY)) { creep.memory.status = task.status; delete creep.memory.rape }


        if (creep.memory.debug) { console.log(creep, `status1:${creep.memory.status}`) }
        if (creep.memory.status == 'withdraw') {
            if (creep.memory.dismantle) {
                if (updateSources(task).length) { creep.resetStatus(); return }
                const wall = _obj(creep.memory.dismantleId)
                if (wall) {
                    const res = creep.dismantle(wall)
                    if (res == ERR_NOT_IN_RANGE) { creep.travelTo(wall) }
                    if (res == OK) { creep.memory.isStuck = false }
                }
                else { creep.resetStatus() }
                return
            }
            else if (creep.memory.rape) {
                if (creep.store.getUsedCapacity()) { creep.memory.rape = false; creep.memory.status = '' }
                else {

                    if (creep.room.name !== rapePos.roomName) { creep.travelTo(rapePos) }
                    else {
                        const hostileStorage = creep.room.find(FIND_HOSTILE_STRUCTURES, { filter: str => str.structureType == STRUCTURE_STORAGE })
                        if (hostileStorage.length) { creep._withdraw(hostileStorage[0]) }
                    }
                }
                return
            }
            else if (creep.memory.droppedEnergy) { getDroppedEnergy(creep, task); return }
            else if (creep.memory.source) { harvest(creep); return }
            else if (creep.pos.roomName == creep.memory.spawnRoom) {
                if (creep.ticksToLive > task.distance) {
                    const spawnRoom = myRooms[creep.memory.spawnRoom]
                    if (spawnRoom.terminal && spawnRoom.terminal.store.energy > spawnRoom.storage.store.energy) { creep._withdraw(spawnRoom.terminal) }
                    else { creep._withdraw(myRooms[creep.memory.spawnRoom].storage) }
                }
                else { creep.goToDie(); return }
            }
            else if (creep.pos.roomName == task.pos.roomName) {
                const droppedEnergy = updateDroppedResources(task)
                if (droppedEnergy.length) {
                    const target = creep.pos.findClosestByPath(droppedEnergy, { ingoreCreeps: true, maxOps: 300 })
                    if (target) { creep.memory.droppedEnergy = target.id; getDroppedEnergy(creep, task); return }
                }
                if (!task.ignoreSources) {
                    const sources = updateSources(task)
                    if (sources.length) {
                        const source = creep.pos.findClosestByPath(sources, { ingoreCreeps: true })
                        if (source) { creep.memory.source = source.id; harvest(creep); return }
                    }
                }
                if (task.dismantleWalls) {
                    const walls = creep.room.find(FIND_STRUCTURES, { filter: str => str.structureType == STRUCTURE_WALL })
                    if (walls.length) {
                        const wall = creep.pos.findClosestByPath(walls)
                        if (wall) { creep.memory.dismantle = true; creep.memory.dismantleId = wall.id }
                    }
                }
                if (creep.room.terminal) { if (creep.room.terminal.store.getUsedCapacity(RESOURCE_ENERGY) > 5000) { creep._withdraw(creep.room.terminal); return } }
                if (creep.room.storage) { if (creep.room.storage.store.getUsedCapacity(RESOURCE_ENERGY) > 10000) { creep._withdraw(creep.room.storage); return } }
                if (creep.ticksToLive > task.distance * 2) { creep._withdraw(myRooms[creep.memory.spawnRoom].storage) }
            }
            // else { if (creep.ticksToLive > 250 && rape) { creep.memory.rape = true } }
            // if (creep.room.name == creep.memory.spawnRoom) { creep._withdraw(myRooms[creep.memory.spawnRoom].storage); return }            
            else { creep._withdraw(myRooms[creep.memory.spawnRoom].storage); return }
        }
        else if (creep.memory.status == 'build' && creep.pos.roomName == pos.roomName) { build(creep, task) }
        else if (creep.memory.status == 'upgrade' && creep.pos.roomName == pos.roomName) {
            if (Game.rooms[pos.roomName]) {
                const controller = Game.rooms[pos.roomName].controller
                if (controller) {
                    if (creep.upgradeController(controller) == ERR_NOT_IN_RANGE) { creep.travelTo(controller, { range: 3, allowSK: true }) }
                }
                else { creep.travelTo(pos, { obstacles: tools.getObstacles(), allowSK: true }) }
            }
            else { creep.travelTo(pos, { obstacles: tools.getObstacles(), allowSK: true }) }
        }
        else if (creep.memory.status == 'upgrade' && creep.pos.roomName !== pos.roomName) {
            creep.travelTo(pos, { obstacles: tools.getObstacles(), allowSK: true })
        }
        else if (creep.memory.status == 'fill towers') {
            if (creep.memory.tower) {
                const tower = _obj(creep.memory.tower)
                if (tower) {
                    if (tower.store.getFreeCapacity(RESOURCE_ENERGY)) { creep._transfer(tower) }
                    else { creep.resetStatus() }
                } else { creep.resetStatus() }
            }
            else {
                let chooseTower
                if (towers.length == 1) { creep.memory.tower = towers[0].id }
                else {
                    chooseTower = creep.pos.findClosestByPath(towers)
                    if (chooseTower) { creep.memory.tower = chooseTower.id; creep._transfer(chooseTower) }
                }
            }
        }
        else {
            console.log(creep, 'hererere')
            creep.travelTo(pos, { obstacles: tools.getObstacles(), allowSK: true })
        }

    })
    function build(creep, task) {
        const buildObject = _obj(task.buildObject)
        if (buildObject) { if (creep.build(buildObject) == ERR_NOT_IN_RANGE) { creep.travelTo(buildObject, { range: 3 }) } }
        else { creep.resetStatus() }

    }
    function taskUpdateBuildObject(task) {
        const myRoom = myRooms[task.roomName]
        if (!myRoom) { return }
        if (!myRoom.my) { return }
        if (task.buildObject) {
            if (_obj(task.buildObject)) { return true }
            else { myRoom.updateStructures()}
        }
        if (myRoom.constructionSites.length) {
            const buildObject = myRoom.room.controller.pos.findClosestByPath(idToObj(myRoom.constructionSites), { ingoreCreeps: true })
            if (buildObject) {
                myRoom.constructionSites.cut(task.buildObject)
                task.buildObject = buildObject.id; return true
            }
            else { task.buildObject = myRoom.constructionSites[0]; return true }
        } else { return false }
    }
    function getDroppedEnergy(creep, task) {
        const drop = _obj(creep.memory.droppedEnergy)
        if (!drop) { creep.resetStatus(); return }
        const res = creep.pickup(drop)
        if (res == OK) { creep.memory.status = task.status; return }
        if (res == ERR_NOT_IN_RANGE) { creep.travelTo(drop) }
    }
    function harvest(creep) {
        const source = _obj(creep.memory.source)
        let energyAtStore = creep.store.getFreeCapacity('energy') < source.energy ? creep.store.getFreeCapacity('energy') : source.energy

        if (energyAtStore > 0) {
            const myRoom = myRooms[creep.room.name]
            if (!myRoom) { return }
            const distance = myRoom.getDistanceByPath(creep, myRoom.room.controller, true)
            const time = Math.ceil(energyAtStore / (creep.body.filter(b => b.type == WORK).length * 2))
            if (creep.memory.debug) { console.log(`distance + time: ${distance + time}`, creep.ticksToLive, `distance:${distance}, time:${time}`, `energyAtStore:${energyAtStore}`) }
            if ((distance + time) * 1.1 >= creep.ticksToLive) { creep.resetStatus(); return }
        }

        if (source.energy > 0) {
            const res = creep.harvest(_obj(creep.memory.source))
            if (res == OK) { creep.memory.isStuck = false }
            if (res == ERR_NOT_IN_RANGE) { creep.travelTo(source) }
        }
        else { creep.resetStatus() }
    }
    function updateSources(task) {
        //if (task.cache.updateSources) { return task.cache.updateSources }
        const myRoom = myRooms[task.roomName]
        const usedSources = task.creeps.filter(c => c.memory.source).map(c => c.memory.source)
        const sources = idToObj(_.map(myRoom.tasks.harvestSource, source => source.id).filter(id => !usedSources.includes(id)))
        // task.cache.updateSources = sources.filter(s => s.energy > 0)
        task.cache.updateSources = sources.filter(s => s.energy > 0 && (myRoom.level < 4 || !_.filter(myRoom.creeps, creep => creep.body.length > 10 && creep.memory.role == 'harvest source' && creep.memory.id == s.id).length))
        return task.cache.updateSources
    }
    function updateDroppedResources(task, creeps) {
        if (task.cache.updateDroppedResources) { return task.cache.updateDroppedResources }
        task.cache.updateDroppedResources = idToObj(myRooms[task.pos.roomName].droppedResources).filter(dr => dr.resourceType == 'energy')
        return task.cache.updateDroppedResources
    }

    settings.writePerformanceLog ? performance.newLog(cpu, 'tasks - build base', task.number) : false
}
Task.prototype.buildBase_original = function () {
    const cpu = settings.writePerformanceLog ? Game.cpu.getUsed() : 0
    const rape = false, rapePos = new RoomPosition(12, 25, 'E44S42')
    const task = this, pos = new RoomPosition(this.pos.x, this.pos.y, this.pos.roomName)
    const myRoom = myRooms[pos.roomName]
    let towers = []
    if (myRoom.zeroManagers()) { towers = idToObj(myRoom.structures.towers).filter(t => t.store.getFreeCapacity(RESOURCE_ENERGY)) }
    const baseBuilders = _.filter(Game.creeps, creep => !creep.spawning && creep.memory.task == task.number && creep.memory.role == 'build base')
    if (taskUpdateBuildObject(task, baseBuilders)) { task.status = 'build' }
    else { task.status = 'upgrade'; delete task.buildObject }

    baseBuilders.forEach(creep => {
        if (creep.getBoosted()) { return }
        if (Game.cpu.bucket < 100) { return }

        if (creep.memory.debug) { console.log(creep, `status1:${creep.memory.status}`) }
        if (!creep.memory.status) {
            if (!creep.store.getUsedCapacity(RESOURCE_ENERGY)) { creep.memory.status = 'withdraw' }
            else { creep.memory.status = task.status }
        }
        else {
            if (creep.store.getUsedCapacity(RESOURCE_ENERGY) && towers.length) { creep.memory.status = 'fill towers' }
            else if (creep.memory.status = 'fill towers' && (!creep.store.getUsedCapacity(RESOURCE_ENERGY) || !towers.length)) { creep.resetStatus(); return }
            else if ((creep.memory.status == 'build' || creep.memory.status == 'upgrade') && !creep.store.getUsedCapacity(RESOURCE_ENERGY)) { creep.memory.status = 'withdraw' }
            else if (creep.memory.status == 'withdraw' && !creep.store.getFreeCapacity(RESOURCE_ENERGY)) { creep.memory.status = task.status; delete creep.memory.rape }
        }

        if (creep.memory.debug) { console.log(creep, `status1:${creep.memory.status}`) }
        if (creep.memory.status == 'withdraw') {
            if (creep.memory.dismantle) {
                if (updateSources(task).length) { creep.resetStatus(); return }
                const wall = _obj(creep.memory.dismantleId)
                if (wall) {
                    const res = creep.dismantle(wall)
                    if (res == ERR_NOT_IN_RANGE) { creep.travelTo(wall) }
                    if (res == OK) { creep.memory.isStuck = false }
                }
                else { creep.resetStatus() }

                return
            }
            else if (creep.memory.rape) {
                if (creep.store.getUsedCapacity()) { creep.memory.rape = false; creep.memory.status = '' }
                else {

                    if (creep.room.name !== rapePos.roomName) { creep.travelTo(rapePos) }
                    else {
                        const hostileStorage = creep.room.find(FIND_HOSTILE_STRUCTURES, { filter: str => str.structureType == STRUCTURE_STORAGE })
                        if (hostileStorage.length) { creep._withdraw(hostileStorage[0]) }
                    }
                }
                return
            }
            else if (creep.memory.droppedEnergy) { getDroppedEnergy(creep, task); return }
            else if (creep.memory.source) { harvest(creep, task); return }
            else if (creep.pos.roomName == task.pos.roomName) {
                const droppedEnergy = updateDroppedResources(task)
                if (droppedEnergy.length) {
                    const target = creep.pos.findClosestByPath(droppedEnergy, { ingoreCreeps: true, maxOps: 300 })
                    if (target) { creep.memory.droppedEnergy = target.id; getDroppedEnergy(creep, task); return }
                }
                const sources = updateSources(task)
                if (!sources.length || task.ignoreSources) {
                    if (creep.room.terminal) { if (creep.room.terminal.store.getUsedCapacity(RESOURCE_ENERGY) > 5000) { creep._withdraw(creep.room.terminal); return } }
                    if (creep.room.storage) { if (creep.room.storage.store.getUsedCapacity(RESOURCE_ENERGY) > 10000) { creep._withdraw(creep.room.storage); return } }
                }

                if (sources.length && !task.ignoreSources) {
                    const source = creep.pos.findClosestByPath(sources, { ingoreCreeps: true })
                    if (source) { creep.memory.source = source.id; harvest(creep, task); return }
                }
                // const walls = creep.room.find(FIND_STRUCTURES, { filter: str => str.structureType == STRUCTURE_WALL })
                // if (walls.length) {
                //     const wall = creep.pos.findClosestByPath(walls)
                //     if (wall) { creep.memory.dismantle = true; creep.memory.dismantleId = wall.id }
                // }

                else { if (creep.ticksToLive > 250 && rape) { creep.memory.rape = true } }
            }
            else if (creep.room.name == creep.memory.spawnRoom) { creep._withdraw(myRooms[creep.memory.spawnRoom].storage) }
            else if (creep.ticksToLive > task.distance * 2) { creep._withdraw(myRooms[creep.memory.spawnRoom].storage) }
            else { if (creep.room.name !== pos.roomName) { creep.travelTo(pos, { obstacles: tools.getObstacles(), allowSK: true }) } }
        }
        else if (creep.memory.status == 'build' && creep.pos.roomName == pos.roomName) { build(creep, task) }
        else if (creep.memory.status == 'upgrade' && creep.pos.roomName == pos.roomName) {
            if (Game.rooms[task.pos.roomName]) {
                const controller = Game.rooms[pos.roomName].controller
                if (creep.upgradeController(controller) == ERR_NOT_IN_RANGE) { creep.travelTo(controller, { allowSK: true }) }
            }
            else { creep.travelTo(new RoomPosition(25, 25, pos.roomName), { obstacles: tools.getObstacles(), allowSK: true }) }
        }
        else if (creep.memory.status == 'fill towers') {
            if (creep.memory.tower) {
                const tower = _obj(creep.memory.tower)
                if (tower) {
                    if (tower.store.getFreeCapacity(RESOURCE_ENERGY)) { creep._transfer(tower) }
                    else { creep.resetStatus() }
                } else { creep.resetStatus() }
            }
            else {
                let chooseTower
                if (towers.length == 1) { creep.memory.tower = towers[0].id }
                else {
                    chooseTower = creep.pos.findClosestByPath(towers)
                    if (chooseTower) { creep.memory.tower = chooseTower.id; creep._transfer(chooseTower) }
                }
            }

        }
        else { creep.travelTo(pos, { obstacles: tools.getObstacles(), allowSK: true }) }

    })
    function build(creep, task) {
        const buildObject = _obj(task.buildObject)
        if (buildObject) { if (creep.build(buildObject) == ERR_NOT_IN_RANGE) { creep.travelTo(buildObject) } }
        else { creep.resetStatus() }

    }
    function taskUpdateBuildObject(task) {
        if (task.buildObject) { if (_obj(task.buildObject)) { return true } }
        const myRoom = myRooms[task.roomName]
        if (!myRoom) { return }
        if (!myRoom.my) { return }
        if (myRoom.constructionSites.length) {
            const buildObject = myRoom.room.controller.pos.findClosestByPath(idToObj(myRoom.constructionSites), { ingoreCreeps: true })
            if (buildObject) {
                myRoom.constructionSites.splice(myRoom.constructionSites.indexOf(task.buildObject), 1)
                task.buildObject = buildObject.id; return true
            }
            else { task.buildObject = myRoom.constructionSites[0]; return true }
        } else { return false }
    }
    function getDroppedEnergy(creep, task) {
        const drop = _obj(creep.memory.droppedEnergy)
        if (!drop) { creep.resetStatus(); return }
        const res = creep.pickup(drop)
        if (res == OK) { creep.memory.status = task.status; return }
        if (res == ERR_NOT_IN_RANGE) { creep.travelTo(drop) }
    }
    function harvest(creep, task) {
        const energyAtStore = creep.store.getUsedCapacity('energy')
        if (energyAtStore > 0) {
            const myRoom = myRooms[creep.room.name]
            if (!myRoom) { return }
            const distance = myRoom.getDistanceByPath(creep, myRoom.room.controller, true)
            const time = Math.ceil(energyAtStore / creep.body.filter(b => b == WORK).length)
            if (creep.memory.debug) { console.log(`distance + time: ${distance + time}`, creep.ticksToLive) }
            if ((distance + time) * 1.1 <= creep.ticksToLive) { creep.resetStatus(); return }
        }
        const source = _obj(creep.memory.source)
        if (source.energy > 0) {
            const res = creep.harvest(_obj(creep.memory.source))
            if (res == OK) { creep.memory.isStuck = false }
            if (res == ERR_NOT_IN_RANGE) { creep.travelTo(source) }
        }
        else { creep.resetStatus() }
    }
    function updateSources(task) {
        if (task.cache.updateSources) { return task.cache.updateSources }
        const myRoom = myRooms[task.roomName]
        const sources = idToObj(_.map(myRoom.tasks.harvestSource, source => source.id))
        // task.cache.updateSources = sources.filter(s => s.energy > 0)
        task.cache.updateSources = sources.filter(s => s.energy > 0 && (myRoom.level < 4 || !_.filter(myRoom.creeps, creep => creep.body.length > 10 && creep.memory.role == 'harvest source' && creep.memory.id == s.id).length))
        return task.cache.updateSources
    }
    function updateDroppedResources(task, creeps) {
        if (task.cache.updateDroppedResources) { return task.cache.updateDroppedResources }
        task.cache.updateDroppedResources = idToObj(myRooms[task.pos.roomName].droppedResources).filter(dr => dr.resourceType == 'energy')
        return task.cache.updateDroppedResources
    }

    settings.writePerformanceLog ? performance.newLog(cpu, 'tasks - build base', task.number) : false
}
Task.prototype.buildBaseToAlly = function () {
    const cpu = settings.writePerformanceLog ? Game.cpu.getUsed() : 0
    const task = this, pos = new RoomPosition(this.pos.x, this.pos.y, this.pos.roomName)
    if (!task.distance) { task.distance = 911 } //if distance undefined , need to calculate
    const baseBuilders = _.filter(Game.creeps, creep => !creep.spawning && creep.memory.task == task.number && creep.memory.role == 'build base')

    baseBuilders.forEach(creep => {
        if (creep.getBoosted()) { return }
        if (Game.cpu.bucket < 100) { return }

        if (creep.memory.debug) { console.log(creep, `status1:${creep.memory.status}`) }
        if (!creep.memory.status) {
            const creepHaveEnergy = creep.store.getUsedCapacity(RESOURCE_ENERGY)
            if (creepHaveEnergy) { creep.memory.status = 'build' }
            else {
                if (creep.pos.roomName == pos.roomName && creep.ticksToLive > task.distance * 2) { creep.memory.status = 'withdraw' }
                else if (creep.pos.roomName == creep.memory.spawnRoom && creep.ticksToLive > task.distance) { creep.memory.status = 'withdraw' }
                else { console.log('suicide') }
                // else { creep.suicide() }
            }

        }
        else {
            if ((creep.memory.status == 'build') && !creep.store.getUsedCapacity(RESOURCE_ENERGY)) { delete creep.memory.status }
            else if (creep.memory.status == 'withdraw' && !creep.store.getFreeCapacity(RESOURCE_ENERGY) && creep.ticksToLive > task.distance) { creep.memory.status = 'build' }
            else if (creep.pos.roomName == creep.memory.spawnRoom && creep.ticksToLive < task.distance) { creep.goToDie(); return }
        }

        if (creep.memory.debug) { console.log(creep, `status1:${creep.memory.status}`) }
        if (creep.memory.status == 'withdraw') { creep._withdraw(myRooms[creep.memory.spawnRoom].storage) }
        else if (creep.memory.status == 'build') {
            if (creep.pos.roomName == pos.roomName) { build(creep, task); if (task.distance == 911) { task.distance = 1500 - creep.ticksToLive - 30 } }
            else { creep.travelTo(pos, { obstacles: tools.getObstacles(), allowSK: true }) }
        }
    })
    function build(creep, task) {
        const buildObject = _obj(task.buildObject)
        if (buildObject) { if (creep.build(buildObject) == ERR_NOT_IN_RANGE) { creep.travelTo(buildObject) } }
        else { creep.resetStatus(); taskUpdateBuildObject(task, creep) }
    }
    function taskUpdateBuildObject(task, creep) {
        if (task.buildObject) { if (_obj(task.buildObject)) { return true } }
        delete task.buildObject;
        if (creep.pos.roomName !== pos.roomName) { return false }

        const constructionSites = creep.room.find(FIND_CONSTRUCTION_SITES)
        if (constructionSites.length) {
            const buildObject = creep.pos.findClosestByPath(constructionSites)
            if (buildObject) {
                task.buildObject = buildObject.id; return true
            }
            else { task.buildObject = constructionSites[0]; return true }
        } else { return false }
    }

    settings.writePerformanceLog ? performance.newLog(cpu, 'tasks - build base', task.number) : false
}
Task.prototype.dismantleRoom = function () {
    const task = this, pos = new RoomPosition(this.pos.x, this.pos.y, this.pos.roomName)
    const dismantleCreeps = task.creeps.filter(c => c.memory.role == 'dismantleRoom')
    task.droppedResources = task.droppedResources || []
    if (task.roles.transfer && task.roles.transfer.amount && each10) {
        if (Game.rooms[pos.roomName]) {
            task.droppedResources = Game.rooms[pos.roomName].find(FIND_DROPPED_RESOURCES).map(dr => dr.id)
        }
    }
    //dismantle
    dismantleCreeps.forEach(creep => {
        if (creep.getBoosted()) { return }
        if (this.checkForBucket(creep)) { return }
        creep.notifyWhenAttacked(false)
        if (creep.room.name == task.pos.roomName && !myRooms[task.pos.roomName].my) {
            // if(creep.pos.findInRange(myRooms[creep.pos.roomName].enemies)){creep.travelTo(task.pos); return}
            if (task.dismantleId) {
                const dismantleObject = _obj(task.dismantleId)
                if (dismantleObject) {
                    const res = creep.dismantle(dismantleObject)
                    if (res == OK) { creep.memory.isStuck = false }
                    else if (res == ERR_NOT_IN_RANGE) { creep.travelTo(dismantleObject, { freshMatrix: true, ignoreRoads: true, ensurePath: true, useFindRoute: true }) }
                }
                else { delete task.dismantleId }
            }
            else {
                if (!creep.memory.dismantleId || each100) {
                    let dismantleObject
                    if (this.ignoreStructures && this.ignoreStructures.length) {
                        dismantleObject = creep.pos.findClosestByPath(FIND_STRUCTURES, { filter: str => str.structureType !== STRUCTURE_CONTROLLER && !this.ignoreStructures.includes(str.structureType) })
                    }
                    else { dismantleObject = creep.pos.findClosestByPath(FIND_STRUCTURES, { filter: str => str.structureType !== STRUCTURE_CONTROLLER }) }
                    if (dismantleObject) {
                        creep.memory.dismantleId = dismantleObject.id;
                        const res = creep.dismantle(dismantleObject)
                        if (res == OK) { creep.memory.isStuck = false }
                        else if (res == ERR_NOT_IN_RANGE) { creep.travelTo(dismantleObject, { freshMatrix: true, ignoreRoads: true }) }
                    }
                    else { creep.travelTo(pos, { freshMatrix: true, obstacles: tools.getObstacles() }) }
                }
                else {
                    const dismantleObject = _obj(creep.memory.dismantleId)
                    if (dismantleObject) { if (creep.dismantle(dismantleObject) == ERR_NOT_IN_RANGE) { creep.travelTo(dismantleObject, { freshMatrix: true, ignoreRoads: true }) } }
                    else { delete creep.memory.dismantleId }
                }
            }
        }
        else { creep.travelTo(pos, { freshMatrix: true, obstacles: tools.getObstacles() }) }
    })
    //transfer
    const transferCreeps = task.creeps.filter(c => c.memory.role == 'transfer')
    let droppedResources = []
    if (transferCreeps.length) { droppedResources = idToObj(task.droppedResources) }
    transferCreeps.forEach(creep => {
        if (this.checkForBucket(creep)) { return }
        if (creep.getBoosted()) { return }


        if (!creep.store.getFreeCapacity()) { creep.memory.status = 'transfer' }
        if (creep.memory.status == 'transfer') {
            if (!creep.store.getUsedCapacity()) { delete creep.memory.status; creep.ticksToLive < task.distance * 2 ? creep.goToDie() : false; return }
            else { creep._transfer(task.spawnRoom.storage, Object.keys(creep.store)[0]); return }
        }

        creep.ticksToLive < task.distance ? creep.suicide() : false
        if (creep.room.name == task.pos.roomName) {
            let droppedResource
            if (creep.memory.droppedResource) { droppedResource = _obj(creep.memory.droppedResource) }
            droppedResource = droppedResource || findDroppedResource(creep)

            if (droppedResource) {
                creep.memory.droppedResource = droppedResource.id
                creep._pickup(droppedResource)
            }
        }
        else { creep.travelTo(pos, { freshMatrix: true, obstacles: tools.getObstacles() }) }
    })
    function findDroppedResource(creep) { return creep.pos.findClosestByPath(droppedResources) }
}
Task.prototype.attackRoom = function () {
    const cpu = settings.writePerformanceLog ? Game.cpu.getUsed() : 0
    const task = this, pos = new RoomPosition(this.pos.x, this.pos.y, this.pos.roomName)

    // let enemiesId
    // if (task.owner) { enemiesId = _.filter(cache.enemies, e => e.pos.roomName == task.pos.roomName && e.owner == task.owner).map(e => e.id) }
    // else { enemiesId = _.filter(cache.enemies, e => e.pos.roomName == pos.roomName).map(e => e.id) }

    const room = Game.rooms[pos.roomName]
    let structure = _obj(task.structure)
    if (room && !structure) {
        delete task.structure
        const structures = pos.findInRange(FIND_STRUCTURES, 3, { filter: s => s.structureType == STRUCTURE_WALL || s.structureType == STRUCTURE_RAMPART })
        if (structures.length) { structure = structures.sort((a, b) => a.hits - b.hits)[0]; task.structure = structure.id }
    }
    task.creeps.forEach(creep => {
        if (!creep.memory.moveByPathList_done) { if (creep.getBoosted() || creep.moveByPathList()) { return } }
        if (creep.pos.roomName !== pos.roomName) { creep.travelTo(pos) }
        else {
            creep._heal()
            if (creep.hits == creep.hitsMax) {
                if (structure) {
                    const range = creep.pos.getRangeTo(structure)
                    if (range > 3) { creep.travelTo(structure); attackHostile(); return }
                    else if (range < 3) { creep.stepBack(structure); if (!attackHostile()) { creep.rangedAttack(structure) } }
                    else if (!attackHostile()) { creep.rangedAttack(structure); creep.memory.isStuck = false } else { creep.memory.isStuck = false }
                }
                else { creep.rangedAttack3(); creep.travelTo(pos) }
            }
            else { creep.stepBack(structure) }

            function attackHostile() {
                const hostile = creep.pos.findInRange(FIND_HOSTILE_CREEPS, 3, { filter: c => !tools.lookRampart(c.pos) })
                if (hostile.length) { hostile.sort((a, b) => a.hits - b.hits) }
                else { return false }
                const host = hostile[0], range = creep.pos.getRangeTo(host)
                if (range < 3) { creep.stepBack(host) }
                if (range == 1) { creep.rangedMassAttack(); return true }
                else { creep.rangedAttack(host); return true }
            }

        }
    })

    settings.writePerformanceLog ? performance.newLog(cpu, 'tasks - attackRoom', task.number) : false
}
Task.prototype.defensePost = function () {
    const cpu = settings.writePerformanceLog ? Game.cpu.getUsed() : 0
    const task = this, pos = new RoomPosition(this.pos.x, this.pos.y, this.pos.roomName)

    let enemiesId
    if (task.owner) { enemiesId = _.filter(cache.enemies, e => e.pos.roomName == task.pos.roomName && e.owner == task.owner).map(e => e.id) }
    else { enemiesId = _.filter(cache.enemies, e => e.pos.roomName == pos.roomName).map(e => e.id) }
    const enemiesArray = idToObj(enemiesId)

    task.creeps.filter(!c.memory.arrived).forEach(creep => {
        if (creep.getBoosted()) { return }; creep.notifyWhenAttacked(false); if (Game.cpu.bucket < 100) { return }
        creep.travelTo(pos); if (creep.pos.roomName == pos.roomName) { creep.memory.arrived = true }
    })
    const creeps_rangedAttack = task.creeps.filter(c => c.memory.role == 'rangedAttack' && c.memory.arrived)
    const creeps_attack = task.creeps.filter(c => c.memory.role == 'attack' && c.memory.arrived)
    const creeps_heal = task.creeps.filter(c => c.memory.role == 'heal' && c.memory.arrived)
    task.creeps.filter(c.memory.arrived).forEach(creep => { })
    creeps_attackRoom.forEach(creep => {

        let attackRoom_heal, waitHeal
        if (creep.memory.attackRoom_heal) {
            attackRoom_heal = Game.creeps[creep.memory.attackRoom_heal]
            if (!attackRoom_heal) { delete creep.memory.attackRoom_heal }
        }
        if (!attackRoom_heal) {
            if (task.roles.attackRoom_heal) {
                if (task.roles.attackRoom_heal.amount) { waitHeal = true }
            }
            attackRoom_heal = _.find(attackRoom_heal, c => !c.memory.attackRoom)
            if (attackRoom_heal) {
                creep.memory.attackRoom_heal = attackRoom_heal.name; attackRoom_heal.memory.attackRoom = creep.name
            }
        }
        if (attackRoom_heal) {
            if (creep.pull(attackRoom_heal)) {
                if (creep.pos.roomName !== pos.roomName) { creep.travelTo(pos) }
                else {
                    if (attackRoom_heal.hits > attackRoom_heal.hitsMax * 0.9) {
                        if (!creep.attack1Range(task.owner)) {
                            let enemy, distanceToEnemy
                            if (creep.memory.enemy) { enemy = _obj(creep.memory.enemy) }
                            if (enemy) {
                                distanceToEnemy = creep.pos.getRangeTo(enemy)
                                if (distanceToEnemy > 3) {
                                    if (enemiesArray.length > 1) {
                                        let newEnemy = creep.pos.findInRange(enemiesArray.filter(e => e !== enemy), 3);
                                        if (newEnemy) {
                                            creep.memory.enemy = newEnemy.id
                                            creep.travelTo(newEnemy)
                                        }
                                    }
                                }
                            }
                            else {
                                if (enemiesArray.length) {
                                    enemy = creep.pos.findClosestByPath(enemiesArray, { ignoreCreeps: true, maxOps: 200 });
                                    if (!enemy) { enemy = enemiesArray[0] }
                                    if (enemy) {
                                        creep.memory.enemy = enemy.id
                                        creep.travelTo()
                                    }
                                }
                            }
                        }

                    }
                }
            }
        }
    })
    creeps_attackRoom_range.forEach(creep => {
        if (creep.getBoosted()) { return }; creep.notifyWhenAttacked(false); if (Game.cpu.bucket < 100) { return }

        let attack = false

        creep.heal(creep)
        if (creep.hits >= creep.hitsMax * 0.9) {
            const creepsLowHits = _.filter(Game.creeps, c => c.hits < c.hitsMax && c.room == creep.room && c !== creep)
            const creepsInRange1 = creepsLowHits.filter(c => creep.pos.inRangeTo(c, 1)).sort((a, b) => a.hits - b.hits)
            if (creepsInRange1.length) { creep.cancelOrder('heal'); creep.heal(creepsInRange1[0]) }
            else {
                const creepsInRange3 = creepsLowHits.filter(c => creep.pos.inRangeTo(c, 3)).sort((a, b) => a.hits - b.hits)
                if (creepsInRange3.length) { creep.cancelOrder('heal'); creep.rangedHeal(creepsInRange3[0]) }
            }
        }

        if (enemiesArray.length) {
            for (const enemy of enemiesArray) { if (creep.pos.inRangeTo(enemy, 3) && !tools.lookRampart(enemy.pos)) { creep.cancelOrder('rangedMassAttack'); creep.rangedAttack(enemy); attack = true; break } }
        }
        if (creep.hits >= creep.hitsMax * 0.9) {
            if (creep.hits == creep.hitsMax) {
                const creepsLowHits = _.filter(Game.creeps, c => c.hits < c.hitsMax && c.room == creep.room && c !== creep)
                for (const myCreep of creepsLowHits) { if (creep.rangedHeal(myCreep) == OK) { creep.cancelOrder('heal'); break } }
            }
            if (creep.room.name == task.pos.roomName) {
                creep.travelTo(pos); creep.rangedMassAttack()
                if (!attack) {
                    if (task.attackId) {
                        const attackObject = _obj(task.attackId)
                        if (attackObject) {
                            if (attackObject.pos.inRangeTo(creep, 3)) {
                                creep.cancelOrder('rangedMassAttack')
                                const resAttack = creep.rangedAttack(attackObject);
                                if (resAttack == ERR_NOT_IN_RANGE) { creep.travelTo(attackObject) }
                            }
                        }
                        else { delete task.attackId }
                    }
                    else {
                        if (!creep.memory.attackId) {
                            const attackObject = pos.findClosestByPath(FIND_STRUCTURES)
                            if (attackObject) { creep.memory.attackId = attackObject.id; if (creep.rangedAttack(attackObject) == ERR_NOT_IN_RANGE) { creep.travelTo(attackObject) } }
                        }
                        else {
                            const attackObject = _obj(creep.memory.attackId)
                            if (attackObject) { if (creep.rangedAttack(attackObject) == ERR_NOT_IN_RANGE) { creep.travelTo(attackObject) } }
                            else { delete creep.memory.attackId }
                        }
                    }
                }
            }
            else {
                creep.travelTo(pos, { obstacles: tools.getObstacles() })
                if (enemiesId.length) {
                    const enemiesArray = idToObj(enemiesId)
                    let closest, range, amount = 0
                    enemiesArray.forEach(enemy => {
                        const erange = creep.pos.getRangeTo(enemy)
                        if (erange <= 3) {
                            amount++;
                            if (!closest) { closest = enemy }
                            else if (erange < range) { closest = enemy }
                        }
                    })
                }
                else { creep.travelTo(pos, { obstacles: tools.getObstacles() }) }
            }

        }
        else {
            if (creep.room.name == task.pos.roomName || creep.pos.x == 0 || creep.pos.x == 49 || creep.pos.y == 0 || creep.pos.y == 49) { creep.travelTo(task.spawnRoom.room.controller) }
        }
    })

    settings.writePerformanceLog ? performance.newLog(cpu, 'tasks - attackRoom', task.number) : false
}
Task.prototype.checkForBucket = function (creep) {
    const role = creep.memory.role
    let bucket
    if (this.roles[role]) {
        bucket = this.roles[role].bucket || 1000
    }
    if (Game.cpu.bucket < bucket) { return true }
}
Task.prototype.dryer = function () {
    const task = this, pos = new RoomPosition(this.pos.x, this.pos.y, this.pos.roomName)
    task.creeps.forEach(creep => {
        if (creep.getBoosted()) { return }
        creep.notifyWhenAttacked(false)
        if (creep.pos.roomName == pos.roomName) {
            let object
            if (task.object) { object = _obj(task.object) }
            if (object.pos.roomName !== pos.roomName || object.pos.x !== pos.x || object.pos.y !== pos.y) { delete task.object; object = '' }
            if (!object) {
                const objects = Game.rooms[pos.roomName].lookForAt(LOOK_STRUCTURES, pos.x, pos.y)
                if (objects.length) { object = objects[0]; task.object = object.id }
            }
            let resource
            if (creep.pos.inRangeTo(pos, 1)) {
                if (object) {
                    if (object.structureType == 'tower') { resource = RESOURCE_ENERGY }
                    else {
                        try { resource = Object.keys(object.store[0]) } catch (error) { }
                    }
                    creep._withdraw(object, resource)
                }
            }
            else { creep.travelTo(pos, { range: 1, obstacles: tools.getObstacles() }) }
            creep.drop(RESOURCE_ENERGY)
        }
        else { creep.travelTo(pos, { range: 1, obstacles: tools.getObstacles() }) }

        creep.heal(creep)
        if (gameTime % 2 == 0 && task.text1) { creep.say(task.text1, true) }
        else if (task.text2) { creep.say(task.text2, true) }
    })
}
Task.prototype.attackGroup = function () {
    const task = this, pos = new RoomPosition(this.pos.x, this.pos.y, this.pos.roomName), room = Game.rooms[pos.roomName]
    task.direction = task.direction || 1
    const creeps = [...this.creeps], creepsId = creeps.map(c => c.id), less70List = creeps.filter(c => c.hits < c.hitsMax * 0.7).sort((a, b) => a.hits - b.hits)
    let less70; if (less70List.length) less70 = less70List[0]

    let eventLog = Game.rooms[pos.roomName] ? Game.rooms[pos.roomName].getEventLog() : [];

    let underAttackCreepId, underAttackList = {}, underAttack = eventLog.filter(e => e.data && creepsId.includes(e.data.targetId) && e.data.attackType)
    underAttack.forEach(e => {
        if (!underAttackList[e.data.targetId]) underAttackList[e.data.targetId] = { id: e.data.targetId, amount: e.data.amount }
        else { underAttackList[e.data.targetId].amount += e.data.amount }
    })
    underAttackList = Object.values(underAttackList).sort((a, b) => b.amount - a.mount)
    if (underAttackList.length) underAttackCreepId = underAttackList[0].id
    const creepBoost = []
    task.creeps.forEach(creep => {
        if (creep.getBoosted()) { creepBoost.push(creep); return }
    })
    // const attack = task.creeps.filter(c => c.memory.role == 'attack' && c.pos.roomName == pos.roomName).sort((a, b) => a.ticksToLive - b.ticksToLive)
    // const dismantle = task.creeps.filter(c => c.memory.role == 'dismantle' && c.pos.roomName == pos.roomName).sort((a, b) => a.ticksToLive - b.ticksToLive)
    // const rangedAttack = task.creeps.filter(c => c.memory.role == 'rangedAttack' && c.pos.roomName == pos.roomName).sort((a, b) => a.ticksToLive - b.ticksToLive)
    // const heal = task.creeps.filter(c => c.memory.role == 'heal' && c.pos.roomName == pos.roomName).sort((a, b) => a.ticksToLive - b.ticksToLive)
    const attack = task.creeps.filter(c => c.memory.role == 'attack').sort((a, b) => a.ticksToLive - b.ticksToLive)
    const dismantle = task.creeps.filter(c => c.memory.role == 'dismantle').sort((a, b) => a.ticksToLive - b.ticksToLive)
    const rangedAttack = task.creeps.filter(c => c.memory.role == 'rangedAttack').sort((a, b) => a.ticksToLive - b.ticksToLive)
    const heal = task.creeps.filter(c => c.memory.role == 'heal').sort((a, b) => a.ticksToLive - b.ticksToLive)

    const ac = attack.length, dc = dismantle.length, rc = rangedAttack.length, hc = heal.length
    let firstLine = ac + dc, secondLine = rc, thirdLine = hc, width = secondLine
    if (firstLine > secondLine) { if (secondLine > 0) { width = secondLine } }

    if (less70List.length > 2) this.moveBack()
    else if (less70) {
        let index
        if (less70.memory.role == 'heal') index = heal.findIndex(x => x == less70)
        console.log('index', index)
        if (index !== undefined) this.moveBack(index)
    }

    task.line1 = task.line1 || []
    if (task.direction && !task.line1.length && room) {
        let lastPos = pos
        task.line2 = []; task.line3 = []; task.line4 = []
        const rightDirection = tools.toRightFromDirection(task.direction); task.width = width
        for (let i = 1; i < width + 1; i++) {
            const checkPos = i == 1 ? lastPos : tools.posByDirection(lastPos, rightDirection)
            if (room.chekPosForMove(checkPos)) { task.line1.push(checkPos); if (i !== 1) { lastPos = checkPos } }
            else { task.width = i }
        }
        const reverseDirection = tools.reverseDirection(task.direction)
        task.line1.forEach(checkPos => {
            const newPos = tools.posByDirection(checkPos, reverseDirection)
            if (room.chekPosForMove(newPos)) { task.line2.push(newPos) }
        })
        task.line2.forEach(checkPos => {
            const newPos = tools.posByDirection(checkPos, reverseDirection)
            if (room.chekPosForMove(newPos)) { task.line3.push(newPos) }
        })
        task.line3.forEach(checkPos => {
            const newPos = tools.posByDirection(checkPos, reverseDirection)
            if (room.chekPosForMove(newPos)) { task.line4.push(newPos) }
        })
    }
    if (each10 && !this.spawnStatus && !creepBoost.length && !_.filter(Game.creeps, c => c.memory.task == this.number && c.spawning).length && !this.spawnRoom.queues.spawn.filter(s => s.memory.task == this.number).length) this.status = 'work'

    if (this.status && less70List.length < 2) {
        task.creeps.filter(c => c.pos.roomName !== pos.roomName).forEach(c => c.travelTo(pos))
        moveToPos()
    }

    healGroup()
    rangedAttackGroup()
    dismantleGroup()
    function moveToPos() {
        for (let i = 0; i < dismantle.length; i++) {
            const creep = dismantle[i]; if (!creep) continue
            const creepPos = task.line1[i]
            if (creepPos && !tools.comparePositions(creep.pos, creepPos)) { creep.travelTo(creepPos) }
        }
        for (let i = 0; i < heal.length; i++) {
            const creep = heal[i]; if (!creep) continue
            const creepPos = task.line2[i]
            if (creepPos && !tools.comparePositions(creep.pos, creepPos)) { creep.travelTo(creepPos) }
        }
        for (let i = 0; i < rangedAttack.length; i++) {
            const creep = rangedAttack[i]; if (!creep) continue
            const creepPos = task.line3[i]
            if (creepPos && !tools.comparePositions(creep.pos, creepPos)) { creep.travelTo(creepPos) }
        }
    }
    function healGroup() {
        for (let i = 0; i < heal.length; i++) {
            const creep = heal[i]; if (!creep) continue
            if (creep.hits > creep.hitsMax * 0.9) {
                if (less70) { creep.__heal(less70) }
                else {
                    if (underAttackCreepId && dismantle.map(d => d.id).includes(underAttackCreepId) && _obj(underAttackCreepId)) {
                        if (!creep.__heal(_obj(underAttackCreepId))) {
                            if (dismantle[i]) creep.__heal(dismantle[i])
                        }
                    }
                    else { if (dismantle[i]) creep.__heal(dismantle[i]) }
                }
            }
            else { creep.heal(creep) }
        }
    }
    function rangedAttackGroup() {
        for (let i = 0; i < rangedAttack.length; i++) {
            const creep = rangedAttack[i]; if (!creep) continue
            if (creep.hits > creep.hitsMax * 0.9) {
                if (less70) { creep.__heal(less70) }
                else {
                    if (underAttackCreepId && dismantle.map(d => d.id).includes(underAttackCreepId) && _obj(underAttackCreepId)) {
                        if (!creep.__heal(_obj(underAttackCreepId))) {
                            if (dismantle[i]) creep.__heal(dismantle[i])
                        }
                    }
                    else { if (dismantle[i]) creep.__heal(dismantle[i]) }
                }
            }
            else { creep.heal(creep) }
            creep.rangedAttack3()
        }
    }
    function dismantleGroup() {
        let dismantleObj
        if (task.dismantleId) { dismantleObj = _obj(task.dismantleId) }

        for (let i = 0; i < dismantle.length; i++) {
            const creep = dismantle[i]; if (!creep) continue
            if (dismantleObj) creep.dismantle(dismantleObj)
        }
    }
    this.moveBack = function (i = false) {
        const attack = task.creeps.filter(c => c.memory.role == 'attack' && c.pos.roomName == pos.roomName).sort((a, b) => a.ticksToLive - b.ticksToLive)
        const dismantle = task.creeps.filter(c => c.memory.role == 'dismantle' && c.pos.roomName == pos.roomName).sort((a, b) => a.ticksToLive - b.ticksToLive)
        const rangedAttack = task.creeps.filter(c => c.memory.role == 'rangedAttack' && c.pos.roomName == pos.roomName).sort((a, b) => a.ticksToLive - b.ticksToLive)
        const heal = task.creeps.filter(c => c.memory.role == 'heal' && c.pos.roomName == pos.roomName).sort((a, b) => a.ticksToLive - b.ticksToLive)
        const reverseDirection = tools.reverseDirection(task.direction)
        if (i !== false) task.creeps.forEach(c => c.move(reverseDirection))
        else {
            if (dismantle[i]) dismantle[i].move(reverseDirection)
            if (heal[i]) heal[i].move(reverseDirection)
            if (rangedAttack[i]) rangedAttack[i].move(reverseDirection)
        }
    }

}
Room.prototype.chekPosForMove = function (position) {
    const room = Game.rooms[position.roomName]
    // if (position.x < 1 || position.x > 48 || position.y < 1 || position.y > 48) { return false }
    const pos = new RoomPosition(position.x, position.y, position.roomName)
    const objAtPos = room.lookAt(position.x, position.y)
    let res = true
    objAtPos.forEach(o => {
        if (o.type == 'terrain') { if (o.terrain == 'wall') { res = false } }
        if (o.type == 'structure') { res = false }
    })
    return res
}
Task.prototype.partizan = function () {
    const task = this, pos = new RoomPosition(this.pos.x, this.pos.y, this.pos.roomName)
    task.attackTick = task.attackTick || gameTime; task.frequency = task.frequency || 1000; task.structures = task.structures === undefined ? 10 : task.structures; task.defenseIndex = task.defenseIndex || 300
    const room = Game.rooms[pos.roomName]
    if (task.debug) { console.log(`task ${task.number} type:${task.type}, room: ${pos.roomName}, ready:${task.ready}, room:${room}, !creeps:${!task.creeps.length}`) }
    if (!task.creeps.length && !task.ready) {
        if (room) {
            const structures = room.find(FIND_STRUCTURES, { filter: s => s.structureType !== 'controller' }).length
            if (task.debug) { console.log(`task ${task.number} type:${task.type}, room: ${pos.roomName}, structures:${structures}`) }
            if (structures < task.structures) {
                task.attackTick = gameTime + task.frequency
                return
            }
            else {
                const defenseIndex = _.filter(cache.enemies, e => e.pos.roomName == pos.roomName).map(e => e.parameters.index).reduce((a, b) => a + b, 0)
                if (task.debug) { console.log(`task ${task.number} type:${task.type}, room: ${pos.roomName}, defenseIndex:${defenseIndex}`) }
                if (task.defenseIndex > defenseIndex) { task.ready = true }
                else { task.attackTick = gameTime + task.frequency; return }
            }
        }
        else if (gameTime > task.attackTick && !cache.observer.taskList.find(t => t == pos.roomName)) { cache.observer.taskList.push(pos.roomName); console.log(`task: ${task.number}, type: ${task.type}, scan room: ${pos.roomName}`) }
    }

    task.creeps.filter(creep => !creep.memory.moveByPathList_done).forEach(creep => {
        if (creep.getBoosted()) { return }
        else if (creep.moveByPathList()) { return }
    })
    task.creeps.filter(creep => creep.memory.moveByPathList_done).forEach(creep => {
        if (creep.pos.roomName !== pos.roomName) { creep.travelTo(pos); return }
        if (creep.memory.role == 'partizan_dismantle') {
            if (creep.memory.dismantle) {
                const object = _obj(creep.memory.dismantle)
                if (object) { creep._dismantle(object); return }
            }
            const object = chooseObjectToDismantle(); if (object) { creep._dismantle(object) } else { creep.suicide(); task.roles.partizan_dismantle.amount = 0 }
            function chooseObjectToDismantle() {
                const obj = creep.pos.findClosestByPath(FIND_STRUCTURES, { filter: s => s.structureType !== 'controller' })
                if (obj) { creep.memory.dismantle = obj.id; return obj }
            }
        }
        else if (creep.memory.role == 'partizan_attack') {
            const objectToMove = chooseObjectToMove()
            if (objectToMove) { creep.travelTo(objectToMove, { movingTarget: true }) }
            const objectToAttack = chooseObjectToAttack()
            if (objectToAttack) { const res = creep.attack(objectToAttack); if (creep.memory.debug) { console.log(`partizan_attack:${creep}-${res}`) } }

            function chooseObjectToMove() {
                const hcreeps = creep.pos.findInRange(FIND_HOSTILE_CREEPS, 5)
                const obj1 = creep.pos.findClosestByPath(hcreeps)
                if (obj1) { return obj1 }
                const obj2 = creep.pos.findClosestByPath(FIND_STRUCTURES, { filter: s => s.structureType !== 'controller' })
                if (obj2) { return obj2 }
                const obj3 = creep.pos.findClosestByPath(FIND_HOSTILE_CREEPS)
                if (obj3) { return obj3 }
            }
            function chooseObjectToAttack() {
                const obj1 = creep.pos.findInRange(FIND_HOSTILE_CREEPS, 1)
                if (obj1.length) { return obj1.sort((a, b) => a.hits - b.hits)[0] }
                const obj2 = creep.pos.findInRange(FIND_STRUCTURES, 1, { filter: s => s.structureType !== 'controller' })
                if (obj2.length) { return obj2.sort((a, b) => a.hits - b.hits)[0] }
            }
        }
    })
}
Task.prototype._heal = function () {
    const task = this, pos = new RoomPosition(this.pos.x, this.pos.y, this.pos.roomName)
    const room = Game.rooms[pos.roomName]
    if (room) {


    }
    const boostList = []
    task.creeps.forEach(creep => { if (creep.getBoosted()) boostList.push(creep) })

    const creepsLowHits = _.filter(Game.creeps, c => c.hits < c.hitsMax && c.room == creep.room)
    task.creeps.filter(c => !boostList.includes(c) && c.pos.roomName !== pos.roomName).forEach(creep => creep.travelTo(pos))
    task.creeps.filter(c => !boostList.includes(c) && c.pos.roomName == pos.roomName).forEach(creep => {
        creep.heal(creep)
        if (creep.hits >= creep.hitsMax * 0.9) {
            const creepsInRange1 = creepsLowHits.filter(c => creep.pos.inRangeTo(c, 1)).sort((a, b) => a.hits - b.hits)
            if (creepsInRange1.length) { creep.cancelOrder('heal'); creep.heal(creepsInRange1[0]) }
            else {
                const creepsInRange3 = creepsLowHits.filter(c => creep.pos.inRangeTo(c, 3)).sort((a, b) => a.hits - b.hits)
                if (creepsInRange3.length) { creep.cancelOrder('heal'); creep.rangedHeal(creepsInRange3[0]) }
            }
        }
    })
}
Task.prototype.partizan_rangedAttack = function () {
    const task = this, pos = new RoomPosition(this.pos.x, this.pos.y, this.pos.roomName)
    task.attackTick = task.attackTick || gameTime; task.frequency = task.frequency || 1000; task.structures = task.structures || 10; task.defenseIndex = task.defenseIndex || 300
    const room = Game.rooms[pos.roomName]
    if (task.debug) { console.log(`task ${task.number} type:${task.type}, room: ${pos.roomName}, ready:${task.ready}, room:${room}, !creeps:${!task.creeps.length}`) }
    if (!task.creeps.length && !task.ready) {
        if (room) {
            const structures = room.find(FIND_STRUCTURES, { filter: s => s.structureType !== 'controller' }).length
            if (task.debug) { console.log(`task ${task.number} type:${task.type}, room: ${pos.roomName}, structures:${structures}`) }
            if (structures < task.structures) {
                task.attackTick = gameTime + task.frequency
                return
            }
            else {
                const defenseIndex = _.filter(cache.enemies, e => e.pos.roomName == pos.roomName).map(e => e.parameters.index).reduce((a, b) => a + b, 0)
                if (task.debug) { console.log(`task ${task.number} type:${task.type}, room: ${pos.roomName}, defenseIndex:${defenseIndex}`) }
                if (task.defenseIndex > defenseIndex) { task.ready = true }
                else { task.attackTick = gameTime + task.frequency; return }
            }
        }
        else if (gameTime > task.attackTick && !cache.observer.taskList.find(t => t == pos.roomName)) { cache.observer.taskList.push(pos.roomName); console.log(`task: ${task.number}, type: ${task.type}, scan room: ${pos.roomName}`) }
    }

    task.creeps.filter(c => !c.memory.moveByPathList_done).forEach(creep => {
        if (creep.getBoosted()) { return }
        else if (creep.moveByPathList()) { return }
    })
    task.creeps.filter(c => c.memory.moveByPathList_done).forEach(creep => {
        creep.heal(creep)
        let posToMove, objectToMove
        if (creep.memory.objectToMove && creep.pos.roomName == creep.memory.posToMove.roomName) {
            objectToMove = _obj(creep.memory.objectToMove)
            if (!objectToMove) {
                objectToMove = chooseObjectToMove();
                if (objectToMove) { creep.memory.posToMove = objectToMove.pos; creep.memory.objectToMove = objectToMove.id }
            }
            else { creep.memory.posToMove = objectToMove.pos; creep.memory.objectToMove = objectToMove.id }
        }
        else if (!creep.memory.objectToMove) {
            objectToMove = chooseObjectToMove()
            if (objectToMove) { creep.memory.posToMove = objectToMove.pos; creep.memory.objectToMove = objectToMove.id }
        }

        if (creep.memory.posToMove) {
            posToMove = new RoomPosition(creep.memory.posToMove.x, creep.memory.posToMove.y, creep.memory.posToMove.roomName)
            creep.travelTo(posToMove, { range: 3 })
            if (creep.pos.roomName == posToMove.roomname && (creep.pos.x == 1 || creep.pos.x == 48 || creep.pos.y == 1 || creep.pos.y == 48)) { creep.travelTo(posToMove) }
        }

        const objectToAttack = chooseObjectToAttack()
        if (objectToAttack) { const res = creep.rangedAttack(objectToAttack); if (creep.memory.debug) { console.log(`partizan_attack:${creep}-${res}`) } }

        function chooseObjectToMove() {
            const obj = creep.pos.findClosestByPath(FIND_STRUCTURES, { range: 3, filter: s => !tools.lookRampart(s.pos) && (s.structureType !== 'controller' && s.structureType !== 'rampart' && s.structureType !== STRUCTURE_WALL) })
            if (obj) { return obj }
        }
        function chooseObjectToAttack() {
            const obj1 = creep.pos.findInRange(FIND_HOSTILE_CREEPS, 3, { filter: e => !tools.lookRampart(e.pos) })
            if (obj1.length) { return obj1.sort((a, b) => a.hits - b.hits)[0] }
            const obj2 = creep.pos.findInRange(FIND_STRUCTURES, 3, { filter: s => s.structureType !== 'controller' && s.structureType !== 'rampart' && s.structureType !== STRUCTURE_WALL })
            if (obj2.length) { return obj2.sort((a, b) => !tools.lookRampart(b.pos) - !tools.lookRampart(a.pos))[0] }
        }

    })
}
Task.prototype.partizan_attack = function () {
    const task = this, pos = new RoomPosition(this.pos.x, this.pos.y, this.pos.roomName)
    task.attackTick = task.attackTick || gameTime; task.frequency = task.frequency || 1000; task.structures = task.structures || 10; task.defenseIndex = task.defenseIndex || 300
    const room = Game.rooms[pos.roomName]
    if (task.debug) { console.log(`task ${task.number} type:${task.type}, room: ${pos.roomName}, ready:${task.ready}, room:${room}, !creeps:${!task.creeps.length}`) }
    if (!task.creeps.length && !task.ready) {
        if (room) {
            const structures = room.find(FIND_STRUCTURES, { filter: s => s.structureType !== 'controller' }).length
            if (task.debug) { console.log(`task ${task.number} type:${task.type}, room: ${pos.roomName}, structures:${structures}`) }
            if (structures < task.structures) {
                task.attackTick = gameTime + task.frequency
                return
            }
            else {
                const defenseIndex = _.filter(cache.enemies, e => e.pos.roomName == pos.roomName).map(e => e.parameters.index).reduce((a, b) => a + b, 0)
                if (task.debug) { console.log(`task ${task.number} type:${task.type}, room: ${pos.roomName}, defenseIndex:${defenseIndex}`) }
                if (task.defenseIndex > defenseIndex) { task.ready = true }
                else { task.attackTick = gameTime + task.frequency; return }
            }
        }
        else if (gameTime > task.attackTick && !cache.observer.taskList.find(t => t == pos.roomName)) { cache.observer.taskList.push(pos.roomName); console.log(`task: ${task.number}, type: ${task.type}, scan room: ${pos.roomName}`) }
    }

    task.creeps.filter(c => !c.memory.moveByPathList_done).forEach(creep => {
        if (creep.getBoosted()) { return }
        else if (creep.moveByPathList()) { return }
    })
    task.creeps.filter(c => c.memory.moveByPathList_done).forEach(creep => {
        creep.heal(creep)
        if (myRooms[creep.pos.roomName].my) { return }
        let posToMove, objectToMove
        if (creep.memory.objectToMove && creep.pos.roomName == creep.memory.posToMove.roomName) {
            objectToMove = _obj(creep.memory.objectToMove)
            if (!objectToMove) {
                objectToMove = chooseObjectToMove();
                if (objectToMove) { creep.memory.posToMove = objectToMove.pos; creep.memory.objectToMove = objectToMove.id }
            }
            else { creep.memory.posToMove = objectToMove.pos; creep.memory.objectToMove = objectToMove.id }
        }
        else if (!creep.memory.objectToMove) {
            objectToMove = chooseObjectToMove()
            if (objectToMove) { creep.memory.posToMove = objectToMove.pos; creep.memory.objectToMove = objectToMove.id }
        }

        if (creep.memory.posToMove) {
            posToMove = new RoomPosition(creep.memory.posToMove.x, creep.memory.posToMove.y, creep.memory.posToMove.roomName)
            creep.travelTo(posToMove, { movingTarget: true })
        }

        const objectToAttack = chooseObjectToAttack()
        if (objectToAttack && creep.hits > creep.hitsMax * 0.9) {
            const res = creep.attack(objectToAttack)
            if (res == OK) { creep.cancelOrder('heal') }
            if (creep.memory.debug) { console.log(`partizan_attack:${creep}-${res}`) }
        }

        function chooseObjectToMove() {
            //const obj = creep.pos.findClosestByPath(FIND_STRUCTURES, { filter: s => !tools.lookRampart(s.pos) && (s.structureType !== 'controller' && s.structureType !== 'rampart' && s.structureType !== STRUCTURE_WALL) })
            const obj = creep.pos.findClosestByPath(FIND_STRUCTURES, { filter: s => s.structureType !== 'controller' })
            if (obj) { return obj }
        }
        function chooseObjectToAttack() {
            const obj1 = creep.pos.findInRange(FIND_HOSTILE_CREEPS, 1, { filter: e => !tools.lookRampart(e.pos) })
            if (obj1.length) { return obj1.sort((a, b) => a.hits - b.hits)[0] }
            // const obj2 = creep.pos.findInRange(FIND_STRUCTURES, 1, { filter: s => s.structureType !== 'controller' && s.structureType !== 'rampart' && s.structureType !== STRUCTURE_WALL })
            const obj2 = creep.pos.findInRange(FIND_STRUCTURES, 1, { filter: s => s.structureType !== 'controller' })
            if (obj2.length) { return obj2.sort((a, b) => !tools.lookRampart(b.pos) - !tools.lookRampart(a.pos))[0] }
        }

    })
}
taskTools.createTaskAvangers = function (pos, username) {
    // const taskExist = _.find(tasks)
    const enemies = _.filter(cache.enemies, e => e.owner == username && e.pos.roomName == pos.roomName), roles = {}, bodies = {}
    let heal = 0, attack = 0, rangedAttack = 0
    enemies.forEach(enemy => {
        heal += enemy.parameters.heal; attack += enemy.parameters.attack; rangedAttack += enemy.parameters.rangedAttack
    })
    if (heal < 500 && attack < 2000 && rangedAttack < 200) {
        roles.attack = { role: 'attack', 'amount': 1 }
        bodies.attack = []
        bodies.attack.pushN(TOUGH, 6)
        bodies.attack.pushN(MOVE, 9)
        bodies.attack.pushN(ATTACK, 25)
        bodies.attack.pushN(HEAL, 9)
        bodies.attack.pushN(MOVE, 1)
    }
    const newTask = new Task('avangers', pos, false, { roles, bodies })
    newTask.username = username
    tasks[newTask.number] = newTask
    newTask.backup()
    console.log(`create task ${newTask.number}, type: ${newTask.type}, room: ${pos.roomName}, distance: ${newTask.distance ? newTask.distance : ''}`);
    info.new(1, 'task', pos.roomName, '', `create task avengers, username: ${username}: (heal:${heal}, attack:${attack}, rangedAttack: ${rangedAttack})`)
}
Task.prototype.avengers = function () {
    const task = this, pos = new RoomPosition(this.pos.x, this.pos.y, this.pos.roomName)
    task.creeps.forEach(creep => {
        if (creep.getBoosted()) return
        creep.heal(creep)
        const enemies = idToObj(enemies.filter(e => e.pos.roomName == creep.pos.roomName && e.owner == task.username).map(e => e.id))
        if (!enemies.length) { creep.travelTo(pos) }
        else {
            if (enemies.length == 1) {
                const enemy = enemies[0];
                if (creep.pos.rangeTo(enemy) > 1) creep.moveTo(enemy)
                else { creep.move(enemy); creep.cancelOrder('heal'); creep.attack(enemy) }
            }
            else {

            }
        }
    })
}
Task.prototype.remoteHarvestSource = function () {
    const task = this, pos = new RoomPosition(this.pos.x, this.pos.y, this.pos.roomName)
    const observer = task.creeps.find(c => c.memory.role == 'observer')
    if (observer) {
        const obsMem = observer.memory
        if (!obsMem.getStorage) {
            const storage = observer.room.storage
            if (storage) {
                if (observer.getRangeTo(storage) > 1) { observer.travelTo(storage) }
                else { obsMem.getStorage = true }
            }
        }
        else if ((!obsMem.moveToRoom && task.roads) || !Game.rooms[pos.roomName]) {
            if (observer.pos.roomName == pos.roomName) { obsMem.moveToRoom = true }
            observer.travelTo(pos); if (task.roads) observer.room.createConstructionSite(observer.pos.x, observer.pos.y, 'road')
        }
        else {
            if (observer.pos.roomName == pos.roomName) {
                if (!task.sources.length) {
                    const sources = observer.room.find(FIND_SOURCES)
                    const source1 = observer.pos.findClosestByPath(sources)
                    if (source1) task.sources.push(source1.id)
                    const source2 = sources.find(s => s !== source1)
                    if (source2) task.sources.push(source2.id)
                }
                else {
                    if (task.roads && !task.prepareRoad1) {
                        const source = _obj(task.sources[0])
                        if (source && observer.pos.getRangeTo(source) > 1) {
                            observer.travelTo(source); if (task.roads) observer.room.createConstructionSite(observer.pos.x, observer.pos.y, 'road')
                        }
                        else { task.prepareRoad1 = true }
                    }
                    else if (task.roads && task.road1 && task.sources.length == 2) {
                        const source = _obj(task.sources[1])
                        if (source && observer.pos.getRangeTo(source) > 1) {
                            observer.travelTo(source); if (task.roads) observer.room.createConstructionSite(observer.pos.x, observer.pos.y, 'road')
                        }
                    }
                }
            }
        }
    }
    if (!task.sources.length) {

    }
    const transferList = _.filter(Game.creeps, creep => !creep.spawning && creep.memory.task == task.number && creep.memory.role == 'transfer')
    const transferObj = _obj(task.transfer), withdrawObj = _obj(task.withdraw)
    if (Game.rooms[pos.roomName] && (!transferObj || !withdrawObj)) { task.roles.transfer.amount = 0; if (!task.creeps.filter(c => c.store.getUsedCapacity()).length) return }
    //set status     
    transferList.forEach(creep => {
        if (creep.getBoosted()) { return }
        // if (creep.hits < creep.hitsMax) { creep.travelTo(myRooms[creep.memory.spawnRoom].room.controller); return }
        if (!creep.store.getFreeCapacity()) { creep.memory.status = 'transfer' }
        else if (!creep.store.getUsedCapacity()) {
            if (transferObj) { if (creep.room.name == transferObj.room.name && creep.ticksToLive < task.distance * 2) { creep.goToDie(); return } }
            if (withdrawObj) { if (creep.room.name == withdrawObj.room.name && creep.ticksToLive < task.distance) { creep.goToDie(); return } }
            creep.memory.status = 'withdraw'
        }

        if (creep.memory.status == 'withdraw') {
            if (withdrawObj) {
                if (resourceType) {
                    if (withdrawObj.store[resourceType]) { creep._withdraw(withdrawObj, resourceType) }
                    else {
                        task.roles.transfer.amount = 0;
                        if (creep.store.getUsedCapacity()) { creep.memory.status = 'transfer' }
                    }
                }
                else {
                    if (withdrawObj.store.getUsedCapacity()) {
                        if (task.notEnergy) {
                            if (withdrawObj.store.getUsedCapacity() - withdrawObj.store.getUsedCapacity(RESOURCE_ENERGY) == 0) { task.roles.transfer.amount = 0; return }
                            const resources = Object.keys(withdrawObj.store).filter(r => r !== 'energy')
                            if (resources.length) {
                                resources.sort((a, b) => withdrawObj.store[a] - withdrawObj.store[b])
                                creep._withdraw(withdrawObj, resources[0])
                            }
                            else { return }
                        }
                        else { creep._withdraw(withdrawObj, Object.keys(withdrawObj.store).sort((a, b) => withdrawObj.store[b] - withdrawObj.store[a])[0]) }
                    }
                    else { task.roles.transfer.amount = 0 }
                }
            }
            else {
                if (Game.rooms[pos.roomName]) { creep.goToDie(); task.roles.transfer.amount = 0; return }
                if (creep.room.name !== pos.roomName) { creep.travelTo(pos) }
            }
        }
        if (creep.memory.status == 'transfer') {
            if (transferObj) {
                const resultTansfer = creep.transfer(transferObj, Object.keys(creep.store)[0])
                if (resultTansfer == ERR_NOT_IN_RANGE) { creep.travelTo(transferObj) }
                if (resultTansfer == OK) { task.transferCounter += creep.store.getUsedCapacity(resourceType) }
            }
            else {
                if (Game.rooms[pos.roomName]) { creep.goToDie(); task.roles.transfer.amount = 0; return }
                if (creep.room.name !== pos.roomName) { creep.travelTo(pos) }
            }
        }
    })
}