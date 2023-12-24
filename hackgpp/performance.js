'use strict'
//2023.07.30
global.performance = {}
performance.log = []
performance.on = function () {
    settings.writePerformanceLog = true; console.log('performance log turning on')
}
performance.newLog = function (cpu, module = '', roomName = false) {
    const cpuUsed = parseFloat((Game.cpu.getUsed() - cpu).toFixed(2))
    if (!cache.cpu.functionsCurrentTick.modules[module]) {
        cache.cpu.functionsCurrentTick.modules[module] = { module: module, cpuUsed: cpuUsed, count: 1 }
    }
    else {
        cache.cpu.functionsCurrentTick.modules[module].cpuUsed += cpuUsed
        cache.cpu.functionsCurrentTick.modules[module].count++
    }
    if (roomName) {
        if (!cache.cpu.functionsCurrentTick.modules[module].detail) { cache.cpu.functionsCurrentTick.modules[module].detail = {} }
        cache.cpu.functionsCurrentTick.modules[module].detail[roomName] = { roomName: roomName, cpuUsed: cpuUsed }
    }
}
performance.writeLog = function () {
    cache.cpu.functionsCurrentTick.cpu = parseFloat(Game.cpu.getUsed().toFixed(2))
    performance.log.push(cache.cpu.functionsCurrentTick)
    if (performance.log.length > 1000) { performance.log.splice(0, 1) }
}

performance.show = function (amount = 10, module = false) {
    if (!module) {
        const logs = [].concat(performance.log).reverse()
        for (let i = 0; i < ((amount > logs.length) ? logs.length : amount); i++) {
            const log = logs[i]
            let total = 0
            let logView = `--- ${log.tick}\t bucket: ${log.bucket}\t${log.bucketDif} ---\n`
            Object.values(log.modules).sort((a, b) => b.cpuUsed - a.cpuUsed).forEach(key => {
                logView += `${key.cpuUsed.toFixed(2)} - ${key.count} - ${key.module} \n`
                total += key.cpuUsed
            })
            console.log(logView + `${log.cpu} - ${log.cpu - total.toFixed(2)}`);
        }
    }
    else {
        const logs = [...performance.log].reverse().filter(l => l.modules[module]).filter(l => l.modules[module].detail)
        const counter = {}
        for (let i = 0; i < ((amount > logs.length) ? logs.length : amount); i++) {
            const log = logs[i]
            let total = 0
            let logView = `--- ${log.tick}\t bucket: ${log.bucket}\t${log.bucketDif} ---\n`
            const list = Object.values(log.modules[module].detail).sort((a, b) => b.cpuUsed - a.cpuUsed)

            for (const key in list) {
                const element = list[key];
                if (!counter[key]) { counter[key] = {} }
                if (!counter[key][element.roomName]) { counter[key][element.roomName] = { roomName: element.roomName, count: 1 } }
                else { counter[key][element.roomName].count++ }


                logView += `${element.cpuUsed ? element.cpuUsed.toFixed(2) : element.cpuUsed} - ${element.roomName} \n`
                total += element.cpuUsed
            }
            console.log(logView + `total: ${total.toFixed(2)}`);
        }
        let msg = ''
        for (const key in Object.keys(counter)) {
            const element = counter[key]
            if (element) {
                const list = Object.values(element).sort((a, b) => b.count - a.count)
                msg += `${key} - ${list[0].roomName} (${list[0].count}) \n`
            }

        }
        console.log(msg)
    }
}
performance.writeLogByCreep = function () {

}