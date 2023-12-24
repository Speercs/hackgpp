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
        try { myRooms_tool.manageTaskRepair() } catch (error) { console.log('myRooms_tool.manageTaskRepair', error + `\n${error.stack}`) }
        try { myRooms_tool.manageTaskHarvestMineral() } catch (error) { console.log('myRooms_tool.manageTaskHarvestMineral', error + `\n${error.stack}`) }
    }
    try { if (gameTime % settings.frequency.internalExchange.frequency == settings.frequency.internalExchange.tick) { terminal_logic.internalExchange() } } catch (error) { console.log(`internal exchange error ${error}` + `\n${error.stack}`) }
    if (each10) { enemies.clean() }

    if (gameTime % 100000 == 0) {
        _.filter(myRooms, myRoom => !myRoom.my).forEach(myRoom => myRoom.delete())
        cache.map.corridors = survey.updateScanRooms(false, true)
        cache.map.roomsAround = survey.updateScanRooms(false, false)
        tools.updateAvoidRooms()
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
    
    if (each1000) {
        terminal_logic.clearDisactiveOrders()
        try { myRooms_tool.updateTaskRepair() } catch (error) { console.log('myRooms_tool.updateTaskRepair', error) }
        try { myRooms_tool.updateTaskHarvestMineral() } catch (error) { console.log('myRooms_tool.updateTaskHarvestMineral', error + `\n${error.stack}`) }
    }
    if (gameTime % 100000 == 0) { cache.observer.taskList = [].concat(cache.map.roomsAround) }
    
    squadTools.main()
    taskTools.main()
    if (each100) { tools.launchNukeByTasks() }
    if (each10) {
        if (each100) {
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