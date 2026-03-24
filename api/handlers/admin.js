const { query } = require('../utils/db');
const { protectAdmin } = require('../utils/auth');

export default async function handler(req, res) {
    // Explicit CORS Headers
    res.setHeader('Access-Control-Allow-Credentials', true)
    res.setHeader('Access-Control-Allow-Origin', '*')
    res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT')
    res.setHeader(
        'Access-Control-Allow-Headers',
        'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, Authorization'
    )

    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    const { action } = req.query;

    const admin = await protectAdmin(req);
    if (!admin) {
        return res.status(401).json({ message: 'Not authorized as an admin' });
    }

    try {
        if (action === 'getCampusSetup' && req.method === 'GET') {
            const geofenceQuery = await query('SELECT * FROM campus_setup WHERE college_code = $1', [admin.college_code]);

            if (geofenceQuery.rows.length > 0) {
                const geofence = geofenceQuery.rows[0];
                return res.status(200).json({
                    _id: geofence.id, 
                    name: geofence.name, 
                    latitude: Number(geofence.latitude), 
                    longitude: Number(geofence.longitude), 
                    radius: Number(geofence.radius), 
                    college_code: geofence.college_code,
                    attendance_start_time: geofence.attendance_start_time,
                    attendance_end_time: geofence.attendance_end_time
                });
            } else {
                return res.status(200).json({});
            }
        }

        if (action === 'saveCampusSetup' && req.method === 'POST') {
            const { name, collegeName, collegeCode, latitude, longitude, radius, attendanceStartTime, attendanceEndTime } = req.body;
            
            const nLat = Number(latitude);
            const nLng = Number(longitude);
            const nRad = Number(radius);

            if (isNaN(nLat) || isNaN(nLng) || isNaN(nRad)) {
                return res.status(400).json({ message: 'Invalid GPS or radius data. Must be numbers.' });
            }

            // If the admin doesn't have a college code yet, update their profile
            let adminCollegeCode = admin.college_code;
            if (!adminCollegeCode) {
                if (!collegeName || !collegeCode) {
                     return res.status(400).json({ message: 'College Name and College Code are required for initial setup' });
                }
                
                // Check if college code is already taken by another admin
                const codeCheck = await query('SELECT * FROM admins WHERE college_code = $1', [collegeCode]);
                if (codeCheck.rows.length > 0) {
                     return res.status(400).json({ message: 'College Code is already in use by another institution' });
                }

                await query('UPDATE admins SET college_name = $1, college_code = $2 WHERE id = $3', [collegeName, collegeCode, admin.id]);
                adminCollegeCode = collegeCode;
            }

            const geofenceCheck = await query('SELECT * FROM campus_setup WHERE college_code = $1', [adminCollegeCode]);
            let geofenceResult;

            // Handle empty strings as null for database consistency
            const startT = (attendanceStartTime && attendanceStartTime.trim() !== '') ? attendanceStartTime : null;
            const endT = (attendanceEndTime && attendanceEndTime.trim() !== '') ? attendanceEndTime : null;

            try {
                if (geofenceCheck.rows.length > 0) {
                    const currentGeofence = geofenceCheck.rows[0];
                    geofenceResult = await query(
                        'UPDATE campus_setup SET name = $1, latitude = $2, longitude = $3, radius = $4, attendance_start_time = $5, attendance_end_time = $6 WHERE college_code = $7 RETURNING *',
                        [name || currentGeofence.name, nLat, nLng, nRad, startT, endT, adminCollegeCode]
                    );
                } else {
                    geofenceResult = await query(
                        'INSERT INTO campus_setup (name, latitude, longitude, radius, college_code, attendance_start_time, attendance_end_time) VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *',
                        [name || 'Main Campus', nLat, nLng, nRad, adminCollegeCode, startT, endT]
                    );
                }
            } catch (err) {
                if (err.code === '42703') { // undefined_column
                    console.warn("[Schema Warning] Timing columns missing. Falling back to basic setup.");
                    if (geofenceCheck.rows.length > 0) {
                        geofenceResult = await query(
                            'UPDATE campus_setup SET name = $1, latitude = $2, longitude = $3, radius = $4 WHERE college_code = $5 RETURNING *',
                            [name || geofenceCheck.rows[0].name, latitude, longitude, radius, adminCollegeCode]
                        );
                    } else {
                        geofenceResult = await query(
                            'INSERT INTO campus_setup (name, latitude, longitude, radius, college_code) VALUES ($1, $2, $3, $4, $5) RETURNING *',
                            [name || 'Main Campus', latitude, longitude, radius, adminCollegeCode]
                        );
                    }
                } else {
                    throw err;
                }
            }

            const geofence = geofenceResult.rows[0];
            const { generateToken } = require('../utils/auth');
            return res.status(201).json({
                message: 'Campus setup updated successfully',
                token: generateToken(admin.id, adminCollegeCode), // Return a new JWT so the frontend knows the admin has a college_code
                geofence: { 
                    _id: geofence.id, 
                    name: geofence.name, 
                    latitude: Number(geofence.latitude), 
                    longitude: Number(geofence.longitude), 
                    radius: Number(geofence.radius), 
                    college_code: geofence.college_code,
                    attendance_start_time: geofence.attendance_start_time,
                    attendance_end_time: geofence.attendance_end_time
                }
            });
        }

        if (action === 'getDashboardStats' && req.method === 'GET') {
            const collegeCode = admin.college_code;
            if (!collegeCode) {
                 return res.status(200).json({
                    overall: { totalStudents: 0, totalCampuses: 0, Present: 0, Rejected: 0, Manual: 0, "Outside Zone": 0 }
                 });
            }

            const totalStudentsQuery = await query('SELECT COUNT(*) FROM students WHERE college_code = $1', [collegeCode]);
            const totalStudents = parseInt(totalStudentsQuery.rows[0].count);

            const totalCampusesQuery = await query('SELECT COUNT(*) FROM campus_setup WHERE college_code = $1', [collegeCode]);
            const totalCampuses = parseInt(totalCampusesQuery.rows[0].count);

            const statsQuery = await query('SELECT status, COUNT(*) as count FROM attendance WHERE college_code = $1 AND attendance_date = CURRENT_DATE GROUP BY status', [collegeCode]);

            const formattedStats = {
                Present: 0, Rejected: 0, Manual: 0, "Outside Zone": 0
            };

            statsQuery.rows.forEach(stat => {
                if (formattedStats.hasOwnProperty(stat.status)) {
                    formattedStats[stat.status] = parseInt(stat.count);
                }
            });

            return res.status(200).json({
                overall: { totalStudents, totalCampuses, ...formattedStats }
            });
        }

        return res.status(404).json({ message: 'API Action Not Found' });

    } catch (error) {
        console.error("Admin API Error:", error);
        return res.status(500).json({ message: error.message || 'Internal Server Error' });
    }
}
