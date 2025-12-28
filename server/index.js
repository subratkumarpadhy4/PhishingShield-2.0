const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const axios = require('axios');
const fs = require('fs').promises;
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;
const DATA_DIR = process.env.DATA_DIR || path.join(__dirname, 'data');

// Middleware
app.use(cors());
app.use(bodyParser.json());

// --- PERSISTENCE LAYER ---
async function initStorage() {
    try {
        await fs.mkdir(DATA_DIR, { recursive: true });
        const files = ['users.json', 'reports.json', 'logs.json'];
        for (const file of files) {
            const filePath = path.join(DATA_DIR, file);
            try {
                await fs.access(filePath);
            } catch {
                await fs.writeFile(filePath, '[]');
            }
        }
    } catch (err) {
        console.error("Storage Init Failed:", err);
    }
}

async function readData(file) {
    try {
        const data = await fs.readFile(path.join(DATA_DIR, file), 'utf8');
        return JSON.parse(data);
    } catch (err) {
        return [];
    }
}

async function writeData(file, data) {
    await fs.writeFile(path.join(DATA_DIR, file), JSON.stringify(data, null, 2));
}

// Initialize Storage on Start
initStorage();

// EmailJS Config
const EMAILJS_SERVICE_ID = "service_orcv7av";
const EMAILJS_TEMPLATE_ID = "template_f0lfm5h";
const EMAILJS_PUBLIC_KEY = "BxDgzDbuSkLEs4H_9";

// In-Memory OTP Store (Could be persisted too if needed)
const otpStore = {};

// --- ROUTES ---

// 1. USERS ENDPOINTS
app.get('/api/users', async (req, res) => {
    const users = await readData('users.json');
    res.json(users);
});

app.post('/api/users/sync', async (req, res) => {
    // Upsert User
    const userData = req.body;
    if (!userData.email) return res.status(400).json({ error: "Email required" });

    const users = await readData('users.json');
    const index = users.findIndex(u => u.email === userData.email);

    if (index !== -1) {
        // Update existing, merge fields
        users[index] = { ...users[index], ...userData };
    } else {
        // Create new
        users.push(userData);
    }

    await writeData('users.json', users);
    res.json({ success: true, user: userData });
});

app.post('/api/users/delete', async (req, res) => {
    const { email } = req.body;
    let users = await readData('users.json');
    users = users.filter(u => u.email !== email);
    await writeData('users.json', users);
    res.json({ success: true });
});


// 2. REPORTS ENDPOINTS
app.get('/api/reports', async (req, res) => {
    const reports = await readData('reports.json');
    res.json(reports);
});

app.post('/api/reports', async (req, res) => {
    const report = req.body;
    report.id = report.id || Date.now().toString();
    report.timestamp = report.timestamp || Date.now();

    const reports = await readData('reports.json');
    // Dedupe by URL
    const existing = reports.find(r => r.url === report.url);
    if (!existing) {
        reports.push(report);
        await writeData('reports.json', reports);
    }

    res.json({ success: true, id: report.id });
});

app.post('/api/reports/update', async (req, res) => {
    const { id, status } = req.body;
    const reports = await readData('reports.json');
    const index = reports.findIndex(r => r.id === id);

    if (index !== -1) {
        reports[index].status = status;
        await writeData('reports.json', reports);
        res.json({ success: true });
    } else {
        res.status(404).json({ success: false, message: "Report not found" });
    }
});


// 3. LOGS ENDPOINTS (Global Threat Logs)
app.get('/api/logs', async (req, res) => {
    const logs = await readData('logs.json');
    res.json(logs);
});

app.post('/api/logs', async (req, res) => {
    const log = req.body;
    const logs = await readData('logs.json');
    logs.push(log);
    // Limit log size if needed (e.g., keep last 1000)
    if (logs.length > 1000) logs.shift();

    await writeData('logs.json', logs);
    res.json({ success: true });
});


// 4. AUTH & OTP
app.post('/api/send-otp', async (req, res) => {
    const { email, name } = req.body;
    if (!email) return res.status(400).json({ success: false, message: "Email required" });

    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const expiry = Date.now() + (15 * 60 * 1000);
    otpStore[email] = { code: otp, expires: expiry };

    console.log(`[OTP] Generated for ${email}: ${otp}`);

    // Check if user exists to personalize email?
    // Send via EmailJS
    try {
        const payload = {
            service_id: EMAILJS_SERVICE_ID,
            template_id: EMAILJS_TEMPLATE_ID,
            user_id: EMAILJS_PUBLIC_KEY,
            template_params: {
                to_name: name || "User",
                to_email: email,
                email: email,
                otp: otp,
                time: new Date(expiry).toLocaleTimeString()
            }
        };

        const config = {
            headers: {
                'Content-Type': 'application/json',
                'Origin': 'http://localhost'
            }
        };

        await axios.post('https://api.emailjs.com/api/v1.0/email/send', payload, config);
        res.json({ success: true, message: "OTP Sent" });

    } catch (error) {
        console.error("EmailJS Error:", error.message);
        // Fallback for demo if offline: expose OTP in console
        res.json({ success: true, message: "OTP Sent (Check Server Console for fallback)", debug_otp: otp });
    }
});

app.post('/api/verify-otp', (req, res) => {
    const { email, otp } = req.body;
    const record = otpStore[email];

    if (!record) return res.json({ success: false, message: "No OTP found" });
    if (Date.now() > record.expires) {
        delete otpStore[email];
        return res.json({ success: false, message: "OTP Expired" });
    }

    if (record.code === otp) {
        delete otpStore[email];
        return res.json({ success: true, message: "Verified" });
    } else {
        return res.json({ success: false, message: "Invalid OTP" });
    }
});

app.listen(PORT, () => {
    console.log(`[Backend] Node.js Server running on http://localhost:${PORT}`);
    console.log(`[Backend] Data storage: ${DATA_DIR}`);
});
