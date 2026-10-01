const fs = require('fs/promises');
const path = require('path');
const { User } = require('../models');
const { success } = require('../utils/response');
const { parseResume } = require('../utils/parseResume');
const { extractSkills } = require('../utils/extractSkills');

// Handles JSONB arrays and legacy JSON-string rows.
const readSkills = (user) => {
  const s = user.skills;
  if (Array.isArray(s)) return s;
  if (typeof s === 'string') {
    try { const p = JSON.parse(s); return Array.isArray(p) ? p : []; } catch { return []; }
  }
  // legacy resume_skills column
  const legacy = user.get ? user.get('resume_skills') : user.resume_skills;
  if (typeof legacy === 'string') {
    try { const p = JSON.parse(legacy); return Array.isArray(p) ? p : []; } catch { return []; }
  }
  return [];
};

const publicUser = (user) => ({
  id: user.id,
  name: user.name,
  email: user.email,
  resume_url: user.resume_url,
  skills: readSkills(user),
});

exports.me = (req, res) => success(res, 'Current user retrieved successfully', publicUser(req.user));

exports.skills = (req, res) => success(res, 'Candidate skills retrieved successfully', { skills: readSkills(req.user) });

exports.uploadResume = async (req, res, next) => {
  if (!req.file) return res.status(400).json({ success: false, message: 'A resume file is required in the resume field' });
  const failUpload = async (status, message) => {
    await fs.unlink(req.file.path).catch(() => {});
    return res.status(status).json({ success: false, message });
  };
  try {
    // Extract text first: never store a resume we cannot read.
    let resumeText = '';
    try {
      resumeText = await parseResume(req.file.path, req.file.originalname);
    } catch (parseError) {
      console.error('Resume parse failed:', parseError.message);
    }
    if (!resumeText) return failUpload(422, 'Unable to extract text from this resume');
    const resumeSkills = extractSkills(resumeText);

    const resumeUrl = `/uploads/resumes/${path.basename(req.file.path)}`;
    const oldUrl = req.user.resume_url;
    await req.user.update({ resume_url: resumeUrl, skills: resumeSkills, resume_text: resumeText.slice(0, 20000) });
    if (oldUrl) fs.unlink(path.resolve(process.cwd(), process.env.UPLOAD_DIR || 'uploads/resumes', path.basename(oldUrl))).catch(() => {});
    return success(res, 'Resume uploaded successfully', {
      resume_url: resumeUrl,
      skills: resumeSkills,
      message_hint: resumeSkills.length
        ? `Detected ${resumeSkills.length} skill(s). See GET /api/jobs/recommended for jobs matching your profile.`
        : 'Resume uploaded successfully, but no supported technical skills were detected. You can browse all jobs or upload a different resume.',
    });
  } catch (error) { await fs.unlink(req.file.path).catch(() => {}); next(error); }
};

exports.readSkills = readSkills;
