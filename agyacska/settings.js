'use strict'
//2022.09.28
settings.load = function () {
    const price = settings.terminals.maxPriceOfResources
    switch (settings.username) {
       
        case 'agyacska':
            console.log(`load settings for agyacska`)
            // settings.frequency.internalExchange.frequency = 10
            cache.myRooms.forEach(mr => mr.tasks.manage.forced_requiredWorkers = 1)
            
            settings.terminals.maximumStock['XKHO2'] = 40000
            settings.terminals.maximumStock['XLHO2'] = 40000

            settings.terminals.resourcesToBuy['battery'] = false
            settings.terminals.resourcesToBuy['energy'] = false
            // price.energy = 5; price.H = 30; price.X = 60; price.O = 25; price.Z = 15; price.U = 10; price.L = 25
            // settings.terminals.multiplierToBuy = 0.9
            //repair
            settings.bucket.repair_spawn = 3000; settings.tasks.repair_boost = false; settings.tasks.repair_max = 3
            cache.myRooms.forEach(mr=>mr.settings.ignoreRepairsForLinks = true)

            settings.tasks.labsCPU = 10
            settings.bucket.labsReaction = 5000
            settings.tasks.maxHarvestMineral = Math.ceil(cache.myRooms.length / 3)

            //harvest source
            settings.tasks.harvestSource_boost = 0; settings.tasks.maxHarvestSource = 0
            settings.bucket.spawnHarvestSource = 2000; settings.bucket.harvestSource = 1000; settings.tasks.harvestSource_ecoBody = 10

            settings.bucket.processPower = 1000
            settings.minimumEnergyToFillPowerSpawn = 30000

            settings.bucket.getTasksForObservers = 7000

            //harvest power
            settings.tasks.harvestPower = true
            settings.tasks.harvestPower_minimumPowerWhenDistanceMoreThan300 = 7000
            settings.tasks.harvestPower_minimumPower = 5000

            settings.minimumHitsForRamParts[8] = 38000000
            settings.towers.maxTowersForRepair = 0

            //harvest deposit
            settings.tasks.harvestDeposit = true;
            settings.bucket.harvestDeposit = 6000
            settings.tasks.maxCreepsPerTaskHarvestDeposit = 25; settings.tasks.maxCountOfHarvestDepositCreeps = 15
            settings.tasks.minimumCooldownToCreateTaskHarvestDeposit = 10; settings.tasks.effectivnesForHarvestDeposit = 200

            //upgrade
            settings.bucket.upgrade = 3000; settings.tasks.alwaysUpgrade = false; settings.tasks.upgrade_lvl8_boost = false
            break

        
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