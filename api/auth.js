const { query } = require('./utils/db');
const { comparePassword, hashPassword, generateToken } = require('./utils/auth');
const { sendVerificationEmail, sendResetEmail } = require('./utils/email');

export default async function handler(req, res) {
    // Explicit CORS Headers for Vercel Serverless
    res.setHeader('Access-Control-Allow-Credentials', true)
    res.setHeader('Access-Control-Allow-Origin', '*')
    res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT')
    res.setHeader(
        'Access-Control-Allow-Headers',
        'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, Authorization'
    )

    // Handle CORS preflight
    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    if (req.method !== 'POST') {
        return res.status(405).json({ message: 'Method Not Allowed' });
    }

    const { action } = req.query;

    try {
        if (action === 'adminLogin') {
            const { email, password } = req.body;
            const adminResult = await query('SELECT * FROM admins WHERE email = $1', [email]);
            if (adminResult.rows.length === 0) return res.status(401).json({ message: 'Invalid credentials' });

            const admin = adminResult.rows[0];
            if (await comparePassword(password, admin.password)) {
                return res.status(200).json({
                    _id: admin.id, name: admin.name, email: admin.email, role: 'admin', collegeName: admin.college_name, collegeCode: admin.college_code, token: generateToken(admin.id, admin.college_code),
                });
            } else {
                return res.status(401).json({ message: 'Invalid credentials' });
            }
        }

        if (action === 'adminSignup') {
            const { name, email, password, otp, collegeName, collegeCode } = req.body;
            if (!name || !email || !password || !otp || !collegeName || !collegeCode) {
                return res.status(400).json({ message: 'Please provide all fields, including college details and OTP' });
            }

            const adminExists = await query('SELECT * FROM admins WHERE email = $1', [email]);
            if (adminExists.rows.length > 0) return res.status(400).json({ message: 'Email already exists' });

            const collegeCodeExists = await query('SELECT * FROM admins WHERE college_code = $1', [collegeCode]);
            if (collegeCodeExists.rows.length > 0) return res.status(400).json({ message: 'College Code is already in use' });

            const otpRecord = await query('SELECT * FROM otps WHERE email = $1', [email]);
            if (otpRecord.rows.length === 0) return res.status(400).json({ message: 'No OTP found for this email. Please request a new one.' });

            const dbOtp = otpRecord.rows[0];
            const otpTime = new Date(dbOtp.created_at).getTime();
            const currentTime = new Date().getTime();
            if (currentTime - otpTime > 5 * 60 * 1000) {
                await query('DELETE FROM otps WHERE email = $1', [email]);
                return res.status(400).json({ message: 'OTP has expired. Please request a new one.' });
            }

            if (dbOtp.otp !== otp) return res.status(400).json({ message: 'Invalid OTP' });
            await query('DELETE FROM otps WHERE email = $1', [email]);

            const hashedPassword = await hashPassword(password);
            const newAdmin = await query(
                'INSERT INTO admins (name, email, password, college_name, college_code) VALUES ($1, $2, $3, $4, $5) RETURNING *',
                [name, email, hashedPassword, collegeName, collegeCode]
            );

            const admin = newAdmin.rows[0];
            return res.status(201).json({
                _id: admin.id, name: admin.name, email: admin.email, role: 'admin', collegeName: admin.college_name, collegeCode: admin.college_code, token: generateToken(admin.id, admin.college_code),
            });
        }

        if (action === 'sendAdminOtp') {
            const { name, email, password, collegeName, collegeCode } = req.body;
            if (!name || !email || !password || !collegeName || !collegeCode) {
                return res.status(400).json({ message: 'Please provide all required fields, including college details' });
            }

            const adminExists = await query('SELECT * FROM admins WHERE email = $1', [email]);
            if (adminExists.rows.length > 0) return res.status(400).json({ message: 'Email already exists' });

            const codeCheck = await query('SELECT * FROM admins WHERE college_code = $1', [collegeCode]);
            if (codeCheck.rows.length > 0) return res.status(400).json({ message: 'College Code is already in use' });

            const otp = Math.floor(100000 + Math.random() * 900000).toString();
            await query(`CREATE TABLE IF NOT EXISTS otps (email VARCHAR(255) PRIMARY KEY, otp VARCHAR(10) NOT NULL, created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP)`);
            await query(`INSERT INTO otps (email, otp, created_at) VALUES ($1, $2, CURRENT_TIMESTAMP) ON CONFLICT (email) DO UPDATE SET otp = EXCLUDED.otp, created_at = CURRENT_TIMESTAMP`, [email, otp]);

            await sendVerificationEmail(email, otp);
            return res.status(200).json({ message: 'Verification email sent successfully' });
        }

        if (action === 'studentLogin') {
            const { email, password } = req.body;
            const studentResult = await query('SELECT * FROM students WHERE email = $1', [email]);
            if (studentResult.rows.length === 0) return res.status(401).json({ message: 'Invalid credentials' });

            const student = studentResult.rows[0];
            if (await comparePassword(password, student.password)) {
                return res.status(200).json({
                    _id: student.id, name: student.name, email: student.email, rollNumber: student.roll_number, role: 'student', collegeCode: student.college_code, token: generateToken(student.id, student.college_code),
                });
            } else {
                return res.status(401).json({ message: 'Invalid credentials' });
            }
        }

        if (action === 'forgotPassword') {
            const { email } = req.body;
            if (!email) return res.status(400).json({ message: 'Email is required' });

            // Check if user exists in either table
            const adminCheck = await query('SELECT email FROM admins WHERE email = $1', [email]);
            const studentCheck = await query('SELECT email FROM students WHERE email = $1', [email]);

            if (adminCheck.rows.length === 0 && studentCheck.rows.length === 0) {
                return res.status(404).json({ message: 'User not found' });
            }

            const otp = Math.floor(100000 + Math.random() * 900000).toString();
            await query(`INSERT INTO otps (email, otp, created_at) VALUES ($1, $2, CURRENT_TIMESTAMP) ON CONFLICT (email) DO UPDATE SET otp = EXCLUDED.otp, created_at = CURRENT_TIMESTAMP`, [email, otp]);

            await sendResetEmail(email, otp);
            return res.status(200).json({ message: 'Reset OTP sent to your email' });
        }

        if (action === 'verifyResetOTP') {
            const { email, otp } = req.body;
            if (!email || !otp) return res.status(400).json({ message: 'Email and OTP are required' });

            const otpRecord = await query('SELECT * FROM otps WHERE email = $1', [email]);
            if (otpRecord.rows.length === 0) return res.status(400).json({ message: 'Invalid OTP or session expired' });

            const dbOtp = otpRecord.rows[0];
            const otpTime = new Date(dbOtp.created_at).getTime();
            const currentTime = new Date().getTime();

            if (currentTime - otpTime > 5 * 60 * 1000) {
                await query('DELETE FROM otps WHERE email = $1', [email]);
                return res.status(400).json({ message: 'OTP has expired' });
            }

            if (dbOtp.otp !== otp) return res.status(400).json({ message: 'Invalid OTP' });

            return res.status(200).json({ message: 'OTP verified successfully' });
        }

        if (action === 'resetPassword') {
            const { email, otp, newPassword } = req.body;
            if (!email || !otp || !newPassword) return res.status(400).json({ message: 'All fields are required' });

            // Verify OTP one last time
            const otpRecord = await query('SELECT * FROM otps WHERE email = $1', [email]);
            if (otpRecord.rows.length === 0 || otpRecord.rows[0].otp !== otp) {
                return res.status(400).json({ message: 'Invalid session' });
            }

            const hashedPassword = await hashPassword(newPassword);

            // Update in admins or students
            const adminUpdate = await query('UPDATE admins SET password = $1 WHERE email = $2', [hashedPassword, email]);
            if (adminUpdate.rowCount === 0) {
                await query('UPDATE students SET password = $1 WHERE email = $2', [hashedPassword, email]);
            }

            await query('DELETE FROM otps WHERE email = $1', [email]);
            return res.status(200).json({ message: 'Password reset successful. Please login.' });
        }

        return res.status(404).json({ message: 'API Action Not Found in auth.js' });

    } catch (error) {
        console.error("Auth API Error:", error);
        return res.status(500).json({ message: error.message || 'Internal Server Error' });
    }
}
