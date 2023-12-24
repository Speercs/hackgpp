'use strict'
//2023.07.24
global.terminal_logic = {}

terminal_logic.createOrderToBuyResource = function (roomName, res) {
    if (res == RESOURCE_POWER && !settings.terminals.buyPower) { return }
    const myOrders = cache.market.orders = cache.market.orders || Game.market.orders
    const resources = []
    if (['L', 'K', 'X', 'O', 'U', 'Z', 'H'].includes(res)) { resources.push(res); resources.push(tools.getResToCompressOrDecompress(res)) }
    else { resources.push(res) }
    resources.forEach(resourceType => {
        const order = _.find(myOrders, o => o.roomName == roomName && o.resourceType == resourceType && o.type == ORDER_BUY && o.remainingAmount > 0)
        const avgPrice = terminal_logic.getAvgPriceOfResource(resourceType)
        const maxPriceOfResources = settings.terminals.maxPriceOfResources[resourceType] || avgPrice * 1.25
        const highPrice = terminal_logic.getHighPrice(resourceType, ORDER_BUY)
        if (!order) {
            let price = avgPrice * settings.terminals.multiplierToBuy

            if (maxPriceOfResources && price > maxPriceOfResources) { price = maxPriceOfResources * settings.terminals.multiplierToBuy }
            if (highPrice && price > highPrice) { price = highPrice }
            const amount = (resourceType == RESOURCE_ENERGY) ? 50000 : (resourcesBar.includes(resourceType) ? cache.countOfMyRooms * 100 : cache.countOfMyRooms * 1000)
            let res = Game.market.createOrder({ type: ORDER_BUY, price: price, resourceType: resourceType, totalAmount: amount, roomName: roomName })
            if (settings.debug.buyResources) {
                if (res == OK) { console.log(colorful('create task buy resource: ' + resourceType + ' for room ' + roomName + ' price: ' + (price), 'purple')); }
            }
        }
        else {
            if (gameTime - order.created > 200000) { Game.market.cancelOrder(order.id); console.log(`cancel order for room ${roomName} to buy ${resourceType}, amount: ${order.amount}`); }
            else if (each1000) {
                // const historyOfResource = Game.market.getHistory(resourceType); //historyOfResource.reverse()
                // const avgPrice = historyOfResource.slice(-1)[0].avgPrice
                let price = order.price * (1.03 + (0.01 * (Math.round(gameTime - order.created) / 1000)))
                if (price > maxPriceOfResources) price = maxPriceOfResources
                if (highPrice && highPrice + 0.001 < maxPriceOfResources) price = highPrice + 0.001
                if (settings.debug.buyResources) {
                    console.log(colorful(`changing price from: ${order.price} to ${price} for buy ${resourceType} in room: ${roomName}, id: ${order.id} , timer:${Math.round(gameTime - order.created)}`, 'purple'));
                }
                Game.market.changeOrderPrice(order.id, price)
            }
        }
    })

}
terminal_logic.clearDisactiveOrders = function () {
    const cpu = settings.writePerformanceLog ? Game.cpu.getUsed() : 0
    const myOrders = Game.market.orders
    const inactive = _.filter(myOrders, order => !order.active && !order.remainingAmount).map(o => o.id)
    inactive.forEach(order => Game.market.cancelOrder(order))
    settings.writePerformanceLog ? performance.newLog(cpu, 'terminal_logic.clearDisactiveOrders') : false
}
terminal_logic.createOrderToSellResource = function (resourceType) {
    if (resourceType == RESOURCE_BIOMASS) { return }
    const amountToSell = 5000
    const myOrders = Game.market.orders
    const order = _.find(myOrders, o => o.resourceType == resourceType && o.type == ORDER_SELL && o.remainingAmount > 0)
    if (!order) {
        //get avg price
        const avgPrice = terminal_logic.getAvgPriceOfResource(resourceType)
        const price = avgPrice * 0.8
        // get room with more reserve of current resource
        const roomsWithTerminal = cache.myRooms.filter(myRoom => myRoom.terminal)
        const roomsWithTerminalCount = roomsWithTerminal.length
        const resources = {}
        if (roomsWithTerminalCount) {
            roomsWithTerminal.forEach(myRoom => {
                const terminal = myRoom.terminal
                const storage = myRoom.storage
                if (!storage) { return }
                resources[myRoom.name] = { roomName: myRoom.name, amount: (terminal.store[resourceType] + storage.store[resourceType]) }
            })
        }
        const resourcesArray = Object.values(resources)
        resourcesArray.sort((a, b) => b.amount - a.amount)
        let choosenRoom
        if (resourcesArray.length) {
            choosenRoom = resourcesArray[0].roomName
        }
        if (choosenRoom) {
            let res = Game.market.createOrder({ type: ORDER_SELL, price: price, resourceType: resourceType, totalAmount: amountToSell, roomName: choosenRoom })
            if (res == OK) { console.log('create task to sell ' + resourceType + ' for room ' + choosenRoom + ' price: ' + (price)); }
        }
    }
}
terminal_logic.sendResourceToAlly = function (resourceType) {
    const cpu = settings.writePerformanceLog ? Game.cpu.getUsed() : 0
    const amountToSend = 3000
    const sendToRoom = 'E31S34'
    // get room with more reserve of current resource
    const roomsWithTerminal = cache.myRooms.filter(myRoom, myRoom.terminal)
    let amount = 0
    roomsWithTerminal.forEach(myRoom => {
        const res = myRoom.terminal.send(resourceType, amountToSend, sendToRoom)
        if (res == OK) {
            myRoom.registerSheduledTask('update storage terminal')
            memoryManager.addToUpdateList(resourceType)
            amount += amountToSend
        }
    })
    if (amount) { console.log('sending ' + resourceType + ' amount: ' + amount + ' to room: ' + sendToRoom) }

    settings.writePerformanceLog ? performance.newLog(cpu, 'terminal_logic.sendResourceToAlly') : false
}
terminal_logic.getAvgPriceOfResource = function (resourceType) {
    if (!Memory.lastPriceOfResource) { Memory.lastPriceOfResource = {} }
    if (!Memory.lastPriceOfResource[resourceType]) {
        const price = getPrice()
        Memory.lastPriceOfResource[resourceType] = { time: gameTime, price: price }
        return price
    }
    else {
        if (gameTime - 1000 > Memory.lastPriceOfResource[resourceType].time) {
            const price = getPrice()
            Memory.lastPriceOfResource[resourceType] = { time: gameTime, price: price }
            return price
        }
        else {
            return Memory.lastPriceOfResource[resourceType].price
        }
    }

    function getPrice() {
        const historyOfResource = Game.market.getHistory(resourceType); //historyOfResource.reverse()
        if (historyOfResource.length) {
            return (historyOfResource.map(h => h.avgPrice).reduce((a, b) => a + b, 0)) / historyOfResource.length
            // return historyOfResource.slice(-1)[0].avgPrice
        }
        else { console.log(`empty historyOfResource when getPrice`); }
    }
}
terminal_logic.internalExchange = function (resource = false) {
    const cpu = settings.writePerformanceLog ? Game.cpu.getUsed() : 0
    const debug = settings.debug.internalExchange; let debugText = ''
    cache.terminals.ordersList_stat = cache.terminals.ordersList_stat || {}
    if (debug) { debugText += 'internalExchange' + (resource ? ` resource: ${resource}` : ' all resources') + '\n' }
    if (Game.cpu.bucket < settings.bucket.terminals_internalExchange) { return }
    if (each1000) { cache.terminals.ordersList = [] }//; console.log('clearing internal exchange order list...') }

    cache.terminals.ordersList.filter(order => !roomsOfAlliance.includes(order.receiver.name)).forEach(order => cache.terminals.ordersList.cut(order))
    const roomsWithTerminal = cache.myRooms.filter(myRoom => myRoom.terminal && !Memory.roomsToUnclaim.includes(myRoom.name) && myRoom.terminal.my && !myRoom.halted)
    const multiplier = getMultiplierByCountOfRoom(roomsWithTerminal.length)
    if (debug) { debugText += `roomsWithTerminal (${roomsWithTerminal.length}): ${roomsWithTerminal.map(mr => mr.name)}\n` }
    let typeOfResources = []
    if (resource) {
        typeOfResources.push(resource);
        cache.terminals.ordersList.filter(o => o.resourceType == resource).forEach(o => cache.terminals.cut(o))
        cache.terminals.ordersList_stat[resource] = gameTime
    }
    else { typeOfResources = resourcesTier1.concat(resourcesTier2, resourcesTier3, resourcesTier4, resourcesTier5, resourcesBar, basicCommodities, hightCommodities1, hightCommodities2, hightCommodities3, hightCommodities4) }

    //const minimumLevel8 = Math.min(...cache.myRooms.map(mr => mr.level)) == 8, 
    const banOnEnergyExchange = settings.terminals.banOnEnergyExchange, minEnergy = settings.terminals.minimumStock['energy'] / 2, maxEnergy = settings.terminals.maximumStock['energy']
    // if (minimumLevel == 8 && settings.terminals.banOnEnergyExchange) { typeOfResources.cut('energy') }
    typeOfResources.forEach(resourceType => {
        if (cache.terminals.ordersList_stat[resourceType] && cache.terminals.ordersList_stat[resourceType] == gameTime) return
        let sumOfResource = 0; const itsEnergy = (resourceType == 'energy')
        roomsWithTerminal.forEach(myRoom => { sumOfResource += ((myRoom.resources[resourceType]) ? myRoom.resources[resourceType] : 0) })
        if (sumOfResource == 0) {
            if (debug) { debugText += `resouceType: ${resourceType}, sumOfResource: ${sumOfResource}\n` }
            return
        }
        const mean = Math.floor(sumOfResource / roomsWithTerminal.length)
        if (debug) { debugText += `resouceType: ${resourceType}, sumOfResource: ${sumOfResource}, mean: ${mean}\n` }
        const roomsWithLessResource = _.filter(roomsWithTerminal, myRoom => (myRoom.resources[resourceType] * multiplier) < mean || !myRoom.resources[resourceType])
        if (debug) { debugText += `roomsWithLessResource (${roomsWithLessResource.length}): ${roomsWithLessResource.map(r => r.name)}\n` }
        if (!roomsWithLessResource.length) { return }
        roomsWithLessResource.sort((a, b) => a.resources[resourceType] - b.resources[resourceType])
        const roomsWithMoreResource = _.filter(roomsWithTerminal, myRoom => myRoom.resources[resourceType] > mean)
        roomsWithMoreResource.sort((a, b) => b.resources[resourceType] - a.resources[resourceType])
        if (debug) { debugText += `roomsWithMoreResource (${roomsWithMoreResource.length}): ${roomsWithMoreResource.map(r => r.name)} \n` }
        roomsWithMoreResource.forEach(myRoom_more => {
            let amountInRoom = myRoom_more.resources[resourceType] - (mean * multiplier)
            if (debug) { debugText += `myRoom_more: ${myRoom_more.name}, myRoom_more.resources[resourceType]: ${myRoom_more.resources[resourceType]}, amountInRoom: ${amountInRoom} (mean * multiplier: ${mean * multiplier})\n` }
            for (const myRoom_less of roomsWithLessResource) {
                if (amountInRoom <= 0) {
                    if (debug) { debugText += `   myRoom_less: ${myRoom_less.name}, amountInRoom: ${amountInRoom}\n` }
                    break
                }
                if (banOnEnergyExchange && itsEnergy && (myRoom_more.resources.energy < maxEnergy && myRoom_less.structures.factory && myRoom_less.resources['energy'] > minEnergy)) { continue }
                const amountInOrders = cache.terminals.ordersList.filter(order => order.receiver == myRoom_less && order.resourceType == resourceType).map(order => order.amount).reduce((a, b) => a + b, 0)
                const needToReceive = mean - amountInOrders - (myRoom_less.resources[resourceType] ? myRoom_less.resources[resourceType] : 0)
                if (needToReceive <= 0 || (!myRoom_less.structures.spawns.length && resourceType !== 'energy')) { continue }
                let amount = (amountInRoom > needToReceive) ? needToReceive : amountInRoom
                if (itsEnergy) {
                    const distance = tools.getDistanceForRooms(myRoom_more.name, myRoom_less.name)
                    const energyUsed = Math.ceil(amount * (1 - Math.exp(-distance / 30)))
                    amount = amount - energyUsed
                }
                amount = Math.ceil(amount)
                amountInRoom -= amount
                if (amount <= 0) { if (debug) { debugText += `dont create order becouse amount: ${amount}` } }
                else if (amount > 0) {
                    if (debug) { debugText += `create order: ${myRoom_more.name} => ${myRoom_less.name}, amount: ${amount}\n` }
                    cache.terminals.ordersList.push({ sender: myRoom_more, receiver: myRoom_less, resourceType: resourceType, amount: amount, time: gameTime })
                }
            }
        })
    })

    const factorys = idToObj(cache.myRooms.filter(myRoom => myRoom.structures.factory).map(myRoom => myRoom.structures.factory))
    const factory5lvl = factorys.find(f => f.level == 5)
    if (factory5lvl) {
        hightCommodities5.forEach(resourceType => {
            const roomName = factory5lvl.room.name
            roomsWithTerminal.filter(mr => mr.name !== roomName).forEach(myRoom => {
                const amount = myRoom.terminal.store[resourceType]
                if (amount) {
                    const newOrder = { sender: myRoom, receiver: { name: roomName, resources: {} }, resourceType: resourceType, amount: amount, time: gameTime }; newOrder.receiver.resources[resourceType] = 10000; cache.terminals.ordersList.push(newOrder)
                }
            })
        })
    }

    //clear unclaim rooms
    Memory.roomsToUnclaim.forEach(name => {
        const myRoom = myRooms[name]
        if (!myRoom) { Memory.roomsToUnclaim.cut(name); return }
        if (myRoom.terminal) {
            const terminal = myRoom.terminal
            if (Object.keys(terminal.store).length > 1 && myRoom.resources['energy'] < 30000) {
                cache.myRooms.filter(mr => mr.terminal && !Memory.roomsToUnclaim.includes(mr.name)).filter(mr => mr.terminal.my).forEach(mr => { const newOrder = { sender: mr, receiver: { name: myRoom.name, resources: {} }, resourceType: 'energy', amount: 1000, time: gameTime }; newOrder.receiver.resources['energy'] = 1000; cache.terminals.ordersList.push(newOrder) })
            }

            // const nearestRoomName = tools.findNearestRoom({ roomName: name, minimumLevel: 6, excludeRoom: true })
            const terminals = cache.myRooms.filter(myRoom => myRoom.terminal && !Memory.roomsToUnclaim.includes(myRoom.name)).filter(myRoom => myRoom.terminal.my).map(myRoom => myRoom.terminal).filter(terminal => terminal.store.getFreeCapacity())
            if (terminals.length) {
                terminals.sort((a, b) => b.store.getFreeCapacity() - a.store.getFreeCapacity())

                const targetRoom = myRooms[terminals[0].room.name]
                if (targetRoom) {
                    const resources = Object.keys(terminal.store).filter(resourceType => resourceType !== 'energy')
                    resources.forEach(resourceType => {
                        cache.terminals.ordersList.push({ sender: myRoom, receiver: targetRoom, resourceType: resourceType, amount: terminal.store[resourceType], time: gameTime })
                    })
                    if (resources.length === 0) {
                        cache.terminals.ordersList.push({ sender: myRoom, receiver: targetRoom, resourceType: 'energy', amount: terminal.store['energy'], time: gameTime })
                    }
                }
            }
        }
    })
    if (debug) { console.log(debugText) }
    function getMultiplierByCountOfRoom(countOfRooms) {
        if (countOfRooms < 5) { return 1.1 }
        else if (countOfRooms < 10) { return 1.05 }
        else if (countOfRooms < 15) { return 1.03 }
        else if (countOfRooms < 20) { return 1.02 }
        else if (countOfRooms < 25) { return 1.01 }
        else { return 1.015 }
    }
    settings.writePerformanceLog ? performance.newLog(cpu, 'terminal_logic.internalExchange') : false
}
terminal_logic.getHighPrice = function (resourceType, orderType) {
    const maxPrice = settings.terminals.maxPriceOfResources[resourceType] || 0
    const orders = Game.market.getAllOrders(order => order.amount > 0 && order.price < maxPrice && order.type == orderType && order.resourceType == resourceType)
    if (orders.length) {
        orders.sort((a, b) => b.price - a.price)
        return orders[0].price
    }
}
terminal_logic.sellResource = function (resourceType, lowPrice, debug = false) {
    const cpu = settings.writePerformanceLog ? Game.cpu.getUsed() : 0
    const terminals = []
    cache.myRooms.filter(myRoom => myRoom.terminal).forEach(myRoom => {
        if (!myRoom.terminal.cooldown && myRoom.terminal.store[RESOURCE_ENERGY] > 1000 && myRoom.terminal.store[resourceType] >= 1) {
            terminals.push({ room: myRoom.name, amount: myRoom.terminal.store[resourceType], energy: myRoom.terminal.store[RESOURCE_ENERGY] })
        }
    })
    if (terminals.length) {
        terminals.sort((a, b) => b.energy - a.energy)
        const orders = Game.market.getAllOrders(order => order.amount > 0 && order.price >= lowPrice && order.type == ORDER_BUY && order.resourceType == resourceType)// && (order.roomName.match('.0.0') || order.roomName.match('..0..0') || order.roomName.match('..0.0') || order.roomName.match('.0..0')))
        if (orders.length) {
            orders.sort((a, b) => b.price - a.price)
            let amount = (orders[0].amount > terminals[0].amount) ? terminals[0].amount : orders[0].amount
            const distance = tools.getDistanceForRooms(terminals[0].room, orders[0].roomName)
            const maxAmount = Math.floor(terminals[0].energy / (1 - Math.exp(-distance / 30)))
            amount = (amount <= maxAmount) ? amount : maxAmount
            const res = Game.market.deal(orders[0].id, amount, terminals[0].room)
            if (debug) console.log(`amount: ${amount}, res: ${res}`)
            if (res == OK) {
                myRooms[terminals[0].room].registerSheduledTask('update storage terminal')
                memoryManager.addToUpdateList(res)
                //Game.notify(tools.numberWithSpaces(gameTime) + ' sell ' + orders[0].resourceType + ' amount: ' + amount + ' price: ' + orders[0].price + ' credits: ' + amount * orders[0].price + `, credits: ${tools.numberWithSpaces(Game.market.credits)}`);
                cache.terminals.busyAtCurrentTick.push(terminals[0].room)
                console.log(colorful('sell id: ' + orders[0].id + ' res:' + orders[0].resourceType + ' amount: ' + amount + ' price: ' + orders[0].price + ' credits: ' + amount * orders[0].price + `, credits: ${tools.numberWithSpaces(Game.market.credits)}`, 'green'))
            }
            else { console.log(`error to sell a ${resourceType}, result: ${res} order:`, orders[0].id, ' amount:', amount, ' room:', terminals[0].room); }
        }
        else if (debug) { console.log('no orders to buy') }
    }
    else if (debug) { console.log('no terminals ready') }
    settings.writePerformanceLog ? performance.newLog(cpu, 'terminal_logic.sellResource') : false
}
MyRoom.prototype.transferByOrders = function () {
    const cpu = settings.writePerformanceLog ? Game.cpu.getUsed() : 0
    if (Game.cpu.bucket < settings.bucket.terminals_transferByOrders) { return }
    if (!this.terminal) { return }
    if (this.terminal.cooldown) { return }
    if (cache.terminals.busyAtCurrentTick.includes(this.name)) { return }
    const debug = this.settings.debug.terminals || settings.debug.internalExchange; let debugText = `${roomLink(this.name)} - debug transferByOrders\n`

    const orders = cache.terminals.ordersList.filter(order => order.sender == this).sort((a, b) => a.receiver.resources[a.resourceType] - b.receiver.resources[a.resourceType])
    if (debug) { debugText += `orders.length:${orders.length} ` }
    if (!orders.length) { if (debug) { console.log(debugText) }; return }
    for (const order of orders) {
        if (order.amount <= 0) {
            if (debug) { debugText += `spliced order: ${roomLink(order.sender.name)}, receiver: ${roomLink(order.receiver.name)}, resource: ${order.resourceType}, amount: ${order.amount}\n` }
            cache.terminals.ordersList.cut(order); continue
        }
        let amountInTerminal = this.terminal.store[order.resourceType]
        if (debug) { debugText += `amountInTerminal:${amountInTerminal}, order.resourceType:${order.resourceType}\n` }
        if (!amountInTerminal) { continue }
        let amount
        const distance = tools.getDistanceForRooms(order.receiver.name, order.sender.name)
        if (order.resourceType == RESOURCE_ENERGY) {
            const maxAmount = Math.floor(amountInTerminal * (Math.exp(-distance / 30)))
            if (order.amount > maxAmount) { amount = maxAmount } else { amount = order.amount }
        }
        else {
            const maxAmount = Math.floor(this.terminal.store[RESOURCE_ENERGY] / (1 - Math.exp(-distance / 30)))
            amount = (amountInTerminal > order.amount) ? order.amount : amountInTerminal
            amount = (amount > maxAmount) ? maxAmount : amount
        }
        if (amount < order.amount && amount < 100) {
            if (debug) { debugText += `amount < order.amount && amount < 100: ${amount < order.amount} && ${amount < 100}; continue...\n` }
            continue
        }
        const energyUsed = Math.ceil(amount * (1 - Math.exp(-distance / 30)))
        const result = this.terminal.send(order.resourceType, amount, order.receiver.name)

        if (result == OK) {
            memoryManager.addToUpdateList(order.resourceType)
            this.registerSheduledTask('update storage terminal')
            cache.terminals.operationsCounter += 1
            cache.terminals.energyUsedForInternalExchange += energyUsed
            if (debug) {
                debugText += `${cache.terminals.operationsCounter} >>> order (sender: ${roomLink(order.sender.name)}, receiver: ${roomLink(order.receiver.name)}, resource: ${order.resourceType}, amount: ${order.amount}), sending amount:${amount} ( sender amount: ${order.sender.resources[order.resourceType] - amount} , receiver amount: ${order.receiver.resources[order.resourceType] + amount}, energyUsed:${energyUsed}, total:${cache.terminals.energyUsedForInternalExchange} [${cache.terminals.ordersList.length}])`
            }
            if (amount == order.amount) { cache.terminals.ordersList.cut(order) }
            else { order.amount -= amount; order.time = gameTime }
            break
        }
    }
    if (debug) { console.log(debugText) }
    settings.writePerformanceLog ? performance.newLog(cpu, 'terminal_logic.transferByOrders') : false
}
terminal_logic.sellCommidiates = function (resourceType, lowPrice, username = false) {
    const cpu = settings.writePerformanceLog ? Game.cpu.getUsed() : 0
    const terminals = []
    cache.myRooms.filter(myRoom => myRoom.terminal && !myRoom.terminal.cooldown && myRoom.terminal.store[resourceType]
        && !cache.terminals.busyAtCurrentTick.includes(myRoom.name) && myRoom.terminal.store[RESOURCE_ENERGY] > 1000).forEach(myRoom => {
            terminals.push({ room: myRoom.name, amount: myRoom.terminal.store[resourceType], energy: myRoom.terminal.store[RESOURCE_ENERGY] })
        })
    if (!terminals.length) return
    terminals.sort((a, b) => b.amount - a.amount)
    let orders
    if (username) {
        let rooms = []
        if (username == 'hackgpp' || username == 'OneWayIsWar' || username == 'agyacska' || username == 'champion') { rooms = roomList[username] }
        else { roomList['hackgpp'].concat(roomList['OneWayIsWar'], roomList['agyacska'], roomList['champion']) }
        orders = Game.market.getAllOrders(order => order.amount > 0 && order.price >= lowPrice && order.type == ORDER_BUY && order.resourceType == resourceType && rooms.includes(order.roomName))
    }
    else { orders = Game.market.getAllOrders(order => order.amount > 0 && order.price >= lowPrice && order.type == ORDER_BUY && order.resourceType == resourceType) }// && (order.roomName.match('.0.0') || order.roomName.match('..0..0') || order.roomName.match('..0.0') || order.roomName.match('.0..0')))

    let resForReturn
    orders.sort((a, b) => b.price - a.price)
    for (const order of orders) {
        for (const terminal of terminals) {
            let amount = (order.amount > terminal.amount) ? terminal.amount : order.amount
            const distance = tools.getDistanceForRooms(terminal.room, order.roomName)
            const maxAmount = Math.floor(terminal.energy / (1 - Math.exp(-distance / 30)))
            if (maxAmount < amount) { amount = maxAmount }
            const result = Game.market.deal(order.id, amount, terminal.room)
            //console.log(`Game.market.deal('${order.id}', ${amount}, '${terminal.room}') = ${res}`);
            if (result == OK) {
                resForReturn = true
                myRooms[terminal.room].registerSheduledTask('update storage terminal')
                memoryManager.addToUpdateList(order.resourceType)
                cache.terminals.busyAtCurrentTick.push(terminal.room)
                Game.notify(tools.numberWithSpaces(gameTime) + ' sell ' + order.resourceType + ' amount: ' + amount + ' price: ' + order.price + ' credits: ' + amount * order.price + `, credits: ${tools.numberWithSpaces(Game.market.credits)}`);
                console.log(colorful(terminal.room + ': sell ' + order.resourceType + ' amount: ' + amount + ' price: ' + order.price + ' credits: ' + amount * order.price + `, credits: ${tools.numberWithSpaces(Game.market.credits)}`, 'green'));
                order.amount -= amount
                terminals.cut(terminal)
                if (order.amount <= 0) { break }
            }
        }
    }
    if (resForReturn) return true

    settings.writePerformanceLog ? performance.newLog(cpu, 'terminal_logic.sellCommidiates') : false
}
terminal_logic.calculateProfit = function (count = 1) {
    const avgPrice = {}
    const resources = ['energy', 'L', 'K', 'X', 'O', 'U', 'Z', 'H', 'biomass']
    const compressingResources = [RESOURCE_UTRIUM_BAR, RESOURCE_LEMERGIUM_BAR, RESOURCE_ZYNTHIUM_BAR, RESOURCE_KEANIUM_BAR, RESOURCE_GHODIUM_MELT,
        RESOURCE_OXIDANT, RESOURCE_REDUCTANT, RESOURCE_PURIFIER, RESOURCE_BATTERY, RESOURCE_COMPOSITE, RESOURCE_CRYSTAL, RESOURCE_LIQUID]
    resources.forEach(resourceType => avgPrice[resourceType] = terminal_logic.getAvgPriceOfResource(resourceType))
    const commodities2 = ['biomass', 'cell', 'phlegm', 'tissue', 'muscle', 'organoid', 'organism']
    avgPrice[RESOURCE_UTRIUM_BAR] = ((500 * avgPrice['U']) + (200 * avgPrice['energy'])) / 100
    avgPrice[RESOURCE_LEMERGIUM_BAR] = ((500 * avgPrice['L']) + (200 * avgPrice['energy'])) / 100
    avgPrice[RESOURCE_ZYNTHIUM_BAR] = ((500 * avgPrice['Z']) + (200 * avgPrice['energy'])) / 100
    avgPrice[RESOURCE_KEANIUM_BAR] = ((500 * avgPrice['K']) + (200 * avgPrice['energy'])) / 100
    avgPrice[RESOURCE_OXIDANT] = ((500 * avgPrice['O']) + (200 * avgPrice['energy'])) / 100
    avgPrice[RESOURCE_REDUCTANT] = ((500 * avgPrice['H']) + (200 * avgPrice['energy'])) / 100
    avgPrice[RESOURCE_PURIFIER] = ((500 * avgPrice['X']) + (200 * avgPrice['energy'])) / 100
    avgPrice['ZK'] = ((5 * avgPrice['Z']) + (5 * avgPrice['K'])) / 5
    avgPrice['UL'] = ((5 * avgPrice['U']) + (5 * avgPrice['L'])) / 5
    avgPrice['G'] = ((5 * avgPrice['ZK']) + (5 * avgPrice['UL'])) / 5
    avgPrice[RESOURCE_GHODIUM_MELT] = ((500 * avgPrice['G']) + (200 * avgPrice['energy'])) / 100
    avgPrice[RESOURCE_LIQUID] = ((12 * avgPrice[RESOURCE_OXIDANT]) + (12 * avgPrice[RESOURCE_REDUCTANT]) + (12 * avgPrice[RESOURCE_GHODIUM_MELT]) + (90 * avgPrice['energy'])) / 12
    avgPrice['biomass'] = 0
    avgPrice['cell'] = ((20 * avgPrice[RESOURCE_LEMERGIUM_BAR]) + (100 * avgPrice['biomass']) + (40 * avgPrice['energy'])) / 20
    avgPrice['phlegm'] = ((20 * avgPrice['cell']) + (36 * avgPrice[RESOURCE_OXIDANT]) + (16 * avgPrice[RESOURCE_LEMERGIUM_BAR]) + (8 * avgPrice['energy'])) / 2
    avgPrice['tissue'] = ((10 * avgPrice['phlegm']) + (10 * avgPrice['cell']) + (110 * avgPrice[RESOURCE_REDUCTANT]) + (16 * avgPrice['energy'])) / 2
    avgPrice['muscle'] = (3 * avgPrice['tissue']) + (3 * avgPrice['phlegm']) + (50 * avgPrice[RESOURCE_ZYNTHIUM_BAR]) + (50 * avgPrice[RESOURCE_REDUCTANT]) + (16 * avgPrice['energy'])
    avgPrice['organoid'] = avgPrice['muscle'] + (5 * avgPrice['tissue']) + (208 * avgPrice[RESOURCE_PURIFIER]) + (256 * avgPrice[RESOURCE_OXIDANT]) + (32 * avgPrice['energy'])
    avgPrice['organism'] = avgPrice['organoid'] + (150 * avgPrice[RESOURCE_LIQUID]) + (6 * avgPrice['tissue']) + (310 * avgPrice['cell']) + (64 * avgPrice['energy'])
    let msg = ''
    // Object.keys(avgPrice).forEach(key => msg += `${key}\t${tools.numberWithSpaces(Number(avgPrice[key].toFixed(2)))}\t(${tools.numberWithSpaces(terminal_logic.getAvgPriceOfResource(key))})\n`)
    msg += `biomass: ${tools.numberWithSpaces((count / 0.2) * avgPrice['biomass'])}\n `
    msg += `cell: ${tools.numberWithSpaces(count * avgPrice['cell'])} - ${tools.numberWithSpaces(terminal_logic.getAvgPriceOfResource('cell') * count)}\n `
    msg += `phlegm: ${tools.numberWithSpaces((count / 10) * avgPrice['phlegm'])} - ${tools.numberWithSpaces(terminal_logic.getAvgPriceOfResource('phlegm') * count / 10)}\n `
    msg += `tissue: ${tools.numberWithSpaces((count / 55) * avgPrice['tissue'])} - ${tools.numberWithSpaces(terminal_logic.getAvgPriceOfResource('tissue') * count / 55)}\n `
    msg += `muscle: ${tools.numberWithSpaces((count / 195) * avgPrice['muscle'])} - ${tools.numberWithSpaces(terminal_logic.getAvgPriceOfResource('muscle') * count / 195)}\n `
    msg += `organoid: ${tools.numberWithSpaces((count / 470) * avgPrice['organoid'])}\n `
    msg += `organism: ${tools.numberWithSpaces((count / 1110) * avgPrice['organism'])}\n `


    return msg
}
MyRoom.prototype.buyOrSellResources = function () {
    const cpu = settings.writePerformanceLog ? Game.cpu.getUsed() : 0, minS = settings.terminals.minimumStock, maxS = settings.terminals.maximumStock
    if (!this.terminal) { return }
    if (Memory.roomsToUnclaim.includes(this.name)) { return }
    const resources = resourcesTier1.concat(resourcesBar)
    const myOrders = cache.market.orders = cache.market.orders || Game.market.orders
    resources.forEach(resourceType => {
        const min = minS[resourceType] || minS.default, max = maxS[resourceType] || maxS.default

        if (this.resources[resourceType] < min) {
            if (settings.terminals.resourcesToBuy[resourceType] === true) {
                terminal_logic.createOrderToBuyResource(this.name, resourceType)
            }
        }
        else if (this.resources[resourceType] > max * 0.75 && !_.find(myOrders, mo => mo.resourceType == resourceType && mo.type == ORDER_BUY)) {
            if (cache.terminals.busyAtCurrentTick.includes(this.name)) { return }
            const orders = Game.market.getAllOrders(order => order.amount > 0 && order.type == ORDER_BUY && order.resourceType == resourceType && cache.roomsOfAlly.includes(order.roomName)).sort((a, b) => a.created - b.created)
            if (this.settings.debug.terminal) { console.log(this.name, 'orders length:', orders.length) }
            orders.sort((a, b) => a.created - b.created)
            for (const order of orders) {
                let amount = (order.amount > this.terminal.store[resourceType]) ? this.terminal.store[resourceType] : order.amount
                if (amount > (max - min) / 2) { amount = (max - min) / 2 }
                const distance = tools.getDistanceForRooms(this.name, order.roomName)
                const maxAmount = Math.floor(this.terminal.store['energy'] / (1 - Math.exp(-distance / 30)))
                if (maxAmount < amount) { amount = maxAmount }
                const result = Game.market.deal(order.id, amount, this.name)
                if (this.settings.debug.terminal) { console.log(this.name, 'resourceType:', resourceType, 'distance:', distance, 'amount:', amount, 'maxAmount:', maxAmount, 'order:', JSON.stringify(order), 'result:', result) }
                if (result == OK) {
                    this.registerSheduledTask('update storage terminal')
                    memoryManager.addToUpdateList(order.resourceType)
                    cache.terminals.busyAtCurrentTick.push(this.name)
                    // if (this.settings.debug.terminal) { console.log(this.name + ': sell ' + order.resourceType + ' amount: ' + amount + ' price: ' + order.price + ' credits: ' + amount * order.price + `, credits: ${tools.numberWithSpaces(Game.market.credits)}`) }

                    let usernameOfOrder
                    for (const name of Object.keys(roomList)) {
                        if (roomList[name].includes(order.roomName)) { usernameOfOrder = name; break }
                    }
                    console.log(colorful(`${roomLink(this.name)}: sell to ${usernameOfOrder} - ${order.resourceType} amount: ${amount} for price: ${order.price}, credits: ${amount * order.price}, credits: ${tools.numberWithSpaces(Game.market.credits)}`, 'green'))
                    break
                }
            }
        }
        else if (this.resources[resourceType] > max * 1.25) {
            _.filter(Game.market.orders, o => o.type == 'buy' && o.resourceType == resourceType).map(o => o.id).forEach(id => Game.market.cancelOrder(id))
            const res2 = tools.getResToCompressOrDecompress(resourceType)
            if (res2) _.filter(Game.market.orders, o => o.type == 'buy' && o.resourceType == res2).map(o => o.id).forEach(id => Game.market.cancelOrder(id))
        }
    })
    settings.writePerformanceLog ? performance.newLog(cpu, 'MyRoom.prototype.buyResources') : false
}
MyRoom.prototype.buyByOthersOrders = function (specifications) {
    if (Game.cpu.bucket < settings.bucket.terminals_buyByOthersOrders) { return }
    if (!this.terminal || !specifications) { return }
    if (this.terminal.store[RESOURCE_ENERGY] == 0) { return }
    const debug = settings.debug.terminals; let debugText = `buyByOthersOrders: ${specifications.resourceType}`
    const cpu = settings.writePerformanceLog ? Game.cpu.getUsed() : 0
    const energyPrice = terminal_logic.getAvgPriceOfResource(RESOURCE_ENERGY); if (debug) debugText += `, energyPrice: ${energyPrice}`
    const resourceType = specifications.resourceType; if (!specifications.resourceType) return
    const amount = (specifications.amount) ? specifications.amount : Infinity, myBuyPrice = (specifications.price) ? specifications.price : terminal_logic.getAvgPriceOfResource(resourceType)

    cache.market.odersByResourceType = cache.market.odersByResourceType || {}
    if (!cache.market.odersByResourceType[resourceType]) { cache.market.odersByResourceType[resourceType] = Game.market.getAllOrders({ type: ORDER_SELL, resourceType: resourceType }) }
    const allOrders = cache.market.odersByResourceType[resourceType].slice()
    const energyInTerminal = this.terminal.store.energy; if (debug) debugText += `, energyInTerminal: ${energyInTerminal}\n`
    allOrders.forEach(order => {
        order.distance = tools.getDistanceForRooms(this.name, order.roomName)
        const orderAmount = order.remainingAmount
        order.energyCost = 1 - Math.exp(-order.distance / 30)
        const weCanBuyAmount = Math.floor(energyInTerminal / order.energyCost)
        order.remainingAmount = (weCanBuyAmount > orderAmount) ? orderAmount : weCanBuyAmount
        order.totalPrice = order.price + (energyPrice * order.energyCost)
    })
    if (debug) debugText += `< details > ${JSON.stringify(allOrders, 0, 3)}!</details >\n`
    const orders = allOrders.filter(order => order.totalPrice < myBuyPrice)
    orders.sort((a, b) => a.totalPrice - b.totalPrice)
    if (debug) debugText += `orders: <details>${JSON.stringify(orders, 0, 3)}!</details>\n`
    for (let order of orders) {
        let buyAmount = Math.min(amount, order.remainingAmount)
        if (buyAmount > 0) {
            const transactionCost = order.energyCost * buyAmount
            const returnCode = Game.market.deal(order.id, buyAmount, this.name)
            if (returnCode === OK) {
                this.registerSheduledTask('update storage terminal')
                memoryManager.addToUpdateList(order.resourceType)
                console.log(colorful(`BUY: ${order.resourceType}, id: ${order.id}, from: ${order.roomName} => ${this.name}, amount: ${buyAmount}, price: ${order.price}, totalPrice: ${order.totalPrice}, transactionCost: ${transactionCost}, distance: ${order.distance}`, 'green'))
                break
            } else if (returnCode == ERR_TIRED || returnCode == ERR_FULL) { break }
            else { console.log(`Game.market.deal('${order.id}', ${buyAmount}, '${this.name}') = ${returnCode}`) }
        }
    }
    if (debug) console.log(`buyByOthersOrders in room: ${this.name} \n ${debugText}`)
    settings.writePerformanceLog ? performance.newLog(cpu, 'Room.prototype.buyByOthersOrders') : false;
}
terminal_logic.buyResources = function (resourcesToBuy = ['U', 'O', 'H', 'K', 'L', 'Z', 'X'], force = false) {
    if (Game.cpu.bucket < settings.bucket.terminals_buyByOthersOrders && !force) { return }
    const cpu = settings.writePerformanceLog ? Game.cpu.getUsed() : 0
    const minS = settings.terminals.minimumStock
    resourcesToBuy.sort((a, b) => cache.resources[a] - cache.resources[b])
    resourcesToBuy.forEach(resourceType => {
        if (!settings.frequency.buyResources[resourceType]) { settings.frequency.buyResources[resourceType] = { frequency: 100, tick: 0 } }
        if (!force && gameTime % settings.frequency.buyResources[resourceType].frequency !== settings.frequency.buyResources[resourceType].tick) { return }
        const min = minS[resourceType] || minS.default//, max = maxS[resourceType] || maxS.default

        if (cache.resources[resourceType] < min * cache.countOfMyRoomsWithTerminals) {
            if (settings.terminals.resourcesToBuy[resourceType] === true) {
                const avgPrice = terminal_logic.getAvgPriceOfResource(resourceType)
                const maxPriceOfResources = settings.terminals.maxPriceOfResources[resourceType] || avgPrice * 1.25
                terminal_logic.buyByOthersOrders({ resourceType: resourceType, price: maxPriceOfResources })
            }
        }
    })
    settings.writePerformanceLog ? performance.newLog(cpu, 'terminal_logic.buyResources') : false;
}
terminal_logic.buyByOthersOrders = function (specifications) {
    if (Game.cpu.bucket < settings.bucket.terminals_buyByOthersOrders) { return }

    const debug = settings.debug.terminals; let debugText = `buyByOthersOrders: ${specifications.resourceType}`

    const energyPrice = terminal_logic.getAvgPriceOfResource(RESOURCE_ENERGY); if (debug) debugText += `, energyPrice: ${energyPrice}\n`
    const resourceType = specifications.resourceType; if (!specifications.resourceType) return
    let amount = (specifications.amount) ? specifications.amount : Infinity, done = false
    const myBuyPrice = (specifications.price) ? specifications.price : terminal_logic.getAvgPriceOfResource(resourceType)

    const terminalRooms = cache.myRooms.filter(mr => mr.terminal && !mr.terminal.cooldown && !cache.terminals.busyAtCurrentTick.includes(mr.name) && mr.status !== 'halted')
    const terminalRoomsName = terminalRooms.map(mr => mr.name)

    cache.market.odersByResourceType = cache.market.odersByResourceType || {}
    if (!cache.market.odersByResourceType[resourceType]) { cache.market.odersByResourceType[resourceType] = Game.market.getAllOrders(order => order.type == ORDER_SELL && order.resourceType == resourceType && order.remainingAmount) }
    const allOrders = cache.market.odersByResourceType[resourceType].filter(order => order.price <= myBuyPrice).slice()
    // this.terminal.store.energy; if (debug) debugText += `, energyInTerminal: ${ energyInTerminal }\n`
    function Order(order, name) {
        this.id = order.id; this.orderRoom = order.roomName; this.roomName = name; this.distance = tools.getDistanceForRooms(name, order.roomName);
        this.energyCost = 1 - Math.exp(-this.distance / 30)
        this.weCanBuyAmount = Math.floor(myRooms[name].terminal.store[RESOURCE_ENERGY] / this.energyCost)
        this.price = order.price; this.totalPrice = order.price + (energyPrice * this.energyCost)
        this.remainingAmount = order.remainingAmount
    }
    const orders = []
    allOrders.forEach(order => {
        terminalRoomsName.forEach(name => orders.push(new Order(order, name)))
    })
    // if (debug) debugText += `allOrders: <details>${JSON.stringify(allOrders, 0, 3)}</details>\n`
    orders.sort((a, b) => a.totalPrice - b.totalPrice); if (debug) debugText += `orders length: ${orders.length}\n`
    const ordersAmount = {}
    for (let order of orders) {
        if (!terminalRoomsName.length) { if (debug) debugText += `no terminals\n`; break }
        if (!ordersAmount[order.id]) { ordersAmount[order.id] = { remainingAmount: order.remainingAmount } }
        order.remainingAmount = ordersAmount[order.id].remainingAmount
        // if (debug) debugText += `order: ${ JSON.stringify(order) }\n`
        // if (debug) debugText += `amount: ${ amount }, order.remainingAmount: ${ order.remainingAmount }\n`
        if (amount > 0 && order.remainingAmount > 0) {
            if (!terminalRoomsName.includes(order.roomName)) { if (debug) debugText += `${order.roomName} is busy\n`; continue }
            let buyAmount = Math.min(amount, ordersAmount[order.id].remainingAmount, order.weCanBuyAmount)
            if (debug) debugText += `buyAmount: ${buyAmount}\n`
            if (buyAmount <= 0) { break }
            const transactionCost = order.energyCost * buyAmount
            const returnCode = Game.market.deal(order.id, buyAmount, order.roomName)
            // if (debug) debugText += `returnCode: ${ returnCode }\n`
            if (returnCode === OK) {
                myRooms[order.roomName].registerSheduledTask('update storage terminal')
                memoryManager.addToUpdateList(resourceType)
                cache.terminals.busyAtCurrentTick.push(order.roomName)
                ordersAmount[order.id].remainingAmount -= buyAmount
                amount -= buyAmount; terminalRoomsName.cut(order.roomName)
                console.log(`BUY: ${resourceType}, id: ${order.id}, from: ${roomLink(order.orderRoom)
                    } => ${roomLink(order.roomName)}, amount:${buyAmount}, price:${order.price}, totalPrice:${order.totalPrice}, transactionCost:${transactionCost}, distance:${order.distance} `)
            }
            else if (returnCode == ERR_TIRED || returnCode == ERR_FULL) { }
            else { console.log(`Game.market.deal('${order.id}', ${buyAmount}, '${order.roomName}') = ${returnCode} `) }
        }
    }
    // if (debug) debugText += `ordersAmount: <details>${JSON.stringify(ordersAmount, 0, 3)}</details>\n`
    // if (debug) console.log(`buyByOthersOrders by all rooms: \n ${ debugText } `)
    if (!settings.frequency.buyResources[resourceType]) { settings.frequency.buyResources[resourceType] = { frequency: 100, tick: 0 } }
    if (done) { settings.frequency.buyResources[resourceType].frequency = 10 }
    else if (settings.frequency.buyResources[resourceType].frequency == 10) { settings.frequency.buyResources[resourceType].frequency = 100 }
    else if (settings.frequency.buyResources[resourceType].frequency == 100) { settings.frequency.buyResources[resourceType].frequency = 1000 }
}

