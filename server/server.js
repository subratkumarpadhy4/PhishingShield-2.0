const express = require("express");
const path = require("path");
require('dotenv').config({ path: path.join(__dirname, '../.env') });
const cors = require("cors");
const bodyParser = require("body-parser");
const fs = require("fs");
// const path = require("path"); // Moved to top
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");

const app = express();
const PORT = process.env.PORT || 3000;
const REPORTS_FILE = path.join(__dirname, 'reports.json');
const USERS_FILE = path.join(__dirname, 'users.json');
const DELETED_USERS_FILE = path.join(__dirname, 'data', 'deleted_users.json'); // Persistent deletion list
const AUDIT_LOG_FILE = path.join(__dirname, 'data', 'audit_logs.json');
const TRUST_FILE = path.join(__dirname, 'data', 'trust_scores.json');

console.log("Gemini Key Status:", process.env.GEMINI_API_KEY ? "Found" : "Not Found");

// Admin Configuration (Server-Side Only)
const ADMIN_EMAILS = ["rajkumarpadhy2006@gmail.com"]; // Add more admin emails here
const JWT_SECRET =
    process.env.JWT_SECRET ||
    "phishingshield-secret-key-change-in-production-2024";
const JWT_EXPIRY_ADMIN = "10d"; // Admin sessions expire in 10 days

// Middleware
// Enhanced CORS configuration for Chrome extension and web access
app.use(
    cors({
        origin: "*", // Allow all origins (Chrome extensions use chrome-extension:// URLs)
        methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
        allowedHeaders: ["Content-Type", "Authorization", "X-Requested-With"],
        credentials: false,
    }),
);

// Handle preflight requests
app.options("*", cors());

app.use(bodyParser.json());

// PREVENT CRASHES: Global Error Handlers
process.on("uncaughtException", (err) => {
    console.error("CRITICAL ERROR (Uncaught Exception):", err);
    // Keep server alive
});

process.on("unhandledRejection", (reason, promise) => {
    console.error("CRITICAL ERROR (Unhandled Rejection):", reason);
    // Keep server alive
});

// Initialize Data Files
if (!fs.existsSync(REPORTS_FILE)) fs.writeFileSync(REPORTS_FILE, JSON.stringify([], null, 2));
if (!fs.existsSync(USERS_FILE)) fs.writeFileSync(USERS_FILE, JSON.stringify([], null, 2));
if (!fs.existsSync(path.dirname(AUDIT_LOG_FILE))) fs.mkdirSync(path.dirname(AUDIT_LOG_FILE), { recursive: true });
if (!fs.existsSync(AUDIT_LOG_FILE)) fs.writeFileSync(AUDIT_LOG_FILE, JSON.stringify([], null, 2));
if (!fs.existsSync(TRUST_FILE)) fs.writeFileSync(TRUST_FILE, JSON.stringify([], null, 2));
if (!fs.existsSync(DELETED_USERS_FILE)) fs.writeFileSync(DELETED_USERS_FILE, JSON.stringify([], null, 2));

// --- Helpers ---
const readData = (file) => {
    try {
        return JSON.parse(fs.readFileSync(file));
    } catch (e) {
        return [];
    }
};
const writeData = (file, data) => {
    fs.writeFileSync(file, JSON.stringify(data, null, 2));
};


// --- TRUST SCORE SYSTEM (Community Voting) ---
app.get('/api/trust/score', (req, res) => {
    const { domain } = req.query;
    if (!domain) return res.status(400).json({ error: "Domain required" });

    const scores = readData(TRUST_FILE);
    const domainData = scores.find(s => s.domain === domain);

    if (!domainData) return res.json({ score: null, votes: 0, status: 'unknown' }); // No data

    const total = domainData.safe + domainData.unsafe;
    const score = total === 0 ? null : Math.round((domainData.safe / total) * 100);

    res.json({
        score,
        votes: total,
        status: score > 70 ? 'safe' : (score < 30 ? 'malicious' : 'suspect')
    });
});

app.post('/api/trust/vote', (req, res) => {
    // userId is recommended to limit spam
    const { domain, vote, userId } = req.body; // vote: 'safe' or 'unsafe'
    if (!domain || !vote) return res.status(400).json({ error: "Domain and vote required" });

    let scores = readData(TRUST_FILE);
    let entry = scores.find(s => s.domain === domain);

    if (!entry) {
        entry = { domain, safe: 0, unsafe: 0, voters: {} };
        scores.push(entry);
    }

    // Initialize voters map if simple structure exists
    if (!entry.voters) entry.voters = {};

    // ANONYMOUS MODE FALLBACK: If no userId, allow infinite votes (legacy behavior)
    // To enforcing limits, client MUST send userId.
    const uid = userId || 'anonymous_' + Date.now();

    if (userId && entry.voters[userId]) {
        const previousVote = entry.voters[userId];

        if (previousVote === vote) {
            return res.json({ success: true, message: "You have already voted this way." });
        } else {
            // Switch vote
            if (previousVote === 'safe') entry.safe = Math.max(0, entry.safe - 1);
            else entry.unsafe = Math.max(0, entry.unsafe - 1);

            if (vote === 'safe') entry.safe++;
            else entry.unsafe++;

            entry.voters[userId] = vote;
            console.log(`[Trust] Vote SWITCHED for ${domain} by ${userId}: ${previousVote} -> ${vote}`);
        }
    } else {
        // New Vote
        if (vote === 'safe') entry.safe++;
        else if (vote === 'unsafe') entry.unsafe++;

        // Track it
        if (userId) entry.voters[userId] = vote;
    }

    writeData(TRUST_FILE, scores);
    console.log(`[Trust] New vote for ${domain}: ${vote} (User: ${userId || 'Anon'})`);

    // --- GLOBAL SYNC (FORWARD WRITE) ---
    fetch('https://phishingshield.onrender.com/api/trust/vote', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ domain, vote, userId })
    }).catch(e => console.warn(`[Trust-Sync] Failed to forward vote: ${e.message}`));

    res.json({ success: true, message: "Vote recorded." });
});

// Admin: Clear all trust history
app.post('/api/trust/clear', (req, res) => {
    // In a real app, requireAdmin middleware here.
    writeData(TRUST_FILE, []);
    console.warn("[Admin] Trust history cleared.");
    res.json({ success: true, message: "All trust scores cleared." });
});

// Admin: Get all trust scores
app.get('/api/trust/all', async (req, res) => {
    try {
        // 1. Read Local Trust Data
        const localScores = readData(TRUST_FILE);

        // 2. Fetch Global Trust Data
        let globalScores = [];
        try {
            const response = await fetch('https://phishingshield.onrender.com/api/trust/all');
            if (response.ok) {
                globalScores = await response.json();

                // DEBUG: Log counts to see if they are increasing
                const gCount = globalScores.length > 0 ? (globalScores[0].safe + globalScores[0].unsafe) : 0;
                const lCount = localScores.length > 0 ? (localScores[0].safe + localScores[0].unsafe) : 0;
                console.log(`[Trust-Debug] Local Entries: ${localScores.length}, Global Entries: ${globalScores.length}`);
                if (localScores.length > 0) console.log(`[Trust-Debug] First Local (${localScores[0].domain}): ${lCount} votes`);
                if (globalScores.length > 0) console.log(`[Trust-Debug] First Global (${globalScores[0].domain}): ${gCount} votes`);
            }
        } catch (e) {
            console.warn(`[Trust] Failed to fetch global data: ${e.message}`);
        }

        // 3. Merge: Global takes priority, local fills gaps
        const mergedMap = new Map();

        // Add global scores first (priority)
        globalScores.forEach(entry => {
            // HARD DELETE: Explicitly ignore aistudio.google.com as per user request
            if (entry.domain === 'aistudio.google.com') return;

            mergedMap.set(entry.domain, entry);
        });

        // Add local scores if not in global
        localScores.forEach(entry => {
            if (!mergedMap.has(entry.domain)) {
                mergedMap.set(entry.domain, entry);
            }
        });

        const mergedScores = Array.from(mergedMap.values());
        res.json(mergedScores);
    } catch (error) {
        console.error('[Trust] Error in /api/trust/all:', error);
        // Fallback to local only
        res.json(readData(TRUST_FILE));
    }
});

