const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');

const generateToken = (id, collegeCode) => {
    return jwt.sign({ id, collegeCode }, process.env.JWT_SECRET || 'fallback_secret', {
        expiresIn: '30d',
    });
};

const hashPassword = async (password) => {
    const salt = await bcrypt.genSalt(10);
    return await bcrypt.hash(password, salt);
};

const comparePassword = async (enteredPassword, hashedPassword) => {
    return await bcrypt.compare(enteredPassword, hashedPassword);
};

const protectAdmin = async (req) => {
    return authenticateRequest(req, 'admins');
};

const protectStudent = async (req) => {
    return authenticateRequest(req, 'students');
};

const authenticateRequest = async (req, tableName) => {
    const authHeader = req.headers.authorization || req.headers.Authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        console.warn(`[Auth] Missing or malformed header for ${tableName}`);
        return null;
    }

    const token = authHeader.split(' ')[1];
    
    try {
        if (!process.env.JWT_SECRET) {
            console.error("[Auth] Missing JWT_SECRET in environment");
            return null;
        }

        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        
        // Attach to request for middleware-like access
        const userProperty = tableName === 'admins' ? 'admin' : 'student';
        req[userProperty] = decoded;

        // Still return the user object for existing call sites in main.js
        const { query } = require('./db.js');
        const userQuery = await query(`SELECT * FROM ${tableName} WHERE id = $1`, [decoded.id]);

        if (userQuery.rows.length === 0) {
            console.warn(`[Auth] User ${decoded.id} not found in ${tableName}`);
            return null;
        }

        return userQuery.rows[0];

    } catch (error) {
        console.error(`[Auth] ${tableName} verification failed:`, error.message);
        return null;
    }
};

module.exports = { generateToken, hashPassword, comparePassword, protectAdmin, protectStudent };
