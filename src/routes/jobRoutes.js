const router = require('express').Router();
const { body } = require('express-validator');
const controller = require('../controllers/jobController');
const validate = require('../middleware/validationMiddleware');
router.get('/', controller.list);
router.get('/:id', controller.get);
router.post('/', [body('title').trim().notEmpty(), body('company').trim().notEmpty(), body('description').trim().notEmpty(), body('location').trim().notEmpty(), body('employment_type').trim().notEmpty()], validate, controller.create);
module.exports = router;
