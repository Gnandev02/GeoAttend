const { query } = require('./utils/db');
const { sendVerificationEmail } = require('./utils/email');

export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ success: false, message: 'Method Not Allowed' });
    }

    const { name, email, password } = req.body;

    // 1. Validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!email || !emailRegex.test(email)) {
        return res.status(400).json({ success: false, message: 'Invalid email format.' });
    }
    if (!password || password.length < 6) {
        return res.status(400).json({ success: false, message: 'Password must be at least 6 characters.' });
    }
    if (!name || name.trim().length === 0) {
        return res.status(400).json({ success: false, message: 'Name is required.' });
    }

    try {
        // 2. Check if admin already exists
        const existingAdmin = await query('SELECT id FROM admins WHERE email = $1', [email]);
        if (existingAdmin.rows.length > 0) {
            return res.status(400).json({ success: false, message: 'Account with this email already exists.' });
        }

        // 3. Generate 6-digit OTP
        const otp = Math.floor(100000 + Math.random() * 900000).toString();
        console.log(`[DEBUG] Generated OTP for ${email}: ${otp}`);

        // 4. Store OTP in database
        // Ensure table has 'attempts' column. If not, we'll catch the error.
        await query(
            `INSERT INTO otps (email, otp, created_at, attempts) VALUES ($1, $2, CURRENT_TIMESTAMP, 0)
             ON CONFLICT (email) DO UPDATE SET otp = EXCLUDED.otp, created_at = CURRENT_TIMESTAMP, attempts = 0`,
            [email, otp]
        );

        // 5. Send Email
        try {
            await sendVerificationEmail(email, otp);
            console.log(`[SUCCESS] OTP sent to ${email}`);
            return res.status(200).json({ success: true, message: 'OTP sent successfully' });
        } catch (emailError) {
            console.error("[ERROR] Failed to send email:", emailError);
            return res.status(500).json({ 
                success: false, 
                message: "OTP service unavailable. Please try again later." 
            });
        }

    } catch (dbError) {
        console.error("[ERROR] Database error:", dbError);
        return res.status(500).json({ 
            success: false, 
            message: "Internal server error. Failed to process OTP request." 
        });
    }
}
