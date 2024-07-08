const { Sequelize } = require('sequelize');

// Configuração do Sequelize
const sequelize = new Sequelize({
    dialect: 'sqlite',
    storage: 'database.sqlite'
});

module.exports = sequelize;
