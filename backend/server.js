const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');

// Load env vars FIRST before anything else imports them
dotenv.config();

const initDB = require('./config/db');

const app = express();

// Initialize DB and then start server
initDB().then(pool => {
    app.locals.pool = pool;

    // Middleware
    app.use(cors({
        origin: ['http://localhost:5173', 'http://127.0.0.1:5500', 'http://localhost:5500'],
        credentials: true,
    }));
    app.use(express.json());

    // Routes
    app.use('/api/student', require('./routes/studentRoutes'));
    app.use('/api/admin', require('./routes/adminRoutes'));
    app.use('/api/attendance', require('./routes/attendanceRoutes'));

    app.get('/', (req, res) => {
        res.send('Geo-Integrated Attendance API is running...');
    });

    const PORT = process.env.PORT || 5000;

    app.listen(PORT, () => {
        console.log(`Server running on port ${PORT}`);
    });
}).catch(err => {
    console.error("Failed to start server due to DB error:", err);
    process.exit(1);
});


