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
    let token;

    // Check both standard authorization header and Vercel edge cases
    const authHeader = req.headers.authorization || req.headers.Authorization;

    if (authHeader && authHeader.startsWith('Bearer')) {
        try {
            token = authHeader.split(' ')[1];
            if (!process.env.JWT_SECRET) {
                throw new Error("Missing JWT_SECRET");
            }

            const decoded = jwt.verify(token, process.env.JWT_SECRET);

            const { query } = require('./db.js');
            const userQuery = await query(`SELECT * FROM ${tableName} WHERE id = $1`, [decoded.id]);

            if (userQuery.rows.length === 0) {
                return null;
            }

            return userQuery.rows[0];

        } catch (error) {
            console.error("JWT Verification failed:", error.message);
            return null;
        }
    }

    return null;
};

module.exports = { generateToken, hashPassword, comparePassword, protectAdmin, protectStudent };
