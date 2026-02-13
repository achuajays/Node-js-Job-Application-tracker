const errorHandler = (err, req, res, next) => {
    let statusCode = err.statusCode || 500;
    let message = err.message || 'Internal Server Error';

    // Log error in development
    if (process.env.NODE_ENV === 'development') {
        console.error('❌ Error:', err);
    }

    // Handle specific error types
    if (err.message && err.message.includes('UNIQUE constraint failed')) {
        statusCode = 409;
        if (err.message.includes('users.email')) {
            message = 'Email already registered';
        } else if (err.message.includes('users.username')) {
            message = 'Username already taken';
        } else {
            message = 'Duplicate entry';
        }
    }

    if (err.message && err.message.includes('CHECK constraint failed')) {
        statusCode = 400;
        message = 'Invalid value provided';
    }

    res.status(statusCode).json({
        success: false,
        error: message,
        ...(process.env.NODE_ENV === 'development' && { stack: err.stack }),
    });
};

module.exports = errorHandler;
