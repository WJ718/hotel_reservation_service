const { getDatesBetween } = require('../utils/date');
const {sequelize} = require('../models');
const {Reservation, Productschedule, Product, Room} = require('../models');
const { Op } = require('sequelize');

// 예약 생성 및 재고 차감
exports.createReservation = async (userId, body) => {
    const { hotelId, roomId, checkin, checkout, guestCount,  } = body;
    const t = await sequelize.transaction();

    try {
        // 호텔의 최대 수용 인원 확인
        const hotel = await Product.findByPk(hotelId);
        if (guestCount > hotel.maxCapacity) {
            throw new Error(`저희 호텔의 최대 숙박 가능 인원이 모두 찼습니다. 죄송합니다.`);
        }

        const room = Room.findByPk(roomId);
        if (!room) throw new Error("존재하지 않는 객실입니다.");

        if (Number(guestCount) > room.maxCapacity) {
            throw new Error(`죄송합니다. 이 객실의 최대 수용 인원은 ${room.maxCapacity}명입니다.`);
        }

        const dates = getDatesBetween(checkin, checkout);

        for (const date of dates) {
            const [result, affectedRows] = await Productschedule.decrement('remainingRooms', {
                by: 1,
                where: { 
                    roomId: roomId,
                    date: date,
                    remainingRooms: { [Op.gt]: 0 } },
                transaction: t
            });

            // console.log("Decrement Result : ", result);

            if (!result || result[1] === 0) 
                throw new Error(`${date} 날짜의 잔여 객실이 마감되었습니다.`);
        }

        const reservation = await Reservation.create({
            userId,
            productId: hotelId,
            roomId: roomId,
            guestCount: guestCount,
            checkin,
            checkout, 
            reservationDate: new Date()
        }, { transaction: t });

        await t.commit();
        return { reservation };
    } catch (err) {
        await t.rollback();
        throw err;
    }
}

// 3. 실시간 재고 브로드캐스트
exports.broadcastInventory = async (io, roomId, dates) => {
    try {
        for (const date of dates) {
            // 잔여 객실 확인
            const schedule = await Productschedule.findOne({
                where: { roomId: roomId, date: date }
            });

            if (schedule) {
                const roomName = `room_${roomId}_${date}`;
                // this <--> room.ejs
                io.to(roomName).emit('inventory_update', {
                    // data
                    date: date,
                    remainRooms: schedule.remainingRooms
                });
            }
        }
    } catch (err) {
        console.error('브로드캐스트 에러 발생 : ', err);
    }
}