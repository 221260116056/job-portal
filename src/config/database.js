const { Sequelize } = require('sequelize');

if (!process.env.DATABASE_URL) throw new Error('DATABASE_URL is required');

const sequelize = new Sequelize(process.env.DATABASE_URL, {
  dialect: 'postgres',
  logging: process.env.NODE_ENV === 'development' ? false : false,
  dialectOptions: process.env.NODE_ENV === 'production' ? { ssl: { require: true, rejectUnauthorized: false } } : {}
});

module.exports = sequelize;
