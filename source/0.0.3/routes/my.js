const {updateUser, renderBooking, checkBook, refundBooking} = require('../controllers/my');
const {verifyToken, checkToken} = require('../middlewares');
const express = require('express');

const router = express.Router();

// 메인페이지
router.post('/update', verifyToken, updateUser); // 통과
router.get('/bookings', verifyToken, renderBooking); // 통과
router.get('/bookings/:id', verifyToken, checkBook); // 통과
router.post('/bookings/:id/refund', verifyToken, refundBooking)

module.exports = router;