const jwt = require('jsonwebtoken');
const { User, Company } = require('../models');
const { CANDIDATE, COMPANY } = require('../utils/generateToken');

// Verifies the JWT and attaches the account as req.account ({ id, role, profile }).
// Legacy tokens without a role claim are treated as candidate tokens.
async function authenticateToken(req, res, next) {
  const header = req.get('authorization');
  if (!header || !header.startsWith('Bearer ')) return res.status(401).json({ success: false, message: 'Authentication token is required' });
  try {
    if (!process.env.JWT_SECRET) throw new Error('JWT_SECRET is required');
    const decoded = jwt.verify(header.slice(7), process.env.JWT_SECRET);
    const role = decoded.role || CANDIDATE;
    if (role !== CANDIDATE && role !== COMPANY) return res.status(401).json({ success: false, message: 'Invalid authentication token' });
    const profile = role === COMPANY ? await Company.findByPk(decoded.sub) : await User.findByPk(decoded.sub);
    if (!profile) return res.status(401).json({ success: false, message: 'Account not found' });
    req.account = { id: profile.id, role, profile };
    // Backward-compatible aliases used by candidate controllers.
    req.user = role === CANDIDATE ? profile : undefined;
    req.company = role === COMPANY ? profile : undefined;
    next();
  } catch (error) {
    if (error.name === 'TokenExpiredError') return res.status(401).json({ success: false, message: 'Token has expired' });
    return res.status(401).json({ success: false, message: 'Invalid authentication token' });
  }
}

function requireCandidate(req, res, next) {
  authenticateToken(req, res, () => {
    if (req.account.role !== CANDIDATE) return res.status(403).json({ success: false, message: 'Candidate access required' });
    next();
  });
}

function requireCompany(req, res, next) {
  authenticateToken(req, res, () => {
    if (req.account.role !== COMPANY) return res.status(403).json({ success: false, message: 'Company access required' });
    next();
  });
}

module.exports = requireCandidate;
module.exports.authenticateToken = authenticateToken;
module.exports.requireCandidate = requireCandidate;
module.exports.requireCompany = requireCompany;
