const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const SavedJob = sequelize.define('SavedJob', {
  id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  user_id: { type: DataTypes.UUID, allowNull: false },
  job_id: { type: DataTypes.UUID, allowNull: false }
}, {
  tableName: 'saved_jobs',
  underscored: true,
  indexes: [{ unique: true, fields: ['user_id', 'job_id'] }]
});

module.exports = SavedJob;
