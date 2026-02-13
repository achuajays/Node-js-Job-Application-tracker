const express = require('express');
const { body } = require('express-validator');
const validate = require('../middleware/validate');
const authenticate = require('../middleware/auth');
const {
    getJobs,
    getJob,
    createJob,
    updateJob,
    updateJobStatus,
    deleteJob,
} = require('../controllers/job.controller');

const router = express.Router();

// All routes require authentication
router.use(authenticate);

// @route   GET /api/jobs
router.get('/', getJobs);

// @route   GET /api/jobs/:id
router.get('/:id', getJob);

// @route   POST /api/jobs
router.post(
    '/',
    [
        body('company')
            .trim()
            .notEmpty()
            .withMessage('Company name is required')
            .isLength({ max: 200 })
            .withMessage('Company name must be less than 200 characters'),
        body('position')
            .trim()
            .notEmpty()
            .withMessage('Position is required')
            .isLength({ max: 200 })
            .withMessage('Position must be less than 200 characters'),
        body('status')
            .optional()
            .isIn(['wishlist', 'applied', 'phone_screen', 'interview', 'offer', 'rejected', 'withdrawn', 'accepted'])
            .withMessage('Invalid status'),
        body('job_type')
            .optional()
            .isIn(['full-time', 'part-time', 'contract', 'internship', 'freelance'])
            .withMessage('Invalid job type'),
        body('salary_min')
            .optional({ nullable: true })
            .isInt({ min: 0 })
            .withMessage('Minimum salary must be a positive number'),
        body('salary_max')
            .optional({ nullable: true })
            .isInt({ min: 0 })
            .withMessage('Maximum salary must be a positive number'),
        body('url')
            .optional({ nullable: true })
            .isURL()
            .withMessage('Please provide a valid URL'),
        body('email')
            .optional({ nullable: true })
            .isEmail()
            .withMessage('Please provide a valid email'),
    ],
    validate,
    createJob
);

// @route   PUT /api/jobs/:id
router.put(
    '/:id',
    [
        body('company')
            .optional()
            .trim()
            .isLength({ max: 200 })
            .withMessage('Company name must be less than 200 characters'),
        body('position')
            .optional()
            .trim()
            .isLength({ max: 200 })
            .withMessage('Position must be less than 200 characters'),
        body('status')
            .optional()
            .isIn(['wishlist', 'applied', 'phone_screen', 'interview', 'offer', 'rejected', 'withdrawn', 'accepted'])
            .withMessage('Invalid status'),
        body('job_type')
            .optional()
            .isIn(['full-time', 'part-time', 'contract', 'internship', 'freelance'])
            .withMessage('Invalid job type'),
    ],
    validate,
    updateJob
);

// @route   PATCH /api/jobs/:id/status
router.patch(
    '/:id/status',
    [
        body('status')
            .notEmpty()
            .withMessage('Status is required')
            .isIn(['wishlist', 'applied', 'phone_screen', 'interview', 'offer', 'rejected', 'withdrawn', 'accepted'])
            .withMessage('Invalid status'),
    ],
    validate,
    updateJobStatus
);

// @route   DELETE /api/jobs/:id
router.delete('/:id', deleteJob);

module.exports = router;
