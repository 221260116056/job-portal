const { MulterError } = require('multer');
module.exports = (err, req, res, next) => {
  if (res.headersSent) return next(err);
  if (err instanceof MulterError) return res.status(err.code === 'LIMIT_FILE_SIZE' ? 413 : 400).json({ success: false, message: err.code === 'LIMIT_FILE_SIZE' ? 'Resume must be 5 MB or smaller' : err.message });
  if (err.status && err.status < 500) return res.status(err.status).json({ success: false, message: err.message });
  if (err.name === 'SequelizeUniqueConstraintError') return res.status(409).json({ success: false, message: 'A record with these details already exists' });
  if (err.name === 'SequelizeValidationError') return res.status(422).json({ success: false, message: 'Validation failed', errors: err.errors.map(e => ({ field: e.path, message: e.message })) });
  if (process.env.NODE_ENV !== 'production') console.error(err);
  return res.status(500).json({ success: false, message: 'Something went wrong' });
};
