const router = require('express').Router();
const { requireCandidate } = require('../middleware/authMiddleware');
const controller = require('../controllers/savedJobController');

router.use(requireCandidate);
router.get('/', controller.list);
router.get('/ids', controller.getSavedIds);
router.post('/:jobId', controller.toggle);
router.delete('/:jobId', controller.remove);

module.exports = router;
