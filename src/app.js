const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
const path = require('path');
const errorHandler = require('./middleware/errorHandler');

const app = express();

// ─── Security Middleware ───────────────────────────────────────
app.use(
    helmet({
        contentSecurityPolicy: false, // Allow inline scripts for the HTML frontend
    })
);
app.use(cors());

// ─── Rate Limiting ─────────────────────────────────────────────
const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // Limit each IP to 100 requests per window
    message: {
        success: false,
        error: 'Too many requests, please try again later.',
    },
});
app.use('/api/', limiter);

// Stricter rate limit for auth routes
const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 20, // 20 auth attempts per 15 min
    message: {
        success: false,
        error: 'Too many authentication attempts, please try again later.',
    },
});
app.use('/api/auth/', authLimiter);

// ─── Body Parsing ──────────────────────────────────────────────
app.use(express.json({ limit: '10kb' }));
app.use(express.urlencoded({ extended: true }));

// ─── Logging ───────────────────────────────────────────────────
if (process.env.NODE_ENV === 'development') {
    app.use(morgan('dev'));
}

// ─── Static Files ──────────────────────────────────────────────
app.use(express.static(path.join(__dirname, '..', 'public')));

// ─── API Routes ────────────────────────────────────────────────
const authRoutes = require('./routes/auth.routes');
const jobRoutes = require('./routes/job.routes');

app.use('/api/auth', authRoutes);
app.use('/api/jobs', jobRoutes);

// ─── Health Check ──────────────────────────────────────────────
app.get('/api/health', (req, res) => {
    res.json({
        success: true,
        message: 'Job Application Tracker API is running',
        timestamp: new Date().toISOString(),
        environment: process.env.NODE_ENV || 'development',
    });
});

// ─── Serve Frontend ────────────────────────────────────────────
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, '..', 'public', 'index.html'));
});

// ─── 404 Handler ───────────────────────────────────────────
app.use((req, res, next) => {
    if (req.originalUrl.startsWith('/api/')) {
        return res.status(404).json({
            success: false,
            error: `Route ${req.originalUrl} not found`,
        });
    }
    next();
});

// ─── Global Error Handler ──────────────────────────────────────
app.use(errorHandler);

module.exports = app;