// Admin: Simulate Sync to Global Server
app.post('/api/trust/sync', (req, res) => {
    // 1. Read Local Trust Data
    const localData = readData(TRUST_FILE);

    // 2. Simulate Upload delay
    setTimeout(() => {
        // 3. Update Sync Timestamp (stored in a separate file or metadata)
        const META_FILE = path.join(__dirname, 'data', 'server_meta.json');
        let meta = {};
        if (fs.existsSync(META_FILE)) meta = JSON.parse(fs.readFileSync(META_FILE));

        meta.lastTrustSync = Date.now();
        fs.writeFileSync(META_FILE, JSON.stringify(meta, null, 2));

        console.log("[Sync] Trust scores synced to Global Server (Simulated).");
        res.json({ success: true, syncedCount: localData.length, timestamp: meta.lastTrustSync });
    }, 1500);
});

// Admin: Get Sync Status
app.get('/api/trust/sync-status', (req, res) => {
    const META_FILE = path.join(__dirname, 'data', 'server_meta.json');
    if (!fs.existsSync(META_FILE)) return res.json({ lastSync: null });

    const meta = JSON.parse(fs.readFileSync(META_FILE));
    res.json({ lastSync: meta.lastTrustSync || null });
});



// --- THREAT LOGS SYSTEM (Global Sync) ---
const LOGS_FILE = path.join(__dirname, 'data', 'threat_logs.json');

// GET /api/logs/all - Fetch and merge global + local logs
app.get('/api/logs/all', async (req, res) => {
    try {
        // 1. Read Local Logs
        const localLogs = readData(LOGS_FILE);

        // 2. Fetch Global Logs
        let globalLogs = [];
        try {
            const response = await fetch('https://phishingshield.onrender.com/api/logs');
            if (response.ok) {
                globalLogs = await response.json();
                console.log(`[Logs] Fetched ${globalLogs.length} global threat logs`);
            }
        } catch (e) {
            console.warn(`[Logs] Failed to fetch global logs: ${e.message}`);
        }

        // 3. Merge: Combine and deduplicate by timestamp+hostname
        const mergedMap = new Map();

        // Add global logs first
        globalLogs.forEach(log => {
            const key = `${log.timestamp}_${log.hostname}`;
            mergedMap.set(key, log);
        });

        // Add local logs if not in global
        localLogs.forEach(log => {
            const key = `${log.timestamp}_${log.hostname}`;
            if (!mergedMap.has(key)) {
                mergedMap.set(key, log);
            }
        });

        const mergedLogs = Array.from(mergedMap.values());
        // Sort by timestamp descending
        mergedLogs.sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));

        res.json(mergedLogs);
    } catch (error) {
        console.error('[Logs] Error in /api/logs/all:', error);
        res.json(readData(LOGS_FILE)); // Fallback to local
    }
});

// POST /api/logs - Submit a new threat log
app.post('/api/logs', (req, res) => {
    const log = req.body;
    if (!log.hostname || !log.timestamp) {
        return res.status(400).json({ error: "Hostname and timestamp required" });
    }

    // 1. Save locally
    const logs = readData(LOGS_FILE);
    logs.push(log);

    // Keep last 1000 logs
    if (logs.length > 1000) {
        logs.shift();
    }

    writeData(LOGS_FILE, logs);
    console.log(`[Logs] New threat log: ${log.hostname} (Score: ${log.score})`);

    // 2. Forward to global server
    fetch('https://phishingshield.onrender.com/api/logs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(log)
    }).catch(e => console.warn(`[Logs-Sync] Failed to forward log: ${e.message}`));

    res.json({ success: true });
});

// POST /api/logs/clear - Clear all threat logs (Admin only)
app.post('/api/logs/clear', (req, res) => {
    writeData(LOGS_FILE, []);
    console.warn("[Admin] Threat logs cleared locally");
    res.json({ success: true, message: "Local logs cleared" });
});

// --- ROUTES: REPORTS ---

// GET /api/reports
app.get("/api/reports", (req, res) => {
    const { reporter } = req.query;
    let reports = readData(REPORTS_FILE);

    if (reporter && typeof reporter === 'string') {
        // OPTIMIZED MATCHING:
        // 1. Check strict 'reporterEmail' field (future proof)
        // 2. Check if 'reporter' string INCLUDES the email (legacy support for "Name (email)")
        const searchEmail = reporter.trim().toLowerCase();

        reports = reports.filter(r => {
            const rEmail = (r.reporterEmail || "").toLowerCase();
            const rString = (r.reporter || "").toLowerCase();

            return rEmail === searchEmail || rString.includes(searchEmail);
        });
    }

    res.json(reports);
});

// POST /api/reports
app.post("/api/reports", (req, res) => {
    const newReport = req.body;
    if (!newReport.url) return res.status(400).json({ error: "Missing URL" });

    const report = {
        id: Date.now().toString(),
        url: newReport.url,
        hostname: newReport.hostname || "Unknown",
        reporter: newReport.reporter || "Anonymous",
        timestamp: Date.now(),
        status: "pending",
        ...newReport,
    };

    const reports = readData(REPORTS_FILE);

    // IDEMPOTENCY CHECK: Prevent duplicates
    // Check by ID (if provided) or strict URL match for pending reports
    const existing = reports.find(r =>
        (newReport.id && r.id === newReport.id) ||
        (r.url === newReport.url && r.status === 'pending')
    );

    if (existing) {
        console.log(`[Report] Skipped duplicate: ${newReport.url}`);
        return res.status(200).json({ message: "Report already exists", report: existing });
    }

    reports.push(report);
    writeData(REPORTS_FILE, reports);

    console.log(`[Report] ${report.url} by ${report.reporter}`);
    res.status(201).json({ message: "Report logged", report });
});

// --- ROUTES: USERS & AUTH ---

// GET /api/users
app.get("/api/users", (req, res) => {
    const users = readData(USERS_FILE);
    // Return safe public info if needed, or full objects for this internal extension backend
    res.json(users);
});







// (Duplicate global-sync removed - see implementation at bottom)


// GET /test-phish (Simulation Page)
app.get("/test-phish", (req, res) => {
    res.send(`
        <!DOCTYPE html>
        <html>
        <head>
            <title>Urgent Security Update - Verify Account</title>
            <style>
                body { font-family: sans-serif; padding: 50px; text-align: center; background: #f8f9fa; }
                .container { background: white; padding: 40px; border-radius: 10px; box-shadow: 0 4px 20px rgba(0,0,0,0.1); max-width: 500px; margin: 0 auto; }
                h1 { color: #dc3545; }
                button { background: #007bff; color: white; border: none; padding: 10px 20px; border-radius: 5px; cursor: pointer; font-size: 16px; margin-top: 10px; }
                input { padding: 10px; width: 100%; margin: 10px 0; border: 1px solid #ccc; border-radius: 5px; }
            </style>
        </head>
        <body>
            <div class="container">
                <h1>⚠️ Account Suspended</h1>
                <p>We detected unauthorized access to your **Bank** account.</p>
                <p>Please <strong>login immediately</strong> to verify your identity or your funds will be frozen within 24 hours.</p>
                
                <form action="/login" method="POST">
                    <input type="email" placeholder="Email Address" />
                    <!-- Triggers Insecure Password Risk -->
                    <input type="password" placeholder="Enter Password" />
                    <button type="submit">Verify Now</button>
                </form>
                <br>
                <small>This is a safe simulation page to trigger PhishingShield HUD.</small>
            </div>
        </body>
        </html>
    `);
});

// Email Configuration (EmailJS - Works with Gmail, no domain verification needed)
const axios = require("axios");
let emailServiceReady = false;

// EmailJS Configuration
const EMAILJS_SERVICE_ID = process.env.EMAILJS_SERVICE_ID || "service_orcv7av";
const EMAILJS_TEMPLATE_ID =
    process.env.EMAILJS_TEMPLATE_ID || "template_f0lfm5h";
