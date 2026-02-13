const jwt = require('jsonwebtoken');
const APIError = require('../utils/APIError');
const { getDb } = require('../config/db');

const authenticate = (req, res, next) => {
    try {
        const authHeader = req.headers.authorization;

        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            throw new APIError('Authentication required. Please log in.', 401);
        }

        const token = authHeader.split(' ')[1];

        if (!token) {
            throw new APIError('Authentication required. Please log in.', 401);
        }

        const decoded = jwt.verify(token, process.env.JWT_SECRET);

        // Verify user still exists in database
        const db = getDb();
        const stmt = db.prepare('SELECT id, username, email FROM users WHERE id = ?');
        stmt.bind([decoded.id]);

        if (stmt.step()) {
            const row = stmt.getAsObject();
            req.user = {
                id: row.id,
                username: row.username,
                email: row.email,
            };
            stmt.free();
            next();
        } else {
            stmt.free();
            throw new APIError('User no longer exists.', 401);
        }
    } catch (error) {
        if (error.name === 'JsonWebTokenError') {
            return next(new APIError('Invalid token. Please log in again.', 401));
        }
        if (error.name === 'TokenExpiredError') {
            return next(new APIError('Token expired. Please log in again.', 401));
        }
        next(error);
    }
};

module.exports = authenticate;
