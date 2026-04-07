const nodemailer = require('nodemailer');

const sendVerificationEmail = async (toEmail, otp) => {
    try {
        const transporter = nodemailer.createTransport({
            service: 'gmail',
            port: 587,
            secure: false, // true for 465, false for other ports
            auth: {
                user: process.env.EMAIL_USER,
                pass: process.env.EMAIL_PASS,
            },
        });

        const mailOptions = {
            from: process.env.EMAIL_USER,
            to: toEmail,
            subject: 'Your GeoAttend OTP Code',
            text: `Your OTP is: ${otp}. It is valid for 5 minutes.`,
            html: `
                <div style="font-family: Arial, sans-serif; padding: 20px; color: #1e293b;">
                    <h2 style="color: #0284c7;">GeoAttend OTP Verification</h2>
                    <p style="font-size: 16px;">Your OTP is: <strong style="font-size: 24px; color: #0284c7;">${otp}</strong></p>
                    <p style="font-size: 14px; color: #64748b;">It is valid for 5 minutes.</p>
                </div>
            `,
        };

        await new Promise((resolve, reject) => {
            transporter.sendMail(mailOptions, (err, info) => {
                if (err) {
                    console.error("sendMail Error:", err);
                    reject(err);
                } else {
                    console.log('OTP email sent: %s', info.messageId);
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
            service: 'gmail',
            host: 'smtp.gmail.com',
            port: 587,
            secure: false,
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

const sendOnboardingEmail = async (toEmail, name, tempPassword, collegeCode, loginUrl = 'https://geoattend.vercel.app/student-login.html') => {
    try {
        const transporter = nodemailer.createTransport({
            service: 'gmail',
            host: 'smtp.gmail.com',
            port: 587,
            secure: false,
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
                <div style="font-family: Arial, sans-serif; padding: 30px; color: #1e293b; background-color: #f8fafc; border-radius: 12px; max-width: 600px; margin: 0 auto; border: 1px solid #e2e8f0;">
                    <h2 style="color: #4f46e5; margin-bottom: 20px;">Welcome to GeoAttend!</h2>
                    <p style="font-size: 16px; line-height: 1.6; margin-bottom: 20px;">Hello ${name},</p>
                    <p style="font-size: 16px; line-height: 1.6; margin-bottom: 30px;">An admin has created your student account. Please use the Following credentials to log in to the GeoAttend portal:</p>
                    
                    <div style="background-color: white; padding: 25px; border-radius: 12px; border: 1px solid #e2e8f0; margin-bottom: 30px; box-shadow: 0 4px 6px -1px rgb(0 0 0 / 0.1);">
                        <table style="width: 100%; border-collapse: collapse;">
                            <tr>
                                <td style="padding: 8px 0; color: #64748b; font-size: 12px; font-weight: bold; text-transform: uppercase; letter-spacing: 0.1em;">Login Email</td>
                                <td style="padding: 8px 0; color: #1e293b; font-weight: bold; text-align: right;">${toEmail}</td>
                            </tr>
                            <tr>
                                <td style="padding: 8px 0; color: #64748b; font-size: 12px; font-weight: bold; text-transform: uppercase; letter-spacing: 0.1em;">Temporary Password</td>
                                <td style="padding: 8px 0; color: #4f46e5; font-weight: bold; font-family: monospace; text-align: right; background-color: #f5f3ff; border-radius: 4px; padding: 4px 8px;">${tempPassword}</td>
                            </tr>
                            <tr>
                                <td style="padding: 8px 0; color: #64748b; font-size: 12px; font-weight: bold; text-transform: uppercase; letter-spacing: 0.1em;">College Code</td>
                                <td style="padding: 8px 0; color: #1e293b; font-weight: bold; font-family: monospace; text-align: right; letter-spacing: 0.1em;">${collegeCode}</td>
                            </tr>
                        </table>
                    </div>

                    <div style="text-align: center; margin-bottom: 30px;">
                        <a href="${loginUrl}" style="background-color: #4f46e5; color: white; padding: 12px 30px; text-decoration: none; border-radius: 8px; font-weight: bold; display: inline-block;">Log In to Portal</a>
                    </div>
                    
                    <p style="font-size: 14px; color: #64748b; line-height: 1.6; text-align: center;"><strong>IMPORTANT:</strong> You are advised to change your password immediately upon your first login for better security.</p>
                </div>
            `,
        };

        await new Promise((resolve, reject) => {
            transporter.sendMail(mailOptions, (err, info) => {
                if (err) reject(err);
                else resolve(info);
            });
        });

        console.log(`Onboarding email sent successfully to: ${toEmail} for campus: ${collegeCode}`);
        return true;
    } catch (error) {
        console.error('Error sending onboarding email:', error);
        throw error;
    }
};

module.exports = { sendVerificationEmail, sendResetEmail, sendOnboardingEmail };
