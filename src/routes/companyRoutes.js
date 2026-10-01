const router = require('express').Router();
const { body, param } = require('express-validator');
const { requireCompany } = require('../middleware/authMiddleware');
const validate = require('../middleware/validationMiddleware');
const companyAuth = require('../controllers/companyAuthController');
const companyJobs = require('../controllers/companyJobController');
const companyApps = require('../controllers/companyApplicationController');

// Company auth (public)
router.post('/auth/register', [
  body('company_name').trim().notEmpty().withMessage('Company name is required'),
  body('email').trim().isEmail().withMessage('A valid company email is required'),
  body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
  body('location').trim().notEmpty().withMessage('Company location is required'),
  body('website').optional({ values: 'falsy' }).isURL().withMessage('Website must be a valid URL'),
], validate, companyAuth.register);
router.post('/auth/login', [
  body('email').trim().isEmail().withMessage('A valid company email is required'),
  body('password').notEmpty().withMessage('Password is required'),
], validate, companyAuth.login);

// Everything below requires a company JWT. Company identity always comes from the token.
router.use(requireCompany);
router.get('/me', companyAuth.me);
router.get('/jobs', companyJobs.list);
const jobValidators = [
  body('title').trim().notEmpty().withMessage('Title is required'),
  body('description').trim().notEmpty().withMessage('Description is required'),
  body('location').trim().notEmpty().withMessage('Location is required'),
  body('employment_type').trim().notEmpty().withMessage('Employment type is required'),
  body('skills').custom((v) => {
    const arr = Array.isArray(v) ? v : String(v || '').split(',');
    if (!arr.map((s) => String(s).trim()).filter(Boolean).length) throw new Error('At least one required skill must be provided');
    return true;
  }),
];
router.post('/jobs', jobValidators, validate, companyJobs.create);
router.get('/jobs/:id', [param('id').isUUID().withMessage('Job ID must be a valid UUID')], validate, companyJobs.loadOwnJob, companyJobs.get);
router.put('/jobs/:id', [
  param('id').isUUID().withMessage('Job ID must be a valid UUID'),
], validate, companyJobs.loadOwnJob, jobValidators, validate, companyJobs.update);
router.delete('/jobs/:id', [param('id').isUUID().withMessage('Job ID must be a valid UUID')], validate, companyJobs.loadOwnJob, companyJobs.remove);
router.get('/applications', companyApps.list);
router.put('/applications/:id/status', [
  param('id').isUUID().withMessage('Application ID must be a valid UUID'),
  body('status').trim().notEmpty().withMessage('Status is required'),
], validate, companyApps.updateStatus);

module.exports = router;
