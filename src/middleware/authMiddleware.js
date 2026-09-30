const jwt = require('jsonwebtoken');
const { User } = require('../models');

module.exports = async (req, res, next) => {
  const header = req.get('authorization');
  if (!header || !header.startsWith('Bearer ')) return res.status(401).json({ success: false, message: 'Authentication token is required' });
  try {
    if (!process.env.JWT_SECRET) throw new Error('JWT_SECRET is required');
    const decoded = jwt.verify(header.slice(7), process.env.JWT_SECRET);
    const user = await User.findByPk(decoded.sub);
    if (!user) return res.status(401).json({ success: false, message: 'User not found' });
    req.user = user;
    next();
  } catch (error) {
    if (error.name === 'TokenExpiredError') return res.status(401).json({ success: false, message: 'Token has expired' });
    return res.status(401).json({ success: false, message: 'Invalid authentication token' });
  }
};
