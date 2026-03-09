const { query } = require('./utils/db');
const { protectStudent } = require('./utils/auth');

module.exports = async (req, res) => {
    // Handle CORS preflight
    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    if (req.method !== 'GET') {
        return res.status(405).json({ message: 'Method Not Allowed' });
    }

    const student = await protectStudent(req);
    if (!student) {
        return res.status(401).json({ message: 'Not authorized' });
    }

    try {
        const studentQuery = await query('SELECT id, name, email, roll_number, department, college_code FROM students WHERE id = $1', [student.id]);

        if (studentQuery.rows.length === 0) {
            return res.status(404).json({ message: 'Student profile not found' });
        }

        const studentProfile = studentQuery.rows[0];

        return res.status(200).json({
            _id: studentProfile.id,
            name: studentProfile.name,
            email: studentProfile.email,
            rollNumber: studentProfile.roll_number,
            department: studentProfile.department,
            collegeCode: studentProfile.college_code
        });
    } catch (error) {
        console.error("Student Profile Error:", error);
        return res.status(500).json({ message: error.message || 'Internal Server Error' });
    }
};
