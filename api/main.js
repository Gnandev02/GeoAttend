const { query } = require("./utils/db");
const { protectAdmin, protectStudent, hashPassword, comparePassword, generateToken } = require("../utils/auth");
const { sendVerificationEmail, sendResetEmail, sendOnboardingEmail } = require("./utils/email");
const { calculateDistance, isPointInPolygon } = require("../utils/geoHelper");

function getIST() {
    const now = new Date();
    const IST = { timeZone: 'Asia/Kolkata' };
    const date = now.toLocaleDateString('en-CA', IST); // YYYY-MM-DD
    const time = now.toLocaleTimeString('en-US', { ...IST, hour12: true, hour: '2-digit', minute: '2-digit', second: '2-digit' });
    return { date, time, raw: now };
}

// Helpers for time calculation
function timeStringToMinutes(timeStr) {
    if (!timeStr) return 0;
    const str = String(timeStr).trim();
    const match = str.match(/(\d+):(\d+):?(\d+)?\s*(AM|PM|am|pm)?/);
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

/* --- HELPER: ENFORCE ABSENCES INTERNALLY --- */
async function enforceAbsences(collegeCode, studentId = null) {
    try {
        const { date: todayIST, time: currentTime } = getIST();
        const currMins = timeStringToMinutes(currentTime);

        const campusQ = await query('SELECT attendance_end_time FROM campus_setup WHERE college_code = $1', [collegeCode]);
        if (campusQ.rows.length === 0) return;
        const endMins = timeStringToMinutes(campusQ.rows[0].attendance_end_time);

        // Execute only if the end time is passed
        if (endMins > 0 && currMins > endMins) {
            if (studentId) {
                await query(`
                    INSERT INTO attendance (student_id, college_code, attendance_date, status)
                    SELECT $1, $2, $3, 'Absent'
                    WHERE NOT EXISTS (
                        SELECT 1 FROM attendance WHERE student_id = $1 AND attendance_date = $3
                    )
                `, [studentId, collegeCode, todayIST]);
            } else {
                await query(`
                    INSERT INTO attendance (student_id, college_code, attendance_date, status)
                    SELECT id, college_code, $1, 'Absent'
                    FROM students
                    WHERE college_code = $2
                      AND NOT EXISTS (
                        SELECT 1 FROM attendance a WHERE a.student_id = students.id AND a.attendance_date = $1
                      )
                `, [todayIST, collegeCode]);
            }
        }
    } catch (err) {
        console.error("Enforce absence error:", err);
    }
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
                `SELECT name, latitude, longitude, radius, attendance_start_time, attendance_end_time, college_code, polygon_coordinates 
                 FROM campus_setup 
                 WHERE college_code = $1`,
                [user.college_code]
            );

            let row;
            if (result.rows.length === 0) {
                // Return empty structure for new/unconfigured campus
                row = {
                    name: 'Main Campus',
                    latitude: null,
                    longitude: null,
                    radius: null,
                    attendance_start_time: '09:00 AM',
                    attendance_end_time: '05:00 PM',
                    college_code: user.college_code,
                    polygon_coordinates: null
                };
            } else {
                row = result.rows[0];
            }

            let collegeName = null;
            if (admin) {
                const adminRecord = await query('SELECT college_name FROM admins WHERE id = $1 OR college_code = $2 LIMIT 1', [admin.id, admin.college_code]);
                if (adminRecord.rows.length > 0) collegeName = adminRecord.rows[0].college_name;
            }

            return res.status(200).json({
                name: row.name,
                lat: Number(row.latitude), // Backward compatibility
                lng: Number(row.longitude), // Backward compatibility
                latitude: Number(row.latitude),
                longitude: Number(row.longitude),
                radius: Number(row.radius),
                attendance_start_time: row.attendance_start_time,
                attendance_end_time: row.attendance_end_time,
                college_code: row.college_code,
                college_name: collegeName,
                polygon_coordinates: row.polygon_coordinates
            });
        }

        // --- 1b. PUBLIC STATS (Landing Page) ---
        else if (action === "get-total-verified") {
            const result = await query("SELECT COUNT(id) as total FROM attendance WHERE status IN ('Present', 'Absent', 'completed')");
            return res.status(200).json({ success: true, count: parseInt(result.rows[0].total) || 0 });
        }
        else if (action === "get-system-accuracy") {
            const result = await query(`
                SELECT 
                    COUNT(*) as total_records,
                    COUNT(CASE WHEN source = 'auto' THEN 1 END) as auto_records
                FROM attendance
                WHERE status = 'Present' OR status = 'Absent' OR status = 'completed'
            `);
            const total = parseInt(result.rows[0].total_records) || 0;
            const autoCount = parseInt(result.rows[0].auto_records) || 0;
            
            if (total === 0) return res.status(200).json({ success: true, percentage: 0 });
            
            const percentage = (autoCount / total) * 100;
            return res.status(200).json({ success: true, percentage: parseFloat(percentage.toFixed(1)) });
        }
        else if (action === "get-landing-stats") {
            const studentResult = await query("SELECT COUNT(id) as total_students FROM students");
            const attendanceResult = await query(`
                SELECT 
                    COUNT(*) as total_attendance,
                    COUNT(CASE WHEN source = 'auto' THEN 1 END) as auto_attendance,
                    COUNT(CASE WHEN source = 'manual' THEN 1 END) as manual_attendance
                FROM attendance
                WHERE status IN ('Present', 'Absent', 'completed')
            `);
            
            const totalStudents = parseInt(studentResult.rows[0].total_students) || 0;
            const totalAttendance = parseInt(attendanceResult.rows[0].total_attendance) || 0;
            const autoAttendance = parseInt(attendanceResult.rows[0].auto_attendance) || 0;
            const manualAttendance = parseInt(attendanceResult.rows[0].manual_attendance) || 0;
            
            let accuracy = 0;
            if (totalAttendance > 0) {
                accuracy = parseFloat(((autoAttendance / totalAttendance) * 100).toFixed(1));
            }
            
            return res.status(200).json({
                success: true,
                total_students: totalStudents,
                total_attendance_count: totalAttendance,
                auto_attendance_count: autoAttendance,
                manual_attendance_count: manualAttendance,
                accuracy: accuracy
            });
        }

        // --- 2. ATTENDANCE MARKING / TRACKING (Unified Action) ---
        else if (action === "mark-attendance" || action === "track" || action === "attendance") {
            const student = await protectStudent(req);
            if (!student) return res.status(401).json({ success: false, message: 'Not authorized as a student' });

            const { lat, lng, accuracy } = req.body;
            const latitude = Number(lat);
            const longitude = Number(lng);
            const userAccuracy = Number(accuracy) || null;

            if (isNaN(latitude) || isNaN(longitude)) {
                return res.status(400).json({ success: false, message: "Invalid GPS coordinates" });
            }

            const { date: todayIST, time: currentTime } = getIST();

            const geofenceQuery = await query(
                'SELECT latitude, longitude, radius, attendance_start_time, attendance_end_time, polygon_coordinates FROM campus_setup WHERE college_code = $1', 
                [student.college_code]
            );
            if (geofenceQuery.rows.length === 0) return res.status(500).json({ success: false, message: 'Campus geofence not configured.' });
            const geofence = geofenceQuery.rows[0];

            let isInside = false;
            let distance = 0;
            
            if (geofence.polygon_coordinates && Array.isArray(geofence.polygon_coordinates) && geofence.polygon_coordinates.length >= 3) {
                isInside = isPointInPolygon(latitude, longitude, geofence.polygon_coordinates);
            } else {
                distance = calculateDistance(latitude, longitude, Number(geofence.latitude), Number(geofence.longitude));
                if (distance === null) return res.status(400).json({ success: false, message: "Distance calculation failed" });
                const radius = Number(geofence.radius);
                isInside = distance <= radius;
            }

            if (geofence.attendance_start_time && geofence.attendance_end_time) {
                const currMins = timeStringToMinutes(currentTime);
                const startMins = timeStringToMinutes(geofence.attendance_start_time);
                const endMins = timeStringToMinutes(geofence.attendance_end_time);

                let isTrackingHours = false;
                if (startMins <= endMins) {
                    isTrackingHours = currMins >= startMins && currMins <= endMins;
                } else {
                    isTrackingHours = currMins >= startMins || currMins <= endMins;
                }

                if (!isTrackingHours) {
                    await enforceAbsences(student.college_code, student.id);
                    return res.status(200).json({
                        success: true,
                        distance: parseFloat(distance.toFixed(2)),
                        inside: isInside,
                        action: "none",
                        tracking_inactive: true,
                        message: "Outside of allowed tracking hours"
                    });
                }
            }

            let apiAction = "none";
            
            // Fetch today's record (Task 4: ensure only one per student per day)
            const result = await query(
                'SELECT * FROM attendance WHERE student_id = $1 AND attendance_date = $2 ORDER BY id DESC LIMIT 1', 
                [student.id, todayIST]
            );
            const todayRecord = result.rows[0];

            if (isInside) {
                // IN LOGIC: Create check-in if none exists. If already checked in and marked as completed, do nothing for today.
                if (!todayRecord) {
                    await query(
                        `INSERT INTO attendance (student_id, college_code, attendance_date, check_in_time, status, location_accuracy) 
                         VALUES ($1, $2, $3, $4, $5, $6)`,
                        [student.id, student.college_code, todayIST, currentTime, 'Present', userAccuracy]
                    );
                    apiAction = "checked-in";
                } else {
                    apiAction = "none"; // Already present
                }
            } else {
                // OUT LOGIC: Update check_out_time but maintain 'Present' status
                if (todayRecord && todayRecord.status === 'Present' && todayRecord.check_out_time === null) {
                    const inMins = timeStringToMinutes(todayRecord.check_in_time);
                    const outMins = timeStringToMinutes(currentTime);
                    const durationMinutes = outMins > inMins ? outMins - inMins : 0;
                    
                    await query(
                        'UPDATE attendance SET check_out_time = $1, status = $2, duration_minutes = $3, location_accuracy = COALESCE($5, location_accuracy) WHERE id = $4',
                        [currentTime, 'Present', durationMinutes, todayRecord.id, userAccuracy]
                    );
                    apiAction = "checked-out";
                }
            }

            return res.status(200).json({
                success: true,
                distance: parseFloat(distance.toFixed(2)),
                inside: isInside,
                action: apiAction
            });
        }

        // --- ADMIN: MANUAL MARK ---
        else if (action === "manualMark") {
            const admin = await protectAdmin(req);
            if (!admin) return res.status(401).json({ success: false, message: 'Not authorized as admin' });

            const { studentId, date, checkInTime, checkOutTime } = req.body;
            if (!studentId || !date || !checkInTime) {
                return res.status(400).json({ success: false, message: 'Student ID, Date, and Check-In Time are required.' });
            }

            // Verify student belongs to admin's college
            const studentCheck = await query('SELECT id FROM students WHERE id = $1 AND college_code = $2', [studentId, admin.college_code]);
            if (studentCheck.rows.length === 0) {
                return res.status(403).json({ success: false, message: 'Student not found in your institution.' });
            }

            const existingRecord = await query('SELECT id FROM attendance WHERE student_id = $1 AND attendance_date = $2', [studentId, date]);
            
            let durationMinutes = 0;
            if (checkOutTime) {
                const inMins = timeStringToMinutes(checkInTime);
                const outMins = timeStringToMinutes(checkOutTime);
                durationMinutes = outMins > inMins ? outMins - inMins : 0;
            }

            if (existingRecord.rows.length > 0) {
                await query(`
                    UPDATE attendance 
                    SET check_in_time = $1, check_out_time = $2, duration_minutes = $3, status = 'Present', source = 'manual' 
                    WHERE id = $4
                `, [checkInTime, checkOutTime || null, durationMinutes, existingRecord.rows[0].id]);
            } else {
                await query(`
                    INSERT INTO attendance (student_id, college_code, attendance_date, check_in_time, check_out_time, status, duration_minutes, source) 
                    VALUES ($1, $2, $3, $4, $5, 'Present', $6, 'manual')
                `, [studentId, admin.college_code, date, checkInTime, checkOutTime || null, durationMinutes]);
            }

            return res.status(200).json({ success: true, message: 'Attendance marked manually.' });
        }

        // --- 3. ATTENDANCE TODAY (Stats) ---
        else if (action === "attendance-today") {
            const admin = await protectAdmin(req);
            const student = await protectStudent(req);

            if (admin && (!student || !req.headers.referer?.includes('student-dashboard'))) {
                await enforceAbsences(admin.college_code);
                const { date: todayIST } = getIST();
                
                const result = await query(
                    `SELECT 
                        a.attendance_date as date,
                        a.check_in_time as in_time,
                        a.check_out_time as out_time,
                        a.status,
                        s.name,
                        s.roll_number
                     FROM attendance a
                     JOIN students s ON a.student_id = s.id
                     WHERE a.college_code = $1
                     ORDER BY a.attendance_date DESC, a.check_in_time DESC`,
                    [admin.college_code]
                );

                const totalQ = await query('SELECT COUNT(*) as total FROM students WHERE college_code = $1', [admin.college_code]);
                // Ensure date comparison works with database date objects
                const presentToday = result.rows.filter(r => {
                    const rDate = r.date instanceof Date ? r.date.toISOString().substring(0, 10) : String(r.date).substring(0, 10);
                    return rDate === todayIST;
                }).length;

                // Task: Transform status for UI (Present/completed -> Present)
                const transformedLogs = result.rows.map(log => ({
                    ...log,
                    status: (log.status === 'completed' || log.status === 'Present') ? 'Present' : log.status
                }));

                return res.status(200).json({ 
                    success: true,
                    data: transformedLogs,
                    overall: { 
                        totalStudents: parseInt(totalQ.rows[0].total) || 0, 
                        Present: presentToday
                    } 
                });
            } else if (student) {
                await enforceAbsences(student.college_code, student.id);
                const { date: todayIST } = getIST();

                const logsQ = await query(
                    `SELECT attendance_date as date, check_in_time as in_time, check_out_time as out_time, status
                     FROM attendance WHERE student_id = $1 ORDER BY attendance_date DESC LIMIT 10`,
                    [student.id]
                );

                const todayQ = await query(
                    `SELECT * FROM attendance WHERE student_id = $1 AND attendance_date = $2 ORDER BY id DESC LIMIT 1`,
                    [student.id, todayIST]
                );
                const todayRecord = todayQ.rows[0] || null;

                const statsQ = await query(
                    `SELECT COUNT(*) as total,
                            SUM(CASE WHEN status = 'Present' THEN 1 ELSE 0 END) as present
                     FROM attendance WHERE student_id = $1`,
                    [student.id]
                );
                const stats = statsQ.rows[0];

                // Task: Transform status for UI (Present/completed -> Present)
                const transformedLogs = logsQ.rows.map(log => ({
                    ...log,
                    status: (log.status === 'completed' || log.status === 'Present') ? 'Present' : log.status
                }));

                const transformedToday = todayRecord ? {
                    ...todayRecord,
                    status: (todayRecord.status === 'completed' || todayRecord.status === 'Present') ? 'Present' : todayRecord.status
                } : null;

                return res.status(200).json({
                    success: true,
                    logs: transformedLogs,
                    stats: { 
                        total: parseInt(stats.total) || 0, 
                        present: parseInt(stats.present) || 0 
                    },
                    today: transformedToday ? {
                        check_in_time: transformedToday.check_in_time,
                        check_out_time: transformedToday.check_out_time,
                        status: transformedToday.status
                    } : null
                });
            } else {
                return res.status(401).json({ success: false, message: "Unauthorized" });
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
                return res.status(200).json({ success: true, logs: result.rows });
            }

            // Admin: all logs for their college
            const admin = await protectAdmin(req);
            if (!admin) return res.status(401).json({ success: false, message: "Unauthorized" });
            const result = await query(
                `SELECT 
                    a.attendance_date as date,
                    a.check_in_time as in_time,
                    a.check_out_time as out_time,
                    a.status,
                    s.name
                 FROM attendance a
                 JOIN students s ON a.student_id = s.id
                 WHERE a.college_code = $1
                 ORDER BY a.attendance_date DESC`,
                [admin.college_code]
            );
            return res.status(200).json({ success: true, data: result.rows });
        }

        // --- 3c. MANUAL ATTENDANCE MARK (Admin Only) ---
        else if (action === "manualMark") {
            const admin = await protectAdmin(req);
            if (!admin) return res.status(401).json({ success: false, message: "Unauthorized Admin" });

            const { studentId, date, checkInTime, checkOutTime } = req.body;
            if (!studentId || !date) return res.status(400).json({ success: false, message: "Student ID and Date are required" });

            // Verify student belongs to same college
            const checkStudent = await query('SELECT college_code FROM students WHERE id = $1', [studentId]);
            if (checkStudent.rows.length === 0) {
                return res.status(404).json({ success: false, message: "Student not found" });
            }
            const student_college_code = checkStudent.rows[0].college_code;
            if (student_college_code !== admin.college_code) {
                return res.status(403).json({ success: false, message: "Permission Denied: Student not in your college" });
            }

            let duration = 0;
            if (checkInTime && checkOutTime) {
                try {
                    duration = timeStringToMinutes(checkOutTime) - timeStringToMinutes(checkInTime);
                    if (duration < 0) duration = 0;
                } catch (e) { duration = 0; }
            }

            await query(
                `INSERT INTO attendance (student_id, college_code, attendance_date, check_in_time, check_out_time, status, duration_minutes)
                 VALUES ($1, $2, $3, $4, $5, $6, $7)
                 ON CONFLICT (student_id, attendance_date) DO UPDATE SET
                    check_in_time = EXCLUDED.check_in_time,
                    check_out_time = EXCLUDED.check_out_time,
                    status = EXCLUDED.status,
                    duration_minutes = EXCLUDED.duration_minutes`,
                [studentId, admin.college_code, date, checkInTime, checkOutTime, 'Present', duration]
            );

            return res.status(200).json({ success: true, message: "Attendance marked successfully" });
        }

        // --- 4. AUTHENTICATION ---
        else if (action === "auth-login" || action === "studentLogin" || action === "adminLogin" || action === "adminSignup" || action === "sendAdminOtp" || action === "forgotPassword" || action === "verifyResetOTP" || action === "resetPassword") {
            const { email, password, name, otp, newPassword } = req.body;
            
            if (action === "auth-login" || action === "studentLogin") {
                // Try Student Table
                let result = await query('SELECT * FROM students WHERE email = $1', [email]);
                if (result.rows.length > 0) {
                    const student = result.rows[0];
                    if (await comparePassword(password, student.password)) {
                        const token = generateToken(student.id, student.email, student.college_code, 'student');
                        return res.status(200).json({ 
                            success: true,
                            token,
                            id: student.id, 
                            name: student.name, 
                            email: student.email, 
                            rollNumber: student.roll_number, 
                            role: 'student', 
                            collegeCode: student.college_code 
                        });
                    }
                }
                
                // Fallback to Admin Table for auth-login
                if (action === "auth-login") {
                    result = await query('SELECT * FROM admins WHERE email = $1', [email]);
                    if (result.rows.length > 0) {
                        const admin = result.rows[0];
                        if (await comparePassword(password, admin.password)) {
                            const token = generateToken(admin.id, admin.email, admin.college_code, 'admin');
                            return res.status(200).json({ 
                                success: true,
                                token,
                                id: admin.id, 
                                name: admin.name, 
                                email: admin.email, 
                                role: 'admin', 
                                collegeCode: admin.college_code 
                            });
                        }
                    }
                }
                
                return res.status(401).json({ message: 'Invalid credentials' });
            }
            else if (action === "adminLogin") {
                const result = await query('SELECT * FROM admins WHERE email = $1', [email]);
                if (result.rows.length === 0) return res.status(401).json({ message: 'Invalid credentials' });
                const admin = result.rows[0];
                if (await comparePassword(password, admin.password)) {
                    const token = generateToken(admin.id, admin.email, admin.college_code, 'admin');
                    return res.status(200).json({ 
                        success: true,
                        token,
                        _id: admin.id, 
                        name: admin.name, 
                        email: admin.email, 
                        role: 'admin', 
                        collegeCode: admin.college_code,
                        collegeName: admin.college_name
                    });
                }
                return res.status(401).json({ message: 'Invalid credentials' });
            }
            else if (action === "sendAdminOtp") {
                const generatedOtp = Math.floor(100000 + Math.random() * 900000).toString();
                await query(
                    `INSERT INTO otps (email, otp, created_at) VALUES ($1, $2, CURRENT_TIMESTAMP)
                     ON CONFLICT (email) DO UPDATE SET otp = EXCLUDED.otp, created_at = CURRENT_TIMESTAMP`,
                    [email, generatedOtp]
                );
                await sendVerificationEmail(email, generatedOtp);
                return res.status(200).json({ success: true, message: 'OTP sent to email' });
            }
            else if (action === "adminSignup") {
                const otpRecord = await query('SELECT * FROM otps WHERE email = $1 AND otp = $2', [email, otp]);
                if (otpRecord.rows.length === 0) {
                    return res.status(400).json({ message: "Invalid or expired OTP" });
                }
                const hashedPassword = await hashPassword(password);
                const generatedCollegeCode = 'ORG-' + Math.random().toString(36).substring(2, 8).toUpperCase();
                
                try {
                    const result = await query(
                        'INSERT INTO admins (name, email, password, college_code) VALUES ($1, $2, $3, $4) RETURNING id, name, email, college_code',
                        [name, email, hashedPassword, generatedCollegeCode]
                    );
                    
                    // Removed default campus setup creation with dummy data
                    // Admins will now see a clean empty state and must define their campus manually.

                    await query('DELETE FROM otps WHERE email = $1', [email]);
                    return res.status(201).json({ success: true, data: result.rows[0] });
                } catch (e) {
                    console.error("Signup DB Error:", e);
                    return res.status(400).json({ message: "An account with this email already exists." });
                }
            }
            else if (action === "forgotPassword") {
                let userRecord = null;
                const adminCheck = await query('SELECT * FROM admins WHERE email = $1', [email]);
                if (adminCheck.rows.length > 0) userRecord = adminCheck.rows[0];
                else {
                    const studentCheck = await query('SELECT * FROM students WHERE email = $1', [email]);
                    if (studentCheck.rows.length > 0) userRecord = studentCheck.rows[0];
                }
                
                if (!userRecord) {
                    return res.status(400).json({ message: "Account not found" });
                }
                
                const generatedOtp = Math.floor(100000 + Math.random() * 900000).toString();
                await query(
                    `INSERT INTO otps (email, otp, created_at) VALUES ($1, $2, CURRENT_TIMESTAMP)
                     ON CONFLICT (email) DO UPDATE SET otp = EXCLUDED.otp, created_at = CURRENT_TIMESTAMP`,
                    [email, generatedOtp]
                );
                
                await sendResetEmail(email, generatedOtp);
                return res.status(200).json({ success: true, message: 'OTP sent' });
            }
            else if (action === "verifyResetOTP" || action === "resetPassword") {
                const otpRecord = await query('SELECT * FROM otps WHERE email = $1 AND otp = $2', [email, otp]);
                if (otpRecord.rows.length === 0) {
                    return res.status(400).json({ message: "Invalid or expired OTP" });
                }
                
                if (action === "verifyResetOTP") {
                    return res.status(200).json({ success: true, message: 'OTP verified' });
                }
                
                if (action === "resetPassword") {
                    const hashedPassword = await hashPassword(newPassword);
                    let updateRes = await query('UPDATE admins SET password = $1 WHERE email = $2', [hashedPassword, email]);
                    if (updateRes.rowCount === 0) {
                        updateRes = await query('UPDATE students SET password = $1 WHERE email = $2', [hashedPassword, email]);
                    }
                    if (updateRes.rowCount === 0) {
                        return res.status(400).json({ message: "User not found" });
                    }
                    
                    await query('DELETE FROM otps WHERE email = $1', [email]);
                    return res.status(200).json({ success: true, message: "Password updated successfully" });
                }
            }
            return res.status(400).json({ message: "See auth logic in monolithic code" });
        }

        // --- 5. STUDENTS MANAGEMENT ---
        else if (action === "get-students" || action === "getStudents" || action === "addStudent" || action === "updateStudent" || action === "deleteStudent") {
            const admin = await protectAdmin(req);
            if (!admin) return res.status(401).json({ message: 'Not authorized as an admin' });

            if (action === "get-students" || action === "getStudents") {
                const result = await query('SELECT * FROM students WHERE college_code = $1', [admin.college_code]);
                return res.status(200).json({ success: true, students: result.rows.map(s => ({ _id: s.id, name: s.name, email: s.email, rollNumber: s.roll_number, department: s.department, collegeCode: s.college_code, userId: { name: s.name, email: s.email } })) });
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
                return res.status(201).json({ success: true, message: 'Student added', student: result.rows[0] });
            }

            if (action === "updateStudent") {
                const { id, name, email, rollNumber, department } = req.body;
                const result = await query(
                    'UPDATE students SET name = $1, email = $2, roll_number = $3, department = $4 WHERE id = $5 AND college_code = $6 RETURNING *',
                    [name, email, rollNumber, department, id, admin.college_code]
                );
                return res.status(200).json({ success: true, message: 'Updated', student: result.rows[0] });
            }

            if (action === "deleteStudent") {
                const { id } = req.body;
                await query('DELETE FROM students WHERE id = $1 AND college_code = $2', [id, admin.college_code]);
                return res.status(200).json({ success: true, message: 'Deleted' });
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
                    attendance_end_time,
                    polygonCoordinates
                } = req.body;

                if (!admin.college_code) {
                    return res.status(400).json({ error: "Admin college code missing. Please contact support." });
                }

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
                    (college_code, name, latitude, longitude, radius, attendance_start_time, attendance_end_time, polygon_coordinates)
                    VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
                    ON CONFLICT (college_code)
                    DO UPDATE SET
                        name = EXCLUDED.name,
                        latitude = EXCLUDED.latitude,
                        longitude = EXCLUDED.longitude,
                        radius = EXCLUDED.radius,
                        attendance_start_time = EXCLUDED.attendance_start_time,
                        attendance_end_time = EXCLUDED.attendance_end_time,
                        polygon_coordinates = EXCLUDED.polygon_coordinates
                    RETURNING *
                `, [
                    admin.college_code,
                    req.body.name || 'Main Campus',
                    lat,
                    lng,
                    rad,
                    attendance_start_time || null,
                    attendance_end_time || null,
                    polygonCoordinates ? JSON.stringify(polygonCoordinates) : null
                ]);

                if (req.body.collegeName) {
                    await query('UPDATE admins SET college_name = $1 WHERE id = $2', [req.body.collegeName, admin.id]);
                }

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
        else if (action === "sendChangePasswordOtp") {
            const student = await protectStudent(req);
            const user = student || await protectAdmin(req);
            if (!user) return res.status(401).json({ error: "Unauthorized", message: "Authentication failed. Please login again." });
            if (!user.email) return res.status(400).json({ error: "User email not found" });

            const generatedOtp = Math.floor(100000 + Math.random() * 900000).toString();
            await query(
                `INSERT INTO otps (email, otp, created_at) VALUES ($1, $2, CURRENT_TIMESTAMP)
                 ON CONFLICT (email) DO UPDATE SET otp = EXCLUDED.otp, created_at = CURRENT_TIMESTAMP`,
                [user.email, generatedOtp]
            );
            
            await sendVerificationEmail(user.email, generatedOtp);
            return res.status(200).json({ success: true, message: 'OTP sent to email' });
        }
        else if (action === "change-password") {
            const student = await protectStudent(req);
            const user = student || await protectAdmin(req);
            
            if (!user) return res.status(401).json({ 
                error: "Unauthorized", 
                message: "Authentication failed. Please login again." 
            });

            const { oldPassword, newPassword, otp } = req.body;
            if (!oldPassword || !newPassword || !otp) {
                return res.status(400).json({ error: "Missing password or OTP fields" });
            }

            const otpRecord = await query('SELECT * FROM otps WHERE email = $1 AND otp = $2', [user.email, otp]);
            if (otpRecord.rows.length === 0) {
                return res.status(400).json({ error: "Invalid or expired OTP" });
            }

            const tableName = student ? 'students' : 'admins';

            const isMatch = await comparePassword(oldPassword, user.password);
            if (!isMatch) return res.status(400).json({ error: "Incorrect current password" });

            const hashedPassword = await hashPassword(newPassword);
            await query(`UPDATE ${tableName} SET password = $1 WHERE id = $2`, [hashedPassword, user.id]);

            await query('DELETE FROM otps WHERE email = $1', [user.email]);

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
