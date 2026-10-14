const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

module.exports = sequelize.define('Application', {
  id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  status: { type: DataTypes.ENUM('Applied', 'Under Review', 'Shortlisted', 'Rejected'), allowNull: false, defaultValue: 'Applied' },
  applied_at: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
  resume_url: { type: DataTypes.STRING(500), allowNull: true },
  resume_type: { type: DataTypes.STRING(50), allowNull: true, defaultValue: 'hireflow' },
  note: { type: DataTypes.TEXT, allowNull: true }
}, { tableName: 'applications', underscored: true, indexes: [{ unique: true, fields: ['user_id', 'job_id'] }] });
