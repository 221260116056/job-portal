const fs = require('fs/promises');
const path = require('path');
const { User } = require('../models');
const { success } = require('../utils/response');

exports.me = (req, res) => success(res, 'Current user retrieved successfully', { id: req.user.id, name: req.user.name, email: req.user.email, resume_url: req.user.resume_url });
exports.uploadResume = async (req, res, next) => {
  if (!req.file) return res.status(400).json({ success: false, message: 'A resume file is required in the resume field' });
  try {
    const resumeUrl = `/uploads/resumes/${path.basename(req.file.path)}`;
    const oldUrl = req.user.resume_url;
    await req.user.update({ resume_url: resumeUrl });
    if (oldUrl) fs.unlink(path.resolve(process.cwd(), process.env.UPLOAD_DIR || 'uploads/resumes', path.basename(oldUrl))).catch(() => {});
    return success(res, 'Resume uploaded successfully', { resume_url: resumeUrl });
  } catch (error) { await fs.unlink(req.file.path).catch(() => {}); next(error); }
};
