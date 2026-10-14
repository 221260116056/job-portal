const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Notification = sequelize.define('Notification', {
  id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  user_id: { type: DataTypes.UUID, allowNull: true },
  company_id: { type: DataTypes.UUID, allowNull: true },
  title: { type: DataTypes.STRING(200), allowNull: false },
  message: { type: DataTypes.TEXT, allowNull: false },
  type: { type: DataTypes.STRING(50), allowNull: false, defaultValue: 'info' },
  link: { type: DataTypes.STRING(255), allowNull: true },
  is_read: { type: DataTypes.BOOLEAN, defaultValue: false }
}, {
  tableName: 'notifications',
  underscored: true
});

module.exports = Notification;
