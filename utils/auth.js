const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');

const generateToken = (id, collegeCode) => {
    return jwt.sign({ id, collegeCode }, process.env.JWT_SECRET || 'geoattend_secret_key', {
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
        return null;
    }

    const token = authHeader.split(' ')[1];
    const secret = process.env.JWT_SECRET || 'geoattend_secret_key';
    
    try {
        const decoded = jwt.verify(token, secret);
        
        // Populate req.admin or req.student as requested
        if (tableName === 'admins') {
            req.admin = decoded;
        } else {
            req.student = decoded;
        }

        // Return the user object for existing logic in main.js
        const { query } = require('./db.js');
        const userQuery = await query(`SELECT * FROM ${tableName} WHERE id = $1`, [decoded.id]);

        return userQuery.rows[0] || null;

    } catch (error) {
        console.error(`[Auth] ${tableName} verification failed for token:`, token.substring(0, 10) + "...", error.message);
        return null;
    }
};

module.exports = { generateToken, hashPassword, comparePassword, protectAdmin, protectStudent };
