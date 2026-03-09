const { query } = require('./utils/db');
const { protectAdmin } = require('./utils/auth');

module.exports = async (req, res) => {
    // Handle CORS preflight
    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    if (req.method !== 'GET') {
        return res.status(405).json({ message: 'Method Not Allowed' });
    }

    const admin = await protectAdmin(req);
    if (!admin) {
        return res.status(401).json({ message: 'Not authorized as an admin' });
    }

    try {
        const collegeCode = admin.college_code;

        const totalStudentsQuery = await query('SELECT COUNT(*) FROM students WHERE college_code = $1', [collegeCode]);
        const totalStudents = parseInt(totalStudentsQuery.rows[0].count);

        const totalCampusesQuery = await query('SELECT COUNT(*) FROM geofence WHERE college_code = $1', [collegeCode]);
        const totalCampuses = parseInt(totalCampusesQuery.rows[0].count);

        const statsQuery = await query(
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

        return res.status(200).json({
            overall: {
                totalStudents,
                totalCampuses,
                ...formattedStats
            }
        });
    } catch (error) {
        console.error("Analytics Error:", error);
        return res.status(500).json({ message: error.message || 'Internal Server Error' });
    }
};
