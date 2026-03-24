const { query } = require('./utils/db');
const { protectStudent } = require('./utils/auth');

module.exports = async (req, res) => {
    // Handle CORS preflight
    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    try {
        if (req.method !== 'GET') {
            return res.status(405).json({ message: 'Method Not Allowed' });
        }

        const campusStudent = await protectStudent(req);
        if (!campusStudent) return res.status(401).json({ message: 'Not authorized' });

        const geofenceQuery = await query(
            'SELECT latitude, longitude, radius, attendance_start_time, attendance_end_time FROM campus_setup WHERE college_code = $1',
            [campusStudent.college_code]
        );

        if (geofenceQuery.rows.length === 0) {
            return res.status(404).json({ message: 'Campus geofence not configured. Ask your administrator to set it up.' });
        }

        const cfg = geofenceQuery.rows[0];
        return res.status(200).json({
            latitude: parseFloat(cfg.latitude),
            longitude: parseFloat(cfg.longitude),
            radius: parseFloat(cfg.radius),
            attendance_start_time: cfg.attendance_start_time || null,
            attendance_end_time: cfg.attendance_end_time || null
        });

    } catch (error) {
        console.error("Campus API Error:", error);
        return res.status(500).json({ message: error.message || 'Internal Server Error' });
    }
};
