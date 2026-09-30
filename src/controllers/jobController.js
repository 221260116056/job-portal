const { Job } = require('../models');
const { success } = require('../utils/response');

exports.list = async (req, res, next) => {
  try {
    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit, 10) || 10));
    const { count, rows } = await Job.findAndCountAll({ order: [['created_at', 'DESC']], limit, offset: (page - 1) * limit });
    return res.json({ success: true, data: rows, pagination: { page, limit, total: count, totalPages: Math.ceil(count / limit) } });
  } catch (error) { next(error); }
};
exports.get = async (req, res, next) => {
  try { const job = await Job.findByPk(req.params.id); if (!job) return res.status(404).json({ success: false, message: 'Job not found' }); return success(res, 'Job retrieved successfully', job); }
  catch (error) { if (error.name === 'SequelizeDatabaseError') return res.status(400).json({ success: false, message: 'Invalid job ID' }); next(error); }
};
exports.create = async (req, res, next) => {
  try { const job = await Job.create(req.body); return success(res, 'Job created successfully', job, 201); } catch (error) { next(error); }
};
