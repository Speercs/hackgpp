'use strict'
//2023.04.16
console.log(`config loaded`);
// Object.keys(Memory).forEach(key => delete Memory[key])
// Object.values(Game.creeps).forEach(cr => cr.suicide())

global.roles = {}
global.actions = {}


global.RoomVision = {}
global.CpuLimit = Game.cpu.limit

global.lostEnergyCounters = {}
global.cache = {
    cpu: {
        cpu100: [], creeps100: [], towers100: [], functions: [], functionsCurrentTick: { modules: {} }
    },
    market: {
        odersByResourceType: {},
        myOrders: {}
    },
    swapPositionsList: [],
    previousSwapPositionsList: [],
    terminals: {
        ordersList: [],
        operationsCounter: 0,
        energyUsedForInternalExchange: 0,
        busyAtCurrentTick: [],
    },
    resources: {},
    resourcesUsedHistory: [],

    enemies: {},

    map: {
        corridors: [],
        roomsAround: [],
        roomDistance: {}
    },
    observer: { taskList: [] },
    powerCreepsTasks: {},
}

global.counters = { cpuOverLimitTicks: {}, incomePerTick: 0 }
global.settings = {
    scriptLoadTime: Game.time,
    showVisual: false,
    writePerformanceLog: false,
    activeRooms: Infinity,
    frequency: {
        findNukes: { frequency: 100, tick: 0 },
        terminalLogick: { frequency: 300, tick: 0 },
        updateLinks: { frequency: 100, tick: 9 },
        towerUpdate: { frequency: 1000, tick: 0 },
        updateConstructionSites: { frequency: 10, tick: 0 },
        updateStructuresIdWithoutEnergy: { frequency: 10, tick: 2 },
        checkUpgradeTask: { frequency: 10, tick: 0 },
        checkStoraManagerTask: { frequency: 10, tick: 0 },
        deleteOldMemory: { frequency: 10, tick: 0 },//check saved id for objects for exists
        checkCreepsInRoom: { frequency: 10, tick: 0 },//update counter for roles in room
        checkTasksForRoom: { frequency: 10, tick: 0 },
        updateObserver: { frequency: 100, tick: 0 },
        clearSpawnTasks: { frequency: 10000, tick: 0 },
        clearManageMiniTasks: { frequency: 10000, tick: 0 },
        manageWorkersForTasks: { frequency: 100, tick: 1 },
        updateHarvestTasksTimer: { frequency: 100, tick: 1 },
        updateTransportTasksTime: { frequency: 100, tick: 1 },
        updateUpgradeTasksTimer: { frequency: 100, tick: 1 },
        updateDefendTasksTimer: { frequency: 10, tick: 1 },
        updateLabTasksTimer: { frequency: 10, tick: 2 },
        updateStructuresLabs: { frequency: 100, tick: 3 },
        internalExchange: { frequency: 100, tick: 0 },
        buyResources: {
            U: { frequency: 100, tick: 0 },
            O: { frequency: 100, tick: 0 },
            H: { frequency: 100, tick: 0 },
            K: { frequency: 100, tick: 0 },
            L: { frequency: 100, tick: 0 },
            Z: { frequency: 100, tick: 0 },
            X: { frequency: 100, tick: 0 },
        }
    },
    minimumEnergyInTerminal: 10000,
    minEnergyInStorage: 50000,
    tasks: {
        harvestSourceCPU: 10,
        labsCPU: 5,
        maxCountOfHarvestDepositTasks: 10,
        maxCreepsPerTaskHarvestDeposit: 20,
        effectivnesForHarvestDeposit: 150,// if more then less creeps for task        
        useBoostForHarvestDeposit: false,
        useBoostForHarvestMineral: false,
        harvestSource_ecoBody: false,
        harvestSource_boost: false,
        harvestSourceWithoutMoveParts: false,
        repair_boost: false,
        harvestDeposit: true,
        harvestPower: false,
        minimumCooldownToCreateTaskHarvestDeposit: 10,
        harvestPower_minimumPowerWhenDistanceMoreThan300: 7000,
        harvestPower_minimumPower: 5000,
        repair_max: 5,
        repair_min: 1,
        maxHarvestSource: 0,
        alwaysUpgrade: false,
        upgrade_lvl8_boost: false,
        war_partizan: false,
    },
    spawn: {
        priority: {
            manage: 4,
            harvestSource: 6,
            harvestMineral: 6,
            labManager: 7,
            repair: 7,
            upgrade: 7,
            defend: 5,
        }
    },
    labReactions: true,
    store: {
        resourcesTier4: 30000,
        resourcesTier3: 10000,
        resourcesTier2: 10000,
    },
    terminals: {
        banOnEnergyExchange: true,
        resourcesToBuy: {
            'O': true,
            'H': true,
            'X': true,
            'Z': true,
            'U': true,
            'L': true,
            'K': true,
            'ops': false,
            'energy': false, //settings.terminals.resourcesToBuy['energy']
            'power': false,
            'battery': false
        },
        buy_resourcesTier2: true,
        buy_resourcesTier3: true,
        buy_resourcesTier4: true,
        minimumStock: {
            'default': 3000,
            'energy': 100000,
            'power': 10000,
            'battery': 100000,
        },
        maximumStock: {
            'default': 20000,
            'energy': 200000,
            'power': 30000,
            'battery': 200000,
        },
        maxPriceOfResources: {
            'O': 10, 'oxidant': 100,
            'H': 10, 'reductant': 550,
            'X': 120, 'purifier': 400,
            'Z': 80, 'zynthium_bar': 400,
            'U': 45, 'utrium_bar': 250,
            'L': 30, 'lemergium_bar': 250,
            'K': 40, 'keanium_bar': 250,
            'ops': 30,
            'energy': 30, 'battery': 100,
            'power': 1,

        },
        multiplierToBuy: 0.7,
    },
    minimumHitsForRamParts: {
        8: 11000000,
        7: 2000000,
        6: 100000,
        5: 0,
        4: 0,
        3: 0,
        2: 0,
        1: 0,
    },
    bucket: {
        upgrade: 1000,
        getTasksForObservers: 9000,
        factoryRun: 1000,
        spawnHarvestMineral: 5000,
        harvestMineral: 100,
        spawnHarvestSource: 5000,
        harvestSource: 100, //settings.bucket.spawnHarvestSource = 100
        repair_spawn: 5000,
        repair: 100,
        processPower: 5000,
        labsReaction: 1000,
        harvestPower: 8000,
        harvestDeposit: 8000,
        terminals_internalExchange: 100,
        terminals_transferByOrders: 100,
        terminals_buyByOthersOrders: 100
    },
    debug: {
        internalExchange: false,
        buyResources: false,
        towers: false,
        observers: false,
    },
    towers: {
        maxTowersForRepair: 5
    },
    minimumEnergyToFillPowerSpawn: 100000,
}
global.basicCommodities = [RESOURCE_SILICON, RESOURCE_METAL, RESOURCE_BIOMASS, RESOURCE_MIST]
global.hightCommodities1 = [RESOURCE_WIRE, RESOURCE_CELL, RESOURCE_ALLOY, RESOURCE_CONDENSATE]
global.hightCommodities2 = [RESOURCE_SWITCH, RESOURCE_PHLEGM, RESOURCE_TUBE, RESOURCE_CONCENTRATE]
global.hightCommodities3 = [RESOURCE_TRANSISTOR, RESOURCE_TISSUE, RESOURCE_FIXTURES, RESOURCE_EXTRACT]
global.hightCommodities4 = [RESOURCE_MICROCHIP, RESOURCE_MUSCLE, RESOURCE_FRAME, RESOURCE_SPIRIT]
global.hightCommodities5 = [RESOURCE_ORGANOID, RESOURCE_HYDRAULICS, RESOURCE_EMANATION, RESOURCE_CIRCUIT]
global.hightCommodities6 = [RESOURCE_ORGANISM, RESOURCE_MACHINE, RESOURCE_ESSENCE, RESOURCE_DEVICE]
global.resourcesTier5 = [RESOURCE_COMPOSITE, RESOURCE_LIQUID, RESOURCE_CRYSTAL]
global.resourcesTier4 = ['XUH2O', 'XUHO2', 'XKH2O', 'XKHO2', 'XLH2O', 'XLHO2', 'XZH2O', 'XZHO2', 'XGH2O', 'XGHO2']
global.resourcesTier3 = ['UH2O', 'UHO2', 'KH2O', 'KHO2', 'LH2O', 'LHO2', 'ZH2O', 'ZHO2', 'GH2O', 'GHO2', 'G']
global.resourcesTier2 = ['OH', 'ZK', 'UL', 'UH', 'UO', 'KH', 'KO', 'LH', 'LO', 'ZH', 'ZO', 'GH', 'GO']
global.resourcesTier1 = ['energy', 'L', 'K', 'X', 'O', 'U', 'Z', 'H', RESOURCE_OPS, RESOURCE_POWER, RESOURCE_BATTERY]
global.resourcesBar = [RESOURCE_UTRIUM_BAR, RESOURCE_LEMERGIUM_BAR, RESOURCE_ZYNTHIUM_BAR, RESOURCE_KEANIUM_BAR, RESOURCE_GHODIUM_MELT, RESOURCE_OXIDANT, RESOURCE_REDUCTANT, RESOURCE_PURIFIER]
global.descriptions = {
    'XGH2O': 'UPGRADE',
    'GH2O': 'UPGRADE',
    'GH': 'UPGRADE',

    'XLH2O': 'REPAIR',
    'LH2O': 'REPAIR',
    'LH': 'REPAIR',

    'XUHO2': 'HARVEST',
    'UHO2': 'HARVEST',
    'UO': 'HARVEST',

    'XZH2O': 'DISMANTLE',
    'ZH2O': 'DISMANTLE',
    'ZH': 'DISMANTLE',

    'XUH2O': 'ATTACK',
    'UH2O': 'ATTACK',
    'UH': 'ATTACK',

    'XKHO2': 'R_ATTACK',
    'KHO2': 'R_ATTACK',
    'KO': 'R_ATTACK',

    'XLHO2': 'HEAL',
    'LHO2': 'HEAL',
    'LO': 'HEAL',

    'XKH2O': 'CARRY',
    'KH2O': 'CARRY',
    'KH': 'CARRY',

    'XGHO2': 'TOUGH',
    'GHO2': 'TOUGH',
    'GO': 'TOUGH',

    'XZHO2': 'MOVE',
    'ZHO2': 'MOVE',
    'ZO': 'MOVE',

    [RESOURCE_SILICON]: '(-1) Electronical chain',
    [RESOURCE_METAL]: '(-1) Mechanical chain',
    [RESOURCE_BIOMASS]: '(-1) Biological chain',
    [RESOURCE_MIST]: '(-1) Mystical chain',
    [RESOURCE_WIRE]: '(0) Electronical chain',
    [RESOURCE_SWITCH]: '(1) Electronical chain',
    [RESOURCE_TRANSISTOR]: '(2) Electronical chain',
    [RESOURCE_MICROCHIP]: '(3) Electronical chain',
    [RESOURCE_CIRCUIT]: '(4) Electronical chain',

    [RESOURCE_CELL]: '(0) Biological chain',
    [RESOURCE_PHLEGM]: '(1) Biological chain',
    [RESOURCE_TISSUE]: '(2) Biological chain',
    [RESOURCE_MUSCLE]: '(3) Biological chain',
    [RESOURCE_ORGANOID]: '(4) Biological chain',

    [RESOURCE_ALLOY]: '(0) Mechanical chain',
    [RESOURCE_TUBE]: '(1) Mechanical chain',
    [RESOURCE_FIXTURES]: '(2) Mechanical chain',
    [RESOURCE_FRAME]: '(3) Mechanical chain',
    [RESOURCE_HYDRAULICS]: '(4) Mechanical chain',

    [RESOURCE_CONDENSATE]: '(0) Mystical chain',
    [RESOURCE_CONCENTRATE]: '(1) Mystical chain',
    [RESOURCE_EXTRACT]: '(2) Mystical chain',
    [RESOURCE_SPIRIT]: '(3) Mystical chain',
    [RESOURCE_EMANATION]: '(4) Mystical chain',
}
require('memHack')
require('prototype_MyRoom')
require('settings')
require('prototype_Creep')
require('prototype_Squad')
require('performance')
require('traveler')
require('tools')
require('memory')
require('spawn')
require('tasks')
require('surveyRooms')
require('terminal')
require('role_harvestSource')
require('role_harvestMineral')
require('role_manage')
require('role_upgrade')
require('role_repair')
require('flags')
require('enemies')
require('powerCreep')
require('defend')
require('info')
require('globals')


