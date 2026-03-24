const { query } = require('./utils/db');
const { protectStudent } = require('./utils/auth');

module.exports = async (req, res) => {
    if (req.method !== 'GET') return res.status(405).json({ message: 'Method Not Allowed' });

    try {
        const student = await protectStudent(req);
        if (!student) return res.status(401).json({ message: 'Not authorized' });

        const now = new Date();
        const IST = { timeZone: 'Asia/Kolkata' };
        const today = now.toLocaleDateString('en-CA', IST);

        const attendanceQuery = await query(
            'SELECT * FROM attendance WHERE student_id = $1 AND attendance_date = $2',
            [student.id, today]
        );

        const totalQuery = await query('SELECT COUNT(*) FROM attendance WHERE student_id = $1', [student.id]);
        const presentQuery = await query("SELECT COUNT(*) FROM attendance WHERE student_id = $1 AND (status = 'Present' OR status = 'completed')", [student.id]);

        return res.status(200).json({
            today: attendanceQuery.rows[0] || null,
            stats: {
                total: parseInt(totalQuery.rows[0].count),
                present: parseInt(presentQuery.rows[0].count)
            }
        });
    } catch (error) {
        console.error("Fetch Today Attendance Error:", error);
        return res.status(500).json({ message: 'Server Error' });
    }
};
