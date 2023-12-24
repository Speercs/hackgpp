'use strict'
//2023.08.23 update base to memory2
 
if (Game.cpu.bucket < 100) {
    console.log('config dont load');
    module.exports.loop = function () {
        if (Game.shard.name == 'shard2') {
            _.filter(Game.creeps).forEach(creep => {
                const portal = creep.pos.findClosestByRange(FIND_STRUCTURES, { filter: { structureType: STRUCTURE_PORTAL } })
                if (portal) { creep.moveTo(portal) }
            })
            return
        }
        console.log(Game.cpu.bucket)
    }
    return
}
require('config')
 
module.exports.loop = function () {
    global.gameTime = Game.time; global.each10 = gameTime % 10 == 0; global.each100 = gameTime % 100 == 0; global.each1000 = gameTime % 1000 == 0; global.scriptLoadTime = gameTime == settings.scriptLoadTime
    try { memHack.run() } catch (error) { console.log(`memHack failed, need to reinitialize script, error: ${error}`) }
    if (!Memory.rooms) { memoryManager.createMemoryAtStart() }
 
    cache.cpu.functionsCurrentTick = { tick: gameTime, modules: {} }
    cache.swapPositionsList = []; delete cache.resourcesSortedToChooseByLabs; delete cache.resourcesUsedHistorySummary; delete cache.RoomsSortedByTicksToDowngrade;
    delete cache.obstacles;
    cache.terminals.busyAtCurrentTick = []
    delete cache.market.odersByResourceType; delete cache.market.orders
    const lastLog = _.last(performance.log); if (lastLog) { lastLog.bucket = Game.cpu.bucket; lastLog.bucketDif = Game.cpu.bucket - cache.bucket }; cache.bucket = Game.cpu.bucket

    if (cache.resourcesUsedHistory.length) { if (gameTime - cache.resourcesUsedHistory[0].time > 10000) { cache.resourcesUsedHistory.splice(0, 1) } }
    _.filter(Game.creeps, c => !c.spawning).forEach(creep => creep.memory.isStuck = true)
    _.filter(Game.powerCreeps, c => c.ticksToLive).forEach(powerCreep => powerCreep.memory.isStuck = true)
    flags.checkflags()
    if (!scriptLoadTime) { info.showAttack() }
    survey.surveyRooms();
    if (scriptLoadTime) {
        tools.getUsername()
        settings.load() 
        taskTools.restoreTasks()
        if (!Memory.squads) { Memory.squads = {} }
        else { squadTools.restoreSquads() }
        tools.updateAllyRooms()
        terminal_logic.internalExchange()
    }
    //update resources
    if (scriptLoadTime || each100) { memoryManager.updateResources() }
    else { Memory.resourceToUpdate.forEach(resourceType => memoryManager.updateResources(resourceType)) }
    if (each100 && Game.market.credits < 1000000) {
        const resToBuy = _.filter(Game.market.orders, mo => mo.type == ORDER_BUY).map(mo => mo.resourceType)
        const resources = Object.keys(cache.resources).filter(res => !resToBuy.includes(res)).sort((a, b) => cache.resources[b] - cache.resources[a])
        for (let index = 0; index < resources.length; index++) {
            const res = resources[index];
            const price = terminal_logic.getAvgPriceOfResource(res) * 0.8
            console.log(colorful(`try to sell something... low credist! ${res} - for price: ${price}`, 'red'))
            if (terminal_logic.sellCommidiates(res, price)) break
        }

    }
    if (settings.rotateRooms && scriptLoadTime) myRooms_tool.updateTaskHarvestMineral()
    Memory.resourceToUpdate = Memory.resourceToUpdate || []
    if (cache.resources_stat && gameTime - cache.resources_stat['energy'] > 100) { memoryManager.addToUpdateList('energy') }


    if (gameTime == settings.scriptLoadTime + 100) {
        try { myRooms_tool.updateTaskRepair() } catch (error) { console.log('myRooms_tool.updateTaskRepair', error + `\n${error.stack}`) }
        try { myRooms_tool.updateTaskHarvestMineral() } catch (error) { console.log('myRooms_tool.updateTaskHarvestMineral', error + `\n${error.stack}`) }

        cache.map.corridors = survey.updateScanRooms(false, true)
        cache.map.roomsAround = survey.updateScanRooms(false, false)
        tools.updateAvoidRooms()
    }
    if (settings.tasks.readyToCreateDepositTasks) { taskTools.checkTasksHarvestDeposits() }
    if (Game.cpu.bucket > 1000) { survey.scanByObservers() }
    if (gameTime == settings.scriptLoadTime + 100) console.log(`cache.myRooms.forEach(mr => mr.updateBaseTerritory())`)
    if (gameTime == settings.scriptLoadTime + 1) {
        try { cache.myRooms.filter(mr => mr.level == 8 && mr.room.memory.base && mr.room.memory.base.length).forEach(mr => mr.updateInBaseForTasks()) }
        catch (error) { console.log("updateInBaseForTasks error", error, `\n${error.stack}`) }
    }
     
    if (each10) {
        try { myRooms_tool.manageTaskRepair() } catch (error) { console.log('myRooms_tool.manageTaskRepair', error) }
        try { myRooms_tool.manageTaskHarvestMineral() } catch (error) { console.log('myRooms_tool.manageTaskHarvestMineral', error) }
    }
    try { if (gameTime % settings.frequency.internalExchange.frequency == settings.frequency.internalExchange.tick) { terminal_logic.internalExchange() } } catch (error) { console.log(`internal exchange error ${error}`) }
    if (each10) { enemies.clean() }

    if (gameTime % 100000 == 0) {
        _.filter(myRooms, myRoom => !myRoom.my).forEach(myRoom => myRoom.delete())
        cache.map.corridors = survey.updateScanRooms(false, true)
        cache.map.roomsAround = survey.updateScanRooms(false, false)
        tools.updateAvoidRooms()
    }
    //activateRooms
    if (false) {
        const rooms = cache.myRooms.filter(mr => mr.status !== 'halted' && mr.status !== 'active')

        if (activeRooms.length > settings.activeRooms) {
            activeRooms.sort((a, b) => a.tasks.harvestMineral.amount - b.tasks.harvestMineral.amount)
            const diff = activeRooms.length - settings.activeRooms
            for (const myRoom of activeRooms) {
                if (!diff) break
                if (myRoom.underAttack) return
                myRoom.setStatus('support')
            }
        }
    }

    if (false) {
        // if (gameTime == settings.scriptLoadTime +     || gameTime % 10000 == 0) {
        const myRooms_sortedByActivatedTick = _.filter(myRooms, mr => mr.my).sort((a, b) => Memory.rooms[a.name].activatedTick - Memory.rooms[b.name].activatedTick)
        let i = 0, activeRooms = 0
        while (activeRooms < settings.countOfActiveRooms || i < myRooms_sortedByActivatedTick.length) {
            const myRoom = myRooms_sortedByActivatedTick[i];
            const myRoom_tasks = _.filter(tasks, t => t.spawnRoom = myRoom)
            const enemies = idToObj(_.filter(cache.enemies, e => e.pos.roomName == this.name && e.parameters && (e.parameters.dismantle || e.parameters.attack)).map(data => data.id))
            const regenMineral = _obj(myRoom.tasks.harvestMineral.id).ticksToRegeneration
            if (myRoom_tasks.length || enemies.length || regenMineral) {
                myRoom.active = true; myRoom.activatedTick = gameTime; activeRooms++
            }
            i++
        }
        myRooms_sortedByActivatedTick.filter(mr => !mr.active).forEach(myRoom => {
            delete myRoom.room.memory.labs.reaction;
        })
    }
    if (each10) {
        tools.deleteOldCreepNames()
        // tools.checkResourcesToSendForAlly()
        Object.values(tasks).forEach(task => task.backup())
        if ((!cache.lastScanCorridors || gameTime - cache.lastScanCorridors >= 100) && Game.cpu.bucket > settings.bucket.getTasksForObservers && !cache.observer.taskList.length && (settings.tasks.harvestPower || settings.tasks.harvestDeposit)) {
            cache.lastScanCorridors = gameTime
            cache.observer.taskList = [].concat(cache.map.corridors)
        }
    }

    // if (settings.username == 'hackgpp' && gameTime % 2000 == 0 && cache.resources['energy'] > 5000000) {
    //     const resourceType = 'energy', roomName = 'E27S39'; cache.myRooms.filter(myRoom => myRoom.terminal).forEach(myRoom => { const newOrder = { sender: myRoom, receiver: { name: roomName, resources: {} }, resourceType: resourceType, amount: 1000, time: gameTime }; newOrder.receiver.resources[resourceType] = 10000; cache.terminals.ordersList.push(newOrder) })
    // }
    if (each1000) {
        terminal_logic.clearDisactiveOrders()
        try { myRooms_tool.updateTaskRepair() } catch (error) { console.log('myRooms_tool.updateTaskRepair', error) }
        try { myRooms_tool.updateTaskHarvestMineral() } catch (error) { console.log('myRooms_tool.updateTaskHarvestMineral', error) }
    }
    if (gameTime % 100000 == 0) { cache.observer.taskList = [].concat(cache.map.roomsAround) }
    if (each1000) {
        if (settings.username == 'agyacska') {
            const resourceType = 'cell', roomName = 'E31S34'; cache.myRooms.filter(myRoom => myRoom.terminal).forEach(myRoom => { const newOrder = { sender: myRoom, receiver: { name: roomName, resources: {} }, resourceType: resourceType, amount: myRoom.terminal.store[resourceType], time: gameTime }; newOrder.receiver.resources[resourceType] = 10000; cache.terminals.ordersList.push(newOrder) })
        }
        else if (settings.username == 'Pacificius') {
            const roomName = 'E31S34'; hightCommodities1.forEach(resourceType => { cache.myRooms.filter(myRoom => myRoom.terminal).forEach(myRoom => { const newOrder = { sender: myRoom, receiver: { name: roomName, resources: {} }, resourceType: resourceType, amount: myRoom.terminal.store[resourceType], time: gameTime }; newOrder.receiver.resources[resourceType] = 10000; cache.terminals.ordersList.push(newOrder) }) })
        }
        else if (settings.username == 'Tornado_Tech') {
            const resourceType = 'wire', roomName = 'W57S1'; cache.myRooms.filter(myRoom => myRoom.terminal).forEach(myRoom => { const newOrder = { sender: myRoom, receiver: { name: roomName, resources: {} }, resourceType: resourceType, amount: myRoom.terminal.store[resourceType], time: gameTime }; newOrder.receiver.resources[resourceType] = 10000; cache.terminals.ordersList.push(newOrder) })
        }
    }
    // if (Game.cpu.bucket == 10000) { Game.cpu.generatePixel() }
    squadTools.main()
    taskTools.main()
    if (each100) { tools.launchNukeByTasks() }
    if (each10) {
        if (each100) {
            if (['OneWayIsWar', 'hackgpp', 'champion'].includes(settings.username)) { hightCommodities6.forEach(resourceType => { terminal_logic.sellCommidiates(resourceType, terminal_logic.getAvgPriceOfResource(resourceType) * 0.9) }) }
            //     if (settings.username !== 'hackgpp') { const resourceType = 'power', roomName = 'E31S23'; cache.myRooms.filter(myRoom => myRoom.terminal).forEach(myRoom => { const newOrder = { sender: myRoom, receiver: { name: roomName, resources: {} }, resourceType: resourceType, amount: myRoom.terminal.store[resourceType], time: gameTime }; newOrder.receiver.resources[resourceType] = 10000; cache.terminals.ordersList.push(newOrder) }) }
            // if (settings.username == 'champion') { ['H', 'O'].forEach(resourceType => { terminal_logic.sellCommidiates(resourceType, terminal_logic.getAvgPriceOfResource(resourceType) * 0.7, 'OneWayIsWar') }) }
            // resourcesTier1.filter(e => e !== 'energy' && e !== 'power' && e !== 'ops').forEach(resourceType => {            
            cache.myRooms.filter(myRoom => myRoom.status !== 'halted').forEach(myRoom => {
                try { myRoom.buyOrSellResources() } catch (error) { console.log(`${myRoom.name}`, 'buyOrSellResources', error + `\n${error.stack}`) }
            })
        }
        terminal_logic.buyResources()
        if (settings.terminals.buy_buy_resourcesTier2) { terminal_logic.buyResources(resourcesTier2) }
        if (settings.terminals.buy_buy_resourcesTier3) { terminal_logic.buyResources(resourcesTier3) }
        if (settings.terminals.buy_buy_resourcesTier4) { terminal_logic.buyResources(resourcesTier4) }
        cache.myRooms.forEach(myRoom => myRoom.transferByOrders())
    }

    powerCreepsLogick.main()
    //swap    
    swapCreepPositions()
    if (Game.cpu.bucket > settings.bucket.towersRepair) { gl_towers.repairRamparts() }
    // end of tick:
    // if (settings.username == 'Pacificius' && Game.cpu.bucket == 10000) { Game.cpu.generatePixel() }
    if (each100) {
        let mr = cache.myRooms.map(r => r.name);
        const enemies = _.filter(cache.enemies, e => e.owner !== 'Invader' && mr.includes(e.pos.roomName)).length
        let nukes = 0; cache.myRooms.forEach(myRoom => { nukes += (myRoom.name, myRoom.nukes.length) })
        let text = `bucket: ${Game.cpu.bucket} - enemies: ${enemies}, nukes: ${nukes}, msg:${Memory.info.list.length}`
        if (cache.resources['energy'] < (cache.countOfMyRooms * 10000)) { text += `\nattention low energy :${cache.resources['energy']}` }
        if (cache.resources['ops'] < (cache.countOfMyRooms * 1000)) { text += `\nattention low ops :${cache.resources['ops']}` }
        let myRoomsUnderAttack = cache.myRooms.filter(mr => mr.underAttack).map(mr => mr.name)
        if (myRoomsUnderAttack.length) { text += `\nrooms under attack: ${myRoomsUnderAttack}` }
        console.log(text);
    }
   
    if (cache.cpu.cpu100.length > 99) { cache.cpu.cpu100.splice(0, 1) }

    cache.cpu.cpu100.push(Game.cpu.getUsed())
    performance.writeLog()
}