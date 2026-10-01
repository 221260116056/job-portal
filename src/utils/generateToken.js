const jwt = require('jsonwebtoken');

const CANDIDATE = 'candidate';
const COMPANY = 'company';

module.exports = (account, role = CANDIDATE) => {
  if (!process.env.JWT_SECRET) throw new Error('JWT_SECRET is required');
  return jwt.sign({ sub: account.id, role }, process.env.JWT_SECRET, { expiresIn: process.env.JWT_EXPIRES_IN || '7d' });
};
module.exports.CANDIDATE = CANDIDATE;
module.exports.COMPANY = COMPANY;
