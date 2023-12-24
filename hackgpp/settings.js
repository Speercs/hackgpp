'use strict'
//2022.09.28 
settings.load = function () {
    const price = settings.terminals.maxPriceOfResources
    switch (settings.username) {
        
        case 'hackgpp':
            console.log(`load settings for hackgpp`)
            // settings.debug.buyResources = true
            settings.rotateRooms = false; settings.activeRooms = 10
            // cache.myRooms.forEach(mr=>mr.settings.ignoreRepairsForLinks = true)
            cache.myRooms.forEach(mr => mr.tasks.manage.forced_requiredWorkers = 1)
            _.filter(Game.powerCreeps,pc=>pc.level > 10).map(pc=>pc.memory.room).forEach(name=>{myRooms[name].tasks.manage.forced_requiredWorkers = 0; myRooms[name].tasks.manage.requiredWorkers = 0 })
            settings.frequency.internalExchange.frequency = 100
            settings.terminals.minimumStock['power'] = 10000
            settings.terminals.maximumStock['power'] = 100000
            settings.terminals.minimumStock['energy'] = 200000
            settings.terminals.maximumStock['energy'] = 300000
            settings.bucket.factoryRun = 80
            
            
            // Memory.powerCreeps.PowerCreep8.operateSpawn = false
            //  myRooms.E1S36.tasks.manage.requiredWorkers = 4; myRooms.E1S36.tasks.manage.forced_requiredWorkers = 4;
            
            settings.terminals.resourcesToBuy['battery'] = true
            settings.terminals.resourcesToBuy['energy'] = true
            
            myRooms.E1S36.rescuePosition = new RoomPosition(38, 6, 'E1S37')
            myRooms.E2S41.rescuePosition = new RoomPosition(4, 25, 'E3S41')
            myRooms.W8S41.rescuePosition = new RoomPosition(3, 25, 'W7S41')
            myRooms.E24S1.rescuePosition = new RoomPosition(3, 15, 'E25S1')
            myRooms.E19S44.rescuePosition = new RoomPosition(45, 13, 'E18S44')
            
            
            settings.terminals.multiplierToBuy = 1.1
            settings.bucket.processPower = 2000; settings.minimumEnergyToFillPowerSpawn = 30000;
            settings.towers.maxTowersForRepair = 0; settings.minimumHitsForRamParts[8] = 19000000

            //harvest source
            settings.tasks.harvestSource_boost = 0; settings.tasks.maxHarvestSource = 0
            settings.bucket.spawnHarvestSource = 1000; settings.bucket.harvestSource = 1000; settings.tasks.harvestSource_ecoBody = 0

            settings.tasks.repair_max = 1; settings.tasks.repair_boost = false
            settings.bucket.repair_spawn = 4000

            settings.tasks.labsCPU = 1; settings.bucket.labsReaction = 2000
            //harvest minerals
            settings.bucket.spawnHarvestMineral = 3000; settings.tasks.maxHarvestMineral = Math.ceil(cache.myRooms.length / 3);
            settings.bucket.harvestMineral = 3000

            settings.bucket.getTasksForObservers = 1000

            settings.tasks.harvestDeposit = false; settings.bucket.harvestDeposit = 8000; settings.tasks.effectivnesForHarvestDeposit = 200
            settings.tasks.maxCreepsPerTaskHarvestDeposit = 30; settings.tasks.maxCountOfHarvestDepositCreeps = 10; settings.tasks.useBoostForHarvestDeposit = false

            settings.tasks.harvestPower = false; settings.bucket.harvestPower = 2000
            settings.tasks.harvestPower_minimumPowerWhenDistanceMoreThan300 = 7000; settings.tasks.harvestPower_minimumPower = 5000

            settings.bucket.upgrade = 2000; settings.tasks.alwaysUpgrade = false; settings.tasks.upgrade_lvl8_boost = false

            settings.tasks.war_partizan = false
            break;
        
    }

}
settings.loadPreset = function (preset = 'default') {
    //Сценарии:
    //Добыча депозитов
    //Добыча энергии
    //Поднятие уровня рампартов
    //Защита комнат
    //Атака
    //Производство бустов
    //Добыча минералов, 0, 1 для себя и 2 на полную
    //
    switch (preset) {
        case 'default':
            settings.load(settings.username); break
        case 'defend':
            settings.tasks.maxCountOfHarvestDepositCreeps = 0
            settings.tasks.maxCreepsPerTaskHarvestDeposit = 0
            settings.tasks.harvestPower = false
            settings.tasks.harvestDeposit = false
            settings.bucket.spawnHarvestMineral = 8000
            settings.bucket.harvestMineral = 8000
            settings.bucket.labsReaction = 9000
            break
        case 'attack':
            settings.tasks.repair_max = 1
            settings.tasks.labsCPU = 1
            settings.bucket.processPower = 11000
            settings.bucket.harvestSource = 5000
            break

    }
}
settings.show = function (module = '') {
    if (!module) { console.log(JSON.stringify(settings, 0, 3)) }
    else { console.log(JSON.stringify(settings[module], 0, 3)) }
}