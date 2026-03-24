const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');

const generateToken = (id, college_code) => {
    const secret = process.env.JWT_SECRET || "geoattend_secret_key";
    return jwt.sign({ id, college_code }, secret, {
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
    const secret = process.env.JWT_SECRET || "geoattend_secret_key";
    
    try {
        const decoded = jwt.verify(token, secret);
        
        // Normalize college_code from either naming convention
        const college_code = decoded.college_code || decoded.collegeCode || '';
        const userId = decoded.id;

        // Set request context regardless of DB result
        if (tableName === 'admins') {
            req.admin = { id: userId, college_code };
        } else {
            req.student = { id: userId, college_code };
        }

        // Try DB lookup to get full user row (e.g. for password checks)
        try {
            const { query } = require('../api/utils/db.js');
            const userQuery = await query(`SELECT * FROM ${tableName} WHERE id = $1`, [userId]);
            if (userQuery.rows[0]) {
                const user = userQuery.rows[0];
                // Ensure snake_case college_code
                if (!user.college_code && user.collegeCode) user.college_code = user.collegeCode;
                return user;
            }
        } catch (dbErr) {
            console.error(`[Auth] DB lookup for ${tableName} failed:`, dbErr.message);
        }

        // Fallback: return user object constructed from token payload alone
        // This allows the app to work even if DB lookup fails
        console.warn(`[Auth] Returning token-only user for ${tableName} id=${userId}`);
        return { id: userId, college_code, _fromToken: true };

    } catch (error) {
        console.error(`[Auth] ${tableName} JWT verification failed:`, error.message);
        return null;
    }
};

module.exports = { generateToken, hashPassword, comparePassword, protectAdmin, protectStudent };
