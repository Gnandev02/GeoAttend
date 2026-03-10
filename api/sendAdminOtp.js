const { query } = require('./utils/db');
const { sendVerificationEmail } = require('./utils/email');

module.exports = async (req, res) => {
    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    if (req.method !== 'POST') {
        return res.status(405).json({ message: 'Method Not Allowed' });
    }

    try {
        const { name, email, password, collegeName, collegeCode } = req.body;

        if (!name || !email || !password || !collegeName || !collegeCode) {
            return res.status(400).json({ message: 'Please provide all required fields' });
        }

        // Check if email already exists
        const adminExists = await query('SELECT * FROM admins WHERE email = $1', [email]);
        if (adminExists.rows.length > 0) {
            return res.status(400).json({ message: 'Email already exists' });
        }

        // Check if college code already exists
        const collegeExists = await query('SELECT * FROM admins WHERE college_code = $1', [collegeCode]);
        if (collegeExists.rows.length > 0) {
            return res.status(400).json({ message: 'College Code already in use' });
        }

        // Generate 6 digit OTP
        const otp = Math.floor(100000 + Math.random() * 900000).toString();

        // Ensure table exists
        await query(`
            CREATE TABLE IF NOT EXISTS otps (
                email VARCHAR(255) PRIMARY KEY,
                otp VARCHAR(10) NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);

        // Save OTP to DB (upsert if they re-request)
        await query(
            `INSERT INTO otps (email, otp, created_at) 
             VALUES ($1, $2, CURRENT_TIMESTAMP) 
             ON CONFLICT (email) DO UPDATE SET otp = EXCLUDED.otp, created_at = CURRENT_TIMESTAMP`,
            [email, otp]
        );

        // Send Email
        await sendVerificationEmail(email, otp);

        return res.status(200).json({ message: 'Verification email sent successfully' });
    } catch (error) {
        console.error("Send OTP Error:", error);
        return res.status(500).json({ message: error.message || 'Internal Server Error' });
    }
};
