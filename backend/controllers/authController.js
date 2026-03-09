const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');

const generateToken = (id, collegeCode) => {
    return jwt.sign({ id, collegeCode }, process.env.JWT_SECRET, {
        expiresIn: '30d',
    });
};

const matchPassword = async (enteredPassword, storedPassword) => {
    return await bcrypt.compare(enteredPassword, storedPassword);
};

const adminSignup = async (req, res) => {
    try {
        const { name, email, password, collegeName, collegeCode } = req.body;
        if (!name || !email || !password || !collegeName || !collegeCode) {
            return res.status(400).json({ message: 'Please add all fields' });
        }

        const adminExists = await req.app.locals.pool.query('SELECT * FROM admins WHERE email = $1', [email]);
        if (adminExists.rows.length > 0) return res.status(400).json({ message: 'Admin email already exists' });

        const collegeExists = await req.app.locals.pool.query('SELECT * FROM admins WHERE college_code = $1', [collegeCode]);
        if (collegeExists.rows.length > 0) return res.status(400).json({ message: 'College Code already in use' });

        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        const newAdmin = await req.app.locals.pool.query(
            'INSERT INTO admins (name, email, password, college_name, college_code) VALUES ($1, $2, $3, $4, $5) RETURNING *',
            [name, email, hashedPassword, collegeName, collegeCode]
        );

        const admin = newAdmin.rows[0];

        res.status(201).json({
            _id: admin.id,
            name: admin.name,
            email: admin.email,
            role: 'admin',
            collegeCode: admin.college_code,
            token: generateToken(admin.id, admin.college_code),
        });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

const adminLogin = async (req, res) => {
    try {
        const { email, password } = req.body;

        const adminResult = await req.app.locals.pool.query('SELECT * FROM admins WHERE email = $1', [email]);
        if (adminResult.rows.length === 0) {
            return res.status(401).json({ message: 'Invalid credentials' });
        }

        const admin = adminResult.rows[0];

        if (await matchPassword(password, admin.password)) {
            res.json({
                _id: admin.id,
                name: admin.name,
                email: admin.email,
                role: 'admin',
                collegeCode: admin.college_code,
                token: generateToken(admin.id, admin.college_code),
            });
        } else {
            res.status(401).json({ message: 'Invalid credentials' });
        }
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

const studentLogin = async (req, res) => {
    try {
        const { email, password } = req.body;

        const studentResult = await req.app.locals.pool.query('SELECT * FROM students WHERE email = $1', [email]);
        if (studentResult.rows.length === 0) {
            return res.status(401).json({ message: 'Invalid credentials' });
        }

        const student = studentResult.rows[0];

        if (await matchPassword(password, student.password)) {
            res.json({
                _id: student.id,
                name: student.name,
                email: student.email,
                rollNumber: student.roll_number,
                role: 'student',
                collegeCode: student.college_code,
                token: generateToken(student.id, student.college_code),
            });
        } else {
            res.status(401).json({ message: 'Invalid credentials' });
        }
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

module.exports = { adminSignup, adminLogin, studentLogin };
