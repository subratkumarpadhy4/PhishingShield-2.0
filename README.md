# 🛡️ PhishingShield: Advanced Phishing Detection & Protection Extension

**PhishingShield** is a comprehensive, client-side browser security suite designed to protect users from modern web threats in real-time. Unlike traditional antivirus software that relies solely on static blacklists, PhishingShield employs a multi-layered heuristic risk engine and **Real-Time Global Synchronization** to detect new, zero-day phishing attacks, brand impersonation, and malicious browser extensions.

> **Enterprise Ready**: Features gamification (XP levels), a real-time Risk HUD, and an Admin Portal for network-wide oversight with **Global Threat Propagation** and **AI-Powered Analysis**.

---

## � Three Main Features

### 📢 1. Community Reporting System
**Empower users to protect each other**
*   **Right-Click Reporting**: Users can report suspicious sites directly from any webpage using the context menu
*   **Instant Submission**: Reports are immediately sent to both local and global servers
*   **Admin Review Dashboard**: All reports appear in the Admin Portal for verification
*   **User Feedback**: Reporters can track their submission status in "My Reports" section
*   **XP Rewards**: Earn points for valid threat reports
*   **Global Impact**: Your reports help protect the entire PhishingShield community

### � 2. Ban/Unban Management System
**Intelligent threat control with real-time propagation**
*   **One-Click Ban**: Admins can ban malicious sites instantly from the Admin Portal
*   **Global Propagation**: Bans sync to all connected users within 10 seconds
*   **Instant Protection**: Banned sites are blocked immediately using Chrome's declarativeNetRequest API
*   **Smart Unban**: Admins can reverse bans if sites are verified safe
*   **Auto-Redirect on Unban**: Users on banned pages automatically redirect when site is unbanned (just refresh!)
*   **Penalty System**: 500 XP deduction only when users explicitly choose "Proceed Anyway"
*   **Warning Page**: Clear, informative blocked page with safety recommendations
*   **Bypass Option**: Users can proceed with explicit confirmation (with XP penalty)

### 🤖 3. AI-Powered Threat Analysis
**Cutting-edge AI for accurate threat detection**
*   **Dual AI System**: 
    *   **Primary**: Groq (llama-3.3-70b-versatile) - Lightning-fast analysis
    *   **Fallback**: Google Gemini 2.5 Flash - Reliable backup
*   **Smart Fallback**: Automatically switches if primary AI is unavailable
*   **Deep Content Analysis**: AI examines page title, meta descriptions, and context
*   **Risk Scoring**: 0-100 threat score with detailed reasoning
*   **Visual Reports**: Beautiful, color-coded modal displays:
    *   🔴 **Red** for High Risk (BAN recommendation)
    *   🟡 **Yellow** for Medium Risk (CAUTION)
    *   🟢 **Green** for Low Risk (SAFE)
*   **Detailed Reasoning**: See exactly why AI flagged a site
*   **Admin Integration**: "Re-Analyze (AI)" button in Admin Portal
*   **Threat Indicators**: Lists specific suspicious elements found

---

## 🌟 Additional Features

### �🔍 1. Intelligent Risk Engine
The heart of PhishingShield is `risk_engine.js`, a client-side heuristics engine that analyzes every webpage you visit.
*   **Brand Impersonation Detection**: Checks page content and titles against a protected list of major banks and services (PayPal, Google, SBI, HDFC, etc.).
*   **Typosquatting Sentinel**: Detects deceptive domains like `goog1e.com` or `paypaI.com` (using Levenshtein distance algorithms).
*   **Punycode Detection**: Blocks homograph attacks (e.g., Cyrillic 'a' vs Latin 'a').
*   **Domain Entropy Analysis**: Identifies randomly generated domains often used by botnets.

### 🌐 2. Global Synchronization
PhishingShield features a robust **Hybrid Sync Architecture** that ensures protection follows you everywhere.
*   **Instant Global Bans**: When an Admin bans a site, the ban is immediately forwarded to the **Global Cloud Server**.
*   **Auto-Propagating Protection**: All connected clients (extensions) automatically fetch new bans every **10 seconds**.
*   **XP Anywhere**: Your Gamification progress (XP/Level) syncs across all your devices via the cloud.
*   **Dual-Layer Fetch**: The system intelligently merges data from your **Local Server** (for speed/dev) and the **Global Server** (for network-wide security), ensuring you never miss a threat even if one server is down.

### 📊 3. Visual Risk HUD (Head-Up Display)
A futuristic, floating overlay (`content.js`) that provides instant feedback on page safety.
*   **Risk Score**: A 0-100 score indicating the danger level.
*   **Real-time Analysis**: Lists specific reasons for the score (e.g., "+30 Brand Impersonation").
*   **Inspector Mode**: Highlights specific elements on the page that triggered the alert.

### 🛡️ 4. Active Protection
*   **Link Hover Preview**: Reveals the *true* destination of links before you click.
*   **Insecure Login Blocking**: Detects password fields on HTTP (unencrypted) pages.
*   **Download Protection**: Intercepts downloads of risky file types (`.exe`, `.zip`) and requires explicit confirmation.
*   **Extension Security Audit**: Scans installed browser extensions for high-risk permissions.

