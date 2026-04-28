const nodemailer = require('nodemailer');

const mail = 'smartnotes.web@gmail.com';
const password = '';  

function generateOTP(length) {
    const chars = '0123456789';
    let otp = '';
    for (let i = 0; i < length; i++) {
        otp += chars[Math.floor(Math.random() * chars.length)];
    }
    return otp;
}

async function sendOTP(email, otp) {
    try {
        console.log("Sending OTP to:", email);

        let transporter = nodemailer.createTransport({
            service: 'gmail',
            auth: {
                user: mail,
                pass: password
            }
        });

        let mailOptions = {
            from: `"SmartNotes" <${mail}>`,
            to: email,
            subject: 'OTP Verification - SmartNotes',

            html: `
            <div style="font-family: Arial, sans-serif; background:#f4f4f4; padding:20px;">
              <div style="max-width:500px; margin:auto; background:white; padding:20px; border-radius:10px;">
                
                <div style="text-align:center;">
                  <h2 style="color:#2c3e50;">SmartNotes</h2>
                </div>

                <p style="font-size:16px; color:#555;">
                  Hello,
                </p>

                <p style="font-size:16px; color:#555;">
                  Your OTP for email verification is:
                </p>

                <div style="text-align:center; margin:20px 0;">
                  <span style="font-size:32px; font-weight:bold; letter-spacing:6px; color:#007bff;">
                    ${otp}
                  </span>
                </div>

                <p style="font-size:14px; color:#999;">
                  This OTP is valid for a limited time. Do not share it with anyone.
                </p>

                <hr>

                <p style="text-align:center; font-size:12px; color:#aaa;">
                  © 2026 SmartNotes. All rights reserved.
                </p>

              </div>
            </div>
            `
        };

        let info = await transporter.sendMail(mailOptions);

        console.log('✅ Email sent:', info.response);

    } catch (error) {
        console.error('❌ Error sending email:', error);
        throw new Error('Error sending email');
    }
}

module.exports = { generateOTP, sendOTP };