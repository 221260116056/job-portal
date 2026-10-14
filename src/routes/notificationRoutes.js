const router = require('express').Router();
const { authenticateToken } = require('../middleware/authMiddleware');
const controller = require('../controllers/notificationController');

router.use(authenticateToken);
router.get('/', controller.list);
router.put('/read-all', controller.markAllAsRead);
router.put('/:id/read', controller.markAsRead);

module.exports = router;
