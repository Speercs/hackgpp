'use strict'
//2023.08.06
global.survey = {}

survey.surveyRooms = function () {
    Object.values(Game.rooms).forEach(room => {
        const cpu = settings.writePerformanceLog ? Game.cpu.getUsed() : 0
        if (!myRooms[room.name]) {
            const newRoom = new MyRoom(room.name)
            myRooms[room.name] = newRoom
            if (newRoom.my) { newRoom.updateStructures() }
        }
        else {
            if (myRooms[room.name].deposits) {
                Object.keys(myRooms[room.name].deposits).forEach(id => {
                    const deposit = _obj(id)
                    if (deposit) { myRooms[room.name].deposits[id].lastCooldown = deposit.lastCooldown }
                    else { delete myRooms[room.name].deposits[id] }
                })
            }
            if (myRooms[room.name].powerBanks) {
                Object.keys(myRooms[room.name].powerBanks).forEach(id => {
                    const powerBank = _obj(id)
                    if (powerBank) { myRooms[room.name].powerBanks[id].ticksToDecay = powerBank.ticksToDecay; myRooms[room.name].powerBanks[id].hits = powerBank.hits }
                    else { delete myRooms[room.name].powerBanks[id] }
                })
            }
        }
        settings.writePerformanceLog ? performance.newLog(cpu, 'surveyRooms-Game.rooms') : false
    })
    tools.updateMyRoomsList()
    //-------------------------------My ROOMS -------------------------------
    let activeRooms
    if (each100) { activeRooms = cache.myRooms.filter(mr => !mr.room.memory.status).length }
    cache.myRooms.sort((a, b) => a.room.controller.ticksToDowngrade - b.room.controller.ticksToDowngrade).forEach(myRoom => {
        const myRoomLog = myRoom ? myRoom.name : 'room name unknown'
        myRoom.room = Game.rooms[myRoom.name]; myRoom.cache = {}
        const status = myRoom.status = myRoom.room.memory.status; myRoom.halted = (status == 'halted');
        myRoom.underAttack = myRoom.room.memory.underAttack
        const timeOutForTurnOffUnderAttack = settings.timeOutForTurnOffUnderAttack || 10000
        if (gameTime > myRoom.room.memory.underAttackTick + timeOutForTurnOffUnderAttack) {
            delete myRoom.room.memory.underAttack; delete myRoom.underAttack
        }
        if (Memory.roomsToUnclaim.includes(myRoom.name)) { myRoom.unclaim = true }
        if (status !== 'halted' && status !== 'support') { myRoom.towers = idToObj(myRoom.structures.towers) }
        if (!myRoom.room) { console.log(`error myRoom, ${myRoom.name}`); return }
        myRoom.terminal = myRoom.room.terminal; myRoom.storage = myRoom.room.storage
        myRoom.creeps = _.filter(Game.creeps, creep => creep.memory.roomName == myRoom.name)
        if (myRoom.underAttack && gameTime - myRoom.underAttackTick > timeOutForTurnOffUnderAttack) { delete myRoom.underAttack; delete myRoom.underAttackTick }
        try { myRoom.updateManageMicroTasks() } catch (error) { console.log(`${myRoomLog}`, 'updateManageMicroTasks', error + `\n${error.stack}`) }
        if (each100 && settings.rotateRooms && status !== 'halted' && status !== 'prepare to halt') {
            if (myRoom.tasks.harvestMineral.requiredWorkers && status) { myRoom.setStatus(''); activeRooms++ }
            else if (activeRooms < settings.activeRooms && status) { myRoom.setStatus(''); activeRooms++ }
            else if (activeRooms > settings.activeRooms && status !== 'support' && status !== 'prepare to support') { myRoom.setStatus('support'); activeRooms-- }

            // if (myRoom.structures.factory && _obj(myRoom.structures.factory) && _obj(myRoom.structures.factory).level === undefined) {
            //     myRoom.setStatus('support')
            // }
            // }
        }
        myRoom.enemies = idToObj(_.filter(cache.enemies, e => e.pos.roomName == myRoom.name).map(e => e.id))
        switch (status) {
            case 'prepare to halt':
                myRoom.prepareToChangeStatus()
                try { myRoom.runSheduledTasks() } catch (error) { console.log(`${myRoomLog}`, 'runSheduledTasks', error + `\n${error.stack}`) }
                try { myRoom.updateEnemies() } catch (error) { console.log(`${myRoomLog}`, 'updateEnemies', error + `\n${error.stack}`) }
                if (myRoom.level > 4) { try { myRoom.linkLogick() } catch (error) { console.log(`${myRoomLog}`, 'linkLogick', error + `\n${error.stack}`) } }
                //creeps:
                try { myRoom.manage() } catch (error) { console.log(`${myRoomLog}`, 'manage', error + `\n${error.stack}`) }
                Object.keys(myRoom.tasks.harvestSource).forEach(sourceId => { try { myRoom.harvestSource(sourceId) } catch (error) { console.log(`${myRoomLog}`, 'harvestSource', `sourceId:${sourceId}`, error + `\n${error.stack}`) } })
                try { myRoom.upgrade() } catch (error) { console.log(`${myRoomLog}`, 'upgrade', error + `\n${error.stack}`) }
                try { myRoom.defend() } catch (error) { console.log(`${myRoomLog}`, 'defend', error + `\n${error.stack}`) }
                try { myRoom.repair() } catch (error) { console.log(`${myRoomLog}`, 'repair', error + `\n${error.stack}`) }
                break
            case 'prepare to support':
                myRoom.prepareToChangeStatus()
                try { myRoom.runSheduledTasks() } catch (error) { console.log(`${myRoomLog}`, 'runSheduledTasks', error + `\n${error.stack}`) }
                try { myRoom.updateEnemies() } catch (error) { console.log(`${myRoomLog}`, 'updateEnemies', error + `\n${error.stack}`) }
                if (myRoom.level > 4) { try { myRoom.linkLogick() } catch (error) { console.log(`${myRoomLog}`, 'linkLogick', error + `\n${error.stack}`) } }
                if (myRoom.level > 6) { try { myRoom.factoryRun() } catch (error) { console.log(`${myRoomLog}`, 'factoryRun', error + `\n${error.stack}`) } }
                //creeps:
                try { myRoom.manage() } catch (error) { console.log(`${myRoomLog}`, 'manage', error + `\n${error.stack}`) }
                Object.keys(myRoom.tasks.harvestSource).forEach(sourceId => { try { myRoom.harvestSource(sourceId) } catch (error) { console.log(`${myRoomLog}`, 'harvestSource', `sourceId:${sourceId}`, error + `\n${error.stack}`) } })
                try { myRoom.upgrade() } catch (error) { console.log(`${myRoomLog}`, 'upgrade', error + `\n${error.stack}`) }
                try { myRoom.defend() } catch (error) { console.log(`${myRoomLog}`, 'defend', error + `\n${error.stack}`) }
                try { myRoom.repair() } catch (error) { console.log(`${myRoomLog}`, 'repair', error + `\n${error.stack}`) }
                if (myRoom.room.memory.labsBoostMode) { try { myRoom.boostCreeps() } catch (error) { console.log(`${myRoomLog}`, 'boostCreeps', error) } }
                break
            case 'support':
                try { myRoom.runSheduledTasks() } catch (error) { console.log(`${myRoomLog}`, 'runSheduledTasks', error + `\n${error.stack}`) }
                try { myRoom.updateEnemies() } catch (error) { console.log(`${myRoomLog}`, 'updateEnemies', error + `\n${error.stack}`) }
                if (myRoom.level > 4) { try { myRoom.linkLogick() } catch (error) { console.log(`${myRoomLog}`, 'linkLogick', error + `\n${error.stack}`) } }
                //creeps:
                try { myRoom.manage() } catch (error) { console.log(`${myRoomLog}`, 'manage', error + `\n${error.stack}`) }
                try { myRoom.upgrade() } catch (error) { console.log(`${myRoomLog}`, 'upgrade', error + `\n${error.stack}`) }
                if (myRoom.room.memory.labsBoostMode) { try { myRoom.boostCreeps() } catch (error) { console.log(`${myRoomLog}`, 'boostCreeps', error) } }

                if (myRoom.level > 6) { try { myRoom.factoryRun() } catch (error) { console.log(`${myRoomLog}`, 'factoryRun', error + `\n${error.stack}`) } }
                break
            case 'halted':

                break
            default:
                if (scriptLoadTime) { try { myRoom.tasks.harvestMineral.workPos = tools.getWorkPosition(myRoom.tasks.harvestMineral.id, 'harvestMineral'); myRoom.updateMineralContainer() } catch (error) { console.log(`${myRoomLog}`, 'updateMineralContainer', error + `\n ${error.stack}`) } }
                try { myRoom.runSheduledTasks() } catch (error) { console.log(`${myRoomLog}`, 'runSheduledTasks', error + `\n${error.stack}`) }
                try { myRoom.updateEnemies() } catch (error) { console.log(`${myRoomLog}`, 'updateEnemies', error + `\n${error.stack}`) }

                try { myRoom.autoBuild() } catch (error) { console.log(`${myRoomLog}`, 'autoBuild', error + `\n${error.stack}`) }
                if (myRoom.level > 2) { try { myRoom.towersLogick() } catch (error) { console.log(`${myRoomLog}`, 'towersLogick', error + `\n${error.stack}`) } }
                if (myRoom.level > 4) { try { myRoom.linkLogick() } catch (error) { console.log(`${myRoomLog}`, 'linkLogick', error + `\n${error.stack}`) } }
                if (myRoom.level > 6) { try { myRoom.factoryRun() } catch (error) { console.log(`${myRoomLog}`, 'factoryRun', error + `\n${error.stack}`) } }
                if (myRoom.level == 8 && Game.cpu.bucket >= settings.bucket.processPower) { try { myRoom.processPower() } catch (error) { console.log(`${myRoomLog}`, 'processPower', error) } }
                if (myRoom.room.memory.labsBoostMode) { try { myRoom.boostCreeps() } catch (error) { console.log(`${myRoomLog}`, 'boostCreeps', error) } }
                //creeps:
                try { myRoom.manage() } catch (error) { console.log(`${myRoomLog}`, 'manage', error + `\n${error.stack}`) }
                Object.keys(myRoom.tasks.harvestSource).forEach(sourceId => { try { myRoom.harvestSource(sourceId) } catch (error) { console.log(`${myRoomLog}`, 'harvestSource', `sourceId:${sourceId}`, error + `\n${error.stack}`) } })
                if (myRoom.structures.extractor) { try { myRoom.harvestMineral() } catch (error) { console.log(`${myRoomLog}`, 'harvestMineral', error) } }
                try { myRoom.upgrade() } catch (error) { console.log(`${myRoomLog}`, 'upgrade', error + `\n${error.stack}`) }
                try { myRoom.defend() } catch (error) { console.log(`${myRoomLog}`, 'defend', error + `\n${error.stack}`) }
                try { myRoom.repair() } catch (error) { console.log(`${myRoomLog}`, 'repair', error + `\n${error.stack}`) }

                if (Game.cpu.bucket > settings.bucket.labsReaction) { try { myRoom.runReaction() } catch (error) { console.log(`${myRoomLog}`, 'runReaction', error + `\n${error.stack}`) } }
                myRoom.myVisual()
                break
        }

        if (each10) {
            switch (status) {
                case 'prepare to halt':
                    try { myRoom.updateManageMicroTasks() } catch (error) { console.log(`${myRoomLog}`, 'updateManageMicroTasks', error + `\n${error.stack}`) }
                    try { myRoom.manageTaskBaseManage() } catch (error) { console.log(`${myRoomLog}`, 'manageTaskBaseManage', error + `\n${error.stack}`) }
                    try { myRoom.spawnCreeps() } catch (error) { console.log(`${myRoomLog}`, 'spawnCreeps', error + `\n${error.stack}`) }
                    break;
                case 'prepare to support':
                    try { myRoom.updateManageMicroTasks() } catch (error) { console.log(`${myRoomLog}`, 'updateManageMicroTasks', error + `\n${error.stack}`) }
                    try { myRoom.manageTaskBaseManage() } catch (error) { console.log(`${myRoomLog}`, 'manageTaskBaseManage', error + `\n${error.stack}`) }
                    try { myRoom.spawnCreeps() } catch (error) { console.log(`${myRoomLog}`, 'spawnCreeps', error + `\n${error.stack}`) }
                    break;
                case 'support':
                    try { myRoom.updateManageMicroTasks() } catch (error) { console.log(`${myRoomLog}`, 'updateManageMicroTasks', error + `\n${error.stack}`) }
                    try { myRoom.manageTaskBaseManage() } catch (error) { console.log(`${myRoomLog}`, 'manageTaskBaseManage', error + `\n${error.stack}`) }
                    try { myRoom.manageTaskUpgrade() } catch (error) { console.log(`${myRoomLog}`, 'manageTaskUpgrade', error + `\n${error.stack}`) }
                    try { myRoom.spawnCreeps() } catch (error) { console.log(`${myRoomLog}`, 'spawnCreeps', error + `\n${error.stack}`) }
                    break;
                default:
                    try { myRoom.manageTaskBaseManage() } catch (error) { console.log(`${myRoomLog}`, 'manageTaskBaseManage', error + `\n${error.stack}`) }
                    try { myRoom.manageTaskHarvestSource() } catch (error) { console.log(`${myRoomLog}`, 'manageTaskHarvestSource', error + `\n${error.stack}`) }
                    try { myRoom.manageTaskUpgrade() } catch (error) { console.log(`${myRoomLog}`, 'manageTaskUpgrade', error + `\n${error.stack}`) }
                    try { myRoom.manageTaskDefend() } catch (error) { console.log(`${myRoomLog}`, 'manageTaskDefend', error + `\n${error.stack}`) }
                    try { myRoom.checkBoost() } catch (error) { console.log(`${myRoomLog}`, 'checkBoost', error + `\n${error.stack}`) }
                    try { myRoom.updateManageMicroTasks() } catch (error) { console.log(`${myRoomLog}`, 'updateManageMicroTasks', error + `\n${error.stack}`) }
                    try { myRoom.updateDroppedResources() } catch (error) { console.log(`${myRoomLog}`, 'updateDroppedResources', error + `\n${error.stack}`) }
                    try { myRoom.updateTombstones() } catch (error) { console.log(`${myRoomLog}`, 'updateTombstones', error + `\n${error.stack}`) }
                    try { myRoom.spawnCreeps() } catch (error) { console.log(`${myRoomLog}`, 'spawnCreeps', error + `\n${error.stack}`) }
                    break;
            }
        }

        if (each100) {
            switch (status) {
                case 'prepare to halt':
                    try { myRoom.updateStructures() } catch (error) { console.log(`${myRoomLog}`, 'updateStructures', error + `\n${error.stack}`) }
                    try { myRoom.updateTaskUpgrade() } catch (error) { console.log(`${myRoomLog}`, 'updateTaskUpgrade', error + `\n${error.stack}`) }
                    if (myRoom.tasks.harvestMineral.regenMineral && gameTime > myRoom.tasks.harvestMineral.regenMineral) myRoom.updateMineralRegeneration()
                    break
                case 'prepare to support':
                    try { myRoom.updateTaskBaseManage() } catch (error) { console.log(`${myRoomLog}`, 'updateTaskBaseManage', error + `\n${error.stack}`) }
                    try { myRoom.updateStructures() } catch (error) { console.log(`${myRoomLog}`, 'updateStructures', error + `\n${error.stack}`) }
                    try { myRoom.updateTaskUpgrade() } catch (error) { console.log(`${myRoomLog}`, 'updateTaskUpgrade', error + `\n${error.stack}`) }
                    if (myRoom.tasks.harvestMineral.regenMineral && gameTime > myRoom.tasks.harvestMineral.regenMineral) myRoom.updateMineralRegeneration()
                    break
                case 'support':
                    try { myRoom.updateTaskBaseManage() } catch (error) { console.log(`${myRoomLog}`, 'updateTaskBaseManage', error + `\n${error.stack}`) }
                    try { myRoom.updateStructures() } catch (error) { console.log(`${myRoomLog}`, 'updateStructures', error + `\n${error.stack}`) }
                    try { myRoom.updateTaskUpgrade() } catch (error) { console.log(`${myRoomLog}`, 'updateTaskUpgrade', error + `\n${error.stack}`) }
                    if (myRoom.tasks.harvestMineral.regenMineral && gameTime > myRoom.tasks.harvestMineral.regenMineral) myRoom.updateMineralRegeneration()
                    break
                case 'halted':
                    break
                default:
                    try { myRoom.updateStructures() } catch (error) { console.log(`${myRoomLog}`, 'updateStructures', error + `\n${error.stack}`) }
                    try { myRoom.updateTaskBaseManage() } catch (error) { console.log(`${myRoomLog}`, 'updateTaskBaseManage', error + `\n${error.stack}`) }
                    // try { myRoom.updateTaskRepair() } catch (error) { console.log(`${myRoomLog}`, 'updateTaskRepair', error) }
                    try { myRoom.updateTaskUpgrade() } catch (error) { console.log(`${myRoomLog}`, 'updateTaskUpgrade', error + `\n${error.stack}`) }
                    if (myRoom.tasks.harvestMineral.regenMineral && gameTime > myRoom.tasks.harvestMineral.regenMineral) myRoom.updateMineralRegeneration()
                    break
            }
        }
        if (each1000 || (gameTime == settings.scriptLoadTime + 1)) { try { myRoom.updateNukes(); myRoom.updateTimeToLandForNukes() } catch (error) { console.log(`${myRoomLog}`, 'updateNukes', error + `\n${error.stack}`) } }
        if (!status && ((!myRoom.room.memory.labs.reaction && each100) || gameTime % 2000 == 0)) { try { myRoom.updateLabReaction() } catch (error) { console.log(`${myRoomLog}`, 'updateLabReaction', error + `\n${error.stack}`) } }
    })
    Object.values(myRooms).filter(r => !r.my && Game.rooms[r.name]).forEach(myRoom => {
        const cpu = settings.writePerformanceLog ? Game.cpu.getUsed() : 0
        const myRoomLog = myRoom ? myRoom.name : 'room name unknown'
        try { myRoom.updateEnemies() } catch (error) { console.log(`${myRoomLog}`, 'updateEnemies', error + `\n${error.stack}`) }

        if (myRoom.corridor) {
            const deposits = myRoom.room.find(FIND_DEPOSITS)
            if (deposits.length) {
                myRoom.deposits = {}
                deposits.forEach(deposit => myRoom.deposits[deposit.id] = { id: deposit.id, resourceType: deposit.depositType, pos: deposit.pos, lastCooldown: deposit.lastCooldown, accessibleFields: tools.calcAccessibleFields(deposit) })
            }
            const powerBanks = myRoom.room.find(FIND_STRUCTURES, { filter: { structureType: STRUCTURE_POWER_BANK } })
            if (powerBanks.length) {
                myRoom.powerBanks = {}
                powerBanks.forEach(powerBank => myRoom.powerBanks[powerBank.id] = { id: powerBank.id, pos: powerBank.pos, hits: powerBank.hits, ticksToDecay: powerBank.ticksToDecay, power: powerBank.power })
            }
        }

        settings.writePerformanceLog ? performance.newLog(cpu, 'surveyRooms-myRooms - !my') : false
    })
}
survey.updateScanRooms = function (name = false, onlyCorridors = false) {
    console.log(`updateScanRooms, onlyCorridors: ${onlyCorridors}`)
    const cpu = settings.writePerformanceLog ? Game.cpu.getUsed() : 0
    const scanRooms = []
    let roomNames = []
    if (name) { roomNames.push(name) }
    else { roomNames = cache.myRooms.filter(myRoom => myRoom.structures.observer).map(myRoom => myRoom.name) }
    roomNames.forEach(name => {
        const x = ~~name.match(/\d+/g)[0]
        const y = ~~name.match(/\d+/g)[1]
        const a = name.match(/[A-Z]/gi)[0]
        const b = name.match(/[A-Z]/gi)[1]
        if (x < 10) {
            if (a == 'W') { roomNames.push(`E${x}${b}${y}`) }
            else { roomNames.push(`W${x}${b}${y}`) }
        }
        if (y < 10) {
            if (b == 'N') { roomNames.push(`${a}${x}S${y}`) }
            else { roomNames.push(`${a}${x}N${y}`) }
        }
    })
    roomNames.forEach(name => {
        const x = ~~name.match(/\d+/g)[0]
        const y = ~~name.match(/\d+/g)[1]
        const a = name.match(/[A-Z]/gi)[0]
        const b = name.match(/[A-Z]/gi)[1]

        for (let i = 0; i <= 9; i++) {
            for (let n = 0; n <= 9; n++) {
                add(a, x - i, b, y - n, scanRooms, name, onlyCorridors)
                add(a, x + i, b, y + n, scanRooms, name, onlyCorridors)
                add(a, x + i, b, y - n, scanRooms, name, onlyCorridors)
                add(a, x - i, b, y + n, scanRooms, name, onlyCorridors)
            }
        }
    })
    // console.log(scanRooms);
    function add(a, x, b, y, scanRooms, name, onlyCorridors) {
        if (x % 10 !== 0 && y % 10 !== 0 && onlyCorridors) { return }
        const roomName = `${a}${x}${b}${y}`
        if (x <= 60 && y <= 60) {
            if (!scanRooms.includes(roomName)) {
                const distance = Game.map.findRoute(name, roomName).length
                if (distance < 10) { scanRooms.push(roomName) }
            }
        }
    }
    settings.writePerformanceLog ? performance.newLog(cpu, 'survey.updateScanRooms') : false
    return scanRooms
}
survey._updateScanRooms = function (name = false, onlyCorridors = false) {
    const cpu = settings.writePerformanceLog ? Game.cpu.getUsed() : 0
    const scanRooms = []
    let roomNames = []
    if (name) { roomNames.push(name) }
    else { roomNames = cache.myRooms.filter(myRoom => myRoom.structures.observer).map(myRoom => myRoom.name) }
    roomNames.forEach(name => {
        const x = ~~name.match(/\d+/g)[0]
        const y = ~~name.match(/\d+/g)[1]
        const a = name.match(/[A-Z]/gi)[0]
        const b = name.match(/[A-Z]/gi)[1]

        for (let i = 0; i <= 9; i++) {
            for (let n = 0; n <= 9; n++) {
                add(a, x - i, b, y - n, scanRooms, name, onlyCorridors)
                add(a, x + i, b, y + n, scanRooms, name, onlyCorridors)
                add(a, x + i, b, y - n, scanRooms, name, onlyCorridors)
                add(a, x - i, b, y + n, scanRooms, name, onlyCorridors)
            }
        }
    })
    // console.log(scanRooms);
    function add(a, x, b, y, scanRooms, name, onlyCorridors) {
        if (x % 10 !== 0 && y % 10 !== 0 && onlyCorridors) { return }
        const roomName = `${a}${x}${b}${y}`
        if (x <= 60 && y <= 60) {
            if (!scanRooms.includes(roomName)) {
                const distance = Game.map.findRoute(name, roomName).length
                if (distance < 10) { scanRooms.push(roomName) }
            }
        }
    }
    settings.writePerformanceLog ? performance.newLog(cpu, 'survey.updateScanRooms') : false
    return scanRooms
}
survey.scanByObservers = function () {
    const cpu = settings.writePerformanceLog ? Game.cpu.getUsed() : 0
    if (!cache.observer.taskList.length) { return }

    const baseRoom = cache.myRooms
    const observerList1 = _.filter(baseRoom, myRoom => myRoom.structures.observer)
    const observerList2 = observerList1.map(myRoom => _obj(myRoom.structures.observer))
    const roomsWithObserver = observerList2.map(o => o.room.name)
    const taskList = [].concat(cache.observer.taskList)

    //update roomDistances
    taskList.forEach(roomName => {
        roomsWithObserver.forEach(myRoom => {
            tools.getDistanceForRooms(roomName, myRoom)
        })
    })

    //scan
    const observersInWork = []
    taskList.forEach(roomName => {
        const readyObservers = _.filter(cache.map.roomDistance[roomName], cd => cd.distance < 11 && roomsWithObserver.includes(cd.roomName)).map(r => r.roomName) //&& roomsWithObserver.includes(cd.roomName)
        const freeObservers = readyObservers.filter(o => !observersInWork.includes(o))//.roomName))
        //console.log(`[0]:${JSON.stringify(readyObservers[0])} \n readyObservers:${readyObservers} \n roomsWithObserver:${roomsWithObserver}`);
        if (freeObservers.length) {
            const observerRoomName = freeObservers[0]
            const observer = observerList2.find(o => o.room.name == observerRoomName)
            if (observer) {
                const res = observer.observeRoom(roomName)
                if (res == OK) { observersInWork.push(observer.room.name); taskList.splice(taskList.indexOf(roomName), 1) }
            }
        }
        if (!readyObservers.length) {
            taskList.splice(taskList.indexOf(roomName), 1)
            if (settings.debug.observers) { console.log(`observer task spliced for room: ${roomName}`) }
        }
    })
    if (cache.observer.taskList.length && !taskList.length) { settings.tasks.readyToCreateDepositTasks = true }

    cache.observer.taskList = taskList
    settings.writePerformanceLog ? performance.newLog(cpu, 'observer.scan') : false
}
