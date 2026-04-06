const { Op } = require('sequelize');
const { Product, Room, Productschedule } = require('../models');
const { createPendingReservation, broadcastInventory, confirmReservationPayment,
    failPendingReservation } = require('../services/reserveService');
const { getDatesBetween } = require('../utils/date');

const { randomUUID } = require('crypto');
const axios = require('axios');

// 국외 호텔 리스트 페이지
exports.renderIntlHotel = async (req, res, next) => {
    const { query } = req.query;
    const whereOptions = { type: 'INTERNATIONAL' };

    try {
        if (query) {
            whereOptions[Op.or] = [
                { title: { [Op.like]: `%${query}%` } },
                { location: { [Op.like]: `%${query}%` } }
            ];
        }

        const hotels = await Product.findAll({
            where: whereOptions,
            order: [['createdAt', 'DESC']]
        });

        return res.render('intHotel', { user: req.user, hotels });
    } catch (err) {
        console.error(err);
        next(err);
    }
};

// 국내 호텔 리스트 페이지
exports.renderDomHotel = async (req, res, next) => {
    const { query } = req.query;
    const whereOptions = { type: 'DOMESTIC' };

    try {
        if (query) {
            whereOptions[Op.or] = [
                { title: { [Op.like]: `%${query}%` } },
                { location: { [Op.like]: `%${query}%` } }
            ];
        }

        const hotels = await Product.findAll({
            where: whereOptions,
            order: [['createdAt', 'DESC']]
        });

        return res.render('domHotel', { user: req.user, hotels });
    } catch (err) {
        console.error(err);
        next(err);
    }
};

// 객실 선택 페이지
exports.renderHotelPage = async (req, res, next) => {
    const hotelId = req.params.id;
    const user = req.user || null;

    try {
        const hotel = await Product.findOne({
            where: { id: hotelId },
            include: [
                {
                    model: Room,
                    include: [{ model: Productschedule }]
                }
            ]
        });

        if (!hotel) {
            return res.redirect('/intHotel');
        }

        return res.render('hotelPage', { user, hotel });
    } catch (err) {
        console.error(err);
        next(err);
    }
};

exports.renderRoomPage = async (req, res, next) => {
    const roomId = req.params.id;

    try {
        const room = await Room.findOne({
            where: { id: roomId },
            include: [{ model: Product }]
        });

        return res.render('room', { user: req.user, room });
    } catch (err) {
        console.error(err);
        next(err);
    }
};

exports.renderPayment = async (req, res, next) => {
    const { hotelId, roomId, checkin, checkout, guestCount } = req.body;
    const user = req.user;

    try {
        const dates = getDatesBetween(checkin, checkout);
        const nights = dates.length;

        if (nights <= 0) {
            return res.status(400).send('<script>alert("날짜를 다시 선택해주세요."); history.back();</script>');
        }

        const room = await Room.findByPk(roomId, { include: [Product] });

        if (!room || !room.Product) {
            throw new Error('유효하지 않은 객실입니다.');
        }

        const amount = room.price * nights;
        const orderId = 'TRIP-' + randomUUID();
        const title = `${room.Product.title} - ${room.title}`;

        // 가예약 생성, 결제상태 'PENDING'
        await createPendingReservation(user.id, {
            hotelId,
            roomId,
            checkin,
            checkout,
            guestCount,
            amount,
            orderId,
            title
        });

        const clientkey = process.env.CLIENT_KEY;

        // 토스먼츠 결제 페이지 이동
        return res.render('paymentPage', {
            hotel: room.Product,
            room,
            checkin,
            checkout,
            nights,
            user,
            clientkey,
            amount,
            guestCount,
            orderId
        });
    } catch (err) {
        console.error('가예약 생성 실패:', err);
        return res.status(400).send(`<script>alert("${err.message}"); history.back();</script>`);
    }
};

// 결제 성공 콜백
exports.renderSuccess = async (req, res, next) => {
    const { paymentKey, orderId, amount } = req.query;
    const secretKey = process.env.SECRET_KEY;

    try {
        const encryptedSecretKey =
            'Basic ' + Buffer.from(secretKey + ':').toString('base64');

        // 토스 승인 확인
        await axios.post(
            'https://api.tosspayments.com/v1/payments/confirm',
            { orderId, amount: Number(amount), paymentKey },
            {
                headers: {
                    Authorization: encryptedSecretKey,
                    'Content-Type': 'application/json'
                }
            }
        );

        // DB 결제/예약 확정 결제상태 PENDING -> DONE
        const result = await confirmReservationPayment({
            orderId,
            paymentKey,
            amount: Number(amount)
        });

        // 재고 브로드캐스트
        const { roomId, checkin, checkout, guestCount } = result.reservation;
        const dates = getDatesBetween(checkin, checkout);

        const io = req.app.get('io');
        await broadcastInventory(io, roomId, dates);

        // 결제 성공 페이지 렌더링
        return res.render('successPage', {
            info: {
                title: result.payment.title,
                amount: result.payment.amount,
                orderId: result.payment.orderId,
                guestCount
            }
        });
    } catch (err) {
        console.error('결제 처리 에러:', err.message);

        try {
            // 결제 실패 처리 (결제DB: READY -> FAILED  예약DB: PENDING -> FAILED)
            const result = await failPendingReservation({
                orderId,
                paymentStatus: 'FAILED',
                reservationStatus: 'FAILED'
            });

            if (!result.skipped) {
                const io = req.app.get('io');
                await broadcastInventory(io, result.roomId, result.dates);
            }
        } catch (restoreErr) {
            console.error('결제 실패 후 정리 에러:', restoreErr);
        }

        // 에러 확인 시 즉시 렌더링
        return res.status(400).render('fail', {
            code: 'PAYMENT_CONFIRM_FAILED',
            message: err.message || '결제 승인 처리 중 오류가 발생했습니다.'
        });
    }
};

exports.renderFail = async (req, res, next) => {
    const { code, message, orderId } = req.query;

    try {
        if (orderId) {
            const result = await failPendingReservation({
                orderId,
                paymentStatus: 'FAILED',
                reservationStatus: 'FAILED'
            });

            if (!result.skipped) {
                const io = req.app.get('io');
                await broadcastInventory(io, result.roomId, result.dates);
            }
        }

        return res.render('fail', {
            code: code || 'PAYMENT_FAILED',
            message: message || '결제가 완료되지 않았습니다.'
        });
    } catch (err) {
        console.error('실패 페이지 정리 에러:', err);

        return res.render('fail', {
            code: code || 'PAYMENT_FAILED',
            message: message || '결제가 완료되지 않았습니다.'
        });
    }
};