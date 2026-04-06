const passport = require('passport');
const { Strategy: JwtStrategy, ExtractJwt } = require('passport-jwt');
const {User} = require('../models');

const cookieExtractor = (req) => {
    let token = null;
    if (req && req.cookies) {
        token = req.cookies.jwt;
    }
    return token;
}

const opts = {
    jwtFromRequest: cookieExtractor,
    secretOrKey: process.env.JWT_SECRET
}

module.exports = () => {
    passport.use(new JwtStrategy(opts, async (jwt_payload, done) => {
        try {
            const user = await User.findOne({where: {id: jwt_payload.id}});

            if(user) {
                return done(null, user);
            } else {
                return done(null, false);
            }
        } catch(err) {
            console.error(err);
            return done(err, false);
        }
    }));
}