const { query } = require('./utils/db');
const { hashPassword, generateToken } = require('./utils/auth');

module.exports = async (req, res) => {
    // Handle CORS preflight
    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    if (req.method !== 'POST') {
        return res.status(405).json({ message: 'Method Not Allowed' });
    }

    try {
        const { name, email, password, collegeName, collegeCode, otp } = req.body;

        if (!name || !email || !password || !collegeName || !collegeCode || !otp) {
            return res.status(400).json({ message: 'Please add all fields, including OTP' });
        }

        const adminExists = await query('SELECT * FROM admins WHERE email = $1', [email]);
        if (adminExists.rows.length > 0) {
            return res.status(400).json({ message: 'Email already exists' });
        }

        const collegeExists = await query('SELECT * FROM admins WHERE college_code = $1', [collegeCode]);
        if (collegeExists.rows.length > 0) {
            return res.status(400).json({ message: 'College Code already in use' });
        }

        const otpRecord = await query('SELECT * FROM otps WHERE email = $1', [email]);
        if (otpRecord.rows.length === 0) {
            return res.status(400).json({ message: 'No OTP found for this email. Please request a new one.' });
        }

        const dbOtp = otpRecord.rows[0];

        // Check EXP expiration (10 minutes)
        const otpTime = new Date(dbOtp.created_at).getTime();
        const currentTime = new Date().getTime();
        if (currentTime - otpTime > 10 * 60 * 1000) {
            await query('DELETE FROM otps WHERE email = $1', [email]);
            return res.status(400).json({ message: 'OTP has expired. Please request a new one.' });
        }

        if (dbOtp.otp !== otp) {
            return res.status(400).json({ message: 'Invalid OTP' });
        }

        await query('DELETE FROM otps WHERE email = $1', [email]);

        const hashedPassword = await hashPassword(password);

        const newAdmin = await query(
            'INSERT INTO admins (name, email, password, college_name, college_code) VALUES ($1, $2, $3, $4, $5) RETURNING *',
            [name, email, hashedPassword, collegeName, collegeCode]
        );

        const admin = newAdmin.rows[0];

        return res.status(201).json({
            _id: admin.id,
            name: admin.name,
            email: admin.email,
            role: 'admin',
            collegeCode: admin.college_code,
            token: generateToken(admin.id, admin.college_code),
        });
    } catch (error) {
        console.error("Signup Error:", error);
        return res.status(500).json({ message: error.message || 'Internal Server Error' });
    }
};
