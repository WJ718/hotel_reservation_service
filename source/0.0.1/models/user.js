const Sequelize = require('sequelize');

class User extends Sequelize.Model {
    static init(sequelize) {
        return super.init({
            id: {
                type: Sequelize.STRING(100),
                allowNull: false,
                unique: true,
                primaryKey: true,
            },
            password: {
                type: Sequelize.STRING(200),
                allowNull: false
            },
            name: {
                type: Sequelize.STRING(50),
                defaultValue: '사용자',
                allowNull: false
            }
        }, {
            sequelize,
            timestamps: true,
            modelName: 'User',
            tableName: 'users',
            charset: 'utf8mb4',
            collate: 'utf8mb4_general_ci'
        });
    }

    static associate(db) {
        db.User.hasMany(db.Reservation, {foreignKey: 'userId', targetKey: 'id'});
        db.User.hasMany(db.Payment, {foreignKey: 'userId', targetKey: 'id'});
    }
}

module.exports = User;