const { query } = require("./utils/db");
const { protectAdmin, protectStudent, hashPassword, comparePassword, generateToken } = require("../utils/auth");
const { sendVerificationEmail, sendResetEmail, sendOnboardingEmail } = require("./utils/email");
const { calculateDistance } = require("../utils/geoHelper");

// Helper for time calculation (from attendance.js)
function timeStringToMinutes(timeStr) {
    if (!timeStr) return 0;
    const match = timeStr.trim().match(/(\d+):(\d+):?(\d+)?\s*(AM|PM|am|pm)?/);
    if (!match) return 0;
    let [ , h, m, , ampm ] = match;
    h = parseInt(h);
    m = parseInt(m);
    if (ampm) {
        if (ampm.toLowerCase() === 'pm' && h < 12) h += 12;
        if (ampm.toLowerCase() === 'am' && h === 12) h = 0;
    }
    return h * 60 + m;
}

export default async function handler(req, res) {
    // CORS Headers
    res.setHeader('Access-Control-Allow-Credentials', true);
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
    res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, Authorization');

    if (req.method === 'OPTIONS') return res.status(200).end();

    const { action } = req.query;

    try {
        // --- 1. CAMPUS DATA (Student Dashboard) ---
        if (action === "get-campus" || action === "getCampus") {
            const student = await protectStudent(req);
            const admin = !student ? await protectAdmin(req) : null;
            const user = student || admin;

            if (!user) return res.status(401).json({ 
                error: "Unauthorized", 
                message: "Authentication failed. Please login again." 
            });

            const result = await query(
                `SELECT name, latitude, longitude, radius, attendance_start_time, attendance_end_time, college_code 
                 FROM campus_setup 
                 WHERE college_code = $1`,
                [user.college_code]
            );

            if (result.rows.length === 0) return res.status(200).json({}); // Return empty for new setup
            const row = result.rows[0];

            return res.status(200).json({
                name: row.name,
                lat: Number(row.latitude), // Backward compatibility
                lng: Number(row.longitude), // Backward compatibility
                latitude: Number(row.latitude),
                longitude: Number(row.longitude),
                radius: Number(row.radius),
                attendance_start_time: row.attendance_start_time,
                attendance_end_time: row.attendance_end_time,
                college_code: row.college_code
            });
        }

        // --- 2. ATTENDANCE MARKING (Student Dashboard) ---
        else if (action === "mark-attendance" || action === "attendance" || action === "track") {
            const student = await protectStudent(req);
            if (!student) return res.status(401).json({ message: 'Not authorized as a student' });

            const latitude = Number(req.body.lat);
            const longitude = Number(req.body.lng);

            // CRITICAL VALIDATION (TASK 5)
            if (isNaN(latitude) || isNaN(longitude)) {
                return res.status(400).json({ message: "Invalid GPS coordinates" });
            }

            const now = new Date();
            const IST = { timeZone: 'Asia/Kolkata' };
            const today = now.toLocaleDateString('en-CA', IST);  
            const currentTime = now.toLocaleTimeString('en-IN', { ...IST, hour12: true, hour: '2-digit', minute: '2-digit', second: '2-digit' });

            // FETCH CAMPUS SETUP (TASK 2)
            const geofenceQuery = await query(
                'SELECT latitude, longitude, radius, attendance_start_time, attendance_end_time FROM campus_setup WHERE college_code = $1', 
                [student.college_code]
            );
            if (geofenceQuery.rows.length === 0) return res.status(500).json({ message: 'Campus geofence not configured.' });
            const geofence = geofenceQuery.rows[0];

            // CALCULATE DISTANCE (TASK 3)
            const distance = calculateDistance(
                latitude,
                longitude,
                Number(geofence.latitude),
                Number(geofence.longitude)
            );

            if (distance === null) {
                return res.status(400).json({ message: "Distance calculation failed" });
            }

            const inside = distance <= Number(geofence.radius);

            // DEBUG LOGS (TASK 7)
            console.log("Student:", latitude, longitude);
            console.log("Campus:", geofence.latitude, geofence.longitude);
            console.log("Distance:", distance);

            const todayQuery = await query('SELECT * FROM attendance WHERE student_id = $1 AND attendance_date = $2 ORDER BY id DESC LIMIT 1', [student.id, today]);
            const todayRecord = todayQuery.rows[0];
            let apiAction = "none";
            let updatedAttendance = todayRecord;

            // ATTENDANCE LOGIC (TASK 4)
            if (inside) {
                // AUTO CHECK-IN
                if (!todayRecord) {
                    const result = await query(
                        `INSERT INTO attendance (student_id, college_code, attendance_date, check_in_time, status, distance_at_checkin, latitude, longitude, session_name) 
                         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING *`,
                        [student.id, student.college_code, today, currentTime, 'Present', Math.round(distance), latitude, longitude, 'Campus Check-in']
                    );
                    updatedAttendance = result.rows[0];
                    apiAction = "checked-in";
                }
            } else {
                // AUTO CHECK-OUT
                if (todayRecord && todayRecord.check_out_time === null) {
                    const inMins = timeStringToMinutes(todayRecord.check_in_time);
                    const outMins = timeStringToMinutes(currentTime);
                    const durationMinutes = outMins > inMins ? outMins - inMins : 0;
                    
                    const result = await query(
                        'UPDATE attendance SET check_out_time = $1, status = $2, duration_minutes = $3 WHERE student_id = $4 AND attendance_date = $5 AND check_out_time IS NULL RETURNING *',
                        [currentTime, 'completed', durationMinutes, student.id, today]
                    );
                    updatedAttendance = result.rows[0];
                    apiAction = "checked-out";
                }
            }

            // RESPONSE FOR FRONTEND (TASK 6)
            return res.status(200).json({
                distance,
                inside,
                action: apiAction,
                attendance: updatedAttendance
            });
        }

        // --- 3. ATTENDANCE TODAY (Student Dashboard Stats) ---
        else if (action === "attendance-today") {
            const student = await protectStudent(req);
            if (student) {
                // Per-student stats for Student Dashboard
                const now = new Date();
                const today = now.toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' });

                // Today's check-in/out record
                const todayQ = await query(
                    `SELECT * FROM attendance WHERE student_id = $1 AND attendance_date = $2 ORDER BY id DESC LIMIT 1`,
                    [student.id, today]
                );
                const todayRecord = todayQ.rows[0] || null;

                // Overall stats (total days present / total days recorded)
                const statsQ = await query(
                    `SELECT COUNT(*) as total,
                            SUM(CASE WHEN status = 'Present' OR status = 'completed' THEN 1 ELSE 0 END) as present
                     FROM attendance WHERE student_id = $1`,
                    [student.id]
                );
                const stats = statsQ.rows[0];

                return res.status(200).json({
                    stats: { 
                        total: parseInt(stats.total) || 0, 
                        present: parseInt(stats.present) || 0 
                    },
                    today: todayRecord ? {
                        check_in_time: todayRecord.check_in_time,
                        check_out_time: todayRecord.check_out_time,
                        status: todayRecord.status
                    } : null
                });
            } else {
                // Admin dashboard: school-wide counts
                const admin = await protectAdmin(req);
                const now = new Date();
                const today = now.toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' });
                const whereClause = admin ? 'AND college_code = $2' : '';
                const params = admin ? [today, admin.college_code] : [today];
                const statsQuery = await query(`
                    SELECT COUNT(DISTINCT student_id) as present
                    FROM attendance 
                    WHERE attendance_date = $1 AND (status = 'Present' OR status = 'completed') ${whereClause}
                `, params);
                const totalQ = admin
                    ? await query('SELECT COUNT(*) as total FROM students WHERE college_code = $1', [admin.college_code])
                    : await query('SELECT COUNT(*) as total FROM students');
                return res.status(200).json({ 
                    overall: { 
                        totalStudents: parseInt(totalQ.rows[0].total) || 0, 
                        Present: parseInt(statsQuery.rows[0].present) || 0 
                    } 
                });
            }
        }

        // --- 3b. ATTENDANCE LOGS (Student and Admin) ---
        else if (action === "getAttendanceLogs") {
            const student = await protectStudent(req);
            if (student) {
                // Student's own logs
                const result = await query(
                    `SELECT attendance_date as date, check_in_time as "checkinTime", check_out_time as "checkoutTime", status, duration_minutes as "durationMinutes"
                     FROM attendance WHERE student_id = $1 ORDER BY attendance_date DESC LIMIT 30`,
                    [student.id]
                );
                return res.status(200).json(result.rows);
            }

            // Admin: all logs for their college
            const admin = await protectAdmin(req);
            if (!admin) return res.status(401).json({ error: "Unauthorized" });
            const result = await query(
                `SELECT a.attendance_date as date, s.name, s.roll_number as "rollNumber",
                        a.check_in_time as "checkinTime", a.check_out_time as "checkoutTime",
                        a.status, a.duration_minutes as "durationMinutes",
                        json_build_object('name', s.name, 'rollNumber', s.roll_number) as "studentId"
                 FROM attendance a
                 JOIN students s ON s.id = a.student_id
                 WHERE a.college_code = $1
                 ORDER BY a.attendance_date DESC, a.id DESC
                 LIMIT 200`,
                [admin.college_code]
            );
            return res.status(200).json(result.rows);
        }

        // --- 4. AUTHENTICATION ---
        else if (action === "auth-login" || action === "studentLogin" || action === "adminLogin" || action === "adminSignup" || action === "sendAdminOtp" || action === "forgotPassword" || action === "verifyResetOTP" || action === "resetPassword") {
            const { email, password, name, otp, newPassword } = req.body;
            
            if (action === "auth-login" || action === "studentLogin") {
                const result = await query('SELECT * FROM students WHERE email = $1', [email]);
                if (result.rows.length === 0) return res.status(401).json({ message: 'Invalid credentials' });
                const student = result.rows[0];
                if (await comparePassword(password, student.password)) {
                    const token = generateToken(student.id, student.college_code);
                    return res.status(200).json({ 
                        success: true,
                        token,
                        _id: student.id, 
                        name: student.name, 
                        email: student.email, 
                        rollNumber: student.roll_number, 
                        role: 'student', 
                        collegeCode: student.college_code 
                    });
                }
                return res.status(401).json({ message: 'Invalid credentials' });
            }
            else if (action === "adminLogin") {
                const result = await query('SELECT * FROM admins WHERE email = $1', [email]);
                if (result.rows.length === 0) return res.status(401).json({ message: 'Invalid credentials' });
                const admin = result.rows[0];
                if (await comparePassword(password, admin.password)) {
                    const token = generateToken(admin.id, admin.college_code);
                    return res.status(200).json({ 
                        success: true,
                        token,
                        _id: admin.id, 
                        name: admin.name, 
                        email: admin.email, 
                        role: 'admin', 
                        collegeCode: admin.college_code 
                    });
                }
                return res.status(401).json({ message: 'Invalid credentials' });
            }
            return res.status(400).json({ message: "See auth logic in monolithic code" });
        }

        // --- 5. STUDENTS MANAGEMENT ---
        else if (action === "get-students" || action === "getStudents" || action === "addStudent" || action === "updateStudent" || action === "deleteStudent") {
            const admin = await protectAdmin(req);
            if (!admin) return res.status(401).json({ message: 'Not authorized as an admin' });

            if (action === "get-students" || action === "getStudents") {
                const result = await query('SELECT * FROM students WHERE college_code = $1', [admin.college_code]);
                return res.status(200).json(result.rows.map(s => ({ _id: s.id, name: s.name, email: s.email, rollNumber: s.roll_number, department: s.department, collegeCode: s.college_code, userId: { name: s.name, email: s.email } })));
            }

            if (action === "addStudent") {
                const { name, email, rollNumber, department } = req.body;
                const tempPassword = Math.random().toString(36).slice(-8);
                const hashedPassword = await hashPassword(tempPassword);
                const result = await query(
                    'INSERT INTO students (name, email, password, roll_number, department, college_code) VALUES ($1, $2, $3, $4, $5, $6) RETURNING *',
                    [name, email, hashedPassword, rollNumber, department || 'General', admin.college_code]
                );
                try {
                    await sendOnboardingEmail(email, name, tempPassword, `${req.headers.origin}/student-login.html`);
                } catch (e) { console.error("Email fail:", e); }
                return res.status(201).json({ message: 'Student added', student: result.rows[0] });
            }

            if (action === "updateStudent") {
                const { id, name, email, rollNumber, department } = req.body;
                const result = await query(
                    'UPDATE students SET name = $1, email = $2, roll_number = $3, department = $4 WHERE id = $5 AND college_code = $6 RETURNING *',
                    [name, email, rollNumber, department, id, admin.college_code]
                );
                return res.status(200).json({ message: 'Updated', student: result.rows[0] });
            }

            if (action === "deleteStudent") {
                const { id } = req.body;
                await query('DELETE FROM students WHERE id = $1 AND college_code = $2', [id, admin.college_code]);
                return res.status(200).json({ message: 'Deleted' });
            }
        }

        else if (action === "update-geofence") {
            try {
                const admin = await protectAdmin(req);
                if (!admin) {
                    return res.status(401).json({ 
                        error: "Unauthorized", 
                        message: "Admin session expired or invalid. Please login again." 
                    });
                }

                const {
                    latitude,
                    longitude,
                    radius,
                    attendance_start_time,
                    attendance_end_time
                } = req.body;

                console.log("Incoming Data:", req.body);

                if (
                    latitude === undefined ||
                    longitude === undefined ||
                    radius === undefined
                ) {
                    return res.status(400).json({ error: "Missing required fields" });
                }

                const lat = Number(latitude);
                const lng = Number(longitude);
                const rad = Number(radius);

                if (isNaN(lat) || isNaN(lng) || isNaN(rad)) {
                    return res.status(400).json({ error: "Invalid numeric values" });
                }

                const result = await query(`
                    INSERT INTO campus_setup 
                    (college_code, name, latitude, longitude, radius, attendance_start_time, attendance_end_time)
                    VALUES ($1,$2,$3,$4,$5,$6,$7)
                    ON CONFLICT (college_code)
                    DO UPDATE SET
                        name = EXCLUDED.name,
                        latitude = EXCLUDED.latitude,
                        longitude = EXCLUDED.longitude,
                        radius = EXCLUDED.radius,
                        attendance_start_time = EXCLUDED.attendance_start_time,
                        attendance_end_time = EXCLUDED.attendance_end_time
                    RETURNING *
                `, [
                    admin.college_code,
                    req.body.name || 'Main Campus',
                    lat,
                    lng,
                    rad,
                    attendance_start_time || null,
                    attendance_end_time || null
                ]);

                return res.status(200).json({
                    success: true,
                    data: result.rows[0]
                });

            } catch (error) {
                console.error("FULL ERROR:", error);
                console.error("STACK:", error.stack);

                return res.status(500).json({
                    error: "Database update failed",
                    details: error.message
                });
            }
        }
        else if (action === "change-password") {
            const student = await protectStudent(req);
            const user = student || await protectAdmin(req);
            
            if (!user) return res.status(401).json({ 
                error: "Unauthorized", 
                message: "Authentication failed. Please login again." 
            });

            const { oldPassword, newPassword } = req.body;
            if (!oldPassword || !newPassword) {
                return res.status(400).json({ error: "Missing password fields" });
            }

            const tableName = student ? 'students' : 'admins';

            const isMatch = await comparePassword(oldPassword, user.password);
            if (!isMatch) return res.status(400).json({ error: "Incorrect current password" });

            const hashedPassword = await hashPassword(newPassword);
            await query(`UPDATE ${tableName} SET password = $1 WHERE id = $2`, [hashedPassword, user.id]);

            return res.status(200).json({ message: "Password updated successfully" });
        }
        else {
            return res.status(400).json({ error: "Invalid action: " + action });
        }

    } catch (err) {
        console.error("Monolith API Error:", err);
        return res.status(500).json({ error: err.message });
    }
}
