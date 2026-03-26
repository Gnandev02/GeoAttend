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

function verifyToken(req, expectedRole) {
    const authHeader = req.headers.authorization || req.headers.Authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) return null;
    const token = authHeader.split(" ")[1];
    const secret = process.env.JWT_SECRET || "geoattend_secret_key";
    try {
        const decoded = jwt.verify(token, secret);
        // Standardize: ensure roles match if specified
        if (expectedRole && decoded.role !== expectedRole) return null;
        return decoded;
    } catch (err) {
        return null;
    }
}

const protectAdmin = async (req) => {
    const decoded = verifyToken(req, 'admin');
    if (!decoded) return null;
    
    try {
        const { query } = require('../api/utils/db.js');
        const result = await query("SELECT * FROM admins WHERE id = $1", [decoded.id]);
        if (result.rows.length > 0) {
            const user = result.rows[0];
            user.college_code = user.college_code || user.collegeCode || '';
            user.role = 'admin';
            req.admin = user;
            return user;
        }
    } catch (e) {
        console.error("protectAdmin DB err:", e.message);
    }
    return null;
};

const protectStudent = async (req) => {
    const decoded = verifyToken(req, 'student');
    if (!decoded) return null;
    
    try {
        const { query } = require('../api/utils/db.js');
        const result = await query("SELECT * FROM students WHERE id = $1", [decoded.id]);
        if (result.rows.length > 0) {
            const user = result.rows[0];
            user.college_code = user.college_code || user.collegeCode || '';
            user.role = 'student';
            req.student = user;
            return user;
        }
    } catch (e) {
        console.error("protectStudent DB err:", e.message);
    }
    return null;
};

// For backward compatibility in some modules
const verifyStudent = (req) => verifyToken(req, 'student');

module.exports = { 
    generateToken, 
    hashPassword, 
    comparePassword, 
    protectAdmin, 
    protectStudent, 
    verifyStudent,
    verifyToken 
};
