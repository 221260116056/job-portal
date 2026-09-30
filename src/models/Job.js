const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

module.exports = sequelize.define('Job', {
  id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  title: { type: DataTypes.STRING(180), allowNull: false },
  company: { type: DataTypes.STRING(180), allowNull: false },
  description: { type: DataTypes.TEXT, allowNull: false },
  location: { type: DataTypes.STRING(180), allowNull: false },
  employment_type: { type: DataTypes.STRING(80), allowNull: false },
  skills: { type: DataTypes.TEXT, allowNull: true }
}, { tableName: 'jobs', underscored: true });
