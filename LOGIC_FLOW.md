# 🛡️ PhishingShield Detection Logic

This document outlines the multi-layered security architecture used by PhishingShield to detect zero-day phishing attacks, visual spoofing, and advanced evasion techniques.

---

## ⚡ Quick Logic Summary

1.  **The Gatekeeper (URL Check):** Analyzes the URL for typos, fake characters (Homographs), and insecure protocols *before* trust is established.
2.  **The Investigator (Content Scan):** Scans the page for urgency keywords, password fields, and hidden QR codes (Quishing) that conceal malicious links.
3.  **The Visual Cortex (Chameleon):** Uses computer vision logic to detect brand logos (e.g., PayPal). If a logo appears on the wrong domain, it flags a **Critical Mismatch**.
4.  **The Judge (AI & Scoring):** Aggregates all data into a Risk Score (0-100). If the score is suspicious (>20), a **Risk HUD** appears. If high risk (>50), the server-side **AI Brain (Gemini)** performs a final forensic analysis to confirm the threat.
---

## 🧠 Logic Flowchart

```mermaid
graph TD
    A[User Visits Website] --> B{1. Static Analysis}
    
    B -->|Check 1| B1[Allowlist/Blocklist Check]
    B -->|Check 2| B2[Homograph & Typosquatting]
    B -->|Check 3| B3[Insecure HTTP / IP Host]
    
    B --> C{2. Content Scanning}
    C -->|Keyword| C1[Detect 'Login', 'Verify', 'Urgent']
    C -->|Inputs| C2[Detect Password Fields]
    C -->|Images| C3[Scan for QR Codes (Quishing)]
    
    C --> D{3. Visual AI (Chameleon)}
    D -->|Brand Match| D1[Is it PayPal/Google/Apple?]
    D -->|Heuristic| D2[Does Color/Layout match Brand?]
    D -->|Mismatch| D3[Brand Logo on Wrong Domain?]
    
    D --> E{4. Risk Scoring Engine}
    E -->|Score < 20| F[✅ Safe]
    E -->|Score 20-50| G[⚠️ Suspicious (Show HUD)]
    E -->|Score > 50| H[🚨 High Risk (Banner/Block)]
    
    G --> I{5. Advanced Verification}
    H --> I
    
    I -->|Async| I1[Domain Age Check (API)]
    I -->|Async| I2[LLM AI Analysis (Gemini/Groq)]
    
    I2 -->|AI Says Phishing| J[🔴 CONFIRM THREAT & BLOCK]
    I2 -->|AI Says Safe| K[🟢 Reduce Score & Trust]
```

---

## 🔍 Feature Breakdown

### 1. Static & URL Analysis
Before even looking at the page content, we analyze the "Metadata" of the connection.
*   **Homograph Protection:** Detects "invisible" characters (e.g., Cyrillic 'а' vs Latin 'a') used to spoof brands like Amazon.
*   **Typosquatting Detection:** Calculates Levenshtein distance to find look-alikes like `googIe.com` (Capital 'i').
*   **Punycode detection:** Flags domains starting with `xn--` that try to mask their true identity.
*   **Protocol Check:** Penalizes sites using HTTP instead of HTTPS.

### 2. Content & DOM Analysis
We scan the HTML structure for signs of social engineering.
*   **Sensitive Input Detection:** Identifies unencrypted password fields or credit card forms on low-trust sites.
*   **Urgency Detection:** Scans for psychological triggers like "Account Suspended", "Immediate Action Required", "24 Hours Left".
*   **Hidden Overlay Detection:** Finds invisible `<iframe>` or `<div>` layers used to hijack clicks (Clickjacking).

### 3. Visual "Chameleon" Engine
A sophisticated visual analysis module that "looks" at the page like a human.
*   **Logo Recognition:** Scans images on the page to identify logos of major targets (PayPal, Microsoft, Instagram, etc.).
*   **Brand Mismatch Logic:** If the page *visually* looks like PayPal (Logo + Blue Colors) but the URL is *not* `paypal.com`, it triggers a **Critical Alert**.
*   **Favicon Analysis:** Checks if the site is using a high-value target's favicon to fake legitimacy.

### 4. Quishing (QR Phishing) Defense
*   **Hybrid Scanning:** Scans both `<img>` tags and rendered `<canvas>` elements for QR codes.
*   **Payload Analysis:** Decodes the QR link in the background. If the QR leads to a suspicious URL, it triggers an immediate **Toast Warning** and Desktop Notification.

### 5. AI & Threat Intel (Server-Side)
For ambiguous cases, we call in the heavy artillery.
*   **Domain Age:** Queries our API to see if the domain was registered in the last 30 days (a huge red flag for banking sites).
*   **LLM Verification:** Sends the page text and context to a Large Language Model (Gemini/Groq). The AI analyzes the intent—"Is this page asking for credentials improperly?"—and provides a final verdict.

---

## 📊 Scoring System

| Risk Score | Status | Action Taken |
| :--- | :--- | :--- |
| **0 - 19** | **Safe** | Silent protection. No UI. |
| **20 - 49** | **Suspicious** | Small "Risk HUD" appears in corner. |
| **50 - 79** | **High Risk** | HUD expands, Red pulsing border on inputs. |
| **80 - 100** | **Critical** | Full Block / Warning Banner. |