global.roomList = {
    agyacska: ['E33S49', 'E35S49', 'E39S43', 'E39S48', 'E39S51', 'E45S41', 'E46S43', 'E47S51', 'E48S34', 'E48S43', 'E51S43', 'E52S41', 'E58S39', 'E58S41', 'E59S42'],
    hackgpp: ['E14S39', 'E19S44', 'E1S36', 'E21S42', 'E24S1', 'E25S39', 'E29S36', 'E2S41', 'E31S23', 'E31S24', 'E31S34', 'E34S1', 'E34S31', 'E35N1', 'E35S31', 'E41S45', 'E44S39', 'W8S41'],
    champion: ['W14N1', 'W1S4', 'W22S1', 'W29S1', 'W29S4', 'W37S1', 'W41S4', 'W45S1', 'W51S1', 'W52S1', 'W57S1', 'W5S1', 'W7S1', 'W9S4'],
    OneWayIsWar: ['E16S51', 'E19S53', 'E1S44', 'E21S59', 'E26S49', 'E29S38', 'E29S51', 'E31S43', 'E31S59', 'E41S43', 'E41S59', 'E46S51', 'E4S49', 'W6S39'],
    Pacificius: ['E11N11', 'E11N17', 'E12N19', 'E14N19', 'E17N13', 'E18N19', 'E19N12', 'E1N11', 'E21N14', 'E22N14', 'E22N16', 'E28N11', 'W1N18', 'W9N9'],
    //ceneezer: ['E11S45', 'E11S46', 'E12S42', 'E14S41', 'E14S42', 'E7S46', 'E8S43', 'E9S46'],
    TheTopCat84: [],//"E11S33", "E12S29", "E13S29", "E13S31", "E13S33", "E13S9", "E14S21", "E14S31", "E14S32", "E21S28", "E21S38", "E23S29", "E26S39", "E27S31", "E29S27", "E4S29", "E6S29", "E8S39", "E9S16", "E9S27", "W1S34", "W1S41", "W7S31"],
    Tornado_Tech:['W28N41', 'W31N45', 'W33N41', 'W41N36', 'W41N37', 'W42N36', 'W43N37', 'W43N38']

}
global.roomList_enemies = {
    tigga: [],
}

global.namesOfAllies = Object.keys(roomList)
global.roomsOfAlliance = []; Object.values(roomList).forEach(rl => roomsOfAlliance.push(...rl))
global.namesOfEnemies = Object.keys(roomList_enemies)
global.updateSettings = function () {
    const cpu = settings.writePerformanceLog ? Game.cpu.getUsed() : 0


    settings.writePerformanceLog ? performance.newLog(cpu, 'updateSettings') : false
}