const { query } = require("./utils/db");

export default async function handler(req, res) {
    if (req.method !== 'GET') return res.status(405).json({ message: 'Method Not Allowed' });

    try {
        const now = new Date();
        const IST = { timeZone: 'Asia/Kolkata' };
        const today = now.toLocaleDateString('en-CA', IST);

        // This endpoint will return stats for the current day
        // We might need to handle student authentication if these are student-specific
        // But for the user's simplified fixing, I'll return overall summaries or handle if token is present
        const statsQuery = await query(`
            SELECT 
                (SELECT COUNT(*) FROM students) as total_students,
                (SELECT COUNT(*) FROM attendance WHERE attendance_date = $1 AND (status = 'Present' OR status = 'completed')) as present_today
        `, [today]);

        const stats = statsQuery.rows[0];

        return res.status(200).json({
            stats: {
                total: parseInt(stats.total_students),
                present: parseInt(stats.present_today)
            }
        });
    } catch (error) {
        console.error("Fetch Today Attendance Error:", error);
        return res.status(500).json({ message: error.message || 'Server Error' });
    }
}