const EMAILJS_PUBLIC_KEY =
    process.env.EMAILJS_PUBLIC_KEY || "BxDgzDbuSkLEs4H_9";

// Initialize EmailJS
function initializeEmailService() {
    if (!EMAILJS_SERVICE_ID || !EMAILJS_TEMPLATE_ID || !EMAILJS_PUBLIC_KEY) {
        console.warn(
            "[EMAIL] EmailJS not fully configured. OTPs will be logged to console.",
        );
        console.warn(
            "[EMAIL] Set EMAILJS_SERVICE_ID, EMAILJS_TEMPLATE_ID, and EMAILJS_PUBLIC_KEY environment variables.",
        );
        return false;
    }

    try {
        console.log("[EMAIL] EmailJS initialized successfully");
        console.log(`[EMAIL] Service ID: ${EMAILJS_SERVICE_ID}`);
        console.log("[EMAIL] No domain verification needed - works with Gmail!");
        console.log("[EMAIL] Free tier: 200 emails/month");
        return true;
    } catch (error) {
        console.error("[EMAIL] Failed to initialize EmailJS:", error.message);
        console.log("[EMAIL] Server will continue without email functionality");
        return false;
    }
}

emailServiceReady = initializeEmailService();

// Helper function to convert HTML to plain text (simple version)
function htmlToText(html) {
    return html
        .replace(/<style[^>]*>.*?<\/style>/gi, "")
        .replace(/<[^>]+>/g, "")
        .replace(/\n\s*\n/g, "\n")
        .trim();
}

// Helper function to send email via EmailJS
async function sendEmail(to, subject, htmlContent, options = {}) {
    // Extract OTP code from HTML
    const otpMatch = htmlContent.match(/>(\d{4,6})</);
    const otpCode = otpMatch ? otpMatch[1] : "XXXX";

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
                message: htmlContent,
            },
        };

        const config = {
            headers: {
                "Content-Type": "application/json",
                Origin: "https://phishingshield.onrender.com",
            },
        };

        const response = await axios.post(
            "https://api.emailjs.com/api/v1.0/email/send",
            payload,
            config,
        );

        console.log("[EMAIL] Email sent successfully via EmailJS");
        return { success: true, response: response.data };
    } catch (error) {
        console.error("[EMAIL] EmailJS error:", error.message);
        if (error.response) {
            console.error("[EMAIL] EmailJS response:", error.response.data);
        }
        return { success: false, error: error.message };
    }
}

// In-memory OTP store (Global variable)
const otpStore = {};

// Automatic cleanup for OTPs and Rate Limits (Every 5 minutes)
setInterval(() => {
    const now = Date.now();

    // Clean OTPs
    Object.keys(otpStore).forEach(email => {
        if (otpStore[email].expires < now) {
            delete otpStore[email];
        }
    });

    // Clean Rate Limits
    Object.keys(adminRateLimit).forEach(key => {
        // defined below
        if (adminRateLimit[key].expires < now) {
            delete adminRateLimit[key];
        }
    });
}, 5 * 60 * 1000);

// Admin-specific stores
const adminPendingSessions = {}; // Stores temporary admin sessions before MFA
const adminSessions = {}; // Stores active admin sessions
const adminRateLimit = {}; // Rate limiting for admin endpoints
// Helper: Check if email is admin
function isAdminEmail(email) {
    if (!email) return false;
    return ADMIN_EMAILS.includes(email.toLowerCase().trim());
}

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
        userAgent: details.userAgent || "Unknown",
        success,
        details,
        timestamp: new Date().toISOString(),
    });
    writeData(AUDIT_LOG_FILE, logs);
    console.log(
        `[AUDIT] ${action} - User: ${userId} - IP: ${ipAddress} - Success: ${success}`,
    );
}

// Helper: Rate limiting check for admin
function checkAdminRateLimit(ip, endpoint) {
    const key = `${ip}:${endpoint}`;
    const now = Date.now();
    const LIMIT = 15; // 15 attempts (Updated by User)
    const WINDOW = 15 * 60 * 1000; // 15 minutes

    if (!adminRateLimit[key]) {
        adminRateLimit[key] = { count: 1, expires: now + WINDOW };
        return true;
    }

    const record = adminRateLimit[key];

    // Check if window expired (should be handled by cleanup, but double check)
    if (now > record.expires) {
        record.count = 1;
        record.expires = now + WINDOW;
        return true;
    }

    if (record.count >= LIMIT) {
        return false;
    }

    record.count++;
    return true;
}

// Helper: Get client IP
function getClientIP(req) {
    return (
        req.headers["x-forwarded-for"]?.split(",")[0] ||
        req.connection.remoteAddress ||
        req.socket.remoteAddress ||
        "127.0.0.1"
    );
}

