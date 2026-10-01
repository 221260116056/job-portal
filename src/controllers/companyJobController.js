const { Job, Application } = require('../models');
const { success } = require('../utils/response');
const { normalizeSkills, serializeSkills } = require('../utils/extractSkills');

// All handlers derive the company from the authenticated JWT (req.company).
// Any company/company_id sent in the request body is ignored.

const withSkillsArray = (job, extra = {}) => ({ ...job.toJSON(), skills: normalizeSkills(job.skills), ...extra });

// Ownership first: a company must never learn about or touch another company's job.
async function loadOwnJob(req, res, next) {
  try {
    const job = await Job.findByPk(req.params.id);
    if (!job || job.company_id !== req.company.id) return res.status(404).json({ success: false, message: 'Job not found' });
    req.job = job;
    next();
  } catch (error) { next(error); }
}
exports.loadOwnJob = loadOwnJob;

exports.list = async (req, res, next) => {
  try {
    const jobs = await Job.findAll({ where: { company_id: req.company.id }, order: [['created_at', 'DESC']] });
    const jobIds = jobs.map((j) => j.id);
    const counts = jobIds.length
      ? await Application.findAll({ where: { job_id: jobIds }, attributes: ['job_id'] })
      : [];
    const tally = {};
    counts.forEach((a) => { tally[a.job_id] = (tally[a.job_id] || 0) + 1; });
    return success(res, 'Company jobs retrieved successfully', jobs.map((j) => withSkillsArray(j, { applications_count: tally[j.id] || 0 })));
  } catch (error) { next(error); }
};

exports.create = async (req, res, next) => {
  try {
    const { title, description, location, employment_type, skills } = req.body;
    const job = await Job.create({
      company_id: req.company.id,
      company: req.company.company_name,
      title,
      description,
      location,
      employment_type,
      skills: serializeSkills(skills),
    });
    return success(res, 'Job created successfully', withSkillsArray(job, { applications_count: 0 }), 201);
  } catch (error) { next(error); }
};

exports.get = async (req, res, next) => {
  try {
    const applications_count = await Application.count({ where: { job_id: req.job.id } });
    return success(res, 'Job retrieved successfully', withSkillsArray(req.job, { applications_count }));
  } catch (error) { next(error); }
};

exports.update = async (req, res, next) => {
  try {
    const { title, description, location, employment_type, skills } = req.body;
    await req.job.update({ title, description, location, employment_type, skills: serializeSkills(skills) });
    return success(res, 'Job updated successfully', withSkillsArray(req.job));
  } catch (error) { next(error); }
};

exports.remove = async (req, res, next) => {
  try {
    await req.job.destroy();
    return success(res, 'Job deleted successfully', { id: req.params.id });
  } catch (error) { next(error); }
};
