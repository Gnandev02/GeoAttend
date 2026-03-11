const { query } = require('./utils/db');
const { protectAdmin } = require('./utils/auth');

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
        if (action === 'campuses') {
            if (req.method === 'GET') {
                const geofenceQuery = await query('SELECT * FROM geofence WHERE college_code = $1', [admin.college_code]);

                if (geofenceQuery.rows.length > 0) {
                    const geofence = geofenceQuery.rows[0];
                    return res.status(200).json({
                        _id: geofence.id, name: geofence.name, latitude: geofence.latitude, longitude: geofence.longitude, radius: geofence.radius, collegeCode: geofence.college_code
                    });
                } else {
                    return res.status(200).json({});
                }

            } else if (req.method === 'POST') {
                const { name, latitude, longitude, radius } = req.body;
                if (!latitude || !longitude || !radius) {
                    return res.status(400).json({ message: 'Please provide all geofence details' });
                }

                const geofenceCheck = await query('SELECT * FROM geofence WHERE college_code = $1', [admin.college_code]);
                let geofenceResult;

                if (geofenceCheck.rows.length > 0) {
                    const currentGeofence = geofenceCheck.rows[0];
                    geofenceResult = await query(
                        'UPDATE geofence SET name = $1, latitude = $2, longitude = $3, radius = $4 WHERE college_code = $5 RETURNING *',
                        [name || currentGeofence.name, latitude, longitude, radius, admin.college_code]
                    );
                } else {
                    geofenceResult = await query(
                        'INSERT INTO geofence (name, latitude, longitude, radius, college_code) VALUES ($1, $2, $3, $4, $5) RETURNING *',
                        [name || 'Main Campus', latitude, longitude, radius, admin.college_code]
                    );
                }

                const geofence = geofenceResult.rows[0];
                return res.status(201).json({
                    message: 'Geofence updated successfully',
                    geofence: { _id: geofence.id, name: geofence.name, latitude: geofence.latitude, longitude: geofence.longitude, radius: geofence.radius, collegeCode: geofence.college_code }
                });
            } else {
                return res.status(405).json({ message: 'Method Not Allowed' });
            }
        }

        if (action === 'analytics' && req.method === 'GET') {
            const collegeCode = admin.college_code;

            const totalStudentsQuery = await query('SELECT COUNT(*) FROM students WHERE college_code = $1', [collegeCode]);
            const totalStudents = parseInt(totalStudentsQuery.rows[0].count);

            const totalCampusesQuery = await query('SELECT COUNT(*) FROM geofence WHERE college_code = $1', [collegeCode]);
            const totalCampuses = parseInt(totalCampusesQuery.rows[0].count);

            const statsQuery = await query('SELECT status, COUNT(*) as count FROM attendance WHERE college_code = $1 GROUP BY status', [collegeCode]);

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
