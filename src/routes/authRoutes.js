const router = require('express').Router();
const { body } = require('express-validator');
const controller = require('../controllers/authController');
const validate = require('../middleware/validationMiddleware');
router.post('/register', [body('name').trim().notEmpty().withMessage('Name is required'), body('email').trim().isEmail().withMessage('A valid email is required'), body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters')], validate, controller.register);
router.post('/login', [body('email').trim().isEmail().withMessage('A valid email is required'), body('password').notEmpty().withMessage('Password is required')], validate, controller.login);
module.exports = router;
