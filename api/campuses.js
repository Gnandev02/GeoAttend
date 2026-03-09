const { query } = require('./utils/db');
const { protectAdmin } = require('./utils/auth');

module.exports = async (req, res) => {
    // Handle CORS preflight
    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    const admin = await protectAdmin(req);
    if (!admin) {
        return res.status(401).json({ message: 'Not authorized as an admin' });
    }

    try {
        if (req.method === 'GET') {
            const geofenceQuery = await query('SELECT * FROM geofence WHERE college_code = $1', [admin.college_code]);

            if (geofenceQuery.rows.length > 0) {
                const geofence = geofenceQuery.rows[0];
                return res.status(200).json({
                    _id: geofence.id,
                    name: geofence.name,
                    latitude: geofence.latitude,
                    longitude: geofence.longitude,
                    radius: geofence.radius,
                    collegeCode: geofence.college_code
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
                geofence: {
                    _id: geofence.id,
                    name: geofence.name,
                    latitude: geofence.latitude,
                    longitude: geofence.longitude,
                    radius: geofence.radius,
                    collegeCode: geofence.college_code
                }
            });
        } else {
            return res.status(405).json({ message: 'Method Not Allowed' });
        }
    } catch (error) {
        console.error("Campuses Error:", error);
        return res.status(500).json({ message: error.message || 'Internal Server Error' });
    }
};
