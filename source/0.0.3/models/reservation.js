const Sequelize = require('sequelize');

class Reservation extends Sequelize.Model {
    static init(sequelize) {
        return super.init({
            reservationDate: {
                type: Sequelize.DATE,
                allowNull: false
            },
            guestCount: {
                type: Sequelize.INTEGER,
                allowNull: false,
            },
            checkin: { 
                type: Sequelize.DATEONLY,
                allowNull: false
            },
            checkout: {
                type: Sequelize.DATEONLY,
                allowNull: false
            },
            status: {
                // 대기 - 성공  - 실패 - 환불
                type: Sequelize.ENUM('PENDING', 'CONFIRMED', 'FAILED', 'CANCELED'),
                allowNull: false,
                defaultValue: 'PENDING'
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
