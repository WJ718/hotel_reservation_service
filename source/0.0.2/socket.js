const SocketIO = require('socket.io');
const { Productschedule } = require('./models');

module.exports = (server, app) => {
    const io = SocketIO(server, { path: '/socket.io' });
    app.set('io', io); 

    io.on('connection', (socket) => {
        socket.on('join_room', async ({ roomId, dates }) => {
            
            Array.from(socket.rooms).forEach((r) => {
                if(r !== socket.id && r.startsWith("room_")) {
                    socket.leave(r);
                }
            });

            const currentInventory = [];

            for (const date of dates) {
                const roomName = `room_${roomId}_${date}`;
                socket.join(roomName);

                const schedule = await Productschedule.findOne({
                    where: { roomId, date }
                });

                currentInventory.push({
                    date: date,
                    count: schedule ? schedule.remainingRooms : 0
                });
            }

            // this <--> room.ejs [:91]
            socket.emit('inventory_update', { remainRooms: currentInventory });
        });
    });
};