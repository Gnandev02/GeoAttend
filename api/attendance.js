const { query } = require("./utils/db");
const { verifyStudent } = require("../utils/auth");

export default async function handler(req, res) {
    if (req.method === 'OPTIONS') return res.status(200).end();

    // Task 2: FIX STUDENT IDENTIFICATION
    const student = verifyStudent(req);
    if (!student) {
        return res.status(401).json({ error: "Not authorized as a student" });
    }

    try {
        // Task 3: FIX STUDENT QUERY
        const result = await query(
            "SELECT * FROM students WHERE id = $1",
            [student.id]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ error: "Student not found" });
        }

        // Task 4: FIX ATTENDANCE INSERT
        // Note: Using Task 4's specific query
        await query(`
            INSERT INTO attendance (student_id, college_code, attendance_date, check_in_time, status)
            VALUES ($1, $2, CURRENT_DATE, NOW(), 'Present')
            ON CONFLICT (student_id, attendance_date)
            DO NOTHING
        `, [student.id, student.college_code]);

        return res.status(200).json({ success: true, message: "Attendance marked successfully" });

    } catch (err) {
        console.error("Attendance API Error:", err);
        return res.status(500).json({ error: err.message });
    }
}
