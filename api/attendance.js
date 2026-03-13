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

        if (req.method === 'POST') {
            const student = await protectStudent(req);
            if (!student) return res.status(401).json({ message: 'Not authorized as a student' });

            const { latitude, longitude, sessionName } = req.body;
            const today = new Date().toISOString().split('T')[0];
            const now = new Date();
            const currentTime = now.toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' });

            if (action === 'checkIn') {
                if (!latitude || !longitude) return res.status(400).json({ message: 'Location required' });

                // Check time window (9 AM - 5 PM)
                const currentHour = now.getHours();
                let status = 'Present';

                if (currentHour < 9) {
                    return res.status(400).json({ message: 'Check-in only available after 9:00 AM' });
                } else if (currentHour >= 17) {
                    status = 'Absent'; // Too late
                }

                // Check geofence
                const geofenceQuery = await query('SELECT * FROM campus_setup WHERE college_code = $1', [student.college_code]);
                if (geofenceQuery.rows.length === 0) return res.status(500).json({ message: 'Campus geofence not configured' });
                
                const geofence = geofenceQuery.rows[0];
                const distance = calculateDistance(latitude, longitude, geofence.latitude, geofence.longitude);
                
                if (distance > geofence.radius) {
                    return res.status(400).json({ message: 'You must be inside the campus to check in', distance: Math.round(distance) });
                }

                try {
                    const result = await query(
                        `INSERT INTO attendance (student_id, college_code, attendance_date, check_in_time, status, distance_at_checkin, latitude, longitude, session_name)
                         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING *`,
                        [student.id, student.college_code, today, currentTime, status, Math.round(distance), latitude, longitude, sessionName || 'Campus Check-in']
                    );
                    return res.status(201).json({ message: status === 'Present' ? 'Checked in successfully' : 'Checked in (Late/Absent)', attendance: result.rows[0], distance: Math.round(distance) });
                } catch (e) {
                    if (e.code === '23505') return res.status(400).json({ message: 'Already checked in for today' });
                    throw e;
                }

            } else if (action === 'checkOut') {
                const result = await query(
                    'UPDATE attendance SET check_out_time = $1 WHERE student_id = $2 AND attendance_date = $3 RETURNING *',
                    [currentTime, student.id, today]
                );

                if (result.rows.length === 0) return res.status(400).json({ message: 'No check-in record found for today' });
                return res.status(200).json({ message: 'Checked out successfully', attendance: result.rows[0] });

            } else if (action === 'markAttendance') {
                // Legacy support for single marking
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
            }
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
                    distanceFromCenter: a.distance_at_checkin,
                    status: a.status,
                    createdAt: a.timestamp,
                    date: a.attendance_date,
                    checkinTime: a.check_in_time,
                    checkoutTime: a.check_out_time,
                    sessionName: a.session_name,
                    collegeCode: collegeCode
                }));

                return res.status(200).json(mappedAttendance);
            }

            if (student) {
                // Return Single Student Attendance
                let queryText = 'SELECT * FROM attendance WHERE student_id = $1 AND college_code = $2 ORDER BY attendance_date DESC, check_in_time DESC';

                const attendanceQuery = await query(queryText, [student.id, student.college_code]);

                const mappedAttendance = attendanceQuery.rows.map(a => ({
                    _id: a.id,
                    studentId: a.student_id,
                    collegeCode: a.college_code,
                    date: a.attendance_date,
                    time: a.check_in_time,
                    checkinTime: a.check_in_time,
                    checkoutTime: a.check_out_time,
                    locationCoordinates: { lat: a.latitude, lng: a.longitude },
                    status: a.status,
                    distanceFromCenter: a.distance_at_checkin,
                    sessionName: a.session_name,
                    createdAt: a.timestamp
                }));

                return res.status(200).json(mappedAttendance);
            }

            return res.status(401).json({ message: 'Not authorized' });
        } else if (req.method === 'GET' && action === 'getCampus') {
            const student = await protectStudent(req);
            if (!student) return res.status(401).json({ message: 'Not authorized' });

            const geofenceQuery = await query('SELECT latitude, longitude, radius FROM campus_setup WHERE college_code = $1', [student.college_code]);
            if (geofenceQuery.rows.length === 0) return res.status(404).json({ message: 'Geofence not configured' });

            return res.status(200).json(geofenceQuery.rows[0]);
        } else {
            return res.status(405).json({ message: 'Method Not Allowed' });
        }
    } catch (error) {
        console.error("Attendance API Error:", error);
        return res.status(500).json({ message: error.message || 'Internal Server Error' });
    }
};
