const Sequelize = require('sequelize');

class Reservation extends Sequelize.Model {
    static init(sequelize) {
        return super.init({
            reservationDate: {
                type: Sequelize.DATE,
                allowNull: false
            },
            guestCount: { // 인원수
                type: Sequelize.INTEGER,
                allowNull: false,
            },
            checkin: { // 고객이 머물기 시작하는 날
                type: Sequelize.DATEONLY,
                allowNull: false
            },
            checkout: { // 고객이 나가는 날
                type: Sequelize.DATEONLY,
                allowNull: false
            },
            status: {
                type: Sequelize.ENUM('CONFIRMED', 'CANCELLED'),
                allowNull: false,
                defaultValue: 'CONFIRMED'
            },
        }, {
            sequelize,
            timestamps: true,
            modelName: 'Reservation',
            tableName: 'reservations',
            charset: 'utf8mb4',
            collate: 'utf8mb4_general_ci'
        });
    }

    static associate(db) {
        db.Reservation.belongsTo(db.User, {foreignKey: 'userId', targetKey: 'id'});
        db.Reservation.belongsTo(db.Room, { foreignKey: 'roomId',  targetKey: 'id' });
        db.Reservation.belongsTo(db.Product, { foreignKey: 'productId', targetKey: 'id' });
        db.Reservation.hasOne(db.Payment, { foreignKey: 'reservationId', sourceKey: 'id' });
    }   
}

module.exports = Reservation;
