const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');

const generateToken = (id, email, college_code, role) => {
    const secret = process.env.JWT_SECRET || "geoattend_secret_key";
    return jwt.sign({ id, email, college_code, role }, secret, {
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
    const user = await authenticateRequest(req, 'admins');
    if (user && user.role === 'admin') return user;
    return null;
};

const protectStudent = async (req) => {
    const user = await authenticateRequest(req, 'students');
    if (user && user.role === 'student') return user;
    return null;
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
        const email = decoded.email || '';
        const role = decoded.role || '';

        // Try DB lookup by ID
        try {
            const { query } = require('../api/utils/db.js');
            let userQuery = await query(`SELECT * FROM ${tableName} WHERE id = $1`, [userId]);
            
            // Fallback to Email if ID lookup fails
            if (!userQuery.rows[0] && email) {
                userQuery = await query(`SELECT * FROM ${tableName} WHERE email = $1`, [email]);
            }

            if (userQuery.rows[0]) {
                const user = userQuery.rows[0];
                if (!user.college_code && user.collegeCode) user.college_code = user.collegeCode;
                user.role = role; // Attach role from token
                
                // Attach to request object
                if (tableName === 'admins') req.admin = user;
                else req.student = user;
                
                return user;
            }
        } catch (dbErr) {
            console.error(`[Auth] DB lookup failed:`, dbErr.message);
        }

        // Return token-only user as fallback if JWT is valid
        const fallbackUser = { id: userId, email, college_code, role, _fromToken: true };
        if (tableName === 'admins') req.admin = fallbackUser;
        else req.student = fallbackUser;
        
        return fallbackUser;

    } catch (error) {
        return null;
    }
};

module.exports = { generateToken, hashPassword, comparePassword, protectAdmin, protectStudent };
