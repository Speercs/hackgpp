'use strict'
//2022.09.28
settings.load = function () {
    const price = settings.terminals.maxPriceOfResources
    switch (settings.username) {
        
        case 'Pacificius':
            console.log(`load settings for Pacificius`)
            
            settings.rotateRooms = false; settings.activeRooms = 12
            
            settings.terminals.banOnEnergyExchange = true
            settings.terminals.resourcesToBuy['battery'] = false            
            settings.terminals.resourcesToBuy['energy'] = false
            // myRooms.E1N11.tasks.manage.forced_requiredWorkers = 6; myRooms.E1N11.tasks.manage.requiredWorkers = 6;
            
            // settings.frequency.internalExchange.frequency = 10

            settings.bucket.repair_spawn = 3000; settings.bucket.repair = 3000; settings.tasks.repair_max = 1; settings.tasks.repair_boost = false

            //harvest deposit
            settings.tasks.harvestDeposit = true;
            settings.bucket.harvestDeposit = 8000
            settings.tasks.maxCreepsPerTaskHarvestDeposit = 30; settings.tasks.maxCountOfHarvestDepositCreeps = 20
            settings.tasks.minimumCooldownToCreateTaskHarvestDeposit = 10; settings.tasks.effectivnesForHarvestDeposit = 200

            settings.bucket.processPower = 1000; settings.minimumEnergyToFillPowerSpawn = 60000
            settings.tasks.effectivnesForHarvestDeposit = 250

            settings.bucket.spawnHarvestMineral = 4000; settings.tasks.maxHarvestMineral = Math.ceil(cache.myRooms.length / 3); settings.bucket.harvestMineral = 3000
            // settings.labReactions = false
            settings.bucket.labsReaction = 5000; settings.tasks.labsCPU = 20

            settings.minimumHitsForRamParts[8] = 20000000
            settings.towers.maxTowersForRepair = 0

            //harvest power
            settings.tasks.harvestPower = true
            settings.tasks.harvestPower_minimumPowerWhenDistanceMoreThan300 = 6000
            settings.tasks.harvestPower_minimumPower = 4000

            //harvest source
            settings.tasks.harvestSource_boost = 0; settings.tasks.maxHarvestSource = 0
            settings.bucket.spawnHarvestSource = 5000; settings.bucket.harvestSource = 2000; settings.tasks.harvestSource_ecoBody = 10

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