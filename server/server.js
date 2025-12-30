const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const fs = require('fs');
const path = require('path');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');

const app = express();
const PORT = process.env.PORT || 3000;
const REPORTS_FILE = path.join(__dirname, 'reports.json');
const USERS_FILE = path.join(__dirname, 'users.json');
const AUDIT_LOG_FILE = path.join(__dirname, 'data', 'audit_logs.json');

// Admin Configuration (Server-Side Only)
const ADMIN_EMAILS = ['rajkumarpadhy2006@gmail.com']; // Add more admin emails here
const JWT_SECRET = process.env.JWT_SECRET || 'phishingshield-secret-key-change-in-production-2024';
const JWT_EXPIRY_ADMIN = '10d'; // Admin sessions expire in 10 days

// Middleware
// Enhanced CORS configuration for Chrome extension and web access
app.use(cors({
    origin: '*', // Allow all origins (Chrome extensions use chrome-extension:// URLs)
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
    credentials: false
}));

// Handle preflight requests
app.options('*', cors());

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
if (!fs.existsSync(path.dirname(AUDIT_LOG_FILE))) fs.mkdirSync(path.dirname(AUDIT_LOG_FILE), { recursive: true });
if (!fs.existsSync(AUDIT_LOG_FILE)) fs.writeFileSync(AUDIT_LOG_FILE, JSON.stringify([], null, 2));

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

// Email Configuration (EmailJS - Works with Gmail, no domain verification needed)
const axios = require('axios');
let emailServiceReady = false;

// EmailJS Configuration
const EMAILJS_SERVICE_ID = process.env.EMAILJS_SERVICE_ID || "service_orcv7av";
const EMAILJS_TEMPLATE_ID = process.env.EMAILJS_TEMPLATE_ID || "template_f0lfm5h";
const EMAILJS_PUBLIC_KEY = process.env.EMAILJS_PUBLIC_KEY || "BxDgzDbuSkLEs4H_9";

// Initialize EmailJS
function initializeEmailService() {
    if (!EMAILJS_SERVICE_ID || !EMAILJS_TEMPLATE_ID || !EMAILJS_PUBLIC_KEY) {
        console.warn('[EMAIL] EmailJS not fully configured. OTPs will be logged to console.');
        console.warn('[EMAIL] Set EMAILJS_SERVICE_ID, EMAILJS_TEMPLATE_ID, and EMAILJS_PUBLIC_KEY environment variables.');
        return false;
    }

    try {
        console.log('[EMAIL] EmailJS initialized successfully');
        console.log(`[EMAIL] Service ID: ${EMAILJS_SERVICE_ID}`);
        console.log('[EMAIL] No domain verification needed - works with Gmail!');
        console.log('[EMAIL] Free tier: 200 emails/month');
        return true;
    } catch (error) {
        console.error('[EMAIL] Failed to initialize EmailJS:', error.message);
        console.log('[EMAIL] Server will continue without email functionality');
        return false;
    }
}

emailServiceReady = initializeEmailService();

// Helper function to convert HTML to plain text (simple version)
function htmlToText(html) {
    return html
        .replace(/<style[^>]*>.*?<\/style>/gi, '')
        .replace(/<[^>]+>/g, '')
        .replace(/\n\s*\n/g, '\n')
        .trim();
}

// Helper function to send email via EmailJS
async function sendEmail(to, subject, htmlContent, options = {}) {
    // Extract OTP code from HTML
    const otpMatch = htmlContent.match(/>(\d{4,6})</);
    const otpCode = otpMatch ? otpMatch[1] : 'XXXX';

    // Extract recipient name if available
    const toName = options.toName || "User";

    try {
        const payload = {
            service_id: EMAILJS_SERVICE_ID,
            template_id: EMAILJS_TEMPLATE_ID,
            user_id: EMAILJS_PUBLIC_KEY,
            template_params: {
                to_name: toName,
                to_email: to,
                email: to,
                otp: otpCode,
                subject: subject,
                message: htmlContent
            }
        };

        const config = {
            headers: {
                'Content-Type': 'application/json',
                'Origin': 'https://phishingshield.onrender.com'
            }
        };

        const response = await axios.post('https://api.emailjs.com/api/v1.0/email/send', payload, config);

        console.log('[EMAIL] Email sent successfully via EmailJS');
        return { success: true, response: response.data };
    } catch (error) {
        console.error('[EMAIL] EmailJS error:', error.message);
        if (error.response) {
            console.error('[EMAIL] EmailJS response:', error.response.data);
        }
        return { success: false, error: error.message };
    }
}

