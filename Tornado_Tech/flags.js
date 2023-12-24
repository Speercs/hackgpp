'use strict'
//2023.09.19 positions for squads
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
                    else if (flag.name == 'pos2') { squad.pos2 = flag.pos }
                    else if (['1', '2', '3', '4', '5', '6', '7', '8', '9'].includes(flag.name)) {
                        squad.positions = squad.positions || {}
                        squad.positions[flag.name] = flag.pos
                        if (squad.positions['0'].roomName == flag.pos.roomName) {
                            squad.positions[flag.name].dif = { x: squad.positions['0'].x - flag.pos.x, y: squad.positions['0'].y - flag.pos.y }
                            if (squad.positions['0'].x > flag.pos.x) squad.positions[flag.name].dif.signX = '-'
                            else squad.positions[flag.name].dif.signX = '-'
                            if (squad.positions['0'].y > flag.pos.y) squad.positions[flag.name].dif.signY = '+'
                            else squad.positions[flag.name].dif.signY = '-'
                        }
                        else { delete squad.positions[flag.name].dif }
                    }
                    else if (flag.name == '0') { squad.pos = flag.pos; squad.positions = {}; squad.positions['0'] = flag.pos }
                    else {
                        squad.pos = flag.pos; squad.positions['0'] = flag.pos
                        Object.keys(squad.positions).filter(key => key !== '0').forEach(key => {
                            try {
                                if (squad.positions[key].dif) {
                                    squad.positions[key].x = squad.positions['0'].x + (squad.positions[key].dif.signX == '+' ? squad.positions[key].dif.x : 0 - squad.positions[key].dif.x)
                                    squad.positions[key].y = squad.positions['0'].y + (squad.positions[key].dif.signY == '+' ? squad.positions[key].dif.y : 0 - squad.positions[key].dif.y)
                                    squad.positions[key].roomName = squad.positions['0'].roomName
                                }
                            } catch (error) {
                                console.log(`error with set positions to squad: ${squad.number}\n` + error + `\n${error.stack}`)
                                delete squad.positions[key]
                            }
                        })

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
                const myRoom = myRooms[flag.pos.roomName]; if (!myRoom) break
                myRoom.room.memory.structurePositions = myRoom.room.memory.structurePositions || []
                const queue = myRoom.queues.build
                switch (flag.secondaryColor) {
                    case COLOR_RED: newBuild = { structureType: STRUCTURE_STORAGE, pos: flag.pos, done: (flag.name == 'true') ? true : false }
                        queue.push(newBuild); myRoom.room.memory.structurePositions.push({ type: STRUCTURE_STORAGE, pos: flag.pos })
                        break
                    case COLOR_PURPLE: newBuild = { structureType: STRUCTURE_TOWER, pos: flag.pos, done: (flag.name == 'true') ? true : false }
                        queue.push(newBuild); myRoom.room.memory.structurePositions.push({ type: STRUCTURE_TOWER, pos: flag.pos })
                        break
                    case COLOR_BLUE: newBuild = { structureType: STRUCTURE_LINK, pos: flag.pos, done: (flag.name == 'true') ? true : false }
                        queue.push(newBuild); myRoom.room.memory.structurePositions.push({ type: STRUCTURE_LINK, pos: flag.pos })
                        break
                    case COLOR_CYAN: newBuild = { structureType: STRUCTURE_TERMINAL, pos: flag.pos, done: (flag.name == 'true') ? true : false }
                        queue.push(newBuild); myRoom.room.memory.structurePositions.push({ type: STRUCTURE_TERMINAL, pos: flag.pos })
                        break
                    case COLOR_GREEN: newBuild = { structureType: STRUCTURE_SPAWN, pos: flag.pos, done: (flag.name == 'true') ? true : false }
                        queue.push(newBuild); myRoom.room.memory.structurePositions.push({ type: STRUCTURE_SPAWN, pos: flag.pos })
                        break
                    case COLOR_YELLOW: newBuild = { structureType: STRUCTURE_EXTENSION, pos: flag.pos, done: (flag.name == 'true') ? true : false }
                        queue.push(newBuild); myRoom.room.memory.structurePositions.push({ type: STRUCTURE_EXTENSION, pos: flag.pos })
                        break
                    case COLOR_ORANGE: newBuild = { structureType: STRUCTURE_LAB, pos: flag.pos, done: (flag.name == 'true') ? true : false }
                        queue.push(newBuild); myRoom.room.memory.structurePositions.push({ type: STRUCTURE_LAB, pos: flag.pos })
                        break
                    case COLOR_GREY: newBuild = { structureType: STRUCTURE_ROAD, pos: flag.pos, done: (flag.name == 'true') ? true : false }
                        queue.push(newBuild); myRoom.room.memory.structurePositions.push({ type: STRUCTURE_ROAD, pos: flag.pos })
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
                        task.pos = flag.pos; task.roomName = flag.pos.roomName
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
                    let roomName = ''
                    if (flag.name !== 'Flag1') { roomName = flag.name }
                    const newTask = { pos: flag.pos, roomName }
                    Memory.nukeTaskList.push(newTask)
                    console.log(`Memory.nukeTaskList:${Memory.nukeTaskList}`)
                    console.log(
                        colorful(
                            `adding task for nuke room: ${[flag.pos]}` + (newTask.roomName ? ` from ${roomLink(newTask.roomName)}` : ''), 'orange'
                        )
                    )
                    tools.launchNukeByTasks()
                }
                flag.remove()
                break
        }
        flag.remove()
    }

    settings.writePerformanceLog ? performance.newLog(cpu, 'flags') : false
}