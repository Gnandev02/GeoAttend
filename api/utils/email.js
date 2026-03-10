const nodemailer = require('nodemailer');

const sendVerificationEmail = async (toEmail, otp) => {
    try {
        const transporter = nodemailer.createTransport({
            service: 'gmail',
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

        const info = await transporter.sendMail(mailOptions);
        console.log('Verification email sent: %s', info.messageId);
        return true;
    } catch (error) {
        console.error('Error sending verification email:', error);
        throw error;
    }
};

module.exports = { sendVerificationEmail };
