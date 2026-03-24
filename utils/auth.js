const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');

const SECRET = process.env.JWT_SECRET || "geoattend_secret_key";

const generateToken = (id, college_code) => {
    return jwt.sign({ id, college_code }, SECRET, {
        expiresIn: '1d',
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
    
    try {
        const decoded = jwt.verify(token, SECRET);
        
        // Ensure snake_case college_code in payload
        const college_code = decoded.college_code || decoded.collegeCode;
        
        if (tableName === 'admins') {
            req.admin = { id: decoded.id, college_code };
        } else {
            req.student = { id: decoded.id, college_code };
        }

        // Return the user object for existing logic in main.js
        const { query } = require('./db.js');
        const userQuery = await query(`SELECT * FROM ${tableName} WHERE id = $1`, [decoded.id]);
        const user = userQuery.rows[0];

        if (!user) return null;

        // Ensure user object also has snake_case college_code
        if (!user.college_code && user.collegeCode) {
            user.college_code = user.collegeCode;
        }

        return user;

    } catch (error) {
        console.error(`[Auth] ${tableName} verification failed:`, error.message);
        return null;
    }
};

module.exports = { generateToken, hashPassword, comparePassword, protectAdmin, protectStudent };
