const bcrypt = require('bcryptjs');

// @desc    Add a new student
// @route   POST /api/admin/create-student
const addStudent = async (req, res) => {
    try {
        // Compatible with both camelCase and flat body properties depending on frontend
        const studentName = req.body.studentName || req.body.name;
        const { rollNumber, email, password, department } = req.body;

        if (!studentName || !email || !password || !rollNumber) {
            return res.status(400).json({ message: 'Please provide all required fields' });
        }

        const studentExists = await req.app.locals.pool.query('SELECT * FROM students WHERE email = $1', [email]);
        if (studentExists.rows.length > 0) return res.status(400).json({ message: 'Student email already exists' });

        const rollExists = await req.app.locals.pool.query('SELECT * FROM students WHERE roll_number = $1 AND college_code = $2', [rollNumber, req.admin.college_code]);
        if (rollExists.rows.length > 0) return res.status(400).json({ message: 'Roll number already exists in this college' });

        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        const newStudent = await req.app.locals.pool.query(
            'INSERT INTO students (name, email, password, roll_number, department, college_code) VALUES ($1, $2, $3, $4, $5, $6) RETURNING *',
            [studentName, email, hashedPassword, rollNumber, department || 'General', req.admin.college_code]
        );

        res.status(201).json({ message: 'Student created successfully', student: newStudent.rows[0] });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Get all students
// @route   GET /api/admin/students
const getStudents = async (req, res) => {
    try {
        const studentsQuery = await req.app.locals.pool.query('SELECT id, name, email, roll_number, department, college_code FROM students WHERE college_code = $1', [req.admin.college_code]);

        // Map to match frontend expectations: student.userId.name -> student.name
        const mappedStudents = studentsQuery.rows.map(s => {
            return {
                _id: s.id,
                name: s.name,
                email: s.email,
                rollNumber: s.roll_number,
                department: s.department,
                collegeCode: s.college_code,
                userId: { name: s.name, email: s.email } // provide backwards compatibility
            };
        });
        res.json(mappedStudents);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Get all attendance records
// @route   GET /api/admin/attendance
const getAllAttendance = async (req, res) => {
    try {
        const collegeCode = req.admin.college_code;
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

        const attendanceQuery = await req.app.locals.pool.query(queryText, queryParams);

        // Provide backwards compatibility for frontend
        const mappedAttendance = attendanceQuery.rows.map(a => {
            return {
                _id: a.id,
                studentId: {
                    _id: a.student_id,
                    name: a.student_name,
                    email: a.student_email,
                    rollNumber: a.roll_number
                },
                locationCoordinates: {
                    lat: a.latitude,
                    lng: a.longitude
                },
                distanceFromCenter: a.distance_from_center,
                status: a.status,
                createdAt: a.timestamp,
                date: a.date,
                time: a.time,
                sessionName: a.session_name,
                collegeCode: collegeCode
            };
        });

        res.json(mappedAttendance);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Create Campus Geofence
// @route   POST /api/admin/geofence
const createGeofence = async (req, res) => {
    try {
        const { name, latitude, longitude, radius } = req.body;
        if (!latitude || !longitude || !radius) {
            return res.status(400).json({ message: 'Please provide all geofence details' });
        }

        const geofenceCheck = await req.app.locals.pool.query('SELECT * FROM geofence WHERE college_code = $1', [req.admin.college_code]);
        let geofenceResult;

        if (geofenceCheck.rows.length > 0) {
            const currentGeofence = geofenceCheck.rows[0];
            geofenceResult = await req.app.locals.pool.query(
                'UPDATE geofence SET name = $1, latitude = $2, longitude = $3, radius = $4 WHERE college_code = $5 RETURNING *',
                [name || currentGeofence.name, latitude, longitude, radius, req.admin.college_code]
            );
        } else {
            geofenceResult = await req.app.locals.pool.query(
                'INSERT INTO geofence (name, latitude, longitude, radius, college_code) VALUES ($1, $2, $3, $4, $5) RETURNING *',
                [name || 'Main Campus', latitude, longitude, radius, req.admin.college_code]
            );
        }

        const geofence = geofenceResult.rows[0];
        // Convert to frontend format
        res.status(201).json({
            message: 'Geofence updated successfully',
            geofence: {
                _id: geofence.id,
                name: geofence.name,
                latitude: geofence.latitude,
                longitude: geofence.longitude,
                radius: geofence.radius,
                collegeCode: geofence.college_code
            }
        });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
}

// @desc    Get singular geofence for frontend
// @route   GET /api/admin/geofence
const getGeofence = async (req, res) => {
    try {
        const geofenceQuery = await req.app.locals.pool.query('SELECT * FROM geofence WHERE college_code = $1', [req.admin.college_code]);

        if (geofenceQuery.rows.length > 0) {
            const geofence = geofenceQuery.rows[0];
            res.json({
                _id: geofence.id,
                name: geofence.name,
                latitude: geofence.latitude,
                longitude: geofence.longitude,
                radius: geofence.radius,
                collegeCode: geofence.college_code
            });
        } else {
            res.json({});
        }
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
}

// @desc    Get Attendance Analytics
// @route   GET /api/admin/analytics
const getAnalytics = async (req, res) => {
    try {
        const collegeCode = req.admin.college_code;

        const totalStudentsQuery = await req.app.locals.pool.query('SELECT COUNT(*) FROM students WHERE college_code = $1', [collegeCode]);
        const totalStudents = parseInt(totalStudentsQuery.rows[0].count);

        const totalCampusesQuery = await req.app.locals.pool.query('SELECT COUNT(*) FROM geofence WHERE college_code = $1', [collegeCode]);
        const totalCampuses = parseInt(totalCampusesQuery.rows[0].count);

        const statsQuery = await req.app.locals.pool.query(
            'SELECT status, COUNT(*) as count FROM attendance WHERE college_code = $1 GROUP BY status',
            [collegeCode]
        );

        const formattedStats = {
            Present: 0,
            Rejected: 0,
            Manual: 0,
            "Outside Zone": 0
        };

        statsQuery.rows.forEach(stat => {
            if (formattedStats.hasOwnProperty(stat.status)) {
                formattedStats[stat.status] = parseInt(stat.count);
            }
        });

        res.json({
            overall: {
                totalStudents,
                totalCampuses,
                ...formattedStats
            }
        });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
}

module.exports = {
    addStudent,
    getStudents,
    getAllAttendance,
    createGeofence,
    getGeofence,
    getAnalytics
};
