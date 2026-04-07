const { getDatesBetween } = require('../utils/date');
const { sequelize, Reservation, Productschedule, Product, Room, Payment } = require('../models');
const { Op } = require('sequelize');

// 가예약 생성
exports.createPendingReservation = async (userId, body) => {
    const { hotelId, roomId, checkin, checkout, guestCount, amount, orderId, title } = body;
    const t = await sequelize.transaction();

    try {
        const hotel = await Product.findByPk(hotelId);
        if (!hotel) {
            throw new Error('존재하지 않는 호텔입니다.');
        }

        if (guestCount > hotel.maxCapacity) {
            throw new Error('저희 호텔의 최대 숙박 가능 인원이 모두 찼습니다. 죄송합니다.');
        }

        const room = await Room.findByPk(roomId);
        if (!room) {
            throw new Error('존재하지 않는 객실입니다.');
        }

        if (Number(guestCount) > room.maxCapacity) {
            throw new Error(`죄송합니다. 이 객실의 최대 수용 인원은 ${room.maxCapacity}명입니다.`);
        }

        const dates = getDatesBetween(checkin, checkout);

        if (!dates.length) {
            throw new Error('숙박 날짜가 올바르지 않습니다.');
        }

        // 재고 선점
        for (const date of dates) {
            const [affectedRows] = await Productschedule.update(
                { remainingRooms: sequelize.literal('remainingRooms - 1') },
                {
                    where: {
                        roomId,
                        date,
                        remainingRooms: { [Op.gt]: 0 }
                    },
                    transaction: t
                }
            );

            if (affectedRows === 0) {
                throw new Error(`${date} 날짜의 잔여 객실이 마감되었습니다.`);
            }
        }

        // 예약 생성 (PENDING)
        const reservation = await Reservation.create({
            userId,
            productId: hotelId,
            roomId,
            guestCount,
            checkin,
            checkout,
            reservationDate: new Date(),
            status: 'PENDING'
        }, { transaction: t });

        // 결제 생성 (READY)
        const payment = await Payment.create({
            orderId,
            amount,
            userId,
            reservationId: reservation.id,
            title,
            status: 'READY'
        }, { transaction: t });

        await t.commit();

        return { reservation, payment };
    } catch (err) {
        await t.rollback();
        throw err;
    }
};

// 결제 성공 확정
exports.confirmReservationPayment = async ({ orderId, paymentKey, amount }) => {
    const t = await sequelize.transaction();

    try {
        // 결제정보 조회
        const payment = await Payment.findOne({
            where: { orderId },
            include: [{ model: Reservation }],
            transaction: t,
            lock: t.LOCK.UPDATE
        });

        if (!payment) {
            throw new Error('결제 정보를 찾을 수 없습니다.');
        }

        if (!payment.Reservation) {
            throw new Error('예약 정보가 존재하지 않습니다.');
        }

        // 결제 상태 확인
        if (payment.status === 'DONE') {
            await t.commit();
            return {
                payment,
                reservation: payment.Reservation,
                alreadyDone: true
            };
        }

        if (payment.status !== 'READY') {
            throw new Error('결제를 확정할 수 없는 상태입니다.');
        }

        if (Number(amount) !== payment.amount) {
            throw new Error('결제 금액이 일치하지 않습니다.');
        }

        // 결제DB 업데이트 ('READY' -> 'DONE')
        await payment.update(
            {
                paymentKey,
                status: 'DONE'
            },
            { transaction: t }
        );

        // 예약DB 업데이트 ('PENDING' -> 'CONFIRMED')
        await payment.Reservation.update(
            {
                status: 'CONFIRMED'
            },
            { transaction: t }
        );

        await t.commit();

        return {
            payment,
            reservation: payment.Reservation,
            alreadyDone: false
        };
    } catch (err) {
        await t.rollback();
        throw err;
    }
};

// 결제 실패  / 뒤로가기
exports.failPendingReservation = async ({ 
    orderId, paymentStatus = 'FAILED',
    reservationStatus = 'FAILED'
 }) => {
    const t = await sequelize.transaction();

    try {
        // 결제 정보 조회
        const payment = await Payment.findOne({
            where: { orderId },
            include: [{ model: Reservation }],
            transaction: t,
            lock: t.LOCK.UPDATE
        });

        if (!payment || !payment.Reservation) {
            await t.commit();
            return { skipped: true, reason: 'NOT_FOUND' };
        }

        // 이미 성공한 예약은 처리하지 않음
        if (payment.status === 'DONE' || payment.Reservation.status === 'CONFIRMED') {
            await t.commit();
            return { skipped: true, reason: 'ALREADY_CONFIRMED' };
        }

        // 중복 복구 방지
        if (payment.status === 'FAILED' && payment.Reservation.status === 'FAILED') {
            await t.commit();
            return { skipped: true, reason: 'ALREADY_FAILED' };
        }

        const { roomId, checkin, checkout } = payment.Reservation;

        // 가예약 시 차감한 잔고 복구
        const dates = await exports.restoreInventory(roomId, checkin, checkout, t);

        // DB 업데이트 
        await payment.update(
            { status: paymentStatus },
            { transaction: t }
        );

        await payment.Reservation.update(
            { status: reservationStatus },
            { transaction: t }
        );

        await t.commit();

        // skipped - 작업을 하지 않았을때 True
        return {
            skipped: false,
            roomId,
            dates,
            orderId
        };
    } catch (err) {
        await t.rollback();
        throw err;
    }
};

// 실시간 재고 브로드캐스트
exports.broadcastInventory = async (io, roomId, dates) => {
    try {
        for (const date of dates) {
            const schedule = await Productschedule.findOne({
                where: { roomId, date }
            });

            if (schedule) {
                const roomName = `room_${roomId}_${date}`;
                io.to(roomName).emit('inventory_update', {
                    date,
                    remainRooms: schedule.remainingRooms
                });
            }
        }
    } catch (err) {
        console.error('브로드캐스트 에러 발생 : ', err);
    }
};

// 재고 복구 (결제 실패 / 예약 취소 시 호출)
exports.restoreInventory = async (roomId, checkin, checkout, transaction = null, restoreCount = 1) => {
    const dates = getDatesBetween(checkin, checkout);

    for (const date of dates) {
        await Productschedule.update(
            {
                remainingRooms: sequelize.literal(`remainingRooms + ${restoreCount}`)
            },
            {
                where: { roomId, date },
                transaction
            }
        );
    }

    return dates;
};
