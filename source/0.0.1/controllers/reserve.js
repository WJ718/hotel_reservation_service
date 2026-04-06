const { Op, where } = require('sequelize');
const {Product, Payment, Room, Productschedule} = require('../models');
const {broadcastInventory, createReservation} = require('../services/reserveService');
const {getDatesBetween} = require('../utils/date');

const axios = require('axios');

// 국외 호텔 리스트 페이지
exports.renderIntlHotel = async (req, res, next) => {
    const {query} = req.query;
    const whereOptions = {type: 'INTERNATIONAL'};
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
        
        return res.render('intHotel', {user: req.user, hotels});
    } catch(err) {
        console.error(err);
        next(err);
    }
}

// 국내 호텔 리스트 페이지
exports.renderDomHotel = async (req, res, next) => {
    const {query} = req.query;
    const whereOptions = {type: 'DOMESTIC'};
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
        
        return res.render('domHotel', {user: req.user, hotels});
    } catch(err) {
        console.error(err);
        next(err);
    }
}

// 객실 선택 페이지
exports.renderHotelPage = async (req, res, next) => {
    const hotelId = req.params.id;
    const user = req.user || null;

    try {
        const hotel = await Product.findOne({
            where: {id: hotelId},
            include: [{ 
                    model: Room,
                    include: [{model: Productschedule}]
                }]
        });
        
        if(!hotel) {
            return res.redirect('/intHotel');
        }

        return res.render('hotelPage', {user, hotel});
    } catch(err) {
        console.error(err);
        next(err);
    }
}

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
}

exports.renderPayment = async(req,res,next) => {
    const {hotelId, roomId, checkin, checkout, guestCount} = req.body;
    const user = req.user;
    try {
        const dates = getDatesBetween(checkin, checkout); 
        const nights = dates.length;

        if (nights <= 0) {
            return res.status(400).send('<script>alert("올바른 예약 날짜를 선택해주세요."); history.back();</script>');
        }

        const hotel = await Product.findOne({
            where: {id: hotelId}
        });

        if(!hotel) {
            return res.redirect(`/reserve/hotel/${hotelId}`);
        }

        const clientkey = process.env.CLIENT_KEY;
        
        const room = await Room.findByPk(roomId);
        const amount = room.price * nights;

        return res.render('paymentPage', {hotel, checkin, checkout, nights, user, clientkey, amount, room, guestCount });
    } catch(err) {
        console.error(err);
        next(err);
    }
}

exports.renderSuccess = async (req, res, next) => {
    const { 
        paymentKey, 
        orderId, 
        amount, 
        hotelId, 
        roomId,   
        checkin, 
        checkout, 
        guestCount,
    } = req.query;
    
    const secretKey = process.env.SECRET_KEY;    
    
    try {   
        const dates = getDatesBetween(checkin, checkout);
        const encryptedSecretKey = "Basic " + Buffer.from(secretKey + ":").toString("base64");

        // 결제 승인 요청 
        const response = await axios.post(
            "https://api.tosspayments.com/v1/payments/confirm", 
            {
                // 전송데이터
                orderId: orderId,
                amount: amount,
                paymentKey: paymentKey,
            },
            {   // 헤더
                headers: {
                    Authorization: encryptedSecretKey,
                    "Content-Type": "application/json",
                },
                responseType: "json"
            }
        );

        // 예약 DB 저장, 방 차감
        const { reservation } = await createReservation(req.user.id, { 
            hotelId, roomId, checkin, checkout, guestCount 
        });
        
        const reservationId = reservation.id;

        // 결제 정보 DB 저장
        const payment = await Payment.create({
            orderId: orderId,
            paymentKey: paymentKey,
            amount: amount,
            userId: req.user.id,
            reservationId,
            title: response.data.orderName,
            status: 'DONE'
        });

        // 결제 성공 시 재고 업데이트
        const io = req.app.get('io'); 
        await broadcastInventory(io, roomId, dates); 

        // 완료 화면 렌더링
        return res.render('successPage', { 
            info: {
                title: payment.title,
                amount: payment.amount,
                orderId: payment.orderId,
                guestCount: reservation.guestCount
            }
        });

    } catch(err) {
        console.error('결제 승인 및 DB 저장 실패:', err.response?.data || err.message);
        
        const errorData = err.response?.data || { message: '결제 승인 중 오류가 발생했습니다 : 원인 불명'};
        res.redirect(`/reserve/fail?message=${encodeURIComponent(errorData.message)}&code=${errorData.code}`);
    }
}

exports.renderFail = (req,res,next) => {
    const { code, message } = req.query;
    
    res.render('fail', {
        code: code || 'UNKNOWN_ERROR',
        message: message || '알 수 없는 오류가 발생했습니다.'
    });
}
