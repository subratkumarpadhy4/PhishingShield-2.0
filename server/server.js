const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = 3000;
const REPORTS_FILE = path.join(__dirname, 'reports.json');
const USERS_FILE = path.join(__dirname, 'users.json');

// Middleware
app.use(cors());
app.use(bodyParser.json());

// PREVENT CRASHES: Global Error Handlers
process.on('uncaughtException', (err) => {
    console.error('CRITICAL ERROR (Uncaught Exception):', err);
    // Keep server alive
});

process.on('unhandledRejection', (reason, promise) => {
    console.error('CRITICAL ERROR (Unhandled Rejection):', reason);
    // Keep server alive
});

// Initialize Data Files
if (!fs.existsSync(REPORTS_FILE)) fs.writeFileSync(REPORTS_FILE, JSON.stringify([], null, 2));
if (!fs.existsSync(USERS_FILE)) fs.writeFileSync(USERS_FILE, JSON.stringify([], null, 2));

// --- Helpers ---
const readData = (file) => {
    try {
        return JSON.parse(fs.readFileSync(file));
    } catch (e) { return []; }
};
const writeData = (file, data) => {
    fs.writeFileSync(file, JSON.stringify(data, null, 2));
};

// --- ROUTES: REPORTS ---

// GET /api/reports
app.get('/api/reports', (req, res) => {
    res.json(readData(REPORTS_FILE));
});

// POST /api/reports
app.post('/api/reports', (req, res) => {
    const newReport = req.body;
    if (!newReport.url) return res.status(400).json({ error: "Missing URL" });

    const report = {
        id: Date.now().toString(),
        url: newReport.url,
        hostname: newReport.hostname || 'Unknown',
        reporter: newReport.reporter || 'Anonymous',
        timestamp: Date.now(),
        status: 'pending',
        ...newReport
    };

    const reports = readData(REPORTS_FILE);
    reports.push(report);
    writeData(REPORTS_FILE, reports);

    console.log(`[Report] ${report.url} by ${report.reporter}`);
    res.status(201).json({ message: "Report logged", report });
});

// --- ROUTES: USERS & AUTH ---

// GET /api/users
app.get('/api/users', (req, res) => {
    const users = readData(USERS_FILE);
    // Return safe public info if needed, or full objects for this internal extension backend
    res.json(users);
});

// Email Configuration (Nodemailer)
const nodemailer = require('nodemailer');
const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: 'phishingshield@gmail.com',
        pass: 'ugnd itej eqlw gywt' // App Password
    }
});

// In-memory OTP store (Global variable)
const otpStore = {};

// POST /api/send-otp
app.post('/api/send-otp', (req, res) => {
    const { email } = req.body;
    if (!email) return res.status(400).json({ success: false, message: "Email required" });

    // Generate 4-digit code
    const code = Math.floor(1000 + Math.random() * 9000).toString();
    otpStore[email] = code;

    // Log for Dev
    console.log(`[OTP] Preparing to send ${code} to ${email}...`);

    const mailOptions = {
        from: '"PhishingShield Security" <phishingshield@gmail.com>',
        to: email,
        subject: 'Your Verification Code',
        html: `
            <div style="font-family: Arial, sans-serif; padding: 20px; color: #333;">
                <h2 style="color: #0d6efd;">PhishingShield Verification</h2>
                <p>Use the following code to complete your request:</p>
                <div style="font-size: 24px; font-weight: bold; letter-spacing: 5px; background: #f8f9fa; padding: 15px; text-align: center; border-radius: 8px; border: 1px solid #ddd; margin: 20px 0;">
                    ${code}
                </div>
                <p>This code will expire in 10 minutes.</p>
                <p style="font-size: 12px; color: #888;">If you didn't request this, please ignore this email.</p>
            </div>
        `
    };

    transporter.sendMail(mailOptions, (error, info) => {
        if (error) {
            console.error('[OTP] Error sending email:', error);
            // Fallback to console log if email fails so user is not stuck
            console.log(`[OTP FALLBACK] Code for ${email}: ${code}`);
            return res.status(500).json({ success: false, message: "Failed to send email. Check server logs." });
        }
        console.log('[OTP] Email sent:', info.response);
        res.json({ success: true, message: "OTP Sent to Email!" });
    });
});

// POST /api/verify-otp (Mock)
app.post('/api/verify-otp', (req, res) => {
    const { email, otp } = req.body;

    // Check against stored code
    if (otpStore[email] && otpStore[email] === otp) {
        console.log(`[OTP] ✅ Verified for ${email}`);
        delete otpStore[email]; // Clear after use
        res.json({ success: true });
    } else {
        console.warn(`[OTP] ❌ Failed for ${email}. Expected: ${otpStore[email]}, Got: ${otp}`);
        res.status(400).json({ success: false, message: "Invalid OTP" });
    }
});

// POST /api/users/sync (Create or Update User)
app.post('/api/users/sync', (req, res) => {
    const userData = req.body;
    if (!userData.email) return res.status(400).json({ error: "Email required" });

    const users = readData(USERS_FILE);
    const idx = users.findIndex(u => u.email === userData.email);

    if (idx !== -1) {
        // Update existing
        users[idx] = { ...users[idx], ...userData };
        console.log(`[User] Updated info for ${userData.email}`);
    } else {
        // Create new
        users.push(userData);
        console.log(`[User] New user registered: ${userData.email}`);
    }

    writeData(USERS_FILE, users);
    res.json({ success: true, user: userData });
});

// POST /api/users/delete
app.post('/api/users/delete', (req, res) => {
    const { email } = req.body;
    let users = readData(USERS_FILE);
    const initialLen = users.length;
    users = users.filter(u => u.email !== email);

    if (users.length !== initialLen) {
        writeData(USERS_FILE, users);
        console.log(`[User] Deleted: ${email}`);
        res.json({ success: true });
    } else {
        res.status(404).json({ success: false, message: "User not found" });
    }
});

// POST /api/users/reset-password
app.post('/api/users/reset-password', (req, res) => {
    const { email, password } = req.body;
    const users = readData(USERS_FILE);
    const idx = users.findIndex(u => u.email === email);

    if (idx !== -1) {
        users[idx].password = password;
        writeData(USERS_FILE, users);
        console.log(`[User] Password reset for: ${email}`);
        res.json({ success: true });
    } else {
        res.status(404).json({ success: false, message: "User not found" });
    }
});

// Start Server
app.listen(PORT, () => {
    console.log(`PhishingShield Backend running on http://localhost:${PORT}`);
});
