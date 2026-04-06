const Sequelize = require('sequelize');

class Room extends Sequelize.Model {
    static init(sequelize) {
        return super.init({
            title: {
                type: Sequelize.STRING(50),
                allowNull: false,
            },
            price: {
                type: Sequelize.INTEGER,
                allowNull: false,
            },
            totalRooms: {
                type: Sequelize.INTEGER,
                allowNull: false,
                defaultValue: 10,
            },
            maxCapacity: {
                type: Sequelize.INTEGER,
                allowNull: false,
                defaultValue: 2
            }
        }, {
            sequelize,
            timestamps: true,
            modelName: 'Room',
            tableName: 'rooms',
            charset: 'utf8mb4',
            collate: 'utf8mb4_general_ci'
        });
    }

    static associate(db) {
        db.Room.belongsTo(db.Product, { foreignKey: 'productId', targetKey: 'id' });
        db.Room.hasMany(db.Reservation, { foreignKey: 'roomId', sourceKey: 'id' });
        db.Room.hasMany(db.Productschedule, { foreignKey: 'roomId', sourceKey: 'id' });
    }
}

module.exports = Room;