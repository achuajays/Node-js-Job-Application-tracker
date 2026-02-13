const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { getDb, saveDatabase } = require('../config/db');
const APIError = require('../utils/APIError');

// Generate JWT token
const generateToken = (id) => {
    return jwt.sign({ id }, process.env.JWT_SECRET, {
        expiresIn: process.env.JWT_EXPIRES_IN || '7d',
    });
};

// @desc    Register a new user
// @route   POST /api/auth/register
const register = async (req, res, next) => {
    try {
        const { username, email, password } = req.body;

        const db = getDb();

        // Check if user already exists
        const checkStmt = db.prepare('SELECT id FROM users WHERE email = ? OR username = ?');
        checkStmt.bind([email, username]);
        if (checkStmt.step()) {
            checkStmt.free();
            throw new APIError('User with this email or username already exists', 409);
        }
        checkStmt.free();

        // Hash password
        const salt = await bcrypt.genSalt(12);
        const hashedPassword = await bcrypt.hash(password, salt);

        // Insert user
        db.run(
            'INSERT INTO users (username, email, password) VALUES (?, ?, ?)',
            [username, email, hashedPassword]
        );
        saveDatabase();

        // Get the created user
        const userStmt = db.prepare('SELECT id, username, email, created_at FROM users WHERE email = ?');
        userStmt.bind([email]);
        userStmt.step();
        const user = userStmt.getAsObject();
        userStmt.free();

        // Generate token
        const token = generateToken(user.id);

        res.status(201).json({
            success: true,
            data: {
                user: {
                    id: user.id,
                    username: user.username,
                    email: user.email,
                    created_at: user.created_at,
                },
                token,
            },
        });
    } catch (error) {
        next(error);
    }
};

// @desc    Login user
// @route   POST /api/auth/login
const login = async (req, res, next) => {
    try {
        const { email, password } = req.body;

        const db = getDb();

        // Find user by email
        const stmt = db.prepare('SELECT * FROM users WHERE email = ?');
        stmt.bind([email]);

        if (!stmt.step()) {
            stmt.free();
            throw new APIError('Invalid email or password', 401);
        }

        const user = stmt.getAsObject();
        stmt.free();

        // Check password
        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            throw new APIError('Invalid email or password', 401);
        }

        // Generate token
        const token = generateToken(user.id);

        res.json({
            success: true,
            data: {
                user: {
                    id: user.id,
                    username: user.username,
                    email: user.email,
                    created_at: user.created_at,
                },
                token,
            },
        });
    } catch (error) {
        next(error);
    }
};

// @desc    Logout user (client-side token removal)
// @route   POST /api/auth/logout
const logout = (req, res) => {
    res.json({
        success: true,
        message: 'Logged out successfully. Please remove the token from client storage.',
    });
};

// @desc    Get current user profile
// @route   GET /api/auth/me
const getMe = (req, res, next) => {
    try {
        const db = getDb();
        const stmt = db.prepare('SELECT id, username, email, created_at FROM users WHERE id = ?');
        stmt.bind([req.user.id]);
        stmt.step();
        const user = stmt.getAsObject();
        stmt.free();

        // Get job stats
        const statsStmt = db.prepare(`
      SELECT 
        COUNT(*) as total_jobs,
        SUM(CASE WHEN status = 'applied' THEN 1 ELSE 0 END) as applied,
        SUM(CASE WHEN status = 'interview' THEN 1 ELSE 0 END) as interviews,
        SUM(CASE WHEN status = 'offer' THEN 1 ELSE 0 END) as offers,
        SUM(CASE WHEN status = 'rejected' THEN 1 ELSE 0 END) as rejected,
        SUM(CASE WHEN status = 'accepted' THEN 1 ELSE 0 END) as accepted
      FROM jobs WHERE user_id = ?
    `);
        statsStmt.bind([req.user.id]);
        statsStmt.step();
        const stats = statsStmt.getAsObject();
        statsStmt.free();

        res.json({
            success: true,
            data: {
                user,
                stats,
            },
        });
    } catch (error) {
        next(error);
    }
};

module.exports = { register, login, logout, getMe };
