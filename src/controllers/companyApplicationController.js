const { Application, Job, User } = require('../models');
const { success } = require('../utils/response');

const STATUSES = ['Applied', 'Under Review', 'Shortlisted', 'Rejected'];

// Applications for jobs owned by the authenticated company.
exports.list = async (req, res, next) => {
  try {
    const jobs = await Job.findAll({ where: { company_id: req.company.id }, attributes: ['id'] });
    const jobIds = jobs.map((j) => j.id);
    if (!jobIds.length) return success(res, 'Company applications retrieved successfully', []);
    const apps = await Application.findAll({
      where: { job_id: jobIds },
      include: [
        { model: User, attributes: ['id', 'name', 'email', 'resume_url', 'skills'] },
        { model: Job, attributes: ['id', 'title'] },
      ],
      order: [['applied_at', 'DESC']],
    });
    const { readSkills } = require('./userController');
    return success(res, 'Company applications retrieved successfully', apps.map((a) => ({
      id: a.id,
      status: a.status,
      resume_type: a.resume_type || 'hireflow',
      resume_url: a.resume_url || (a.User ? a.User.resume_url : null),
      note: a.note || null,
      candidate: a.User ? {
        id: a.User.id,
        name: a.User.name,
        email: a.User.email,
        resume_url: a.resume_url || a.User.resume_url,
        skills: readSkills(a.User)
      } : null,
      job: a.Job ? { id: a.Job.id, title: a.Job.title } : null,
      applied_at: a.applied_at,
    })));
  } catch (error) { next(error); }
};

exports.updateStatus = async (req, res, next) => {
  try {
    const { status } = req.body;
    if (!STATUSES.includes(status)) return res.status(422).json({ success: false, message: 'Validation failed', errors: [{ field: 'status', message: `Status must be one of: ${STATUSES.join(', ')}` }] });
    const app = await Application.findByPk(req.params.id, { include: [{ model: Job, attributes: ['id', 'company_id', 'title'] }] });
    if (!app || !app.Job || app.Job.company_id !== req.company.id) return res.status(404).json({ success: false, message: 'Application not found' });
    await app.update({ status });
    return success(res, 'Application status updated successfully', { id: app.id, status: app.status, job: { id: app.Job.id, title: app.Job.title } });
  } catch (error) { next(error); }
};

exports.STATUSES = STATUSES;
