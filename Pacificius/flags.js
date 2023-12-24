'use strict'
//2023.05.04
global.flags = {}
flags.checkflags = function () {
    const cpu = settings.writePerformanceLog ? Game.cpu.getUsed() : 0
    for (let flagName in Game.flags) {
        let flag = Game.flags[flagName]
        switch (flag.color) {
            case COLOR_WHITE:
                const squad = squads[flag.secondaryColor]
                if (flag.name == 'delete') {
                    if (squad) { squad.delete() }
                    break
                }
                if (!squad) { squadTools.createSquad(flag.secondaryColor, flag.name, flag.pos); squads[flag.secondaryColor].status = 'moveAttack'; squads[flag.secondaryColor].pos = flag.pos }
                else {
                    if (flag.name == 'pn') { squad.path = []; squad.path.push(flag.pos); squad.pos = flag.pos; squad.backup() }
                    else if (flag.name == 'p') { squad.path.push(flag.pos); squad.pos = flag.pos; squad.backup() }
                    else {
                        squad.pos = flag.pos;
                        if (squad.type == 'dismantle') { squad.creeps.forEach(c => delete c.memory.dismantleId) }
                        squad.backup()
                        if (squad.type == 'attack') { squad.creeps.forEach(c => delete c.memory.structure) }
                    }
                }
                switch (flag.secondaryColor) {
                    case COLOR_RED:
                        break
                }
                break
            case COLOR_GREY:
                taskTools.create(flag.name, flag.pos); break
            case COLOR_YELLOW:
                let newBuild
                const queue = myRooms[flag.pos.roomName].queues.build
                switch (flag.secondaryColor) {
                    case COLOR_RED: newBuild = { structureType: STRUCTURE_STORAGE, pos: flag.pos, done: (flag.name == 'true') ? true : false }
                        queue.push(newBuild)
                        break
                    case COLOR_PURPLE: newBuild = { structureType: STRUCTURE_TOWER, pos: flag.pos, done: (flag.name == 'true') ? true : false }
                        queue.push(newBuild)
                        break
                    case COLOR_BLUE: newBuild = { structureType: STRUCTURE_LINK, pos: flag.pos, done: (flag.name == 'true') ? true : false }
                        queue.push(newBuild)
                        break
                    case COLOR_CYAN: newBuild = { structureType: STRUCTURE_TERMINAL, pos: flag.pos, done: (flag.name == 'true') ? true : false }
                        queue.push(newBuild)
                        break
                    case COLOR_GREEN: newBuild = { structureType: STRUCTURE_SPAWN, pos: flag.pos, done: (flag.name == 'true') ? true : false }
                        queue.push(newBuild)
                        break
                    case COLOR_YELLOW: newBuild = { structureType: STRUCTURE_EXTENSION, pos: flag.pos, done: (flag.name == 'true') ? true : false }
                        queue.push(newBuild)
                        break
                    case COLOR_ORANGE: newBuild = { structureType: STRUCTURE_LAB, pos: flag.pos, done: (flag.name == 'true') ? true : false }
                        queue.push(newBuild)
                        break
                    case COLOR_GREY: newBuild = { structureType: STRUCTURE_ROAD, pos: flag.pos, done: (flag.name == 'true') ? true : false }
                        queue.push(newBuild)
                        break
                    case COLOR_WHITE:
                        let numForSplice = (flag.name == 'Flag1') ? 1 : parseInt(flag.name)
                        queue.slice(0, 0 - numForSplice)
                        break
                }

                flag.remove()
                break
            case COLOR_BROWN:
                if (settings.debug.flags) { console.log('brown') }
                if (flag.secondaryColor == COLOR_BROWN) {
                    const task = tasks[flag.name]
                    try {
                        task.pos = flag.pos;
                        if (task.type == 'attackRoom') { delete task.structure }
                        if (task.type == 'attackGroup') { delete task.line1 }
                        if (task.type == 'dismantleRoom') { task.creeps.forEach(c => delete c.memory.dismantleId) }
                    } catch (error) {

                    }
                }
                else if (flag.secondaryColor == COLOR_WHITE) {
                    const task = tasks[flag.name]
                    if (task) {
                        task.pathList = task.pathList || []
                        if (!task.pathList.length) { task.pathList.push({ pos: flag.pos }); console.log(`step was added to task: ${task.number} for pos:${flag.pos}`) }
                        else {
                            const stepData = task.pathList[task.pathList.length - 1]
                            const pos1 = new RoomPosition(stepData.pos.x, stepData.pos.y, stepData.pos.roomName)
                            const pathFind = PathFinder.search(pos1, flag.pos)
                            if (pathFind.incomplete) { console.log(`can't find path. step dont pushed to task ${task.number}`) }
                            else {
                                task.pathList.push({ pos: flag.pos, path: pathFind.path });
                                console.log(`step was added to task: ${task.number} for pos:${flag.pos}`)
                                task.backup()
                            }
                        }
                    }
                }
                else if (flag.secondaryColor == COLOR_GREY) {
                    const task = tasks[flag.name]
                    if (task) {
                        task.pathList = task.pathList || []
                        const pathRoom = task.pathList.find(p => p.roomName == flag.pos.roomName)
                        if (pathRoom) { pathRoom.x = flag.pos.x; pathRoom.y = flag.pos.y; console.log(`for task ${flag.name} pathList in room: ${flag.pos.roomName} modifed pos `) }
                        else { task.pathList.push(flag.pos); console.log(`for task ${flag.name} pathList push new room: ${flag.pos.roomName}`) }
                        task.backup()
                    }
                }
                else if (flag.secondaryColor == COLOR_RED) {
                    if (settings.debug.flags) { console.log('red') }
                    Memory.nukeTaskList = Memory.nukeTaskList || []
                    const newTask = { pos: flag.pos }
                    if (flag.name !== 'Flag1') { newTask.roomName = flag.name }
                    Memory.nukeTaskList.push(newTask)
                    console.log(`adding task for nuke room: ${[flag.pos]} `)
                    tools.launchNukeByTasks()
                }
                flag.remove()
                break
        }
        flag.remove()
    }

    settings.writePerformanceLog ? performance.newLog(cpu, 'flags') : false
}