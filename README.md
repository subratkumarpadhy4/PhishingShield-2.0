# 🛡️ PhishingShield 2.0: The AI-Powered Guardian of the Web

<div align="center">

![PhishingShield Banner](https://img.shields.io/badge/Security-AI%20Powered-blue?style=for-the-badge&logo=shield)
![Version](https://img.shields.io/badge/Version-2.0.0-green?style=for-the-badge)
![Tech](https://img.shields.io/badge/Stack-Chrome%20Ext%20%7C%20Node.js%20%7C%20Llama3-blueviolet?style=for-the-badge)
![Status](https://img.shields.io/badge/Status-Active%20Defense-success?style=for-the-badge)

**Detects Zero-Day Phishing Attacks in < 500ms.**
*Protection that thinks faster than hackers can type.*

[Features](#-key-features) • [Installation](#-installation--setup) • [Architecture](#-architecture-visualization) • [Live Demo](#-how-to-test-demo-scenarios)

</div>

---

## ⚔️ Why PhishingShield?

Traditional antiviruses are **Reactive** (waiting for blacklists). PhishingShield is **Proactive**.

| Feature | 🚫 Traditional Antivirus | 🛡️ PhishingShield 2.0 |
| :--- | :--- | :--- |
| **Detection logic** | Static Blacklists (Slow) | **Real-Time AI & Heuristics** (Instant) |
| **Zero-Day Defense** | Fails on new sites | **Detects threat patterns** automatically |
| **User Feedback** | Passive / Non-existent | **Community Trust Scores** & Voting |
| **Education** | "Access Denied" (No Info) | **Explains WHY** (e.g., "Typosquatting detected") |
| **Sync Speed** | Hours/Days | **< 10 Seconds** (Global Neural Sync) |
| **AI Brain** | None / Cloud-heavy | **Hybrid** (Local Heuristics + Groq/Gemini LLM) |

---

## 🏗️ Architecture Visualization

### 🌐 System Architecture & Logic

### 🌐 System Architecture & Logic
#### 1. 🧩 Modular System View
The system is composed of specialized detectors that feed into a central Risk Engine.

> *Note: If the diagram below does not render on your device, [view the static image here](./images/architecture.png).*

```mermaid
graph TD
    subgraph "Browser Extension (Client)"
        Input[Page Load] -->|Trigger| Content[content.js]
        
        subgraph "Risk Engine Core"
            Content -->|1. Scan DOM| DOM[DOM Analyzer]
            DOM -->|Check| QR[Quishing Detector]
            DOM -->|Check| Favicon[Favicon Matcher]
            DOM -->|Check| Cham[Chameleon Anti-Bot]
            DOM -->|Monitor| DL[Download Defense]
        end
        
        Content -->|Calculate Score| Heuristics[Heuristic Score]
        Heuristics -->|Display| HUD[Risk HUD UI]
    end

    subgraph "Gamification Layer"
        HUD -->|"Safe Browse (+5XP)"| XP[XP Manager]
        XP -->|Level Up| Unlocks{Feature Unlocks}
        Unlocks -->|Lvl 5| QR
        Unlocks -->|Lvl 10| AI_Enable[AI Analysis]
        Unlocks -->|Lvl 20| Cham
    end

    subgraph "AI Cloud Layer"
        Heuristics -.->|"If Score > 20"| BG[background.js]
        BG -->|Request Audit| Server[Node.js Server]
        Server -->|Forensic Prompt| LLM[Groq Llama-3 / Gemini]
        LLM -->|Verdict| Server
        Server -.->|"Return +AI Score"| HUD
    end
```

#### 2. ⚡ Threat Detection Logic Flow
How a "Suspicious Site" triggers the AI Defense Grid.

```mermaid
sequenceDiagram
    participant User
    participant Ext as Content Script
    participant RE as Risk Engine
    participant BG as Background/API
    participant AI as AI Model (Groq)

    User->>Ext: Visits Page
    Ext->>RE: Analyze DOM & Metadata
    RE-->>Ext: Return Heuristic Score (e.g., 45/100)
    
    alt Score < 20 (Safe)
        Ext->>User: Display GREEN HUD (Safe)
        Ext->>BG: Add +10 XP (Safe Browsing)
    else Score >= 20 (Suspicious)
        Ext->>User: Display YELLOW HUD (Caution)
        Note right of Ext: Initiating AI Scan...
        Ext->>BG: POST /api/ai/scan (DOM Snapshot)
        BG->>AI: Analyze for Phishing Tactics
        AI-->>BG: Verdict: "Phishing" (+40 pts)
        BG-->>Ext: Return AI_Score: 85 (Critical)
        Ext->>User: Update HUD to RED (Blocked)
    end
```

---

## 🚀 Key Features

### 1. 🔍 Intelligent Risk Engine (`risk_engine.js`)
The core of our defense is a purely client-side heuristic engine.
*   **Brand Impersonation**: Compares page content/titles against a protected list of major brands (PayPal, Google, SBI, etc.).
*   **Typosquatting Sentinel**: Detects deceptive domains like `goog1e.com` or `paypaI.com`.
*   **Punycode & Homograph Detection**: Blocks IDN homograph attacks (e.g., Cyrillic 'a' vs Latin 'a').
*   **Entropy Analysis**: Identifies randomly generated domains (DGA) used by botnets.
*   **Extension Audit**: Scans *other* installed extensions to detect rogue scripts.

### 2. Dual-Engine AI Analysis
When heuristics flag a site as suspicious, the **AI Cloud Layer** engages.

#### AI Logic Flow

```mermaid
graph LR
    A["Suspicious Page"] --> B{"Heuristic Score > 20?"}
    B -- No --> C["Green HUD"]
    B -- Yes --> D["Snapshot DOM"]
    D --> E["Send to Groq Llama-3"]
    E --> F{"Is Phishing?"}
    F -- No --> G["Mark Safe (Cache)"]
    F -- Yes --> H{"Confidence > 80%?"}
    H -- Yes --> I["🔴 BLOCK & ALERT"]
    H -- No --> J["Consult Gemini (Fallback)"]
    J --> I
```
*   **Results**: Generates a human-readable report (e.g., "AI Detected: Imitating Amazon Login page with urgency tactics").

### 3. 🛡️ The Risk HUD (Head-Up Display)
A non-intrusive overlay that sits on top of your browsing experience.

#### 📊 Threat Matrix
| Risk Level | Score | Color | Meaning | Action |
| :--- | :---: | :---: | :--- | :--- |
| **SAFE** | **0 - 20** | 🟢 Green | Verified Brand | Safe to process. |
| **CAUTION** | **21 - 50** | 🟡 Yellow | Suspicious traits | **Proceed with care.** |
| **DANGEROUS** | **51 - 79** | 🟠 Orange | High Heuristic Risk | **Leave Immediately.** |
| **CRITICAL** | **80 - 100** | 🔴 Red | **AI Confirmed Threat** | **BLOCKED.** |

### 4. 🌐 Real-Time Global Synchronization
*   **Community Trust**: Sites have dynamic trust scores based on user votes.
*   **Global Ban System**: Admin bans propagate to **all users in < 10 seconds**.
*   **Hybrid Sync**: Merges Local Server (DEV) and Global Cloud data seamlessly.

### 5. 🎮 Gamification & XP System
Security meets Fun.
*   **Earn XP**: +10 XP for Reports, +5 XP for safe browsing.
*   **Ranks**: Novice 🥉 -> Scout 🥈 -> Sentinel 🥇 -> Cyber Ninja 🥷.
*   **Unlocks**: High-level features (like ML Analysis) unlock as you level up.

### 6. 🚨 Report, Ban, & Unban Lifecycle
*   **Report**: Right-click -> "Report to PhishingShield".
*   **Ban**: Admins review and ban sites instantly.
*   **Block**: Uses `declarativeNetRequest` for network-level blocking.

### 7. � Advanced Download Protection
PhishingShield analyzes incoming files for hidden execution risks:
*   **Double Extension Detection**: Blocks `invoice.pdf.exe`.
*   **Source Correlation**: Downloads from "High Risk" sites are flagged automatically.
*   **Fortress Mode**: Lockdown mode handling 3rd party scripts.

---

## 🛠️ Installation & Setup

### Prerequisites
*   Node.js (v16+)
*   Chrome / Edge / Brave

### 1. Server Setup
```bash
git clone https://github.com/subratkumarpadhy4/PhishingShield.git
cd PhishingShield/server
npm install

# Setup API Keys
echo "GROQ_API_KEY=your_key" >> .env
echo "GEMINI_API_KEY=your_key" >> .env

npm start
```

### 2. Extension Setup
1.  Go to `chrome://extensions`.
2.  Enable **Developer Mode**.
3.  Click **Load Unpacked**.
4.  Select the `PhishingShield-2.0` folder.

---

## 🧪 How to Test (Demo Scenarios)

### Scenario A: The AI Phishing Test
1.  Navigate to local file `tests/ai_phishing_test.html`.
2.  **Watch HUD**: Yellow (Heuristic) -> **Red (AI Confirmed)** after 2s.
3.  **Result**: "🤖 AI Analysis Detected Threat".

### Scenario B: Typosquatting
1.  Open `tests/fake_instagram.html`.
2.  **Observation**: HUD detects "Brand Impersonation" & "Unencrypted Login".

### Scenario C: QR Quishing
1.  Open `tests/qr_safe.html`.
2.  **Observation**: Engine scans QR codes in images and validates the destination URL.

---

## 📂 Project Structure

*   **/js**
    *   `risk_engine.js`: Pure mathematical models for risk calculation.
    *   `content.js`: UI orchestration.
    *   `background.js`: Service worker for sync & API.
*   **/server**: Express app handling AI & Consistency.
*   **/tests**: Safe environments for testing malware logic.

---

## 🔒 Permissions Policy

| Permission | Justification |
| :--- | :--- |
| `activeTab` | Required to read DOM for heuristic analysis. |
| `scripting` | Needed to inject the Risk HUD overlay. |
| `declarativeNetRequest` | Used to block banned sites at the network layer. |
| `storage` | Stores User XP, Level, and cached threats. |

---

## 📄 License
MIT License. Open Source for Educational and Security Research.

<div align="center">
<b>Built with ❤️ by the PhishingShield Team</b>
</div>
