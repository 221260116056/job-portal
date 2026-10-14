const { Application, Job } = require('../models');
const { success } = require('../utils/response');

exports.create = async (req, res, next) => {
  try {
    const { job_id, resume_type, resume_url, note } = req.body;
    const job = await Job.findByPk(job_id);
    if (!job) return res.status(404).json({ success: false, message: 'Job not found' });

    const finalResumeUrl = resume_url || req.user.resume_url || null;
    const finalResumeType = resume_type === 'upload' ? 'custom' : 'hireflow';

    const [application, created] = await Application.findOrCreate({
      where: { user_id: req.user.id, job_id },
      defaults: {
        status: 'Applied',
        resume_url: finalResumeUrl,
        resume_type: finalResumeType,
        note: note ? note.trim() : null,
      }
    });
    if (!created) return res.status(409).json({ success: false, message: 'You have already applied for this job' });
    return success(res, 'Application submitted successfully', {
      id: application.id,
      job_id: application.job_id,
      status: application.status,
      resume_url: application.resume_url,
      resume_type: application.resume_type
    }, 201);
  } catch (error) { next(error); }
};
exports.list = async (req, res, next) => {
  try {
    const apps = await Application.findAll({
      where: { user_id: req.user.id },
      include: [{ model: Job, attributes: ['id', 'title', 'company', 'location'] }],
      order: [['applied_at', 'DESC']]
    });
    return success(res, 'Applications retrieved successfully', apps);
  } catch (error) { next(error); }
};
exports.get = async (req, res, next) => {
  try {
    const app = await Application.findByPk(req.params.id, {
      include: [{ model: Job, attributes: ['id', 'title', 'company', 'description', 'location', 'employment_type', 'skills'] }]
    });
    if (!app || app.user_id !== req.user.id) return res.status(404).json({ success: false, message: 'Application not found' });
    return success(res, 'Application retrieved successfully', app);
  } catch (error) { next(error); }
};
