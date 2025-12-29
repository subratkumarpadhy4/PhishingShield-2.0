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
// -----------------------------------------------------------------------------
// MESSAGE LISTENERS
// -----------------------------------------------------------------------------
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    console.log("[PhishingShield] 🔵 Message received:", request.type, request);
    console.log("[PhishingShield] Service Worker is ACTIVE at:", new Date().toISOString());

    // PING to wake up service worker
    if (request.type === "PING") {
        console.log("[PhishingShield] PING received - Service Worker is awake");
        if (sendResponse) sendResponse({ success: true, awake: true });
        return true;
    }

    // 1. EXTENSION SECURITY CHECK (Async)
    if (request.type === "CHECK_EXTENSION_ID") {
        const extId = request.id;
        chrome.management.get(extId, (info) => {
            if (chrome.runtime.lastError) {
                console.warn(`[PhishingShield] Could not query extension ${extId}:`, chrome.runtime.lastError);
                sendResponse({ tier: 'HIGH_RISK', name: 'Unknown' });
                return;
            }
            const result = checkExtensionRisk(extId, info);
            sendResponse(result);
        });
        return true; // Keep channel open
    }

    // 2. LOG VISIT
    if (request.type === "LOG_VISIT") {
        console.log("[PhishingShield] LOG_VISIT handler triggered");
        console.log("[PhishingShield] LOG_VISIT data:", request.data);
        
        // Respond immediately to prevent timeout
        if (sendResponse) {
            sendResponse({ success: true });
        }

        // Award XP for visiting a website (async, but we already responded)
        console.log("[PhishingShield] Calling updateXP(5)");
        updateXP(5);

        // Save visit to log (async)
        chrome.storage.local.get(['visitLog'], (res) => {
            const logs = Array.isArray(res.visitLog) ? res.visitLog : [];
            if (logs.length > 50) logs.shift();
            if (request.data) {
                logs.push(request.data);
            }
            chrome.storage.local.set({ visitLog: logs }, () => {
                console.log("[PhishingShield] Visit log saved, total:", logs.length);
            });
        });

        return true; // Keep channel open for potential async response
    }

    // 3. ADD XP
    else if (request.type === "ADD_XP") {
        const amount = request.amount || 10;
        console.log("[PhishingShield] ADD_XP handler triggered, amount:", amount);
        updateXP(amount);
        if (sendResponse) sendResponse({ success: true });
        return true;
    }

    // 4. REPORT SITE (Async Fetch)
    else if (request.type === "REPORT_SITE") {

        // Fetch User Info first
        chrome.storage.local.get(['currentUser'], (data) => {
            const user = data.currentUser || {};
            const reporterDisplay = (user.name || 'Anonymous') + (user.email ? ` (${user.email})` : '');

            const reportPayload = {
                url: request.url,
                hostname: request.hostname,
                reporter: reporterDisplay
            };

            // Send to Backend
            fetch('http://localhost:3000/api/reports', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(reportPayload)
            })
                .then(res => res.json())
                .then(data => {
                    console.log("[PhishingShield] Report Sent:", data);
                    sendResponse({ success: true, data: data });
                })
                .catch(err => {
                    console.error("[PhishingShield] Report Failed:", err);
                    sendResponse({ success: false, error: err.toString() });
                });

            // Local Backup
            chrome.storage.local.get(['reportedSites'], (res) => {
                const logs = res.reportedSites || [];
                logs.push({ ...reportPayload, status: 'pending', timestamp: Date.now() });
                chrome.storage.local.set({ reportedSites: logs });
            });
        });

        return true; // Keep channel open for async fetch
    }

    // 5. UPDATE BLOCKLIST
    else if (request.type === "UPDATE_BLOCKLIST") {
        updateBlocklistFromStorage();
        if (sendResponse) sendResponse({ success: true });
        return true;
    }

    return true; // Default keep-open to be safe
});

/**
 * Simple and Reliable XP System
 */
function calculateLevel(xp) {
    return Math.floor(Math.sqrt(xp / 100)) + 1;
}

