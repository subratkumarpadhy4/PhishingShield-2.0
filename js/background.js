// Service Worker Window Polyfill for Firebase (Legacy support removed)
// Running entirely on local Node.js backend (http://localhost:3000)

let db = null; // No longer used

// Import AI Model for basic offline checks
importScripts('js/ai_model.js');

// -----------------------------------------------------------------------------
// TRUSTED EXTENSIONS WHITELIST (Tier 1: Trusted)
// -----------------------------------------------------------------------------
// Map of ID -> Name for extensions we explicitly trust.
const TRUSTED_EXTENSIONS = {
    "ghbmnnjooekpmoecnnnilnnbdlolhkhi": "Google Docs Offline",
    "kbfnbcaeplbcioakkpcpgfkobkghlhen": "Grammarly",
    "cfhdojbkjhnklbpkdaibdccddilifddb": "Adblock Plus",
    "cjpalhdlnbpafiamejdnhcphjbkeiagm": "uBlock Origin",
    "eimadpbcbfnmbkopoojfekhnkhdbieeh": "Dark Reader",
    "pkeeekfbjjpdkbngjolptfiedbfbcjoa": "LastPass", // Just examples, can be expanded
    // Add PhishingShield's own ID if known, though it won't check itself usually
};

// -----------------------------------------------------------------------------
// EXTENSION SCANNER LOGIC (Shared)
// -----------------------------------------------------------------------------
function checkExtensionRisk(extId, extInfo) {
    // 1. Check Whitelist (TIER: TRUSTED)
    if (TRUSTED_EXTENSIONS[extId]) {
        return { tier: 'TRUSTED', name: TRUSTED_EXTENSIONS[extId] };
    }

    // 2. Check Installation Type (TIER: CAUTION vs HIGH RISK)
    let tier = 'HIGH_RISK'; // Default fail-safe

    if (extInfo.installType === 'normal') {
        tier = 'CAUTION'; // Verified source (Web Store), but not in our Whitelist
    } else if (extInfo.installType === 'admin') {
        tier = 'CAUTION'; // Enterprise installed
    }

    return {
        tier: tier,
        name: extInfo.name,
        installType: extInfo.installType
    };
}

// -----------------------------------------------------------------------------
// ON INSTALL LISTENER (Real-time scanning)
// -----------------------------------------------------------------------------
if (chrome.management && chrome.management.onInstalled) {
    chrome.management.onInstalled.addListener((info) => {
        const result = checkExtensionRisk(info.id, info);
        console.log(`[PhishingShield] New Extension Installed: ${info.name} (${result.tier})`);

        if (result.tier === 'HIGH_RISK' || result.tier === 'CAUTION') {
            // 1. Notification
            const title = result.tier === 'HIGH_RISK' ? '🚨 High Risk Extension Detected' : '⚠️ Unverified Extension';
            const priority = result.tier === 'HIGH_RISK' ? 2 : 1;

            chrome.notifications.create({
                type: 'basic',
                iconUrl: 'images/icon48.png',
                title: title,
                message: `"${info.name}" (${result.tier}) detected. Check Dashboard for details.`,
                priority: priority
            });

            // 2. Log to Dashboard (Storage)
            chrome.storage.local.get(['suspectedExtensions'], (data) => {
                const list = data.suspectedExtensions || [];
                // Add new entry
                list.push({
                    id: info.id,
                    name: info.name,
                    tier: result.tier,
                    installType: info.installType,
                    timestamp: Date.now()
                });
                chrome.storage.local.set({ suspectedExtensions: list });
            });
        }
    });
}

// -----------------------------------------------------------------------------
// MESSAGE LISTENERS
// -----------------------------------------------------------------------------
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {

    // NEW: 3-Tier Extension Security Check
    if (request.type === "CHECK_EXTENSION_ID") {
        const extId = request.id;

        // We still need management API to get info if not passed
        chrome.management.get(extId, (info) => {
            if (chrome.runtime.lastError) {
                console.warn(`[PhishingShield] Could not query extension ${extId}:`, chrome.runtime.lastError);
                sendResponse({ tier: 'HIGH_RISK', name: 'Unknown' });
                return;
            }
            const result = checkExtensionRisk(extId, info);
            sendResponse(result);
        });

        return true; // Keep channel open for async response
    }

    if (request.type === "LOG_VISIT") {
        console.log("[PhishingShield] LOG_VISIT received.");
        updateXP(5); // +5 XP per visit
    } else if (request.type === "ADD_XP") {
        console.log("[PhishingShield] ADD_XP received:", request.amount);
        updateXP(request.amount || 10);
    } else if (request.type === "REPORT_SITE") {

        // 1. Fetch Reporter Info
        chrome.storage.local.get(['currentUser'], (data) => {
            const user = data.currentUser || {};
            const reporterName = user.name || 'Anonymous';
            const reporterEmail = user.email ? ` (${user.email})` : '';
            const reporterDisplay = reporterName + reporterEmail;

            const reportPayload = {
                url: request.url,
                hostname: request.hostname,
                reporter: reporterDisplay
            };

            // 2. Send to Node.js Backend
            fetch('http://localhost:3000/api/reports', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(reportPayload)
            })
                .then(response => response.json())
                .then(data => {
                    console.log("[PhishingShield] Report Sent to Server:", data);
                    sendResponse({ success: true, data: data });
                })
                .catch(err => {
                    console.error("[PhishingShield] Reporting Failed:", err);
                    sendResponse({ success: false, error: err.toString() });
                });

            // 3. Keep Local Backup (Optional, for offline viewing)
            chrome.storage.local.get(['reportedSites'], (res) => {
                const logs = res.reportedSites || [];
                logs.push({ ...reportPayload, status: 'pending', timestamp: Date.now() });
                chrome.storage.local.set({ reportedSites: logs });
            });
        });

        return true;
    }
});

