'use strict'
//2023.08.05
global.spawnLogick = {}
spawnLogick.getBody = function (role, energy, specifications = false) {
    const body = []
    let work, carry, move, claim, tough, attack, heal, rangedAttack
    switch (role) {
        case 'partizan_rangedAttack':
            move = moveByBoost(); tough = 3
            body.pushN(TOUGH, tough)
            heal = 26; rangedAttack = 50 - tough - move - heal; body.pushN(RANGED_ATTACK, rangedAttack)
            body.pushN(MOVE, move - 1);
            body.pushN(HEAL, heal); body.push(MOVE)
            return body
        case 'attackRoom':
            move = moveByBoost()
            const ostatok = 50 - move
            rangedAttack = Math.ceil(ostatok / 3)
            body.pushN([RANGED_ATTACK, TOUGH], 5)
            heal = ostatok - rangedAttack
            body.pushN(RANGED_ATTACK, rangedAttack - 5)
            body.pushN(MOVE, move - 1)
            body.pushN(HEAL, heal - 5)
            body.push(MOVE)
            return body
        case 'partizan_dismantle':
            body.pushN([WORK, MOVE], 25); return body
        case 'partizan_attack':
            if (specifications) {
                if (!specifications.boost) { body.pushN([ATTACK, MOVE], 25); return body }
                else {
                    move = moveByBoost(); tough = 3
                    body.pushN(TOUGH, tough)
                    heal = 26; attack = 50 - tough - move - heal; body.pushN(ATTACK, attack)
                    body.pushN(MOVE, move - 1);
                    body.pushN(HEAL, heal); body.push(MOVE)
                    return body
                }
            }
        case 'dismantle':
            move = moveByBoost()
            if (move == 10) {
                body.pushN(WORK, 10); body.pushN(MOVE, move - 1); body.pushN(TOUGH, 10); body.pushN(WORK, 20);
                body.push(MOVE)
            }
            break
        case 'rangedAttack':
            move = moveByBoost()
            if (move == 10) {
                body.pushN(RANGED_ATTACK, 13); body.pushN(MOVE, 9);
                body.pushN(TOUGH, 5); body.pushN(HEAL, 22); body.push(MOVE)
            } else if (move == 14) {
                body.pushN(RANGED_ATTACK, 10); body.pushN(MOVE, 13);
                body.pushN(TOUGH, 5); body.pushN(HEAL, 21); body.push(MOVE)
            }
            return body
        case 'heal':
            move = moveByBoost()
            if (move == 10) {
                body.pushN(MOVE, 9);
                body.pushN(TOUGH, 5); body.pushN(HEAL, 35); body.push(MOVE)
            }
            else if (move == 14) {
                body.pushN(MOVE, 13);
                body.pushN(TOUGH, 5); body.pushN(HEAL, 31); body.push(MOVE)
            }
            return body
        case 'dryer':
            body.pushN(TOUGH, 5); body.pushN(CARRY, 4)
            body.pushN(MOVE, 23); body.pushN(HEAL, 18)
            break
        // case 'dismantleRoom': body.pushN(WORK, 30);body.pushN(TOUGH, 10); body.pushN(MOVE, 10); return body
        case 'dismantleRoom': body.pushN(WORK, 40); body.pushN(MOVE, 10); return body
        case 'punchingBag':
            body.pushN(TOUGH, 8); body.pushN(MOVE, 25); body.pushN(HEAL, 16); body.push(ATTACK)
            return body
        case 'observer': return [MOVE]
        case 'defend_attack':
            switch (true) {
                case energy >= 3700: body.pushN(ATTACK, 40); body.pushN(MOVE, 10); break
                case energy >= 2300: //6 lvl
                    body.pushN(ATTACK, 17); body.pushN(MOVE, 17); break
            }; return body
        case 'defend_rangedAttack': body.pushN(RANGED_ATTACK, 40); body.pushN(MOVE, 10); return body
        case 'destroyPower':
            // if (specifications.distance > 300) { tough = 4; move = 10; attack = 35 }
            // else { move = attack = 20 }; break
            tough = 4; move = 24; attack = 20; break
        case 'healPower':
            // if (specifications.distance > 300) { move = 10; heal = 40 }
            // else { move = 25; heal = 25 }; break
            move = heal = 8; break
        // case 'transferPower': move = 25; carry = 25; break
        case 'transferPower': move = 17; carry = 33; break
        case 'harvest deposit':
            if (settings.tasks.useBoostForHarvestDeposit) {
                move = 10; work = tools.calculateHarvestDeposit(specifications.distance, specifications.lastCooldown, 10, 7, 4);
                carry = 40 - work
            }
            else {
                move = 25; work = tools.calculateHarvestDeposit(specifications.distance, specifications.lastCooldown);
                carry = 25 - work
            }
            break
        case 'defender': switch (true) {
            case energy >= 740: tough = 6, move = 4, attack = 6
                break
        }; break
        case 'transfer':
            if (specifications) {
                if (specifications.boost) {
                    switch (true) {
                        case energy >= 2500: move = moveByBoost(); carry = 50 - move; break
                        case energy >= 2250: carry = 36; move = 9; break
                    }
                }
                else {
                    if (specifications.oneWay) {
                        energy = energy > 2500 ? 2500 : energy
                        const amount = Math.floor(energy / 50)
                        move = Math.ceil(amount / 3); carry = amount - move
                    }
                    else {
                        const amount = Math.floor(energy / 50)
                        let amount2 = Math.floor(amount / 2)
                        if (amount2 > 25) { amount2 = 25 }
                        move = amount2; carry = amount2
                    }
                }
            }; break
        case 'build base':
            if (specifications.spawnRoom.room.energyCapacityAvailable <= 800) { work = 4; move = 6; carry = 2; break }
            else if (specifications.spawnRoom.room.energyCapacityAvailable <= 1300) { work = 4; move = 11; carry = 7; break }
            else if (specifications.spawnRoom.room.energyCapacityAvailable <= 1800) { work = 8; move = 14; carry = 6; break }
            else if (specifications.spawnRoom.room.energyCapacityAvailable <= 2300) { work = 10; move = 18; carry = 8; break }

            move = moveByBoost()
            if (specifications.spawnRoom.resources['XKH2O'] && specifications.spawnRoom.resources['XKH2O'] >= 300) {
                carry = 10
                if (specifications.task) {
                    if (tasks[specifications.task]) {
                        if (tasks[specifications.task].type == 'build base to ally') { carry = 20 }
                        else if (tasks[specifications.task].roomName) {
                            const taskRoom = myRooms[tasks[specifications.task].roomName]
                            if (taskRoom) {
                                if (taskRoom.constructionSites.length) { carry = 10 }
                                else {
                                    if (taskRoom.terminal && taskRoom.storage) {
                                        const distanceBetweenControllerAndStorage = taskRoom.getDistanceByPath(taskRoom.storage, taskRoom.room.controller)
                                        if (distanceBetweenControllerAndStorage) {
                                            if (distanceBetweenControllerAndStorage <= 4) { carry = 1 }
                                            else if (distanceBetweenControllerAndStorage <= 10) { carry = 5 }
                                            else { carry = 10 }
                                        }
                                    }
                                }
                            }
                        }
                    }
                }
                carry = 3
                work = 50 - move - carry
            }
            else { carry = 15; work = 50 - move - carry }
            break
        case 'observer': move = 1; break
        case 'claim':
            if (specifications) {
                if (specifications.heal) {
                    switch (true) { //12900
                        // case energy >= 12750: tough = 10; heal = 15; claim = 14; move = 10; break
                        //case energy >= 12670: tough = 2; heal = 4; claim = 19; move = 6; break //lvl7 enemy room
                        case energy >= 12750: tough = 9; heal = 18; claim = 13; move = 10; break
                        case energy >= 5600: tough = 10; heal = 18; claim = 1; move = 8; break
                    }
                }
                else {
                    switch (true) {
                        case energy >= 12500: claim = 20; move = 6; break
                        case energy >= 3250: claim = 5; move = 5; break
                        case energy >= 2600: claim = 4; move = 4; break
                        case energy >= 1950: claim = 3; move = 3; break
                        case energy >= 1300: claim = 2; move = 2; break
                        case energy >= 650: claim = 1; move = 1; break
                    }
                }
            }; break

        case 'harvest mineral': //switch (true) {
            if (specifications.container) {
                if (energy > 2300) { move = 25; work = 25 }
                else { move = 15; work = 15 }
            }
            else if (specifications.lab) { move = 25; carry = 1; work = 24 }
            else {
                const workMoveCarry = tools.calculateHarvestMineral(specifications.distance, energy);
                work = workMoveCarry.work; carry = workMoveCarry.carry; move = workMoveCarry.move
            }
            break
        case 'repair':
            if (energy < 4500) { specifications = false }
            if (specifications) { if (!specifications.boost) { specifications = false } }
            if (specifications) {
                if (specifications.boost) {
                    switch (true) {
                        case energy >= 4500:
                            move = moveByBoost()
                            carry = 10
                            work = 50 - carry - move
                            break
                    }
                }
            }
            else {
                switch (true) {
                    // case energy >= 4000: work = 30; carry = 2; move = 18; break
                    case energy >= 3350: work = 17; carry = 8; move = 25; break
                    case energy >= 2300: work = 10; carry = 8; move = 18; break
                    case energy >= 1800: work = 8; carry = 6; move = 14; break
                    case energy >= 1600: work = 8; carry = 4; move = 12; break
                    case energy >= 1300: work = 6; carry = 4; move = 10; break
                    case energy >= 1050: work = 5; carry = 3; move = 8; break
                    case energy >= 900: work = 4; carry = 3; move = 7; break
                    case energy >= 800: work = 4; carry = 2; move = 6; break
                    case energy >= 650: work = 3; carry = 2; move = 5; break
                    case energy >= 550: work = 3; carry = 1; move = 4; break
                    case energy >= 500: work = 2; carry = 2; move = 4; break
                    case energy >= 400: work = 2; carry = 1; move = 3; break
                    case energy >= 300: work = 2; carry = 1; move = 1; break
                }
            }
            break
        case 'harvest source':
            let link, container, requiredWorkers
            if (specifications) {
                if (specifications.link) link = true; if (specifications.container) container = true;
                if (specifications.requiredWorkers) requiredWorkers = specifications.requiredWorkers
            }
            if (link) {
                const bodyInfo = myRooms[specifications.roomName].room.memory.harvestSource
                if (settings.tasks.harvestSource_boost) { work = move = settings.tasks.harvestSource_boost; carry = 4; }
                else if (settings.tasks.harvestSource_ecoBody
                    && _.filter(Game.powerCreeps, c => c.room).filter(c => c.room.name == specifications.roomName && c.powers).find(c => c.ticksToLive && c.powers[PWR_REGEN_SOURCE]) === undefined) { work = move = settings.tasks.harvestSource_ecoBody; carry = 2 }
                else if (energy >= 5600 && bodyInfo && bodyInfo[specifications.id]) {
                    work = bodyInfo[specifications.id].work;
                    carry = bodyInfo[specifications.id].carry;
                    move = bodyInfo[specifications.id].move
                }
                else if (energy >= 3550) { work = 21; carry = 4; move = 25 }
                else if (energy >= 1600) { work = 10; carry = 2; move = 10; }
                else if (energy >= 1000) { work = 6; carry = 2; move = 6; }
                else { work = 2; carry = 1; move = 1; }
            }
            else {
                if (container && requiredWorkers === 1) {
                    switch (true) {
                        case energy <= 300: work = 2; move = 1; break
                        case energy == 350: work = 3; move = 1; break
                        case energy == 400: work = 3; move = 2; break
                        case energy == 450: work = 4; move = 1; break
                        case energy == 500: work = 4; move = 2; break
                        case energy == 550: work = 5; move = 1; break
                        case energy == 600: work = 5; move = 2; break
                        case energy == 650: work = 5; move = 3; break
                        case energy == 700: work = 5; move = 4; break
                        case energy >= 750: work = 5; move = 5; break
                    }
                }
                else {
                    switch (true) {
                        case energy >= 3250: work = 15; carry = 10; move = 25; break
                        case energy >= 2300: work = 10; carry = 8; move = 18; break
                        case energy >= 1800: work = 8; carry = 6; move = 14; break
                        case energy >= 1400: work = 6; carry = 5; move = 11; break
                        case energy >= 1300: work = 6; carry = 4; move = 10; break
                        case energy >= 1050: work = 6; carry = 3; move = 6; break
                        case energy >= 900: work = 5; carry = 1; move = 7; break
                        case energy >= 800: work = 5; carry = 1; move = 5; break
                        case energy >= 650: work = 3; carry = 2; move = 5; break
                        case energy >= 550: work = 3; carry = 1; move = 4; break
                        case energy >= 500: work = 2; carry = 2; move = 4; break
                        case energy >= 400: work = 2; carry = 1; move = 3; break
                        case energy >= 250: work = 1; carry = 1; move = 2; break
                    }
                }
            }
            break
        case 'upgrade':
            switch (true) {
                case energy >= 4500 && specifications.roomLevel == 8: work = 15; carry = 10; move = 25; break
                case energy >= 4500: work = 37; carry = 3; move = 10; break
                case energy >= 2300: work = 14; carry = 2; move = 16; break
                case energy >= 1800: work = 8; carry = 6; move = 14; break
                case energy >= 1300: work = 6; carry = 4; move = 10; break
                case energy >= 1050: work = 5; carry = 3; move = 8; break
                case energy >= 900: work = 4; carry = 3; move = 7; break
                case energy >= 800: work = 4; carry = 2; move = 6; break
                case energy >= 650: work = 3; carry = 2; move = 5; break
                case energy >= 550: work = 3; carry = 1; move = 4; break
                case energy >= 500: work = 2; carry = 2; move = 4; break
                case energy >= 400: work = 2; carry = 1; move = 3; break
                case energy >= 300: work = 2; carry = 1; move = 1; break
            }; break
        case 'manage':
            if (specifications.roads) { return calculateBody([MOVE, CARRY, CARRY]) }
            else { return calculateBody([MOVE, CARRY]) }
    }
    body.pushN(TOUGH, tough); body.pushN(ATTACK, attack); body.pushN(WORK, work)
    body.pushN(CARRY, carry); body.pushN(MOVE, move); body.pushN(CLAIM, claim)
    body.pushN(HEAL, heal)
    return body
    function moveByBoost() {
        if (!specifications || !specifications.spawnRoom) { return 25 }
        if (specifications.spawnRoom.resources['XZHO2'] && specifications.spawnRoom.resources['XZHO2'] >= 300) { return 10 }
        else if (specifications.spawnRoom.resources['ZHO2'] && specifications.spawnRoom.resources['ZHO2'] >= 420) { return 14 }
        else if (specifications.spawnRoom.resources['ZH'] && specifications.spawnRoom.resources['ZH'] >= 600) { return 20 }
        else { return 25 }
    }
    function calculateBody(mainBody, reservedBodySlots = 0) {
        let newBody = []
        const mainBodyCost = spawnLogick.getPrice(mainBody)
        const mainBodyLength = mainBody.length
        let countMainBody = Math.floor(energy / mainBodyCost)
        if (countMainBody * mainBodyLength > 50 - reservedBodySlots) { countMainBody = Math.floor((50 - reservedBodySlots) / mainBodyLength) }

        let dirtBody = []
        for (let i = 0; i < countMainBody; i++) { dirtBody = dirtBody.concat(mainBody) }
        let M = dirtBody.filter(b => b == MOVE)
        let C = dirtBody.filter(b => b == CARRY)
        let W = dirtBody.filter(b => b == WORK)
        let A = dirtBody.filter(b => b == ATTACK)
        let H = dirtBody.filter(b => b == HEAL)
        let R = dirtBody.filter(b => b == RANGED_ATTACK)
        let T = dirtBody.filter(b => b == TOUGH)
        let CL = dirtBody.filter(b => b == CLAIM)
        newBody = newBody.concat(T, CL, C, W, A, R, M, H)

        return newBody
    }
}
spawnLogick.getPrice = (body) => {
    let price = 0;
    body.forEach((part) => { price += BODYPART_COST[part] })
    return price
}
MyRoom.prototype.spawnCreeps = function () {
    const cpu = settings.writePerformanceLog ? Game.cpu.getUsed() : 0
    const room = Game.rooms[this.name]

    if (!this.structures.spawns.length) { this.queues.spawn = []; settings.writePerformanceLog ? performance.newLog(cpu, 'Room.prototype.spawn') : false; return }
    const queue = this.queues.spawn
    if (!queue.length) { settings.writePerformanceLog ? performance.newLog(cpu, 'Room.prototype.spawn') : false; return }
    queue.sort((a, b) => a.priority - b.priority || a.GameTime - b.GameTime)
    const spawns = idToObj(this.structures.spawns)
    let freeSpawns = spawns.filter(sp => !sp.spawning).sort((a, b) => (b.effects ? (b.effects.length ? 1 : 0) : 0) - (a.effects ? (a.effects.length ? 1 : 0) : 0))
    if (!freeSpawns.length) { settings.writePerformanceLog ? performance.newLog(cpu, 'Room.prototype.spawn') : false; return }
    let energyUsed = 0

    for (let i = 0; i < queue.length; i++) {
        if (this.settings.debug.spawn) { console.log('spawn:', i, `freeSpawns.length:${freeSpawns.length},`) }
        const task = queue[i];

        if (!freeSpawns.length) { settings.writePerformanceLog ? performance.newLog(cpu, 'Room.prototype.spawn') : false; continue }
        const spawn = freeSpawns[0] //getSpawn(this.name)
        if (this.settings.debug.spawn) { console.log('spawn:', i, `spawn:${spawn}`) }
        if (!spawn) { settings.writePerformanceLog ? performance.newLog(cpu, 'Room.prototype.spawn') : false; continue }

        if (task.creepPrice > this.room.energyCapacityAvailable) {
            if (this.settings.debug.spawn) { console.log(`room: ${this.name}  spawn creep was spliced, not enouth max energy`) }
            i -= 1; queue.splice(queue.indexOf(task), 1); continue
        }
        if (this.settings.debug.spawn) { console.log('spawn:', i, `(room.energyAvailable - energyUsed < task.creepPrice) && !this.zeroManagers():${(room.energyAvailable - energyUsed < task.creepPrice) && !this.zeroManagers()}`) }
        if ((room.energyAvailable - energyUsed < task.creepPrice) && !this.zeroManagers()) { settings.writePerformanceLog ? performance.newLog(cpu, 'Room.prototype.spawn') : false; return }
        const creepName = getCreepName(task.role)
        task.memory.spawnRoom = this.name
        if (this.settings.debug.spawn) { console.log('spawn:', i, `13:${this.zeroManagers() && i == 0 && task.role == 'manage'}`) }
        if (this.zeroManagers() && i == 0 && task.role == 'manage') {
            console.log(`spawn manage`, this.name, this.room.energyAvailable < this.room.energyCapacityAvailable, this.room.energyAvailable > 300);
            if (this.room.energyAvailable < this.room.energyCapacityAvailable) { task.creepBody = spawnLogick.getBody(task.role, (this.room.energyAvailable > 300) ? this.room.energyAvailable : 300) }
        }

        if (this.zeroManagers() && i == 0 && (task.role == 'harvest source' && !_.filter(Memory.creeps, creepMemory => creepMemory.role == 'harvest source' && creepMemory.roomName == this.name).length)) {
            console.log(this.name, this.room.energyAvailable < this.room.energyCapacityAvailable, this.room.energyAvailable > 300);
            if (this.room.energyAvailable < this.room.energyCapacityAvailable) { task.creepBody = spawnLogick.getBody(task.role, (this.room.energyAvailable > 300) ? this.room.energyAvailable : 300) }
        }
        let result = spawn.spawnCreep(task.creepBody, creepName, { memory: task.memory })

        if (result === OK) {
            this.registerSheduledTask('update extensions')
            this.registerSheduledTask('update boost')
            //boost
            // if (task.role == 'upgrade') { if (this.level < 8) { this.registerBoost(task.role, creepName, task.creepBody) } }
            if (task.role == 'upgrade') {
                if (this.level < 8) { this.registerBoost(task.role, creepName, task.creepBody) }
                else if (settings.tasks.upgrade_lvl8_boost) { this.registerBoost(task.role, creepName, task.creepBody, WORK) }
            }

            else if (task.role == 'repair') {
                if (settings.tasks.repair_boost) { this.registerBoost(task.role, creepName, task.creepBody) }
                //     if (this.constructionSites.length) { this.registerBoost(task.role, creepName, task.creepBody) }
                //     else { this.registerBoost(task.role, creepName, task.creepBody, WORK) }
                // }
            }
            else if (task.role == 'attackRoom_range' || task.role == 'attackRoom') { this.registerBoost(task.role, creepName, task.creepBody) }//, TOUGH); this.registerBoost(task.role, creepName, task.creepBody, HEAL) }
            else if (task.role == 'dismantleRoom') { this.registerBoost(task.role, creepName, task.creepBody) }
            else if (task.role == 'punchingBag') { this.registerBoost(task.role, creepName, task.creepBody, TOUGH); this.registerBoost(task.role, creepName, task.creepBody, HEAL) }
            else if (task.role == 'dryer') { this.registerBoost(task.role, creepName, task.creepBody, TOUGH) }
            else if (task.role == 'rangedAttack') { this.registerBoost(task.role, creepName, task.creepBody) }
            else if (task.role == 'dismantle') { this.registerBoost(task.role, creepName, task.creepBody) }
            else if (task.role == 'heal') { this.registerBoost(task.role, creepName, task.creepBody) }
            else if (task.role == 'claim' && (task.creepBody.filter(b => b == MOVE).length == 6 || task.creepBody.filter(b => b == HEAL).length)) { if (task.creepBody.filter(b => b == HEAL).length) { this.registerBoost(task.role, creepName, task.creepBody) } else { this.registerBoost(task.role, creepName, task.creepBody, MOVE) } }
            else if (task.role == 'build base') { this.registerBoost(task.role, creepName, task.creepBody, false, { task: task.memory.task }) }
            else if (task.role == 'transfer') {
                if (tasks[task.memory.task]) { if (tasks[task.memory.task].boost) { this.registerBoost(task.role, creepName, task.creepBody) } }
            }
            else if (task.role == 'harvest deposit' && settings.tasks.useBoostForHarvestDeposit) { this.registerBoost(task.role, creepName, task.creepBody) }
            else if (task.role == 'harvest source' && settings.tasks.harvestSource_boost) {
                this.registerBoost(task.role, creepName, task.creepBody, WORK)
            }
            else if (task.role == 'harvest mineral' && settings.tasks.useBoostForHarvestMineral) {
                const mineral = Object.values(this.minerals)[0].resourceType
                if (cache.resources[mineral] < cache.countOfMyRooms * 2000) {
                    this.registerBoost(task.role, creepName, task.creepBody, WORK); this.registerBoost(task.role, creepName, task.creepBody, CARRY)
                }
            }
            else if (task.role == 'destroyPower') {
                if (task.creepBody.filter(b => b == TOUGH).length) { this.registerBoost(task.role, creepName, task.creepBody, TOUGH) }
                if (task.creepBody.filter(b => b == MOVE).length == 10) { this.registerBoost(task.role, creepName, task.creepBody, MOVE) }
                this.registerBoost(task.role, creepName, task.creepBody, ATTACK)
            }
            else if (task.role == 'healPower') {
                const moveBody = task.creepBody.filter(b => b == MOVE).length
                if (moveBody == 10 && task.creepBody / moveBody < 2) { this.registerBoost(task.role, creepName, task.creepBody, MOVE) }
                this.registerBoost(task.role, creepName, task.creepBody, HEAL)
            }
            else if (task.role == 'defend_attack') {
                if (task.creepBody.filter(b => b == MOVE).length == 10) { this.registerBoost(task.role, creepName, task.creepBody, MOVE) }
                this.registerBoost(task.role, creepName, task.creepBody, ATTACK)
            }
            else if (task.role == 'attack' || task.role == 'partizan_rangedAttack' || task.role == 'partizan_attack') { this.registerBoost(task.role, creepName, task.creepBody) }
            energyUsed += task.creepPrice; i -= 1; queue.splice(queue.indexOf(task), 1);
            freeSpawns.splice(0, 1)
        }
    }

    settings.writePerformanceLog ? performance.newLog(cpu, 'MyRoom.prototype.spawn') : false
}
function getCreepName(role) {
    const nameList = ["Andrej", "Viktoriya", "Dmitrij", "Ekaterina", "Ivan", "Kseniya", "Lev", "Marina", "Nikolaj", "Ol'ga", "Pavel", "Roman", "Svetlana", "Tat'yana", "Ul'yana", "YAkov", "Alina", "Boris", "Vera", "Georgij", "Dar'ya", "Evgenij", "ZHanna", "Zoya", "Il'ya", "Kirill", "Lyubov'", "Maksim", "Nadezhda", "Oksana", "Polina", "Radmila", "Sofiya", "Timur", "Usman", "Fedor", "Hariton", "Cvetana", "CHeslav", "SHarif", "SHCHerbak", "YUliya", "YAropolk", "Agata", "Bogdan", "Vitalij", "Galina", "Denis", "Elena", "ZHanar", "Zahar", "Irina", "Karina", "Larisa", "Margarita", "Nina", "Oktyabrina", "Petr", "Ruslan", "Sergej", "Taisiya", "Ul'yana", "Feliks", "Haritina", "Carevna", "CHeslava", "SHamil'", "SHCHur", "YUrij", "YAroslav", "Adelina", "Borislav", "Viktor", "Georgina", "Daniil", "Efim", "ZHorzh", "Zul'fiya", "Ilona", "Klavdiya", "Lidiya", "Makar", "Natal'ya", "Oleg", "Petronila", "Raisa", "Semyon", "Tamara", "Ul'yana", "Fatima", "Hristofor", "Celestina", "CHulpan", "SHarlotta", "SHCHegoliha", "YUdif'", "YAdviga"]
    if (settings.username == 'OneWayIsWar') {
        switch (role) {
            case 'harvest source': return 'H' + Math.floor(Math.random() * 1000); break
            case 'harvest mineral': return 'mH' + Math.floor(Math.random() * 100); break

            case 'harvest deposit': return 'DH' + Math.floor(Math.random() * 100); break
            case 'destroyPower': return 'DP' + Math.floor(Math.random() * 100); break
            case 'healPower': return 'HP' + Math.floor(Math.random() * 100); break
            case 'transferPower': return 'TP' + Math.floor(Math.random() * 100); break
            case 'transfer': return `T${Math.floor(Math.random() * 100)}`; break
            case 'repair': return `R${Math.floor(Math.random() * 100)}`; break
            case 'upgrade': return `U${Math.floor(Math.random() * 100)}`; break
            case 'dismantle': return `D${Math.floor(Math.random() * 100)}`; break
            case 'build base': return `B${Math.floor(Math.random() * 100)}`; break
            case 'claim': return `C${Math.floor(Math.random() * 100)}`; break
            case 'observer': return `O${Math.floor(Math.random() * 100)}`; break
            case 'manage': return `S${Math.floor(Math.random() * 100)}`; break
            case 'defender': return `D${Math.floor(Math.random() * 100)}`; break
            case 'LinkManager': return `L${Math.floor(Math.random() * 100)}`; break
            case 'rangedAttack': return `RA${Math.floor(Math.random() * 100)}`; break
            case 'scoutKiller': return 'SK_' + gameTime; break
            case 'labManager': return 'LM_' + gameTime; break
            case 'defend_rangedAttack': return `DR${Math.floor(Math.random() * 100)}`; break
            case 'punchingBag': return `PB${Math.floor(Math.random() * 100)}`; break
            case 'dismantleRoom': return `DR${Math.floor(Math.random() * 100)}`; break
            case 'attackRoom': return `AR${Math.floor(Math.random() * 100)}`; break
            case 'attackRoom_range': return `ARR${Math.floor(Math.random() * 100)}`; break

            default: return ('c' + Math.floor(Math.random() * 10000)); break;
        }
    }
    else if (settings.username == 'champion') { return ('q' + Math.floor(Math.random() * 1000)) }
    else if (settings.username == 'Pacificius') { return ('w' + Math.floor(Math.random() * 1000)) }
    else if (settings.username == 'agyacska') { return ('X' + Math.floor(Math.random() * 1000)) }
    else if (settings.username == 'Tornado_Tech') { return tools.pickRandom(nameList) }
    else { return ('c' + Math.floor(Math.random() * 10000)) }
}
MyRoom.prototype.registerSpawn = function (specifications) {
    if (!this.structures.spawns.length) { return }
    const role = specifications.role
    const priority = specifications.priority
    const creepBody = specifications.creepBody
    const memory = specifications.memory
    const creepPrice = tools.getCreepPrice(creepBody)
    const newSpawnTask = {
        tick: gameTime,
        role: role,
        priority: priority,
        creepBody: creepBody,
        creepPrice: creepPrice,
        memory: memory,
    }
    if (creepBody.length == 0 || creepBody.length > 50) { console.log(this.name, ` error with body, role: ${role}\n${creepBody}`); return }
    this.queues.spawn.push(newSpawnTask)
}
MyRoom.prototype.calculateBodyOfHarvestSource = function () {    
    // need update for boosted sources
    // Memory.calculateBodyOfHarvestSource = {room:this.name}
    const storageLinkInfo = _.find(this.structures.links, l => l.type == 'storage')
    if (!storageLinkInfo) return
    const storageLink = _obj(storageLinkInfo.id)
    if (!storageLink) return
    this.room.memory.harvestSource = { time: gameTime }
    Object.keys(this.tasks.harvestSource).forEach(sourceId => {
        const results = []
        const distanceToSource = this.tasks.harvestSource[sourceId].distance
        const sourceLink = _obj(this.tasks.harvestSource[sourceId].link); if (!sourceLink) return
        const distanceToLink = sourceLink.pos.getRangeTo(storageLink); if (!distanceToLink) return

        for (let work = 1; work < 48; work++) {
            for (let carry = 1; carry < 49 - work; carry++) {
                let lifeTime = 1500, harvested = 0, actions = 0, linkStore = 0, linkCooldown = 0, creepStore = 0
                const creepCapacity = carry * 50
                const move = work >= 25 ? 50 - work - carry : (50 - carry < work ? work : 50 - carry - work)

                const fatigue = work * 2, fatigueRecovery = move * 2, tickToRecovery = Math.ceil(fatigue / fatigueRecovery)

                const harvestPower = work * 2
                if (tickToRecovery) lifeTime -= distanceToSource * tickToRecovery
                let energyInSource = 3000
                for (let tick = 1; tick < lifeTime; tick++) {
                    if (linkCooldown) linkCooldown--

                    if (tick % 300 == 0) { energyInSource = 3000 }
                    if (creepCapacity - creepStore > harvestPower) harvest()
                    else { if (transferToLink() && creepStore > harvestPower) { harvest() } }


                    if (linkStore == 800 && !linkCooldown) { linkStore = 0; linkCooldown = distanceToLink }
                }
                function harvest() {
                    if (energyInSource >= harvestPower) {
                        creepStore += harvestPower; harvested += harvestPower; energyInSource -= harvestPower; actions++
                    }
                    else if (energyInSource > 0) {
                        creepStore += energyInSource; harvested += energyInSource; energyInSource = 0; actions++
                    }
                }
                function transferToLink() {
                    const freeLinkStore = 800 - linkStore
                    if (freeLinkStore) {
                        if (creepStore < freeLinkStore) { linkStore += creepStore; creepStore = 0; actions++; return true }
                        else { linkStore += freeLinkStore; creepStore -= freeLinkStore; actions++; return true }
                    }
                }
                results.push({ work, carry, move, harvested, actions })
            }
        }
        if (results.length) {
            results.sort((a, b) => b.harvested - a.harvested || a.actions - b.actions)
            this.room.memory.harvestSource[sourceId] = { work: results[0].work, carry: results[0].carry, move: results[0].move }            
        }
        // Memory.calculateBodyOfHarvestSource[sourceId] = results
    })
}