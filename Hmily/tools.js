'use strict'
//2023.08.05
global.tools = {}

tools.objArrayToIdArray = function (ObjArray) {
    let IdArray = ObjArray.map(function (obj) {
        return obj.id
    })
    return IdArray
}
tools.posByDirection = function (position, direction) {
    let offsetX = [0, 0, 1, 1, 1, 0, -1, -1, -1];
    let offsetY = [0, -1, -1, 0, 1, 1, 1, 0, -1];
    let x = position.x + offsetX[direction];
    let y = position.y + offsetY[direction];
    if (x > 49 || x < 0 || y > 49 || y < 0) {
        return;
    }
    return new RoomPosition(x, y, position.roomName);
}
tools.reverseDirection = function (direction) {
    let inputDirection = [1, 2, 3, 4, 5, 6, 7, 8]
    let outputDirection = [5, 6, 7, 8, 1, 2, 3, 4]
    return outputDirection[inputDirection.indexOf(direction)]
}
tools.toLeftFromDirection = function (direction) {
    let inputDirection = [1, 2, 3, 4, 5, 6, 7, 8]
    let outputDirection = [7, 8, 1, 2, 3, 4, 5, 6]
    return outputDirection[inputDirection.indexOf(direction)]
}
tools.toRightFromDirection = function (direction) {
    let inputDirection = [1, 2, 3, 4, 5, 6, 7, 8]
    let outputDirection = [3, 4, 5, 6, 7, 8, 1, 2]
    return outputDirection[inputDirection.indexOf(direction)]
}
tools.updateAvoidRooms = function () {
    cache.avoidRooms = {}
    Object.keys(Memory.rooms).forEach(roomName => {
        if (Memory.rooms[roomName].avoid && !Memory.rooms[roomName].ignoreAvoid) { cache.avoidRooms[roomName] = true }
    })
}
tools.calculateDistance = function (obj1, obj2, task = false) {
    if (!obj1 || !obj2) { return }
    let room1 = obj1.room
    if (!room1) { return }
    let room2 = obj2.room
    if (!room2) { return }
    let x, y, FullPathTime = 0
    if (room1 == room2) {
        let path = obj1.pos.findPathTo(obj2, { ignoreCreeps: true, ignoreRoads: true })
        if (path) { FullPathTime = CalculatePathTime(path, room1) }
    }
    else {
        try {
            let route = Game.map.findRoute(room1.name, room2.name, {
                routeCallback(roomName) {
                    if (cache.avoidRooms[roomName]) { return Infinity; }  // avoid this room
                    return 1;
                }
            })
            console.log(`route:${JSON.stringify(route)}`)
            let path = obj1.pos.findPathTo(obj2, { ignoreCreeps: true })
            let PT = CalculatePathTime(path, room1)
            FullPathTime += PT
            console.log(`FullPathTime:${FullPathTime}, PT:${PT}, x:${x}, y:${y}`)
            for (let RoomStep of route) {
                if (x == 0) { x = 49 }; if (x == 49) { x = 1 }
                if (x == 1) { x = 49 }
                if (y == 0) { y = 49 }; if (y == 49) { y = 1 }
                if (y == 1) { y = 49 }
                console.log(`x:${x}, y:${y}`)
                let position = new RoomPosition(x, y, RoomStep.room)
                let path = position.findPathTo(obj2, { ignoreCreeps: true })
                console.log(`position:${JSON.stringify(position)}path:${path}`)
                let PT = CalculatePathTime(path, Game.rooms[RoomStep.room])
                FullPathTime += PT
                console.log(`FullPathTime:${FullPathTime}, PT:${PT}, x:${x}, y:${y}`)
            }
        }
        catch (err) { console.log(`cant get access to room: ${err}`) }
    }
    function CalculatePathTime(path, room) {
        let PathTime = 0
        const terrain = room.getTerrain();
        const PathLength = path.length
        for (let i in path) {
            let step = path[i]
            //if (i == PathLength - 1) { x = step.x; y = step.y }
            x = step.x; y = step.y
            switch (terrain.get(step.x, step.y)) {
                case TERRAIN_MASK_SWAMP: PathTime += 5; break
                default: PathTime++; break
            }
        }
        return PathTime
    }
    return FullPathTime
}
tools.findNearestRoom = function (specifications) {
    try {
        const roomName = specifications.roomName
        const excludeRoom = (specifications.excludeRoom) ? specifications.excludeRoom : false
        const minimumLevel = (specifications.minimumLevel) ? specifications.minimumLevel : 0
        //checks

        if (!roomName) { return }
        const roomMemory = myRooms[roomName]

        if (roomMemory) { if (roomMemory.my) { if (roomMemory.level >= minimumLevel && !excludeRoom) { return roomName } } }

        const rooms = cache.myRooms.filter(r => r.level >= minimumLevel && r.name !== roomName)
        // const rooms = Object.values(myRooms).filter(room => room.my === true && room.name !== roomName)

        let distanceForRooms = []
        if (rooms.length) {
            rooms.forEach(checkedRoom => {
                let range = Game.map.findRoute(roomName, checkedRoom.name).length
                if (range) { distanceForRooms.push({ roomName: checkedRoom.name, distance: range, level: checkedRoom.level }) }
            })
            distanceForRooms.sort((a, b) => a.distance - b.distance || b.level - a.level)
        }
        const roomList = distanceForRooms
        if (roomList.length) { console.log(`for room ${roomName} choosen SpawnRoom: ${roomList[0].roomName}`); return roomList[0].roomName }
        else { console.log(`for room ${roomName} can't choose SpawnRoom`); return false }
    } catch (error) {

    }

}
tools.getRandomIntInclusive = function (min, max) {
    min = Math.ceil(min);
    max = Math.floor(max);
    return Math.floor(Math.random() * (max - min + 1)) + min
}