// POST /api/send-otp
app.post("/api/send-otp", async (req, res) => {
    const { email } = req.body;
    if (!email)
        return res.status(400).json({ success: false, message: "Email required" });

    // Generate 4-digit code
    const code = Math.floor(1000 + Math.random() * 9000).toString();
    // Expires in 10 minutes
    otpStore[email] = {
        code: code,
        expires: Date.now() + 10 * 60 * 1000
    };

    // Log for Dev
    console.log(`[OTP] Preparing to send ${code} to ${email}...`);

    // EmailJS uses template, so FROM_EMAIL is set in EmailJS dashboard
    const fromEmail = process.env.FROM_EMAIL || "phishingshield@gmail.com";
    const mailOptions = {
        from: `"PhishingShield Security" <${fromEmail}>`,
        to: email,
        subject: "Your Verification Code",
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
        `,
    };

    // Check if email service is available
    if (!emailServiceReady) {
        console.log(
            `[OTP FALLBACK] Email service unavailable. Code for ${email}: ${code}`,
        );
        return res.json({
            success: true,
            message: "OTP generated (check server logs)",
        });
    }

    // Send email via EmailJS
    const emailResult = await sendEmail(
        email,
        mailOptions.subject,
        mailOptions.html,
        {
            toName: req.body.name || "User",
        },
    );

    if (emailResult.success) {
        console.log(`[OTP] Email sent successfully to ${email}`);
        res.json({ success: true, message: "OTP Sent to Email!" });
    } else {
        console.error("[OTP] Error sending email:", emailResult.error);
        console.log(`[OTP FALLBACK] Code for ${email}: ${code}`);
        res.json({ success: true, message: "OTP generated (check server logs)" });
    }
});

// POST /api/verify-otp (Mock)
app.post("/api/verify-otp", (req, res) => {
    const { email, otp } = req.body;

    const record = otpStore[email];

    if (!record) {
        return res.status(400).json({ success: false, message: "OTP expired or invalid" });
    }

    // Check Expiry
    if (Date.now() > record.expires) {
        delete otpStore[email];
        return res.status(400).json({ success: false, message: "OTP expired" });
    }

    // Check against stored code (Robust string comparison)
    const stored = String(record.code).trim();
    const input = otp ? String(otp).trim() : '';

    if (stored === input) {
        console.log(`[OTP] ✅ Verified for ${email}`);
        delete otpStore[email]; // Clear after use
        res.json({ success: true });
    } else {
        console.warn(
            `[OTP] ❌ Failed for ${email}. Expected: ${stored}, Got: ${input}`,
        );
        res.status(400).json({ success: false, message: "Invalid OTP" });
    }
});

// POST /api/users/sync (Create or Update User)
app.post("/api/users/sync", (req, res) => {
    const userData = req.body;
    if (!userData.email) return res.status(400).json({ error: "Email required" });

    const users = readData(USERS_FILE);
    const idx = users.findIndex((u) => u.email === userData.email);

    let finalUser;

    if (idx !== -1) {
        // UPDATE EXISTING USER
        const serverXP = Number(users[idx].xp) || 0;
        const serverLevel = Number(users[idx].level) || 1;

        const clientUpdated = Number(userData.lastUpdated) || 0;
        const serverUpdated = Number(users[idx].lastUpdated) || 0;

        console.log(`[Sync] Check for ${userData.email}: Client(${userData.xp}xp @ ${clientUpdated}) vs Server(${serverXP}xp @ ${serverUpdated}). Force: ${userData.forceUpdate}, Penalty: ${userData.isPenalty}`);

        // Simple Max Logic for XP
        // 1. Progress: New XP is higher (Standard gameplay)
        // 2. Override: forceUpdate is true (Admin Edit)
        // 3. Penalty: isPenalty is true AND it's a new event
        if (userData.xp > serverXP) {
            users[idx].xp = userData.xp;
            users[idx].level = userData.level;
            users[idx].lastUpdated = Date.now();
        } else if (userData.forceUpdate || (userData.isPenalty && clientUpdated > serverUpdated)) {
            // Admin Penalty/Force Override
            console.log(`[Sync] Overwriting XP for ${userData.email} (Force/Penalty)`);
            users[idx].xp = userData.xp;
            users[idx].level = userData.level;
            users[idx].lastUpdated = clientUpdated || Date.now();
        }

        // Always update meta
        users[idx].name = userData.name || users[idx].name;
        users[idx].settings = userData.settings || users[idx].settings;

        finalUser = users[idx];
        writeData(USERS_FILE, users);
        console.log(`[Sync] Updated user: ${userData.email}`);

        // --- GLOBAL SYNC (FORWARD WRITE) ---
        // Forward this update to the central cloud server
        fetch('https://phishingshield.onrender.com/api/users/sync', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(userData)
        })
            .then(r => console.log(`[Global-Forward] User update sent. Status: ${r.status}`))
            .catch(e => console.warn(`[Global-Forward] Failed to sync user: ${e.message}`));

        res.json({ success: true, user: finalUser });

    } else {
        // ZOMBIE KILLER: User does not exist locally.
        console.warn(`[Sync] Rejected non-existent user: ${userData.email}`);
        res.status(404).json({ success: false, error: "USER_VIOLATION", message: "User does not exist. Please register." });
    }
});

// POST /api/users/create (NEW: Explicit Registration)
app.post("/api/users/create", (req, res) => {
    const userData = req.body;
    if (!userData.email) return res.status(400).json({ error: "Email required" });

    let users = readData(USERS_FILE);
    const idx = users.findIndex((u) => u.email === userData.email);

    if (idx !== -1) {
        return res.status(400).json({ success: false, message: "User already exists" });
    }

    // Create New
    const finalUser = { ...userData, xp: 0, level: 1, joined: Date.now() };
    users.push(finalUser);
    writeData(USERS_FILE, users);
    console.log(`[User] New user registered: ${userData.email}`);

    // Global Sync (Forward)
    try {
        fetch('https://phishingshield.onrender.com/api/users/sync', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(userData)
        }).catch(() => { });
    } catch (e) { }

    res.json({ success: true, user: finalUser });
});




// POST /api/users/reset-password
app.post("/api/users/reset-password", (req, res) => {
    const { email, password } = req.body;
    const users = readData(USERS_FILE);
    const idx = users.findIndex((u) => u.email === email);

    if (idx !== -1) {
        users[idx].password = password;
        writeData(USERS_FILE, users);
        console.log(`[User] Password reset for: ${email}`);

        // --- GLOBAL SYNC ---
        fetch('https://phishingshield.onrender.com/api/users/reset-password', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password })
        }).catch(e => console.warn(`[Pass-Reset-Sync] Failed: ${e.message}`));

        res.json({ success: true });
    } else {
        res.status(404).json({ success: false, message: "User not found" });
    }
});

// POST /api/users/delete
app.post("/api/users/delete", (req, res) => {
    const { email } = req.body;

    if (!email) {
        return res.status(400).json({ success: false, message: "Email is required" });
    }

    const targetEmail = email.trim().toLowerCase();

    let users = readData(USERS_FILE) || [];
    const initialLen = users.length;

    // Case-insensitive filtering
    users = users.filter((u) => u.email.trim().toLowerCase() !== targetEmail);

    if (users.length !== initialLen) {
        writeData(USERS_FILE, users);

        // --- ADD TO DELETED LIST (Tombstone Record) ---
        // This stops 'Global Sync' from re-importing this user if the global delete fails
        const deletedList = readData(DELETED_USERS_FILE) || [];
        if (!deletedList.some(u => u.email === targetEmail)) {
            deletedList.push({ email: targetEmail, deletedAt: Date.now() });
            writeData(DELETED_USERS_FILE, deletedList);
        }

        console.log(`[User] Deleted user: ${targetEmail} (Original: ${email})`);

        // --- GLOBAL SYNC ---
        fetch('https://phishingshield.onrender.com/api/users/delete', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email: targetEmail })
        }).catch(e => console.warn(`[User-Del-Sync] Failed: ${e.message}`));

        res.json({ success: true });
    } else {
        console.warn(`[User] Delete failed - User not found: ${targetEmail}`);
        res.status(404).json({ success: false, message: "User not found" });
    }
});

// ============================================
// ADMIN AUTHENTICATION ENDPOINTS (SECURE)
// ============================================

// POST /api/auth/admin/login - Step 1: Primary Authentication
app.post("/api/auth/admin/login", async (req, res) => {
    const { email, password } = req.body;
    const ip = getClientIP(req);

    // Rate limiting check
    if (!checkAdminRateLimit(ip, "admin_login")) {
        logAdminAction(email || "unknown", "admin_login_attempt", ip, false, {
            reason: "rate_limit_exceeded",
        });
        return res.status(429).json({
            success: false,
            message: "Too many attempts. Please try again in 30 minutes.",
        });
    }

    if (!email || !password) {
        return res
            .status(400)
            .json({ success: false, message: "Email and password required" });
    }

    // Server-side admin check
    if (!isAdminEmail(email)) {
        logAdminAction(email, "admin_login_attempt", ip, false, {
            reason: "not_admin_email",
        });
        return res.status(403).json({ success: false, message: "Access denied" });
    }

    // Find user
    let users = readData(USERS_FILE);
    let user = users.find((u) => u.email.toLowerCase() === email.toLowerCase());

    if (!user) {
        // --- GLOBAL SYNC FALLBACK ---
        console.log(`[Login] User ${email} not found locally. Checking global...`);
        try {
            const r = await fetch('https://phishingshield.onrender.com/api/users');
            if (r.ok) {
                const globalUsers = await r.json();
                if (Array.isArray(globalUsers)) {
                    user = globalUsers.find(u => u.email.toLowerCase() === email.toLowerCase());
                    if (user) {
                        // Sync to local
                        console.log(`[Login] Found ${email} globally. Syncing to local...`);
                        users.push(user);
                        writeData(USERS_FILE, users);
                    }
                }
            }
        } catch (e) {
            console.warn(`[Login] Global fetch failed: ${e.message}`);
        }
    }

    if (!user) {
        logAdminAction(email, "admin_login_attempt", ip, false, {
            reason: "user_not_found",
        });
        return res
            .status(401)
            .json({ success: false, message: "Invalid credentials" });
    }

    // Verify password (plaintext for now, but admin should use strong password)
    if (user.password !== password) {
        logAdminAction(email, "admin_login_attempt", ip, false, {
            reason: "invalid_password",
        });
        return res
            .status(401)
            .json({ success: false, message: "Invalid credentials" });
    }

    // Authenticated successfully - Generate Admin Session directly (No OTP)
    const sessionId = `admin_sess_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    // Generate JWT token for admin
    // Note: mfaVerified set to true as we are trusting password authentication now
    const adminToken = jwt.sign(
        {
            userId: user.email,
            email: user.email,
            role: "admin",
            mfaVerified: true,
            ipAddress: ip,
            sessionId: sessionId,
        },
        JWT_SECRET,
        { expiresIn: JWT_EXPIRY_ADMIN },
    );

    // Store admin session PERSISTENTLY
    const sessions = getAdminSessions();
    sessions[sessionId] = {
        userId: user.email,
        token: adminToken,
        ip,
        createdAt: Date.now(),
        expiresAt: Date.now() + 10 * 24 * 60 * 60 * 1000, // 10 days
    };
    saveAdminSessions(sessions);

    logAdminAction(user.email, "admin_login_success", ip, true, {
        sessionId,
        method: "password_only",
    });

    res.json({
        success: true,
        token: adminToken,
        user: {
            email: user.email,
            name: user.name,
            role: "admin",
        },
        expiresIn: "10d",
        requiresMFA: false,
    });
});

// Persistent Admin Sessions
const SESSIONS_FILE = path.join(__dirname, "data", "admin_sessions.json");
if (!fs.existsSync(SESSIONS_FILE))
    fs.writeFileSync(SESSIONS_FILE, JSON.stringify({}, null, 2));

function getAdminSessions() {
    return readData(SESSIONS_FILE) || {};
}

function saveAdminSessions(sessions) {
    writeData(SESSIONS_FILE, sessions);
}

// POST /api/auth/admin/verify-mfa - Step 2: MFA Verification
app.post("/api/auth/admin/verify-mfa", (req, res) => {
    const { sessionId, otp } = req.body;
    const ip = getClientIP(req);

    if (!sessionId || !otp) {
        return res
            .status(400)
            .json({ success: false, message: "Session ID and OTP required" });
    }

    // Find pending session
    const pendingSession = adminPendingSessions[sessionId];

    if (!pendingSession) {
        logAdminAction("unknown", "admin_mfa_verify", ip, false, {
            reason: "invalid_session",
        });
        return res
            .status(401)
            .json({ success: false, message: "Invalid or expired session" });
    }

    // Check expiry
    if (Date.now() > pendingSession.expiresAt) {
        delete adminPendingSessions[sessionId];
        logAdminAction(pendingSession.email, "admin_mfa_verify", ip, false, {
            reason: "session_expired",
        });
        return res
            .status(401)
            .json({
                success: false,
                message: "Session expired. Please login again.",
            });
    }

    // Verify OTP
    const inputOTP = String(otp).trim();
    const storedOTP = String(pendingSession.otp).trim();

    if (inputOTP !== storedOTP) {
        logAdminAction(pendingSession.email, "admin_mfa_verify", ip, false, {
            reason: "invalid_otp",
        });
        return res.status(401).json({ success: false, message: "Invalid OTP" });
    }

    // OTP verified - create admin session
    const users = readData(USERS_FILE);
    const user = users.find(
        (u) => u.email.toLowerCase() === pendingSession.email.toLowerCase(),
    );

    if (!user) {
        delete adminPendingSessions[sessionId];
        return res.status(404).json({ success: false, message: "User not found" });
    }

    // Generate JWT token for admin
    const adminToken = jwt.sign(
        {
            userId: user.email,
            email: user.email,
            role: "admin",
            mfaVerified: true,
            ipAddress: ip,
            sessionId: sessionId,
        },
        JWT_SECRET,
        { expiresIn: JWT_EXPIRY_ADMIN },
    );

    // Store admin session PERSISTENTLY
    const sessions = getAdminSessions();
    sessions[sessionId] = {
        userId: user.email,
        token: adminToken,
        ip,
        createdAt: Date.now(),
        expiresAt: Date.now() + 10 * 24 * 60 * 60 * 1000, // 10 days
    };
    saveAdminSessions(sessions);

    // Clean up pending session
    delete adminPendingSessions[sessionId];

    logAdminAction(user.email, "admin_login_success", ip, true, {
        sessionId,
        mfaMethod: "email",
    });

    res.json({
        success: true,
        token: adminToken,
        user: {
            email: user.email,
            name: user.name,
            role: "admin",
        },
        expiresIn: "10d",
    });
});

// Middleware: Verify Admin Token

// --- GENERIC AI SCAN ENDPOINT (For real-time page analysis) ---
app.post("/api/ai/scan", async (req, res) => {
    try {
        const { url, content } = req.body;
        if (!url) return res.status(400).json({ error: "URL required" });

        // Limit content to avoid token limits
        const safeContent = (content || "").substring(0, 10000);

        console.log(`[AI-Scan] Analyzing: ${url}`);

        if (process.env.GROQ_API_KEY || process.env.GEMINI_API_KEY) {
            // Support both keys, but prefer GROQ logic if requested
            const Groq = require("groq-sdk");
            const groq = new Groq({ apiKey: process.env.GROQ_API_KEY || process.env.GEMINI_API_KEY });

            async function analyzeWithGroq() {
                const completion = await groq.chat.completions.create({
                    messages: [
                        {
                            role: "system",
                            content: `You are PhishingShield AI, an expert cybersecurity analyst specializing in phishing detection.

Your task is to analyze URLs and page content to identify potential threats.

Classify the site into one of 3 categories:
1. 'SAFE' - Legitimate, well-known sites (e.g., Instagram, Google, GitHub, universities, established companies)
2. 'SUSPICIOUS' - Unknown domains, URL shorteners, typosquatting, or unclear intent
3. 'MALICIOUS' - Clear phishing attempts, scams, fake login pages, credential harvesting

Provide a DETAILED analysis including:
- Overall classification
- Specific threat indicators found (if any)
- Domain reputation assessment
- URL pattern analysis
- Security concerns or red flags
- Recommended action for users

Return JSON format:
{
  "classification": "SAFE|SUSPICIOUS|MALICIOUS",
  "reason": "Detailed multi-sentence explanation covering all findings",
  "threatIndicators": ["list", "of", "specific", "threats", "found"],
  "confidence": "high|medium|low"
}`
                        },
                        {
                            role: "user",
                            content: `Analyze this URL for phishing threats:

URL: ${url}
Page Content: "${safeContent.replace(/(\\r\\n|\\n|\\r)/gm, " ")}"

Provide comprehensive analysis with specific details.`
                        }
                    ],
                    model: "llama-3.3-70b-versatile",
                    temperature: 0.1,
                    response_format: { type: "json_object" }
                });

                const result = JSON.parse(completion.choices[0]?.message?.content || "{}");

                // Manual Mapping to Risk Score
                const cls = (result.classification || "SUSPICIOUS").toUpperCase();
                let score = 45; // Default SUSPICIOUS
                if (cls === "SAFE") score = 0;
                else if (cls === "MALICIOUS") score = 95;

                const suggestion = (score > 70) ? "BAN" : (score > 30 ? "CAUTION" : "IGNORE");

                // Enhanced reason with threat indicators
                let reason = result.reason || "No detailed analysis available";

                // Add threat indicators if present
                if (result.threatIndicators && result.threatIndicators.length > 0) {
                    reason += "\n\n🚨 Threat Indicators:\n" + result.threatIndicators.map(t => `• ${t}`).join("\n");
                }

                // Add confidence level
                if (result.confidence) {
                    reason += `\n\n🎯 Confidence: ${result.confidence.toUpperCase()}`;
                }

                return {
                    score: score,
                    suggestion: suggestion,
                    reason: reason,
                    threatIndicators: result.threatIndicators || [],
                    confidence: result.confidence || "medium"
                };
            }

            try {
                const json = await analyzeWithGroq();
                console.log("[AI-Scan] Classification Result:", json);
                return res.json({ success: true, aiAnalysis: json });
            } catch (e) {
                console.error("[AI-Scan] Groq Failed:", e.message);
                return res.json({ success: false, error: e.message });
            }

        } else {
            console.log("[AI-Scan] No API Key. Skipping.");
            return res.json({ success: false, message: "No AI Key" });
        }
    } catch (error) {
        console.error("[AI-Scan] Error:", error.message);
        res.status(500).json({ success: false, error: error.message });
    }
});

// --- AI ANALYSIS ENDPOINT ---
app.post("/api/reports/ai-verify", async (req, res) => {
    try {
        const { id } = req.body;
        console.log("[AI-Verify] Received request for Report ID:", id);

        // FIX: Read reports from file instead of assuming global variable
        const reports = readData(REPORTS_FILE);

        let reportIndex = reports.findIndex((r) => r.id === id);

        // FALLBACK: If not found locally, check Global Server (Lazy Import)
        if (reportIndex === -1) {
            console.log("[AI-Verify] Report not found via ID. checking by URL...");

            // Try finding by URL (Fallback for client-side ephemeral IDs)
            // Find any pending report with same URL to latch onto
            const targetUrl = req.body.url ? req.body.url.toLowerCase() : null;
            if (targetUrl) {
                reportIndex = reports.findIndex(r => r.url.toLowerCase() === targetUrl);
            }

            if (reportIndex === -1) {
                console.log("[AI-Verify] Not found via URL either. Checking Global Server...");
                try {
                    // Use the same global URL as the sync process
                    const response = await fetch('https://phishingshield.onrender.com/api/reports');
                    if (response.ok) {
                        const globalReports = await response.json();
                        let globalReport = globalReports.find(r => r.id === id);

                        // Fallback: Find by URL in global reports
                        if (!globalReport && targetUrl) {
                            globalReport = globalReports.find(r => r.url.toLowerCase() === targetUrl);
                        }

                        if (globalReport) {
                            console.log("[AI-Verify] Found report remotely. Importing to local DB for analysis...");
                            // Check if we already have it (dual check)
                            const exists = reports.findIndex(r => r.id === globalReport.id);
                            if (exists === -1) {
                                reports.push(globalReport);
                                writeData(REPORTS_FILE, reports);
                                reportIndex = reports.length - 1;
                            } else {
                                reportIndex = exists;
                            }
                        }
                    }
                } catch (e) {
                    console.warn("[AI-Verify] Global fetch failed:", e.message);
                }
            }
        }

        if (reportIndex === -1) {
            console.warn("[AI-Verify] Report not found in DB or Global:", id);
            return res.status(404).json({ error: "Report not found" });
        }

        const report = reports[reportIndex];

        if (!report.url) {
            console.warn("[AI-Verify] Report missing URL:", id);
            return res.status(400).json({ error: "Report data is incomplete (missing URL)" });
        }

        const url = report.url.toLowerCase();

        // --- REAL AI INTEGRATION ---
        let aiScore = 10;
        let aiSuggestion = "IGNORE";
        let aiReason = "No obvious threats detected.";

        if (process.env.GROQ_API_KEY || process.env.GEMINI_API_KEY) {

            // --- FETCH PAGE CONTEXT (Shared) ---
            let pageContext = "";
            try {
                const controller = new AbortController();
                const timeoutId = setTimeout(() => controller.abort(), 5000); // 5s timeout
                const fetchRes = await fetch(url, { signal: controller.signal });
                const html = await fetchRes.text();
                clearTimeout(timeoutId);
                const title = (html.match(/<title>(.*?)<\/title>/i) || [])[1] || "No Title";
                const desc = (html.match(/<meta\s+name=["']description["']\s+content=["'](.*?)["']/i) || [])[1] || "No Description";
                pageContext = `Page Title: "${title}"\nMeta Description: "${desc}"`;
                console.log(`[AI-Verify] Fetched Context: ${pageContext}`);
            } catch (e) {
                pageContext = "Could not fetch page content. Analyze URL pattern only.";
                console.warn(`[AI-Verify] Fetch failed: ${e.message}`);
            }

            // --- SHARED PROMPT ---
            const SYSTEM_PROMPT = `You are PhishingShield AI, an expert cybersecurity analyst.
Your task is to analyze URLs and page context to identify phishing threats.

Classify the site into one of 3 categories:
1. 'SAFE' - Legitimate, well-known sites (e.g., Google, GitHub, Universities)
2. 'SUSPICIOUS' - Unknown domains, URL shorteners, typosquatting
3. 'MALICIOUS' - Clear phishing, scams, fake logins

Return JSON format:
{
  "classification": "SAFE|SUSPICIOUS|MALICIOUS",
  "reason": "Detailed explanation covering findings",
  "threatIndicators": ["list", "of", "threats"],
  "confidence": "high|medium|low"
}`;

            const USER_PROMPT = `Analyze this URL for phishing threats:
URL: ${url}
Page Context: ${pageContext}
Provide comprehensive analysis.`;

            let rawResult = null;
            let provider = "NONE";

            // Get user's provider choice from request (if specified)
            const requestedProvider = req.body.provider ? req.body.provider.toUpperCase() : null;

            // 1. TRY GROQ (if requested or as fallback)
            if ((requestedProvider === 'GROQ' || !requestedProvider) && process.env.GROQ_API_KEY) {
                try {
                    const Groq = require("groq-sdk");
                    const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });
                    const completion = await groq.chat.completions.create({
                        messages: [
                            { role: "system", content: SYSTEM_PROMPT },
                            { role: "user", content: USER_PROMPT }
                        ],
                        model: "llama-3.3-70b-versatile",
                        temperature: 0.1,
                        response_format: { type: "json_object" }
                    });
                    rawResult = JSON.parse(completion.choices[0]?.message?.content || "{}");
                    provider = "GROQ";
                    console.log("[AI-Verify] Groq Analysis Success");
                } catch (e) {
                    console.error(`[AI-Verify] Groq Error (Falling back to Gemini):`, e.message);
                    // Continue to Gemini fallback even if Groq was requested
                }
            }

            // 2. TRY GEMINI (if requested or as fallback)
            console.log(`[AI-Verify] Checking Gemini... RawResult: ${!!rawResult}, Provider: ${requestedProvider}`);

            if (!rawResult && ((requestedProvider === 'GEMINI') || !requestedProvider) && process.env.GEMINI_API_KEY) {
                try {
                    console.log("[AI-Verify] Initializing Gemini Client...");
                    const { GoogleGenerativeAI } = require("@google/generative-ai");
                    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

                    const generateWithModel = async (modelName) => {
                        console.log(`[AI-Verify] Attempting Gemini Model: ${modelName}`);
                        const model = genAI.getGenerativeModel({ model: modelName });
                        const fullPrompt = `${SYSTEM_PROMPT}\n\nTask:\n${USER_PROMPT}`;

                        try {
                            const result = await model.generateContent(fullPrompt);
                            const response = await result.response;
                            const text = response.text();
                            console.log(`[AI-Verify] Gemini Raw Response (${modelName}):`, text.substring(0, 500) + "..."); // Start of response

                            // Robust JSON Extraction
                            const jsonMatch = text.match(/\{[\s\S]*\}/);
                            if (jsonMatch) {
                                return JSON.parse(jsonMatch[0]);
                            }
                            console.warn(`[AI-Verify] JSON parse failed for ${modelName}. Raw text logged above.`);
                            throw new Error("No JSON found in response");
                        } catch (genErr) {
                            console.error(`[AI-Verify] Generation Error (${modelName}):`, genErr.message);
                            throw genErr;
                        }
                    };

                    try {
                        // Primary: Gemini 2.5 Flash (Available for this API key)
                        rawResult = await generateWithModel("gemini-2.5-flash");
                        console.log("[AI-Verify] Gemini (2.5 Flash) Analysis Success");
                    } catch (err) {
                        console.warn("[AI-Verify] Gemini 2.5 Flash failed, trying 2.0 Flash:", err.message);
                        // Fallback: Gemini 2.0 Flash
                        try {
                            rawResult = await generateWithModel("gemini-2.0-flash");
                            console.log("[AI-Verify] Gemini (2.0 Flash) Analysis Success");
                        } catch (proErr) {
                            console.error("[AI-Verify] Gemini Pro also failed.");
                        }
                    }

                    if (rawResult) provider = "GEMINI";

                } catch (e) {
                    console.error("[AI-Verify] Gemini Fatal Error:", e);
                }
            }

            // 3. PROCESS RESULT
            if (rawResult) {
                const cls = (rawResult.classification || "SUSPICIOUS").toUpperCase();
                if (cls === "SAFE") aiScore = 0;
                else if (cls === "MALICIOUS") aiScore = 95;
                else aiScore = 45;

                aiSuggestion = (aiScore > 70) ? "BAN" : (aiScore > 30 ? "CAUTION" : "IGNORE");

                aiReason = rawResult.reason || "Analysis completed.";
                if (rawResult.threatIndicators?.length > 0) {
                    aiReason += "\n\n🚨 Indicators:\n" + rawResult.threatIndicators.map(t => `• ${t}`).join("\n");
                }

                // Add Provider Tag for Frontend Label Logic
                // Add Provider Tag text (Optional, user requested removal)
                // if (provider === "GEMINI") { ... }

                console.log(`[AI-Verify] Final Result (${provider}): Score ${aiScore}`);
            } else {
                aiReason = "AI Service Unavailable (Both Providers Failed)";
            }
        } else {
            // NO API KEY - Use Heuristics
            console.log("[AI-Verify] No API Key found. Using Heuristics.");
            aiReason = "[Heuristic] No suspicious keywords or IP patterns found.";

            const suspiciousKeywords = [
                "login",
                "signin",
                "secure",
                "account",
                "update",
                "verify",
                "wallet",
                "bank",
                "crypto",
            ];

            let riskCount = 0;
            suspiciousKeywords.forEach((word) => {
                if (url.includes(word)) riskCount++;
            });

            // Check for IP address usage (simple regex)
            if (/\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}/.test(url)) {
                riskCount += 2;
            }

            if (riskCount >= 2) {
                aiScore = 85;
                aiSuggestion = "BAN";
                aiReason = "Multiple high-risk keywords detected (Phishing Indicators).";
            } else if (riskCount === 1) {
                aiScore = 45;
                aiSuggestion = "CAUTION";
                aiReason = "Contains sensitive keywords, requires manual review.";
            }
        }
        // Update Report with AI Data -- END of IF/ELSE Block
        reports[reportIndex] = {
            ...report,
            aiAnalysis: {
                score: aiScore,
                suggestion: aiSuggestion,
                reason: aiReason,
                timestamp: Date.now(),
            },
        };

        // FIX: Save using writeData
        writeData(REPORTS_FILE, reports);

        console.log(`[AI-Verify] Analyzed ${url} -> ${aiSuggestion} (${aiScore})`);
        res.json({ success: true, aiAnalysis: reports[reportIndex].aiAnalysis });
    } catch (error) {
        console.error("[AI-Verify] Error:", error);
        res.status(500).json({ success: false, error: "Internal Server Error during AI Analysis" });
    }
});

// MIDDLEWARE: Check Admin Access
const requireAdmin = (req, res, next) => {
    const authHeader = req.headers["authorization"];
    if (!authHeader)
        return res.status(401).json({ success: false, message: "Token required" });

    const token = authHeader.split(" ")[1];

    try {
        const decoded = jwt.verify(token, JWT_SECRET);

        // Verify it's an admin token
        if (decoded.role !== "admin" || !decoded.mfaVerified) {
            return res
                .status(403)
                .json({ success: false, message: "Admin access required" });
        }

        // Verify session exists in PERSISTENT store
        const sessionId = decoded.sessionId;
        const sessions = getAdminSessions(); // Read from file

        if (!sessions[sessionId]) {
            return res
                .status(401)
                .json({ success: false, message: "Session expired" });
        }

        // Check session expiry
        const session = sessions[sessionId];
        if (Date.now() > session.expiresAt) {
            delete sessions[sessionId];
            saveAdminSessions(sessions);
            return res
                .status(401)
                .json({ success: false, message: "Session expired" });
        }

        req.admin = decoded;
        req.sessionId = sessionId;
        next();
    } catch (error) {
        if (error.name === "TokenExpiredError") {
            return res.status(401).json({ success: false, message: "Token expired" });
        }
        return res.status(401).json({ success: false, message: "Invalid token" });
    }
};

// GET /api/auth/admin/verify - Verify admin token validity
app.get("/api/auth/admin/verify", requireAdmin, (req, res) => {
    res.json({
        success: true,
        admin: {
            email: req.admin.email,
            role: req.admin.role,
        },
    });
});

// GET /api/admin/logs - Get audit logs (Admin Only)
app.get("/api/admin/logs", requireAdmin, (req, res) => {
    const logs = readData(AUDIT_LOG_FILE);
    // Return last 100 logs
    const recentLogs = logs.slice(-100).reverse();
    res.json({ success: true, logs: recentLogs });
});

// --- REPORTS API ---

// (Duplicate Routes Removed)

// POST /api/reports/update - Update report status (ban/ignore/pending)
app.post("/api/reports/update", (req, res) => {
    const { id, status } = req.body; // status: 'banned', 'ignored', 'pending'
    if (!id || !status)
        return res
            .status(400)
            .json({ success: false, message: "ID and status required" });

    const reports = readData(REPORTS_FILE) || [];
    const idx = reports.findIndex((r) => r.id === id);

    if (idx !== -1) {
        reports[idx].status = status;
        reports[idx].lastUpdated = Date.now(); // Essential for sync logic
        if (status === "banned") reports[idx].bannedAt = Date.now();
        if (status === "ignored") reports[idx].ignoredAt = Date.now();

        writeData(REPORTS_FILE, reports);
        console.log(`[Report] Updated status for ${id} to ${status}`);

        // --- GLOBAL SYNC (FORWARD WRITE) ---
        // Fire and forget - don't block local success
        fetch('https://phishingshield.onrender.com/api/reports/update', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id, status })
        })
            .then(r => console.log(`[Global-Forward] Report update sent to cloud. Status: ${r.status}`))
            .catch(e => console.warn(`[Global-Forward] Failed to sync with cloud: ${e.message}`));

        res.json({ success: true });
    } else {
        res.status(404).json({ success: false, message: "Report not found" });
    }
});

