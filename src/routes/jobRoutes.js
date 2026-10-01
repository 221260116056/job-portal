const router = require('express').Router();
const controller = require('../controllers/jobController');
const { requireCandidate } = require('../middleware/authMiddleware');

// Public: browse jobs. Job creation is company-only (POST /api/company/jobs).
router.get('/', controller.list);
router.get('/recommended', requireCandidate, controller.recommended);
router.get('/matched', requireCandidate, controller.matched);
router.get('/:id', controller.get);
module.exports = router;
