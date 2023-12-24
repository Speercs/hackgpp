'use strict'
//2023.10.05 - update labs manage tasks when updated labs reaction
//2023.09.23 - list boost for labs boost mode
//2023.09.22 - fix boost if invalid target
//2023.09.17 - personal maximumStock for boosts
//2023.09.14 - backupStructurePositions ignore containers when lvl == 8
//2023.08.29 - decompress 
//2023.08.23 - boost build base as repair if lvl8
//2023.08.17 - update base to memory
//2023.07.13 - factory produce energy . factory 4lvl 
global.myRooms = {}
global.myRooms_tool = {}
global.MyRoom = class {
    constructor(name) {
        const cpu = settings.writePerformanceLog ? Game.cpu.getUsed() : 0
        this.name = name
        const room = Game.rooms[name]
        this.room = room
        this.my = false
        if (room.controller) {
            this.level = room.controller.level
            this.owner = room.controller.owner
            if (room.controller.my) {
                if (!Memory.rooms[name]) { Memory.rooms[name] = {} }
                else { delete Memory.rooms[name].avoid }
                const roomMemory = Memory.rooms[name]
                this.halted = roomMemory.status ? roomMemory.status == 'halted' : false
                this.resources = {}

                this.settings = { debug: { towers: false, repair: false, terminals: false, spawn: false, factory: false, links: false }, freeUpSpaceOfFactory: false }

                this.tasks = {
                    harvestSource: {},
                    harvestMineral: {},
                    repair: {},
                    upgrade: {},
                    manage: { tasks: [] },
                    defend: { roles: { defend_attack: { role: 'defend_attack', amount: 0 }, defend_rangedAttack: { role: 'defend_rangedAttack', amount: 0 } } },
                }
                this.towersActions = []
                this.sheduledTasks = []
                this.droppedResources = []
                this.tombstones = []
                this.nukes = []; this.timeToLandForNukes = []
                this.base = []
                this.my = true
                //structures will create in clearStructures()
                this.distances = {}
                this.sources = {}
                this.minerals = {}
                if (!roomMemory.queues) { roomMemory.queues = {} }; if (!roomMemory.queues.boost) { roomMemory.queues.boost = [] }; if (!roomMemory.labs) { roomMemory.labs = {} }
                this.queues = { spawn: [], boost: roomMemory.queues.boost, build: [] }

                //find mineral
                room.find(FIND_MINERALS).forEach((mineral) => {
                    this.minerals[mineral.id] = {
                        id: mineral.id,
                        resourceType: mineral.mineralType,
                    }
                    let distanceToMineral
                    if (room.terminal) {
                        distanceToMineral = tools.calculateDistance(room.terminal, mineral)
                    }
                    else { distanceToMineral = tools.calculateDistance(room.controller, mineral) }

                    this.tasks.harvestMineral = { id: mineral.id, resourceType: mineral.mineralType, distance: distanceToMineral, pos: mineral.pos }
                    if (mineral.ticksToRegeneration) {
                        this.tasks.harvestMineral.regenMineral = gameTime + mineral.ticksToRegeneration;
                        this.tasks.harvestMineral.amount = 0
                    }
                    else { this.tasks.harvestMineral.amount = mineral.mineralAmount }

                })
                //find sources                
                room.find(FIND_SOURCES).forEach((source) => {
                    if (!this.sources[source.id]) {
                        this.sources[source.id] = {
                            id: source.id,
                            pos: source.pos,
                        }
                        this.tasks.harvestSource[source.id] = { id: source.id, pos: source.pos }
                        const links = source.pos.findInRange(FIND_MY_STRUCTURES, 2, { filter: str => str.structureType == STRUCTURE_LINK })
                        if (links.length) { this.tasks.harvestSource[source.id].linkId = links[0].id }
                        this.tasks.harvestSource[source.id].workPos = tools.getWorkPosition(source.id)
                        this.tasks.harvestSource[source.id].distance = this.getDistanceByPath(this.room.controller, source)
                    }
                })
            }
            else { if (room.controller.owner) { if (!namesOfAllies.includes(room.controller.owner.username) && !room.memory.ignoreAvoid) { Memory.rooms[name] = { avoid: 1 } } } }
        }
        else {
            const x = ~~name.match(/\d+/g)[0]
            const y = ~~name.match(/\d+/g)[1]
            if (x % 10 == 0 || y % 10 == 0) {
                this.corridor = true
                const deposits = room.find(FIND_DEPOSITS)
                if (deposits.length) {
                    this.deposits = {}
                    deposits.forEach(deposit => this.deposits[deposit.id] = { id: deposit.id, resourceType: deposit.depositType, pos: deposit.pos, lastCooldown: deposit.lastCooldown, accessibleFields: tools.calcAccessibleFields(deposit) })
                }
                const powerBanks = room.find(FIND_STRUCTURES, { filter: { structureType: STRUCTURE_POWER_BANK } })
                if (powerBanks.length) {
                    this.powerBanks = {}
                    powerBanks.forEach(powerBank => this.powerBanks[powerBank.id] = { id: powerBank.id, pos: powerBank.pos, hits: powerBank.hits, ticksToDecay: powerBank.ticksToDecay, power: powerBank.power })
                }
                const portals = room.find(FIND_STRUCTURES, { filter: { structureType: STRUCTURE_PORTAL } })
                if (portals.length) {
                    this.portals = {}
                    portals.forEach(portal => this.portals[portal.id] = { id: portal.id, pos: portal.pos })
                }
            }
        }
        settings.writePerformanceLog ? performance.newLog(cpu, 'MyRoom.constructor') : false
    }
}
MyRoom.prototype.updateMineralRegeneration = function () {
    const mineral = _obj(this.tasks.harvestMineral.id), regenMineral = mineral.ticksToRegeneration
    this.tasks.harvestMineral.amount = mineral.mineralAmount || 0
    if (regenMineral) this.tasks.harvestMineral.regenMineral = gameTime + regenMineral
    else delete this.tasks.harvestMineral.regenMineral
}
MyRoom.prototype.updateStructures = function () {
    const cpu = settings.writePerformanceLog ? Game.cpu.getUsed() : 0

    this.structures = {
        spawns: [],
        links: {},
        labs: {},
        towers: [],
        ramparts: [],
        walls: [],
        extensions: [],
    }
    delete this.factory
    delete this.observer
    delete this.nuker
    delete this.powerSpawn
    delete this.extractor

    this.constructionSites = []

    const room = Game.rooms[this.name]
    const structures = room.find(FIND_MY_STRUCTURES)
    structures.forEach(structure => {
        const id = structure.id
        switch (structure.structureType) {
            case STRUCTURE_SPAWN: this.structures.spawns.push(id); break
            case STRUCTURE_EXTENSION: this.structures.extensions.push(id); break
            case STRUCTURE_TOWER: this.structures.towers.push(id); break
            case STRUCTURE_LINK:
                const type = tools.updateTypeOfLink(id);
                this.structures.links[id] = { id: id, type: type.type }
                if (type.id) {
                    this.structures.links[id].source = type.id
                    if (this.sources[type.id]) { this.sources[type.id].link = id }
                    if (this.tasks.harvestSource[type.id]) { this.tasks.harvestSource[type.id].link = id }
                }
                break
            case STRUCTURE_LAB: this.structures.labs[id] = { id: id }; break
            case STRUCTURE_RAMPART: this.structures.ramparts.push(id); break
            //case STRUCTURE_WALL: this.structures.walls.push(id); break

            case STRUCTURE_FACTORY: this.structures.factory = id; break
            case STRUCTURE_OBSERVER: this.structures.observer = id; break
            case STRUCTURE_NUKER: this.structures.nuker = id; break
            case STRUCTURE_POWER_SPAWN: this.structures.powerSpawn = id; break
            case STRUCTURE_EXTRACTOR: this.structures.extractor = id; break
            case STRUCTURE_CONTROLLER: this.level = structure.level; break
        }
    })

    const constructionSites = room.find(FIND_MY_CONSTRUCTION_SITES);
    if (constructionSites.length) { this.constructionSites = constructionSites.map(cs => cs.id) }
    else { this.constructionSites = [] }

    const walls = room.find(FIND_STRUCTURES, { filter: str => str.structureType == 'constructedWall' });
    if (walls.length) { this.structures.walls = walls.map(w => w.id) }
    else { this.structures.walls = [] }

    // if (this.level < 7) {
    const containers = room.find(FIND_STRUCTURES, { filter: str => str.structureType == 'container' });
    if (containers.length) {
        this.structures.containers = [];
        containers.forEach(container => {
            const infoContainer = tools.updateTypeOfContainer(container.id)
            if (infoContainer.type == 'source') this.tasks.harvestSource[infoContainer.id].container = container.id
            this.structures.containers.push({ id: container.id, type: infoContainer.type })
        })
    }
    else { this.structures.containers = [] }
    // }
    // else { this.structures.containers = [] }
    const roads = room.find(FIND_STRUCTURES, { filter: str => str.structureType == 'road' });
    if (roads.length) { this.structures.roads = roads.map(r => r.id) }
    else { this.structures.roads = [] }

    this.updateLabs()
    settings.writePerformanceLog ? performance.newLog(cpu, 'MyRoom.prototype.updateStructures') : false
}
MyRoom.prototype.showMiniTasks = function (resourceType = false) {
    if (!this.my) { return }
    let msg = `lastUpdateMicroTasks: ${gameTime - this.lastUpdateMicroTasks}\n`
    msg += `lastUpdateMicroTasks_labs: ${gameTime - this.lastUpdateMicroTasks_labs}\n`
    msg += `lastUpdateMicroTasks_towers: ${gameTime - this.lastUpdateMicroTasks_towers}\n`
    msg += `lastUpdateMicroTasks_tombstones: ${gameTime - this.lastUpdateMicroTasks_tombstones}\n`
    msg += `lastUpdateMicroTasks_factory: ${gameTime - this.lastUpdateMicroTasks_factory}\n`
    msg += `lastUpdateMicroTasks_powerSpawn: ${gameTime - this.lastUpdateMicroTasks_powerSpawn}\n`
    msg += `lastUpdateMicroTasks_links: ${gameTime - this.lastUpdateMicroTasks_links}\n`
    msg += `lastUpdateMicroTasks_TS: ${gameTime - this.lastUpdateMicroTasks_TS}\n`
    msg += `lastUpdateMicroTasks_nuker: ${gameTime - this.lastUpdateMicroTasks_nuker}\n`
    msg += `lastUpdateMicroTasks_extensionsAndSpawns: ${gameTime - this.lastUpdateMicroTasks_extensionsAndSpawns}\n`
    msg += `lastUpdateMicroTasks_containers: ${gameTime - this.lastUpdateMicroTasks_containers}\n`




    if (resourceType) {
        this.tasks.manage.tasks.filter(t => t.resourceType == resourceType).sort((a, b) => a.time - b.time).forEach(t => msg += JSON.stringify(t) + '\n')
    }
    else {
        this.tasks.manage.tasks.sort((a, b) => a.priority - b.priority && a.time - b.time).forEach(t => msg += JSON.stringify(t) + '\n')
    }
    console.log(msg);
}
MyRoom.prototype.setStatusToSpawns = function () {
    const cpu = settings.writePerformanceLog ? Game.cpu.getUsed() : 0
    let spawns = []
    if (this.spawns.length) { spawns = this.spawns }
    else { if (this.spawnsId.length) { spawns = this.spawnsId.map(id => _obj(id)) } }

    if (spawns.length) {
        if (Object.keys(this.sources).length) {
            const sources = Object.keys(this.sources).map(id => _obj(id))
            spawns.forEach(spawn => {
                sources.forEach(source => { if (spawn.pos.inRangeTo(source, 2)) { this.spawnType[spawn.id] = 'source' }; this.tasks.harvestSource[source.id].spawn = spawn.id })
                if (!this.spawnType[spawn.id]) { this.spawnType[spawn.id] = 'base' }
            })
        }
    }
    settings.writePerformanceLog ? performance.newLog(cpu, 'MyRoom.prototype.setStatusToSpawns') : false
}
MyRoom.prototype.delete = function () {
    const name = this.name
    if (!this.my) { delete myRooms[name]; return }
    _.filter(tasks, t => { t.spawnRoom == this || t.pos.roomName == name }).forEach(t => t.delete());
    if (this.room) {
        this.room.find(FIND_STRUCTURES).forEach(s => s.destroy())
        this.room.controller.unclaim();
    }
    Memory.roomsToUnclaim.splice(Memory.roomsToUnclaim.indexOf(name), 1)
    _.filter(Game.market.orders, o => o.roomName == name).map(o => o.id).forEach(id => Game.market.cancelOrder(id))
    delete myRooms[name]
}
MyRoom.prototype.createTaskForDefendFromInvaders = function (enemiesInRoom) {
    // if (!_.find(tasks => task.type == 'defend from invaders' && task.pos.roomName == this.name)) {
    // taskTools.create('defend from invaders', enemiesInRoom[0].pos)
    // console.log(`create task for defend room ${this.name} from invaders`);
    // }
}
MyRoom.prototype.processPower = function () {
    const cpu = settings.writePerformanceLog ? Game.cpu.getUsed() : 0
    const powerSpawn = _obj(this.structures.powerSpawn)
    if (powerSpawn) {
        powerSpawn.processPower()
        this.registerSheduledTask('update powerSpawn');
    }
    settings.writePerformanceLog ? performance.newLog(cpu, 'MyRoom.prototype.processPower') : false
}
MyRoom.prototype.updateDistances = function () {
    const cpu = settings.writePerformanceLog ? Game.cpu.getUsed() : 0
    this.distances = {}
    //mineral
    const mineral = _obj(Object.keys(this.minerals)[0])
    if (mineral) {
        if (this.terminal) {
            const distance = tools.calculateDistance(mineral, this.terminal)
            if (distance) { write(mineral.id, this.terminal.id) }
        }
    }
    //sources
    Object.keys(this.sources).forEach(id => {
        const source = _obj(id)
        if (source && this.storage) {
            const distance = tools.calculateDistance(source, this.storage)
            if (distance) { write(id, this.storage.id, distance) }
        }
    })
    function write(id1, id2, distance) {
        this.distances[id1][id2] = distance
        this.distances[id2][id1] = distance
    }
    settings.writePerformanceLog ? performance.newLog(cpu, 'MyRoom.prototype.updateDistances') : false
}
MyRoom.prototype.clearManageMicroTasks = function (creepName) {
    if (creepName) { this.tasks.manage.tasks.filter(t => t.creepName == creepName).forEach(task => { task.creepName = ''; delete task.transfer; delete task.status }) }
    else {
        const namesPC = _.map(Game.powerCreeps, pc => pc.name), namesCreeps = this.creeps.filter(c => c.memory.role == 'manage').map(c => c.name)
        const names = namesCreeps.concat(namesPC)
        this.tasks.manage.tasks.filter(t => !names.includes(t.creepName)).forEach(task => { task.creepName = ''; delete task.transfer; delete task.status })
    }
}
MyRoom.prototype.spawnWorkLoad = function () {
    const bodyCountExistingCreeps = _.filter(Game.creeps, cr => cr.memory.spawnRoom == this.name).map(c => c.body.length).reduce((a, b) => a + b, 0)
    const bodyCountInQueuesSpawn = this.queues.spawn.map(sp => sp.creepBody.length).reduce((a, b) => a + b, 0)
    return bodyCountExistingCreeps + bodyCountInQueuesSpawn
}
MyRoom.prototype.zeroManagers = function () {
    if (this.tasks.manage.forced_requiredWorkers == 0) { return false }
    if (!_.filter(this.creeps, creep => creep.memory.role == 'manage').length) { return true } else { return false }
}
MyRoom.prototype.zeroUpgraders = function () {
    if (!_.filter(this.creeps, creep => creep.memory.role == 'upgrade').length) { return true } else { return false }
}
MyRoom.prototype.getDistanceByPath = function (obj1, obj2, ignoreSwamp = false) {
    if (!this.my) { return }
    const a = this.distances[`pos ${obj1.pos.x}, ${obj1.pos.y}`]
    if (a) {
        const a1 = a[`pos ${obj2.pos.x}, ${obj2.pos.y}`]
        if (a1) { return a1.distance }
    }
    let path = obj1.pos.findPathTo(obj2, { ignoreCreeps: true, ignoreRoads: true })
    if (path) {
        const distance = path.length
        const b = _.find(this.distances, d => d.x == obj2.x && d.y == obj2.y)
        if (a) { a[`pos ${obj2.pos.x}, ${obj2.pos.y}`] = { x: obj2.pos.x, y: obj2.pos.y, distance: distance } }
        else { this.distances[`pos ${obj1.pos.x}, ${obj1.pos.y}`] = { x: obj1.pos.x, y: obj1.pos.y, [`pos ${obj2.pos.x}, ${obj2.pos.y}`]: { x: obj2.pos.x, y: obj2.pos.y, distance: distance } } }
        if (b) { b[`pos ${obj1.pos.x}, ${obj1.pos.y}`] = { x: obj1.pos.x, y: obj1.pos.y, distance: distance } }
        else { this.distances[`pos ${obj2.pos.x}, ${obj2.pos.y}`] = { x: obj2.pos.x, y: obj2.pos.y, [`pos ${obj1.pos.x}, ${obj1.pos.y}`]: { x: obj1.pos.x, y: obj1.pos.y, distance: distance } } }
        return distance
    }
}
MyRoom.prototype.registerSheduledTask = function (type, time = gameTime + 1) {
    let task
    task = this.sheduledTasks.find(t => t.type == type && t.time == time)
    if (!task) {
        const newTask = { time: time, type: type }
        this.sheduledTasks.push(newTask)
    }
}
MyRoom.prototype.runSheduledTasks = function () {
    const tasks = this.sheduledTasks.filter(t => t.time == gameTime)
    tasks.forEach(task => {
        switch (task.type) {
            case 'update extensions': try { this.updateManageMicroTasks({ extensions: true }) }
                catch (error) { console.log(`${this ? this.name : 'room name unknown'}`, 'update extensions', error) }; break
            case 'update labs': try { this.updateManageMicroTasks({ labs: true }) }
                catch (error) { console.log(`${this ? this.name : 'room name unknown'}`, 'update labs', error) }; break
            case 'update towers': try { this.updateManageMicroTasks({ towers: true }) }
                catch (error) { console.log(`${this ? this.name : 'room name unknown'}`, 'update towers', error) }; break
            case 'update boost': try { this.updateManageMicroTasks({ boost: true }) }
                catch (error) { console.log(`${this ? this.name : 'room name unknown'}`, 'update boost', error) }; break
            case 'update factory': try { this.updateManageMicroTasks({ factory: true }) }
                catch (error) { console.log(`${this ? this.name : 'room name unknown'}`, 'update factory', error) }; break
            case 'update powerSpawn': try { this.updateManageMicroTasks({ powerSpawn: true }) }
                catch (error) { console.log(`${this ? this.name : 'room name unknown'}`, 'update powerSpawn', error) }; break
            case 'update storage terminal': try { this.updateManageMicroTasks({ storage_terminal: true }) }
                catch (error) { console.log(`${this ? this.name : 'room name unknown'}`, 'update storage_terminal', error) }; break
            case 'update structures without energy': try { this.updateManageMicroTasks() }
                catch (error) { console.log(`${this ? this.name : 'room name unknown'}`, 'update structures without energy', error) }; break
            case 'clearing storage link':
                try { this.registerManageTask({ object1: _.find(this.structures.links, l => l.type == 'storage').id, type: 'clearing storage link', amount: 776, priority: 5 }) }
                catch (error) { console.log(`${this ? this.name : 'room name unknown'}`, 'clearing storage link', error) }; break
            case 'fill storage link':
                try { this.registerManageTask({ object1: _.find(this.structures.links, l => l.type == 'storage').id, type: 'fill storage link', amount: 800, priority: 5 }) }
                catch (error) { console.log(`${this ? this.name : 'room name unknown'}`, 'fill storage link', error) }
                break
            case 'updateStructures': try { this.updateStructures() }
                catch (error) { console.log(`${this ? this.name : 'room name unknown'}`, 'updateStructures', error) }; break
            case 'updateTombstones': try { this.updateTombstones() }
                catch (error) { console.log(`${this ? this.name : 'room name unknown'}`, 'updateTombstones', error) }; break
            case 'updateNukes':
                try { this.updateNukes(); this.updateTimeToLandForNukes() }
                catch (error) { console.log(`${this ? this.name : 'room name unknown'}`, 'updateNukes', error) }
                break
        }
    })
    const tasksToDelete = this.sheduledTasks.filter(t => t.time < gameTime)
    tasksToDelete.forEach(task => this.sheduledTasks.splice(this.sheduledTasks.indexOf(task), 1))
}
MyRoom.prototype.getStorageLink = function () {
    if (this.cache.storageLink !== undefined) return this.cache.storageLink
    const storageLinkData = _.find(this.structures.links, l => l.type == 'storage')
    if (storageLinkData) {
        const storageLink = _obj(storageLinkData.id)
        if (storageLink) { this.cache.storageLink = storageLink; return storageLink }
        else { this.cache.storageLink = false; return false }
    }
    else { this.cache.storageLink = false; return false }
}
MyRoom.prototype.getControllerLink = function () {
    if (this.cache.controllerLink !== undefined) return this.cache.controllerLink
    const controllerLinkData = _.find(this.structures.links, l => l.type == 'controller')
    if (controllerLinkData) {
        const controllerLink = _obj(controllerLinkData.id)
        if (controllerLink) { this.cache.controllerLink = controllerLink; return controllerLink }
        else { this.cache.controllerLink = false; return false }
    }
    else { this.cache.controllerLink = false; return false }
}
MyRoom.prototype.getSourceLink = function (sourceId) {
    this.cache.sourceLinks = this.cache.sourceLinks || {}

    if (this.cache.sourceLinks[sourceId] !== undefined) return this.cache.sourceLinks[sourceId]

    const link = this.tasks.harvestSource[sourceId].link
    if (link) { this.cache.sourceLinks[sourceId] = link; return link }
    else { this.cache.sourceLinks[sourceId] = false; return false }
}
MyRoom.prototype.linkLogick = function () {
    const cpu = settings.writePerformanceLog ? Game.cpu.getUsed() : 0
    if (!Object.keys(this.structures.links).length) { return }

    if (!this.storage) { this.storage = Game.rooms[this.name].storage }
    if (!this.storage) { return }
    const res = RESOURCE_ENERGY
    const storageLinkId = _.find(this.structures.links, l => l.type == 'storage')
    const controllerLinkId = _.find(this.structures.links, l => l.type == 'controller')
    let controllerLink
    if (controllerLinkId) { controllerLink = _obj(controllerLinkId.id) }
    let storageLink
    const links = {}
    if (storageLinkId) {
        storageLink = _obj(storageLinkId.id);
        if (storageLink) { links[storageLinkId] = { id: storageLinkId, amount: storageLink.store.getUsedCapacity(res) } }
    }
    let amountRoleRepair
    if (!this.settings.ignoreRepairsForLinks) amountRoleRepair = _.filter(this.creeps, creep => creep.memory.role == 'repair').length
    const amountRoleUpgrade = _.filter(this.creeps, creep => creep.memory.role == 'upgrade').length
    if (this.storage.store['energy'] > 10000 && amountRoleRepair) {
        if (this.settings.debug.links) { console.log(this.name, 'links transfer to all links for support repair creeps') }
        const otherLinksId = Object.keys(this.structures.links).filter(id => id !== ((storageLink) ? storageLink.id : false))
        if (otherLinksId.length) {
            const otherLinks = idToObj(otherLinksId)
            otherLinks.forEach(link => links[link.id] = { id: link.id, amount: link.store.getUsedCapacity(res) })
            const over600 = otherLinks.filter(link => link.store.getUsedCapacity(res) > 600)
            over600.sort((a, b) => b.store.getUsedCapacity(res) - a.store.getUsedCapacity(res))
            const below600 = otherLinks.filter(link => link.store.getUsedCapacity(res) < 600)
            below600.sort((a, b) => a.store.getUsedCapacity(res) - b.store.getUsedCapacity(res))
            if (below600.length) {
                if (storageLink) {
                    const amount = storageLink.store.getUsedCapacity(res)
                    if (amount) {
                        const result = storageLink.transferEnergy(below600[0])
                        if (result == OK) {
                            links[below600[0].id].amount += amount
                            if (links[below600[0].id].amount >= 800) { below600.splice(0, 1) }
                        }
                    }
                }
            }
            while (below600.length && over600.length) {
                const link1 = over600[0]; const link2 = below600[0];
                const result = link1.transferEnergy(link2, link1.store.getUsedCapacity(res) - 600)
                if (result == OK) {
                    links[link1.id].amount -= link1.store.getUsedCapacity(res) - 600; over600.splice(0, 1)
                    links[link2.id].amount += link1.store.getUsedCapacity(res) - 600;
                    if (links[link2.id].amount >= 800) { below600.splice(0, 1) }
                }
                else { over600.splice(0, 1) }
            }
        }
    }
    else if (this.storage.store['energy'] > 10000 && amountRoleUpgrade && controllerLink) {
        if (this.settings.debug.links) { console.log(this.name, 'links transfer to controller link', `controllerLink.store.getFreeCapacity('energy') > 200:${controllerLink.store.getFreeCapacity('energy') > 200}`) }
        if (controllerLink.store.getFreeCapacity('energy') > 200) {
            const links = idToObj(_.filter(this.structures.links, l => l.type !== 'controller' && l.type !== 'storage').map(l => l.id)).filter(link => !link.cooldown && link.store[RESOURCE_ENERGY] == 800)
            links.sort((a, b) => b.pos.getRangeTo(controllerLink) - a.pos.getRangeTo(controllerLink))
            let transfer
            links.forEach(link => {
                if (!transfer) {
                    const res = link.transferEnergy(controllerLink)
                    if (res == OK) { transfer = true }
                }
            })
            if (!transfer) {
                const res = storageLink.transferEnergy(controllerLink)
                if (res == OK) {
                    if (this.settings.debug.links) console.log(`registerSheduledTask('clearing storage link')`)
                    this.registerSheduledTask('clearing storage link')
                }
            }
        }
        else { transferToStorageLink(this) }
    }
    else { transferToStorageLink(this) }
    function transferToStorageLink(myRoom) {
        if (myRoom.settings.debug.links) { console.log(myRoom.name, 'links transfer to storage link', storageLink) }
        if (!storageLink) { return }

        const links = idToObj(_.filter(myRoom.structures.links, l => l.type !== 'controller' && l.type !== 'storage').map(l => l.id))
        for (const link of links) {
            const type = myRoom.structures.links[link.id].type
            if (type == 'source') {
                if (link.store[RESOURCE_ENERGY] == 800 && storageLink.store.getFreeCapacity(RESOURCE_ENERGY) == 800) {
                    const res = link.transferEnergy(storageLink)
                    if (myRoom.settings.debug.links) { console.log(myRoom.name, 'links transfer to storage link, res:', res) }
                    if (res == OK) {
                        if (myRoom.settings.debug.links) console.log('clearing storage link')
                        myRoom.registerSheduledTask('clearing storage link')
                        break
                    }
                }
            }
        }
    }
    settings.writePerformanceLog ? performance.newLog(cpu, 'MyRoom.prototype.linkLogick', this.name) : false
}
MyRoom.prototype.updateLabs = function () {
    const cpu = settings.writePerformanceLog ? Game.cpu.getUsed() : 0
    let labsList = idToObj(Object.keys(this.structures.labs)).filter(l => l.isActive())
    labsList.forEach(lab => this.structures.labs[lab.id].canBoost = true) //by default all labs can boost, exclude labs with resources for reaction

    //update mineral lab

    const mineralPos = this.tasks.harvestMineral.pos, mineralLabs = mineralPos.findInRange(labsList, 2)
    let mineralLab
    if (mineralLabs.length) {
        mineralLabs.sort((a, b) => a.pos.getRangeTo(mineralPos) - b.pos.getRangeTo(mineralPos))
        mineralLab = mineralLabs[0]; this.tasks.harvestMineral.lab = mineralLab.id
        this.structures.labs[mineralLab.id].canBoost = false
    }
    labsList = labsList.filter(lab => lab !== mineralLab)
    //find distances between labs
    const labs = []

    labsList.forEach(lab => {
        const otherLabs = labsList.filter(l => l !== lab)
        otherLabs.forEach(ol => {
            let labInArray = labs.find(l => l.id == lab.id)
            if (!labInArray) { labs.push({ id: lab.id, sumDistances: lab.pos.getRangeTo(ol), distanceToTerminal: lab.pos.getRangeTo(this.terminal) }) }
            else { labInArray.sumDistances += lab.pos.getRangeTo(ol) }
        })
    })
    if (labs.length == 3) { labs.sort((a, b) => a.sumDistances - b.sumDistances && b.distanceToTerminal - a.distanceToTerminal) }
    else { labs.sort((a, b) => a.sumDistances - b.sumDistances) }


    if (labs.length >= 3) {
        this.structures.labs[Object.values(labs)[0].id] = { id: Object.values(labs)[0].id, role: 'out', canBoost: false }
        this.structures.labs[Object.values(labs)[1].id] = { id: Object.values(labs)[1].id, role: 'out', canBoost: false }
        if (!this.queues.boost.find(b => b.id == Object.values(labs)[2].id)) {
            this.structures.labs[Object.values(labs)[2].id] = { id: Object.values(labs)[2].id, role: 'in', canBoost: true }
        }
    }

    if (labsList.length > 3) {
        for (let i = 3; i < labsList.length; i++) {
            if (!this.queues.boost.find(b => b.id == Object.values(labs)[i].id)) {
                this.structures.labs[Object.values(labs)[i].id] = { id: Object.values(labs)[i].id, role: 'in', canBoost: true }
            }
        }
    }
    settings.writePerformanceLog ? performance.newLog(cpu, 'MyRoom.prototype.updateLabs') : false
}
MyRoom.prototype.updateLabReaction = function () { //choose reaction
    const cpu = settings.writePerformanceLog ? Game.cpu.getUsed() : 0
    if (!settings.labReactions || this.room.memory.labsBoostMode) { return }
    if (Memory.roomsToUnclaim.includes(this.name)) { return }
    this.updateLabReactionTick = gameTime
    const task = this.room.memory.labs
    tools.calculateResourcesUsedHistorySummary()
    const countOfMyRooms = cache.countOfMyRooms
    if (!cache.resourcesSortedToChooseByLabs) {
        const typesOfResouces = [].concat(resourcesTier2, resourcesTier3, resourcesTier4)
        typesOfResouces.sort((a, b) => (cache.resources[a] - ((cache.resourcesUsedHistorySummary[a] > 0) ? cache.resourcesUsedHistorySummary[a] : 0)) - (cache.resources[b] - ((cache.resourcesUsedHistorySummary[b] > 0) ? cache.resourcesUsedHistorySummary[b] : 0)))
        cache.resourcesSortedToChooseByLabs = typesOfResouces
    }
    let choosenResource

    for (const resourceType of cache.resourcesSortedToChooseByLabs) {
        if (cache.resources[resourceType] > countOfMyRooms * maximumStock(resourceType)) { continue }
        if (choosenResource) { break }
        if (this.checkResByHiRes(resourceType, 1000)) { choosenResource = resourceType; if (this.settings.debug.labs) { console.log(this.name, 'updateLabReaction', 'choosenResource:', choosenResource) } }
    }
    task.reaction = choosenResource
    switch (choosenResource) {
        case 'XGHO2': task.resource1 = 'X'; task.resource2 = 'GHO2'; break;
        case 'XZHO2': task.resource1 = 'X'; task.resource2 = 'ZHO2'; break;
        case 'XKHO2': task.resource1 = 'X'; task.resource2 = 'KHO2'; break;
        case 'XUHO2': task.resource1 = 'X'; task.resource2 = 'UHO2'; break;
        case 'XLHO2': task.resource1 = 'X'; task.resource2 = 'LHO2'; break;
        case 'XGH2O': task.resource1 = 'X'; task.resource2 = 'GH2O'; break;
        case 'XUH2O': task.resource1 = 'X'; task.resource2 = 'UH2O'; break;
        case 'XZH2O': task.resource1 = 'X'; task.resource2 = 'ZH2O'; break;
        case 'XKH2O': task.resource1 = 'X'; task.resource2 = 'KH2O'; break;
        case 'XLH2O': task.resource1 = 'X'; task.resource2 = 'LH2O'; break;

        case 'GHO2': task.resource1 = 'GO'; task.resource2 = 'OH'; break;
        case 'ZHO2': task.resource1 = 'ZO'; task.resource2 = 'OH'; break;
        case 'KHO2': task.resource1 = 'KO'; task.resource2 = 'OH'; break;
        case 'UHO2': task.resource1 = 'UO'; task.resource2 = 'OH'; break;
        case 'LHO2': task.resource1 = 'LO'; task.resource2 = 'OH'; break;
        case 'GH2O': task.resource1 = 'GH'; task.resource2 = 'OH'; break;
        case 'UH2O': task.resource1 = 'UH'; task.resource2 = 'OH'; break;
        case 'ZH2O': task.resource1 = 'ZH'; task.resource2 = 'OH'; break;
        case 'KH2O': task.resource1 = 'KH'; task.resource2 = 'OH'; break;
        case 'LH2O': task.resource1 = 'LH'; task.resource2 = 'OH'; break;

        case 'OH': task.resource1 = 'O'; task.resource2 = 'H'; break;
        case 'UO': task.resource1 = 'U'; task.resource2 = 'O'; break;
        case 'UH': task.resource1 = 'U'; task.resource2 = 'H'; break;
        case 'UL': task.resource1 = 'U'; task.resource2 = 'L'; break;
        case 'GO': task.resource1 = 'G'; task.resource2 = 'O'; break;
        case 'GH': task.resource1 = 'G'; task.resource2 = 'H'; break;
        case 'KO': task.resource1 = 'K'; task.resource2 = 'O'; break;
        case 'KH': task.resource1 = 'K'; task.resource2 = 'H'; break;
        case 'ZK': task.resource1 = 'Z'; task.resource2 = 'K'; break;
        case 'ZO': task.resource1 = 'Z'; task.resource2 = 'O'; break;
        case 'ZH': task.resource1 = 'Z'; task.resource2 = 'H'; break;
        case 'LH': task.resource1 = 'L'; task.resource2 = 'H'; break;
        case 'LO': task.resource1 = 'L'; task.resource2 = 'O'; break;

        case 'G': task.resource1 = 'UL'; task.resource2 = 'ZK'; break;
        default: delete task.reaction; delete task.resource1; delete task.resource2; break
    }
    if (task.reaction) {//clear mini tasks for labs
        const labsId = _.map(this.structures.labs, 'id')
        this.tasks.manage.tasks.filter(t => t.object2 && (labsId.includes(t.object1) || labsId.includes(t.object2))).forEach(t => {
            this.tasks.manage.tasks.cut(t)
        })
        // this.updateManageMicroTasks({ labs: true })
        delete this.lastUpdateMicroTasks_labs; this.updateManageMicroTasks_labs()        
    }
    if (settings.debug.labs) { console.log(`${this.name}\t${JSON.stringify(task)}`); }
    settings.writePerformanceLog ? performance.newLog(cpu, 'MyRoom.prototype.updateLabReaction') : false
}
MyRoom.prototype.runReaction = function () {
    if (Game.cpu.bucket < settings.bucket.labsReaction || this.room.memory.labsBoostMode) { return }
    const debug = this.settings.debug.labs; let debugText = `${this.name} runReaction: ${this.room.memory.labs.reaction}\n`
    if (cache.cpu.functionsCurrentTick.modules['labs.run']) {
        if (debug) { console.log(cache.cpu.functionsCurrentTick.modules['labs.run'].cpuUsed, settings.tasks.labsCPU, cache.cpu.functionsCurrentTick.modules['labs.run'].cpuUsed > settings.tasks.labsCPU) }
        if (cache.cpu.functionsCurrentTick.modules['labs.run'].cpuUsed > settings.tasks.labsCPU) { return }
    }
    const cpu = Game.cpu.getUsed()
    if (!this.room.memory.labs.reaction) {
        if (debug) console.log(debugText);
        return
    }


    const labsOut = idToObj(_.filter(this.structures.labs, lab => lab.role == 'out').map(lab => lab.id))
    if (debug) debugText += `labsOut.length:${labsOut.length}\n`
    if (labsOut.length < 2) {
        if (debug) console.log(debugText);
        return
    }
    const lab1 = labsOut[0], lab2 = labsOut[1]
    let res1, res2
    const listOfResInLab1 = Object.keys(lab1.store).filter(resourceType => resourceType !== RESOURCE_ENERGY); const listOfResInLab2 = Object.keys(lab2.store).filter(resourceType => resourceType !== RESOURCE_ENERGY)
    if (listOfResInLab1.length) { res1 = listOfResInLab1[0] }; if (listOfResInLab2.length) { res2 = listOfResInLab2[0] }
    if (res1 && res2) {
        if ((res1 == this.room.memory.labs.resource1 && res2 == this.room.memory.labs.resource2) || (res1 == this.room.memory.labs.resource2 && res2 == this.room.memory.labs.resource1)) {
            const labsForBoost = this.queues.boost.filter(b => b.lab).map(b => b.lab)
            const labsIn = idToObj(_.filter(this.structures.labs, lab => lab.role == 'in' && !labsForBoost.includes(lab.id)).map(lab => lab.id))
            if (!labsIn.length) { return }

            for (const lab of labsIn) { const res = lab.runReaction(labsOut[0], labsOut[1]); if (debug) debugText += `${lab} reaction: ${res}` }
        }
    }
    if (debug) console.log(debugText)
    performance.newLog(cpu, 'labs.run', this.name)
}
MyRoom.prototype.setLabsBoostMode = function (turnOff = false, list = []) {
    if (turnOff) {
        console.log(this.name, 'setLabsBoostMode turned off')
        this.room.memory.labs = {}
        this.room.memory.labsBoostMode = false
        return
    }
    const mineralLabId = this.tasks.harvestMineral.lab
    // const labs = idToObj(_.filter(this.structures.labs, lab => lab.id !== mineralLabId).map(lab => lab.id))
    const labs = idToObj(_.map(this.structures.labs, lab => lab.id))
    let boosts
    if (list.length) boosts = list
    else boosts = ['XZHO2', 'XGHO2', 'XUH2O', 'XLHO2', 'XKHO2', 'XZH2O', 'XLH2O', 'XUHO2', 'XKH2O', 'XGH2O']

    this.room.memory.labs = {}
    for (let i = 0; i < labs.length; i++) {
        const boost = boosts[i]; const id = labs[i].id
        this.room.memory.labs[id] = { id: id, resourceType: boost }
    }
    this.room.memory.labsBoostMode = true
    this.updateManageMicroTasks_labs()
}
MyRoom.prototype.boostCreeps = function () {
    const creeps = []
    _.map(this.queues.boost, boost => boost.creepName).forEach(name => { const creep = Game.creeps[name]; if (creep) creeps.push(creep) })
    _.filter(this.queues.boost, boost => !boost.resourceType).forEach(boost => {
        if (boost.type == WORK) {
            switch (boost.spec) {
                case 'upgradeController': boost.resourceType = 'XGH2O'; break
                case 'build': boost.resourceType = 'XLH2O'; break
                case 'repair': boost.resourceType = 'XLH2O'; break
                case 'harvest': boost.resourceType = 'XUHO2'; break
                case 'dismantle': boost.resourceType = 'XZH2O'; break
                case 'harvest deposit': boost.resourceType = 'XUHO2'; break
                case 'harvest mineral': boost.resourceType = 'XUHO2'; break
            }
        }
        else if (boost.type == ATTACK) boost.resourceType = 'XUH2O'
        else if (boost.type == RANGED_ATTACK) boost.resourceType = 'XKHO2'
        else if (boost.type == CARRY) boost.resourceType = 'XKH2O'
        else if (boost.type == MOVE) boost.resourceType = 'XZHO2'
        else if (boost.type == TOUGH) boost.resourceType = 'XGHO2'
        else if (boost.type == HEAL) boost.resourceType = 'XLHO2'
    })
    let resources = [...new Set(_.map(this.queues.boost, boost => boost.resourceType))]
    let updateLabs
    for (const resourceType of resources) {
        const labObj = _.find(this.room.memory.labs, lab => lab.resourceType == resourceType); if (!labObj) continue
        const labId = labObj.id; if (!labId) continue
        const lab = _obj(labId); if (!lab) continue
        const creepsForThisResourceType = creeps.filter(creep => this.queues.boost.find(boost => boost.creepName == creep.name && boost.resourceType == resourceType))
        for (const creep of creepsForThisResourceType) {
            const boost = this.queues.boost.find(boost => boost.creepName == creep.name && boost.resourceType == resourceType)
            if (lab.store[resourceType] >= boost.bodyPartsCount * 30 && lab.store[RESOURCE_ENERGY] >= boost.bodyPartsCount * 20) {
                const resBoost = lab.boostCreep(creep);
                if (resBoost == OK) {
                    updateLabs = true
                    this.queues.boost.cut(boost)
                    break
                }
                // else if (resBoost == ERR_INVALID_TARGET) {
                //     this.queues.boost.cut(boost)
                //     break
                // }
            }
        }
    }
    if (updateLabs) {
        this.registerSheduledTask('update labs')
        this.boostBackup();
    }
}
MyRoom.prototype.checkResByHiRes = function (resourceType, amount) {//check base resources to get resourceType by labs
    switch (resourceType) {
        case 'OH': if (this.resources['O'] >= amount && this.resources['H'] >= amount) { return true }; break;
        case 'UO': if (this.resources['U'] >= amount && this.resources['O'] >= amount) { return true }; break;
        case 'UH': if (this.resources['U'] >= amount && this.resources['H'] >= amount) { return true }; break;
        case 'UL': if (this.resources['U'] >= amount && this.resources['L'] >= amount) { return true }; break;
        case 'GO': if (this.resources['G'] >= amount && this.resources['O'] >= amount) { return true }; break;
        case 'GH': if (this.resources['G'] >= amount && this.resources['H'] >= amount) { return true }; break;
        case 'KO': if (this.resources['K'] >= amount && this.resources['O'] >= amount) { return true }; break;
        case 'KH': if (this.resources['K'] >= amount && this.resources['H'] >= amount) { return true }; break;
        case 'ZK': if (this.resources['Z'] >= amount && this.resources['K'] >= amount) { return true }; break;
        case 'ZO': if (this.resources['Z'] >= amount && this.resources['O'] >= amount) { return true }; break;
        case 'ZH': if (this.resources['Z'] >= amount && this.resources['H'] >= amount) { return true }; break;
        case 'LH': if (this.resources['L'] >= amount && this.resources['H'] >= amount) { return true }; break;
        case 'LO': if (this.resources['L'] >= amount && this.resources['O'] >= amount) { return true }; break;

        case 'G': if (this.resources['ZK'] >= amount && this.resources['UL'] >= amount) { return true }; break

        case 'GHO2': if (this.resources['GO'] >= amount && this.resources['OH'] >= amount) { return true }; break;
        case 'ZHO2': if (this.resources['ZO'] >= amount && this.resources['OH'] >= amount) { return true }; break;
        case 'KHO2': if (this.resources['KO'] >= amount && this.resources['OH'] >= amount) { return true }; break;
        case 'UHO2': if (this.resources['UO'] >= amount && this.resources['OH'] >= amount) { return true }; break;
        case 'LHO2': if (this.resources['LO'] >= amount && this.resources['OH'] >= amount) { return true }; break;
        case 'GH2O': if (this.resources['GH'] >= amount && this.resources['OH'] >= amount) { return true }; break;
        case 'UH2O': if (this.resources['UH'] >= amount && this.resources['OH'] >= amount) { return true }; break;
        case 'ZH2O': if (this.resources['ZH'] >= amount && this.resources['OH'] >= amount) { return true }; break;
        case 'KH2O': if (this.resources['KH'] >= amount && this.resources['OH'] >= amount) { return true }; break;
        case 'LH2O': if (this.resources['LH'] >= amount && this.resources['OH'] >= amount) { return true }; break;

        case 'XGHO2': if (this.resources['GHO2'] >= amount && this.resources['X'] >= amount) { return true }; break;
        case 'XZHO2': if (this.resources['ZHO2'] >= amount && this.resources['X'] >= amount) { return true }; break;
        case 'XKHO2': if (this.resources['KHO2'] >= amount && this.resources['X'] >= amount) { return true }; break;
        case 'XUHO2': if (this.resources['UHO2'] >= amount && this.resources['X'] >= amount) { return true }; break;
        case 'XLHO2': if (this.resources['LHO2'] >= amount && this.resources['X'] >= amount) { return true }; break;
        case 'XGH2O': if (this.resources['GH2O'] >= amount && this.resources['X'] >= amount) { return true }; break;
        case 'XUH2O': if (this.resources['UH2O'] >= amount && this.resources['X'] >= amount) { return true }; break;
        case 'XZH2O': if (this.resources['ZH2O'] >= amount && this.resources['X'] >= amount) { return true }; break;
        case 'XKH2O': if (this.resources['KH2O'] >= amount && this.resources['X'] >= amount) { return true }; break;
        case 'XLH2O': if (this.resources['LH2O'] >= amount && this.resources['X'] >= amount) { return true }; break;
    }
    return false
}
MyRoom.prototype.myVisual = function () {
    if (this.settings.visual) {
        this.base.forEach(lab => {
            new RoomVisual(lab.roomName).circle(lab, {
                fill: "transparent", stroke: 'green', strokeWidth: .15, opacity: .5
            })
        })
    }
    return
    const labsId = Object.keys(this.structures.labs)
    if (labsId.length) {
        const labs = idToObj(labsId)
        labs.forEach(lab => {
            if (this.structures.labs[lab.id].role == 'out') {
                new RoomVisual(lab.pos.roomName).circle(lab.pos, {
                    radius: .45, fill: "transparent", stroke: 'red', strokeWidth: .15, opacity: .5
                })
            }
            // else {
            //     new RoomVisual(lab.pos.roomName).circle(lab.pos, {
            //         radius: .45, fill: "transparent", stroke: 'green', strokeWidth: .15, opacity: .5
            //     })
            // }
        })
        // _.filter(XmyRooms.E41S49.queues.boost, boost => boost.ready).forEach(boost => {
        //     const lab = _obj(boost.lab)
        //     new RoomVisual(lab.pos.roomName).circle(lab.pos, {
        //         radius: .4, fill: "transparent", stroke: 'blue', strokeWidth: .07, opacity: .7
        //     })
        // })
    }
    for (let build of _.filter(this.queues.build, b => !b.done)) {
        let text
        switch (build.structureType) {
            case 'extension': text = 'E'; break
            case 'storage': text = 'S'; break
            case 'road': text = 'R'; break
            case 'tower': text = 'T'; break
            case 'link': text = 'L'; break
            case 'lab': text = 'LA'; break
            case 'terminal': text = 'TM'; break
            case 'spawn': text = 'SP'; break
        }
        new RoomVisual(this.name).text(text, build.pos.x, build.pos.y, {
            font: 0.5, stroke: '#C8644F'
        })
        // this.room.visual.text(text, build.pos.x, build.pos.y, {
        //     font: 0.5, stroke: '#C8644F'
        // })
    }

}
MyRoom.prototype.boostBackup = function () { Memory.rooms[this.name].queues.boost = this.queues.boost }
MyRoom.prototype.registerBoost = function (role, name, body, bodyPart = false, specifications = false) {
    if (!Object.keys(this.structures.labs).length) return
    body = (typeof body[0] == 'string') ? body : body.map(b => b.type)

    const queueBoost = this.queues.boost
    if (bodyPart) {
        switch (bodyPart) {
            case WORK:
                const workFilter = body.filter(b => b == WORK), workCounter = workFilter.length
                let newBoost = { type: WORK, bodyPartsCount: workCounter, creepName: name }
                switch (role) {
                    case 'upgrade': newBoost.spec = 'upgradeController'; break
                    case 'build base':
                        if (specifications.task) {
                            console.log('task', specifications.task, 'cs:', myRooms[tasks[specifications.task].pos.roomName].constructionSites.length)
                            if (myRooms[tasks[specifications.task].pos.roomName].level == 8 || myRooms[tasks[specifications.task].pos.roomName].constructionSites.length) { newBoost.spec = 'repair'; break }
                            else { newBoost.spec = 'upgradeController'; break }
                        }
                        newBoost.spec = 'upgradeController'; break
                    case 'repair': newBoost.spec = 'build'; break
                    case 'harvest source': newBoost.spec = 'harvest'; break
                    case 'harvest deposit': newBoost.spec = 'harvest'; break
                    case 'harvest mineral': newBoost.spec = 'harvest'; break
                    case 'dismantle': newBoost.spec = 'dismantle'; break
                    case 'dismantleRoom': newBoost.spec = 'dismantle'; break
                }
                if (workCounter) { queueBoost.push(newBoost) }
                break
            default:
                const filter = body.filter(b => b == bodyPart), counter = filter.length
                if (counter) { if (check(name, bodyPart, this)) { queueBoost.push({ type: bodyPart, bodyPartsCount: counter, creepName: name }) } }
                break
        }
        return `register ${bodyPart}`
    }
    const moveFilter = body.filter(b => b == MOVE), moveCounter = moveFilter.length
    const carryFilter = body.filter(b => b == CARRY), carryCounter = carryFilter.length
    const workFilter = body.filter(b => b == WORK), workCounter = workFilter.length
    const attackFilter = body.filter(b => b == ATTACK), attackCounter = attackFilter.length
    const healFilter = body.filter(b => b == HEAL), healCounter = healFilter.length
    const RangedAttackFilter = body.filter(b => b == RANGED_ATTACK), RangedAttackCounter = RangedAttackFilter.length
    const toughFilter = body.filter(b => b == TOUGH), toughCounter = toughFilter.length
    const claimFilter = body.filter(b => b == CLAIM), claimCounter = claimFilter.length

    if (moveCounter) { if (moveCounter < (body.length / 2)) { if (check(name, MOVE, this)) { queueBoost.push({ type: MOVE, bodyPartsCount: moveCounter, creepName: name }) } } }
    if (carryCounter) { if (check(name, CARRY, this)) { queueBoost.push({ type: CARRY, bodyPartsCount: carryCounter, creepName: name }) } }
    let newBoost = { type: WORK, bodyPartsCount: workCounter, creepName: name }
    switch (role) {
        case 'upgrade': newBoost.spec = 'upgradeController'; break
        case 'build base':
            if (specifications) {
                try {
                    console.log('cs:', cache.myRooms.includes(myRooms[tasks[specifications.task].pos.roomName]) ? myRooms[tasks[specifications.task].pos.roomName].constructionSites.length : true)
                    if (cache.myRooms.includes(myRooms[tasks[specifications.task].pos.roomName]) ? myRooms[tasks[specifications.task].pos.roomName].constructionSites.length : true) { newBoost.spec = 'repair'; break }
                    else { newBoost.spec = 'upgradeController'; break }
                } catch (error) {
                    console.log('cach error when get construction sites', specifications.task, JSON.stringify(tasks[specifications.task]))
                }

            }
            else { newBoost.spec = 'upgradeController'; break }
        case 'repair': newBoost.spec = 'repair'; break
        case 'harvest deposit': newBoost.spec = 'harvest'; break
        case 'harvest mineral': newBoost.spec = 'harvest'; break
        case 'dismantle': newBoost.spec = 'dismantle'; break
        case 'dismantleRoom': newBoost.spec = 'dismantle'; break
    }
    if (workCounter) { if (check(name, WORK, this)) { queueBoost.push(newBoost) } }
    if (attackCounter) { if (check(name, ATTACK, this)) { queueBoost.push({ type: ATTACK, bodyPartsCount: attackCounter, creepName: name }) } }
    if (healCounter) { if (check(name, HEAL, this)) { queueBoost.push({ type: HEAL, bodyPartsCount: healCounter, creepName: name }) } }
    if (RangedAttackCounter) { if (check(name, RANGED_ATTACK, this)) { queueBoost.push({ type: RANGED_ATTACK, bodyPartsCount: RangedAttackCounter, creepName: name }) } }
    if (toughCounter) { if (check(name, TOUGH, this)) { queueBoost.push({ type: TOUGH, bodyPartsCount: toughCounter, creepName: name }) } }
    function check(creepName, type, myRoom) { //return true if we can to register boost
        if (myRoom.queues.boost.find(b => b.creepName == creepName && b.type == type)) { return false } else { return true }
    }
    this.boostBackup()
    this.updateTasksForBoost()
}
MyRoom.prototype.checkBoost = function () {
    const cpu = settings.writePerformanceLog ? Game.cpu.getUsed() : 0
    const creepNames = []
    this.queues.boost.forEach(boost => { if (!creepNames.includes(boost.creepName)) { creepNames.push(boost.creepName) } })
    creepNames.forEach(name => {
        const creep = Game.creeps[name]
        if (!creep) { clearBoostByName(name, this) }
        else if (creep.room.name !== this.name) { clearBoostByName(name, this) }
    })
    this.boostBackup()

    function clearBoostByName(name, myRoom) {
        myRoom.queues.boost.filter(b => b.creepName == name).forEach(boost => {
            myRoom.tasks.manage.tasks.filter(t => t.boost).filter(t => t.boost == boost).forEach(t => myRoom.tasks.manage.tasks.splice(myRoom.tasks.manage.tasks.indexOf(t), 1))
            myRoom.queues.boost.splice(myRoom.queues.boost.indexOf(boost), 1);
        })
    }
    settings.writePerformanceLog ? performance.newLog(cpu, 'MyRoom.prototype.checkBoost') : false
}
MyRoom.prototype.factoryRun = function (force = false) {
    if (Game.cpu.bucket < settings.bucket.factoryRun && !force) { return }
    const cpu = settings.writePerformanceLog ? Game.cpu.getUsed() : 0
    const comrwt = cache.countOfMyRoomsWithTerminals, minS = settings.terminals.minimumStock, maxS = settings.terminals.maximumStock
    const countOfMyRooms = cache.countOfMyRooms, debugFactory = this.settings.debug.factory
    if (debugFactory) { console.log('factory debug:', this.name) }
    const factoryId = this.structures.factory
    if (factoryId) {
        const factory = _obj(factoryId)
        if (!factory) { if (debugFactory) { console.log(`factory: ${factory}`) }; settings.writePerformanceLog ? performance.newLog(cpu, 'MyRoom.prototype.factoryRun', this.name) : false; return }
        if (factory.cooldown) { delete this.factoryLastRun; if (debugFactory) { console.log(`factory.cooldown: ${factory.cooldown}`) }; settings.writePerformanceLog ? performance.newLog(cpu, 'MyRoom.prototype.factoryRun', this.name) : false; return }
        else if (this.factoryLastRun && (gameTime - this.factoryLastRun < 10)) {
            if (debugFactory) { console.log(`gameTime - this.factoryLastRun: ${gameTime - this.factoryLastRun}`) };
            settings.writePerformanceLog ? performance.newLog(cpu, 'MyRoom.prototype.factoryRun', this.name) : false; return
        }
        else { delete this.factoryStatus }
        const level = factory.level
        if (this.status == 'support' && !settings.rotateRooms) {
            const prodEorB = produceEnergyOrBattery(this)
            if (debugFactory) { console.log('factory debug:', `2prodEorB:${prodEorB}`) }
            if (!this.factoryStatus) { decompress(this) }
        }
        else {
            if (level === 5) {
                const lvl1 = hightCommodities6.sort((a, b) => cache.resources[a] - cache.resources[b])
                for (const res of lvl1) { if (produce(factory, res, this)) { break } }
            }
            else if (level === 4) {
                const lvl1 = hightCommodities5.filter(resourceType => cache.resources[resourceType] < countOfMyRooms).sort((a, b) => cache.resources[a] - cache.resources[b])
                for (const res of lvl1) { if (produce(factory, res, this)) { break } }
            }
            else if (level === 3) {
                const lvl1 = ['liquid', 'frame', 'muscle', 'microchip', 'spirit'].sort((a, b) => cache.resources[a] - cache.resources[b])
                for (const res of lvl1) { if (produce(factory, res, this)) { break } }
            }
            else if (level === 2) {
                const lvl1 = ['fixtures', 'tissue', 'transistor', 'extract', 'crystal'].sort((a, b) => cache.resources[a] - cache.resources[b])
                for (const res of lvl1) { if (produce(factory, res, this)) { break } }
            }
            else if (level === 1) {
                const lvl1 = ['tube', 'phlegm', 'switch', 'concentrate', 'composite'].sort((a, b) => cache.resources[a] - cache.resources[b])
                for (const res of lvl1) { if (produce(factory, res, this)) { break } }
            }
            else {
                const lvl1 = ['cell', 'alloy', 'condensate', 'wire'].sort((a, b) => cache.resources[a] - cache.resources[b])
                let work = false
                for (const res of lvl1) { if (produce(factory, res, this)) { work = true; break } }
                const lvl2 = [RESOURCE_GHODIUM_MELT, RESOURCE_LEMERGIUM_BAR, RESOURCE_KEANIUM_BAR, RESOURCE_PURIFIER, RESOURCE_OXIDANT, RESOURCE_UTRIUM_BAR, RESOURCE_ZYNTHIUM_BAR, RESOURCE_REDUCTANT].sort((a, b) => cache.resources[a] - cache.resources[b])
                if (!work) {
                    for (const res of lvl2) {
                        const res2 = tools.getResToCompressOrDecompress(res)
                        if (debugFactory) { console.log('factory debug:', `compress res2:${res2}, this.resources[res2]:${this.resources[res2]}`) }
                        if (this.resources[res2] > settings.terminals.minimumStock['default'] && (!this.resources[res] || this.resources[res] < 2000 || (!factory.store[res] && !this.resources[res]))) { if (produce(factory, res, this)) { work = true; break } }
                    }
                }
            }
            const prodEorB = produceEnergyOrBattery(this)
            if (debugFactory) { console.log('factory debug:', `1prodEorB:${prodEorB}`) }
            if (!this.factoryStatus) { decompress(this) }
        }

        function produceEnergyOrBattery(myRoom) {
            if (settings.terminals.banOnEnergyExchange) {
                let sumBatteries = 0
                cache.myRoomsWithTerminals.forEach(mr => sumBatteries += mr.resources['battery'])
                if (debugFactory) { console.log('factory debug:', `produce battery: ${!myRoom.factoryStatus && myRoom.resources['energy'] > minS['energy'] * 1.1 && cache.resources['battery'] < maxS['battery'] * comrwt}`, `status: ${!myRoom.factoryStatus}, cache.resources.energy / comrwt: ${cache.resources.energy / comrwt} > minS['energy'] * 1.1:${minS['energy'] * 1.1} && myRoom.resources['battery'] < 100000:${myRoom.resources['battery'] < 100000}`) }
                if (debugFactory) { console.log('factory debug:', `produce energy: ${!myRoom.factoryStatus && myRoom.resources['energy'] < minS['energy'] * 0.9 && factory.store.getFreeCapacity('energy') >= 500}`, `!myRoom.factoryStatus:${!myRoom.factoryStatus}, ${myRoom.resources['energy']} < ${minS['energy'] * 0.9}, factory.store.getFreeCapacity('energy'):${factory.store.getFreeCapacity('energy')} `) }
                if (!myRoom.factoryStatus && myRoom.resources['energy'] > minS['energy'] * 1.1 && cache.resources['battery'] < maxS['battery'] * comrwt) {
                    return produce(factory, 'battery', myRoom)
                }
                else if (!myRoom.factoryStatus && myRoom.resources['energy'] < minS['energy'] * 0.9 && factory.store.getFreeCapacity('energy') >= 500) {
                    return produce(factory, 'energy', myRoom)
                }
            }
            else {
                let sumEnergy = 0
                cache.myRoomsWithTerminals.forEach(mr => sumEnergy += mr.resources['energy'])
                if (debugFactory) { console.log('factory debug:', `produce battery: ${!myRoom.factoryStatus && (sumEnergy / comrwt) > (minS['energy'] * 1.1) && myRoom.resources['battery'] < maxS['battery']}`, `status: ${!myRoom.factoryStatus}, cache.resources.energy / comrwt: ${cache.resources.energy / comrwt} > minS['energy'] * 1.1:${minS['energy'] * 1.1} && myRoom.resources['battery'] < 100000:${myRoom.resources['battery'] < 100000}`) }
                if (debugFactory) { console.log('factory debug:', `produce energy: ${!myRoom.factoryStatus && (sumEnergy / comrwt) < (minS['energy'] * 0.9) && factory.store.getFreeCapacity('energy') >= 500}`) }
                if (!myRoom.factoryStatus && (sumEnergy / comrwt) > (minS['energy'] * 1.1) && myRoom.resources['battery'] < maxS['battery']) {
                    return produce(factory, 'battery', myRoom)
                }
                else if (!myRoom.factoryStatus && (myRoom.resources['energy'] < minS['energy'] * 0.9 || (sumEnergy / comrwt) < (minS['energy'] * 0.9)) && factory.store.getFreeCapacity('energy') >= 500) {
                    return produce(factory, 'energy', myRoom)
                }
            }
        }
        function decompress(myRoom) {
            if (debugFactory) { console.log('factory debug:', 'decompress, factoryStatus:', myRoom.factoryStatus, `resources: ${resourcesBar.filter(res => cache.resources[res] > comrwt * minimumStock(res)).sort((a, b) => cache.resources[tools.getResToCompressOrDecompress(a)] - cache.resources[tools.getResToCompressOrDecompress(b)])}`) }
            for (const resourceType of resourcesBar.filter(res => cache.resources[res] > comrwt * minimumStock(res)).sort((a, b) => cache.resources[tools.getResToCompressOrDecompress(a)] - cache.resources[tools.getResToCompressOrDecompress(b)])) {
                let resourceType2 = tools.getResToCompressOrDecompress(resourceType)
                if (debugFactory) { console.log('factory debug:', `decompress: ${resourceType}: cache.resources[resourceType2]: ${cache.resources[resourceType2]} < comrwt * minimumStock(resourceType2): ${comrwt * minimumStock(resourceType2)}`) }
                if (cache.resources[resourceType2] < comrwt * minimumStock(resourceType2)) { if (produce(factory, resourceType2, myRoom)) { break } }
            }
        }
        function produce(factory, resourceType, myRoom) {
            if (myRoom.settings.debug.factory) { console.log(myRoom.name, resourceType, `(resourcesTier5.includes(resourceType) || resourcesBar.includes(resourceType)) && cache.resources[resourceType] > countOfMyRooms * 5000: (${resourcesTier5.includes(resourceType)} || ${resourcesBar.includes(resourceType)}) && ${cache.resources[resourceType] > countOfMyRooms * 5000}`); }
            if ((resourcesTier5.includes(resourceType) || resourcesBar.includes(resourceType)) && cache.resources[resourceType] > countOfMyRooms * 5000) { return }
            else {
                const res = factory.produce(resourceType)
                if (myRoom.settings.debug.factory) { console.log('factory debug:', `produce: ${resourceType} = ${res}`) }
                if (res !== OK) { delete myRoom.factoryStatus }
                else if (res == OK) { myRoom.factoryStatus = resourceType; myRoom.registerSheduledTask('update factory'); return true }
            }
        }
    }
    this.factoryLastRun = gameTime
    if (debugFactory) { console.log(`${this.name} - factory cpu: ${Game.cpu.getUsed() - cpu}`) }
    settings.writePerformanceLog ? performance.newLog(cpu, 'MyRoom.prototype.factoryRun', this.name) : false
}
MyRoom.prototype.updateDroppedResources = function () {
    const cpu = settings.writePerformanceLog ? Game.cpu.getUsed() : 0
    this.droppedResources = this.room.find(FIND_DROPPED_RESOURCES, { filter: r => r.resourceType == RESOURCE_ENERGY }).map(d => d.id)
    settings.writePerformanceLog ? performance.newLog(cpu, 'MyRoom.prototype.updateDroppedResources') : false
}
MyRoom.prototype.updateTombstones = function () {
    const cpu = settings.writePerformanceLog ? Game.cpu.getUsed() : 0
    this.tombstones = this.room.find(FIND_TOMBSTONES).map(d => d.id)
    settings.writePerformanceLog ? performance.newLog(cpu, 'MyRoom.prototype.updateTombstones') : false
    this.updateManageMicroTasks_tombstones()
}
MyRoom.prototype.updateNukes = function () {
    const cpu = settings.writePerformanceLog ? Game.cpu.getUsed() : 0
    const nukes = this.room.find(FIND_NUKES)
    this.nukes = nukes.map(d => d.id)
    nukes.forEach(nuke => { info.new(3, 'nuke', this.name, nuke.id, `launchRoomName: ${nuke.launchRoomName}, timeToLand: ${gameTime + nuke.timeToLand}`) })
    settings.writePerformanceLog ? performance.newLog(cpu, 'MyRoom.prototype.updateNukes') : false
}
MyRoom.prototype.updateTimeToLandForNukes = function () {
    this.timeToLandForNukes = idToObj(this.nukes).map(nuke => gameTime + nuke.timeToLand).sort((a, b) => a - b)
    this.timeToLandForNukes.forEach(time => this.registerSheduledTask('updateNukes', Number(time) + 2))
}
MyRoom.prototype.updateBaseTerritory = function () {
    if (!this.storage) { return }
    const cpu = settings.writePerformanceLog ? Game.cpu.getUsed() : 0
    this.room.memory.base = []
    const toProcess = [], processed = [], debug = true

    // toProcess.push(this.storage.pos)
    getPosAround(this.storage.pos, toProcess, processed)
    // idToObj(this.structures.ramparts).forEach(r => toProcess.push(r.pos))

    while (toProcess.length) {
        chekPos(toProcess[0], toProcess, processed, this)
    }
    function getPosAround(pos, toProcess, processed) {
        for (let i = -1; i < 2; i++) {
            for (let n = -1; n < 2; n++) {
                if (!toProcess.find(p => p.x == pos.x + i && p.y == pos.y + n) && !processed.find(p => p.x == pos.x + i && p.y == pos.y + n)) {
                    if (pos.x + i > 0 && pos.x + i < 49 && pos.y + n > 0 && pos.y + n < 50) {
                        const roomPos = new RoomPosition(pos.x + i, pos.y + n, pos.roomName)
                        toProcess.push(roomPos)
                    }
                }
            }
        }
    }
    function chekPos(position, toProcess, processed, myRoom) {
        processed.push(position); toProcess.splice(0, 1)
        const atPos = Game.rooms[position.roomName].lookAt(position.x, position.y)
        const terrain = atPos.find(p => p.type == 'terrain') //if (o.type == 'terrain') { if (o.terrain == 'wall') { res = false } }
        const structures = atPos.filter(p => p.structure)
        const notPass = structures.find(p => p.structure.structureType !== 'road' && p.structure.structureType !== 'rampart' && p.structure.structureType !== 'container')
        const rampart = structures.find(p => p.structure.structureType == 'rampart')

        if (terrain.terrain !== 'wall' && !notPass && !rampart) {
            myRoom.room.memory.base.push(position)
            getPosAround(position, toProcess, processed)
        }
        // if (terrain.terrain !== 'wall') {
        //     if (!rampart) {
        //         if (notPass) {
        //             if (notPass.structure.structureType !== 'link') { getPosAround(position, toProcess, processed) }
        //         }
        //     }
        //     else { getPosAround(position, toProcess, processed) }
        // }
    }
    console.log('cpu', Game.cpu.getUsed() - cpu, this.name)
    settings.writePerformanceLog ? performance.newLog(cpu, 'MyRoom.prototype.updateBaseTerritory', this.name) : false
}
MyRoom.prototype.updateInBaseForTasks = function () {
    const cpu = settings.writePerformanceLog ? Game.cpu.getUsed() : 0
    const mineral = _obj(this.tasks.harvestMineral.id)
    const basePos = this.room.memory.base.map(p => new RoomPosition(p.x, p.y, p.roomName))
    if (mineral) {
        const pos = mineral.pos.findInRange(basePos, 1)
        this.tasks.harvestMineral.inBase = (pos.length ? true : false)
    }
    Object.keys(this.tasks.harvestSource).forEach(id => {
        const source = _obj(id)
        if (source) {
            const pos = source.pos.findInRange(basePos, 1)
            this.tasks.harvestSource[id].inBase = pos.length ? true : false
        }
    })
    settings.writePerformanceLog ? performance.newLog(cpu, 'MyRoom.prototype.updateInBaseForTasks', this.name) : false
}
MyRoom.prototype.prepareToChangeStatus = function () {
    //prepare to halt, halted, prepare to support, support

    if (this.level < 8) { delete this.room.memory.status; return }
    delete this.room.memory.labs.reaction
    if (this.room.memory.status == 'prepare to halt') {
        const roles = ['harvest source', 'harvest mineral', 'defend_attack', 'defend_rangedAttack', 'repair', 'upgrade']
        const creeps = this.creeps.filter(c => roles.includes(c.memory.role))
        this.queues.spawn.filter(s => roles.includes(s.role)).forEach(s => this.queues.spawn.cut(s))
        if (!creeps.length) {
            this.queues.boost = []; this.queues.spawn = []
            cache.terminals.ordersList.filter(order => order.sender == this || order.receiver == this).forEach(o => cache.terminals.cut(o))
            console.log(roomLink(this.name), 'set status - halted')
            this.room.memory.status = 'halted'
        }
        else {
            if (this.room.energyAvailable < this.room.energyCapacityAvailable && !this.tasks.manage.forced_requiredWorkers) {
                this.tasks.manage.requiredWorkers = 1; //this.tasks.manage.forced_requiredWorkers = 1
            }
            // else { delete this.tasks.manage.forced_requiredWorkers }
        }
    }
    else if (this.room.memory.status == 'prepare to support') {
        const roles = ['harvest source', 'harvest mineral', 'defend_attack', 'defend_rangedAttack', 'repair']
        const creeps = this.creeps.filter(c => roles.includes(c.memory.role))
        this.queues.spawn.filter(s => roles.includes(s.role)).forEach(s => this.queues.spawn.cut(s))
        const pwrCreeps = _.filter(Game.powerCreeps, c => c.room).filter(c => c.room.name == this.name && c.powers).filter(c => c.ticksToLive && c.powers[PWR_OPERATE_EXTENSION]).length
        if (pwrCreeps && !this.tasks.manage.forced_requiredWorkers) { this.tasks.manage.requiredWorkers = 0 } //; this.tasks.manage.forced_requiredWorkers = 0 }
        else if (!this.tasks.manage.forced_requiredWorkers) { this.tasks.manage.requiredWorkers = 1 } //; this.tasks.manage.forced_requiredWorkers = 1 }

        if (!creeps.length) {
            this.queues.boost = []; this.queues.spawn = []; this.room.memory.status = 'support'
            console.log(roomLink(this.name), 'set status - support')
        }
    }
}
MyRoom.prototype.setStatus = function (status = undefined) {
    const currentStatus = this.room.memory.status
    if (status == 'halted') return
    if (this.underAttack && status == 'support') return
    if (!currentStatus && status === undefined || currentStatus == status) { return }
    else if (currentStatus == 'halted' && status == 'prepare to halt') { return }
    else if (currentStatus == 'support' && status == 'prepare to support') { return }
    if (currentStatus && !status) {
        console.log(roomLink(this.name), 'delete status')
        delete this.room.memory.status;
        if (currentStatus == 'halted') { manageRestore(this) }
    }
    else if (currentStatus == 'halted' && status == 'support') {
        console.log(roomLink(this.name), 'set status - support')
        this.room.memory.status = 'support'; manageRestore(this)
    }
    else if (currentStatus == 'support' && status == 'halted') {
        console.log(roomLink(this.name), 'set status - halted')
        this.room.memory.status = 'halted'
    }
    else {
        if (status == 'halted') {
            console.log(roomLink(this.name), 'set status - prepare to halt')
            this.room.memory.status = 'prepare to halt'
        }
        else if (status == 'support') {
            console.log(roomLink(this.name), 'set status - prepare to support')
            this.room.memory.status = 'prepare to support'
        }
    }

    if (!status) { delete this.room.memory.status }

    function manageRestore(myRoom) {
        try { myRoom.tasks.manage.requiredWorkers = 1 } catch (error) { console.log(`${myRoom ? myRoom.name : 'room name unknown'}`, 'delete manage.forced_requiredWorkers', error) }
        try { myRoom.updateManageMicroTasks() } catch (error) { console.log(`${myRoom ? myRoom.name : 'room name unknown'}`, 'updateManageMicroTasks', error) }
        try { myRoom.manageTaskBaseManage() } catch (error) { console.log(`${myRoom ? myRoom.name : 'room name unknown'}`, 'manageTaskBaseManage', error) }
        try { myRoom.spawnCreeps() } catch (error) { console.log(`${myRoom ? myRoom.name : 'room name unknown'}`, 'spawnCreeps', error) }
        try { myRoom.manage() } catch (error) { console.log(`${myRoom ? myRoom.name : 'room name unknown'}`, 'manage', error) }
    }
}
MyRoom.prototype.backupStructurePositions = function () {
    this.room.memory.structurePositions = []
    let str
    if (this.level == 8) str = this.room.find(FIND_STRUCTURES, { filter: s => s.structureType !== STRUCTURE_CONTROLLER && s.structureType !== 'container' })
    else { str = this.room.find(FIND_STRUCTURES, { filter: s => s.structureType !== STRUCTURE_CONTROLLER }) }
    str.forEach(s => this.room.memory.structurePositions.push({ type: s.structureType, pos: s.pos }))
    let cs
    if (this.level == 8) cs = this.room.find(FIND_MY_CONSTRUCTION_SITES, { filter: s => s.structureType !== 'container' })
    else { cs = this.room.find(FIND_MY_CONSTRUCTION_SITES) }
    cs.forEach(s => this.room.memory.structurePositions.push({ type: s.structureType, pos: s.pos }))
}
MyRoom.prototype.updateQueuesAutoBuild = function () {
    const cpu = settings.writePerformanceLog ? Game.cpu.getUsed() : 0
    const structures = this.room.memory.structurePositions || []
    this.queues.build = []
    structures.forEach(s => {
        const structure = this.room.lookForAt(LOOK_STRUCTURES, s.pos.x, s.pos.y).find(str => str.structureType == s.type)
        if (!structure) {
            const strInQueues = this.queues.build.find(sq => sq.structureType == s.type && s.pos.x == sq.pos.x && s.pos.y == sq.pos.y)
            if (!strInQueues) this.queues.build.push({ structureType: s.type, pos: s.pos })
        }
    })
    settings.writePerformanceLog ? performance.newLog(cpu, 'MyRoom.prototype.updateQueuesAutoBuild') : false
}
MyRoom.prototype.autoBuild = function () {
    const cpu = settings.writePerformanceLog ? Game.cpu.getUsed() : 0
    let queue = this.queues.build
    let notPlacedYet = _.filter(queue, bq => !bq.done)
    if (notPlacedYet.length) {
        let build = notPlacedYet[0]
        const room = this.room
        let structures = room.lookForAt(LOOK_STRUCTURES, build.pos.x, build.pos.y)
        let structure = structures.find(str => str.structureType == build.structureType)
        if (!structure) {
            const constructionSites = room.lookForAt(LOOK_CONSTRUCTION_SITES, build.pos.x, build.pos.y)
            let constructionSite = constructionSites.find(str => str.structureType == build.structureType)
            if (!constructionSite) {
                let res = room.createConstructionSite(build.pos.x, build.pos.y, build.structureType)
                if (res == OK) { this.registerSheduledTask('updateStructures') }
            }
        }
        else { build.done = true }
    }
    //check nukes
    if (each100) {
        const nukes = idToObj(this.nukes)

        nukes.forEach(nuke => {

        })
    }
    settings.writePerformanceLog ? performance.newLog(cpu, 'MyRoom.prototype.autoBuild') : false
}
MyRoom.prototype.chekPosForMove = function (pos) {
    if (pos.x < 1 || pos.x > 48 || pos.y < 1 || pos.y > 48) { return false }
    const pos = new RoomPosition(pos.x, pos.y, pos.roomName)
    const objAtPos = this.room.lookAt(pos.x, pos.y)
    let res = true
    objAtPos.forEach(o => {
        if (o.type == 'terrain') { if (o.terrain == 'wall') { res = false } }
        if (o.type == 'creep') { res = false }
    })
    return res
}
