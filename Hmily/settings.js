'use strict'
//2022.09.28
settings.load = function () {
    const price = settings.terminals.maxPriceOfResources
    console.log(`load settings for ${settings.username}`)
    settings.rotateRooms = false; settings.activeRooms = 10//Math.ceil(cache.myRooms.length / 3) 
    cache.myRooms.forEach(mr=>mr.settings.ignoreRepairsForLinks = true)
    
    settings.terminals.multiplierToBuy = 1.2
    settings.terminals.banOnEnergyExchange = false
    
    settings.terminals.resourcesToBuy['battery'] = true
    settings.terminals.resourcesToBuy['energy'] = false
    
    myRooms.W13S6.tasks.manage.roads = true;
    myRooms.W12S4.tasks.manage.roads = true;
    
    // myRooms.W12S6.tasks.manage.forced_requiredWorkers = 5; myRooms.W12S6.tasks.manage.requiredWorkers = 5
    
    settings.terminals.minimumStock['energy'] = 250000
    settings.terminals.maximumStock['energy'] = 300000
            
    settings.bucket.processPower = 7000
    settings.towers.maxTowersForRepair = 0

    //harvest source
    settings.tasks.harvestSource_boost = 0; settings.tasks.maxHarvestSource = 0
    settings.bucket.spawnHarvestSource = 5000; settings.bucket.harvestSource = 3000; settings.tasks.harvestSource_ecoBody = 6

    settings.tasks.labsCPU = 10; settings.bucket.labsReaction = 6000
    settings.tasks.harvestPower = false

    settings.tasks.maxHarvestMineral = Math.ceil(cache.myRooms.length / 3)

    //harvest deposit
    settings.tasks.harvestDeposit = false; settings.bucket.harvestDeposit = 8000
    settings.tasks.useBoostForHarvestDeposit = false
    settings.tasks.maxCreepsPerTaskHarvestDeposit = 50; settings.tasks.minimumCooldownToCreateTaskHarvestDeposit = 70
    settings.tasks.maxCountOfHarvestDepositCreeps = 15; settings.tasks.effectivnesForHarvestDeposit = 150

    settings.tasks.repair_max = 1; settings.tasks.repair_boost = false; settings.bucket.repair_spawn = 3000

    //upgrade
    settings.bucket.upgrade = 3000; settings.tasks.alwaysUpgrade = true; settings.tasks.upgrade_lvl8_boost = false

    settings.minimumHitsForRamParts[8] = 1000000



}

settings.show = function (module = '') {
    if (!module) { console.log(JSON.stringify(settings, 0, 3)) }
    else { console.log(JSON.stringify(settings[module], 0, 3)) }
}