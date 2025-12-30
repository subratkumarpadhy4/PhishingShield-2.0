// Service Worker Window Polyfill for Firebase (Legacy support removed)
// Running on cloud backend (https://phishingshield.onrender.com)

let db = null; // No longer used

// Import AI Model for basic offline checks
// Note: Path is relative to extension root, but since background.js is in js/, we use './ai_model.js'
try {
    importScripts('./ai_model.js');
} catch (e) {
    console.warn("[PhishingShield] Failed to load ai_model.js:", e.message || e);
    // Continue anyway - AI model is optional for basic functionality
}

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
// CONTEXT MENU - REPORT WEBSITE
// -----------------------------------------------------------------------------
console.log("[PhishingShield] Initializing context menu module...");

// Create context menu item for reporting websites
function createContextMenu() {
    console.log("[PhishingShield] createContextMenu() called");

    // Check if contextMenus API is available
    if (!chrome.contextMenus) {
        console.error("[PhishingShield] contextMenus API not available - extension may not have permission");
        return;
    }

    console.log("[PhishingShield] contextMenus API is available, creating menu...");

    // Try to remove existing menu first (ignore errors if it doesn't exist)
    chrome.contextMenus.remove("report-to-phishingshield", () => {
        // Ignore errors from remove - menu might not exist
        if (chrome.runtime.lastError) {
            console.log("[PhishingShield] No existing menu to remove (this is OK)");
        }

        // Create the context menu item directly
        chrome.contextMenus.create({
            id: "report-to-phishingshield",
            title: "Report to PhishingShield",
            contexts: ["page", "link"]
        }, () => {
            if (chrome.runtime.lastError) {
                const errorMsg = chrome.runtime.lastError.message || '';
                // If it says duplicate/exists, that's actually OK - menu was already there
                if (errorMsg.includes('duplicate') || errorMsg.includes('already exists') || errorMsg.includes('Cannot create')) {
                    console.log("[PhishingShield] Context menu already exists (this is OK):", errorMsg);
                } else {
                    console.error("[PhishingShield] ❌ Context menu creation FAILED:", errorMsg);
                }
            } else {
                console.log("[PhishingShield] ✅✅✅ Context menu created successfully!");
            }
        });
    });
}

// Handle context menu clicks
chrome.contextMenus.onClicked.addListener((info, tab) => {
    if (info.menuItemId === "report-to-phishingshield") {
        console.log("[PhishingShield] Report context menu clicked");

        // Get the URL to report (either clicked link or current page)
        // info.linkUrl is available when right-clicking on a link
        // tab.url is available when right-clicking on the page
        const urlToReport = info.linkUrl || (tab && tab.url) || '';

        if (!urlToReport || urlToReport.startsWith('chrome://') || urlToReport.startsWith('chrome-extension://') || urlToReport.startsWith('edge://') || urlToReport.startsWith('moz-extension://')) {
            chrome.notifications.create({
                type: 'basic',
                iconUrl: 'images/icon48.png',
                title: 'Cannot Report',
                message: 'System pages cannot be reported.',
                priority: 1
            });
            return;
        }

        // Get user info and send report
        chrome.storage.local.get(['currentUser'], (data) => {
            const user = data.currentUser || {};
            const reporterDisplay = (user.name || 'Anonymous') + (user.email ? ` (${user.email})` : '');

            let hostname;
            try {
                hostname = new URL(urlToReport).hostname;
            } catch (e) {
                hostname = urlToReport;
            }

            const reportPayload = {
                id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
                url: urlToReport,
                hostname: hostname,
                reporter: reporterDisplay,
                timestamp: Date.now(),
                status: 'pending'
            };

            // Send to Backend
            fetch('https://phishingshield.onrender.com/api/reports', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(reportPayload)
            })
                .then(res => res.json())
                .then(data => {
                    console.log("[PhishingShield] Report sent successfully:", data);
                    chrome.notifications.create({
                        type: 'basic',
                        iconUrl: 'images/icon48.png',
                        title: '✅ Report Submitted',
                        message: `Thank you for reporting ${hostname}. Our team will review it.`,
                        priority: 1
                    });
                })
                .catch(err => {
                    console.error("[PhishingShield] Report failed:", err);
                    chrome.notifications.create({
                        type: 'basic',
                        iconUrl: 'images/icon48.png',
                        title: '⚠️ Report Failed',
                        message: 'Could not submit report. Please try again later.',
                        priority: 1
                    });
                });

            // Save locally as backup
            chrome.storage.local.get(['reportedSites'], (res) => {
                const reports = res.reportedSites || [];
                reports.push(reportPayload);
                chrome.storage.local.set({ reportedSites: reports });
            });
        });
    }
});

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
            if (logs.length > 20) logs.shift();
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
                id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
                url: request.url,
                hostname: request.hostname,
                reporter: reporterDisplay,
                timestamp: Date.now(),
                status: 'pending'
            };

            // Send to Backend
            fetch('https://phishingshield.onrender.com/api/reports', {
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
                logs.push(reportPayload);
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
                        }).catch(() => { });
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
                fetch('https://phishingshield.onrender.com/api/users/sync', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(users[userIndex])
                }).catch(() => { });
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

