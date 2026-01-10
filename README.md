# 🛡️ PhishingShield: Advanced Phishing Detection & Protection Extension

**PhishingShield** is a comprehensive, client-side browser security suite designed to protect users from modern web threats in real-time. Unlike traditional antivirus software that relies solely on static blacklists, PhishingShield employs a multi-layered heuristic risk engine to detect new, zero-day phishing attacks, brand impersonation, and malicious browser extensions.

> **Enterprise Ready**: Features gamification (XP levels), a real-time Risk HUD, and an Admin Portal for network-wide oversight.

---

## 🌟 Core Features

### 🔍 1. Intelligent Risk Engine
The heart of PhishingShield is `risk_engine.js`, a client-side heuristics engine that analyzes every webpage you visit.
*   **Brand Impersonation Detection**: Checks page content and titles against a protected list of major banks and services (PayPal, Google, SBI, HDFC, etc.). If a site claims to be "PayPal" but isn't hosted on `paypal.com`, it's flagged.
*   **Typosquatting Sentinel**: Detects deceptive domains like `goog1e.com` or `paypaI.com` (using Levenshtein distance algorithms).
*   **Punycode Detection**: Blocks homograph attacks (e.g., Cyrillic 'a' vs Latin 'a').
*   **Domain Entropy Analysis**: Identifies randomly generated domains often used by botnets (e.g., `x7z9pq2.com`).
*   **Domain Coherence**: Matches the page title with the domain name. If a page says "Bank of America Login" but the domain is completely unrelated, the risk score spikes.
*   **Urgency Detection**: Scans for social engineering keywords like "Account Suspended", "Action Required Immediately", or "Verify Now".

### 📊 2. Visual Risk HUD (Head-Up Display)
A futuristic, floating overlay (`content.js`) that provides instant feedback on page safety.
*   **Risk Score**: A 0-100 score indicating the danger level.
*   **Real-time Analysis**: Lists specific reasons for the score (e.g., "+30 Brand Impersonation", "+20 Urgency Keywords").
*   **Inspector Mode**: A unique visual tool that **highlights** specific elements on the page that triggered the alert (e.g., insecure password fields, fake download buttons).

### 🛡️ 3. Active Protection
*   **Link Hover Preview**: Reveals the *true* destination of links before you click, flagging mismatches (e.g., text says "google.com" but link goes to "evil.com").
*   **Insecure Login Blocking**: Detects password fields on HTTP (unencrypted) pages and warns the user immediately to prevent credential theft.
*   **Download Protection**: intercepts downloads of risky file types (`.exe`, `.zip`, `.msi`) and requires explicit confirmation.
*   **Extension Security Audit**: Scans installed browser extensions, identifies those with high-risk permissions, and warns if they are unverified or potentially malicious.
*   **Community Reporting**: Right-click on any page to **"Report to PhishingShield"**. Use the context menu to flag suspicious sites which are then reviewed by Admins and added to the global blocklist if confirmed.
*   **Fortress Mode**: A "Zero Trust" setting for high-risk environments. When enabled, it blocks all third-party scripts, enforces strict download policies, and increases the sensitivity of the risk engine.

### 🎮 4. Gamification (XP System) & Training Dojo 🥋
Security doesn't have to be boring. PhishingShield turns safe browsing into a game.
*   **Earn XP**: Get points for browsing safe sites, reporting phish, and keeping your browser clean.
*   **Streak Bonuses**: Earn extra XP for consecutive correct answers in the Dojo.
*   **Ranks**:
    *   🥉 **Novice** (Level 1-4)
    *   🥈 **Scout** (Level 5-19)
    *   🥇 **Sentinel** (Level 20+)
*   **Leaderboard**: Compete with others in your network for the top spot.

