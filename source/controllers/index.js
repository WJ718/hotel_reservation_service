const {Reservation, Room, Product} = require('../models');


// 메인페이지 렌더링
exports.renderMain = (req,res,next) => {
    const user = req.user;
    try {
        return res.render('main', {user});
    } catch(err) {
        console.error(err);
        next(err);
    }
}

// 내 정보 렌더링 - 수정필요
exports.renderMyPage = async (req,res,next) => {
    const user = req.user;
    try {
        const reservation = await Reservation.findAll({
            where: {userId: req.user.id},
            include: [{
                model: Room,
                order: [['createdAt', 'DESC']]
            }],
            order: [['createdAt', 'DESC']]
        });

        return res.render('myPage', {user, reservation});
    } catch(err) {
        console.error(err);
        next(err);
    }
}