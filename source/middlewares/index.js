const jwt = require('jsonwebtoken');
const passport = require('passport');

// jwt 검증
exports.verifyToken = (req,res,next) => {
    passport.authenticate('jwt', {session: false}, (err, user, info) => {
        if(err || !user) {
            res.clearCookie('jwt');
            return res.redirect('/auth/login');
        }
        
        req.user = user;
        next();
    }) (req,res,next);
}

// 토큰 유무 판별
exports.checkToken = (req,res,next) => {
    const token = req.cookies.jwt;
    
    if (token) {
        try {
            // 토큰이 있으면 검증해서 req.user에 담아줌
            req.user = jwt.verify(token, process.env.JWT_SECRET);
        } catch (err) {
            // 토큰이 만료됐으면 그냥 무시 (로그인 안 한 상태로 간주)
            req.user = null;
        }
    } else {
        req.user = null;
    }
    next(); 
}