### 🎮 5. Gamification (XP System) & Training Dojo 🥋
*   **Earn XP**: Get points for safely browsing and reporting threats.
*   **Global Leaderboard**: Compete with other users worldwide. Your rank syncs globally.
*   **Ranks**: Novice 🥉 -> Scout 🥈 -> Sentinel 🥇.
*   **Training Dojo**: Interactive quizzes to learn about Typosquatting, Homograph attacks, and more.

---

## 🛠️ Extensions & Permissions Explained
PhishingShield requires specific permissions to function effectively:

| Permission | Reason |
| :--- | :--- |
| **`declarativeNetRequest`** | Used to block access to known malicious sites instantly without slowing down browsing. |
| **`scripting`** | Allows the extension to run the `risk_engine.js` analysis on web pages and display the Risk HUD. |
| **`storage`** | Saves your settings, XP progress, and local whitelist/blacklists. |
| **`contextMenus`** | Adds the "Report to PhishingShield" right-click option. |
| **`notifications`** | Sends desktop alerts for critical threats or Level Up achievements. |
| **`management`** | Required for the **Extension Audit** feature to scan *other* installed extensions for risks. |
| **`host_permissions` (<all_urls>)** | Necessary to scan *any* website you visit for phishing content. |

---

## 📂 Project Structure
*   **`/js`**: Core logic (`content.js`, `background.js` with Global Sync logic, `dashboard.js`).
*   **`/server`**: A Node.js + Express backend.
    *   `server.js`: Handles API requests, **AI Integration**, and **Forwards Writes** to the Global Cloud.
    *   `users.json` / `reports.json`: Local persistence (mirrored to cloud).
    *   AI models: Groq (primary) and Gemini (fallback) for threat analysis.
*   **`/css`**: Styling for Dashboard and Risk HUD.

---

## 🚀 Installation Guide

### 1. Backend Setup (Crucial for Global Sync & AI)
The backend acts as your local gateway to the PhishingShield Network and AI services.

```bash
# Clone the repo
git clone https://github.com/subratkumarpadhy4/PhishingShield.git
cd PhishingShield/server

# Install dependencies
npm install

# Configure API Keys (Required for AI features)
# Create a .env file in the server directory with:
GROQ_API_KEY=your_groq_api_key_here
GEMINI_API_KEY=your_gemini_api_key_here

# Start the server (runs on port 3000)
npm start

# Optional: Run keep-alive daemon for global server
node keep-alive.js &
```
*Note: The server must be running to receive reports, sync XP, and perform AI analysis.*

### 2. Extension Installation
1.  Open Chrome/Edge and go to `chrome://extensions`.
2.  Enable **Developer Mode** (top right toggle).
3.  Click **Load Unpacked**.
4.  Select the **root folder** of this project (`/PhishingShield`).

### 3. Usage & Admin
*   **Dashboard**: Click the extension icon to view your stats, XP, and threat logs.
*   **Admin Portal**: Access at `admin.html` for network-wide management.
*   **AI Analysis**: Click "Re-Analyze (AI)" in the Admin Portal to get detailed AI threat assessments.
*   **Global Bans**: Admin bans propagate to all users within ~10 seconds.

---

## 🔮 Future Roadmap
*   **Deep Learning integration**: Move from simple Bayes to a TensorFlow.js model running locally.
*   **Enterprise Integration**: LDAP/Active Directory sync.
*   **Mobile App**: React Native companion app.
*   **Enhanced AI Models**: Integration with additional AI providers for even more robust analysis.
*   **Threat Intelligence Feeds**: Integration with external threat databases.

---

## 💻 Tech Stack
*   **Frontend**: HTML5, CSS3, JavaScript (Vanilla)
*   **Extension API**: Chrome Manifest V3
*   **Backend**: Node.js, Express.js
*   **Cloud Sync**: Hybrid Local/Cloud Architecture (REST API)
*   **AI Integration**: 
    *   Groq (llama-3.3-70b-versatile) - Primary AI
    *   Google Gemini 2.5 Flash - Fallback AI

---

## 🔧 Configuration

### Environment Variables (.env)
```env
GROQ_API_KEY=your_groq_api_key
GEMINI_API_KEY=your_gemini_api_key
JWT_SECRET=your_jwt_secret
EMAILJS_SERVICE_ID=your_emailjs_service_id
EMAILJS_TEMPLATE_ID=your_emailjs_template_id
EMAILJS_PUBLIC_KEY=your_emailjs_public_key
```

### AI Model Configuration
The system uses:
- **Groq**: `llama-3.3-70b-versatile` (Primary, fast and accurate)
- **Gemini**: `gemini-2.5-flash` (Fallback, reliable)
- Automatic fallback ensures 99.9% uptime for AI analysis

---

## 📄 License
MIT License - See LICENSE file for details.

---

## 🤝 Contributing
Contributions are welcome! Please feel free to submit a Pull Request.

---

## 📧 Support
For issues, questions, or feature requests, please open an issue on GitHub.

---

**Built with ❤️ by the PhishingShield Team**
