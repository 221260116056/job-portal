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
  resume_data: { type: DataTypes.JSONB, allowNull: true, defaultValue: {} },
  is_suspended: { type: DataTypes.BOOLEAN, defaultValue: false, allowNull: false },
  google_id: { type: DataTypes.STRING(255), allowNull: true },
  linkedin_id: { type: DataTypes.STRING(255), allowNull: true },
  avatar_url: { type: DataTypes.STRING(500), allowNull: true },
  auth_provider: { type: DataTypes.STRING(50), defaultValue: 'local', allowNull: false }
}, { tableName: 'users', underscored: true, defaultScope: { attributes: { exclude: ['password'] } } });

module.exports = User;
