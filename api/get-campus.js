const { query } = require('./utils/db');
const { protectStudent } = require('./utils/auth');

module.exports = async (req, res) => {
    if (req.method !== 'GET') return res.status(405).json({ message: 'Method Not Allowed' });

    try {
        const student = await protectStudent(req);
        if (!student) return res.status(401).json({ message: 'Not authorized' });

        const campusQuery = await query(
            'SELECT latitude, longitude, radius, attendance_start_time, attendance_end_time FROM campus_setup WHERE college_code = $1',
            [student.college_code]
        );

        if (campusQuery.rows.length === 0) {
            return res.status(404).json({ message: 'Campus geofence not found' });
        }

        const campus = campusQuery.rows[0];
        return res.status(200).json({
            lat: Number(campus.latitude),
            lng: Number(campus.longitude),
            radius: Number(campus.radius),
            start_time: campus.attendance_start_time,
            end_time: campus.attendance_end_time
        });
    } catch (error) {
        console.error("Fetch Campus Error:", error);
        return res.status(500).json({ message: 'Server Error' });
    }
};
