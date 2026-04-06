const passport = require('passport');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');
const User = require('../models/user');

exports.renderLogin = (req,res,next) => {
  try {
    return res.render('login');
  } catch(err) {
    console.error(err);
    next(err);
  }
}

// post /login
exports.login = (req, res, next) => {
  passport.authenticate('local', { session: false }, (authError, user, info) => {
    // 에러처리
    if (authError) {
      console.error(authError);
      return next(authError);
    }
    if (!user) {
      return res.status(401).json({ message: info.message });
    }

    // 로그인 인증 성공
    const token = jwt.sign(
      { 
        id: user.id, 
        name: user.name 
      }, 
      process.env.JWT_SECRET, 
      { expiresIn: '2h' }
    );  

    res.cookie('jwt', token, {
        httpOnly: true,
        secure: false,
        maxAge: 2 * 60 * 60 * 1000
    });

    return res.redirect('/');

  })(req, res, next);
};

// get /join
exports.renderJoin = (req,res,next) => {
  try {
    return res.render('join');
  } catch(err) {
    console.error(err);
    next(err);
  }
}

// post /join
exports.join = async(req,res,next) => {
    try {
        const {id, password} = req.body;
        const exUser = await User.findOne({where: {id}});

        if(exUser) {
            return res.status(401).json({
                message: '이미 존재하는 사용자입니다.'
            });
        }

        // DB저장
        const hash = await bcrypt.hash(password, 12);
        const newUser = await User.create({
            id,
            password: hash
        });

        const token = jwt.sign(
          { 
              id: newUser.id, 
              name: newUser.name 
          }, 
          process.env.JWT_SECRET, 
          { expiresIn: '2h' }
        );  

        res.cookie('jwt', token, {
          httpOnly: true,
          secure: false,
        });
        
        return res.redirect('/');
    } catch(err) {
        next(err);
    }
}

// get /logout
exports.logout = (req,res,next) => {
  try {
    res.clearCookie('jwt');
    res.redirect('/');
  } catch(err) {
    next(err);
  }
}