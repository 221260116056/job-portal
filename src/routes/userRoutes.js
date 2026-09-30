const router = require('express').Router();
const auth = require('../middleware/authMiddleware');
const upload = require('../middleware/uploadMiddleware');
const controller = require('../controllers/userController');
router.get('/me', auth, controller.me);
router.post('/resume', auth, upload, controller.uploadResume);
module.exports = router;
