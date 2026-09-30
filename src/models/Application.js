const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

module.exports = sequelize.define('Application', {
  id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  status: { type: DataTypes.ENUM('Applied', 'Under Review', 'Shortlisted', 'Rejected'), allowNull: false, defaultValue: 'Applied' },
  applied_at: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW }
}, { tableName: 'applications', underscored: true, indexes: [{ unique: true, fields: ['user_id', 'job_id'] }] });
