const {renderLogin, login, renderJoin, join, logout} = require('../controllers/auth');
const express = require('express');
const router = express.Router();

// 로그인
router.get('/login', renderLogin);
router.post('/login', login);

// 회원가입
router.get('/join', renderJoin);
router.post('/join', join);

// 로그아웃
router.get('/logout', logout)

module.exports = router;