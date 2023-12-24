'use strict'
//2023.09.22 edge of the room
//2023.09.17 fix settings.terminals.maximumStock
global.roomLink = function (roomArg, text = undefined, select = true) {
    let roomName;
    let id = roomArg.id;
    if (roomArg instanceof Room) {
        roomName = roomArg.name;
    } else if (roomArg.pos !== undefined) {
        roomName = roomArg.pos.roomName;
    } else if (roomArg.roomName !== undefined) {
        roomName = roomArg.roomName;
    } else if (typeof roomArg === 'string') {
        roomName = roomArg;
    } else {
        console.log(`Invalid parameter to roomLink global function: ${roomArg} of type ${typeof roomArg}`);
    }
    text = text || (id ? roomArg : roomName);
    return `<a href="#!/room/${Game.shard.name}/${roomName}" ${select && id ? `onclick="angular.element('body').injector().get('RoomViewPendingSelector').set('${id}')"` : ``}>${text}</a>`;
};

global.showMin = function () {
    const labRooms = cache.myRooms
    let msg = 'minerals settings:\n'
    msg += `settings.tasks.maxHarvestMineral: ${settings.tasks.maxHarvestMineral}\n`
    msg += `settings.bucket.spawnHarvestMineral: ${settings.bucket.spawnHarvestMineral}\n`
    msg += `settings.bucket.harvestMineral: ${settings.bucket.harvestMineral}\n`
    labRooms.forEach(myRoom => {
        const mineral = Game.getObjectById(Object.values(myRoom.minerals)[0].id)
        const task = myRoom.tasks.harvestMineral
        const creeps = myRoom.creeps.filter(creep => creep.memory.role == 'harvest mineral').length, requiredWorkers = myRoom.tasks.harvestMineral.requiredWorkers
        if (creeps) { msg += '<u>' }
        msg += `${roomLink(myRoom.name)}\t${mineral.mineralType}${myRoom.structures.extractor ? '+' : '-'}\tenergy sources:${Object.keys(myRoom.sources).length}\tcreeps:${creeps}(${requiredWorkers ? requiredWorkers : 0})\tregeneration:${String(mineral.ticksToRegeneration ? mineral.ticksToRegeneration : 0).padEnd(5)}\tamount:${String(mineral.mineralAmount).padEnd(5)}\tcontainer:${task.container ? true : false}\tlab:${task.lab ? true : false}\t${task.workPos}`
        if (creeps) { msg += '</u>\n' } else { msg += '\n' }
    })
    console.log(msg);
}
global.showSource = function () {
    const mr = cache.myRooms
    let msg = `settings.tasks.harvestSource_boost: ${settings.tasks.harvestSource_boost}\n`
    msg += `settings.tasks.maxHarvestSource: ${settings.tasks.maxHarvestSource}\n`
    msg += `settings.tasks.harvestSource_ecoBody: ${settings.tasks.harvestSource_ecoBody}\n`
    msg += `settings.bucket.spawnHarvestSource: ${settings.bucket.spawnHarvestSource}\n`
    msg += `settings.bucket.harvestSource: ${settings.bucket.harvestSource}\n`
    mr.forEach(myRoom => {
        Object.keys(myRoom.sources).forEach(id => {
            const source = Game.getObjectById(id)
            msg += `${roomLink(myRoom.name)}\t${id} ${(myRoom.creeps.find(creep => creep.memory.role == 'harvest source' && creep.memory.id == id)) ? '(+)' : '(-)'}\t link: ${myRoom.tasks.harvestSource[id].link ? '+' : '-'}\t${source.energy} \tregeneration:${source.ticksToRegeneration ? source.ticksToRegeneration : 0}\n`
        })
    })
    console.log(msg);
}
global.showStr = function () {
    const labRooms = cache.myRooms
    let msg = ''
    labRooms.forEach(myRoom => {
        msg += `${roomLink(myRoom.name)}`
        msg += `\text:${myRoom.structures.extensions.length}`
        msg += `\tsp:${myRoom.structures.spawns.length}`
        msg += `\tlabs:${Object.keys(myRoom.structures.labs).length}`
        msg += `\tlinks:${Object.keys(myRoom.structures.links).length}`
        msg += `\ttowers:${myRoom.structures.towers.length}`
        msg += `\tfac:${myRoom.structures.factory ? 1 : 0}`
        msg += `\tps:${myRoom.structures.powerSpawn ? 1 : 0}`
        msg += `\tnuk:${myRoom.structures.nuker ? 1 : 0}`
        msg += `\tobs:${myRoom.structures.observer ? 1 : 0}`
        msg += `\tmin:${myRoom.structures.extractor ? 1 : 0}`

        msg += `\n`
    })
    console.log(msg);
}
global.showFac = function () {
    const facRooms = cache.myRooms
    let msg = `settings.bucket.factoryRun: ${settings.bucket.factoryRun}\n`
    facRooms.forEach(myRoom => {
        const factory = Game.getObjectById(myRoom.structures.factory)
        if (factory) { msg += `${roomLink(myRoom.name)}\tlvl:${factory.level ? factory.level : 0}\tcooldown:${stringFixLength(factory.cooldown, 3)}\tstatus:${stringFixLength(myRoom.factoryStatus ? myRoom.factoryStatus : '', 20)}\tlastRun:${gameTime - (myRoom.factoryLastRun ? myRoom.factoryLastRun : gameTime)}\n` }
    })
    console.log(msg);
}
global.showNuk = function () {
    const nukRooms = cache.myRooms
    let msg = ''
    nukRooms.forEach(myRoom => {
        const nuker = Game.getObjectById(myRoom.structures.nuker)
        if (nuker) { msg += `${roomLink(myRoom.name)}\tenergy:${nuker.store['energy']}\tG:${nuker.store['G']}\tcooldown:${nuker.cooldown}\tstatus:${(nuker.isActive() && !nuker.cooldown && nuker.store['energy'] == 300000 && nuker.store['G'] == 5000) ? '+' : '-'}\n` }
    })
    console.log(msg);
}
global.showDep = function () {
    let msg = `settings.tasks.harvestDeposit: ${settings.tasks.harvestDeposit}\n `, num = 1;
    msg += `settings.tasks.maxCreepsPerTaskHarvestDeposit: ${settings.tasks.maxCreepsPerTaskHarvestDeposit}\n`
    msg += `settings.tasks.maxCountOfHarvestDepositCreeps: ${settings.tasks.maxCountOfHarvestDepositCreeps}\n`
    msg += `settings.tasks.effectivnesForHarvestDeposit: ${settings.tasks.effectivnesForHarvestDeposit}\n`
    msg += `settings.tasks.minimumCooldownToCreateTaskHarvestDeposit: ${settings.tasks.minimumCooldownToCreateTaskHarvestDeposit}\n`
    msg += `settings.bucket.harvestDeposit: ${settings.bucket.harvestDeposit}\n`


    settings.tasks.minimumCooldownToCreateTaskHarvestDeposit

    _.filter(tasks, t => t.type == 'harvest deposit').filter(t => t.creeps.length).sort((a, b) => a.lastCooldown - b.lastCooldown).forEach(t => {
        msg += '<u>' + `#${num} - task ${t.number}\t maxCooldown:${stringFixLength(t.maxCooldown, 3)}\t lastCooldown:${stringFixLength(t.lastCooldown, 3)}\t room: ${roomLink(t.pos.roomName)}(${t.spawnRoom ? roomLink(t.spawnRoom.name) : ''})\t distance:${stringFixLength(t.distance ? t.distance : '-', 3)}${(t.distanceUpdatedByCreep) ? '(+)' : '(-)'}\t creeps:${t.creeps.length}\t transferCounter:${stringFixLength(t.transferCounter, 5)}\t creepsCounter:${t.creepsCounter}\t resourceType:${t.resourceType}`
        msg += '</u>\n'; num++
    })
    _.filter(tasks, t => t.type == 'harvest deposit').filter(t => !t.creeps.length).sort((a, b) => a.lastCooldown - b.lastCooldown).forEach(t => {
        msg += `#${num} - task ${t.number}\t maxCooldown:${stringFixLength(t.maxCooldown, 3)}\t lastCooldown:${stringFixLength(t.lastCooldown, 3)}\t room: ${roomLink(t.pos.roomName)}(${t.spawnRoom ? roomLink(t.spawnRoom.name) : ''})\t distance:${stringFixLength(t.distance ? t.distance : '-', 3)}${(t.distanceUpdatedByCreep) ? '(+)' : '(-)'}\t creeps:${t.creeps.length}\t transferCounter:${stringFixLength(t.transferCounter, 5)}\t creepsCounter:${t.creepsCounter}\t resourceType:${t.resourceType}\n`
        num++
    })
    let sum = 0
    cache.myRooms.sort((a, b) => b.room.memory.counter_deposit - a.room.memory.counter_deposit).forEach(myRoom => {
        msg += `${roomLink(myRoom.name)} harvest deposit: ${myRoom.room.memory.counter_deposit} \n`; sum += Memory.rooms[myRoom.name].counter_deposit ? Memory.rooms[myRoom.name].counter_deposit : 0
    })
    return msg + `sum: ${sum}`
}
global.stringFixLength = function (text, length) {
    text = String(text)
    if (text.length < length) {
        for (let i = 0; i < length - text.length; i++) { text += ' ' }
        return text
    }
    else { return text.substring(0, length) }
}
global.showLab = function () {
    const labRooms = cache.myRooms
    let msg = `settings.labReactions: ${settings.labReactions}\n`
    msg += `settings.bucket.labsReaction: ${settings.bucket.labsReaction}, bucket: ${Game.cpu.bucket}\n`
    msg += `settings.tasks.labsCPU: ${settings.tasks.labsCPU}\n`
    labRooms.forEach(myRoom => {
        msg += `${roomLink(myRoom.name)}\tupdateLabReaction: ${Game.time - myRoom.updateLabReactionTick}\t${JSON.stringify(myRoom.room.memory.labs, 0, 3)}\n`
        const labsIn = idToObj(_.filter(myRoom.structures.labs, lab => lab.role == 'in').map(lab => lab.id))
        labsIn.forEach(lab => {
            msg += `${lab.id}\t${Object.keys(lab.store).filter(res => res !== 'energy')}\t${lab.cooldown}\n`
        })
        msg += '\n'
    })
    console.log(msg);
}
global.showPow = function () {
    let msg = `settings.tasks.harvestPower: ${settings.tasks.harvestPower}, settings.bucket.harvestPower: ${settings.bucket.harvestPower}\n`
    msg += `settings.tasks.harvestPower_minimumPowerWhenDistanceMoreThan300: ${settings.tasks.harvestPower_minimumPowerWhenDistanceMoreThan300}\n`
    msg += `settings.tasks.harvestPower_minimumPower: ${settings.tasks.harvestPower_minimumPower}\n`
    msg += `settings.minimumEnergyToFillPowerSpawn: ${settings.minimumEnergyToFillPowerSpawn}\n`
    _.filter(tasks, t => t.type == 'harvest power').forEach(t => {
        if (t.active) { msg += '<u>' }
        msg += `#${t.number}${t.active ? '(+)' : '(-)'}:\ttime:${t.ticksToDecay - gameTime}\tpower:${t.power}\thits:${t.hits}\tdistance:${t.distance}${(t.distanceUpdatedByCreep) ? '(+)' : '(-)'}, \t creeps:${t.creeps.length}\troom: ${roomLink(t.pos.roomName)}(${roomLink(t.spawnRoom.name)})`
        if (t.active) { msg += '</u>\n' } else { msg += '\n' }
    }); console.log(msg)
}
global.showCon = function () {
    let msg = ''; const stat = []
    cache.myRooms.map(myRoom => { stat.push({ room: myRoom.name, ticksToDowngrade: myRoom.room.controller.ticksToDowngrade, lvl: myRoom.level }) })
    stat.sort((a, b) => a.ticksToDowngrade - b.ticksToDowngrade)
    stat.forEach(s => msg += `room: ${roomLink(s.room)}(${s.lvl})\t${s.ticksToDowngrade}\tcreeps:${_.filter(Memory.creeps, cm => cm.role == 'upgrade' && cm.roomName == s.room).length}\t${myRooms[s.room].status ? myRooms[s.room].status : ''} \n`)
    console.log(msg);
}
global.showRes = function (resourceType = false, showIfZero = true) {
    if (resourceType !== false) {
        if (resourceType == 4) {
            let msg = '', sum = 0
            resourcesTier4.forEach(res => { msg += res + ': ' + tools.numberWithSpaces(cache.resources[res]) + '\t' + stringFixLength((descriptions[res] ? descriptions[res] : ''), 12) + '\t' + `min:${minimumStock(res) * cache.countOfMyRoomsWithTerminals}\tmax:${maximumStock(res) * cache.countOfMyRoomsWithTerminals}` + '\n'; sum += cache.resources[res] })
            return 'sum: ' + tools.numberWithSpaces(sum) + '\n' + msg
        }
        else if (resourceType == 3) {
            let msg = '', sum = 0
            resourcesTier3.forEach(res => { msg += res + ': ' + tools.numberWithSpaces(cache.resources[res]) + '\t' + stringFixLength((descriptions[res] ? descriptions[res] : ''), 12) + '\t' + `min:${minimumStock(res) * cache.countOfMyRoomsWithTerminals}\tmax:${maximumStock(res) * cache.countOfMyRoomsWithTerminals}` + '\n'; sum += cache.resources[res] })
            return 'sum: ' + tools.numberWithSpaces(sum) + '\n' + msg
        }
        else if (resourceType == 2) {
            let msg = '', sum = 0
            resourcesTier2.forEach(res => { msg += res + ': ' + tools.numberWithSpaces(cache.resources[res]) + '\t' + stringFixLength((descriptions[res] ? descriptions[res] : ''), 12) + '\t' + `min:${minimumStock(res) * cache.countOfMyRoomsWithTerminals}\tmax:${maximumStock(res) * cache.countOfMyRoomsWithTerminals}` + '\n'; sum += cache.resources[res] })
            return 'sum: ' + tools.numberWithSpaces(sum) + '\n' + msg
        }
        else if (resourceType === 0) {
            let msg = '', sum = 0
            resourcesTier1.forEach(res => { msg += res + ': ' + tools.numberWithSpaces(cache.resources[res]) + '\t' + stringFixLength((descriptions[res] ? descriptions[res] : ''), 12) + ` (${cache.resources[tools.getResToCompressOrDecompress(res)]})` + '\t' + `min:${minimumStock(res) * cache.countOfMyRoomsWithTerminals}}\tmax:${maximumStock(res) * cache.countOfMyRoomsWithTerminals}` + '\n'; sum += cache.resources[res] })
            return 'sum: ' + tools.numberWithSpaces(sum) + '\n' + msg
        }
        else {
            let msg = `resource: ${resourceType}, total: ${cache.resources[resourceType]}, mean: ${Math.floor(cache.resources[resourceType] / cache.myRooms.filter(myRoom => myRoom.storage).length)}  \n`
            const mr = [].concat(cache.myRooms)
            mr.sort((a, b) => a.resources[resourceType] - b.resources[resourceType]).forEach(myRoom => {
                if (showIfZero) { msg += `${roomLink(myRoom.name)} - ${myRoom.resources[resourceType]}\n` }
                else if (cache.resources[resourceType] && cache.resources[resourceType] > 0) { msg += `${myRoom.name} - ${myRoom.resources[resourceType]}\n` }
            })
            return msg
        }
    }
    else {
        let msg = ``
        const res = [].concat(resourcesTier1, resourcesTier2, resourcesTier3, resourcesTier4, resourcesTier5, resourcesBar, global.basicCommodities, hightCommodities1, hightCommodities2, hightCommodities3, hightCommodities4, hightCommodities5).sort((a, b) => cache.resources[b] - cache.resources[a])
        res.forEach(resourceType => {
            if (showIfZero) { msg += `${stringFixLength(tools.numberWithSpaces(cache.resources[resourceType]),10)}\t${stringFixLength(resourceType,20)}\t${stringFixLength((descriptions[resourceType] ? descriptions[resourceType] : ''), 12)} \n` }
            else if (cache.resources[resourceType] && cache.resources[resourceType] > 0) { msg += `${resourceType}\t${cache.resources[resourceType]}\t${stringFixLength((descriptions[resourceType] ? descriptions[resourceType] : ''), 12)} \n` }
        })
        return msg
    }
}
global.showCreeps = function (role = false) {
    const creeps = Object.values(Game.creeps)
    let msg = `total: ${creeps.length}\n`
    if (!role) {
        const roles = {}
        creeps.forEach(creep => {
            const role = creep.memory.role
            if (!roles[role]) { roles[role] = { role: role, amount: 1 } }
            else { roles[role].amount++ }
        })

        Object.values(roles).sort((a, b) => b.amount - a.amount).forEach(role => msg += `${role.role} : ${role.amount} \n`)
    }
    else {
        const roles = ['manage', 'upgrade', 'repair', 'harvest source', 'harvest mineral', 'defend_attack', 'defend_rangedAttack']
        if (!roles.includes(role)) { return _.filter(Game.creeps, c => c.memory.role == role).map(c => c.pos.roomName) }
        let counter = 0
        cache.myRooms.forEach(myRoom => {
            const count = myRoom.creeps.filter(c => c.memory.role == role).length; counter += count
            msg += `${roomLink(myRoom.name)}\t${count}\n`
        })
        msg = '<u>' + `role == ${role}, total: ${counter}` + '</u>\n' + msg
        return msg
    }

    return msg
}
global.showRam = function () {
    let msg = `settings.tasks.repair_max: ${settings.tasks.repair_max}\n`
    msg += `settings.tasks.repair_boost: ${settings.tasks.repair_boost}\n`
    msg += `settings.bucket.repair_spawn: ${settings.bucket.repair_spawn}\n`
    msg += `settings.bucket.repair: ${settings.bucket.repair}\n`
    msg += `settings.minimumHitsForRamParts[8]: ${settings.minimumHitsForRamParts[8]}\n`
    let countOfR = 0, countOfW = 0
    cache.myRooms.sort((a, b) => a.structures.ramparts.length - b.structures.ramparts.length).map(myRoom => {
        msg += `${roomLink(myRoom.name)}\tramparts: ${myRoom.structures.ramparts.length}(${myRoom.structures.walls.length}) `
        const ramparts = idToObj(myRoom.structures.ramparts); countOfR += ramparts.length
        const walls = idToObj(myRoom.structures.walls).filter(x => x.hits); countOfW += walls.length
        const rampartsAndWalls = ramparts.concat(walls)
        rampartsAndWalls.sort((a, b) => a.hits - b.hits)
        if (rampartsAndWalls.length) { msg += `\thitsMin: ${Math.floor(rampartsAndWalls[0].hits / 1000000)}M , repair: ${_.filter(Memory.creeps, cm => cm.role == 'repair' && cm.roomName == myRoom.name).length}\n` }
        else { msg += `repair: ${_.filter(Memory.creeps, cm => cm.role == 'repair' && cm.roomName == myRoom.name).length}\n` }
    })
    msg += `total ramparts: ${countOfR}\n`
    msg += `total walls: ${countOfW}\n`
    msg += `sum: ${countOfR + countOfW}`
    console.log(msg);
}
global.showTerminals = function (resourceType) {
    let num = 1; let msg = '';
    if (resourceType) {
        cache.terminals.ordersList.filter(o => o.resourceType == resourceType).forEach(o => { msg += `${num}\t${roomLink(o.sender.name)}=>${roomLink(o.receiver.name)},\tamount: ${o.amount} \n`; num++ })
    }
    else { cache.terminals.ordersList.forEach(o => { msg += `${num}\t${roomLink(o.sender.name)}=>${roomLink(o.receiver.name)},\tamount: ${o.amount}\t${o.resourceType} \n`; num++ }) }
    return msg
}
global.showStatus = function () {
    let num = 1; let msg = ''; const statuses = { work: { amount: 0 }, support: { amount: 0 }, halted: { amount: 0 } }
    msg += `settings.rotateRooms:${settings.rotateRooms}\n`
    msg += `settings.activeRooms:${settings.activeRooms}\n`
    cache.myRooms.forEach(myRoom => {
        msg += `${num}\t${roomLink(myRoom.name)}\t${myRoom.status ? myRoom.status : ''}\n`; num++
        if (myRoom.status && myRoom.status == 'prepare to support') statuses.support.amount++
        else if (myRoom.status && myRoom.status == 'support') statuses.support.amount++
        else if (myRoom.status && myRoom.status == 'prepare to halted') statuses.halted.amount++
        else if (myRoom.status && myRoom.status == 'halted') statuses.halted.amount++
        else statuses.work.amount++
    })
    msg += `active rooms: ${statuses.work.amount}\n`
    msg += `support rooms: ${statuses.support.amount}\n`
    msg += `halted rooms: ${statuses.halted.amount}\n`
    return msg
}
global._obj = id => Game.getObjectById(id)
global.idToObj = function (idArray) {
    const objList = []
    idArray.forEach(id => {
        const obj = _obj(id); if (obj) objList.push(obj)
    })
    return objList
}
global.STRUCTURES = [STRUCTURE_SPAWN, STRUCTURE_EXTENSION, STRUCTURE_ROAD, STRUCTURE_WALL, STRUCTURE_RAMPART,
    STRUCTURE_LINK, STRUCTURE_STORAGE, STRUCTURE_TOWER, STRUCTURE_OBSERVER, STRUCTURE_POWER_BANK, STRUCTURE_POWER_SPAWN,
    STRUCTURE_EXTRACTOR, STRUCTURE_LAB, STRUCTURE_TERMINAL, STRUCTURE_CONTAINER, STRUCTURE_NUKER, STRUCTURE_FACTORY]

