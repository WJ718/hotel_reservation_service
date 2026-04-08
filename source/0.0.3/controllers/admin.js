const {Reservation, Payment, Productschedule, Product, Room, User} = require('../models');
const passport = require('passport');
const jwt = require('jsonwebtoken');

exports.renderAdmin = (req, res) => {
    return res.render('admin/login');
};

exports.loginAdmin = (req, res, next) => {
  passport.authenticate('local', { session: false }, (authError, user, info) => {
    if (authError) {
      console.error(authError);
      return next(authError);
    }

    if (!user) {
      return res.status(401).json({ message: info.message });
    }

    if (user.role !== 'ADMIN') {
      return res.status(403).json({ message: '관리자 계정이 아닙니다.' });
    }

    const token = jwt.sign(
      {
        id: user.id,
        name: user.name,
        role: user.role
      },
      process.env.JWT_SECRET,
      { expiresIn: '2h' }
    );

    res.cookie('jwt', token, {
      httpOnly: true,
      secure: false,
      maxAge: 2 * 60 * 60 * 1000
    });

    return res.render('admin/dashboard', {user});
  })(req, res, next);
};


exports.adminReservations = async (req, res, next) => {
    try {
        const { status } = req.query;

        const where = {};
        if (status) {
            where.status = status;
        }

        const reservations = await Reservation.findAll({
            where,
            include: [
                { model: User },
                { model: Room, attributes: ['id', 'title'] },
                { model: Product, attributes: ['id', 'title'] },
                { model: Payment, attributes: ['orderId', 'amount', 'status'] }
            ],
            order: [['createdAt', 'DESC']]
        });

        return res.render('admin/reservations', {
            user: req.user,
            reservations,
            selectedStatus: status || 'ALL'
        });
    } catch (err) {
        next(err);
    }
};

exports.adminPayments = async (req, res, next) => {
    try {
        const { status } = req.query;

        const where = {};
        if (status) {
            where.status = status;
        }

        const payments = await Payment.findAll({
            where,
            include: [
                { model: User},
                { model: Reservation, attributes: ['id', 'status', 'checkin', 'checkout'] }
            ],
            order: [['createdAt', 'DESC']]
        });

        return res.render('admin/payments', {
            user: req.user,
            payments,
            selectedStatus: status || 'ALL'
        });
    } catch (err) {
        next(err);
    }
};

exports.adminInventory = async (req, res, next) => {
    try {
        const schedules = await Productschedule.findAll({
            include: [{
                model: Room,
                attributes: ['title'],
                include: [{
                    model: Product,
                    attributes: ['title']
                }]
            }],
            order: [['date', 'ASC']]
        });

        return res.render('admin/inventory', {
            user: req.user,
            schedules
        });
    } catch (err) {
        next(err);
    }
};
