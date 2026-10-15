const { Notification } = require('../models');
const { success } = require('../utils/response');

const formatNotification = (n) => {
  const json = n.toJSON ? n.toJSON() : n;
  const ts = json.createdAt || json.created_at || new Date().toISOString();
  return {
    ...json,
    created_at: ts,
    createdAt: ts
  };
};

exports.list = async (req, res, next) => {
  try {
    const isCompany = req.account.role === 'company';
    const where = isCompany ? { company_id: req.account.id } : { user_id: req.account.id };
    const notifications = await Notification.findAll({
      where,
      order: [['created_at', 'DESC']],
      limit: 50,
    });
    const unreadCount = await Notification.count({
      where: { ...where, is_read: false },
    });
    return success(res, 'Notifications retrieved successfully', {
      notifications: notifications.map(formatNotification),
      unread_count: unreadCount,
    });
  } catch (error) { next(error); }
};

exports.markAsRead = async (req, res, next) => {
  try {
    const isCompany = req.account.role === 'company';
    const where = { id: req.params.id };
    if (isCompany) where.company_id = req.account.id;
    else where.user_id = req.account.id;

    const notif = await Notification.findOne({ where });
    if (!notif) return res.status(404).json({ success: false, message: 'Notification not found' });
    await notif.update({ is_read: true });
    return success(res, 'Notification marked as read', notif);
  } catch (error) { next(error); }
};

exports.markAllAsRead = async (req, res, next) => {
  try {
    const isCompany = req.account.role === 'company';
    const where = isCompany ? { company_id: req.account.id } : { user_id: req.account.id };
    await Notification.update({ is_read: true }, { where });
    return success(res, 'All notifications marked as read');
  } catch (error) { next(error); }
};