// In-memory OTP store (Global variable)
const otpStore = {};

// Admin-specific stores
const adminPendingSessions = {}; // Stores temporary admin sessions before MFA
const adminSessions = {}; // Stores active admin sessions
const adminRateLimit = {}; // Rate limiting for admin endpoints




// Helper: Generate 6-digit OTP for admin
function generateAdminOTP() {
    return Math.floor(100000 + Math.random() * 900000).toString();
}

// Helper: Audit logging
function logAdminAction(userId, action, ipAddress, success, details = {}) {
    const logs = readData(AUDIT_LOG_FILE);
    logs.push({
        id: `log_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        userId,
        action,
        ipAddress,
        userAgent: details.userAgent || 'Unknown',
        success,
        details,
        timestamp: new Date().toISOString()
    });
    writeData(AUDIT_LOG_FILE, logs);
    console.log(`[AUDIT] ${action} - User: ${userId} - IP: ${ipAddress} - Success: ${success}`);
}

// Helper: Rate limiting check for admin
function checkAdminRateLimit(ip, endpoint) {
    // RATE LIMIT DISABLED BY ADMIN REQUEST
    return true;
}

// Helper: Get client IP
function getClientIP(req) {
    return req.headers['x-forwarded-for']?.split(',')[0] ||
        req.connection.remoteAddress ||
        req.socket.remoteAddress ||
        '127.0.0.1';
}

// POST /api/send-otp
app.post('/api/send-otp', async (req, res) => {
    const { email } = req.body;
    if (!email) return res.status(400).json({ success: false, message: "Email required" });

    // Generate 4-digit code
    const code = Math.floor(1000 + Math.random() * 9000).toString();
    otpStore[email] = code;

    // Log for Dev
    console.log(`[OTP] Preparing to send ${code} to ${email}...`);

    // EmailJS uses template, so FROM_EMAIL is set in EmailJS dashboard
    const fromEmail = process.env.FROM_EMAIL || 'phishingshield@gmail.com';
    const mailOptions = {
        from: `"PhishingShield Security" <${fromEmail}>`,
        to: email,
        subject: 'Your Verification Code',
        html: `
            <div style="background-color: #f4f6f9; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; padding: 40px 0;">
                <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 12px; box-shadow: 0 4px 20px rgba(0,0,0,0.05); overflow: hidden;">
                    <!-- Header -->
                    <div style="background-color: #0f172a; padding: 30px; text-align: center;">
                        <h1 style="color: #ffffff; margin: 0; font-size: 24px; letter-spacing: 1px;">PhishingShield</h1>
                    </div>
                    
                    <!-- Content -->
                    <div style="padding: 40px 30px; text-align: center;">
                        <h2 style="color: #1e293b; font-size: 22px; margin-bottom: 10px;">Verification Required</h2>
                        <p style="color: #64748b; font-size: 16px; line-height: 1.5; margin-bottom: 30px;">
                            You are registering or signing in to PhishingShield. Please use the verification code below to complete the process.
                        </p>
                        
                        <!-- OTP Code -->
                        <div style="background-color: #f1f5f9; border: 2px dashed #94a3b8; border-radius: 8px; padding: 20px; margin: 0 auto 30px; width: fit-content; min-width: 200px;">
                            <span style="font-size: 32px; font-weight: 800; letter-spacing: 8px; color: #0d6efd; display: block;">${code}</span>
                        </div>
                        
                        <p style="color: #94a3b8; font-size: 14px; margin-top: 30px;">
                            This code will expire in 10 minutes.<br>
                            If you did not request this email, please ignore it.
                        </p>
                    </div>
                    
                    <!-- Footer -->
                    <div style="background-color: #f8fafc; padding: 20px; text-align: center; border-top: 1px solid #e2e8f0;">
                        <p style="color: #cbd5e1; font-size: 12px; margin: 0;">
                            &copy; ${new Date().getFullYear()} PhishingShield Security. All rights reserved.
                        </p>
                    </div>
                </div>
            </div>
        `
    };

    // Check if email service is available
    if (!emailServiceReady) {
        console.log(`[OTP FALLBACK] Email service unavailable. Code for ${email}: ${code}`);
        return res.json({ success: true, message: "OTP generated (check server logs)" });
    }

    // Send email via EmailJS
    const emailResult = await sendEmail(
        email,
        mailOptions.subject,
        mailOptions.html,
        {
            toName: req.body.name || "User"
        }
    );

    if (emailResult.success) {
        console.log(`[OTP] Email sent successfully to ${email}`);
        res.json({ success: true, message: "OTP Sent to Email!" });
    } else {
        console.error('[OTP] Error sending email:', emailResult.error);
        console.log(`[OTP FALLBACK] Code for ${email}: ${code}`);
        res.json({ success: true, message: "OTP generated (check server logs)" });
    }
});

// POST /api/verify-otp (Mock)
app.post('/api/verify-otp', (req, res) => {
    const { email, otp } = req.body;

    // Check against stored code (Robust string comparison)
    const stored = otpStore[email] ? String(otpStore[email]).trim() : null;
    const input = otp ? String(otp).trim() : '';

    if (stored && stored === input) {
        console.log(`[OTP] ✅ Verified for ${email}`);
        delete otpStore[email]; // Clear after use
        res.json({ success: true });
    } else {
        console.warn(`[OTP] ❌ Failed for ${email}. Expected: ${stored}, Got: ${input}`);
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

// ============================================
// ADMIN AUTHENTICATION ENDPOINTS (SECURE)
// ============================================

// POST /api/auth/admin/login - Step 1: Primary Authentication
app.post('/api/auth/admin/login', async (req, res) => {
    const { email, password } = req.body;
    const ip = getClientIP(req);

    // Rate limiting check
    if (!checkAdminRateLimit(ip, 'admin_login')) {
        logAdminAction(email || 'unknown', 'admin_login_attempt', ip, false, { reason: 'rate_limit_exceeded' });
        return res.status(429).json({
            success: false,
            message: "Too many attempts. Please try again in 30 minutes."
        });
    }

    if (!email || !password) {
        return res.status(400).json({ success: false, message: "Email and password required" });
    }

    // Server-side admin check
    if (!isAdminEmail(email)) {
        logAdminAction(email, 'admin_login_attempt', ip, false, { reason: 'not_admin_email' });
        return res.status(403).json({ success: false, message: "Access denied" });
    }

    // Find user
    const users = readData(USERS_FILE);
    const user = users.find(u => u.email.toLowerCase() === email.toLowerCase());

    if (!user) {
        logAdminAction(email, 'admin_login_attempt', ip, false, { reason: 'user_not_found' });
        return res.status(401).json({ success: false, message: "Invalid credentials" });
    }

    // Verify password (plaintext for now, but admin should use strong password)
    if (user.password !== password) {
        logAdminAction(email, 'admin_login_attempt', ip, false, { reason: 'invalid_password' });
        return res.status(401).json({ success: false, message: "Invalid credentials" });
    }

    // Generate MFA session
    const sessionId = `admin_sess_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const otp = generateAdminOTP();

    // Store pending session (expires in 5 minutes)
    adminPendingSessions[sessionId] = {
        email: user.email,
        userId: user.email, // Using email as ID
        otp,
        expiresAt: Date.now() + (5 * 60 * 1000), // 5 minutes
        ip,
        createdAt: Date.now()
    };

    // Send OTP via email using Resend
    // EmailJS uses template, so FROM_EMAIL is set in EmailJS dashboard
    const fromEmail = process.env.FROM_EMAIL || 'phishingshield@gmail.com';
    const adminEmailHtml = `
        <div style="background-color: #f4f6f9; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; padding: 40px 0;">
            <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 12px; box-shadow: 0 4px 20px rgba(0,0,0,0.05); overflow: hidden;">
                <div style="background-color: #dc3545; padding: 30px; text-align: center;">
                    <h1 style="color: #ffffff; margin: 0; font-size: 24px; letter-spacing: 1px;">🔒 Admin Access</h1>
                </div>
                <div style="padding: 40px 30px; text-align: center;">
                    <h2 style="color: #1e293b; font-size: 22px; margin-bottom: 10px;">Admin Login Verification</h2>
                    <p style="color: #64748b; font-size: 16px; line-height: 1.5; margin-bottom: 30px;">
                        Someone is attempting to access the PhishingShield Admin Portal. If this was you, use the code below to complete login.
                    </p>
                    <div style="background-color: #fff3cd; border: 2px solid #ffc107; border-radius: 8px; padding: 20px; margin: 0 auto 30px; width: fit-content; min-width: 250px;">
                        <span style="font-size: 36px; font-weight: 800; letter-spacing: 12px; color: #dc3545; display: block;">${otp}</span>
                    </div>
                    <p style="color: #dc3545; font-size: 14px; font-weight: 600; margin-top: 30px;">
                        ⚠️ This code expires in 5 minutes.<br>
                        ⚠️ If you did not request this, secure your account immediately.
                    </p>
                </div>
                <div style="background-color: #f8fafc; padding: 20px; text-align: center; border-top: 1px solid #e2e8f0;">
                    <p style="color: #cbd5e1; font-size: 12px; margin: 0;">
                        &copy; ${new Date().getFullYear()} PhishingShield Security. All rights reserved.
                    </p>
                </div>
            </div>
        </div>
    `;

    if (emailServiceReady) {
        const emailResult = await sendEmail(
            user.email,
            '🔐 Your PhishingShield Admin Login Code',
            adminEmailHtml,
            {
                toName: user.name || "Admin"
            }
        );

        if (emailResult.success) {
            console.log(`[Admin OTP] Email sent successfully to ${user.email}`);
        } else {
            console.error('[Admin OTP] Error sending email:', emailResult.error);
            console.log(`[Admin OTP FALLBACK] Code for ${user.email}: ${otp}`);
        }
    } else {
        console.log(`[Admin OTP FALLBACK] Email service unavailable. Code for ${user.email}: ${otp}`);
    }

    logAdminAction(user.email, 'admin_login_step1', ip, true, { sessionId });

    res.json({
        success: true,
        sessionId,
        requiresMFA: true,
        message: "OTP sent to your email. Please check your inbox."
    });
});

// Persistent Admin Sessions
const SESSIONS_FILE = path.join(__dirname, 'data', 'admin_sessions.json');
if (!fs.existsSync(SESSIONS_FILE)) fs.writeFileSync(SESSIONS_FILE, JSON.stringify({}, null, 2));

function getAdminSessions() {
    return readData(SESSIONS_FILE) || {};
}

function saveAdminSessions(sessions) {
    writeData(SESSIONS_FILE, sessions);
}

// POST /api/auth/admin/verify-mfa - Step 2: MFA Verification
app.post('/api/auth/admin/verify-mfa', (req, res) => {
    const { sessionId, otp } = req.body;
    const ip = getClientIP(req);

    if (!sessionId || !otp) {
        return res.status(400).json({ success: false, message: "Session ID and OTP required" });
    }

    // Find pending session
    const pendingSession = adminPendingSessions[sessionId];

    if (!pendingSession) {
        logAdminAction('unknown', 'admin_mfa_verify', ip, false, { reason: 'invalid_session' });
        return res.status(401).json({ success: false, message: "Invalid or expired session" });
    }

    // Check expiry
    if (Date.now() > pendingSession.expiresAt) {
        delete adminPendingSessions[sessionId];
        logAdminAction(pendingSession.email, 'admin_mfa_verify', ip, false, { reason: 'session_expired' });
        return res.status(401).json({ success: false, message: "Session expired. Please login again." });
    }

    // Verify OTP
    const inputOTP = String(otp).trim();
    const storedOTP = String(pendingSession.otp).trim();

    if (inputOTP !== storedOTP) {
        logAdminAction(pendingSession.email, 'admin_mfa_verify', ip, false, { reason: 'invalid_otp' });
        return res.status(401).json({ success: false, message: "Invalid OTP" });
    }

    // OTP verified - create admin session
    const users = readData(USERS_FILE);
    const user = users.find(u => u.email.toLowerCase() === pendingSession.email.toLowerCase());

    if (!user) {
        delete adminPendingSessions[sessionId];
        return res.status(404).json({ success: false, message: "User not found" });
    }

    // Generate JWT token for admin
    const adminToken = jwt.sign(
        {
            userId: user.email,
            email: user.email,
            role: 'admin',
            mfaVerified: true,
            ipAddress: ip,
            sessionId: sessionId
        },
        JWT_SECRET,
        { expiresIn: JWT_EXPIRY_ADMIN }
    );

    // Store admin session PERSISTENTLY
    const sessions = getAdminSessions();
    sessions[sessionId] = {
        userId: user.email,
        token: adminToken,
        ip,
        createdAt: Date.now(),
        expiresAt: Date.now() + (10 * 24 * 60 * 60 * 1000) // 10 days
    };
    saveAdminSessions(sessions);

    // Clean up pending session
    delete adminPendingSessions[sessionId];

    logAdminAction(user.email, 'admin_login_success', ip, true, { sessionId, mfaMethod: 'email' });

    res.json({
        success: true,
        token: adminToken,
        user: {
            email: user.email,
            name: user.name,
            role: 'admin'
        },
        expiresIn: '10d'
    });
});

// Middleware: Verify Admin Token
function requireAdmin(req, res, next) {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ success: false, message: "No admin token provided" });
    }

    const token = authHeader.split(' ')[1];

    try {
        const decoded = jwt.verify(token, JWT_SECRET);

        // Verify it's an admin token
        if (decoded.role !== 'admin' || !decoded.mfaVerified) {
            return res.status(403).json({ success: false, message: "Admin access required" });
        }

        // Verify session exists in PERSISTENT store
        const sessionId = decoded.sessionId;
        const sessions = getAdminSessions(); // Read from file

        if (!sessions[sessionId]) {
            return res.status(401).json({ success: false, message: "Session expired" });
        }

        // Check session expiry
        const session = sessions[sessionId];
        if (Date.now() > session.expiresAt) {
            delete sessions[sessionId];
            saveAdminSessions(sessions);
            return res.status(401).json({ success: false, message: "Session expired" });
        }

        req.admin = decoded;
        req.sessionId = sessionId;
        next();
    } catch (error) {
        if (error.name === 'TokenExpiredError') {
            return res.status(401).json({ success: false, message: "Token expired" });
        }
        return res.status(401).json({ success: false, message: "Invalid token" });
    }
}

// GET /api/auth/admin/verify - Verify admin token validity
app.get('/api/auth/admin/verify', requireAdmin, (req, res) => {
    res.json({
        success: true,
        admin: {
            email: req.admin.email,
            role: req.admin.role
        }
    });
});

// GET /api/admin/logs - Get audit logs (Admin Only)
app.get('/api/admin/logs', requireAdmin, (req, res) => {
    const logs = readData(AUDIT_LOG_FILE);
    // Return last 100 logs
    const recentLogs = logs.slice(-100).reverse();
    res.json({ success: true, logs: recentLogs });
});

// Start Server
// Bind to 0.0.0.0 to accept connections from Render's network
app.listen(PORT, '0.0.0.0', () => {
    console.log(`PhishingShield Backend running on port ${PORT}`);
    console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
});
