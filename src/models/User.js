const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const User = sequelize.define('User', {
  id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  name: { type: DataTypes.STRING(120), allowNull: false },
  email: { type: DataTypes.STRING(255), allowNull: false, unique: true, validate: { isEmail: true } },
  password: { type: DataTypes.STRING, allowNull: false },
  resume_url: { type: DataTypes.STRING(500), allowNull: true },
  skills: { type: DataTypes.JSONB, allowNull: true, defaultValue: [] },
  resume_text: { type: DataTypes.TEXT, allowNull: true },
  is_suspended: { type: DataTypes.BOOLEAN, defaultValue: false, allowNull: false }
}, { tableName: 'users', underscored: true, defaultScope: { attributes: { exclude: ['password'] } } });

module.exports = User;
