const { query } = require('./utils/db');
const { comparePassword, generateToken } = require('./utils/auth');

module.exports = async (req, res) => {
    // Handle CORS preflight
    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    if (req.method !== 'POST') {
        return res.status(405).json({ message: 'Method Not Allowed' });
    }

    try {
        const { email, password } = req.body;

        const adminResult = await query('SELECT * FROM admins WHERE email = $1', [email]);
        if (adminResult.rows.length === 0) {
            return res.status(401).json({ message: 'Invalid credentials' });
        }

        const admin = adminResult.rows[0];

        if (await comparePassword(password, admin.password)) {
            return res.status(200).json({
                _id: admin.id,
                name: admin.name,
                email: admin.email,
                role: 'admin',
                collegeCode: admin.college_code,
                token: generateToken(admin.id, admin.college_code),
            });
        } else {
            return res.status(401).json({ message: 'Invalid credentials' });
        }
    } catch (error) {
        console.error("Admin Login Error:", error);
        return res.status(500).json({ message: error.message || 'Internal Server Error' });
    }
};