global.minimumStock = function (resourceType) {
    if (settings.terminals.minimumStock[resourceType]) return settings.terminals.minimumStock[resourceType]
    else { return settings.terminals.minimumStock['default'] }
    // return settings.terminals.minimumStock[resourceType] || settings.terminals.minimumStock['default']
}
global.maximumStock = function (resourceType) {
    if (settings.terminals.maximumStock[resourceType]) return settings.terminals.maximumStock[resourceType]
    else {
        if (resourcesTier4.includes(resourceType)) return settings.store.resourcesTier4
        else if (resourcesTier3.includes(resourceType)) return settings.store.resourcesTier3
        else if (resourcesTier2.includes(resourceType)) return settings.store.resourcesTier2
        else { return settings.terminals.maximumStock['default'] }
    }
}
global.colors$2 = {
    slate: '#cbd5e1',
    gray: '#d1d5db',
    zinc: '#d4d4d8',
    neutral: '#d4d4d4',
    stone: '#d6d3d1',
    red: '#fca5a5',
    orange: '#fdba74',
    amber: '#fcd34d',
    yellow: '#fde047',
    lime: '#bef264',
    green: '#86efac',
    emerald: '#6ee7b7',
    teal: '#5eead4',
    cyan: '#67e8f9',
    sky: '#7dd3fc',
    blue: '#93c5fd',
    indigo: '#a5b4fc',
    violet: '#c4b5fd',
    purple: '#d8b4fe',
    fuchsia: '#f0abfc',
    pink: '#f9a8d4',
    rose: '#fda4af',
}
global.colorful = function (content, colorName = null, bolder = false) {
    const colorStyle = colorName ? `color: ${colors$2[colorName]};` : '';
    const bolderStyle = bolder ? 'font-weight: bolder;' : '';
    return `<text style="${[colorStyle, bolderStyle].join(' ')}">${content}</text>`;
}
global.showSquads = function () {
    let msg = ''
    Object.values(squads).forEach(s => { msg += `${s.name}\t${s.type}\t${s.pos ? roomLink(s.pos.roomName) : ''}(${roomLink(s.spawnRoom.name)})\t${JSON.stringify(Object.values(s.roles).map(s => `${s.role} - ${s.amount}`))}\n` })
    console.log(msg)
}
global.showBodies = function () {
    let msg = ``
    Object.keys(Memory.bodies).forEach(key => {
        let previus
        Memory.bodies[key].forEach(body => {
            if (body == previus) {

            }
        })
    })
}
global.chekPosForMove = function (position, creep) {
    // console.log(JSON.stringify(position))
    if (position.x < 1 || position.x > 48 || position.y < 1 || position.y > 48) { return false }
    const pos = new RoomPosition(position.x, position.y, position.roomName)
    if (!creep.pos.inRangeTo(pos, 1)) { return false }
    const objAtPos = Game.rooms[position.roomName].lookAt(position.x, position.y)
    let res = true
    objAtPos.forEach(o => {
        if (o.type == 'terrain') { if (o.terrain == 'wall') { res = false } }
        if (o.type == 'creep') { res = false }
    })
    return res
}