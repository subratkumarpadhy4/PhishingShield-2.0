# Project Structure & File Guide

This document maps every file in the PhishingShield codebase to its specific function, allowing you to easily identify which code controls which part of the extension.

## 📁 Root Directory (Entry Points)
| File | Purpose |
|------|---------|
| `manifest.json` | **The Configuration Core**. Defines permissions, icons, and links all parts (background, content scripts, popups) together. |
| `popup.html` | **The Extension Menu**. The small window that opens when you click the shield icon in the browser toolbar. |
| `dashboard.html` | **The Hub**. Full-screen analytics page showing stats, threat history, and charts. |
| `warning.html` | **The Block Screen**. The red warning page shown when a user tries to visit a dangerous site. |

## 📂 /js (The Logic)

### 🧠 Core Detection
| File | Role | Description |
|------|------|-------------|
| `risk_engine.js` | **The Judge** | Contains the rules and heuristics (keyword lists, domain checks) to decide if a site is checking safe or risky. |
| `ai_model.js` | **The Brain** | Handles advanced analysis (e.g., text content analysis) using lightweight AI models to detect subtle phishing signs. |
| `content.js` | **The Eyes** | Runs on *every* web page you visit. It scans the page (DOM), highlights risky links, and talks to the Risk Engine. |

### 🛡️ Background Services
| File | Role | Description |
|------|------|-------------|
| `background.js` | **The Guardian** | Runs in the background (Service Worker). Handles installation updates, context menus, and global events. |

### 🎮 Gamification & Features
| File | Role | Description |
|------|------|-------------|
| `dojo.js` | **The Trainer** | 'Phishing Dojo' logic. Manages the quiz questions, XP system, and leveling up mechanics. |

### 🖥️ Interface Logic
| File | Role | Description |
|------|------|-------------|
| `popup.js` | **Menu Logic** | Controls the buttons, toggles, and status display inside the extension popup. |
| `dashboard.js` | **Hub Logic** | Generates the charts and populates tables on the Dashboard page. |
| `warning.js` | **Block Logic** | Handles the "Go Back" button and "Proceed Anyway" overrides on the warning page. |

## 📂 /css (The Styling)
| File | Role | Description |
|------|------|-------------|
| `styles.css` | **Injected Styles** | Styles for elements acting *inside* web pages (e.g., the red risk banner, tooltips, floating HUD). |
| `warning.css` | **Page Styles** | Specific layout and design for the `warning.html` block page. |

## 📂 /images
Contains all icons and visual assets. defining the visual identity of the extension.
