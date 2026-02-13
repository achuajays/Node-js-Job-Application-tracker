require('dotenv').config();
const app = require('./src/app');
const { initDatabase } = require('./src/config/db');

const PORT = process.env.PORT || 3000;

// Initialize database then start server
initDatabase()
    .then(() => {
        app.listen(PORT, () => {
            console.log(`
╔══════════════════════════════════════════════════════════╗
║                                                          ║
║   🚀 Job Application Tracker API                        ║
║                                                          ║
║   Server:  http://localhost:${PORT}                       ║
║   API:     http://localhost:${PORT}/api                   ║
║   Health:  http://localhost:${PORT}/api/health             ║
║   Mode:    ${(process.env.NODE_ENV || 'development').padEnd(14)}                       ║
║                                                          ║
╚══════════════════════════════════════════════════════════╝
      `);
        });
    })
    .catch((err) => {
        console.error('❌ Failed to initialize database:', err);
        process.exit(1);
    });
