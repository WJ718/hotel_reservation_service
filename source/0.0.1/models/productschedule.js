const Sequelize = require('sequelize');

class Productschedule extends Sequelize.Model {
    static init(sequelize) {
            return super.init({
                date: {
                    type: Sequelize.DATEONLY,
                    allowNull: false,
                },
                remainingRooms: {
                    type: Sequelize.INTEGER,
                    allowNull:false
                }
            }, {
                sequelize,
                timestamps: true,
                modelName: 'Productschedule',
                tableName: 'productschedules',
                charset: 'utf8mb4',
                collate: 'utf8mb4_general_ci'
            });
        }
    
        static associate(db) {
            db.Productschedule.belongsTo(db.Room, { foreignKey: 'roomId', targetKey: 'id' });
        }
}

module.exports = Productschedule;