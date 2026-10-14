const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Message = sequelize.define('Message', {
  id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  sender_type: { type: DataTypes.ENUM('candidate', 'company'), allowNull: false },
  sender_id: { type: DataTypes.UUID, allowNull: false },
  recipient_type: { type: DataTypes.ENUM('candidate', 'company'), allowNull: false },
  recipient_id: { type: DataTypes.UUID, allowNull: false },
  job_id: { type: DataTypes.UUID, allowNull: true },
  content: { type: DataTypes.TEXT, allowNull: false },
  is_read: { type: DataTypes.BOOLEAN, defaultValue: false }
}, {
  tableName: 'messages',
  underscored: true
});

module.exports = Message;