// POST /api/reports/delete - Bulk Delete Reports
app.post("/api/reports/delete", (req, res) => {
    const { ids } = req.body;
    if (!ids || !Array.isArray(ids))
        return res.status(400).json({ success: false, message: "IDs array required" });

    let reports = readData(REPORTS_FILE) || [];
    const initialLen = reports.length;

    // Filter out reports whose IDs are in the deletion list
    // Crucially, we assume the FRONTEND has already filtered out 'banned' reports.
    // The server just deletes what it is told to delete.
    reports = reports.filter(r => !ids.includes(r.id));

    if (reports.length !== initialLen) {
        writeData(REPORTS_FILE, reports);
        console.log(`[Report] Deleted ${initialLen - reports.length} reports.`);

        // --- GLOBAL SYNC ---
        fetch('https://phishingshield.onrender.com/api/reports/delete', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ ids })
        }).catch(e => console.warn(`[Report-Del-Sync] Failed: ${e.message}`));

        res.json({ success: true, deletedCount: initialLen - reports.length });
    } else {
        res.json({ success: true, deletedCount: 0, message: "No matching reports found to delete." });
    }
});

// --- NEW: Global Sync Endpoint ---
// Proxies request to global server to avoid CORS issues in the browser
// and merges with local data.
app.get("/api/reports/global-sync", async (req, res) => {
    try {
        const localReports = readData(REPORTS_FILE) || [];
        console.log(`[Global-Sync] Loaded ${localReports.length} local reports.`);

        let globalReports = [];
        try {
            // Native fetch in Node 18+
            const response = await fetch('https://phishingshield.onrender.com/api/reports');
            if (response.ok) {
                globalReports = await response.json();
                console.log(`[Global-Sync] Fetched ${globalReports.length} global reports.`);
            } else {
                console.warn(`[Global-Sync] Global fetch failed: ${response.status}`);
            }
        } catch (e) {
            console.warn(`[Global-Sync] Global fetch error: ${e.message}`);
        }

        // Merge Logic: ID Match + Status Priority
        // If Global has 'banned' or 'ignored', it overwrites 'pending' locally.
        const mergedReportsMap = new Map();
        let dataChanged = false;

        // 1. Load Local Reports First
        localReports.forEach(r => mergedReportsMap.set(r.id, r));

        // 2. Merge Global Reports
        const healingQueue = [];

        // Helper: Find existing report by ID OR unique URL
        const findMatch = (gReport) => {
            if (mergedReportsMap.has(gReport.id)) return mergedReportsMap.get(gReport.id);
            // Fallback: Check by URL (Case insensitive)
            for (const localR of mergedReportsMap.values()) {
                if (localR.url && gReport.url && localR.url.toLowerCase() === gReport.url.toLowerCase()) {
                    return localR;
                }
            }
            return null;
        };

        if (Array.isArray(globalReports)) {
            globalReports.forEach(globalR => {
                const localR = findMatch(globalR);

                if (!localR) {
                    // New Report from Global -> Add it
                    mergedReportsMap.set(globalR.id, globalR);
                    dataChanged = true;
                } else {
                    // Conflict: Report exists (by ID or URL).
                    // Align IDs if we matched by URL but IDs differed
                    if (localR.id !== globalR.id) {
                        console.log(`[Global-Sync] Merging duplicate URL IDs: Local(${localR.id}) vs Global(${globalR.id})`);
                        // We keep the Global ID as canonical if possible, or just link them.
                        // For now, let's update the LOCAL record with the GLOBAL ID to converge.
                        mergedReportsMap.delete(localR.id);
                        globalR.status = localR.status; // Preserve local status for now before check
                        mergedReportsMap.set(globalR.id, globalR);
                        // Now re-evaluate localR as the new object
                        // But wait, we need to compare statuses.
                    }

                    // TIME-BASED SYNCHRONIZATION (Last Write Wins)
                    const gTime = globalR.lastUpdated || 0;
                    const lTime = localR.lastUpdated || 0;

                    if (gTime > lTime) {
                        // Global is newer -> Update Local
                        mergedReportsMap.set(globalR.id, globalR);
                        dataChanged = true;
                    }
                    else if (lTime > gTime) {
                        // Local is newer -> HEAL GLOBAL
                        console.log(`[Global-Sync] Local '${lStatus}' (t=${lTime}) is newer than Global '${gStatus}' (t=${gTime}). Healing...`);
                        fetch('https://phishingshield.onrender.com/api/reports/update', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ id: localR.id, status: lStatus })
                        }).catch(e => console.warn(`[Heal-Fail] ${e.message}`));
                    }
                    else {
                        // Timestamps equal (or both 0). Fallback to old Priority Rule for safety.
                        const statusPriority = { 'banned': 3, 'ignored': 2, 'pending': 1 };
                        const gScore = statusPriority[gStatus] || 0;
                        const lScore = statusPriority[lStatus] || 0;

                        if (gScore > lScore) {
                            mergedReportsMap.set(globalR.id, globalR);
                            dataChanged = true;
                        } else if (lScore > gScore) {
                            // Heal Global in tie-break case too
                            fetch('https://phishingshield.onrender.com/api/reports/update', {
                                method: 'POST',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({ id: localR.id, status: lStatus })
                            }).catch(() => { });
                        }
                    }
                }
            });
        }

        const mergedReports = Array.from(mergedReportsMap.values());

        // --- PERSISTENCE: Save merged state locally ---
        if (dataChanged) {
            console.log(`[Global-Sync] Updates found. Saving ${mergedReports.length} reports to local DB.`);
            writeData(REPORTS_FILE, mergedReports);
        }

        // --- AUTO-REPAIR: If Global is empty/behind but Local has data, PUSH it up ---
        // This handles cases where the Cloud Server restarted and lost its ephemeral data.
        if (localReports.length > 0 && (!globalReports || globalReports.length === 0)) {
            console.warn(`[Global-Sync] ⚠️ Global Server appears empty/wiped. Attempting AUTO-REPAIR from Local Backup...`);

            // Send requests in chunks to avoid overwhelming the server
            // We fire-and-forget this background process
            (async () => {
                let successCount = 0;
                for (const r of localReports) {
                    try {
                        await fetch('https://phishingshield.onrender.com/api/reports', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify(r)
                        });
                        // Also sync status if it's not pending
                        if (r.status !== 'pending') {
                            await fetch('https://phishingshield.onrender.com/api/reports/update', {
                                method: 'POST',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({ id: r.id, status: r.status })
                            });
                        }
                        successCount++;
                    } catch (e) { /* ignore individual fail */ }
                }
                console.log(`[Global-Sync] ✅ Auto-Repair Triggered. Re-seeded ${successCount} reports to Global Server.`);
            })();
        }

        console.log(`[Global-Sync] Returning ${mergedReports.length} merged reports.`);
        res.json(mergedReports);

    } catch (error) {
        console.error("[Global-Sync] Error:", error);
        res.json(readData(REPORTS_FILE) || []);
    }
});

