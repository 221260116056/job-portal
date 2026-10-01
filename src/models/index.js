const sequelize = require('../config/database');
const User = require('./User');
const Company = require('./Company');
const Job = require('./Job');
const Application = require('./Application');

User.hasMany(Application, { foreignKey: { name: 'user_id', allowNull: false }, onDelete: 'CASCADE' });
Application.belongsTo(User, { foreignKey: 'user_id' });
Job.hasMany(Application, { foreignKey: { name: 'job_id', allowNull: false }, onDelete: 'CASCADE' });
Application.belongsTo(Job, { foreignKey: 'job_id' });

Company.hasMany(Job, { foreignKey: { name: 'company_id', allowNull: true }, onDelete: 'SET NULL' });
Job.belongsTo(Company, { foreignKey: 'company_id' });

module.exports = { sequelize, User, Company, Job, Application };
