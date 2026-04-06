const Sequelize = require('sequelize');

class Payment extends Sequelize.Model {
    static init(sequelize) {
        return super.init({
            orderId: { 
                type: Sequelize.STRING,
                allowNull: false, 
                unique: true 
            },
            paymentKey: { 
                type: Sequelize.STRING,
                allowNull: true
            },
            amount: { 
                type: Sequelize.INTEGER,
                allowNull: false
            },
            title: { 
                type: Sequelize.STRING,
                allowNull: false,
            },
            status: { 
                // 대기 - 처리 - 환불 - 실패
                type: Sequelize.ENUM('READY', 'DONE', 'REFUNDED', 'FAILED'),
                defaultValue: 'READY'
            },
        }, {
            sequelize,
            timestamps: true,
            modelName: 'Payment',
            tableName: 'payments',
            charset: 'utf8mb4',
            collate: 'utf8mb4_general_ci'
        });
    }

    static associate(db) {
        db.Payment.belongsTo(db.Reservation, { foreignKey: 'reservationId', targetKey: 'id' });
        db.Payment.belongsTo(db.User, {foreignKey: 'userId', targetKey: 'id'});
    }
}

module.exports = Payment;