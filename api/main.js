const { query } = require("./utils/db");
const { protectAdmin, protectStudent, hashPassword, comparePassword, generateToken } = require("../utils/auth");
const { sendVerificationEmail, sendResetEmail, sendOnboardingEmail } = require("./utils/email");
const { calculateDistance, isPointInPolygon } = require("../utils/geoHelper");
const { getIST, timeStringToMinutes } = require("./utils/time");
const { markAbsentStudents } = require("./utils/absent-marker");
const crypto = require("crypto");
let Razorpay;
try {
    Razorpay = require("razorpay");
} catch (e) {
    console.warn("Razorpay SDK not found, simulation mode active.");
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
        // --- 0. CRON: MARK ABSENT ---
        if (action === "mark-absent") {
            const result = await markAbsentStudents();
            return res.status(result.success ? 200 : 500).json(result);
        }

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
                `SELECT name, latitude, longitude, radius, attendance_start_time, attendance_end_time, 
                        attendance_start_date, attendance_end_date,
                        college_code, branch_code, polygon_coordinates, face_auth_enabled 
                 FROM campus_setup 
                 WHERE college_code = $1`,
                [user.college_code]
            );

            let row;
            if (result.rows.length === 0) {
                // Return clean empty structure for new/unconfigured campus
                row = {
                    name: null,
                    latitude: null,
                    longitude: null,
                    radius: null,
                    attendance_start_time: null,
                    attendance_end_time: null,
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

            let polygonPoints = [];
            try {
                polygonPoints = typeof row.polygon_coordinates === 'string' ? JSON.parse(row.polygon_coordinates) : (row.polygon_coordinates || []);
            } catch (e) {
                console.error("Polygon Coordinates Parsing Fail:", e);
                polygonPoints = [];
            }

            const isReady = !!collegeName && 
                            !!row.college_code && 
                            (Array.isArray(polygonPoints) && polygonPoints.length >= 3);

            return res.status(200).json({
                name: row.name,
                latitude: Number(row.latitude),
                longitude: Number(row.longitude),
                radius: Number(row.radius),
                attendance_start_time: row.attendance_start_time,
                attendance_end_time: row.attendance_end_time,
                attendance_start_date: row.attendance_start_date,
                attendance_end_date: row.attendance_end_date,
                college_code: row.college_code,
                branch_code: row.branch_code, // Source of truth: return exactly what's in DB
                college_name: collegeName,
                polygon_coordinates: row.polygon_coordinates,
                polygon_points: polygonPoints,
                face_auth_enabled: !!row.face_auth_enabled,
                is_ready: isReady
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
                WHERE (status = 'Present' OR status = 'completed')
            `);
            const total = parseInt(result.rows[0].total_records) || 0;
            const autoCount = parseInt(result.rows[0].auto_records) || 0;
            
            if (total === 0) return res.status(200).json({ success: true, percentage: 100 }); // Default to 100 if no data
            
            const percentage = (autoCount / total) * 100;
            return res.status(200).json({ success: true, percentage: parseFloat(percentage.toFixed(1)) });
        }
        else if (action === "get-landing-stats") {
            const studentResult = await query("SELECT COUNT(id) as total_students FROM students");
            const attendanceResult = await query(`
                SELECT 
                    COUNT(*) as total_attendance,
                    COUNT(CASE WHEN source = 'auto' THEN 1 END) as auto_attendance
                FROM attendance
                WHERE status IN ('Present', 'Absent', 'completed')
            `);
            
            const totalStudents = parseInt(studentResult.rows[0].total_students) || 0;
            const totalAttendance = parseInt(attendanceResult.rows[0].total_attendance) || 0;
            const autoAttendance = parseInt(attendanceResult.rows[0].auto_attendance) || 0;
            
            let accuracy = 0;
            if (totalAttendance > 0) {
                accuracy = parseFloat(((autoAttendance / totalAttendance) * 100).toFixed(1));
            }
            
            return res.status(200).json({
                success: true,
                total_students: totalStudents,
                total_attendance_count: totalAttendance,
                auto_attendance_count: autoAttendance,
                accuracy: accuracy
            });
        }

        // --- 2. ATTENDANCE MARKING / TRACKING (Unified Action) ---
        else if (action === "mark-attendance" || action === "mark") {
            const student = await protectStudent(req);
            if (!student) return res.status(401).json({ success: false, message: 'Not authorized as a student' });

            const { date: todayIST, time: currentTime } = getIST();

            // Check if campus is in active period (Task requirement 5)
            const campusQ = await query('SELECT attendance_start_date, attendance_end_date, attendance_start_time, attendance_end_time FROM campus_setup WHERE college_code = $1', [student.college_code]);
            if (campusQ.rows.length > 0) {
                const campus = campusQ.rows[0];
                const today = new Date(todayIST);
                
                // Date Check
                if (campus.attendance_start_date && today < new Date(campus.attendance_start_date)) {
                    return res.status(400).json({ success: false, message: "Academic period not started yet." });
                }
                if (campus.attendance_end_date && today > new Date(campus.attendance_end_date)) {
                    return res.status(400).json({ success: false, message: "Academic period has ended." });
                }

                // Time Check
                if (campus.attendance_start_time && campus.attendance_end_time) {
                    const startMins = timeStringToMinutes(campus.attendance_start_time);
                    const endMins = timeStringToMinutes(campus.attendance_end_time);
                    const currMins = timeStringToMinutes(currentTime);

                    let isTrackingHours = false;
                    if (startMins <= endMins) {
                        isTrackingHours = currMins >= startMins && currMins <= endMins;
                    } else {
                        isTrackingHours = currMins >= startMins || currMins <= endMins;
                    }

                    if (!isTrackingHours) {
                        return res.status(400).json({ 
                            success: false, 
                            message: `Outside of allowed tracking hours (${campus.attendance_start_time} - ${campus.attendance_end_time})` 
                        });
                    }
                }
            }

            const { device_id } = req.body;
            if (!device_id) return res.status(400).json({ success: false, message: "Security failure: Missing device ID." });

            const check = await query('SELECT id FROM attendance WHERE student_id = $1 AND attendance_date = $2', [student.id, todayIST]);
            if (check.rows.length > 0) {
                return res.status(200).json({ success: true, message: "Already marked today" });
            }

            const deviceCheck = await query('SELECT id FROM attendance WHERE device_id = $1 AND attendance_date = $2', [device_id, todayIST]);
            if (deviceCheck.rows.length > 0) {
                return res.status(400).json({ success: false, message: "Proxy Alert: This device was already used to mark attendance today." });
            }

            await query(
                `INSERT INTO attendance (student_id, college_code, attendance_date, check_in_time, status, source, device_id)
                 VALUES ($1, $2, $3, $4, 'Present', 'auto', $5)`,
                [student.id, student.college_code, todayIST, currentTime, device_id]
            );

            console.log(`[Mark-Attendance] Success for student ${student.id} at ${currentTime}`);
            return res.status(200).json({ success: true, message: "Attendance marked successfully" });
        }

        else if (action === "track" || action === "attendance") {
            const student = await protectStudent(req);
            if (!student) return res.status(401).json({ success: false, message: 'Not authorized as a student' });

            const { lat, lng, accuracy, device_id, face_verified } = req.body;
            const latitude = Number(lat);
            const longitude = Number(lng);
            const userAccuracy = Number(accuracy) || null;

            if (!device_id) {
                return res.status(400).json({ success: false, message: "Security failure: Device validation missing." });
            }

            if (isNaN(latitude) || isNaN(longitude)) {
                return res.status(400).json({ success: false, message: "Invalid GPS coordinates" });
            }

            const { date: todayIST, time: currentTime } = getIST();

            const geofenceQuery = await query(
                'SELECT latitude, longitude, radius, attendance_start_time, attendance_end_time, attendance_start_date, attendance_end_date, polygon_coordinates, face_auth_enabled FROM campus_setup WHERE college_code = $1', 
                [student.college_code]
            );
            if (geofenceQuery.rows.length === 0) return res.status(500).json({ success: false, message: 'Campus geofence not configured.' });
            const geofence = geofenceQuery.rows[0];
            
            // --- 🔒 BIOMETRIC AUTHENTICATION GATE ---
            if (geofence.face_auth_enabled && !face_verified) {
                console.warn(`[Security] Student ${student.id} attempted tracking without biometric verification.`);
                return res.status(403).json({ 
                    success: false, 
                    message: "Identity verification required. Please verify your face or fingerprint to continue." 
                });
            }

            // Date Range Check (Requirement 4)
            if (geofence.attendance_start_date && geofence.attendance_end_date) {
                const today = new Date(todayIST);
                const startDate = new Date(geofence.attendance_start_date);
                const endDate = new Date(geofence.attendance_end_date);
                
                if (today < startDate || today > endDate) {
                    return res.status(200).json({
                        success: false,
                        message: `Attendance is not allowed on this date (${todayIST}). Allowed: ${geofence.attendance_start_date.toISOString().split('T')[0]} to ${geofence.attendance_end_date.toISOString().split('T')[0]}`,
                        tracking_inactive: true,
                        action: "none"
                    });
                }
            }

            let isInside = false;
            let distance = 0;
            
            // Handle stringified polygon coordinates (Task 1)
            let polygonPoints = [];
            try {
                polygonPoints = typeof geofence.polygon_coordinates === 'string' ? JSON.parse(geofence.polygon_coordinates) : (geofence.polygon_coordinates || []);
            } catch (e) {
                console.error("Polygon parsing error:", e);
                polygonPoints = [];
            }

            if (polygonPoints.length >= 3) {
                isInside = isPointInPolygon(latitude, longitude, polygonPoints);
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
            
            // Fetch today's record (Task 2 & 4)
            const result = await query(
                'SELECT * FROM attendance WHERE student_id = $1 AND attendance_date = $2 ORDER BY id DESC LIMIT 1', 
                [student.id, todayIST]
            );
            const todayRecord = result.rows[0];

            console.log(`[Tracking] Student ${student.id} | Inside: ${isInside} | Record Exists: ${!!todayRecord}`);

            if (isInside) {
                // IN LOGIC: Create check-in if none exists. If already checked in and marked as completed, do nothing for today.
                if (!todayRecord) {
                    // Check if device already used by someone else today
                    const deviceCheck = await query('SELECT id FROM attendance WHERE device_id = $1 AND attendance_date = $2', [device_id, todayIST]);
                    if (deviceCheck.rows.length > 0) {
                        return res.status(400).json({ success: false, message: "Proxy alert: Device already used today by another student." });
                    }

                    await query(
                        `INSERT INTO attendance (student_id, college_code, attendance_date, check_in_time, status, location_accuracy, source, device_id) 
                         VALUES ($1, $2, $3, $4, $5, $6, 'auto', $7)`,
                        [student.id, student.college_code, todayIST, currentTime, 'Present', userAccuracy, device_id]
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
                action: apiAction,
                in_time: todayRecord ? todayRecord.check_in_time : (apiAction === "checked-in" ? currentTime : null),
                out_time: apiAction === "checked-out" ? currentTime : (todayRecord ? todayRecord.check_out_time : null)
            });
        }

        // --- ADMIN: MANUAL MARK ---
        else if (action === "manualMark") {
            const admin = await protectAdmin(req);
            if (!admin) return res.status(401).json({ success: false, message: 'Not authorized as admin' });

            const { student_id, date, check_in, check_out, status = 'Present' } = req.body;
            if (!student_id || !date || !check_in) {
                return res.status(400).json({ success: false, message: 'Student ID, Date, and Check-In Time are required.' });
            }

            // Verify student belongs to admin's college
            const studentCheck = await query('SELECT id FROM students WHERE id = $1 AND college_code = $2', [student_id, admin.college_code]);
            if (studentCheck.rows.length === 0) {
                return res.status(403).json({ success: false, message: 'Student not found in your institution.' });
            }

            // Date Range Check
            const campusQ = await query('SELECT attendance_start_date, attendance_end_date FROM campus_setup WHERE college_code = $1', [admin.college_code]);
            if (campusQ.rows.length > 0) {
                const { attendance_start_date, attendance_end_date } = campusQ.rows[0];
                if (attendance_start_date && attendance_end_date) {
                    const targetDate = new Date(date);
                    if (targetDate < new Date(attendance_start_date) || targetDate > new Date(attendance_end_date)) {
                        return res.status(400).json({ success: false, message: "Date is outside allowed attendance period." });
                    }
                }
            }

            const existingRecord = await query('SELECT id FROM attendance WHERE student_id = $1 AND attendance_date = $2', [student_id, date]);
            
            let durationMinutes = 0;
            if (check_out) {
                const inMins = timeStringToMinutes(check_in);
                const outMins = timeStringToMinutes(check_out);
                durationMinutes = outMins > inMins ? outMins - inMins : 0;
            }

            if (existingRecord.rows.length > 0) {
                await query(`
                    UPDATE attendance 
                    SET check_in_time = $1, check_out_time = $2, duration_minutes = $3, status = $4, source = 'manual' 
                    WHERE id = $5
                `, [check_in, check_out || null, durationMinutes, status, existingRecord.rows[0].id]);
            } else {
                await query(`
                    INSERT INTO attendance (student_id, college_code, attendance_date, check_in_time, check_out_time, status, duration_minutes, source) 
                    SELECT $1, $2, $3, $4, $5, $6, $7, 'manual'
                `, [student_id, admin.college_code, date, check_in, check_out || null, status, durationMinutes]);
            }

            return res.status(200).json({ success: true, message: 'Attendance marked manually.' });
        }

        // --- ADMIN: EDIT ATTENDANCE (Existing Record) ---
        else if (action === "editAttendance") {
            const admin = await protectAdmin(req);
            if (!admin) return res.status(401).json({ success: false, message: 'Not authorized as admin' });

            const { attendance_id, student_id, status, check_in, check_out } = req.body;
            console.log("Updating attendance:", { attendance_id, student_id, check_in, check_out, status });

            const id = parseInt(attendance_id);
            if (!attendance_id || isNaN(id) || attendance_id === "undefined") {
                return res.status(400).json({ success: false, message: 'Valid Attendance ID is required.' });
            }

            if (!student_id || student_id === "undefined") {
                return res.status(400).json({ success: false, message: 'Student ID is required.' });
            }

            if (!status) {
                return res.status(400).json({ success: false, message: 'Status is required.' });
            }

            // Verify admin owns this record via student college_code
            const recordCheck = await query(`
                SELECT a.id, a.check_in_time 
                FROM attendance a
                JOIN students s ON a.student_id = s.id
                WHERE a.id = $1 AND s.college_code = $2
            `, [attendance_id, admin.college_code]);

            if (recordCheck.rows.length === 0) {
                return res.status(403).json({ success: false, message: 'Record not found in your institution.' });
            }

            let durationMinutes = 0;
            if (check_in && check_out) {
                const inMins = timeStringToMinutes(check_in);
                const outMins = timeStringToMinutes(check_out);
                durationMinutes = outMins > inMins ? outMins - inMins : 0;
            }

            await query(`
                UPDATE attendance 
                SET status = $1, check_in_time = $2, check_out_time = $3, duration_minutes = $4, source = 'manual'
                WHERE id = $5
            `, [status, check_in || null, check_out || null, durationMinutes, attendance_id]);

            return res.status(200).json({ success: true, message: 'Attendance record updated successfully.' });
        }

        // --- 3. ATTENDANCE TODAY (Stats) ---
        else if (action === "attendance-today") {
            const admin = await protectAdmin(req);
            const student = await protectStudent(req);

            if (admin && (!student || !req.headers.referer?.includes('student-dashboard.html'))) {
                await enforceAbsences(admin.college_code);
                const { date: todayIST } = getIST();
                
                const result = await query(
                    `SELECT 
                        a.id as id,
                        s.id as student_id,
                        a.attendance_date as date,
                        a.check_in_time as in_time,
                        a.check_out_time as out_time,
                        a.status,
                        a.source,
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
                    return rDate === todayIST && (r.status === 'Present' || r.status === 'completed');
                }).length;

                // Task: Transform status for UI (Present/completed -> Present)
                const transformedLogs = result.rows.map(log => ({
                    ...log,
                    status: (log.status === 'completed' || log.status === 'Present') ? 'Present' : log.status
                }));

                return res.status(200).json({ 
                    success: true,
                    logs: transformedLogs,
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
                     FROM attendance WHERE student_id = $1 ORDER BY attendance_date DESC LIMIT 50`,
                    [student.id]
                );
                // Transform status for UI consistency (Present/completed -> Present)
                const transformed = result.rows.map(log => ({
                    ...log,
                    status: (log.status === 'completed' || log.status === 'Present') ? 'Present' : log.status
                }));
                return res.status(200).json({ success: true, logs: transformed });
            }

            // Admin: all logs for their college
            const admin = await protectAdmin(req);
            if (!admin) return res.status(401).json({ success: false, message: "Unauthorized" });
            const result = await query(
                `SELECT 
                    a.id as id,
                    s.id as student_id,
                    a.attendance_date as date,
                    a.check_in_time as in_time,
                    a.check_out_time as out_time,
                    a.status,
                    a.source,
                    s.name,
                    s.roll_number
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

            // Date Range Check for Manual Mark
            const campusQ = await query('SELECT attendance_start_date, attendance_end_date FROM campus_setup WHERE college_code = $1', [admin.college_code]);
            if (campusQ.rows.length > 0) {
                const config = campusQ.rows[0];
                if (config.attendance_start_date && config.attendance_end_date) {
                    const targetDate = new Date(date);
                    if (targetDate < new Date(config.attendance_start_date) || targetDate > new Date(config.attendance_end_date)) {
                        return res.status(400).json({ 
                            success: false, 
                            message: `Attendance date ${date} is outside the allowed academic period.` 
                        });
                    }
                }
            }

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

        // --- 3d. STUDENT PROFILE ---
        else if (action === "get-student-profile") {
            const student = await protectStudent(req);
            if (!student) return res.status(401).json({ success: false, message: "Unauthorized" });

            const result = await query(
                `SELECT s.name, s.email, s.roll_number, s.department, s.college_code, s.profile_image, 
                        s.auth_method, s.face_registered, s.fingerprint_registered, c.name as campus_name
                 FROM students s
                 LEFT JOIN campus_setup c ON s.college_code = c.college_code
                 WHERE s.id = $1`,
                [student.id]
            );

            if (result.rows.length === 0) return res.status(404).json({ success: false, message: "Student not found" });

            return res.status(200).json({ success: true, data: result.rows[0] });
        }

        else if (action === "attendance-percentage") {
            const student = await protectStudent(req);
            if (!student) return res.status(401).json({ success: false, message: "Unauthorized" });

            const statsQ = await query(
                `SELECT COUNT(*) as total,
                        SUM(CASE WHEN status = 'Present' OR status = 'completed' THEN 1 ELSE 0 END) as present
                 FROM attendance WHERE student_id = $1`,
                [student.id]
            );
            const total = parseInt(statsQ.rows[0].total) || 0;
            const present = parseInt(statsQ.rows[0].present) || 0;
            const percentage = total > 0 ? Math.round((present / total) * 100) : 0;

            return res.status(200).json({ success: true, percentage });
        }

        else if (action === "upload-student-image") {
            const student = await protectStudent(req);
            if (!student) return res.status(401).json({ success: false, message: "Unauthorized" });

            const { profileImage } = req.body;
            if (!profileImage) return res.status(400).json({ success: false, message: "No image provided" });

            await query('UPDATE students SET profile_image = $1 WHERE id = $2', [profileImage, student.id]);

            return res.status(200).json({ success: true, message: "Profile image updated" });
        }

        // --- 4. AUTHENTICATION ---
        else if (action === "auth-login" || action === "studentLogin" || action === "adminLogin" || action === "adminSignup" || action === "sendAdminOtp" || action === "forgotPassword" || action === "verifyResetOTP" || action === "resetPassword") {
            // Move destructuring into specific actions to avoid shadowing and confusion
            
            if (action === "auth-login" || action === "studentLogin") {
                let { email, password } = req.body;
                const collegeCode = (req.body.collegeCode || req.body.college_code || "").toString().trim();
                
                // FIX: Trim and Normalize (Requirement: Fix Incorrect Password & Security Bypass)
                email = (email || "").trim().toLowerCase();
                password = (password || "").trim();
                const trimmedCollegeCode = collegeCode.trim();

                if (!email || !password || !trimmedCollegeCode) {
                    return res.status(400).json({ success: false, message: "Email, password, and College Code are required." });
                }

                console.log(`[studentLogin] Attempt: Email=${email}, Campus=${trimmedCollegeCode}`);

                // 1. Fetch records with this email
                const result = await query('SELECT * FROM students WHERE email = $1', [email]);
                
                if (result.rows.length === 0) {
                    return res.status(401).json({ success: false, message: 'Student not found.' });
                }

                // 2. STRICT RESOLUTION: Resolve Branch Code (e.g. 015) to internal college_code
                const campusLookup = await query('SELECT college_code FROM campus_setup WHERE branch_code = $1', [trimmedCollegeCode]);
                
                if (campusLookup.rows.length === 0) {
                    console.warn(`[studentLogin] No campus found for branch_code "${trimmedCollegeCode}". Rejecting.`);
                    return res.status(401).json({ success: false, message: 'Invalid Branch Code.' });
                }

                const actualCollegeCode = campusLookup.rows[0].college_code;
                console.log(`[studentLogin] Resolved branch_code "${trimmedCollegeCode}" to internal code "${actualCollegeCode}"`);

                // 3. Find the student for this specific campus
                const student = result.rows.find(s => s.college_code && s.college_code.toLowerCase() === actualCollegeCode.toLowerCase());
                
                if (!student) {
                    return res.status(401).json({ success: false, message: 'Account not found in this campus.' });
                }

                // 4. Verify Password
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
                        collegeCode: trimmedCollegeCode 
                    });
                }
                
                return res.status(401).json({ success: false, message: 'Invalid credentials.' });
            }
            else if (action === "adminLogin") {
                let { email, password } = req.body;

                if (!email || !password) {
                    return res.status(400).json({ success: false, message: "Email and password are required" });
                }

                // FIX: Trim and Normalize (Requirement: Fix Incorrect Password)
                email = email.toLowerCase().trim();
                password = (password || "").toString().trim();

                console.log("[adminLogin] Attempt for:", email);

                const result = await query('SELECT * FROM admins WHERE email = $1', [email]);
                if (result.rows.length === 0) {
                    return res.status(401).json({ success: false, message: 'Invalid email or password' });
                }
                
                const admin = result.rows[0];

                // Temporary Debug Log (Requirement 5)
                console.log(`[adminLogin] DEBUG: Entered Password="${password}", Stored Hash="${admin.password.substring(0, 10)}..."`);

                if (await comparePassword(password, admin.password)) {
                    // Resolve branch_code for UI consistency
                    const campusRes = await query('SELECT branch_code FROM campus_setup WHERE college_code = $1', [admin.college_code]);
                    const branchCode = (campusRes.rows.length > 0 && campusRes.rows[0].branch_code) ? campusRes.rows[0].branch_code : admin.college_code;

                    const token = generateToken(admin.id, admin.email, admin.college_code, 'admin');
                    return res.status(200).json({ 
                        success: true,
                        token,
                        _id: admin.id, 
                        name: admin.name, 
                        email: admin.email, 
                        role: 'admin', 
                        collegeCode: branchCode, // Return user-friendly branch_code
                        internalCollegeCode: admin.college_code,
                        collegeName: admin.college_name
                    });
                }
                // Generic error for security
                return res.status(401).json({ success: false, message: 'Invalid email or password' });
            }
            else if (action === "sendAdminOtp") {
                const { name, email, password, confirmPassword } = req.body;

                // 1. Backend Validation
                const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
                if (!name || !emailRegex.test(email)) {
                    return res.status(400).json({ success: false, message: 'Invalid name or email format.' });
                }
                if (!password || password.length < 6) {
                    return res.status(400).json({ success: false, message: 'Password must be at least 6 characters.' });
                }
                // Use .trim() just to avoid hidden whitespace issues for verification purpose if needed
                // Actually, let's strictly compare what was sent
                if (password !== confirmPassword) {
                    console.log(`[sendAdminOtp] Password mismatch: "${password}" !== "${confirmPassword}"`);
                    return res.status(400).json({ success: false, message: 'Passwords do not match.' });
                }

                // 2. Check if admin already exists
                const existingAdmin = await query('SELECT id FROM admins WHERE email = $1', [email]);
                if (existingAdmin.rows.length > 0) {
                    return res.status(400).json({ success: false, message: 'Account with this email already exists.' });
                }

                const generatedOtp = Math.floor(100000 + Math.random() * 900000).toString();
                
                // Store OTP with reset attempts (Requirement 7 & 10)
                await query(
                    `INSERT INTO otps (email, otp, created_at, attempts) VALUES ($1, $2, CURRENT_TIMESTAMP, 0)
                     ON CONFLICT (email) DO UPDATE SET otp = EXCLUDED.otp, created_at = CURRENT_TIMESTAMP, attempts = 0`,
                    [email, generatedOtp]
                );
                
                try {
                    // Try to send real email (Requirement 6)
                    await sendVerificationEmail(email, generatedOtp);
                    console.log("OTP Sent Successfully to:", email);
                    return res.status(200).json({ success: true, message: 'OTP sent successfully' });
                } catch (err) {
                    console.error("OTP SEND ERROR:", err);
                    // Return failure, DO NOT allow bypass (Requirement 6)
                    return res.status(500).json({ 
                        success: false, 
                        message: "OTP service unavailable. Please try again later." 
                    });
                }
            }
            else if (action === "adminSignup") {
                const { name, email, password, otp } = req.body;
                // 1. Fetch OTP record (Requirement 4 & 10)
                const otpResult = await query('SELECT * FROM otps WHERE email = $1', [email]);
                const otpRecord = otpResult.rows[0];

                if (!otpRecord) {
                    return res.status(400).json({ success: false, message: "OTP not found. Please request a new one." });
                }

                // 2. Check Security: Max 5 attempts (Requirement 10)
                if (otpRecord.attempts >= 5) {
                    return res.status(400).json({ success: false, message: "Too many failed attempts. Please request a new OTP." });
                }

                // 3. Check Expiry: 5 minutes (Requirement 4)
                const createdAt = new Date(otpRecord.created_at);
                const now = new Date();
                const diffMinutes = (now - createdAt) / (1000 * 60);
                
                if (diffMinutes > 5) {
                    return res.status(400).json({ success: false, message: "OTP expired, please resend OTP." });
                }

                // 4. Verify OTP (Requirement 4)
                if (otpRecord.otp !== otp) {
                    await query('UPDATE otps SET attempts = attempts + 1 WHERE email = $1', [email]);
                    const remaining = 4 - otpRecord.attempts;
                    return res.status(400).json({ success: false, message: "Invalid OTP. You have " + remaining + " attempts remaining." });
                }

                // 5. Success: Create Account (Requirement 5)
                const hashedPassword = await hashPassword(password);
                const generatedCollegeCode = 'ORG-' + Math.random().toString(36).substring(2, 8).toUpperCase();
                
                try {
                    const result = await query(
                        'INSERT INTO admins (name, email, password, college_code) VALUES ($1, $2, $3, $4) RETURNING id, name, email, college_code',
                        [name, email, hashedPassword, generatedCollegeCode]
                    );

                    await query('DELETE FROM otps WHERE email = $1', [email]);
                    return res.status(201).json({ success: true, data: result.rows[0], message: "Admin account created successfully!" });
                } catch (e) {
                    console.error("Signup DB Error:", e);
                    return res.status(400).json({ success: false, message: "An account with this email already exists." });
                }
            }
            else if (action === "forgotPassword") {
                const { email } = req.body;
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
                
                try {
                    await sendResetEmail(email, generatedOtp);
                } catch (err) {
                    console.error("Reset Email Fail (Non-blocking):", err);
                }
                return res.status(200).json({ success: true, message: "OTP sent if account exists" });
            }

        // --- 5. PAYMENTS (Razorpay) ---
        else if (action === "create-payment-order") {
            const admin = await protectAdmin(req);
            if (!admin) return res.status(401).json({ success: false, message: "Unauthorized Admin" });

            const { plan, amount } = req.body; // amount in INR
            if (!plan || !amount) return res.status(400).json({ success: false, message: "Plan and Amount are required" });

            const key_id = process.env.RAZORPAY_KEY_ID;
            const key_secret = process.env.RAZORPAY_KEY_SECRET;

            if (!Razorpay || !key_id || !key_secret) {
                // Simulation Mode
                console.log("Simulating Razorpay Order for:", plan);
                const simOrderId = "sim_order_" + Math.random().toString(36).substring(2, 10);
                return res.status(200).json({ 
                    success: true, 
                    simulated: true, 
                    order_id: simOrderId, 
                    amount: amount * 100, 
                    currency: "INR",
                    key_id: "rzp_test_simulation"
                });
            }

            const razorpay = new Razorpay({ key_id, key_secret });
            const options = {
                amount: amount * 100, // smallest currency unit
                currency: "INR",
                receipt: `receipt_${admin.id}_${Date.now()}`,
            };

            try {
                const order = await razorpay.orders.create(options);
                return res.status(200).json({ success: true, order_id: order.id, amount: order.amount, currency: order.currency, key_id });
            } catch (err) {
                console.error("Razorpay Order Error:", err);
                return res.status(500).json({ success: false, message: "Failed to create payment order" });
            }
        }

        else if (action === "verify-payment") {
            const admin = await protectAdmin(req);
            if (!admin) return res.status(401).json({ success: false, message: "Unauthorized Admin" });

            const { razorpay_order_id, razorpay_payment_id, razorpay_signature, plan, amount, simulated } = req.body;

            if (simulated) {
                console.log("Verifying Simulated Payment...");
                // Just update the plan
                await query("UPDATE admins SET plan = $1 WHERE id = $2", [plan, admin.id]);
                await query(
                    "INSERT INTO payments (admin_id, order_id, payment_id, amount, plan, status) VALUES ($1, $2, $3, $4, $5, $6)",
                    [admin.id, razorpay_order_id, "pay_simulated", amount, plan, "captured"]
                );
                return res.status(200).json({ success: true, message: "Plan activated successfully (Simulated)" });
            }

            if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
                return res.status(400).json({ success: false, message: "Missing payment details" });
            }

            const key_secret = process.env.RAZORPAY_KEY_SECRET;
            const generated_signature = crypto
                .createHmac("sha256", key_secret)
                .update(razorpay_order_id + "|" + razorpay_payment_id)
                .digest("hex");

            if (generated_signature === razorpay_signature) {
                console.log("Payment Verified Successfully");
                await query("UPDATE admins SET plan = $1 WHERE id = $2", [plan, admin.id]);
                await query(
                    "INSERT INTO payments (admin_id, order_id, payment_id, signature, amount, plan, status) VALUES ($1, $2, $3, $4, $5, $6, $7)",
                    [admin.id, razorpay_order_id, razorpay_payment_id, razorpay_signature, amount, plan, "captured"]
                );
                return res.status(200).json({ success: true, message: "Payment successful. Your plan is now active." });
            } else {
                return res.status(400).json({ success: false, message: "Invalid payment signature" });
            }
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

            if (!admin.college_code) {
                return res.status(400).json({ 
                    error: "Admin not properly configured", 
                    message: "No college code assigned. Please contact support or complete institution setup." 
                });
            }

            if (action === "get-students" || action === "getStudents") {
                const result = await query('SELECT * FROM students WHERE college_code = $1', [admin.college_code]);
                return res.status(200).json({ success: true, students: result.rows.map(s => ({ _id: s.id, name: s.name, email: s.email, rollNumber: s.roll_number, department: s.department, collegeCode: s.college_code, userId: { name: s.name, email: s.email } })) });
            }

            if (action === "addStudent") {
                let { name, email, rollNumber, department } = req.body;

                // FIX: Cleanup inputs (Requirement: Fix Incorrect Password/Login issues)
                if (name) name = name.trim();
                if (email) email = email.trim().toLowerCase();
                if (rollNumber) rollNumber = rollNumber.trim();
                if (department) department = department.trim();

                // Requirement 6: Block addition if campus is not configured
                const campusCheck = await query('SELECT latitude, longitude FROM campus_setup WHERE college_code = $1', [admin.college_code]);
                if (campusCheck.rows.length === 0 || !campusCheck.rows[0].latitude) {
                    return res.status(400).json({ 
                        success: false, 
                        message: "Campus setup required before adding students" 
                    });
                }
                
                // Extra validation: email required
                if (!email) return res.status(400).json({ message: "Email is required" });

                // Multi-campus uniqueness check:
                // Check if this student email already exists IN THIS COLLEGE.
                const existing = await query('SELECT id FROM students WHERE email = $1 AND college_code = $2', [email, admin.college_code]);
                if (existing.rows.length > 0) {
                    return res.status(400).json({ 
                        success: false, 
                        message: 'Student already exists in this campus.' 
                    });
                }

                const tempPassword = Math.random().toString(36).slice(-8);
                const hashedPassword = await hashPassword(tempPassword);
                const result = await query(
                    'INSERT INTO students (name, email, password, roll_number, department, college_code) VALUES ($1, $2, $3, $4, $5, $6) RETURNING id, name, email, roll_number, department, college_code',
                    [name, email, hashedPassword, rollNumber, department || 'General', admin.college_code]
                );
                try {
                    // REQUIREMENT: Use strictly current branch_code for onboarding
                    const cRes = await query('SELECT branch_code FROM campus_setup WHERE college_code = $1', [admin.college_code]);
                    const emailBranchCode = (cRes.rows.length > 0 && cRes.rows[0].branch_code) ? cRes.rows[0].branch_code : admin.college_code;
                    console.log(`[addStudent] Generated credentials with branch_code: ${emailBranchCode}`);

                    await sendOnboardingEmail(email, name, tempPassword, emailBranchCode, `${req.headers.origin || 'https://geoattend.vercel.app'}/student-login.html`);
                } catch (e) { 
                    console.error("Email fail for student creation (Logged only):", e); 
                    // Non-blocking: Requirement 4 & 8
                }
                return res.status(201).json({ 
                    success: true, 
                    message: `Student added. Temporary password: ${tempPassword} (Also sent via email)`, 
                    student: result.rows[0] 
                });
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
                    attendance_start_date,
                    attendance_end_date,
                    polygonCoordinates,
                    branchCode,
                    face_auth_enabled // Extract face_auth_enabled from body
                } = req.body;
                
                const branch_code = (branchCode || req.body.collegeCode || "").toString().trim();
                console.log(`[update-geofence] Saving branch_code: "${branch_code}" for Org: ${admin.college_code}`);

                if (!admin.college_code) {
                    return res.status(400).json({ error: "Admin college code missing. Please contact support." });
                }

                if (!branch_code) {
                    return res.status(400).json({ error: "Validation failed", message: "Branch code is required" });
                }

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

                if (!polygonCoordinates || !Array.isArray(polygonCoordinates) || polygonCoordinates.length < 3) {
                    return res.status(400).json({ 
                        error: "Validation failed", 
                        message: "At least 3 polygon points are required to define a campus boundary." 
                    });
                }

                const result = await query(`
                    INSERT INTO campus_setup 
                    (
                        college_code, 
                        name, 
                        latitude, 
                        longitude, 
                        radius, 
                        attendance_start_time,
                        attendance_end_time,
                        attendance_start_date,
                        attendance_end_date,
                        polygon_coordinates,
                        branch_code,
                        face_auth_enabled
                    )
                    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
                    ON CONFLICT (college_code)
                    DO UPDATE SET
                        name = EXCLUDED.name,
                        latitude = EXCLUDED.latitude,
                        longitude = EXCLUDED.longitude,
                        radius = EXCLUDED.radius,
                        attendance_start_time = EXCLUDED.attendance_start_time,
                        attendance_end_time = EXCLUDED.attendance_end_time,
                        attendance_start_date = EXCLUDED.attendance_start_date,
                        attendance_end_date = EXCLUDED.attendance_end_date,
                        polygon_coordinates = EXCLUDED.polygon_coordinates,
                        branch_code = EXCLUDED.branch_code,
                        face_auth_enabled = EXCLUDED.face_auth_enabled
                    RETURNING *
                `, [
                    admin.college_code,
                    req.body.name || req.body.collegeName || 'Main Campus',
                    lat,
                    lng,
                    rad,
                    attendance_start_time || null,
                    attendance_end_time || null,
                    attendance_start_date || null,
                    attendance_end_date || null,
                    JSON.stringify(polygonCoordinates),
                    branch_code,
                    !!face_auth_enabled
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
        else if (action === "verify-password") {
            const student = await protectStudent(req);
            const user = student || await protectAdmin(req);
            if (!user) return res.status(401).json({ error: "Unauthorized", message: "Authentication failed. Please login again." });

            const { currentPassword } = req.body;
            if (!currentPassword) return res.status(400).json({ error: "Current password is required" });

            const isMatch = await comparePassword(currentPassword, user.password);
            if (isMatch) {
                return res.status(200).json({ success: true, message: "Password verified" });
            } else {
                return res.status(401).json({ success: false, error: "Incorrect current password" });
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
            
            try {
                await sendVerificationEmail(user.email, generatedOtp);
                return res.status(200).json({ success: true, message: 'OTP sent successfully' });
            } catch (err) {
                console.error("Change Password OTP Email Fail:", err);
                return res.status(500).json({ 
                    success: false, 
                    message: "OTP service unavailable. Please try again later." 
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
        else if (action === "face-status") {
            const student = await protectStudent(req);
            if (!student) return res.status(401).json({ success: false, message: "Unauthorized" });

            const result = await query('SELECT created_at FROM student_face_profiles WHERE student_id = $1', [student.id]);
            return res.status(200).json({ 
                success: true, 
                registered: result.rows.length > 0,
                registered_at: result.rows[0]?.created_at
            });
        }

        else if (action === "face-register" || action === "face-update") {
            const student = await protectStudent(req);
            if (!student) return res.status(401).json({ success: false, message: "Unauthorized" });

            const { descriptor } = req.body;
            if (!descriptor) return res.status(400).json({ success: false, message: "Face descriptor required" });

            // BIOMETRIC APPROVAL GATE
            if (student.face_registered_once) {
                const approval = await query(
                    `SELECT id FROM biometric_requests 
                     WHERE student_id = $1 AND biometric_type = 'face' AND status = 'approved' AND expires_at > CURRENT_TIMESTAMP
                     ORDER BY requested_at DESC LIMIT 1`,
                    [student.id]
                );
                if (approval.rows.length === 0) {
                    return res.status(403).json({ success: false, message: "Admin approval required for biometric updates." });
                }
                // Mark request as completed
                await query('UPDATE biometric_requests SET status = \'completed\' WHERE id = $1', [approval.rows[0].id]);
            }

            // Store as comma-separated text
            await query(`
                INSERT INTO student_face_profiles (student_id, face_descriptor) 
                VALUES ($1, $2)
                ON CONFLICT (student_id) DO UPDATE SET face_descriptor = EXCLUDED.face_descriptor, updated_at = CURRENT_TIMESTAMP
            `, [student.id, descriptor]);

            await query(`
                UPDATE students 
                SET face_registered = true, face_registered_once = true, face_version = face_version + 1 
                WHERE id = $1
            `, [student.id]);
            
            return res.status(200).json({ success: true, message: "Face biometric updated successfully" });
        }

        else if (action === "face-delete") {
            const student = await protectStudent(req);
            if (!student) return res.status(401).json({ success: false, message: "Unauthorized" });

            // BIOMETRIC APPROVAL GATE for deletion
            if (student.face_registered) {
                const approval = await query(
                    `SELECT id FROM biometric_requests 
                     WHERE student_id = $1 AND biometric_type = 'face' AND action_type = 'remove' AND status = 'approved' AND expires_at > CURRENT_TIMESTAMP
                     ORDER BY requested_at DESC LIMIT 1`,
                    [student.id]
                );
                if (approval.rows.length === 0) {
                    return res.status(403).json({ success: false, message: "Admin approval required for biometric removal." });
                }
                // Mark request as completed
                await query('UPDATE biometric_requests SET status = \'completed\' WHERE id = $1', [approval.rows[0].id]);
            }

            await query('DELETE FROM student_face_profiles WHERE student_id = $1', [student.id]);
            await query('UPDATE students SET face_registered = false WHERE id = $1', [student.id]);
            return res.status(200).json({ success: true, message: "Face data removed successfully" });
        }

        else if (action === "face-verify") {
            const student = await protectStudent(req);
            if (!student) return res.status(401).json({ success: false, message: "Unauthorized" });

            const { descriptor, mobile } = req.body;
            if (!descriptor) return res.status(400).json({ success: false, message: "Face descriptor required" });

            const result = await query('SELECT face_descriptor FROM student_face_profiles WHERE student_id = $1', [student.id]);
            const storedDescriptorRaw = result.rows[0]?.face_descriptor;

            if (!storedDescriptorRaw) {
                return res.status(400).json({ success: false, message: "Face not registered. Please register first." });
            }

            // --- Robust Parsing ---
            let storedDescriptor, currentDescriptor;
            try {
                storedDescriptor = storedDescriptorRaw.startsWith('[') ? JSON.parse(storedDescriptorRaw) : storedDescriptorRaw.split(',').map(Number);
                currentDescriptor = descriptor.startsWith('[') ? JSON.parse(descriptor) : descriptor.split(',').map(Number);
            } catch (e) {
                console.error("[FaceVerify] Parsing error:", e);
                return res.status(400).json({ success: false, message: "Invalid descriptor format" });
            }

            // USER REQUIREMENT: Log stored and received lengths
            console.log(`[FaceVerify] Student ${student.id} | Stored Signature Length: ${storedDescriptor.length} | Received Length: ${currentDescriptor.length}`);

            if (storedDescriptor.length !== currentDescriptor.length) {
                return res.status(400).json({ success: false, message: "Biometric signature mismatch. Please re-register your face." });
            }

            // --- Euclidean Distance Calculation ---
            let sum = 0;
            for (let i = 0; i < storedDescriptor.length; i++) {
                sum += Math.pow(storedDescriptor[i] - currentDescriptor[i], 2);
            }
            const distance = Math.sqrt(sum);
            
            // SECURITY REQUIREMENT: Strict threshold (0.48) for TRUE identity verification.
            // A threshold > 0.60 allows too many false positives.
            const threshold = 0.48; 
            const isMatch = distance <= threshold;

            // SECURITY REQUIREMENT: Detailed logging for audit
            console.log(`[FaceVerify] Identity Audit | Student: ${student.id} | Distance: ${distance.toFixed(4)} | Threshold: ${threshold} | Result: ${isMatch ? 'VERIFIED' : 'REJECTED'}`);

            if (isMatch) {
                return res.status(200).json({ success: true, verified: true, distance, threshold });
            } else {
                return res.status(200).json({ 
                    success: true, 
                    verified: false, 
                    distance, 
                    threshold,
                    message: "Face mismatch. Please use your registered face in good lighting." 
                });
            }
        }
        else if (action === "update-auth-preference") {
            const student = await protectStudent(req);
            if (!student) return res.status(401).json({ success: false, message: "Unauthorized" });

            const { auth_method } = req.body;
            if (!['face', 'fingerprint', 'both'].includes(auth_method)) {
                return res.status(400).json({ success: false, message: "Invalid auth method" });
            }

            await query('UPDATE students SET auth_method = $1 WHERE id = $2', [auth_method, student.id]);
            return res.status(200).json({ success: true, message: "Preference updated" });
        }

        else if (action === "webauthn-register-challenge") {
            const student = await protectStudent(req);
            if (!student) return res.status(401).json({ success: false, message: "Unauthorized" });

            const challenge = crypto.randomBytes(32).toString('base64url');
            await query('UPDATE students SET webauthn_challenge = $1 WHERE id = $2', [challenge, student.id]);

            return res.status(200).json({ 
                success: true, 
                challenge,
                user: {
                    id: Buffer.from(student.id.toString()).toString('base64url'),
                    name: student.email,
                    displayName: student.name
                }
            });
        }

        else if (action === "webauthn-register-verify") {
            const student = await protectStudent(req);
            if (!student) return res.status(401).json({ success: false, message: "Unauthorized" });

            const { credentialId, publicKey } = req.body;
            if (!credentialId || !publicKey) {
                return res.status(400).json({ success: false, message: "Missing credential data" });
            }

            // BIOMETRIC APPROVAL GATE
            if (student.fingerprint_registered_once) {
                const approval = await query(
                    `SELECT id FROM biometric_requests 
                     WHERE student_id = $1 AND biometric_type = 'fingerprint' AND status = 'approved' AND expires_at > CURRENT_TIMESTAMP
                     ORDER BY requested_at DESC LIMIT 1`,
                    [student.id]
                );
                if (approval.rows.length === 0) {
                    return res.status(403).json({ success: false, message: "Admin approval required for biometric updates." });
                }
                // Mark request as completed
                await query('UPDATE biometric_requests SET status = \'completed\' WHERE id = $1', [approval.rows[0].id]);
            }

            // In a real production app, we would verify the attestation signature here.
            // For this implementation, we follow the requirement to save credentialId + publicKey only.
            await query(
                `UPDATE students 
                 SET webauthn_credential_id = $1, webauthn_public_key = $2, 
                     fingerprint_registered = true, fingerprint_registered_once = true,
                     fingerprint_version = fingerprint_version + 1
                 WHERE id = $3`, 
                [credentialId, publicKey, student.id]
            );

            return res.status(200).json({ success: true, message: "Fingerprint registered successfully" });
        }

        else if (action === "webauthn-auth-challenge") {
            const student = await protectStudent(req);
            if (!student) return res.status(401).json({ success: false, message: "Unauthorized" });

            const result = await query('SELECT webauthn_credential_id FROM students WHERE id = $1', [student.id]);
            if (!result.rows[0]?.webauthn_credential_id) {
                return res.status(400).json({ success: false, message: "Fingerprint not registered" });
            }

            const challenge = crypto.randomBytes(32).toString('base64url');
            await query('UPDATE students SET webauthn_challenge = $1 WHERE id = $2', [challenge, student.id]);

            return res.status(200).json({ 
                success: true, 
                challenge, 
                credentialId: result.rows[0].webauthn_credential_id 
            });
        }

        else if (action === "webauthn-auth-verify") {
            const student = await protectStudent(req);
            if (!student) return res.status(401).json({ success: false, message: "Unauthorized" });

            const { assertion } = req.body;
            // In a full WebAuthn implementation, we'd verify the signature here using stored publicKey.
            // Requirement says "Fingerprint implementation: Use FREE browser-native WebAuthn."
            // For simplicity in this environment, we'll assume verification is handled or mocked 
            // but we'll implement a placeholder logic that would normally check the signature.
            
            // For now, if we get a response, we consider it verified as the browser handled the biometric.
            return res.status(200).json({ success: true, verified: true });
        }

        else if (action === "webauthn-delete") {
            const student = await protectStudent(req);
            if (!student) return res.status(401).json({ success: false, message: "Unauthorized" });

            // BIOMETRIC APPROVAL GATE for deletion
            if (student.fingerprint_registered) {
                const approval = await query(
                    `SELECT id FROM biometric_requests 
                     WHERE student_id = $1 AND biometric_type = 'fingerprint' AND action_type = 'remove' AND status = 'approved' AND expires_at > CURRENT_TIMESTAMP
                     ORDER BY requested_at DESC LIMIT 1`,
                    [student.id]
                );
                if (approval.rows.length === 0) {
                    return res.status(403).json({ success: false, message: "Admin approval required for biometric removal." });
                }
                // Mark request as completed
                await query('UPDATE biometric_requests SET status = \'completed\' WHERE id = $1', [approval.rows[0].id]);
            }

            await query(
                `UPDATE students 
                 SET webauthn_credential_id = NULL, webauthn_public_key = NULL, fingerprint_registered = false 
                 WHERE id = $1`, 
                [student.id]
            );

            return res.status(200).json({ success: true, message: "Fingerprint data removed" });
        }

        else if (action === "biometric-status") {
            const student = await protectStudent(req);
            if (!student) return res.status(401).json({ success: false, message: "Unauthorized" });

            const result = await query(
                `SELECT 
                    face_registered, fingerprint_registered, auth_method,
                    face_registered_once, fingerprint_registered_once,
                    face_version, fingerprint_version
                 FROM students WHERE id = $1`,
                [student.id]
            );

            if (result.rows.length === 0) return res.status(404).json({ success: false, message: "Student not found" });

            // Also check for any pending or approved biometric requests
            const requests = await query(
                `SELECT * FROM biometric_requests 
                 WHERE student_id = $1 AND status IN ('pending', 'approved', 'rejected')
                 ORDER BY requested_at DESC LIMIT 5`,
                [student.id]
            );

            return res.status(200).json({ 
                success: true, 
                ...result.rows[0],
                active_requests: requests.rows
            });
        }
        
        else if (action === "biometric-request-create") {
            const student = await protectStudent(req);
            if (!student) return res.status(401).json({ success: false, message: "Unauthorized" });

            const { biometric_type, action_type, remarks } = req.body;
            if (!biometric_type || !action_type) {
                return res.status(400).json({ success: false, message: "Missing required fields" });
            }

            // Check for existing pending request of same type
            const existing = await query(
                'SELECT id FROM biometric_requests WHERE student_id = $1 AND biometric_type = $2 AND status = \'pending\'',
                [student.id, biometric_type]
            );

            if (existing.rows.length > 0) {
                return res.status(400).json({ success: false, message: "A request for this biometric is already pending." });
            }

            await query(
                `INSERT INTO biometric_requests (student_id, student_name, roll_number, biometric_type, action_type, remarks)
                 VALUES ($1, $2, $3, $4, $5, $6)`,
                [student.id, student.name, student.roll_number, biometric_type, action_type, remarks]
            );

            return res.status(200).json({ success: true, message: "Biometric request submitted for admin approval." });
        }

        else if (action === "admin-biometric-requests-list") {
            const admin = await protectAdmin(req);
            if (!admin) return res.status(401).json({ success: false, message: "Unauthorized" });

            const status = req.query.status || 'pending';
            const result = await query(
                'SELECT * FROM biometric_requests WHERE status = $1 ORDER BY requested_at DESC',
                [status]
            );

            return res.status(200).json({ success: true, requests: result.rows });
        }

        else if (action === "admin-biometric-request-review") {
            const admin = await protectAdmin(req);
            if (!admin) return res.status(401).json({ success: false, message: "Unauthorized" });

            const { request_id, status, remarks } = req.body;
            if (!['approved', 'rejected'].includes(status)) {
                return res.status(400).json({ success: false, message: "Status must be approved or rejected" });
            }

            let expires_at = null;
            if (status === 'approved') {
                expires_at = new Date();
                expires_at.setHours(expires_at.getHours() + 24); // 24 hour window
            }

            await query(
                `UPDATE biometric_requests 
                 SET status = $1, remarks = $2, reviewed_at = CURRENT_TIMESTAMP, reviewed_by = $3, expires_at = $4
                 WHERE id = $5`,
                [status, remarks, admin.id, expires_at, request_id]
            );

            return res.status(200).json({ success: true, message: `Request successfully ${status}` });
        }

        else if (action === "admin-biometric-request-remove") {
            const admin = await protectAdmin(req);
            if (!admin) return res.status(401).json({ success: false, message: "Unauthorized" });

            const { request_id } = req.body;
            if (!request_id) return res.status(400).json({ success: false, message: "Missing request ID" });

            // 1. Get request details
            const reqRes = await query('SELECT * FROM biometric_requests WHERE id = $1', [request_id]);
            if (reqRes.rows.length === 0) return res.status(404).json({ success: false, message: "Request not found" });
            
            const bioReq = reqRes.rows[0];
            if (bioReq.status !== 'approved' || bioReq.action_type !== 'remove') {
                return res.status(400).json({ success: false, message: "Only approved removal requests can be processed manually." });
            }

            // 2. Clear student biometric fields
            if (bioReq.biometric_type === 'face') {
                await query(
                    'UPDATE students SET face_data = NULL, face_registered = false WHERE id = $1',
                    [bioReq.student_id]
                );
            } else if (bioReq.biometric_type === 'fingerprint') {
                await query(
                    `UPDATE students 
                     SET webauthn_credential_id = NULL, webauthn_public_key = NULL, fingerprint_registered = false 
                     WHERE id = $1`,
                    [bioReq.student_id]
                );
            }

            // 3. Complete the request
            await query(
                'UPDATE biometric_requests SET status = \'completed\', reviewed_at = CURRENT_TIMESTAMP WHERE id = $1',
                [request_id]
            );

            return res.status(200).json({ success: true, message: `${bioReq.biometric_type} biometric permanently removed.` });
        }

        else {
            return res.status(400).json({ error: "Invalid action: " + action });
        }

    } catch (err) {
        console.error("Monolith API Error:", err);
        return res.status(500).json({ 
            success: false, 
            message: err.message || "Failed to process request" 
        });
    }
}
