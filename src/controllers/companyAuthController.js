const bcrypt = require('bcryptjs');
const { Company } = require('../models');
const tokenFor = require('../utils/generateToken');
const { COMPANY } = require('../utils/generateToken');
const { success } = require('../utils/response');

const publicCompany = (company) => ({
  id: company.id,
  company_name: company.company_name,
  email: company.email,
  location: company.location,
  website: company.website,
});

exports.register = async (req, res, next) => {
  try {
    const { company_name, email, password, location, website } = req.body;
    if (await Company.unscoped().findOne({ where: { email: email.toLowerCase() } })) return res.status(409).json({ success: false, message: 'Company email is already registered' });
    const company = await Company.create({
      company_name,
      email: email.toLowerCase(),
      password: await bcrypt.hash(password, 12),
      location,
      website: website || null,
    });
    return success(res, 'Company registered successfully', { ...publicCompany(company), role: COMPANY }, 201);
  } catch (error) { next(error); }
};

exports.login = async (req, res, next) => {
  try {
    const company = await Company.unscoped().findOne({ where: { email: req.body.email.toLowerCase() } });
    if (!company || !(await bcrypt.compare(req.body.password, company.password))) return res.status(401).json({ success: false, message: 'Invalid company email or password' });
    return success(res, 'Company login successful', { token: tokenFor(company, COMPANY), role: COMPANY, company: publicCompany(company) });
  } catch (error) { next(error); }
};

exports.me = (req, res) => success(res, 'Company profile retrieved successfully', { ...publicCompany(req.company), role: COMPANY });

exports.updateProfile = async (req, res, next) => {
  try {
    const { company_name, location, website } = req.body;
    if (!company_name || !company_name.trim()) return res.status(400).json({ success: false, message: 'Company name is required' });
    await req.company.update({
      company_name: company_name.trim(),
      location: location ? location.trim() : req.company.location,
      website: website !== undefined ? (website ? website.trim() : null) : req.company.website
    });
    return success(res, 'Company profile updated successfully', { ...publicCompany(req.company), role: COMPANY });
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
    const companyWithPw = await Company.unscoped().findByPk(req.company.id);
    if (!companyWithPw) return res.status(404).json({ success: false, message: 'Company not found' });

    const valid = await bcrypt.compare(currentPassword, companyWithPw.password);
    if (!valid) return res.status(400).json({ success: false, message: 'Current password is incorrect' });

    const hashedPassword = await bcrypt.hash(newPassword, 12);
    await companyWithPw.update({ password: hashedPassword });
    return success(res, 'Password updated successfully');
  } catch (error) { next(error); }
};

exports.publicCompany = publicCompany;
