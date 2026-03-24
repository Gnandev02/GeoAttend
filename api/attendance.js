const { query } = require('./utils/db');
const { protectAdmin, protectStudent } = require('./utils/auth');
const { calculateDistance } = require('./utils/geoHelper');

// Helper to convert "10:00:00 AM" or "09:30 AM" to total minutes
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

module.exports = async (req, res) => {
    // Handle CORS preflight
    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    try {
        const { action } = req.query;

        if (req.method === 'POST') {
            const student = await protectStudent(req);
            if (!student) return res.status(401).json({ message: 'Not authorized as a student' });

            const { sessionName } = req.body;
            // Parse coordinates as floats — JSON may send them as strings
            const latitude = parseFloat(req.body.lat !== undefined ? req.body.lat : req.body.latitude);
            const longitude = parseFloat(req.body.lng !== undefined ? req.body.lng : req.body.longitude);
            const distance = parseFloat(req.body.distance);
            const now = new Date();

            // CRITICAL: Vercel serverless runs in UTC. Must specify timeZone explicitly.
            const IST = { timeZone: 'Asia/Kolkata' };
            const today = now.toLocaleDateString('en-CA', IST);  // YYYY-MM-DD in IST
            // Store exact IST time in 12-hour AM/PM format: "10:00:49 AM"
            const currentTime = now.toLocaleTimeString('en-IN', { ...IST, hour12: true, hour: '2-digit', minute: '2-digit', second: '2-digit' });
            const currentHour = parseInt(now.toLocaleTimeString('en-IN', { ...IST, hour12: false, hour: '2-digit' }), 10);
            if (!action || action === 'track') {
                if (latitude === undefined || longitude === undefined || distance === undefined) {
                    return res.status(400).json({ message: 'Missing location data (lat, lng, distance).' });
                }

                // Check geofence and timings
                const geofenceQuery = await query('SELECT * FROM campus_setup WHERE college_code = $1', [student.college_code]);
                if (geofenceQuery.rows.length === 0) return res.status(500).json({ message: 'Campus geofence not configured.' });
                
                const geofence = geofenceQuery.rows[0];
                const campusRadius = parseFloat(geofence.radius);
                const startTimeMins = geofence.attendance_start_time ? timeStringToMinutes(geofence.attendance_start_time) : null;
                const endTimeMins = geofence.attendance_end_time ? timeStringToMinutes(geofence.attendance_end_time) : null;
                const currentTimeMins = timeStringToMinutes(currentTime);

                // Find today's latest record
                const todayQuery = await query('SELECT * FROM attendance WHERE student_id = $1 AND attendance_date = $2 ORDER BY id DESC LIMIT 1', [student.id, today]);
                const todayRecord = todayQuery.rows[0];

                if (distance <= campusRadius) {
                    // Inside Radius -> Check-in
                    if (todayRecord) {
                        return res.status(200).json({ message: 'Already checked in', attendance: todayRecord, action: "none" });
                    }

                    // VALIDATION: Start Time (if set)
                    if (startTimeMins !== null && currentTimeMins < startTimeMins) {
                        const displayStart = geofence.attendance_start_time.substring(0, 5);
                        const isPM = geofence.attendance_start_time.toLowerCase().includes('pm') || parseInt(geofence.attendance_start_time.split(':')[0]) >= 12;
                        return res.status(400).json({ message: `Attendance allowed only after ${displayStart} ${isPM ? 'PM' : 'AM'}` });
                    }

                    // VALIDATION: End Time (if set) -> mark as Late
                    const status = (endTimeMins !== null && currentTimeMins >= endTimeMins) ? 'Late' : 'Present';

                    try {
                        const result = await query(
                            `INSERT INTO attendance (student_id, college_code, attendance_date, check_in_time, status, distance_at_checkin, latitude, longitude, session_name)
                             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING *`,
                            [student.id, student.college_code, today, currentTime, status, Math.round(distance), latitude, longitude, sessionName || 'Campus Check-in']
                        );
                        return res.status(201).json({
                            message: 'Checked in successfully',
                            action: 'checked-in',
                            attendance: result.rows[0]
                        });
                    } catch (e) {
                        if (e.code === '23505') return res.status(400).json({ message: 'Already checked in for today' });
                        throw e;
                    }

                } else {
                    // Outside Radius -> Check-out
                    if (!todayRecord) {
                        // Not checked in, nothing to do
                        return res.status(200).json({ message: 'Outside campus', action: 'none' });
                    }
                    if (todayRecord.check_out_time !== null) {
                        // Already checked out
                        return res.status(200).json({ message: 'Already checked out', attendance: todayRecord, action: 'none' });
                    }

                    // Perform checkout update where check_out_time IS NULL
                    const checkInTimeStr = todayRecord.check_in_time;
                    let durationMinutes = 0;
                    if (checkInTimeStr) {
                        const inMins = timeStringToMinutes(checkInTimeStr);
                        const outMins = timeStringToMinutes(currentTime);
                        durationMinutes = outMins > inMins ? outMins - inMins : 0;
                    }

                    await query('ALTER TABLE attendance ADD COLUMN IF NOT EXISTS duration_minutes INTEGER DEFAULT 0');

                    const result = await query(
                        'UPDATE attendance SET check_out_time = $1, status = $2, duration_minutes = $3 WHERE student_id = $4 AND attendance_date = $5 AND check_out_time IS NULL RETURNING *',
                        [currentTime, 'completed', durationMinutes, student.id, today]
                    );

                    if (result.rows.length === 0) return res.status(400).json({ message: 'Checkout collision or record missing' });
                    return res.status(200).json({
                        message: 'Checked out successfully',
                        action: 'checked-out',
                        attendance: result.rows[0]
                    });
                }
            } else if (action === 'markAttendance') {
                const geofenceQuery = await query('SELECT * FROM campus_setup WHERE college_code = $1', [student.college_code]);
                const geofence = geofenceQuery.rows[0];
                const distance = calculateDistance(latitude, longitude, geofence.latitude, geofence.longitude);
                const status = distance <= geofence.radius ? 'Present' : 'Outside Zone';

                const result = await query(
                    `INSERT INTO attendance (student_id, college_code, attendance_date, check_in_time, status, distance_at_checkin, latitude, longitude, session_name)
                     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) ON CONFLICT (student_id, attendance_date) DO UPDATE SET check_in_time = $4, status = $5 RETURNING *`,
                    [student.id, student.college_code, today, currentTime, status, Math.round(distance), latitude, longitude, sessionName || 'Manual Mark']
                );
                return res.status(201).json({ message: 'Attendance processed', attendance: result.rows[0], distance: Math.round(distance) });
            } else if (action === 'manualMark') {
                const admin = await protectAdmin(req);
                if (!admin) return res.status(401).json({ message: 'Not authorized as an admin' });

                const { studentId, date, checkInTime, checkOutTime } = req.body;
                if (!studentId || !date || !checkInTime) return res.status(400).json({ message: 'Missing required fields (studentId, date, checkInTime)' });

                await query(`ALTER TABLE attendance ADD COLUMN IF NOT EXISTS attendance_type VARCHAR(20) DEFAULT 'auto'`);
                await query(`ALTER TABLE attendance ADD COLUMN IF NOT EXISTS duration_minutes INTEGER DEFAULT 0`);

                let durationMinutes = 0;
                if (checkInTime && checkOutTime) {
                    const inMins = timeStringToMinutes(checkInTime);
                    const outMins = timeStringToMinutes(checkOutTime);
                    durationMinutes = outMins > inMins ? outMins - inMins : 0;
                }

                const queryStr = `
                    INSERT INTO attendance (student_id, college_code, attendance_date, check_in_time, check_out_time, status, attendance_type, session_name, duration_minutes)
                    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
                    ON CONFLICT (student_id, attendance_date) DO UPDATE SET 
                        check_in_time = EXCLUDED.check_in_time, 
                        check_out_time = EXCLUDED.check_out_time,
                        status = EXCLUDED.status,
                        attendance_type = EXCLUDED.attendance_type,
                        duration_minutes = EXCLUDED.duration_minutes
                    RETURNING *
                `;
                const result = await query(queryStr, [
                    studentId, admin.college_code, date, checkInTime, checkOutTime || null, checkOutTime ? 'completed' : 'Present', 'manual', 'Manual Entry', durationMinutes
                ]);

                return res.status(200).json({ message: 'Attendance marked successfully', attendance: result.rows[0] });
            }
        } else if (req.method === 'GET' && action === 'getAttendanceLogs') {
            // View Attendance (Admin or Student)
            // Declare student HERE so it is accessible in both the admin and student branches
            const student = await protectStudent(req);
            const admin = await protectAdmin(req);
            console.log(`[GetLogs] admin=${admin ? admin.id : 'none'}, student=${student ? student.id : 'none'}`);

            if (admin) {
                // Return All Attendance for Admin
                const collegeCode = admin.college_code;
                if (!collegeCode) return res.status(200).json([]);
                let queryText = `
                    SELECT a.id, a.student_id, a.college_code,
                           a.attendance_date, a.check_in_time, a.check_out_time,
                           a.latitude, a.longitude, a.distance_at_checkin,
                           a.status, a.session_name,
                           s.name AS student_name, s.email AS student_email, s.roll_number
                    FROM attendance a
                    JOIN students s ON a.student_id = s.id
                    WHERE a.college_code = $1
                `;
                const queryParams = [collegeCode];

                if (req.query.date) {
                    queryText += ` AND a.attendance_date = $2`;
                    queryParams.push(req.query.date);
                }

                queryText += ` ORDER BY a.id DESC`;

                const attendanceQuery = await query(queryText, queryParams);
                console.log(`[GetLogs Admin] Found ${attendanceQuery.rows.length} records for college ${collegeCode}`);

                const mappedAttendance = attendanceQuery.rows.map(a => {
                    // Normalize attendance_date — pg driver returns JS Date for DATE columns
                    const dateStr = a.attendance_date instanceof Date
                        ? a.attendance_date.toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' })
                        : (typeof a.attendance_date === 'string' ? a.attendance_date.substring(0, 10) : String(a.attendance_date));

                    return {
                        _id: a.id,
                        studentId: {
                            _id: a.student_id,
                            name: a.student_name,
                            email: a.student_email,
                            rollNumber: a.roll_number
                        },
                        locationCoordinates: { lat: a.latitude, lng: a.longitude },
                        distanceFromCenter: a.distance_at_checkin,
                        durationMinutes: a.duration_minutes || 0,
                        status: a.status,
                        date: dateStr,
                        checkinTime: a.check_in_time || null,
                        checkoutTime: a.check_out_time || null,
                        sessionName: a.session_name,
                        collegeCode: a.college_code
                    };
                });

                return res.status(200).json(mappedAttendance);
            }

            if (student) {
                // Return Single Student Attendance
                console.log(`[GetLogs] Fetching attendance for student ${student.id} (college: ${student.college_code})`);
                let queryText = 'SELECT * FROM attendance WHERE student_id = $1 AND college_code = $2 ORDER BY attendance_date DESC, check_in_time DESC';

                const attendanceQuery = await query(queryText, [student.id, student.college_code]);

                const mappedAttendance = attendanceQuery.rows.map(a => {
                    // Normalize attendance_date — pg driver returns a JS Date object for DATE columns.
                    // Force it to a plain YYYY-MM-DD string so the frontend === comparison works.
                    const dateStr = a.attendance_date instanceof Date
                        ? a.attendance_date.toISOString().split('T')[0]
                        : (typeof a.attendance_date === 'string' ? a.attendance_date.substring(0, 10) : String(a.attendance_date));

                    return {
                        _id: a.id,
                        studentId: a.student_id,
                        collegeCode: a.college_code,
                        date: dateStr,
                        time: a.check_in_time || null,
                        checkinTime: a.check_in_time || null,
                        checkoutTime: a.check_out_time || null,
                        locationCoordinates: { lat: a.latitude, lng: a.longitude },
                        status: a.status,
                        distanceFromCenter: a.distance_at_checkin,
                        durationMinutes: a.duration_minutes || 0,
                        sessionName: a.session_name,
                        createdAt: a.timestamp
                    };
                });

                return res.status(200).json(mappedAttendance);
            }

            return res.status(401).json({ message: 'Not authorized' });
        } else if (req.method === 'GET' && action === 'getCampus') {
            const campusStudent = await protectStudent(req);
            if (!campusStudent) return res.status(401).json({ message: 'Not authorized' });

            const geofenceQuery = await query('SELECT latitude, longitude, radius, attendance_start_time, attendance_end_time FROM campus_setup WHERE college_code = $1', [campusStudent.college_code]);
            console.log(`[GetCampus] college_code=${campusStudent.college_code}, found=${geofenceQuery.rows.length > 0}`);
            if (geofenceQuery.rows.length === 0) return res.status(404).json({ message: 'Campus geofence not configured. Ask your administrator to set it up.' });

            const cfg = geofenceQuery.rows[0];
            return res.status(200).json({
                latitude: parseFloat(cfg.latitude),
                longitude: parseFloat(cfg.longitude),
                radius: parseFloat(cfg.radius),
                attendanceStartTime: cfg.attendance_start_time,
                attendanceEndTime: cfg.attendance_end_time
            });
        } else {
            return res.status(405).json({ message: 'Method Not Allowed' });
        }
    } catch (error) {
        console.error("Attendance API Error:", error);
        return res.status(500).json({ message: error.message || 'Internal Server Error' });
    }
};
