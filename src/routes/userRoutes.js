const router = require('express').Router();
const { requireCandidate } = require('../middleware/authMiddleware');
const upload = require('../middleware/uploadMiddleware');
const controller = require('../controllers/userController');
router.get('/me', requireCandidate, controller.me);
router.get('/skills', requireCandidate, controller.skills);
router.post('/resume', requireCandidate, upload, controller.uploadResume);
module.exports = router;
