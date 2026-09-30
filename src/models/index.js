const sequelize = require('../config/database');
const User = require('./User');
const Job = require('./Job');
const Application = require('./Application');

User.hasMany(Application, { foreignKey: { name: 'user_id', allowNull: false }, onDelete: 'CASCADE' });
Application.belongsTo(User, { foreignKey: 'user_id' });
Job.hasMany(Application, { foreignKey: { name: 'job_id', allowNull: false }, onDelete: 'CASCADE' });
Application.belongsTo(Job, { foreignKey: 'job_id' });

module.exports = { sequelize, User, Job, Application };
