# 🛡️ PhishingShield: Advanced Phishing Detection & Protection Extension

**PhishingShield** is a comprehensive, client-side browser security suite designed to protect users from modern web threats in real-time. Unlike traditional antivirus software that relies solely on static blacklists, PhishingShield employs a multi-layered heuristic risk engine and **Real-Time Global Synchronization** to detect new, zero-day phishing attacks, brand impersonation, and malicious browser extensions.

> **Enterprise Ready**: Features gamification (XP levels), a real-time Risk HUD, and an Admin Portal for network-wide oversight with **Global Threat Propagation**.

---

## 🌟 Core Features

### 🔍 1. Intelligent Risk Engine
The heart of PhishingShield is `risk_engine.js`, a client-side heuristics engine that analyzes every webpage you visit.
*   **Brand Impersonation Detection**: Checks page content and titles against a protected list of major banks and services (PayPal, Google, SBI, HDFC, etc.).
*   **Typosquatting Sentinel**: Detects deceptive domains like `goog1e.com` or `paypaI.com` (using Levenshtein distance algorithms).
*   **Punycode Detection**: Blocks homograph attacks (e.g., Cyrillic 'a' vs Latin 'a').
*   **Domain Entropy Analysis**: Identifies randomly generated domains often used by botnets.
*   **AI Verification (Hybrid)**: Uses **Groq/Gemini AI** to perform deep content analysis on suspicious sites, providing a confidence score and reason for the block.

### 🌐 2. Global Synchronization (NEW!)
PhishingShield now features a robust **Hybrid Sync Architecture** that ensures protection follows you everywhere.
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
*   **Community Reporting**: Right-click to **"Report to PhishingShield"**. Reports are sent to the Global Admin Console for review.

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
*   **`/js`**: Core logic (`content.js`, `background.js` with Global Sync logic).
*   **`/server`**: A Node.js + Express backend.
    *   `server.js`: Handles API requests and **Forwards Writes** to the Global Cloud.
    *   `users.json` / `reports.json`: Local persistence (mirrored to cloud).
*   **`/css`**: Styling for Dashboard and Risk HUD.

---

## 🚀 Installation Guide

### 1. Backend Setup (Crucial for Global Sync)
The backend acts as your local gateway to the PhishingShield Network.

```bash
# Clone the repo
git clone https://github.com/subratkumarpadhy4/PhishingShield.git
cd PhishingShield/server

# Install dependencies
npm install

# Start the server (runs on port 3000)
npm start
```
*Note: The server must be running to receive reports and sync XP.*

### 2. Extension Installation
1.  Open Chrome/Edge and go to `chrome://extensions`.
2.  Enable **Developer Mode** (top right toggle).
3.  Click **Load Unpacked**.
4.  Select the **root folder** of this project (`/PhishingShield`).

### 3. Usage & Admin
*   **Dashboard**: Click the extension icon to view your stats and XP.
*   **Global Bans**: If Admin clicks "Ban" on any report. It will propagate to all users within ~10 seconds.

---

## 🔮 Future Roadmap
*   **Deep Learning integration**: Move from simple Bayes to a TensorFlow.js model running locally.
*   **Enterprise Integration**: LDAP/Active Directory sync.
*   **Mobile App**: React Native companion app.

---

## 💻 Tech Stack
*   **Frontend**: HTML5, CSS3, JavaScript (Vanilla)
*   **Extension API**: Chrome Manifest V3
*   **Backend**: Node.js, Express.js
*   **Cloud Sync**: Hybrid Local/Cloud Architecture (Rest API)
*   **AI**: Groq / Gemini Integation

---

## 📄 License
MIT License.
