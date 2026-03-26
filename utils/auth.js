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

// Task 1: FIX STUDENT AUTH MIDDLEWARE
function verifyStudent(req) {
    const authHeader = req.headers.authorization || req.headers.Authorization;
    if (!authHeader) return null;
    const token = authHeader.split(" ")[1];
    const secret = process.env.JWT_SECRET || "geoattend_secret_key";
    try {
        const decoded = jwt.verify(token, secret);
        // Allow both students and admins to view student dash if they have a token
        if (decoded.role !== "student" && decoded.role !== "admin") return null;
        return decoded;
    } catch (err) {
        return null;
    }
}

const protectAdmin = async (req) => {
    const user = await authenticateRequest(req, 'admins');
    if (user && user.role === 'admin') return user;
    return null;
};

const protectStudent = async (req) => {
    const decoded = verifyStudent(req);
    if (!decoded) return null;
    
    // Attach to request as fallback or for DB lookup
    req.student = decoded;
    
    try {
        const { query } = require('../api/utils/db.js');
        const result = await query("SELECT * FROM students WHERE id = $1", [decoded.id]);
        if (result.rows.length > 0) {
            const user = result.rows[0];
            if (!user.college_code && user.collegeCode) user.college_code = user.collegeCode;
            user.role = 'student';
            req.student = user;
            return user;
        }
    } catch (e) { console.error("protectStudent DB err:", e.message); }
    
    return decoded; // Return token data if DB fails
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
        const college_code = decoded.college_code || decoded.collegeCode || '';
        const userId = decoded.id;
        const email = decoded.email || '';
        const role = decoded.role || '';

        try {
            const { query } = require('../api/utils/db.js');
            let userQuery = await query(`SELECT * FROM ${tableName} WHERE id = $1`, [userId]);
            
            if (!userQuery.rows[0] && email) {
                userQuery = await query(`SELECT * FROM ${tableName} WHERE email = $1`, [email]);
            }

            if (userQuery.rows[0]) {
                const user = userQuery.rows[0];
                if (!user.college_code && user.collegeCode) user.college_code = user.collegeCode;
                user.role = role;
                
                if (tableName === 'admins') req.admin = user;
                else req.student = user;
                
                return user;
            }
        } catch (dbErr) {
            console.error(`[Auth] DB lookup failed:`, dbErr.message);
        }

        const fallbackUser = { id: userId, email, college_code, role, _fromToken: true };
        if (tableName === 'admins') req.admin = fallbackUser;
        else req.student = fallbackUser;
        
        return fallbackUser;

    } catch (error) {
        return null;
    }
};

module.exports = { generateToken, hashPassword, comparePassword, protectAdmin, protectStudent, verifyStudent };
