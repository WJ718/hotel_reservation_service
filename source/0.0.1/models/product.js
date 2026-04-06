const Sequelize = require('sequelize');

class Product extends Sequelize.Model {
    static init(sequelize) {
        return super.init({
            type: {
                type: Sequelize.ENUM('INTERNATIONAL', 'DOMESTIC'),
                allowNull: false,
            },
            title: {
                type: Sequelize.STRING(50),
                allowNull: false
            },
            location: {
                type: Sequelize.STRING(100),
                allowNull: false
            },
            maxCapacity: {
                type: Sequelize.INTEGER,
                allowNull: false
            }
        }, {
            sequelize,
            timestamps: true,
            modelName: 'Product',
            tableName: 'products',
            charset: 'utf8mb4',
            collate: 'utf8mb4_general_ci'
        });
    }

    static associate(db) {
        db.Product.hasMany(db.Room, { foreignKey: 'productId', sourceKey: 'id' })
        db.Product.hasMany(db.Reservation, { foreignKey: 'productId', sourceKey: 'id' })
    }
}

module.exports = Product;
