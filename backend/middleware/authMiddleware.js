const jwt = require('jsonwebtoken');

const protectAdmin = async (req, res, next) => {
    let token;
    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
        try {
            token = req.headers.authorization.split(' ')[1];
            const decoded = jwt.verify(token, process.env.JWT_SECRET);

            const adminQuery = await req.app.locals.pool.query('SELECT id, name, email, college_name, college_code, created_at FROM admins WHERE id = $1', [decoded.id]);

            if (adminQuery.rows.length === 0) {
                return res.status(401).json({ message: 'Not authorized, admin not found' });
            }

            req.admin = adminQuery.rows[0];
            next();
        } catch (error) {
            return res.status(401).json({ message: 'Not authorized, token failed' });
        }
    } else {
        return res.status(401).json({ message: 'Not authorized, no token' });
    }
};

const protectStudent = async (req, res, next) => {
    let token;
    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
        try {
            token = req.headers.authorization.split(' ')[1];
            const decoded = jwt.verify(token, process.env.JWT_SECRET);

            const studentQuery = await req.app.locals.pool.query('SELECT id, name, email, roll_number, department, college_code FROM students WHERE id = $1', [decoded.id]);

            if (studentQuery.rows.length === 0) {
                return res.status(401).json({ message: 'Not authorized, student not found' });
            }

            req.student = studentQuery.rows[0];
            next();
        } catch (error) {
            return res.status(401).json({ message: 'Not authorized, token failed' });
        }
    } else {
        return res.status(401).json({ message: 'Not authorized, no token' });
    }
};

module.exports = { protectAdmin, protectStudent };