tools.getContainersList = function (roomName, type) {
    const myRoom = myRooms[roomName]; if (!myRoom) return []
    if (!myRoom.structures.containers.length) return []
    let containerControllers = []
    const containerControllerId = myRoom.structures.containers.filter(c => c.type == 'controller').map(c => c.id)
    if (containerControllerId.length) containerControllers = idToObj(containerControllerId)

    return containerControllers
}
tools.getPath = function (obj1, obj2) {
    if (!obj1 || !obj2) { return }
    const room1 = obj1.room, room2 = obj2.room
    if (!room1 || !room2) { return }

    let x, y
    if (room1 == room2) {
        let path = obj1.pos.findPathTo(obj2, { ignoreCreeps: true, ignoreRoads: true, range: 1 })
        if (path) { return path }
        else { return false }
    }
    else {
        let route = Game.map.findRoute(room1.name, room2.name)
        let path = obj1.pos.findPathTo(obj2, { ignoreCreeps: true, ignoreRoads: true })
        if (path) { FullPath.concat(path) }
        else { return false }
        for (let RoomStep of route) {
            if (x == 0) { x = 49 }; if (x == 49) { x = 1 }
            if (x == 1) { x = 49 }
            if (y == 0) { y = 49 }; if (y == 49) { y = 1 }
            if (y == 1) { y = 49 }
            let position = new RoomPosition(x, y, RoomStep.room)
            let path = position.findPathTo(obj2, { ignoreCreeps: true })
            if (path) { FullPath.concat(path) }
            else { return false }
        }
        return FullPath
    }
}
tools.calcAccessibleFields = function (object) {
    let accessibleFields = 0
    let fields = object.room.lookForAtArea(LOOK_TERRAIN, object.pos.y - 1, object.pos.x - 1, object.pos.y + 1, object.pos.x + 1, true)
    accessibleFields = 9 - _.countBy(fields, "terrain").wall
    return accessibleFields
}
tools.deleteOldCreepNames = function () {
    const cpu = settings.writePerformanceLog ? Game.cpu.getUsed() : 0
    if (!Memory.creeps) { return }
    Object.keys(Memory.creeps).forEach(name => {
        if (!Game.creeps[name]) { delete Memory.creeps[name]; }
    })
    settings.writePerformanceLog ? performance.newLog(cpu, 'deleteOldCreepNames') : false
}
tools.getCreepPrice = function (Body) {
    let price = 0;
    for (let N in Body) {
        switch (Body[N]) {
            case MOVE: price += 50; break;
            case CARRY: price += 50; break;
            case WORK: price += 100; break;
            case ATTACK: price += 80; break;
            case HEAL: price += 250; break;
            case RANGED_ATTACK: price += 150; break;
            case TOUGH: price += 10; break;
            case CLAIM: price += 600; break;
        }
    }
    return price;
}
tools.getWorkPosition = function (id, type = undefined) {
    const object = _obj(id)
    const room = object.room
    const fields = room.lookForAtArea(LOOK_TERRAIN, object.pos.y - 1, object.pos.x - 1, object.pos.y + 1, object.pos.x + 1, true).filter(a => a.terrain == 'plain' || a.terrain == 'swamp')
    const good = [], empty = []
    if (type == 'harvestMineral') {
        const containers = object.pos.findInRange(FIND_STRUCTURES, 1, { filter: s => s.structureType == 'container' })
        if (containers.length) { return containers[0].pos }
        else {
            fields.forEach(f => {
                if (!room.lookForAt(LOOK_STRUCTURES, f.x, f.y).filter(s => s.structureType !== STRUCTURE_ROAD && s.structureType !== STRUCTURE_CONTAINER && s.structureType !== STRUCTURE_RAMPART).length) {
                    const pos = new RoomPosition(f.x, f.y, room.name)
                    if (pos.findInRange(FIND_MY_STRUCTURES, 1, { filter: { structureType: 'lab' } }).length) { good.push(f) }
                    else if (f.x > 0 && f.x < 49 && f.y > 0 && f.y < 49) { empty.push(f) }
                }
            })
        }
    }
    else {
        fields.forEach(f => {
            if (!room.lookForAt(LOOK_STRUCTURES, f.x, f.y).filter(s => s.structureType !== STRUCTURE_ROAD && s.structureType !== STRUCTURE_CONTAINER && s.structureType !== STRUCTURE_RAMPART).length) {
                const pos = new RoomPosition(f.x, f.y, room.name)
                if (pos.findInRange(FIND_MY_STRUCTURES, 1, { filter: { structureType: 'link' } }).length) { good.push(f) }
                if (f.x > 1 && f.x < 48 && f.y > 1 && f.y < 48) { empty.push(f) }
            }
        })
    }

    if (good.length) { return (new RoomPosition(good[0].x, good[0].y, room.name)) }
    else if (empty.length) { return (new RoomPosition(empty[0].x, empty[0].y, room.name)) }
}
tools.getColor = function (number) {
    switch (number) {
        case 1: return 'red'
        case 2: return 'purple'
        case 3: return 'blue'
        case 4: return 'cyan'
        case 5: return 'green'
        case 6: return 'yellow'
        case 7: return 'orange'
        case 8: return 'brown'
        case 9: return 'grey'
        case 10: return 'white'
    }
}
tools.updateTypeOfLink = function (id) {
    const cpu = settings.writePerformanceLog ? Game.cpu.getUsed() : 0
    const link = _obj(id)
    const myRoom = myRooms[link.pos.roomName]
    const room = Game.rooms[link.pos.roomName]
    let type = { type: '' }
    if (link.pos.getRangeTo(room.storage) < 3) {
        type.type = 'storage'
        settings.writePerformanceLog ? performance.newLog(cpu, 'MyRoom.prototype.updateTypeOfLink') : false
        return type
    }
    Object.keys(myRoom.sources).forEach(sourceId => {
        const source = _obj(sourceId)
        if (link.pos.getRangeTo(source) < 3) { type.type = 'source'; type.id = source.id }
    })
    if (type.type) { settings.writePerformanceLog ? performance.newLog(cpu, 'MyRoom.prototype.updateTypeOfLink') : false; return type }
    if (link.pos.getRangeTo(room.controller) <= 3) {
        type.type = 'controller'
        settings.writePerformanceLog ? performance.newLog(cpu, 'MyRoom.prototype.updateTypeOfLink') : false
        return type
    }
    settings.writePerformanceLog ? performance.newLog(cpu, 'MyRoom.prototype.updateTypeOfLink') : false
    return type
}
tools.updateTypeOfContainer = function (id) {
    const cpu = settings.writePerformanceLog ? Game.cpu.getUsed() : 0
    const container = _obj(id)
    const myRoom = myRooms[container.pos.roomName]
    const room = Game.rooms[container.pos.roomName]
    let type = { type: '' }
    Object.keys(myRoom.sources).forEach(sourceId => {
        const source = _obj(sourceId)
        if (container.pos.getRangeTo(source) == 1) {
            type.type = 'source'; type.id = source.id;
        }
    })
    if (type.type) {
        settings.writePerformanceLog ? performance.newLog(cpu, 'MyRoom.prototype.updateTypeOfcontainer') : false
        return type
    }
    const mineral = _obj(Object.keys(myRoom.minerals)[0])
    if (mineral) {
        if (container.pos.getRangeTo(mineral) == 1) {
            type.type = 'mineral'; type.id = mineral.id;
            settings.writePerformanceLog ? performance.newLog(cpu, 'MyRoom.prototype.updateTypeOfcontainer') : false
            return type
        }
    }
    if (container.pos.getRangeTo(room.controller) <= 3) {
        type.type = 'controller'
        settings.writePerformanceLog ? performance.newLog(cpu, 'MyRoom.prototype.updateTypeOfcontainer') : false
        return type
    }
    settings.writePerformanceLog ? performance.newLog(cpu, 'MyRoom.prototype.updateTypeOfcontainer') : false
    return type
}
tools.checkResourcesToSendForAlly = function () {
    const cpu = settings.writePerformanceLog ? Game.cpu.getUsed() : 0
    for (const resourceType of resourcesTier1) {
        if (resourceType == 'energy') { continue }
        // if (cache.resources[resourceType] > 20000 * cache.myRooms.filter(myRoom => myRoom.terminal).length) { terminal_logic.sendResourceToAlly(resourceType); break }
    }
    settings.writePerformanceLog ? performance.newLog(cpu, 'tools.checkResourcesToSendForAlly') : false
}
tools.getDistanceForRooms = function (room1, room2) {
    if (!room1 || !room2) { console.log('getDistanceForRooms error:', room1, room2); return }
    if (!get()) { set() }

    function set() {
        const distance = Game.map.getRoomLinearDistance(room1, room2)
        if (!cache.map.roomDistance[room1]) { cache.map.roomDistance[room1] = {} }
        cache.map.roomDistance[room1][room2] = { roomName: room2, distance: distance }

        if (!cache.map.roomDistance[room2]) { cache.map.roomDistance[room2] = {} }
        cache.map.roomDistance[room2][room1] = { roomName: room1, distance: distance }
    }
    function get() {
        if (cache.map.roomDistance[room1]) {
            if (cache.map.roomDistance[room1][room2]) {
                return cache.map.roomDistance[room1][room2].distance
            }
        }
        if (cache.map.roomDistance[room2]) {
            if (cache.map.roomDistance[room2][room1]) {
                return cache.map.roomDistance[room2][room1].distance
            }
        }
        return false
    }
    return cache.map.roomDistance[room1][room2].distance
}
tools.calculateHarvestDepositLastCooldown = function (distance = 600, lastCooldown) {
    while (tools.calculateHarvestDeposit(distance, lastCooldown, 25, 1, 1, 'done') > settings.tasks.effectivnesForHarvestDeposit) { lastCooldown++ }
    return lastCooldown
}
tools.calculateHarvestDeposit = function (distance_, lastCooldown_, move = 25, boostWork = 1, boostCarry = 1, returnValue = 'work') {
    const res = []
    let msg = '', lowerCoolDown
    for (let work = 1; work <= 50 - move - 1; work++) {
        const distance = distance_
        let lastCooldown = lastCooldown_
        const capacityMax = (50 - move - work) * 50 * boostCarry
        let capacity = 0, ticksToLive = 1500, done = 0

        while (ticksToLive > 0) {
            if (capacity == 0) { ticksToLive -= distance + lastCooldown + 1; capacity = work * boostWork; lastCooldown++ }
            else if (capacity >= capacityMax) { ticksToLive -= distance * 2; done += capacityMax; capacity = work * boostWork; lastCooldown++ }
            else if (capacity > 0) {
                if (ticksToLive > distance + lastCooldown) {
                    capacity += work * boostWork; ticksToLive -= lastCooldown + 1; lastCooldown++;
                }
                else { ticksToLive = 0; done += capacity }
            }
            // console.log(`ticksToLive:${ticksToLive}, capacity:${capacity} (${capacityMax}) lastCooldown:${lastCooldown}, done:${done} `);
        }
        if (!lowerCoolDown) { lowerCoolDown = lastCooldown }
        else if (lowerCoolDown > lastCooldown) { lowerCoolDown = lastCooldown }
        res.push({ work: work, done: done, lastCooldown: lastCooldown })
    }
    res.sort((a, b) => b.done - a.done)
    // for (let index = 0; index < 8; index++) {
    //     const x = res[index];
    //     msg += `work:${x.work}, done:${x.done}, lastCooldown:${x.lastCooldown}(${lowerCoolDown}), distance: ${distance_}, result:${x.result} \n`
    // }
    // console.log(msg);
    if (returnValue == 'work') { return res[0].work }
    else if (returnValue == 'done') {
        return res[0].done
    }
}
tools.calculateHarvestMineral = function (distance_, energy) {
    const res = [], cooldown = 5, distance = distance_

    for (let work = 1; work <= 24; work++) {
        for (let carry = 1; carry <= 24; carry++) {
            const move = work + carry
            if (work + move + carry > 50) { continue }
            if ((work * 100) + (move * 50) + (carry * 50) > energy) { continue }
            const capacityMax = carry * 50
            let capacity = 0, ticksToLive = 1500, done = 0

            while (ticksToLive > 0) {
                if (capacity == 0) { ticksToLive -= distance; capacity = work }
                else if (capacity >= capacityMax) { ticksToLive -= distance * 2; done += capacityMax; capacity = work }
                else if (capacity > 0) {
                    if (ticksToLive > distance + cooldown) {
                        capacity += work; ticksToLive -= cooldown;
                    }
                    else { ticksToLive = 0; done += capacity }
                }
            }
            res.push({ work: work, carry: carry, move: move, done: done })
        }
    }
    res.sort((a, b) => b.done - a.done)

    return res[0]

}
tools.calculateResourcesUsedHistorySummary = function () {
    if (!cache.resourcesUsedHistorySummary) {
        cache.resourcesUsedHistorySummary = {}
        cache.resourcesUsedHistory.forEach(element => {
            if (!cache.resourcesUsedHistorySummary[element.resourceType]) { cache.resourcesUsedHistorySummary[element.resourceType] = element.amount }
            else { cache.resourcesUsedHistorySummary[element.resourceType] += element.amount }
        })
    }
}
tools.pushToResourcesUsedHistory = function (resourceType, amount) {
    if (!resourcesTier1.includes(resourceType)) {
        cache.resourcesUsedHistory.push({ time: gameTime, resourceType: resourceType, amount: amount })
    }
}
tools.numberWithSpaces = function (x) {
    if (typeof x !== 'number') { return x }
    return x.toString().replace(/\B(?=(\d{3})+(?!\d))/g, " ");
}
tools.getUsername = function () { settings.username = _.filter(Game.rooms, r => r.controller).filter(r => r.controller.my)[0].controller.owner.username }
tools.sortMyRoomsByTicksToDowngrade = function () {
    cache.RoomsSortedByTicksToDowngrade = cache.myRooms.filter(r => r.level == 8).sort((a, b) => a.room.controller.ticksToDowngrade - b.room.controller.ticksToDowngrade)
}
tools.getObstacles = function () {
    cache.obstacles = []
    if (!cache.obstacles) {
        _.filter(myRooms, myRoom => myRoom.portals).forEach(myRoom => {
            cache.obstacles = cache.obstacles.concat(_.map(myRoom.portals, p => p.pos))
        })
    }
    return cache.obstacles
}
tools.setStatusToRampart = function (rampart_) {
    let rampart
    if (typeof rampart_ == 'string') { rampart = _obj(rampart_) } else { rampart = rampart_ }
    const x = rampart.pos.x, y = rampart.pos.y
    if (x == 2 || x == 47 || y == 2 || y == 47) { return 1 }
    const structureType = lookStructure(rampart.pos)
    const typesOfStructures = ['spawn', 'powerSpawn', 'storage', 'terminal', 'factory', 'powerSpawn', 'nuker', 'lab']
    if (typesOfStructures.includes(structureType)) { return 2 }

    const towers = idToObj(myRooms[rampart.room.name].structures.towers)
    const tower = rampart.pos.findClosestByRange(towers)
    if (tower) {
        const range = rampart.pos.getRangeTo(tower)
        for (let i = -1; i < 2; i++) {
            for (let n = -1; n < 2; n++) {
                const roomPos = new RoomPosition(x + i, y + n, rampart.room.name)
                if (roomPos.getRangeTo(tower) <= range) { continue }
                if (!lookWall(roomPos)) {
                    if (!lookRampart(roomPos)) {
                        return 1
                    }
                }
            }
        }
        return 3
    }

    function lookStructure(pos) { return pos.lookFor(LOOK_STRUCTURES).find(s => s.structureType !== 'rampart') }
    function lookRampart(pos) { return pos.lookFor(LOOK_STRUCTURES).find(s => s.structureType == 'rampart') }
    function lookWall(pos) { return pos.lookFor(LOOK_TERRAIN) == 'wall' }
}
tools.lookRampart = function (pos) { return pos.lookFor(LOOK_STRUCTURES).find(s => s.structureType == 'rampart') }

