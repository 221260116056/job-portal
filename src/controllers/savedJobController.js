const { SavedJob, Job, Company } = require('../models');
const { success } = require('../utils/response');

exports.list = async (req, res, next) => {
  try {
    const savedJobs = await SavedJob.findAll({
      where: { user_id: req.user.id },
      order: [['created_at', 'DESC']],
      include: [
        {
          model: Job,
          include: [
            {
              model: Company,
              attributes: ['id', 'company_name', 'email', 'location', 'website']
            }
          ]
        }
      ]
    });

    const jobs = savedJobs.map(item => item.Job).filter(Boolean);
    return success(res, 'Saved jobs retrieved successfully', { saved_jobs: savedJobs, jobs });
  } catch (error) {
    next(error);
  }
};

exports.getSavedIds = async (req, res, next) => {
  try {
    const saved = await SavedJob.findAll({
      where: { user_id: req.user.id },
      attributes: ['job_id']
    });
    const ids = saved.map(s => s.job_id);
    return success(res, 'Saved job IDs retrieved successfully', { ids });
  } catch (error) {
    next(error);
  }
};

exports.toggle = async (req, res, next) => {
  try {
    const user_id = req.user.id;
    const { jobId } = req.params;

    const job = await Job.findByPk(jobId);
    if (!job) {
      return res.status(404).json({ success: false, message: 'Job not found' });
    }

    const existing = await SavedJob.findOne({
      where: { user_id, job_id: jobId }
    });

    if (existing) {
      await existing.destroy();
      return success(res, 'Job removed from saved list', { saved: false, jobId });
    } else {
      const created = await SavedJob.create({ user_id, job_id: jobId });
      return success(res, 'Job saved successfully', { saved: true, jobId, record: created }, 201);
    }
  } catch (error) {
    next(error);
  }
};

exports.remove = async (req, res, next) => {
  try {
    const user_id = req.user.id;
    const { jobId } = req.params;

    const existing = await SavedJob.findOne({
      where: { user_id, job_id: jobId }
    });

    if (!existing) {
      return res.status(404).json({ success: false, message: 'Saved job not found' });
    }

    await existing.destroy();
    return success(res, 'Job removed from saved list', { saved: false, jobId });
  } catch (error) {
    next(error);
  }
};
