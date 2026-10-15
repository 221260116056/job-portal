const { Op } = require('sequelize');
const { Message, User, Company, Job, Notification } = require('../models');
const { success } = require('../utils/response');

const formatMessage = (msg) => {
  const json = msg.toJSON ? msg.toJSON() : msg;
  const ts = json.createdAt || json.created_at || new Date().toISOString();
  return {
    ...json,
    created_at: ts,
    createdAt: ts
  };
};

exports.getConversations = async (req, res, next) => {
  try {
    const myId = req.account.id;
    const isCompany = req.account.role === 'company';

    const messages = await Message.findAll({
      where: {
        [Op.or]: [
          { sender_id: myId },
          { recipient_id: myId }
        ]
      },
      order: [['created_at', 'DESC']],
      include: [{ model: Job, attributes: ['id', 'title'] }]
    });

    const convMap = new Map();

    for (const msg of messages) {
      const otherId = msg.sender_id === myId ? msg.recipient_id : msg.sender_id;
      const otherType = msg.sender_id === myId ? msg.recipient_type : msg.sender_type;

      if (!convMap.has(otherId)) {
        convMap.set(otherId, {
          otherId,
          otherType,
          lastMessage: msg.content,
          lastMessageAt: msg.createdAt || msg.created_at,
          unreadCount: 0,
          job: msg.Job ? { id: msg.Job.id, title: msg.Job.title } : null,
          party: null
        });
      }

      if (msg.recipient_id === myId && !msg.is_read) {
        convMap.get(otherId).unreadCount += 1;
      }
    }

    // Populate party details (Candidate info or Company info)
    const convList = Array.from(convMap.values());
    for (const conv of convList) {
      if (conv.otherType === 'company') {
        const comp = await Company.findByPk(conv.otherId, { attributes: ['id', 'company_name', 'email', 'location'] });
        conv.party = comp ? { id: comp.id, name: comp.company_name, email: comp.email, location: comp.location } : { name: 'Company' };
      } else {
        const u = await User.findByPk(conv.otherId, { attributes: ['id', 'name', 'email'] });
        conv.party = u ? { id: u.id, name: u.name, email: u.email } : { name: 'Candidate' };
      }
    }

    const totalUnread = convList.reduce((acc, c) => acc + c.unreadCount, 0);

    return success(res, 'Conversations retrieved successfully', {
      conversations: convList,
      total_unread: totalUnread
    });
  } catch (error) { next(error); }
};

exports.getThread = async (req, res, next) => {
  try {
    const myId = req.account.id;
    const { otherId } = req.params;

    const messages = await Message.findAll({
      where: {
        [Op.or]: [
          { sender_id: myId, recipient_id: otherId },
          { sender_id: otherId, recipient_id: myId }
        ]
      },
      order: [['created_at', 'ASC']],
      include: [{ model: Job, attributes: ['id', 'title'] }]
    });

    // Mark received messages as read
    await Message.update(
      { is_read: true },
      { where: { sender_id: otherId, recipient_id: myId, is_read: false } }
    );

    // Other party details
    const isCompany = req.account.role === 'company';
    let otherParty = null;
    if (isCompany) {
      const u = await User.findByPk(otherId, { attributes: ['id', 'name', 'email'] });
      otherParty = u ? { id: u.id, name: u.name, email: u.email, role: 'candidate' } : null;
    } else {
      const c = await Company.findByPk(otherId, { attributes: ['id', 'company_name', 'email', 'location'] });
      otherParty = c ? { id: c.id, name: c.company_name, email: c.email, role: 'company' } : null;
    }

    return success(res, 'Messages retrieved successfully', {
      messages: messages.map(formatMessage),
      otherParty
    });
  } catch (error) { next(error); }
};

exports.sendMessage = async (req, res, next) => {
  try {
    const sender_id = req.account.id;
    const sender_type = req.account.role; // 'candidate' | 'company'
    const { recipient_id, recipient_type, content, job_id } = req.body;

    if (!recipient_id || !content || !content.trim()) {
      return res.status(400).json({ success: false, message: 'Recipient and message content are required' });
    }

    const message = await Message.create({
      sender_id,
      sender_type,
      recipient_id,
      recipient_type: recipient_type || (sender_type === 'candidate' ? 'company' : 'candidate'),
      job_id: job_id || null,
      content: content.trim()
    });

    // Create Notification for recipient
    const senderName = sender_type === 'candidate' ? (req.user?.name || 'Candidate') : (req.company?.company_name || 'Company');
    const notifData = {
      title: `New message from ${senderName}`,
      message: content.trim().length > 60 ? content.trim().slice(0, 60) + '...' : content.trim(),
      type: 'message',
      link: '#/chat'
    };
    if (recipient_type === 'company' || sender_type === 'candidate') {
      notifData.company_id = recipient_id;
    } else {
      notifData.user_id = recipient_id;
    }
    await Notification.create(notifData).catch(() => {});

    return success(res, 'Message sent successfully', formatMessage(message), 201);
  } catch (error) { next(error); }
};
