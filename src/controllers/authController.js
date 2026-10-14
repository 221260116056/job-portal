const bcrypt = require('bcryptjs');
const { User } = require('../models');
const tokenFor = require('../utils/generateToken');
const { CANDIDATE } = require('../utils/generateToken');
const { success } = require('../utils/response');

exports.register = async (req, res, next) => {
  try {
    const { name, email, password } = req.body;
    if (await User.unscoped().findOne({ where: { email: email.toLowerCase() } })) return res.status(409).json({ success: false, message: 'Email is already registered' });
    const user = await User.create({ name, email: email.toLowerCase(), password: await bcrypt.hash(password, 12) });
    return success(res, 'User registered successfully', { id: user.id, name: user.name, email: user.email, role: CANDIDATE }, 201);
  } catch (error) { next(error); }
};

exports.login = async (req, res, next) => {
  try {
    const user = await User.unscoped().findOne({ where: { email: req.body.email.toLowerCase() } });
    if (!user || !(await bcrypt.compare(req.body.password, user.password))) return res.status(401).json({ success: false, message: 'Invalid email or password' });

    let wasSuspended = false;
    if (user.is_suspended) {
      await user.update({ is_suspended: false });
      wasSuspended = true;
    }

    return success(res, wasSuspended ? 'Account reactivated and login successful' : 'Login successful', {
      token: tokenFor(user, CANDIDATE),
      role: CANDIDATE,
      user: { id: user.id, name: user.name, email: user.email },
      reactivated: wasSuspended
    });
  } catch (error) { next(error); }
};
