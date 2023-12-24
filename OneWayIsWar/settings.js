'use strict'
//2022.09.28
settings.load = function () {
    const price = settings.terminals.maxPriceOfResources
    switch (settings.username) {
        case 'OneWayIsWar':
            console.log(`load settings for OneWayIsWar`)
            settings.rotateRooms = true; settings.activeRooms = 13
            
            settings.terminals.minimumStock['energy'] = 100000
            settings.terminals.maximumStock['energy'] = 150000
            settings.terminals.maximumStock['XKHO2'] = 40000
            settings.terminals.maximumStock['XLHO2'] = 40000
            
            cache.myRooms.forEach(mr=>mr.settings.ignoreRepairsForLinks = true)
            
            // myRooms.E19S53.tasks.manage.forced_requiredWorkers = 4; myRooms.E19S53.tasks.manage.requiredWorkers = 4
            // myRooms.E4S49.tasks.repair.forced_requiredWorkers = 5; myRooms.E4S49.tasks.repair.requiredWorkers = 5
            // myRooms.E4S49.tasks.manage.forced_requiredWorkers = 5; myRooms.E4S49.tasks.manage.requiredWorkers = 5
            // 
            settings.terminals.minimumStock.reductant = 5000
            // settings.terminals.resourcesToBuy['battery'] = false
            // settings.terminals.resourcesToBuy['energy'] = false
            
            
            settings.bucket.processPower = 10000; settings.minimumEnergyToFillPowerSpawn = 30000
            settings.towers.maxTowersForRepair = 0

            //harvest source
            settings.tasks.harvestSource_boost = 0; settings.tasks.maxHarvestSource = 0
            settings.bucket.spawnHarvestSource = 5000; settings.bucket.harvestSource = 1000; settings.tasks.harvestSource_ecoBody = 10

            settings.tasks.labsCPU = 10; settings.bucket.labsReaction = 5000
            settings.tasks.harvestPower = true

            settings.tasks.maxHarvestMineral = Math.ceil(cache.myRooms.length / 3)

            //harvest deposit
            settings.tasks.harvestDeposit = true; settings.bucket.harvestDeposit = 8000
            settings.tasks.useBoostForHarvestDeposit = false
            settings.tasks.maxCreepsPerTaskHarvestDeposit = 30; settings.tasks.minimumCooldownToCreateTaskHarvestDeposit = 30
            settings.tasks.maxCountOfHarvestDepositCreeps = 17; settings.tasks.effectivnesForHarvestDeposit = 250

            settings.tasks.repair_max = 4; settings.tasks.repair_boost = false; settings.bucket.repair_spawn = 3000

            //upgrade
            settings.bucket.upgrade = 1000; settings.tasks.alwaysUpgrade = false; settings.tasks.upgrade_lvl8_boost = false

            settings.minimumHitsForRamParts[8] = 20000000
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