const { Application, Job } = require('../models');
const { success } = require('../utils/response');

exports.create = async (req, res, next) => {
  try {
    const { job_id } = req.body;
    const job = await Job.findByPk(job_id);
    if (!job) return res.status(404).json({ success: false, message: 'Job not found' });
    const [application, created] = await Application.findOrCreate({ where: { user_id: req.user.id, job_id }, defaults: { status: 'Applied' } });
    if (!created) return res.status(409).json({ success: false, message: 'You have already applied for this job' });
    return success(res, 'Application submitted successfully', { id: application.id, job_id: application.job_id, status: application.status }, 201);
  } catch (error) { next(error); }
};
exports.list = async (req, res, next) => {
  try { const apps = await Application.findAll({ where: { user_id: req.user.id }, include: [{ model: Job, attributes: ['id', 'title', 'company'] }], order: [['applied_at', 'DESC']] }); return success(res, 'Applications retrieved successfully', apps); }
  catch (error) { next(error); }
};
exports.get = async (req, res, next) => {
  try { const app = await Application.findByPk(req.params.id, { include: [{ model: Job, attributes: ['id', 'title', 'company', 'description', 'location', 'employment_type', 'skills'] }] }); if (!app || app.user_id !== req.user.id) return res.status(404).json({ success: false, message: 'Application not found' }); return success(res, 'Application retrieved successfully', app); }
  catch (error) { next(error); }
};