/**
 * Updates User XP and checks for Level Up
 */
// Helper: Level Calculation (Square Root Curve)
function calculateLevel(xp) {
    return Math.floor(Math.sqrt(xp / 100)) + 1;
}

function updateXP(amount) {
    // Silent Ticker: Update Badge
    if (amount > 0) {
        chrome.action.setBadgeText({ text: `+${amount}` });
        chrome.action.setBadgeBackgroundColor({ color: '#28a745' });
        setTimeout(() => {
            chrome.action.setBadgeText({ text: "" });
        }, 2000);
    }

    chrome.storage.local.get(['userXP', 'userLevel'], (result) => {
        let currentXP = result.userXP || 0;
        let currentLevel = result.userLevel || 1;

        let users = result.users || [];
        let currentEmail = result.currentUser ? result.currentUser.email : null;

        currentXP += amount;

        // Recalculate Level strictly based on XP
        const newLevel = calculateLevel(currentXP);
        const oldLevel = result.userLevel || 1;

        if (newLevel > oldLevel) {
            // Level Up!
            chrome.notifications.create({
                type: 'basic',
                iconUrl: 'images/icon48.png',
                title: '🎉 Level Up!',
                message: `Congratulations! You reached Level ${newLevel}.`
            });
            // Broadcast Level Up to all tabs
            chrome.tabs.query({}, (tabs) => {
                tabs.forEach(tab => {
                    if (tab.id) { // Ensure tab.id exists
                        chrome.tabs.sendMessage(tab.id, {
                            type: "LEVEL_UP",
                            level: newLevel
                        }).catch(e => console.warn("Could not send LEVEL_UP message to tab:", tab.id, e));
                    }
                });
            });
        }

        // Save Global State
        const updates = { userXP: currentXP, userLevel: newLevel, pendingXPSync: true }; // Flag for Sync

        // Sync with User Registry (Consistency Check)
        if (currentEmail) {
            const userIndex = users.findIndex(u => u.email === currentEmail);
            if (userIndex !== -1) {
                users[userIndex].xp = currentXP;
                users[userIndex].level = newLevel;
                updates.users = users; // Save users too
                console.log(`[PhishingShield] Synced User ${currentEmail}: XP=${currentXP}, Lvl=${newLevel}`);

                // PUSH TO SERVER IMMEDIATELY
                fetch('http://localhost:3000/api/users/sync', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(users[userIndex])
                }).then(() => console.log("[PhishingShield] XP Saved to Server"))
                    .catch(e => console.error("[PhishingShield] XP Sync Failed:", e));
            }
        }

        chrome.storage.local.set(updates);
    });
}

function updateSafeStreak(isCritical) {
    chrome.storage.local.get(['lastCriticalTime', 'safeStreak'], (result) => {
        if (isCritical) {
            chrome.storage.local.set({
                lastCriticalTime: Date.now(),
                safeStreak: 0,
                pendingXPSync: true // Sync the reset
            });
        }
    });
}

/**
 * Fortress Mode: Block 3rd Party Scripts
 */
function updateFortressRules(enabled) {
    const FORTRESS_RULE_ID = 999;

    if (enabled) {
        chrome.declarativeNetRequest.updateDynamicRules({
            addRules: [{
                "id": FORTRESS_RULE_ID,
                "priority": 10,
                "action": { "type": "block" },
                "condition": {
                    "resourceTypes": ["script"],
                    "domainType": "thirdParty"
                }
            }]
        }, () => {
            console.log("[PhishingShield] Fortress Mode: 3rd Party Scripts Blocked.");
        });
    } else {
        chrome.declarativeNetRequest.updateDynamicRules({
            removeRuleIds: [FORTRESS_RULE_ID]
        }, () => {
            console.log("[PhishingShield] Fortress Mode: Normal Script Access Restored.");
        });
    }
}

console.log("PhishingShield Service Worker Loaded");

/**
 * COMMUNITY BLOCKLIST
 * Converts 'banned' reports into active blocking rules.
 */
function updateBlocklistFromStorage() {
    chrome.storage.local.get(['reportedSites'], (result) => {
        const reports = result.reportedSites || [];
        const banned = reports.filter(r => r.status === 'banned');

        // Convert to Rules
        const newRules = banned.map((r, index) => ({
            "id": 2000 + index, // IDs 2000+ for Community Blocklist
            "priority": 1,
            "action": {
                "type": "redirect",
                "redirect": { "extensionPath": "/warning.html?reason=COMMUNITY_BAN" }
            },
            "condition": {
                "urlFilter": "||" + new URL(r.url).hostname,
                "resourceTypes": ["main_frame"]
            }
        }));

        // Clear old 2000+ rules and add new ones
        chrome.declarativeNetRequest.getDynamicRules((currentRules) => {
            const removeIds = currentRules.filter(r => r.id >= 2000).map(r => r.id);
            chrome.declarativeNetRequest.updateDynamicRules({
                removeRuleIds: removeIds,
                addRules: newRules
            }, () => {
                console.log(`[PhishingShield] Blocklist Updated: ${newRules.length} sites blocked.`);
            });
        });
    });
}

// Update on Startup
chrome.runtime.onStartup.addListener(updateBlocklistFromStorage);
chrome.runtime.onInstalled.addListener(updateBlocklistFromStorage);

// Also listen for manual update trigger
chrome.runtime.onMessage.addListener((msg) => {
    if (msg.type === "UPDATE_BLOCKLIST") updateBlocklistFromStorage();
});
