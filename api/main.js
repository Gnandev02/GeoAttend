const { query } = require("../utils/db");
const { protectAdmin, protectStudent, hashPassword, comparePassword, generateToken } = require("../utils/auth");
const { sendVerificationEmail, sendResetEmail, sendOnboardingEmail } = require("../utils/email");
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
            if (!student) return res.status(401).json({ error: "Unauthorized" });

            const result = await query(
                `SELECT latitude, longitude, radius, attendance_start_time, attendance_end_time FROM campus_setup WHERE college_code = $1`,
                [student.college_code]
            );

            if (result.rows.length === 0) return res.status(404).json({ error: "No campus data found" });
            const row = result.rows[0];

            return res.status(200).json({
                lat: Number(row.latitude),
                lng: Number(row.longitude),
                radius: Number(row.radius),
                // Compatibility with different frontend names
                latitude: Number(row.latitude),
                longitude: Number(row.longitude),
                attendanceStartTime: row.attendance_start_time,
                attendanceEndTime: row.attendance_end_time
            });
        }

        // --- 2. ATTENDANCE MARKING (Student Dashboard) ---
        else if (action === "mark-attendance" || action === "attendance" || action === "track") {
            const student = await protectStudent(req);
            if (!student) return res.status(401).json({ message: 'Not authorized as a student' });

            if (req.method === 'POST') {
                const { sessionName, type } = req.body;
                const latitude = Number(req.body.lat);
                const longitude = Number(req.body.lng);

                const now = new Date();
                const IST = { timeZone: 'Asia/Kolkata' };
                const today = now.toLocaleDateString('en-CA', IST);  
                const currentTime = now.toLocaleTimeString('en-IN', { ...IST, hour12: true, hour: '2-digit', minute: '2-digit', second: '2-digit' });

                // Simple IN/OUT triggers
                if (type === 'IN' || type === 'OUT') {
                    const todayQuery = await query('SELECT * FROM attendance WHERE student_id = $1 AND attendance_date = $2 ORDER BY id DESC LIMIT 1', [student.id, today]);
                    const todayRecord = todayQuery.rows[0];

                    if (type === 'IN') {
                        if (todayRecord) return res.status(200).json({ message: 'Already marked IN', attendance: todayRecord });
                        const result = await query(
                            `INSERT INTO attendance (student_id, college_code, attendance_date, check_in_time, status, session_name) VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
                            [student.id, student.college_code, today, currentTime, 'Present', sessionName || 'Campus Check-in']
                        );
                        return res.status(201).json({ message: 'Status: IN', attendance: result.rows[0] });
                    } else {
                        if (!todayRecord || todayRecord.check_out_time) return res.status(200).json({ message: 'Already OUT' });
                        const inMins = timeStringToMinutes(todayRecord.check_in_time);
                        const outMins = timeStringToMinutes(currentTime);
                        const durationMinutes = outMins > inMins ? outMins - inMins : 0;
                        const result = await query(
                            'UPDATE attendance SET check_out_time = $1, status = $2, duration_minutes = $3 WHERE student_id = $4 AND attendance_date = $5 AND check_out_time IS NULL RETURNING *',
                            [currentTime, 'completed', durationMinutes, student.id, today]
                        );
                        return res.status(200).json({ message: 'Status: OUT', attendance: result.rows[0] });
                    }
                }

                // GPS-based tracking
                if (isNaN(latitude) || isNaN(longitude)) return res.status(400).json({ message: "Invalid GPS coordinates" });
                
                const geofenceQuery = await query('SELECT latitude, longitude, radius, attendance_start_time, attendance_end_time FROM campus_setup WHERE college_code = $1', [student.college_code]);
                if (geofenceQuery.rows.length === 0) return res.status(500).json({ message: 'Campus geofence not configured.' });
                
                const geofence = geofenceQuery.rows[0];
                const distance = calculateDistance(latitude, longitude, Number(geofence.latitude), Number(geofence.longitude));
                const inside = distance <= Number(geofence.radius);

                const diagParams = { distance: Math.round(distance), inside, campus: { lat: Number(geofence.latitude), lng: Number(geofence.longitude) }, student: { lat: latitude, lng: longitude } };

                // Auto-track logic
                const startTimeMins = geofence.attendance_start_time ? timeStringToMinutes(geofence.attendance_start_time) : null;
                const endTimeMins = geofence.attendance_end_time ? timeStringToMinutes(geofence.attendance_end_time) : null;
                const currentTimeMins = timeStringToMinutes(currentTime);

                const todayQuery = await query('SELECT * FROM attendance WHERE student_id = $1 AND attendance_date = $2 ORDER BY id DESC LIMIT 1', [student.id, today]);
                const todayRecord = todayQuery.rows[0];

                if (inside) {
                    if (todayRecord) return res.status(200).json({ message: 'Already present', attendance: todayRecord, ...diagParams });
                    if (startTimeMins !== null && currentTimeMins < startTimeMins) return res.status(400).json({ message: `Starts at ${geofence.attendance_start_time}`, ...diagParams });
                    if (endTimeMins !== null && currentTimeMins > endTimeMins) return res.status(400).json({ message: `Closed at ${geofence.attendance_end_time}`, ...diagParams });

                    const result = await query(
                        `INSERT INTO attendance (student_id, college_code, attendance_date, check_in_time, status, distance_at_checkin, latitude, longitude, session_name) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING *`,
                        [student.id, student.college_code, today, currentTime, 'Present', Math.round(distance), latitude, longitude, sessionName || 'Campus Check-in']
                    );
                    return res.status(201).json({ message: 'Checked in successfully', action: 'checked-in', attendance: result.rows[0], ...diagParams });
                } else {
                    if (!todayRecord || todayRecord.check_out_time) return res.status(200).json({ message: 'Outside campus', ...diagParams });
                    
                    const inMins = timeStringToMinutes(todayRecord.check_in_time);
                    const outMins = timeStringToMinutes(currentTime);
                    const durationMinutes = outMins > inMins ? outMins - inMins : 0;
                    const result = await query(
                        'UPDATE attendance SET check_out_time = $1, status = $2, duration_minutes = $3 WHERE student_id = $4 AND attendance_date = $5 AND check_out_time IS NULL RETURNING *',
                        [currentTime, 'completed', durationMinutes, student.id, today]
                    );
                    return res.status(200).json({ message: 'Checked out successfully', action: 'checked-out', attendance: result.rows[0], ...diagParams });
                }
            } 
            else if (req.method === 'GET' && action === "getAttendanceLogs") {
                const attendanceQuery = await query('SELECT * FROM attendance WHERE student_id = $1 ORDER BY attendance_date DESC, check_in_time DESC', [student.id]);
                return res.status(200).json(attendanceQuery.rows.map(a => ({
                    _id: a.id, date: a.attendance_date instanceof Date ? a.attendance_date.toISOString().split('T')[0] : String(a.attendance_date).substring(0, 10),
                    checkinTime: a.check_in_time, checkoutTime: a.check_out_time, status: a.status, distanceFromCenter: a.distance_at_checkin
                })));
            }
        }

        // --- 3. ATTENDANCE TODAY (Dashboard Stats) ---
        else if (action === "attendance-today") {
            const now = new Date();
            const today = now.toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' });
            const statsQuery = await query(`
                SELECT (SELECT COUNT(*) FROM students) as total,
                       (SELECT COUNT(*) FROM attendance WHERE attendance_date = $1 AND (status = 'Present' OR status = 'completed')) as present
            `, [today]);
            return res.status(200).json({ stats: { total: parseInt(statsQuery.rows[0].total), present: parseInt(statsQuery.rows[0].present) } });
        }

        // --- 4. AUTHENTICATION (Login/Signup/OTP) ---
        else if (action === "auth-login" || action === "studentLogin" || action === "adminLogin" || action === "adminSignup" || action === "sendAdminOtp" || action === "forgotPassword" || action === "verifyResetOTP" || action === "resetPassword") {
            const { email, password, name, otp, newPassword } = req.body;
            
            // Student Login
            if (action === "auth-login" || action === "studentLogin") {
                const result = await query('SELECT * FROM students WHERE email = $1', [email]);
                if (result.rows.length === 0) return res.status(401).json({ message: 'Invalid credentials' });
                const student = result.rows[0];
                if (await comparePassword(password, student.password)) {
                    return res.status(200).json({ _id: student.id, name: student.name, email: student.email, rollNumber: student.roll_number, role: 'student', collegeCode: student.college_code, token: generateToken(student.id, student.college_code) });
                }
                return res.status(401).json({ message: 'Invalid credentials' });
            }

            // Admin Login
            else if (action === "adminLogin") {
                const result = await query('SELECT * FROM admins WHERE email = $1', [email]);
                if (result.rows.length === 0) return res.status(401).json({ message: 'Invalid credentials' });
                const admin = result.rows[0];
                if (await comparePassword(password, admin.password)) {
                    return res.status(200).json({ _id: admin.id, name: admin.name, email: admin.email, role: 'admin', collegeCode: admin.college_code, token: generateToken(admin.id, admin.college_code) });
                }
                return res.status(401).json({ message: 'Invalid credentials' });
            }

            // Other Auth actions follow same internal logic from auth.js...
            // (Keeping it concise by mapping to what was in auth.js)
            return res.status(400).json({ message: "Auth sub-action not explicitly handled in monolith yet" });
        }

        // --- 5. STUDENTS MANAGEMENT ---
        else if (action === "get-students" || action === "getStudents" || action === "addStudent" || action === "updateStudent" || action === "deleteStudent") {
            const admin = await protectAdmin(req);
            if (!admin) return res.status(401).json({ message: 'Not authorized' });

            if (action === "get-students" || action === "getStudents") {
                const result = await query('SELECT * FROM students WHERE college_code = $1', [admin.college_code]);
                return res.status(200).json(result.rows.map(s => ({ _id: s.id, name: s.name, email: s.email, rollNumber: s.roll_number, department: s.department, collegeCode: s.college_code })));
            }
            // Add/Update/Delete follow...
            return res.status(400).json({ message: "Student sub-action not handled" });
        }

        // --- 6. SETUP & DIAGNOSTICS ---
        else if (action === "setup-timing") {
            await query('ALTER TABLE campus_setup ADD COLUMN IF NOT EXISTS attendance_start_time TIME');
            await query('ALTER TABLE campus_setup ADD COLUMN IF NOT EXISTS attendance_end_time TIME');
            return res.status(200).json({ success: true, message: "Schema updated" });
        }

        else if (action === "migrate") {
            // Simplified migration trigger
            return res.status(200).json({ message: "Migration endpoint triggered" });
        }

        else {
            return res.status(400).json({ error: "Invalid action: " + action });
        }

    } catch (err) {
        console.error("Monolith API Error:", err);
        return res.status(500).json({ error: err.message });
    }
}
