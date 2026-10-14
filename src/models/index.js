const sequelize = require('../config/database');
const User = require('./User');
const Company = require('./Company');
const Job = require('./Job');
const Application = require('./Application');
const Notification = require('./Notification');
const Message = require('./Message');
const SavedJob = require('./SavedJob');

User.hasMany(Application, { foreignKey: { name: 'user_id', allowNull: false }, onDelete: 'CASCADE' });
Application.belongsTo(User, { foreignKey: 'user_id' });
Job.hasMany(Application, { foreignKey: { name: 'job_id', allowNull: false }, onDelete: 'CASCADE' });
Application.belongsTo(Job, { foreignKey: 'job_id' });

Company.hasMany(Job, { foreignKey: { name: 'company_id', allowNull: true }, onDelete: 'SET NULL' });
Job.belongsTo(Company, { foreignKey: 'company_id' });

User.hasMany(Notification, { foreignKey: 'user_id', onDelete: 'CASCADE' });
Notification.belongsTo(User, { foreignKey: 'user_id' });
Company.hasMany(Notification, { foreignKey: 'company_id', onDelete: 'CASCADE' });
Notification.belongsTo(Company, { foreignKey: 'company_id' });

User.hasMany(SavedJob, { foreignKey: 'user_id', onDelete: 'CASCADE' });
SavedJob.belongsTo(User, { foreignKey: 'user_id' });
Job.hasMany(SavedJob, { foreignKey: 'job_id', onDelete: 'CASCADE' });
SavedJob.belongsTo(Job, { foreignKey: 'job_id' });

Job.hasMany(Message, { foreignKey: 'job_id', onDelete: 'SET NULL' });
Message.belongsTo(Job, { foreignKey: 'job_id' });

module.exports = { sequelize, User, Company, Job, Application, Notification, Message, SavedJob };
