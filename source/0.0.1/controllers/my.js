const {User, Reservation, Room, Payment, Product} = require('../models');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');
const axios = require('axios');
const crypto = require('crypto');

exports.updateUser = async (req, res, next) => {
    try {   
        const {name, password} = req.body;
        const userId = req.user.id;

        const updateData = {name};
        if(password && password.trim() !== '') {
            const hash = await bcrypt.hash(password, 12);
            updateData.password = hash;
        }

        await User.update(updateData, {
            where: {id: userId}
        });

        const token = jwt.sign(
            { 
              id: userId,
              name: updateData.name
            }, 
            process.env.JWT_SECRET, 
            { expiresIn: '2h' }
        )
        
        res.cookie('jwt', token, {
          httpOnly: true,
          secure: false,
        });

        return res.redirect('/myPage');
    } catch(err) {
        console.error(err);
        next(err);
    }
}

// 모든 예약 내역 확인
exports.renderBooking = async (req, res, next) => {
    const userId = req.user.id;
    try {
        const reservationData = await Reservation.findAll({
            where: { userId: userId },
            include: [
                { model: Room },
                { model: Product },
                { model: Payment }
            ],
            order: [['createdAt', 'DESC']]
        });

        return res.render('myBookings', { 
            user: req.user, 
            res: reservationData
        });
    } catch (err) {
        console.error(err);
        next(err);
    }
}

exports.checkBook = async(req,res,next) => {
    const reservationId = req.params.id;
    try {
        const reservation = await Reservation.findOne({
            where: {id : reservationId},
            include: [
                {model: Product}, 
                {model: Room},
            ]
        });

        const payment = await Payment.findOne({
            where: {reservationId}
        });

        return res.render('checkBooking', {reservation, payment});
    } catch(err) {
        console.error(err);
        next(err);
    }
}


exports.refundBooking = async (req,res,next) => {
    const {id} = req.params 
    const { cancelReason } = req.body; 
    const idempotencyKey = crypto.randomUUID();
    const token = Buffer.from(process.env.SECRET_KEY + ':').toString('base64');
    const authHeader = `Basic ${token}`;

    try {  
        const reservation = await Reservation.findOne({
            where: {id},
            include: [{model: Payment}],
        });

        if (!reservation || !reservation.Payment) {
            console.log('결제 내역 찾을 수 없음')
            return res.status(404).json({ success: false, message: '결제 내역을 찾을 수 없습니다.' });
        }

        const paymentKey = reservation.Payment.paymentKey;
        const response = await axios.post(
            `https://api.tosspayments.com/v1/payments/${paymentKey}/cancel`,
            { cancelReason: cancelReason || '고객 요청 취소' },
            {
                headers: {
                    'Authorization': authHeader,
                    'Content-Type': 'application/json',
                    'Idempotency-Key': idempotencyKey
                }
            }
        );

        if (response.data.status === 'CANCELED') {
            await reservation.update({ status: 'CANCELLED' });
            await reservation.Payment.update({ status: 'REFUNDED' });

            return res.json({ success: true, message: '환불이 완료되었습니다.' });
        }
    } catch(err) {
        console.error(err);
        next(err);
    }
}