const { renderIntlHotel, renderDomHotel, renderHotelPage, renderRoomPage, renderPayment, renderSuccess, renderFail } = require('../controllers/reserve');
const { verifyToken } = require('../middlewares');
const express = require('express');

const router = express.Router();

router.get('/international', renderIntlHotel);
router.get('/domestic', renderDomHotel);

router.get('/hotel/:id', renderHotelPage); // 호텔 상세 페이지 통과
router.get('/room/:id', renderRoomPage); // 방 상세 페이지 통과

router.post('/payment', verifyToken, renderPayment); // 결제 페이지 통과

router.get("/success", verifyToken, renderSuccess); // 영수증 페이지 통과
router.get("/fail", verifyToken, renderFail);

module.exports = router;