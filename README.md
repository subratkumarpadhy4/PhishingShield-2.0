# 🛡️ PhishingShield: Advanced Phishing Detection & Protection Extension

**PhishingShield** is a comprehensive, client-side browser security suite designed to protect users from modern web threats in real-time. Unlike traditional antivirus software that relies solely on static blacklists, PhishingShield employs a multi-layered heuristic risk engine and **Real-Time Global Synchronization** to detect new, zero-day phishing attacks, brand impersonation, and malicious browser extensions.

> **Enterprise Ready**: Features gamification (XP levels), a real-time Risk HUD, and an Admin Portal for network-wide oversight with **Global Threat Propagation** and **AI-Powered Analysis**.

---

## 📢 Three Main Features

### 1. Community Trust & Scoring System
**"The Network of Trust" - Powered by collective intelligence**
*   **Trust Scores**: Every site has a dynamic trust score based on user upvotes (Safe) and downvotes (Dangerous).
*   **Visual Indicators**: The HUD displays Green 🟢 (High Trust) or Red 🔴 (Low Trust) signals instantly.
*   **Community Verified**: Safety isn't just an algorithm; it's confirmed by real humans.
*   **Safety in Numbers**: If 500 users vote "Safe", you can browse with confidence.
*   **XP Rewards**: Earn XP for contributing to the community trust scores.

### 2. Report, Ban, & Unban Lifecycle
**A complete, unified workflow for threat management**
*   **Report (The Trigger)**: Users right-click to report suspicious sites instantly.
*   **Ban (The Enforcement)**: Admins review reports and Ban sites with one click.
    *   *Global Propagation*: Bans sync to all users within 10 seconds.
    *   *Instant Blocking*: Uses Chrome's `declarativeNetRequest` for immediate protection.
*   **Unban (The Correction)**: Admins can reverse bans if a site is verified safe.
    *   *Auto-Redirect*: Users on a banned page are automatically redirected back when unbanned.

### 3. AI-Powered Threat Analysis
**Dual-Engine Intelligence for accurate verification**
*   **Primary Brain**: **Groq (Llama-3)** for lightning-fast analysis (< 1 second).
*   **Backup Brain**: **Google Gemini** for reliable failover if Groq is busy.
*   **Deep Scan**: AI analyzes page content, CSS patterns, and hosting data.
*   **Risk Scoring**: Returns a 0-100 score with detailed reasoning (e.g., "Imitating Amazon CSS").
*   **Admin Assistant**: Gives Admins the confidence to Ban without visiting dangerous sites.

---

## 🌟 Additional Features

### � 1. Intelligent Risk Engine
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
*   **Global Leaderboard**: Compete with other users worldwide.
*   **Balanced Training Curve**:
    *   **Base XP**: 5 XP (Hard mode start).
    *   **Streak Multiplier**: XP increases by +2 for every streak step. Highest streaks yield massive rewards.
    *   **Difficulty Bonus**: 1.5x - 2x Multipliers for solving advanced scenarios.
    *   **Mega Bonuses**: +50 XP windfalls for hitting streak milestones (5x, 10x).
*   **Ranks**: Novice 🥉 -> Scout 🥈 -> Sentinel 🥇.
*   **Training Dojo**: 100+ Interactive scenarios covering Typosquatting, Homograph attacks, and more.

---

## ⚠️ Important for Developers / Cloned Repos

### Why You Cannot Sign In
If you have cloned this repository and are running it locally, **Sign In and Registration will NOT work** by default.

**The Reason:**
This application relies on a secure **cloud-hosted backend** and a protected **MongoDB database** to sync user accounts, global bans, and trust scores. 
*   Connection credentials (API Keys, Database URI) are stored in secure `.env` files which are **not included** in this public repository.
*   Without these keys, your local version cannot connect to the global PhishingShield network.

### 🧪 How to Test Locally (Offline Mode)
You can still explore the extension in "Offline/Developer Mode" by creating your own local environment:
1.  **Install Dependencies:** `npm install` and `cd server && npm install`
2.  **Start Local Server:** `./start_system.sh` (Mac/Linux) or `./start_system.bat` (Windows)
    *   *This creates a local, isolated instance on `localhost:3000` set to "DEV_MODE". You can create accounts and ban sites locally, but you won't see global community data.*

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

## � Installation Guide

### 1. Backend Setup
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

### 2. Extension Installation
1.  Open Chrome/Edge and go to `chrome://extensions`.
2.  Enable **Developer Mode** (top right toggle).
3.  Click **Load Unpacked**.
4.  Select the **root folder** of this project (`/PhishingShield`).

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

**Built with ❤️ by the PhishingShield Team**