tools.setupMaxHarvestSource = function () {

}
global.help = function () {
    let msg = ''
    msg += 'Game.cpu.bucket\n'
    msg += 'tools.showCreeps() - show count of my creeps by role\n'
    msg += 'tools.showRes() - show resources, without param - all, param: 4 - boost 3 lvl, param: 3 - boost 2lvl, param: 2 - boost 1lvl, param: 0 - minerals, battery, energy, power\n'
    msg += 'tools.showRam() - show count of ramparts, minimum hits and how much repairs on the room\n'
    msg += 'tools.showLab() - show status of labs\n'
    msg += 'tools.showFac() - show status of factories\n'
    msg += 'tools.showDep() - show tasks for harvest deposits\n'
    msg += 'tools.showPow() - show tasks for harvest power\n'
    msg += 'tools.showCon() - show level and downgrade time for controllers\n'
    msg += 'tools.showStr() - show count of structures by type\n'
    msg += 'tools.showMin() - show minerals and how much sources in the room\n'
    msg += 'tools.showNuk() - show status of my nukers\n'
    msg += 'tools.showTerminals() - show internal exchange orders\n'
    msg += 'tools.showStatus() - show status of my rooms (halted - full freeze room) (support - working upgrade, manage, internal exchange by terminal)\n'

    return msg
}
global.getPriceOfResource = function (resourceType) {
    const historyOfResource = Game.market.getHistory(resourceType); //historyOfResource.reverse()
    if (historyOfResource.length) {
        return historyOfResource.slice(-1)[0].avgPrice
    }
    else { console.log(`getPrice`); }
}
tools.updateMyRoomsList = function () {
    cache.myRooms = _.filter(myRooms, myRoom => myRoom.my)
    cache.countOfMyRooms = cache.myRooms.length
    cache.myRoomsWithTerminals = cache.myRooms.filter(myRoom => myRoom.terminal)
    cache.countOfMyRoomsWithTerminals = cache.myRoomsWithTerminals.length
}
tools.clearLog = function () {
    console.log("<script>angular.element(document.getElementsByClassName('fa fa-trash ng-scope')[0].parentNode).scope().Console.clear()</script>")
}
tools.alert = function (text = '') {
    console.log(`<script>console.log(alert("${text}"))</script>`);
}
Array.prototype.cut = function (obj) { this.splice(this.indexOf(obj), 1) }
Array.prototype.pushN = function (element, n = 0) {
    if (typeof element == 'string') { for (let i = 0; i < n; i++) { this.push(element) } }
    else { for (let i = 0; i < n; i++) { this.push(...element) } }
}
tools.comparePositions = function (pos1, pos2) {
    if (!pos1 || !pos2) { return false }
    if (pos1.roomName !== pos2.roomName || pos1.x !== pos2.x || pos1.y !== pos2.y) { return false }
    else { return true }
}
function coordName(coord) {
    return coord.x + ':' + coord.y;
}
function derefCoords(coordName, roomName) {
    let [x, y] = coordName.split(':');
    return new RoomPosition(parseInt(x, 10), parseInt(y, 10), roomName);
}
tools.launchNukeByTasks = function () {
    Memory.nukeTaskList = Memory.nukeTaskList || []
    const reserved = Memory.nukeTaskList.filter(t => t.roomName).map(t => t.roomName)


    Memory.nukeTaskList.forEach(task => {
        const roomName = task.roomName
        const pos = new RoomPosition(task.pos.x, task.pos.y, task.pos.roomName)

        if (roomName) {
            if (!myRooms[roomName]) { return }
            if (myRooms[roomName].structures.nuker) {
                const nuker = _obj(myRooms[roomName].structures.nuker)
                if (nuker && nuker.launchNuke(pos) == OK) {
                    if (!task.repeat) { Memory.nukeTaskList.cut(task) }
                    console.log(colorful(`launch nuke from ${roomLink(nuker.room.name)}`, 'orange'))
                }
            }
        }
        else {
            const readyNukers = []
            cache.myRooms.filter(mr => !reserved.includes(mr.name)).forEach(t => {
                if (t.structures.nuker) {
                    const nuker = _obj(t.structures.nuker)
                    if (nuker) { if (!nuker.cooldown) { readyNukers.push(nuker) } }
                }
            })
            for (const nuker of readyNukers) {
                if (nuker.launchNuke(pos) == OK) {
                    console.log(colorful(`launch nuke from ${roomLink(nuker.room.name)}`, 'orange'))
                    if (!task.repeat) { Memory.nukeTaskList.cut(task) }
                    break
                }
            }
        }
    })
}
tools.bestBodyForHarvestSource = function (distanceFromSpawnToSource, distanceFromSourceLinkToStorageLink, debug = false, work = false, carry = false, move = false) {
    const results = []
    let debugText = ''
    if (work && carry && move) { test(work, carry, move) }
    else {
        // for (let work = 1; work <= 48; work++) {
        for (let work = 1; work <= 1; work++) {
            let maxMove
            if (50 - work - 1 > 25) { maxMove = 25 }
            else { maxMove = 50 - work - 1 }
            // for (let move = 1; move <= maxMove; move++) {
            for (let move = 1; move <= 1; move++) {
                // for (let carry = 1; carry <= (50 - move - work); carry++) {
                for (let carry = 1; carry <= 1; carry++) { test(work, carry, move) }
            }
        }
    }

    if (debug) { console.log(debugText) }
    function test(work, carry, move) {
        let harvested = 0, actions = 0, creepStore = 0, sourceCooldown = 0, energyInSource = 3000, linkStore = 0, linkCooldown = 0
        if (debug) { debugText += `----work:${work}----carry:${carry}----move:${move}\n` }
        let moveTime
        if (move >= work) { moveTime = 1 }
        else {
            const div = work / move
            if (div > 0.5) { moveTime = 2 } else if (div > 0.3) { moveTime = 3 } else if (div > 0.2) { moveTime = 5 } else { moveTime = 10 }
        }
        const maxStore = carry * 50, harvestPower = work * 2
        let lifeTime = 1500 - (distanceFromSpawnToSource * moveTime); actions += distanceFromSpawnToSource
        for (let tick = lifeTime; tick > 0; tick--) {
            if (creepStore + harvestPower <= maxStore) { harvest() }
            else { transfer() }
            if (energyInSource < 3000 && !sourceCooldown) { sourceCooldown = 300 }
            linkSend()
            if (linkCooldown) { linkCooldown-- }
            if (sourceCooldown) { sourceCooldown--; if (sourceCooldown === 0) { energyInSource = 3000 } }

            if (debug) { debugText += `${tick}\tcreepStore: ${creepStore} (${maxStore})\tsource:${energyInSource} (${sourceCooldown})\tlink:${linkStore} (${linkCooldown})\n` }
        }
        if (debug) { debugText += `------ w:${work},c:${carry},m:${move}----actions: ${actions}, harvested: ${harvested}` }
        results.push({ work, carry, move, actions, harvested })
        function linkSend() {
            if (linkStore == 800 && !linkCooldown) { linkCooldown = distanceFromSourceLinkToStorageLink; linkStore = 0 }
        }
        function transfer() {
            if (linkStore < 800) {
                const amount = creepStore > 800 - linkStore ? 800 - linkStore : creepStore
                linkStore += amount; creepStore -= amount
                actions++
            }
        }
        function harvest() {
            const amount = harvestPower < energyInSource ? harvestPower : energyInSource
            creepStore += amount
            energyInSource -= amount
            if (amount > 0) { actions++; harvested += amount }
        }
    }
}
tools.getResToCompressOrDecompress = function (resourceType) {
    let resourceType2
    switch (resourceType) {
        case RESOURCE_UTRIUM_BAR: resourceType2 = 'U'; break;
        case RESOURCE_LEMERGIUM_BAR: resourceType2 = 'L'; break;
        case RESOURCE_ZYNTHIUM_BAR: resourceType2 = 'Z'; break;
        case RESOURCE_KEANIUM_BAR: resourceType2 = 'K'; break;
        case RESOURCE_GHODIUM_MELT: resourceType2 = 'G'; break;
        case RESOURCE_OXIDANT: resourceType2 = 'O'; break;
        case RESOURCE_REDUCTANT: resourceType2 = 'H'; break;
        case RESOURCE_PURIFIER: resourceType2 = 'X'; break;

        case 'U': resourceType2 = RESOURCE_UTRIUM_BAR; break;
        case 'L': resourceType2 = RESOURCE_LEMERGIUM_BAR; break;
        case 'Z': resourceType2 = RESOURCE_ZYNTHIUM_BAR; break;
        case 'K': resourceType2 = RESOURCE_KEANIUM_BAR; break;
        case 'G': resourceType2 = RESOURCE_GHODIUM_MELT; break;
        case 'O': resourceType2 = RESOURCE_OXIDANT; break;
        case 'H': resourceType2 = RESOURCE_REDUCTANT; break;
        case 'X': resourceType2 = RESOURCE_PURIFIER; break;
    }
    return resourceType2
}
tools.pickRandom = function (list) {
    return list[Math.floor(Math.random() * list.length)];
}
tools.checkPosForMove = function (pos) {
    const room = Game.rooms[pos.roomName]
    if (!room) return
    return room.lookAt(pos.x, pos.y).find()
}