function updateXP(amount) {
    console.log("[PhishingShield] ========== updateXP CALLED ==========");
    console.log("[PhishingShield] Amount:", amount);
    
    if (!amount || amount <= 0) {
        console.warn("[PhishingShield] Invalid XP amount:", amount);
        return;
    }

    // Show badge notification
    try {
        chrome.action.setBadgeText({ text: `+${amount}` });
        chrome.action.setBadgeBackgroundColor({ color: '#28a745' });
        setTimeout(() => chrome.action.setBadgeText({ text: "" }), 2000);
    } catch (e) {
        console.warn("[PhishingShield] Badge update failed:", e);
    }

    // Get current XP and update it
    console.log("[PhishingShield] Reading storage...");
    chrome.storage.local.get(['userXP', 'userLevel', 'users', 'currentUser'], (data) => {
        console.log("[PhishingShield] Storage data received:", data);
        // Initialize if not set
        let currentXP = typeof data.userXP === 'number' ? data.userXP : 0;
        let currentLevel = typeof data.userLevel === 'number' ? data.userLevel : 1;
        let users = Array.isArray(data.users) ? data.users : [];
        let currentUser = data.currentUser || null;

        // Add XP
        currentXP = currentXP + amount;
        const newLevel = calculateLevel(currentXP);

        console.log("[PhishingShield] XP Update: " + (currentXP - amount) + " + " + amount + " = " + currentXP + " (Level " + newLevel + ")");

        // Check for level up
        if (newLevel > currentLevel) {
            chrome.notifications.create({
                type: 'basic',
                iconUrl: 'images/icon48.png',
                title: '🎉 Level Up!',
                message: `Congratulations! You reached Level ${newLevel}.`
            });
            
            // Broadcast to all tabs
            chrome.tabs.query({}, (tabs) => {
                tabs.forEach(tab => {
                    if (tab.id) {
                        chrome.tabs.sendMessage(tab.id, {
                            type: "LEVEL_UP",
                            level: newLevel
                        }).catch(() => {});
                    }
                });
            });
        }

        // Prepare update object
        const updateData = {
            userXP: currentXP,
            userLevel: newLevel,
            pendingXPSync: true
        };

        // Update user in users array if logged in
        if (currentUser && currentUser.email) {
            const userIndex = users.findIndex(u => u && u.email === currentUser.email);
            if (userIndex >= 0) {
                users[userIndex].xp = currentXP;
                users[userIndex].level = newLevel;
                updateData.users = users;

                // Sync to server
                fetch('http://localhost:3000/api/users/sync', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(users[userIndex])
                }).catch(() => {});
            }
        }

        // Save to storage
        console.log("[PhishingShield] Saving to storage:", updateData);
        chrome.storage.local.set(updateData, () => {
            if (chrome.runtime.lastError) {
                console.error("[PhishingShield] ❌ FAILED to save XP:", chrome.runtime.lastError);
            } else {
                console.log("[PhishingShield] ✅ XP saved successfully:", currentXP);
                
                // Double-check by reading it back
                chrome.storage.local.get(['userXP'], (verify) => {
                    console.log("[PhishingShield] Verification - XP in storage:", verify.userXP);
                    if (verify.userXP !== currentXP) {
                        console.error("[PhishingShield] ⚠️ MISMATCH! Expected:", currentXP, "Got:", verify.userXP);
                    } else {
                        console.log("[PhishingShield] ✅✅✅ XP VERIFIED IN STORAGE!");
                    }
                });
            }
        });
    });
    console.log("[PhishingShield] ========== updateXP EXIT ==========");
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

console.log("PhishingShield Service Worker Loaded - " + new Date().toISOString());

// Keep service worker alive by listening to events
chrome.runtime.onInstalled.addListener(() => {
    console.log("[PhishingShield] Extension installed/updated");
});

chrome.runtime.onStartup.addListener(() => {
    console.log("[PhishingShield] Browser startup");
});

// Initialize XP system on startup
chrome.storage.local.get(['userXP', 'userLevel'], (result) => {
    console.log("[PhishingShield] Startup - Current XP:", result.userXP, "Level:", result.userLevel);
    if (result.userXP === undefined || result.userXP === null) {
        chrome.storage.local.set({ userXP: 0, userLevel: 1 }, () => {
            console.log("[PhishingShield] ✅ XP system initialized to 0");
        });
    } else {
        console.log("[PhishingShield] XP system already initialized:", result.userXP);
    }
});

// Listen for storage changes to debug
chrome.storage.onChanged.addListener((changes, areaName) => {
    if (areaName === 'local' && changes.userXP) {
        console.log("[PhishingShield] 🔔 Storage changed - userXP:", changes.userXP.newValue, "(was:", changes.userXP.oldValue, ")");
    }
});

// Test function - call this from console to verify service worker is active
self.testServiceWorker = function() {
    console.log("[PhishingShield] ✅ Service Worker is ACTIVE!");
    chrome.storage.local.get(['userXP', 'userLevel'], (r) => {
        console.log("[PhishingShield] Current XP:", r.userXP, "Level:", r.userLevel);
    });
    return true;
};

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

// UPDATE_BLOCKLIST is handled in the main message listener above
