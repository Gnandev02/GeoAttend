const { query } = require("./utils/db");
const { verifyStudent } = require("../utils/auth");

export default async function handler(req, res) {
    if (req.method === 'OPTIONS') return res.status(200).end();

    const student = verifyStudent(req);
    if (!student) {
        return res.status(401).json({ error: "Not authorized as a student" });
    }

    try {
        const studentId = student.id;
        const studentCheck = await query(
            "SELECT * FROM students WHERE id = $1",
            [studentId]
        );

        const isActuallyStudent = studentCheck.rows.length > 0;

        // Student's own logs (Task 5)
        const logs = await query(`
            SELECT attendance_date as date, check_in_time as in_time, check_out_time as out_time, status
            FROM attendance
            WHERE student_id = $1
            ORDER BY attendance_date DESC
            LIMIT 5
        `, [studentId]);

        // Overall stats
        const statsQ = await query(
            `SELECT COUNT(*) as total,
                    SUM(CASE WHEN status = 'Present' OR status = 'completed' THEN 1 ELSE 0 END) as present
             FROM attendance WHERE student_id = $1`,
            [studentId]
        );
        const stats = statsQ.rows[0];

        // Today's record
        const now = new Date();
        const today = now.toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' });
        const todayQ = await query(
          `SELECT * FROM attendance WHERE student_id = $1 AND attendance_date = $2`,
          [studentId, today]
        );

        return res.status(200).json({
            success: true,
            logs: logs.rows,
            stats: { 
                total: parseInt(stats.total) || 0, 
                present: parseInt(stats.present) || 0 
            },
            today: todayQ.rows[0] ? {
                check_in_time: todayQ.rows[0].check_in_time,
                check_out_time: todayQ.rows[0].check_out_time,
                status: todayQ.rows[0].status
            } : null
        });

    } catch (err) {
        console.error("Attendance Today API Error:", err);
        return res.status(500).json({ error: err.message });
    }
}
