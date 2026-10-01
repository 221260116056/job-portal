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
exports.publicCompany = publicCompany;
