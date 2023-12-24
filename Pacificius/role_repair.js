'use strict'
//2023.06.11
MyRoom.prototype.repair = function () {
    const cpu = settings.writePerformanceLog ? Game.cpu.getUsed() : 0
    if (Game.cpu.bucket < settings.bucket.repair) { return }
    if(each100) this.updateQueuesAutoBuild()
    const task = this.tasks.repair
    const creeps = this.creeps.filter(creep => creep.memory.role == 'repair')
    if (!creeps.length) { settings.writePerformanceLog ? performance.newLog(cpu, 'MyRoom.prototype.repair', this.name) : false; return }
    const targets = (_.filter(cache.enemies, e => e.pos.roomName == this.name).length || this.nukes.length) ? [] : creeps.map(creep => creep.memory.targetId)

    
    if (this.storage) {
        if (this.resources[RESOURCE_ENERGY] > 10000 && this.constructionSites.length) {
            const buildObject = _obj(task.buildObjectId)
            if (!buildObject) {
                delete task.buildObject
                if (task.buildObjectId) { if (this.constructionSites.includes(task.buildObjectId)) { this.constructionSites.splice(this.constructionSites.indexOf(task.buildObjectId), 1) } }
                if (this.constructionSites.length) {
                    const objects = idToObj(this.constructionSites)
                    if (objects.length) {
                        task.status = 'build'
                        const buildObject = this.room.controller.pos.findClosestByPath(objects, { ingoreCreeps: true })
                        if (buildObject) { task.buildObject = buildObject; task.buildObjectId = buildObject.id }
                        else { task.buildObject = objects[0]; task.buildObjectId = objects[0].id }
                    }
                    else { delete task.buildObject; delete task.buildObjectId }
                }
                else if (this.structures.ramparts.length + this.structures.walls.length + this.structures.containers.length + this.structures.roads.length > 0) { task.status = 'repair' }
            }
            else { task.buildObject = buildObject; task.status = 'build' }
        }
        else if (((this.resources[RESOURCE_ENERGY] > 10000 && (this.storage || this.terminal)) || this.level <= 4) && this.structures.ramparts.length + this.structures.walls.length + this.structures.containers.length + this.structures.roads.length > 0) { task.status = 'repair' }
        else { task.status = '' }
    }
    else {
        if (this.terminal) {
            if (this.terminal.store[RESOURCE_ENERGY] > 1000 && this.constructionSites.length) {
                const buildObject = _obj(task.buildObjectId)
                if (!buildObject) {
                    delete task.buildObject
                    if (task.buildObjectId) { if (this.constructionSites.includes(task.buildObjectId)) { this.constructionSites.splice(this.constructionSites.indexOf(task.buildObjectId), 1) } }
                    if (this.constructionSites.length) {
                        const objects = idToObj(this.constructionSites)
                        if (objects.length) {
                            task.status = 'build'
                            const buildObject = this.room.controller.pos.findClosestByPath(objects, { ingoreCreeps: true })
                            if (buildObject) { task.buildObject = buildObject; task.buildObjectId = buildObject.id }
                            else { task.buildObject = objects[0]; task.buildObjectId = objects[0].id }
                        }
                        else { delete task.buildObject; delete task.buildObjectId }
                    }
                    else if (this.structures.ramparts.length + this.structures.walls.length > 0) { task.status = 'repair' }
                }
                else { task.buildObject = buildObject }
            }
            else if (this.terminal.store[RESOURCE_ENERGY] > 10000 && this.structures.ramparts.length + this.structures.walls.length > 0) { task.status = 'repair' }
            else { task.status = '' }
        }
        else {
            if (this.constructionSites.length) task.status = 'build'
            else task.status = 'repair'
        }
    }
    task.withdrawObjects = []
    let containers = []
    if (creeps.filter(creep => !creep.store.getUsedCapacity(RESOURCE_ENERGY)).length) {
        if (this.storage) { if (this.storage.store[RESOURCE_ENERGY] > 10000) { task.withdrawObjects.push(this.storage) } }
        if (this.terminal) { if (this.terminal.store[RESOURCE_ENERGY] > 5000) { task.withdrawObjects.push(this.terminal) } }
        if (this.structures.containers) {
            containers = idToObj(this.structures.containers.map(c => c.id)).filter(c => c.store[RESOURCE_ENERGY] > 1500)
            if (containers.length) task.withdrawObjects.push(...containers)
        }
        if (this.resources['energy'] > 10000) {
            const links = idToObj(Object.keys(this.structures.links))
            const linksWithEnergy = links.filter(link => link.store.getUsedCapacity(RESOURCE_ENERGY))
            linksWithEnergy.forEach(link => task.withdrawObjects.push(link))
        }
        if (!task.withdrawObjects.length && each10) { console.log(this.name, `repairs dont have energy to work`) }
    }

    creeps.forEach(creep => {
        if (creep.spawning || creep.getBoosted() || creep.rescueFromNuke()) { return }
        if (creep.ticksToLive < 30) { creep.goToDie(); return }
        if (creep.hits < creep.hitsMax) { creep.travelTo(this.storage ? this.storage : this.room.controller, { useFindRoute: true }); return }
        // if (!creep.store.getUsedCapacity(RESOURCE_ENERGY)) { creep.resetStatus(creep) }
        if (Object.keys(creep.store).filter(s => s !== 'energy').length) { creep.getFreeStore(); return }
        //set status                
        if (creep.memory.status == 'withdraw' && creep.store.getUsedCapacity(RESOURCE_ENERGY)) { creep.resetStatus(); }
        else if ((creep.memory.status == 'build' || creep.memory.status == 'repair') && !creep.store.getUsedCapacity(RESOURCE_ENERGY)) { creep.resetStatus() }
        else if (creep.memory.status !== 'withdraw' && creep.store.getUsedCapacity(RESOURCE_ENERGY)) { creep.memory.status = task.status }
        else if (!creep.memory.status) {
            if (!creep.store.getUsedCapacity(RESOURCE_ENERGY)) { creep.memory.status = 'withdraw' }
            else { creep.memory.status = task.status }
        }

        switch (creep.memory.status) {
            case 'withdraw':
                if (creep.memory.droppedEnergy) {
                    const drop = _obj(creep.memory.droppedEnergy)
                    if (!drop) { creep.resetStatus(); return }
                    const res = creep.pickup(drop)
                    if (res == OK) { creep.memory.status = task.status; return }
                    if (res == ERR_NOT_IN_RANGE) { creep.travelTo(drop, { useFindRoute: true }); return }
                }
                else if (!task.withdrawObjects.length) {
                    const choosedDroppedRes = _.filter(Game.creeps, creep => creep.memory.droppedEnergy).map(creep => creep.memory.droppedEnergy)
                    const droppedEnergy = idToObj(this.droppedResources.filter(d => !choosedDroppedRes.includes(d)))
                    if (droppedEnergy.length) {
                        const drEnergy = creep.pos.findClosestByPath(droppedEnergy)
                        if (drEnergy) {
                            creep.memory.droppedEnergy = drEnergy.id
                            if (creep.pickup(drEnergy) == ERR_NOT_IN_RANGE) { creep.travelTo(drEnergy, { useFindRoute: true }) }
                        }
                    }
                    else { return }
                }
                if (!creep.memory.withdrawObject) {
                    let withdrawObj
                    if (task.withdrawObjects.length == 1) { withdrawObj = task.withdrawObjects[0] }
                    else {
                        if (task.status == 'build') {
                            if (task.buildObject) {
                                withdrawObj = task.buildObject.pos.findClosestByPath(task.withdrawObjects, { ignoreCreeps: true, maxOps: 100 })
                                if (withdrawObj) { creep.memory.withdrawObject = withdrawObj.id }
                                else { withdrawObj = task.withdrawObjects[0] }
                            }
                            else { withdrawObj = task.withdrawObjects[0] }
                        }
                        else {
                            let target
                            if (task.status == 'repair') { target = _obj(creep.memory.targetId) }
                            else if (task.status == 'build') { target = _obj(task.buildObjectId) }
                            if (target) { withdrawObj = target.pos.findClosestByPath(task.withdrawObjects, { ignoreCreeps: true, maxOps: 100 }) }
                            else { withdrawObj = creep.pos.findClosestByPath(task.withdrawObjects, { ignoreCreeps: true, maxOps: 100 }) }
                        }
                    }
                    if (withdrawObj) { creep.memory.withdrawObject = withdrawObj.id; creep._withdraw(withdrawObj) }
                    else { creep.travelTo(myRooms[creep.memory.roomName].room.controller, { useFindRoute: true }) }
                }
                else {
                    const withdrawObj = _obj(creep.memory.withdrawObject)
                    if (withdrawObj) {
                        if (withdrawObj.store.getUsedCapacity(RESOURCE_ENERGY)) { creep._withdraw(withdrawObj) }
                        else { delete creep.memory.withdrawObject; creep.resetStatus() }
                    }
                    else { creep.resetStatus() }
                }
                break
            case 'build':
                if (creep.pos.x == 0 || creep.pos.x == 49 || creep.pos.y == 0 || creep.pos.y == 49) { creep.travelTo(myRooms[creep.memory.roomName].room.controller, { useFindRoute: true }) }
                creep.memory.targetId = task.buildObjectId
                creep._build();
                if (creep.memory.withdrawObject) {
                    const target = _obj(creep.memory.withdrawObject)
                    if (target) {
                        if (target.store.getUsedCapacity(RESOURCE_ENERGY) && creep.pos.inRangeTo(target, 1)) {
                            const res = creep.withdraw(target, RESOURCE_ENERGY); if (creep.memory.debug) { console.log(creep, `withdraw res: ${res}`) }
                        } else { delete creep.memory.withdrawObject }
                    }
                    else { delete creep.memory.withdrawObject }
                }
                break
            case 'repair':
                if (creep.pos.x == 0 || creep.pos.x == 49 || creep.pos.y == 0 || creep.pos.y == 49) { creep.travelTo(myRooms[creep.memory.roomName].room.controller, { useFindRoute: true }) }
                if (creep.memory.targetId && gameTime % 200 == 0) { delete creep.memory.targetId }
                if (creep.memory.withdrawObject) {
                    const target = _obj(creep.memory.withdrawObject)
                    if (target) {
                        if (target.store.getUsedCapacity(RESOURCE_ENERGY)) { if (creep.pos.inRangeTo(target, 1)) { creep.withdraw(target, RESOURCE_ENERGY) } else { delete creep.memory.withdrawObject } }
                        else { delete creep.memory.withdrawObject }
                    }
                    else { delete creep.memory.withdrawObject }
                }
                if (!creep.memory.targetId) {
                    let hits, target
                    let ramparts = idToObj(myRooms[creep.memory.roomName].structures.ramparts.filter(id => !targets.includes(id)))
                    const walls = idToObj(myRooms[creep.memory.roomName].structures.walls.filter(id => !targets.includes(id))).filter(x => x.hits)
                    ramparts = ramparts.concat(walls)
                    const ramparts1Hit = ramparts.filter(str => str.hits == 1)
                    if (ramparts1Hit.length) {
                        target = creep.pos.findClosestByPath(ramparts1Hit, { ignoreCreeps: true, maxOps: 200 })
                        if (target) { creep.memory.targetId = target.id; creep._repair(); break }
                    }
                    if (creep.memory.debug) { console.log('repair', creep, target, `_.filter(cache.enemies, e => e.pos.roomName == this.name).length < 5:${_.filter(cache.enemies, e => e.pos.roomName == this.name).length < 5}`) }
                    if (!target && _.filter(cache.enemies, e => e.pos.roomName == this.name).length < 5) {
                        const nukes = idToObj(this.nukes)
                        let rampartsBelowNukers = []
                        if (nukes.length) {
                            nukes.forEach(nuke => {
                                const nukramparts = nuke.pos.findInRange(FIND_STRUCTURES, 2, { filter: str => str.structureType == STRUCTURE_RAMPART || str.structureType == STRUCTURE_WALL })
                                rampartsBelowNukers = rampartsBelowNukers.concat(nukramparts)
                            })
                        }
                        rampartsBelowNukers.sort((a, b) => a.hits - b.hits)
                        if (creep.memory.debug) { console.log('repair', creep, `rampartsBelowNukers.length:${rampartsBelowNukers.length}`) }
                        if (rampartsBelowNukers.length) {
                            for (const rampart of rampartsBelowNukers) {
                                if (rampart.hits < 11000000 * nukes.length) {
                                    target = rampart; creep.memory.targetId = target.id; break
                                }
                            }
                        }
                        if (!target) {
                            const containers1 = idToObj(this.structures.containers.map(c => c.id))
                            if (containers1.length) {
                                const containersForRepair = containers1.filter(c => c.hits < c.hitsMax * 0.7)
                                if (containersForRepair.length) {
                                    const containerForRepair = creep.pos.findClosestByPath(containersForRepair)
                                    if (containerForRepair) { creep.memory.targetId = containerForRepair.id; creep._repair(); break }
                                }
                            }
                            if (this.structures.roads.length) {
                                const roads = idToObj(this.structures.roads)
                                const roadsForRepair = roads.filter(c => c.hits < c.hitsMax * 0.7).sort((a, b) => (a.hits / a.hitsMax) - (b.hits / b.hitsMax))
                                if (roadsForRepair.length) {
                                    creep.memory.targetId = roadsForRepair[0].id; creep._repair(); break
                                }
                            }
                        }
                        if (!target) {
                            hits = 100000 // 100 000
                            while (hits <= 1000000) { // 1 000 000
                                const rampartsBelow_hits = ramparts.filter(str => str.hits < hits)
                                if (rampartsBelow_hits.length) {
                                    target = creep.pos.findClosestByPath(rampartsBelow_hits, { ignoreCreeps: true, maxOps: 200 })
                                    if (target) { creep.memory.targetId = target.id; break }
                                }
                                hits += 100000 // 100 000
                            }
                        }
                    }
                    if (!target) {
                        hits = 1000000 // 1 000 000
                        while (hits <= settings.minimumHitsForRamParts[this.level]) {
                            const rampartsBelow_hits = ramparts.filter(str => str.hits < hits)
                            if (rampartsBelow_hits.length) {
                                target = creep.pos.findClosestByPath(rampartsBelow_hits, { ignoreCreeps: true, maxOps: 200 })
                                if (target) { creep.memory.targetId = target.id; break }
                            }
                            hits += 1000000 // 1 000 000
                        }
                    }
                    if (!target) {
                        ramparts.sort((a, b) => a.hits - b.hits)
                        if (ramparts.length) {
                            target = ramparts[0]
                            creep.memory.targetId = target.id; creep._repair(); break
                        }
                    }
                }
                if (creep.memory.targetId) { creep._repair() }
                else { creep.resetStatus() }
                break
        }
    })
    settings.writePerformanceLog ? performance.newLog(cpu, 'MyRoom.prototype.repair', this.name) : false
}
myRooms_tool.updateTaskRepair = function () {
    const cpu = settings.writePerformanceLog ? Game.cpu.getUsed() : 0, debug = false
    let usedWorkers = 0
    gl_towers.updateCacheRamparts()
    const repairObjects = cache.ramparts.concat(cache.walls)
    const forcedRooms = cache.myRooms.filter(mr => mr.tasks.repair.forced_requiredWorkers)
    forcedRooms.forEach(myRoom => {
        const task = myRoom.tasks.repair, forced = task.forced_requiredWorkers
        task.requiredWorkers = forced; usedWorkers += forced; if (debug) { console.log(myRoom.name, `1repair required:`, myRoom.tasks.repair.requiredWorkers) }
    })
    cache.myRooms.filter(mr => !forcedRooms.includes(mr)).forEach(myRoom => {
        const task = myRoom.tasks.repair
        if (myRoom.room.memory.status) { task.requiredWorkers = 0; if (debug) { console.log(myRoom.name, `2repair required:`, myRoom.tasks.repair.requiredWorkers) }; return }
        else if (_.filter(myRoom.enemies, e => e.owner.username !== 'Invader' && (cache.enemies[e.id].parameters.dismantle || cache.enemies[e.id].parameters.attack || cache.enemies[e.id].parameters.rangedAttack)).length) {
            if (Math.min.apply(null, repairObjects.filter(r => r.pos.roomName == myRoom.name).map(r => r.hits)) < settings.minimumHitsForRamParts[myRoom.level]) { task.requiredWorkers = 2; usedWorkers += 2; if (debug) { console.log(myRoom.name, `3repair required:`, myRoom.tasks.repair.requiredWorkers) } } else { task.requiredWorkers = 0; if (debug) { console.log(myRoom.name, `4repair required:`, myRoom.tasks.repair.requiredWorkers) } }
        }
        else if (usedWorkers < settings.tasks.repair_max && myRoom.constructionSites.length) { task.requiredWorkers = 1; usedWorkers += 1; if (debug) { console.log(myRoom.name, `5repair required:`, myRoom.tasks.repair.requiredWorkers) } }
        else if (usedWorkers < settings.tasks.repair_max && Math.min.apply(null, repairObjects.filter(r => r.pos.roomName == myRoom.name).map(r => r.hits).filter(n => n > 0)) < settings.minimumHitsForRamParts[myRoom.level]) { task.requiredWorkers = 1; usedWorkers += 1; if (debug) { console.log(myRoom.name, `6repair required:`, myRoom.tasks.repair.requiredWorkers) } }
        else { task.requiredWorkers = 0; if (debug) { console.log(myRoom.name, `7repair required:`, myRoom.tasks.repair.requiredWorkers) } }
    })
    if (usedWorkers < settings.tasks.repair_max) {
        const roomNames = _.map(repairObjects, r => r.pos.roomName);
        let unique = [...new Set(roomNames)].map(name => myRooms[name]).filter(mr => !mr.tasks.repair.requiredWorkers && !mr.status)
        unique.sort((a, b) => (Math.min.apply(null, repairObjects.filter(r => r.pos.roomName == a.name).map(r => r.hits))) - (Math.min.apply(null, repairObjects.filter(r => r.pos.roomName == b.name).map(r => r.hits))))
        const countOfRooms = unique.length
        if (countOfRooms) {
            let freeWorkers = settings.tasks.repair_max - usedWorkers, i = 0
            while (freeWorkers > 0 && i < countOfRooms) {
                const choosedRoom = unique[i]
                if (Math.min.apply(null, repairObjects.filter(r => r.pos.roomName == choosedRoom.name).map(r => r.hits)) < settings.minimumHitsForRamParts[choosedRoom.level]) {
                    choosedRoom.tasks.repair.requiredWorkers = ((freeWorkers > 1) ? 2 : 1); if (debug) { console.log(choosedRoom.name, `8repair required:`, choosedRoom.tasks.repair.requiredWorkers) }
                }
                else { choosedRoom.tasks.repair.requiredWorkers = 1; if (debug) { console.log(choosedRoom.name, `9repair required:`, choosedRoom.tasks.repair.requiredWorkers) } }
                freeWorkers -= choosedRoom.tasks.repair.requiredWorkers
                i++
            }
        }
    }
    settings.writePerformanceLog ? performance.newLog(cpu, 'myRooms_tool.updateTaskRepair') : false
}
myRooms_tool.manageTaskRepair = function () {
    const cpu = settings.writePerformanceLog ? Game.cpu.getUsed() : 0
    const usedRooms = []
    let freeWorkers = settings.tasks.repair_max - _.map(cache.myRooms, myRoom => myRoom.queues.spawn.filter(st => st.role == 'repair').length).reduce((a, b) => a + b, 0) - _.filter(Game.creeps, creep => creep.memory.role == 'repair').length

    if (freeWorkers) { // spawn for rooms with enemies
        _.filter(cache.myRooms, mr => mr.enemies.length && mr.tasks.repair.requiredWorkers).forEach(myRoom => {
            const inQueues = myRoom.queues.spawn.filter(st => st.role == 'repair').length
            const repairsCount = myRoom.creeps.filter(c => c.memory.role == 'repair').length
            for (let i = 0; i < (myRoom.tasks.repair.requiredWorkers - inQueues - repairsCount); i++) {
                if (!freeWorkers) { break }
                myRoom.spawnRepair(); freeWorkers--
            }
            if (!usedRooms.includes(myRoom.name)) { usedRooms.push(myRoom.name) }
        })
    }
    if (freeWorkers) { // spawn for rooms with forced
        _.filter(cache.myRooms, mr => mr.tasks.repair.forced_requiredWorkers && !usedRooms.includes(mr.name)).forEach(myRoom => {
            const inQueues = myRoom.queues.spawn.filter(st => st.role == 'repair').length
            const repairsCount = myRoom.creeps.filter(c => c.memory.role == 'repair').length
            for (let i = 0; i < (myRoom.tasks.repair.requiredWorkers - inQueues - repairsCount); i++) {
                if (!freeWorkers) { break }
                myRoom.spawnRepair(); freeWorkers--
            }
            if (!usedRooms.includes(myRoom.name)) { usedRooms.push(myRoom.name) };
        })
    }
    if (freeWorkers) { // spawn for rooms with constructionSites
        _.filter(cache.myRooms, mr => mr.tasks.repair.requiredWorkers && !usedRooms.includes(mr.name)).forEach(myRoom => {
            const inQueues = myRoom.queues.spawn.filter(st => st.role == 'repair').length
            const repairsCount = myRoom.creeps.filter(c => c.memory.role == 'repair').length
            for (let i = 0; i < (myRoom.tasks.repair.requiredWorkers - inQueues - repairsCount); i++) {
                if (!freeWorkers) { break }
                myRoom.spawnRepair(); freeWorkers--
            }
            if (!usedRooms.includes(myRoom.name)) { usedRooms.push(myRoom.name) };
        })
    }
    // cache.myRooms.forEach(myRoom => { console.log(myRoom.name, myRoom.tasks.repair.requiredWorkers) })
    settings.writePerformanceLog ? performance.newLog(cpu, 'myRooms_tool.updateTaskRepair') : false
}
MyRoom.prototype.spawnRepair = function () {
    if (this.settings.debug.repair) { console.log(this.name, 'spawnRepair') }

    const creepBody = spawnLogick.getBody('repair', this.room.energyCapacityAvailable, { boost: settings.tasks.repair_boost, spawnRoom: this })
    const newSpawnTask = {
        role: 'repair',
        priority: settings.spawn.priority.repair,
        tick: gameTime,
        creepBody: creepBody,
        creepPrice: tools.getCreepPrice(creepBody),
        memory: {
            roomName: this.name,
            role: 'repair',
        }
    }
    this.queues.spawn.push(newSpawnTask)
}