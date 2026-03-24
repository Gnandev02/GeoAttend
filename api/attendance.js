const { query } = require('../utils/db');
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

            const { sessionName, type } = req.body;
            
            // 1. FORCED NUMERIC CONVERSION & VALIDATION
            const latitude = Number(req.body.lat);
            const longitude = Number(req.body.lng);

            console.log("[BACKEND DEBUG] Incoming Location:", { lat: latitude, lng: longitude, type, body: req.body });

            const now = new Date();
            const IST = { timeZone: 'Asia/Kolkata' };
            const today = now.toLocaleDateString('en-CA', IST);  
            const currentTime = now.toLocaleTimeString('en-IN', { ...IST, hour12: true, hour: '2-digit', minute: '2-digit', second: '2-digit' });

            // Handle simplified IN/OUT from frontend Step 7
            if (type === 'IN' || type === 'OUT') {
                const todayQuery = await query('SELECT * FROM attendance WHERE student_id = $1 AND attendance_date = $2 ORDER BY id DESC LIMIT 1', [student.id, today]);
                const todayRecord = todayQuery.rows[0];

                if (type === 'IN') {
                    if (todayRecord) return res.status(200).json({ message: 'Already marked IN', attendance: todayRecord });
                    const result = await query(
                        `INSERT INTO attendance (student_id, college_code, attendance_date, check_in_time, status, session_name)
                         VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
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

            if (isNaN(latitude) || isNaN(longitude)) {
                return res.status(400).json({ message: "Invalid GPS coordinates (NaN)." });
            }

            if (Math.abs(latitude) > 90 || Math.abs(longitude) > 180) {
                return res.status(400).json({ message: "Invalid GPS range." });
            }

            // FETCH CAMPUS SETUP (SINGLE SOURCE OF TRUTH BY college_code)
            const geofenceQuery = await query('SELECT latitude, longitude, radius, attendance_start_time, attendance_end_time FROM campus_setup WHERE college_code = $1', [student.college_code]);
            if (geofenceQuery.rows.length === 0) return res.status(500).json({ message: 'Campus geofence not configured.' });
            
            const geofence = geofenceQuery.rows[0];
            const cLat = Number(geofence.latitude);
            const cLng = Number(geofence.longitude);
            const cRad = Number(geofence.radius);

            const distance = calculateDistance(latitude, longitude, cLat, cLng);
            const inside = distance <= cRad;

            console.log("[BACKEND DEBUG] Distance Calculated:", { distance, radius: cRad, inside });

            const diagParams = {
                distance: isNaN(distance) ? Infinity : distance,
                inside: !!inside,
                campus: { lat: cLat, lng: cLng },
                student: { lat: latitude, lng: longitude }
            };

            if (!action || action === 'track') {
                const startTimeMins = geofence.attendance_start_time ? timeStringToMinutes(geofence.attendance_start_time) : null;
                const endTimeMins = geofence.attendance_end_time ? timeStringToMinutes(geofence.attendance_end_time) : null;
                const currentTimeMins = timeStringToMinutes(currentTime);

                const todayQuery = await query('SELECT * FROM attendance WHERE student_id = $1 AND attendance_date = $2 ORDER BY id DESC LIMIT 1', [student.id, today]);
                const todayRecord = todayQuery.rows[0];

                if (inside) {
                    if (todayRecord) {
                        return res.status(200).json({ 
                            message: 'Already checked in', 
                            attendance: todayRecord, 
                            action: "none", 
                            ...diagParams
                        });
                    }

                    if (startTimeMins !== null && currentTimeMins < startTimeMins) {
                        return res.status(400).json({ 
                            message: `Starts at ${geofence.attendance_start_time}`, 
                            ...diagParams
                        });
                    }

                    if (endTimeMins !== null && currentTimeMins > endTimeMins) {
                        return res.status(400).json({ 
                            message: `Closed at ${geofence.attendance_end_time}`, 
                            ...diagParams
                        });
                    }

                    try {
                        const result = await query(
                            `INSERT INTO attendance (student_id, college_code, attendance_date, check_in_time, status, distance_at_checkin, latitude, longitude, session_name)
                             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING *`,
                            [student.id, student.college_code, today, currentTime, 'Present', Math.round(distance), latitude, longitude, sessionName || 'Campus Check-in']
                        );
                        console.log("[BACKEND DEBUG] Check-in Created:", result.rows[0]);
                        return res.status(201).json({
                            message: 'Checked in successfully',
                            action: 'checked-in',
                            attendance: result.rows[0],
                            ...diagParams
                        });
                    } catch (e) {
                        if (e.code === '23505') return res.status(400).json({ message: 'Check-in collision', ...diagParams });
                        throw e;
                    }

                } else {
                    if (!todayRecord) {
                        return res.status(200).json({ message: 'Outside campus', action: 'none', ...diagParams });
                    }
                    if (todayRecord.check_out_time !== null) {
                        return res.status(200).json({ message: 'Already checked out', attendance: todayRecord, action: 'none', ...diagParams });
                    }

                    const inMins = timeStringToMinutes(todayRecord.check_in_time);
                    const outMins = timeStringToMinutes(currentTime);
                    const durationMinutes = outMins > inMins ? outMins - inMins : 0;

                    const result = await query(
                        'UPDATE attendance SET check_out_time = $1, status = $2, duration_minutes = $3 WHERE student_id = $4 AND attendance_date = $5 AND check_out_time IS NULL RETURNING *',
                        [currentTime, 'completed', durationMinutes, student.id, today]
                    );
                    console.log("[BACKEND DEBUG] Check-out Updated:", result.rows[0]);

                    return res.status(200).json({
                        message: 'Checked out successfully',
                        action: 'checked-out',
                        attendance: result.rows[0],
                        ...diagParams
                    });
                }
            } else if (action === 'markAttendance') {
                const status = inside ? 'Present' : 'Outside Zone';
                const result = await query(
                    `INSERT INTO attendance (student_id, college_code, attendance_date, check_in_time, status, distance_at_checkin, latitude, longitude, session_name)
                     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) ON CONFLICT (student_id, attendance_date) DO UPDATE SET check_in_time = $4, status = $5 RETURNING *`,
                    [student.id, student.college_code, today, currentTime, status, Math.round(distance), latitude, longitude, sessionName || 'Manual Mark']
                );
                return res.status(201).json({ message: 'Attendance processed', attendance: result.rows[0], ...diagParams });
            } else if (action === 'manualMark') {
                const admin = await protectAdmin(req);
                if (!admin) return res.status(401).json({ message: 'Not authorized' });

                const { studentId, date, checkInTime, checkOutTime } = req.body;
                let durationMinutes = 0;
                if (checkInTime && checkOutTime) {
                    const inMins = timeStringToMinutes(checkInTime);
                    const outMins = timeStringToMinutes(checkOutTime);
                    durationMinutes = outMins > inMins ? outMins - inMins : 0;
                }

                const result = await query(`
                    INSERT INTO attendance (student_id, college_code, attendance_date, check_in_time, check_out_time, status, attendance_type, session_name, duration_minutes)
                    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
                    ON CONFLICT (student_id, attendance_date) DO UPDATE SET check_in_time = $4, check_out_time = $5, status = $6, duration_minutes = $9
                    RETURNING *
                `, [studentId, admin.college_code, date, checkInTime, checkOutTime || null, checkOutTime ? 'completed' : 'Present', 'manual', 'Manual Entry', durationMinutes]);

                return res.status(200).json({ message: 'Marked successfully', attendance: result.rows[0] });
            }
        } else if (req.method === 'GET' && action === 'getAttendanceLogs') {
            const student = await protectStudent(req);
            const admin = await protectAdmin(req);

            if (admin) {
                const attendanceQuery = await query(`
                    SELECT a.id, a.student_id, a.college_code, a.attendance_date, a.check_in_time, a.check_out_time, a.latitude, a.longitude, a.distance_at_checkin, a.status, a.session_name, a.duration_minutes, s.name AS student_name, s.email AS student_email, s.roll_number
                    FROM attendance a JOIN students s ON a.student_id = s.id WHERE a.college_code = $1 ORDER BY a.id DESC
                `, [admin.college_code]);
                const mapped = attendanceQuery.rows.map(a => ({
                    _id: a.id, studentId: { _id: a.student_id, name: a.student_name, email: a.student_email, rollNumber: a.roll_number },
                    locationCoordinates: { lat: a.latitude, lng: a.longitude }, distanceFromCenter: a.distance_at_checkin, status: a.status, 
                    date: a.attendance_date instanceof Date ? a.attendance_date.toISOString().split('T')[0] : String(a.attendance_date).substring(0, 10),
                    checkinTime: a.check_in_time, checkoutTime: a.check_out_time, sessionName: a.session_name
                }));
                return res.status(200).json(mapped);
            }

            if (student) {
                const attendanceQuery = await query('SELECT * FROM attendance WHERE student_id = $1 ORDER BY attendance_date DESC, check_in_time DESC', [student.id]);
                const mapped = attendanceQuery.rows.map(a => ({
                    _id: a.id, 
                    date: a.attendance_date instanceof Date ? a.attendance_date.toISOString().split('T')[0] : String(a.attendance_date).substring(0, 10),
                    checkinTime: a.check_in_time, checkoutTime: a.check_out_time, status: a.status, distanceFromCenter: a.distance_at_checkin
                }));
                return res.status(200).json(mapped);
            }
        } else if (req.method === 'GET' && action === 'getCampus') {
            const student = await protectStudent(req);
            if (!student) return res.status(401).json({ message: 'Not authorized' });

            const geofenceQuery = await query('SELECT latitude, longitude, radius, attendance_start_time, attendance_end_time FROM campus_setup WHERE college_code = $1', [student.college_code]);
            const cfg = geofenceQuery.rows[0];
            return res.status(200).json({ latitude: Number(cfg.latitude), longitude: Number(cfg.longitude), radius: Number(cfg.radius), attendanceStartTime: cfg.attendance_start_time, attendanceEndTime: cfg.attendance_end_time });
        }
    } catch (error) {
        console.error("[BACKEND ERROR]", error);
        return res.status(500).json({ message: error.message || 'Server Error' });
    }
};
