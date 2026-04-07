const {renderMain, renderMyPage} = require('../controllers/index');
const {verifyToken, checkToken} = require('../middlewares');
const express = require('express');

const router = express.Router();

// 메인페이지
router.get('/', checkToken, renderMain);
router.get('/mypage', verifyToken, renderMyPage);

module.exports = router;