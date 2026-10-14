const { Op } = require('sequelize');
const { Job } = require('../models');
const { success } = require('../utils/response');
const { normalizeSkills, scoreJob } = require('../utils/extractSkills');
const { readSkills } = require('./userController');

const MIN_MATCH = parseInt(process.env.MIN_JOB_MATCH_PERCENTAGE, 10) || 30;

// Always expose skills as an array (new rows store JSON arrays; legacy rows hold comma strings).
const withSkillsArray = (job) => ({ ...job.toJSON(), skills: normalizeSkills(job.skills) });

exports.list = async (req, res, next) => {
  try {
    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit, 10) || 10));
    const searchTerm = (req.query.keyword || req.query.q || '').trim();
    const locationTerm = (req.query.location || '').trim();

    const where = {};
    if (searchTerm) {
      where[Op.or] = [
        { title: { [Op.iLike]: `%${searchTerm}%` } },
        { company: { [Op.iLike]: `%${searchTerm}%` } },
        { description: { [Op.iLike]: `%${searchTerm}%` } },
      ];
    }
    if (locationTerm && locationTerm.toLowerCase() !== 'all' && locationTerm.toLowerCase() !== 'all locations') {
      where.location = { [Op.iLike]: `%${locationTerm}%` };
    }

    const { count, rows } = await Job.findAndCountAll({
      where,
      order: [['created_at', 'DESC']],
      limit,
      offset: (page - 1) * limit
    });
    return res.json({ success: true, data: rows.map(withSkillsArray), pagination: { page, limit, total: count, totalPages: Math.ceil(count / limit) } });
  } catch (error) { next(error); }
};
exports.get = async (req, res, next) => {
  try {
    const job = await Job.findByPk(req.params.id);
    if (!job) return res.status(404).json({ success: false, message: 'Job not found' });
    return success(res, 'Job retrieved successfully', withSkillsArray(job));
  }
  catch (error) { if (error.name === 'SequelizeDatabaseError') return res.status(400).json({ success: false, message: 'Invalid job ID' }); next(error); }
};

// NOTE: job creation is company-only (companyJobController). No public create handler.

// Skill-matched recommendations for the authenticated candidate.
// match_percentage = round(matching required skills / total required job skills * 100)
function recommend(resumeSkills, jobs, minPercent) {
  return jobs
    .map((job) => {
      const plain = withSkillsArray(job);
      const { match_percentage, matched_skills } = scoreJob(resumeSkills, plain.skills);
      return { ...plain, match_percentage, matched_skills };
    })
    .filter((j) => j.match_percentage >= minPercent)
    .sort((a, b) => b.match_percentage - a.match_percentage || new Date(b.created_at) - new Date(a.created_at));
}

exports.recommended = async (req, res, next) => {
  try {
    const resumeSkills = readSkills(req.user);
    if (!resumeSkills.length) {
      return success(res, 'Upload your resume to get personalized job recommendations.', []);
    }
    const jobs = await Job.findAll({ order: [['created_at', 'DESC']], limit: 200 });
    const ranked = recommend(resumeSkills, jobs, MIN_MATCH);
    if (!ranked.length) return success(res, 'No matching jobs found', []);
    return success(res, 'Recommended jobs retrieved successfully', ranked);
  } catch (error) { next(error); }
};

// Legacy alias for GET /api/jobs/matched.
exports.matched = async (req, res, next) => {
  try {
    const resumeSkills = readSkills(req.user);
    if (!resumeSkills.length) return success(res, 'No resume skills detected — showing all jobs unranked', { resume_skills: [], jobs: [] });
    const jobs = await Job.findAll({ order: [['created_at', 'DESC']], limit: 200 });
    const ranked = recommend(resumeSkills, jobs, 0);
    return success(res, 'Skill-matched jobs retrieved successfully', { resume_skills: resumeSkills, total: ranked.length, jobs: ranked });
  } catch (error) { next(error); }
};
