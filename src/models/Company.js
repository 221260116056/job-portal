const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Company = sequelize.define('Company', {
  id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  company_name: { type: DataTypes.STRING(180), allowNull: false },
  email: { type: DataTypes.STRING(255), allowNull: false, unique: true, validate: { isEmail: true } },
  password: { type: DataTypes.STRING, allowNull: false },
  location: { type: DataTypes.STRING(180), allowNull: false },
  website: { type: DataTypes.STRING(255), allowNull: true },
  is_suspended: { type: DataTypes.BOOLEAN, defaultValue: false, allowNull: false }
}, { tableName: 'companies', underscored: true, defaultScope: { attributes: { exclude: ['password'] } } });

module.exports = Company;
