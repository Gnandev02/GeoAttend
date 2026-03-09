const { calculateDistance } = require('../utils/geoHelper');

// @desc    Mark attendance based on geolocation
// @route   POST /api/attendance/mark
// @access  Private (student only)
const markAttendance = async (req, res) => {
    try {
        const { lat, lng, sessionName } = req.body;

        if (!lat || !lng || !sessionName) {
            return res.status(400).json({ message: 'Location coordinates and session name are required' });
        }

        const collegeCode = req.student.college_code;
        const today = new Date().toISOString().split('T')[0]; // Format: YYYY-MM-DD

        const existingAttendance = await req.app.locals.pool.query(
            'SELECT * FROM attendance WHERE student_id = $1 AND date = $2 AND session_name = $3 AND status = $4',
            [req.student.id, today, sessionName, 'Present']
        );

        if (existingAttendance.rows.length > 0) {
            return res.status(400).json({ message: `Attendance already marked for ${sessionName} today` });
        }

        const geofenceQuery = await req.app.locals.pool.query('SELECT * FROM geofence WHERE college_code = $1', [collegeCode]);
        if (geofenceQuery.rows.length === 0) {
            return res.status(500).json({ message: 'College geofence not found' });
        }

        const geofence = geofenceQuery.rows[0];

        const distanceToCampus = calculateDistance(lat, lng, geofence.latitude, geofence.longitude);
        const isInsideRadius = distanceToCampus <= geofence.radius;
        const status = isInsideRadius ? 'Present' : 'Outside Zone';

        const time = new Date().toLocaleTimeString('en-US', { hour12: false });

        const attendanceResult = await req.app.locals.pool.query(
            `INSERT INTO attendance (student_id, college_code, date, time, latitude, longitude, status, distance_from_center, session_name)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING *`,
            [req.student.id, collegeCode, today, time, lat, lng, status, Math.round(distanceToCampus), sessionName]
        );

        const attendance = attendanceResult.rows[0];

        res.status(201).json({
            message: isInsideRadius ? 'Attendance marked successfully' : 'Attendance rejected: Outside campus radius',
            distance: Math.round(distanceToCampus),
            attendance: {
                _id: attendance.id,
                studentId: attendance.student_id,
                collegeCode: attendance.college_code,
                date: attendance.date,
                time: attendance.time,
                locationCoordinates: { lat: attendance.latitude, lng: attendance.longitude },
                status: attendance.status,
                distanceFromCenter: attendance.distance_from_center,
                sessionName: attendance.session_name,
                createdAt: attendance.timestamp
            }
        });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Get student attendance history
// @route   GET /api/attendance/student/:id
// @access  Private (student only)
const getStudentAttendance = async (req, res) => {
    try {
        // Make sure students can only see their own attendance
        if (req.student.id.toString() !== req.params.id) {
            return res.status(403).json({ message: 'Not authorized to view other student records' });
        }
        const attendanceQuery = await req.app.locals.pool.query(
            'SELECT * FROM attendance WHERE student_id = $1 AND college_code = $2 ORDER BY timestamp DESC',
            [req.params.id, req.student.college_code]
        );

        // Format for frontend
        const mappedAttendance = attendanceQuery.rows.map(a => {
            return {
                _id: a.id,
                studentId: a.student_id,
                collegeCode: a.college_code,
                date: a.date,
                time: a.time,
                locationCoordinates: { lat: a.latitude, lng: a.longitude },
                status: a.status,
                distanceFromCenter: a.distance_from_center,
                sessionName: a.session_name,
                createdAt: a.timestamp
            };
        });

        res.json(mappedAttendance);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

module.exports = {
    markAttendance,
    getStudentAttendance
};
