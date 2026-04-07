const {Payment, Reservation, Room, Product} = require('../models');
const { Op } = require('sequelize');


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
    const userId = req.user.id;
    try {
        const reservation =  await Reservation.findAll({
            where: { 
                userId: userId,
                status: {
                    [Op.in]: ['CONFIRMED', 'CANCELED'] 
                }
             },
            
            include: [
                { model: Room },
                { model: Product },
                { model: Payment }
            ],
            order: [['createdAt', 'DESC']]
        });

        return res.render('myPage', {user, reservation});
    } catch(err) {
        console.error(err);
        next(err);
    }
}