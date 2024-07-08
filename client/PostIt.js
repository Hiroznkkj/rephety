const { DataTypes } = require('sequelize');
const sequelize = require('./database');

const PostIt = sequelize.define('PostIt', {
    content: {
        type: DataTypes.STRING,
        allowNull: false
    },
    x: {
        type: DataTypes.FLOAT,
        allowNull: false
    },
    y: {
        type: DataTypes.FLOAT,
        allowNull: false
    }
});

module.exports = PostIt;
