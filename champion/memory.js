'use strict'
//2023.05.08
global.memoryManager = {}

memoryManager.createMemoryAtStart = function () {
    Memory.rooms = {}
    Memory.creeps = {}
    Memory.tasks = {}
    Memory.squads = {}
    Memory.roomsToUnclaim = []
    Memory.nukeTaskList = []
    Memory.resourcesToUpdate = []
}
memoryManager.updateResources = function (resource = false) {
    const cpu = settings.writePerformanceLog ? Game.cpu.getUsed() : 0
    Memory.resourceToUpdate = Memory.resourceToUpdate || []
    cache.resources = cache.resources || {}
    cache.resources_stat = cache.resources_stat || {}
    const roomsWithStorage = cache.myRooms.filter(myRoom => myRoom.storage && myRoom.storage.my)
    const time = Game.time
    let resourcesList = []
    if (!resource) {
        resourcesList = resourcesList.concat(resourcesTier1, resourcesTier2, resourcesTier3, resourcesTier4, resourcesTier5, resourcesBar, global.basicCommodities, hightCommodities1, hightCommodities2, hightCommodities3, hightCommodities4, hightCommodities5)
    }
    else { resourcesList.push(resource) }

    resourcesList.forEach(resource => {
        const tick = cache.resources_stat[resource]; let sum = 0
        if (tick && Game.time - tick < 10) { return }
        roomsWithStorage.forEach(myRoom => {
            let amount = myRoom.resources[resource] = myRoom.storage.store[resource] + ((myRoom.terminal) ? myRoom.terminal.store[resource] : 0)
            sum += amount
        })
        cache.resources_stat[resource] = Game.time
        cache.resources[resource] = sum;
        if (resource) Memory.resourceToUpdate.splice(Memory.resourceToUpdate.indexOf(resource),1)
        else { Memory.resourceToUpdate = [] }
    })
    settings.writePerformanceLog ? performance.newLog(cpu, 'memoryManager.updateResources') : false
}
memoryManager.addToUpdateList = function (resourceType) {
    if (!Memory.resourceToUpdate.includes(resourceType)) Memory.resourceToUpdate.push(resourceType)
}