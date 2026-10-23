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
  resume_data: user.resume_data || {},
  auth_provider: user.auth_provider || 'local',
  avatar_url: user.avatar_url || null,
  google_id: user.google_id || null,
  linkedin_id: user.linkedin_id || null
});

exports.me = (req, res) => success(res, 'Current user retrieved successfully', publicUser(req.user));

exports.skills = (req, res) => success(res, 'Candidate skills retrieved successfully', { skills: readSkills(req.user) });

exports.updateHireFlowResume = async (req, res, next) => {
  try {
    const {
      name,
      headline,
      phone,
      location,
      website,
      linkedin,
      github,
      summary,
      skills,
      experience,
      education,
      projects,
      certifications
    } = req.body;

    const resumeData = {
      headline: headline ? String(headline).trim() : '',
      phone: phone ? String(phone).trim() : '',
      location: location ? String(location).trim() : '',
      website: website ? String(website).trim() : '',
      linkedin: linkedin ? String(linkedin).trim() : '',
      github: github ? String(github).trim() : '',
      summary: summary ? String(summary).trim() : '',
      experience: Array.isArray(experience) ? experience : [],
      education: Array.isArray(education) ? education : [],
      projects: Array.isArray(projects) ? projects : [],
      certifications: Array.isArray(certifications) ? certifications : [],
    };

    const updates = { resume_data: resumeData };

    if (name && String(name).trim()) {
      updates.name = String(name).trim();
    }

    if (Array.isArray(skills)) {
      updates.skills = skills.map((s) => String(s).trim()).filter(Boolean);
    } else if (typeof skills === 'string') {
      updates.skills = skills.split(',').map((s) => s.trim()).filter(Boolean);
    }

    await req.user.update(updates);
    return success(res, 'HireFlow Resume saved successfully', publicUser(req.user));
  } catch (error) { next(error); }
};

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

exports.updateProfile = async (req, res, next) => {
  try {
    const { name } = req.body;
    if (!name || !name.trim()) return res.status(400).json({ success: false, message: 'Name is required' });
    await req.user.update({ name: name.trim() });
    return success(res, 'Profile updated successfully', publicUser(req.user));
  } catch (error) { next(error); }
};

exports.changePassword = async (req, res, next) => {
  try {
    const { currentPassword, newPassword } = req.body;
    if (!currentPassword || !newPassword) {
      return res.status(400).json({ success: false, message: 'Current password and new password are required' });
    }
    if (newPassword.length < 6) {
      return res.status(400).json({ success: false, message: 'New password must be at least 6 characters' });
    }
    const bcrypt = require('bcryptjs');
    const userWithPassword = await User.unscoped().findByPk(req.user.id);
    if (!userWithPassword) return res.status(404).json({ success: false, message: 'User not found' });

    const valid = await bcrypt.compare(currentPassword, userWithPassword.password);
    if (!valid) return res.status(400).json({ success: false, message: 'Current password is incorrect' });

    const hashedPassword = await bcrypt.hash(newPassword, 12);
    await userWithPassword.update({ password: hashedPassword });
    return success(res, 'Password updated successfully');
  } catch (error) { next(error); }
};

exports.suspendAccount = async (req, res, next) => {
  try {
    const { password } = req.body;
    const bcrypt = require('bcryptjs');
    const userWithPassword = await User.unscoped().findByPk(req.user.id);
    if (!userWithPassword) return res.status(404).json({ success: false, message: 'User not found' });

    if (password) {
      const valid = await bcrypt.compare(password, userWithPassword.password);
      if (!valid) return res.status(400).json({ success: false, message: 'Incorrect password' });
    }

    await userWithPassword.update({ is_suspended: true });
    return success(res, 'Account suspended successfully. You can reactivate by logging in anytime.', { is_suspended: true });
  } catch (error) { next(error); }
};

exports.deleteAccount = async (req, res, next) => {
  try {
    const { password } = req.body;
    const bcrypt = require('bcryptjs');
    const userWithPassword = await User.unscoped().findByPk(req.user.id);
    if (!userWithPassword) return res.status(404).json({ success: false, message: 'User not found' });

    if (password) {
      const valid = await bcrypt.compare(password, userWithPassword.password);
      if (!valid) return res.status(400).json({ success: false, message: 'Incorrect password' });
    }

    if (userWithPassword.resume_url) {
      fs.unlink(path.resolve(process.cwd(), process.env.UPLOAD_DIR || 'uploads/resumes', path.basename(userWithPassword.resume_url))).catch(() => {});
    }

    await userWithPassword.destroy();
    return success(res, 'Account permanently deleted');
  } catch (error) { next(error); }
};

exports.readSkills = readSkills;
