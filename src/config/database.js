const { Sequelize } = require('sequelize');

if (!process.env.DATABASE_URL) throw new Error('DATABASE_URL is required');

const isProduction = process.env.NODE_ENV === 'production';
const isRemote = !process.env.DATABASE_URL.includes('localhost') && !process.env.DATABASE_URL.includes('127.0.0.1');

const sequelize = new Sequelize(process.env.DATABASE_URL, {
  dialect: 'postgres',
  logging: false,
  dialectOptions: (isProduction || isRemote)
    ? {
        ssl: {
          require: true,
          rejectUnauthorized: false
        }
      }
    : {}
});

module.exports = sequelize;
