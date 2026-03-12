const { query } = require('./utils/db');
const { protectAdmin, protectStudent } = require('./utils/auth');
const { calculateDistance } = require('./utils/geoHelper');

module.exports = async (req, res) => {
    // Handle CORS preflight
    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    try {
        const { action } = req.query;

        if (req.method === 'POST' && action === 'markAttendance') {
            // Mark Attendance (Student Only)
            const student = await protectStudent(req);
            if (!student) return res.status(401).json({ message: 'Not authorized as a student' });

            const { lat, lng, sessionName } = req.body;
            if (!lat || !lng || !sessionName) {
                return res.status(400).json({ message: 'Location coordinates and session name are required' });
            }

            const collegeCode = student.college_code;
            const today = new Date().toISOString().split('T')[0];

            const existingAttendance = await query(
                'SELECT * FROM attendance WHERE student_id = $1 AND date = $2 AND session_name = $3 AND status = $4',
                [student.id, today, sessionName, 'Present']
            );

            if (existingAttendance.rows.length > 0) {
                return res.status(400).json({ message: `Attendance already marked for ${sessionName} today` });
            }

            const geofenceQuery = await query('SELECT * FROM campus_setup WHERE college_code = $1', [collegeCode]);
            if (geofenceQuery.rows.length === 0) {
                return res.status(500).json({ message: 'College geofence not found' });
            }

            const geofence = geofenceQuery.rows[0];
            const distanceToCampus = calculateDistance(lat, lng, geofence.latitude, geofence.longitude);
            const isInsideRadius = distanceToCampus <= geofence.radius;
            const status = isInsideRadius ? 'Present' : 'Outside Zone';
            const time = new Date().toLocaleTimeString('en-US', { hour12: false });

            const attendanceResult = await query(
                `INSERT INTO attendance (student_id, college_code, date, time, latitude, longitude, status, distance_from_center, session_name)
                 VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING *`,
                [student.id, collegeCode, today, time, lat, lng, status, Math.round(distanceToCampus), sessionName]
            );

            const attendance = attendanceResult.rows[0];

            return res.status(201).json({
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

        } else if (req.method === 'GET' && action === 'getAttendanceLogs') {
            // View Attendance (Admin or Student)
            const admin = await protectAdmin(req);
            if (admin) {
                // Return All Attendance for Admin
                const collegeCode = admin.college_code;
                if (!collegeCode) return res.status(200).json([]);
                let queryText = `
                    SELECT a.id, a.student_id, a.latitude, a.longitude, a.distance_from_center, a.status, a.timestamp, a.date, a.time, a.session_name,
                           s.name as student_name, s.email as student_email, s.roll_number
                    FROM attendance a
                    JOIN students s ON a.student_id = s.id
                    WHERE a.college_code = $1
                `;
                const queryParams = [collegeCode];

                if (req.query.date) {
                    queryText += ` AND a.date = $2`;
                    queryParams.push(req.query.date);
                }

                queryText += ` ORDER BY a.timestamp DESC`;

                const attendanceQuery = await query(queryText, queryParams);

                const mappedAttendance = attendanceQuery.rows.map(a => ({
                    _id: a.id,
                    studentId: {
                        _id: a.student_id,
                        name: a.student_name,
                        email: a.student_email,
                        rollNumber: a.roll_number
                    },
                    locationCoordinates: { lat: a.latitude, lng: a.longitude },
                    distanceFromCenter: a.distance_from_center,
                    status: a.status,
                    createdAt: a.timestamp,
                    date: a.date,
                    time: a.time,
                    sessionName: a.session_name,
                    collegeCode: collegeCode
                }));

                return res.status(200).json(mappedAttendance);
            }

            const student = await protectStudent(req);
            if (student) {
                // Return Single Student Attendance
                let queryText = 'SELECT * FROM attendance WHERE student_id = $1 AND college_code = $2 ORDER BY timestamp DESC';

                const attendanceQuery = await query(queryText, [student.id, student.college_code]);

                const mappedAttendance = attendanceQuery.rows.map(a => ({
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
                }));

                return res.status(200).json(mappedAttendance);
            }

            return res.status(401).json({ message: 'Not authorized' });
        } else {
            return res.status(405).json({ message: 'Method Not Allowed' });
        }
    } catch (error) {
        console.error("Attendance API Error:", error);
        return res.status(500).json({ message: error.message || 'Internal Server Error' });
    }
};
