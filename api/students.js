const { query } = require('./utils/db');
const { protectAdmin } = require('./utils/auth');

module.exports = async (req, res) => {
    // Handle CORS preflight
    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    if (req.method !== 'GET') {
        return res.status(405).json({ message: 'Method Not Allowed' });
    }

    const admin = await protectAdmin(req);
    if (!admin) {
        return res.status(401).json({ message: 'Not authorized as an admin' });
    }

    try {
        const studentsQuery = await query('SELECT id, name, email, roll_number, department, college_code FROM students WHERE college_code = $1', [admin.college_code]);

        const mappedStudents = studentsQuery.rows.map(s => {
            return {
                _id: s.id,
                name: s.name,
                email: s.email,
                rollNumber: s.roll_number,
                department: s.department,
                collegeCode: s.college_code,
                userId: { name: s.name, email: s.email }
            };
        });

        return res.status(200).json(mappedStudents);
    } catch (error) {
        console.error("Get Students Error:", error);
        return res.status(500).json({ message: error.message || 'Internal Server Error' });
    }
};
