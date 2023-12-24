'use strict'
//2022.09.28 
settings.load = function () { 
    const price = settings.terminals.maxPriceOfResources
    switch (settings.username)  {
        case 'Tornado_Tech':
            console.log(`load settings for Tornado_Tech`)
            settings.debug.buyResources = true
            settings.rotateRooms = true; settings.activeRooms = Math.ceil(cache.myRooms.length / 3) 
            settings.frequency.internalExchange.frequency = 10
            settings.towers.maxTowersForRepair = 0
            // myRooms.W41N36.tasks.manage.forced_requiredWorkers = 4; myRooms.W41N36.tasks.manage.requiredWorkers = 4
            myRooms.W41N39.settings.clearFactory = true
            
            
            settings.tasks.labsCPU = 10
            
            settings.terminals.resourcesToBuy['battery'] = true
            settings.terminals.resourcesToBuy['energy'] = false
            settings.terminals.banOnEnergyExchange = false
            resourcesBar.forEach(res=>settings.terminals.minimumStock[res] = 3000)
            
            settings.terminals.multiplierToBuy = 1.2
            settings.terminals.minimumStock['energy'] = 250000
            settings.terminals.maximumStock['energy'] = 300000
            
            settings.terminals.minimumStock['default'] = 20000
            settings.terminals.maximumStock['default'] = 30000
            
            settings.bucket.processPower = 1000; settings.minimumEnergyToFillPowerSpawn = 70000
            
            cache.myRooms.forEach(mr=>mr.settings.ignoreRepairsForLinks = true)
            
            settings.tasks.harvestSource_boost = 0; settings.tasks.maxHarvestSource = 0
            settings.bucket.spawnHarvestSource = 5000; settings.bucket.harvestSource = 2000; settings.tasks.harvestSource_ecoBody = 22

            settings.minimumEnergyToFillPowerSpawn = 200000
            
            settings.tasks.maxHarvestMineral = Math.ceil(cache.myRooms.length / 3)

            //harvest deposit
            settings.tasks.harvestDeposit = false; settings.bucket.harvestDeposit = 8000
            settings.tasks.useBoostForHarvestDeposit = false
            settings.tasks.maxCreepsPerTaskHarvestDeposit = 50; settings.tasks.minimumCooldownToCreateTaskHarvestDeposit = 100
            settings.tasks.maxCountOfHarvestDepositCreeps = 15; settings.tasks.effectivnesForHarvestDeposit = 50

            settings.tasks.repair_max = 2; settings.tasks.repair_boost = true; settings.bucket.repair_spawn = 3000

            //upgrade
            settings.bucket.upgrade = 6000; settings.tasks.alwaysUpgrade = true; settings.tasks.upgrade_lvl8_boost = true
            settings.minimumHitsForRamParts[7] = 1500000
            settings.minimumHitsForRamParts[8] = 10000000
            
             //harvest power
            settings.tasks.harvestPower = false
            settings.tasks.harvestPower_minimumPowerWhenDistanceMoreThan300 = 6000
            settings.tasks.harvestPower_minimumPower = 4000
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