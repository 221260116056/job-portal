const fs = require('fs/promises');
const path = require('path');
const { User } = require('../models');
const { success } = require('../utils/response');
const { parseResume } = require('../utils/parseResume');
const { extractSkills } = require('../utils/extractSkills');

const readSkills = (user) => {
  try { return user.resume_skills ? JSON.parse(user.resume_skills) : []; }
  catch { return []; }
};

const publicUser = (user) => ({
  id: user.id,
  name: user.name,
  email: user.email,
  resume_url: user.resume_url,
  resume_skills: readSkills(user),
});

exports.me = (req, res) => success(res, 'Current user retrieved successfully', publicUser(req.user));

exports.uploadResume = async (req, res, next) => {
  if (!req.file) return res.status(400).json({ success: false, message: 'A resume file is required in the resume field' });
  try {
    const resumeUrl = `/uploads/resumes/${path.basename(req.file.path)}`;
    const oldUrl = req.user.resume_url;

    // Extract text + skills from the new file (never fail the upload on parse errors).
    let resumeSkills = [];
    let resumeText = '';
    try {
      resumeText = await parseResume(req.file.path, req.file.originalname);
      resumeSkills = extractSkills(resumeText);
    } catch (parseError) {
      console.error('Resume parse failed:', parseError.message);
    }

    await req.user.update({
      resume_url: resumeUrl,
      resume_skills: JSON.stringify(resumeSkills),
      resume_text: resumeText.slice(0, 20000) || null,
    });
    if (oldUrl) fs.unlink(path.resolve(process.cwd(), process.env.UPLOAD_DIR || 'uploads/resumes', path.basename(oldUrl))).catch(() => {});
    return success(res, 'Resume uploaded successfully', {
      resume_url: resumeUrl,
      resume_skills: resumeSkills,
      message_hint: resumeSkills.length
        ? `Detected ${resumeSkills.length} skill(s). See GET /api/jobs/matched for jobs matching your profile.`
        : 'No known skills detected — jobs are listed without skill ranking. Try a text-based PDF/DOCX resume.',
    });
  } catch (error) { await fs.unlink(req.file.path).catch(() => {}); next(error); }
};

exports.readSkills = readSkills;
