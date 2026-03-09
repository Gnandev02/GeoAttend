const { query } = require('./utils/db');
const { protectAdmin } = require('./utils/auth');
const bcrypt = require('bcryptjs');

module.exports = async (req, res) => {
    // Handle CORS preflight
    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    if (req.method !== 'POST') {
        return res.status(405).json({ message: 'Method Not Allowed' });
    }

    const admin = await protectAdmin(req);
    if (!admin) {
        return res.status(401).json({ message: 'Not authorized as an admin' });
    }

    try {
        const studentName = req.body.studentName || req.body.name;
        const { rollNumber, email, password, department } = req.body;

        if (!studentName || !email || !password || !rollNumber) {
            return res.status(400).json({ message: 'Please provide all required fields' });
        }

        const studentExists = await query('SELECT * FROM students WHERE email = $1', [email]);
        if (studentExists.rows.length > 0) return res.status(400).json({ message: 'Student email already exists' });

        const rollExists = await query('SELECT * FROM students WHERE roll_number = $1 AND college_code = $2', [rollNumber, admin.college_code]);
        if (rollExists.rows.length > 0) return res.status(400).json({ message: 'Roll number already exists in this college' });

        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        const newStudent = await query(
            'INSERT INTO students (name, email, password, roll_number, department, college_code) VALUES ($1, $2, $3, $4, $5, $6) RETURNING *',
            [studentName, email, hashedPassword, rollNumber, department || 'General', admin.college_code]
        );

        return res.status(201).json({ message: 'Student created successfully', student: newStudent.rows[0] });
    } catch (error) {
        console.error("Create Student Error:", error);
        return res.status(500).json({ message: error.message || 'Internal Server Error' });
    }
};
