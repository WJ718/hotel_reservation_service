const express = require('express');
const session = require('express-session');
const path = require('path');
const cookieParser = require('cookie-parser');
const dotenv = require('dotenv'); 
dotenv.config();
const socket = require('./socket');
const {sequelize} = require('./models');


const indexRouter = require('./routes/index');
const authRouter = require('./routes/auth');
const reserveRouter = require('./routes/reserve');
const myRouter = require('./routes/my');

const passport = require('passport');
const passportConfig = require('./passport');

const app = express();
passportConfig();

app.use(express.json());
app.use(express.urlencoded({extended: false}));
app.use(express.static(path.join(__dirname, 'public')));
app.use(cookieParser(process.env.COOKIE_SECRET));

app.set('port', process.env.PORT || 3000);
app.set('view engine', 'ejs');

sequelize.sync({ force: false })
  .then(() => console.log('데이터베이스 연결 성공'))
  .catch((err) => console.error(err));

app.use(session({
    resave: false,
    saveUninitialized: false,
    secret: process.env.COOKIE_SECRET,
    cookie: {
        httpOnly: true,
        secure: false
    }
})); 
app.use(passport.initialize());
app.use(passport.session());

app.use('/', indexRouter);
app.use('/auth', authRouter);
app.use('/reserve', reserveRouter);
app.use('/my', myRouter);

app.use((req,res,next) => {
    const err = new Error(`${req.method} ${req.url} 라우터가 없습니다.`);
    err.status = 404;
    next(err);
});

app.use((err,req,res,next) => {
    res.locals.message = err.message;
    res.locals.error = process.env.NODE_ENV !== 'production' ? err : {};
    res.status(err.status || 500);
    res.render('error');
});

const server = app.listen(app.get('port'), () => {
    console.log(app.get('port'), '번 포트에서 대기 중');
});

socket(server,app);