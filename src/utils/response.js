exports.success = (res, message, data, status = 200) => res.status(status).json({ success: true, message, data });
exports.fail = (res, message, status = 400, extra = {}) => res.status(status).json({ success: false, message, ...extra });
