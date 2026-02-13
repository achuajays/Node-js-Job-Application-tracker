const express = require('express');
const { body } = require('express-validator');
const validate = require('../middleware/validate');
const { register, login, logout, getMe } = require('../controllers/auth.controller');
const authenticate = require('../middleware/auth');

const router = express.Router();

// @route   POST /api/auth/register
router.post(
    '/register',
    [
        body('username')
            .trim()
            .isLength({ min: 3, max: 30 })
            .withMessage('Username must be between 3 and 30 characters')
            .matches(/^[a-zA-Z0-9_]+$/)
            .withMessage('Username can only contain letters, numbers, and underscores'),
        body('email')
            .isEmail()
            .withMessage('Please provide a valid email')
            .normalizeEmail(),
        body('password')
            .isLength({ min: 6 })
            .withMessage('Password must be at least 6 characters'),
    ],
    validate,
    register
);

// @route   POST /api/auth/login
router.post(
    '/login',
    [
        body('email')
            .isEmail()
            .withMessage('Please provide a valid email')
            .normalizeEmail(),
        body('password')
            .notEmpty()
            .withMessage('Password is required'),
    ],
    validate,
    login
);

// @route   POST /api/auth/logout
router.post('/logout', authenticate, logout);

// @route   GET /api/auth/me
router.get('/me', authenticate, getMe);

module.exports = router;
