const { query } = require("./utils/db");
const { verifyStudent } = require("../utils/auth");

export default async function handler(req, res) {
    if (req.method === 'OPTIONS') return res.status(200).end();

    // Task 2: FIX STUDENT IDENTIFICATION
    const student = verifyStudent(req);
    // Task 2: FIX STUDENT IDENTIFICATION - Allow admins to view if needed
    if (!student) {
        return res.status(401).json({ error: "Not authorized as a student" });
    }

    try {
        const studentId = student.id;
        const collegeCode = student.college_code;

        // Fetch student record just to be sure
        const result = await query("SELECT * FROM students WHERE id = $1", [studentId]);
        // If not in students, it might be an admin checking the student dash
        const isActuallyStudent = result.rows.length > 0;

        const { lat, lng } = req.body;
        if (!lat || !lng) {
            return res.status(400).json({ error: "Location coordinates required" });
        }

        // Fetch Campus Geofence (Task: use campus_setup)
        const campusRes = await query("SELECT * FROM campus_setup WHERE college_code = $1", [collegeCode]);
        if (campusRes.rows.length === 0) {
            return res.status(404).json({ error: "Campus geofence not found" });
        }
        const campus = campusRes.rows[0];

        // Haversine Distance Calculation
        const R = 6371e3; // metres
        const φ1 = lat * Math.PI/180;
        const φ2 = campus.latitude * Math.PI/180;
        const Δφ = (campus.latitude-lat) * Math.PI/180;
        const Δλ = (campus.longitude-lng) * Math.PI/180;
        const a = Math.sin(Δφ/2) * Math.sin(Δφ/2) +
                  Math.cos(φ1) * Math.cos(φ2) *
                  Math.sin(Δλ/2) * Math.sin(Δλ/2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
        const distance = R * c;

        if (distance <= campus.radius && isActuallyStudent) {
            const todayIST = new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' });
            const currentTime = new Date().toLocaleTimeString('en-GB', { timeZone: 'Asia/Kolkata', hour: '2-digit', minute: '2-digit', second: '2-digit' });

            // Task 4: FIX ATTENDANCE INSERT + UPDATE OUT TIME
            // Set both in and out to currentTime on first insert
            await query(`
                INSERT INTO attendance (student_id, college_code, attendance_date, check_in_time, check_out_time, status)
                VALUES ($1, $2, $3, $4, $4, 'Present')
                ON CONFLICT (student_id, attendance_date)
                DO UPDATE SET 
                    check_out_time = EXCLUDED.check_out_time,
                    status = 'Present'
            `, [studentId, collegeCode, todayIST, currentTime]);

            return res.status(200).json({ success: true, message: "Attendance/Out-time updated", type: "IN" });
        } else {
            return res.status(200).json({ success: true, message: distance <= campus.radius ? "Inside (Admin Viewer)" : "Outside campus", type: distance <= campus.radius ? "IN" : "OUT" });
        }

    } catch (err) {
        console.error("Attendance API Error:", err);
        return res.status(500).json({ error: err.message });
    }
}