### 🧠 5. Training Dojo (Enhanced)
A dedicated interactive learning module built right into the extension popup.
*   **Real-World Scenarios**: Test your skills against realistic phishing attempts (Fake Emails, SMS Smishing, Bank Login Spoofs).
*   **Advanced Curriculum (Levels 1-8)**: 
    *   **Basic**: Typosquatting (facebo0k.com) & Subdomain tricks.
    *   **Intermediate**: Brand Spoofing & TLD misuse (.xyz, .tk).
    *   **Advanced**: Homograph Attacks (Cyrillic characters), URL Obfuscation (@ symbols), and IP-based scams.
*   **Instant Feedback**: Get detailed, educational explanations for every answer—whether right or wrong.

---

## 🛠️ Extensions & Permissions Explained
PhishingShield requires specific permissions to function effectively. Here is a breakdown of why each is needed (found in `manifest.json`):

| Permission | Reason |
| :--- | :--- |
| **`declarativeNetRequest`** | Used to block access to known malicious sites (the Community Blocklist) instantly without slowing down browsing. |
| **`scripting`** | Allows the extension to run the `risk_engine.js` analysis on web pages and display the Risk HUD. |
| **`storage`** | Saves your settings, XP progress, and local whitelist/blacklists. |
| **`contextMenus`** | Adds the "Report to PhishingShield" right-click option. |
| **`notifications`** | Sends desktop alerts for critical threats or Level Up achievements. |
| **`management`** | Required for the **Extension Audit** feature to scan *other* installed extensions for risks. |
| **`host_permissions` (<all_urls>)** | Necessary to scan *any* website you visit for phishing content. |

---

## 📂 Project Structure
*   **`/js`**: Core logic.
    *   `content.js`: The script that runs on webpages (HUD, Highlights).
    *   `background.js`: Results orchestration, Blocklist management, Context Menus.
    *   `risk_engine.js`: The heavy-lifting analysis algorithms.
    *   `dashboard.js`: Logic for the user dashboard UI.
*   **`/server`**: A Node.js + Express backend.
    *   `server.js`: Handles API requests for Reports, User Sync, and Global Leaderboards.
    *   `users.json` / `reports.json`: Simple file-based databases (easily replaceable with MongoDB/Firebase).
*   **`/css`**: Styling for the Dashboard and the injected Risk HUD (`styles.css`).
*   **`/images`**: Icons and badges for ranks.

---

## 🚀 Installation Guide

### 1. Backend Setup (Essential for Leaderboard/Reports)
The extension works standalone for local protection, but the backend enables the "Community" features.
```bash
# Clone the repo
git clone https://github.com/subratkumarpadhy4/PhishingShield.git
cd PhishingShield/server

# Install dependencies
npm install

# Start the server (runs on port 3000 by default)
node server.js
```

### 2. Extension Installation
1.  Open Chrome/Edge and go to `chrome://extensions`.
2.  Enable **Developer Mode** (top right toggle).
3.  Click **Load Unpacked**.
4.  Select the **root folder** of this project (`/PhishingShield`).

### 3. Usage
*   **Dashboard**: Click the extension icon to open the popup, or click "Open Dashboard" for the full view.
*   **Admin Panel**: Go to `admin.html` (or access via the dashboard footer if you are the admin). Default Admin Email: `rajkumarpadhy2006@gmail.com`.

---

## 🔮 Future Roadmap
*   **Deep Learning integration**: Move from simple Bayes to a TensorFlow.js model running locally in the browser.
*   **Enterprise Integration**: LDAP/Active Directory sync for corporate deployment.
*   **Mobile App**: React Native companion app for mobile protection.

---

## � Tech Stack
*   **Frontend**: HTML5, CSS3, JavaScript (Vanilla - no heavy frameworks for performance)
*   **Extension API**: Chrome Manifest V3 (declarativeNetRequest, scripting, storage)
*   **Backend**: Node.js, Express.js
*   **Database**: JSON-based storage (Mock DB) / Ready for Firebase integration
*   **Analysis**: Custom Heuristic Engine (Levenshtein Distance, Entropy Calculation, Bayes Classifier)

---

## �📄 License
MIT License.