// --- NEW: Global User Sync Endpoint (Leaderboard) ---
app.get("/api/users/global-sync", async (req, res) => {
    try {
        const localUsers = readData(USERS_FILE) || [];
        // Ensure Deleted Users file exists
        if (!fs.existsSync(DELETED_USERS_FILE)) writeData(DELETED_USERS_FILE, []);
        const deletedUsers = readData(DELETED_USERS_FILE) || [];

        console.log(`[User-Sync] Loaded ${localUsers.length} local users.`);

        let globalUsers = [];
        try {
            const response = await fetch('https://phishingshield.onrender.com/api/users');
            if (response.ok) {
                globalUsers = await response.json();
                console.log(`[User-Sync] Fetched ${globalUsers.length} global users.`);
            }
        } catch (e) {
            console.warn(`[User-Sync] Global fetch error: ${e.message}`);
        }

        // FILTER: Remove any Global User that is in our Local 'Deleted' list
        // This prevents Zombie Users from reappearing if global delete failed/lagged.
        if (Array.isArray(globalUsers)) {
            const deletedEmails = new Set(deletedUsers.map(u => u.email));
            const initialGlobalCount = globalUsers.length;
            globalUsers = globalUsers.filter(gUser => !deletedEmails.has(gUser.email));

            if (globalUsers.length !== initialGlobalCount) {
                console.log(`[User-Sync] Filtered out ${initialGlobalCount - globalUsers.length} zombie users (locally deleted).`);
            }
        }

        // Merge Logic: By Email. Maximize XP.
        const mergedUsers = [...localUsers];
        let dataChanged = false;

        if (Array.isArray(globalUsers)) {
            globalUsers.forEach(gUser => {
                const idx = mergedUsers.findIndex(lUser => lUser.email === gUser.email);
                if (idx === -1) {
                    // New user from global
                    mergedUsers.push(gUser);
                    dataChanged = true;
                } else {
                    // Conflict Resolution:
                    // Prioritize specific timestamp if available. 
                    // This allows a recent penalty (XP drop) to correctly override an old high score.
                    const localTime = mergedUsers[idx].lastUpdated || 0;
                    const globalTime = gUser.lastUpdated || 0;

                    if (globalTime > localTime) {
                        mergedUsers[idx] = gUser; // Global is newer
                        dataChanged = true;
                    } else if (globalTime === 0 && localTime === 0) {
                        // Fallback: Max XP (Legacy behavior)
                        if ((gUser.xp || 0) > (mergedUsers[idx].xp || 0)) {
                            mergedUsers[idx] = gUser;
                            dataChanged = true;
                        }
                    }
                }
            });
        }

        // --- PERSISTENCE FIX ---
        // Save the merged list back to local file so it sticks
        if (dataChanged) {
            console.log(`[User-Sync] Data difference detected. updating local storage.`);
            writeData(USERS_FILE, mergedUsers);
        }


        console.log(`[User-Sync] Returning ${mergedUsers.length} merged users for leaderboard.`);
        res.json(mergedUsers);

    } catch (error) {
        console.error("[User-Sync] Error:", error);
        res.json(readData(USERS_FILE) || []);
    }
});

// Start Server
// Bind to 0.0.0.0 to accept connections from Render's network
app.listen(PORT, "0.0.0.0", () => {
    console.log(`PhishingShield Backend running on port ${PORT}`);
    console.log(`Environment: ${process.env.NODE_ENV || "development"}`);
});