// Create context menu - this is critical for MV3
// Try to create immediately (for cases where extension was already installed)
// Wrap in try-catch to prevent service worker from crashing
try {
    createContextMenu();
} catch (e) {
    console.error("[PhishingShield] Error creating context menu on startup:", e);
}

// Create context menu on install/update - this is the primary way in MV3
chrome.runtime.onInstalled.addListener((details) => {
    console.log("[PhishingShield] Extension installed/updated:", details.reason);
    createContextMenu(); // Create context menu on install/update
});

// Also create on browser startup
chrome.runtime.onStartup.addListener(() => {
    console.log("[PhishingShield] Browser startup");
    createContextMenu(); // Recreate context menu on browser startup
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
self.testServiceWorker = function () {
    console.log("[PhishingShield] ✅ Service Worker is ACTIVE!");
    chrome.storage.local.get(['userXP', 'userLevel'], (r) => {
        console.log("[PhishingShield] Current XP:", r.userXP, "Level:", r.userLevel);
    });
    return true;
};

/**
 * COMMUNITY BLOCKLIST
 * Converts 'banned' reports into active blocking rules.
 * Syncs with server to get global banned sites.
 */
function updateBlocklistFromStorage() {
    // First get local banned sites and blacklist
    chrome.storage.local.get(['reportedSites', 'blacklist'], (result) => {
        const reports = result.reportedSites || [];
        const blacklist = result.blacklist || [];
        let banned = reports.filter(r => r.status === 'banned');

        // Also add any URLs from blacklist array that aren't in reports
        blacklist.forEach(url => {
            if (!banned.find(r => r.url === url)) {
                try {
                    const hostname = new URL(url).hostname;
                    banned.push({
                        url: url,
                        hostname: hostname,
                        status: 'banned'
                    });
                } catch (e) {
                    // If URL parsing fails, use as-is
                    banned.push({
                        url: url,
                        hostname: url,
                        status: 'banned'
                    });
                }
            }
        });

        // Also fetch banned sites from server for global protection
        fetch('https://phishingshield.onrender.com/api/reports')
            .then(res => res.json())
            .then(serverReports => {
                const serverBanned = serverReports.filter(r => r.status === 'banned');

                // Merge local and server banned sites (deduplicate by URL)
                const bannedMap = new Map();
                banned.forEach(r => bannedMap.set(r.url, r));
                serverBanned.forEach(r => {
                    if (!bannedMap.has(r.url)) {
                        bannedMap.set(r.url, r);
                    }
                });
                banned = Array.from(bannedMap.values());

                // Convert to Rules
                const newRules = banned.map((r, index) => {
                    let hostname;
                    try {
                        hostname = r.hostname || new URL(r.url).hostname;
                    } catch (e) {
                        hostname = r.url;
                    }

                    return {
                        "id": 2000 + index, // IDs 2000+ for Community Blocklist
                        "priority": 1,
                        "action": {
                            "type": "redirect",
                            "redirect": { "extensionPath": "/banned.html?url=" + encodeURIComponent(r.url) }
                        },
                        "condition": {
                            "urlFilter": "||" + hostname,
                            "resourceTypes": ["main_frame"]
                        }
                    };
                }).filter(rule => rule && rule.condition.urlFilter !== "||undefined"); // Filter invalid rules

                // Clear old 2000+ rules and add new ones
                chrome.declarativeNetRequest.getDynamicRules((currentRules) => {
                    const removeIds = currentRules.filter(r => r.id >= 2000).map(r => r.id);
                    chrome.declarativeNetRequest.updateDynamicRules({
                        removeRuleIds: removeIds,
                        addRules: newRules
                    }, () => {
                        console.log(`[PhishingShield] Blocklist Updated: ${newRules.length} sites blocked globally.`);
                    });
                });
            })
            .catch(err => {
                console.warn("[PhishingShield] Failed to fetch server blocklist, using local only:", err);
                // Fallback to local only
                const newRules = banned.map((r, index) => {
                    let hostname;
                    try {
                        hostname = r.hostname || new URL(r.url).hostname;
                    } catch (e) {
                        hostname = r.url;
                    }

                    return {
                        "id": 2000 + index,
                        "priority": 1,
                        "action": {
                            "type": "redirect",
                            "redirect": { "extensionPath": "/banned.html?url=" + encodeURIComponent(r.url) }
                        },
                        "condition": {
                            "urlFilter": "||" + hostname,
                            "resourceTypes": ["main_frame"]
                        }
                    };
                }).filter(rule => rule && rule.condition.urlFilter !== "||undefined");

                chrome.declarativeNetRequest.getDynamicRules((currentRules) => {
                    const removeIds = currentRules.filter(r => r.id >= 2000).map(r => r.id);
                    chrome.declarativeNetRequest.updateDynamicRules({
                        removeRuleIds: removeIds,
                        addRules: newRules
                    }, () => {
                        console.log(`[PhishingShield] Blocklist Updated (local only): ${newRules.length} sites blocked.`);
                    });
                });
            });
    });
}

// Update on Startup
chrome.runtime.onStartup.addListener(updateBlocklistFromStorage);
chrome.runtime.onInstalled.addListener(updateBlocklistFromStorage);

// UPDATE_BLOCKLIST is handled in the main message listener above

// -----------------------------------------------------------------------------
// XP SYNC (Global Leaderboard)
// -----------------------------------------------------------------------------

// Sync XP every 1 minute
chrome.alarms.create("syncXP", { periodInMinutes: 1 });

chrome.alarms.onAlarm.addListener((alarm) => {
    if (alarm.name === "syncXP") {
        syncXPToServer();
    }
});

function syncXPToServer() {
    chrome.storage.local.get(['currentUser', 'userXP', 'userLevel', 'pendingXPSync'], (res) => {
        // Only sync if there is a pending update and we have a logged-in user
        if (res.pendingXPSync && res.currentUser) {
            console.log("[PhishingShield] Syncing XP to Global Leaderboard...");

            const userData = {
                ...res.currentUser,
                xp: res.userXP,
                level: res.userLevel
            };

            fetch("https://phishingshield.onrender.com/api/users/sync", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(userData)
            })
                .then(r => r.json())
                .then(data => {
                    if (data.success) {
                        console.log("[PhishingShield] ✅ XP Global Sync Successful");
                        chrome.storage.local.set({ pendingXPSync: false });
                    }
                })
                .catch(e => console.error("[PhishingShield] ❌ XP Sync Failed:", e));
        }
    });
}
