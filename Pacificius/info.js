'use strict'
//2023.07.01
global.info = {}
if (!Memory.info) { Memory.info = { list: [] } }
info.new = function (priority = 1, type = '', roomName = '', id = '', text = '') {
    if (!text) { return }
    if (type == 'attack' || type == 'enemy' || type == 'nuke') {
        if (Memory.info.list.find(m => m.id == id && m.text == text)) { return }
    }
    const msg = { tick: gameTime, roomName, priority, type, id, text }; Memory.info.list.push(msg)
    if (priority > 3) {
        console.log(`tick: ${msg.tick};\t${msg.roomName ? `room: ${roomLink(msg.roomName)};\t` : ''}${msg.id ? `id: ${msg.id};\t` : ''}priority: ${msg.priority}; type: ${msg.type} : ${msg.text}`)
    }
}
info.clear = function () { Memory.info.list = [] }
info.show = function (priority = 0, type = '', roomName = '') {
    let text = ''
    let list = Memory.info.list
    if (priority) { list = list.filter(m => m.priority == priority) }
    if (type) { list = list.filter(m => m.type == type) }
    if (roomName) { list = list.filter(m => m.roomName == roomName) }
    list.forEach(msg => {
        text += `\n${msg.tick} (${stringFixLength(gameTime - msg.tick, 7)})\t<${msg.priority}> ${msg.type}\t${msg.roomName ? `room: ${roomLink(msg.roomName)};\t` : ''}${msg.id ? `id: ${msg.id};\t` : ''} : ${msg.text} `
        if (msg.roomName) { text += `<a href="#!/history/${Game.shard.name}/${msg.roomName}?t=${msg.tick}">[${msg.roomName}]</a>` }
    })

    console.log(text)
}

info.showAttack = function () {
    const cpu = settings.writePerformanceLog ? Game.cpu.getUsed() : 0
    _.forEach(Game.rooms, room => {
        const myRoom = myRooms[room.name]
        if (!myRoom) { return }
        let eventLog = room.getEventLog();

        myRoom.attackEvents = _.filter(eventLog, { event: EVENT_ATTACK });
        // myRoom.attackEvents = _.filter(eventLog, e => e.event == EVENT_ATTACK);
        myRoom.attackEvents.forEach(event => {
            let target = _obj(event.data.targetId);
            if (target && (target.my || target.structureType == 'constructedWall')) {
                const attacker = _obj(event.objectId)
                let username = attacker ? (attacker.owner ? attacker.owner.username : '') : ''
                if (!username) { if (cache.enemies[event.objectId]) { username = cache.enemies[event.objectId].owner } }
                if (username && username !== 'Invader' && username !== 'Power Bank' && username !== settings.username) {
                    info.new(myRoom.my ? 5 : 4, 'attack', room.name, target.id, `${target} was attacked by ${username ? username : event.objectId}`)
                    if (myRoom.my) {
                        myRoom.underAttack = true; myRoom.underAttackTick = gameTime - 1; myRoom.room.memory.lastAttackTick = gameTime - 1
                        settings.tasks.repair_boost = true
                        if (settings.tasks.repair_max < 4) settings.tasks.repair_max = 4
                        if (myRoom.room.memory.status !== 'halted') { myRoom.setStatus('') }
                        if (myRoom.level < 7) { myRoom.room.controller.activateSafeMode() }
                    }
                    //else { taskTools.createTaskAvangers(target.pos, username) }
                }
            }
        });
        // update tombstones
        let updateTombstones
        _.filter(eventLog, e => e.event == EVENT_OBJECT_DESTROYED && e.data.type == 'creep').forEach(event => {
            if (cache.enemies[event.objectId]) { delete cache.enemies[event.objectId] }
            updateTombstones = true
        })
        if (updateTombstones && myRoom.my) { myRoom.updateManageMicroTasks_tombstones() }

        if (myRoom.my) {
            const eventDestroy = _.find(eventLog, e => e.event == EVENT_OBJECT_DESTROYED && STRUCTURES.includes(e.data.type))
            if (eventDestroy) {
                console.log(`${roomLink(room.name)} - EVENT_OBJECT_DESTROYED - structure\n${JSON.stringify(eventDestroy)}`)
                myRoom.updateStructures(); myRoom.updateQueuesAutoBuild()
            }
            const eventNuke = _.find(eventLog, e => e.event == EVENT_ATTACK_TYPE_NUKE && !e.data.healType)
            if (eventNuke) {
                console.log(`${roomLink(room.name)} - EVENT_ATTACK_TYPE_NUKE\n${JSON.stringify(eventNuke)}`)
                myRoom.updateStructures(); myRoom.updateQueuesAutoBuild()
            }
        }
        else {
            // const eventDestroy = _.find(eventLog, e => e.event == EVENT_OBJECT_DESTROYED)
            // if (eventDestroy) {
            //     console.log(`event destroy in room: ${room.name}, all c.memory._trav deleted`)
            //     Object.values(Game.creeps).forEach(c => delete c.memory._trav)
            // }
        }
    });



    settings.writePerformanceLog ? performance.newLog(cpu, 'info.showAttack', this.name) : false
}