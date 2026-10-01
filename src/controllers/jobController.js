const { Job } = require('../models');
const { success } = require('../utils/response');
const { scoreJob } = require('../utils/extractSkills');
const { readSkills } = require('./userController');

exports.list = async (req, res, next) => {
  try {
    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit, 10) || 10));
    const { count, rows } = await Job.findAndCountAll({ order: [['created_at', 'DESC']], limit, offset: (page - 1) * limit });
    return res.json({ success: true, data: rows, pagination: { page, limit, total: count, totalPages: Math.ceil(count / limit) } });
  } catch (error) { next(error); }
};
exports.get = async (req, res, next) => {
  try { const job = await Job.findByPk(req.params.id); if (!job) return res.status(404).json({ success: false, message: 'Job not found' }); return success(res, 'Job retrieved successfully', job); }
  catch (error) { if (error.name === 'SequelizeDatabaseError') return res.status(400).json({ success: false, message: 'Invalid job ID' }); next(error); }
};
exports.create = async (req, res, next) => {
  try { const job = await Job.create(req.body); return success(res, 'Job created successfully', job, 201); } catch (error) { next(error); }
};
// Jobs ranked by overlap with the authenticated user's resume skills.
exports.matched = async (req, res, next) => {
  try {
    const resumeSkills = readSkills(req.user);
    if (!resumeSkills.length) {
      const jobs = await Job.findAll({ order: [['created_at', 'DESC']], limit: 50 });
      return success(res, 'No resume skills detected — showing all jobs unranked', { resume_skills: [], jobs: jobs.map((j) => ({ ...j.toJSON(), match_score: 0, matched_skills: [] })) });
    }
    const jobs = await Job.findAll({ order: [['created_at', 'DESC']], limit: 100 });
    const ranked = jobs
      .map((job) => {
        const { score, matched } = scoreJob(resumeSkills, job.skills);
        return { ...job.toJSON(), match_score: Math.round(score * 100) / 100, match_percent: Math.round(score * 100), matched_skills: matched };
      })
      .sort((a, b) => b.match_score - a.match_score || new Date(b.created_at) - new Date(a.created_at));
    return success(res, 'Skill-matched jobs retrieved successfully', { resume_skills: resumeSkills, total: ranked.length, jobs: ranked });
  } catch (error) { next(error); }
};
