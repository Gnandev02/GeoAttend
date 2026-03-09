const { query } = require('./utils/db');
const { comparePassword, generateToken } = require('./utils/auth');

module.exports = async (req, res) => {
    // Handle CORS preflight
    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    if (req.method !== 'POST') {
        return res.status(405).json({ message: 'Method Not Allowed' });
    }

    try {
        const { email, password } = req.body;

        const studentResult = await query('SELECT * FROM students WHERE email = $1', [email]);
        if (studentResult.rows.length === 0) {
            return res.status(401).json({ message: 'Invalid credentials' });
        }

        const student = studentResult.rows[0];

        if (await comparePassword(password, student.password)) {
            return res.status(200).json({
                _id: student.id,
                name: student.name,
                email: student.email,
                rollNumber: student.roll_number,
                role: 'student',
                collegeCode: student.college_code,
                token: generateToken(student.id, student.college_code),
            });
        } else {
            return res.status(401).json({ message: 'Invalid credentials' });
        }
    } catch (error) {
        console.error("Student Login Error:", error);
        return res.status(500).json({ message: error.message || 'Internal Server Error' });
    }
};
