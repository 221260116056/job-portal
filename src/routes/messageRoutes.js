const router = require('express').Router();
const { authenticateToken } = require('../middleware/authMiddleware');
const controller = require('../controllers/messageController');

router.use(authenticateToken);
router.get('/conversations', controller.getConversations);
router.get('/thread/:otherId', controller.getThread);
router.post('/', controller.sendMessage);

module.exports = router;
