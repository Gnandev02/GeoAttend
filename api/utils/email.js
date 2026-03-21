const nodemailer = require('nodemailer');

const sendVerificationEmail = async (toEmail, otp) => {
    try {
        const transporter = nodemailer.createTransport({
            host: 'smtp.gmail.com',
            port: 465,
            secure: true,
            auth: {
                user: process.env.EMAIL_USER,
                pass: process.env.EMAIL_PASS,
            },
        });

        const mailOptions = {
            from: process.env.EMAIL_USER,
            to: toEmail,
            subject: 'GeoAttend - Admin Signup Verification',
            html: `
                <div style="font-family: Arial, sans-serif; padding: 20px;">
                    <h2 style="color: #0284c7;">GeoAttend Admin Verification</h2>
                    <p>You requested to create an Admin account.</p>
                    <p>Your OTP code is: <strong style="font-size: 24px;">${otp}</strong></p>
                    <p>This code will expire in 10 minutes.</p>
                </div>
            `,
        };

        // Verify connection configuration
        await new Promise((resolve, reject) => {
            transporter.verify(function (error, success) {
                if (error) {
                    console.error("SMTP Connection Error:", error);
                    reject(error);
                } else {
                    console.log("Server is ready to take our messages");
                    resolve(success);
                }
            });
        });

        // Explicitly wrap sendMail in a promise to ensure serverless function waits for it
        const info = await new Promise((resolve, reject) => {
            transporter.sendMail(mailOptions, (err, info) => {
                if (err) {
                    console.error("sendMail Error:", err);
                    reject(err);
                } else {
                    console.log('Verification email sent: %s', info.messageId);
                    resolve(info);
                }
            });
        });

        return true;
    } catch (error) {
        console.error('Error sending verification email:', error);
        throw error;
    }
};

const sendResetEmail = async (toEmail, otp) => {
    try {
        const transporter = nodemailer.createTransport({
            host: 'smtp.gmail.com',
            port: 465,
            secure: true,
            auth: {
                user: process.env.EMAIL_USER,
                pass: process.env.EMAIL_PASS,
            },
        });

        const mailOptions = {
            from: process.env.EMAIL_USER,
            to: toEmail,
            subject: 'GeoAttend - Password Reset Verification',
            html: `
                <div style="font-family: Arial, sans-serif; padding: 20px; color: #1e293b;">
                    <h2 style="color: #0284c7;">GeoAttend Password Reset</h2>
                    <p>We received a request to reset your password.</p>
                    <p>Your OTP code is: <strong style="font-size: 24px;">${otp}</strong></p>
                    <p>This code will expire in 10 minutes. If you did not request this, please ignore this email.</p>
                </div>
            `,
        };

        await new Promise((resolve, reject) => {
            transporter.sendMail(mailOptions, (err, info) => {
                if (err) reject(err);
                else resolve(info);
            });
        });

        return true;
    } catch (error) {
        console.error('Error sending reset email:', error);
        throw error;
    }
};

const sendOnboardingEmail = async (toEmail, name, tempPassword, loginUrl = 'https://geoattend.vercel.app/student-login.html') => {
    try {
        const transporter = nodemailer.createTransport({
            host: 'smtp.gmail.com',
            port: 465,
            secure: true,
            auth: {
                user: process.env.EMAIL_USER,
                pass: process.env.EMAIL_PASS,
            },
        });

        const mailOptions = {
            from: process.env.EMAIL_USER,
            to: toEmail,
            subject: 'Your GeoAttend Account Credentials',
            html: `
                <div style="font-family: Arial, sans-serif; padding: 20px; color: #1e293b;">
                    <h2 style="color: #0284c7;">Welcome to GeoAttend!</h2>
                    <p>Hello ${name},</p>
                    <p>An admin has created your GeoAttend account. Here are your credentials:</p>
                    <ul>
                        <li><strong>Login Email:</strong> ${toEmail}</li>
                        <li><strong>Temporary Password:</strong> ${tempPassword}</li>
                    </ul>
                    <p>Please log in at <a href="${loginUrl}">GeoAttend Student Portal</a>.</p>
                    <p><strong>IMPORTANT:</strong> You will be required to change your password immediately upon your first login.</p>
                </div>
            `,
        };

        await new Promise((resolve, reject) => {
            transporter.sendMail(mailOptions, (err, info) => {
                if (err) reject(err);
                else resolve(info);
            });
        });

        return true;
    } catch (error) {
        console.error('Error sending onboarding email:', error);
        throw error;
    }
};

module.exports = { sendVerificationEmail, sendResetEmail, sendOnboardingEmail };
