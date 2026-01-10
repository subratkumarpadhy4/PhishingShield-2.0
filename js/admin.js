// REPORTS FILTER STATE
let allReportsCache = [];
let currentReportFilter = 'all';

document.addEventListener('DOMContentLoaded', () => {
    // 0. SECURITY HANDSHAKE
    checkAdminAccess();



    // 1. Sidebar Navigation Logic
    const navLinks = document.querySelectorAll('.nav-link');
    const tabs = document.querySelectorAll('.tab-content');
    const pageTitle = document.getElementById('page-title');

    navLinks.forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();

            // Remove active classes
            navLinks.forEach(l => l.classList.remove('active'));
            tabs.forEach(t => t.classList.remove('active'));

            // Activate content
            link.classList.add('active');
            const tabId = link.getAttribute('data-tab');
            document.getElementById(tabId).classList.add('active');

            // Update Title
            pageTitle.textContent = link.textContent.replace(/^.\s/, ''); // Remove emoji

            // Special Tab Logic
            if (tabId === 'banned-sites') {
                loadBannedSites();
            }
        });
    });

    // Handle "View All" button
    document.getElementById('view-all-users').addEventListener('click', () => {
        document.querySelector('[data-tab="users"]').click();
    });

    // 2. Set Date
    const now = new Date();
    document.getElementById('current-date').textContent = now.toLocaleDateString('en-US', {
        weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
    });

    // 3. Load Data from Storage
    loadDashboardData();

    // 4. Debug / Simulation Tools
    setupDebugTools();

    // 5. Setup Modal Handlers (Replaces inline onclicks)
    setupModalHandlers();

    // 6. Setup Report Filter Handlers (Safely attached)
    setupReportFilters();

    // 7. Keep-Alive Service (Robust)
    connectKeepAlive();
});

let keepAlivePort;
function connectKeepAlive() {
    if (!chrome.runtime || !chrome.runtime.connect) return;
    try {
        keepAlivePort = chrome.runtime.connect({ name: 'keepAlive' });
        keepAlivePort.onDisconnect.addListener(() => {
            // Reconnect logic
            setTimeout(connectKeepAlive, 5000);
        });
    } catch (e) {
        console.warn('Keep-Alive failed', e);
    }
}

function setupReportFilters() {
    // 1. Filter Tabs
    const filters = ['all', 'pending', 'banned', 'ignored'];
    filters.forEach(status => {
        const btn = document.getElementById(`filter-${status}`);
        if (btn) {
            // Remove any existing inline onclick to be safe (though JS override usually wins)
            btn.onclick = null;
            btn.addEventListener('click', (e) => {
                e.preventDefault();
                setReportFilter(status);
            });
        }
    });

    // 2. Refresh Button (Reports)
    const refreshReportsBtn = document.getElementById('btn-refresh-reports');
    if (refreshReportsBtn) {
        refreshReportsBtn.onclick = null;
        refreshReportsBtn.addEventListener('click', (e) => {
            e.preventDefault();
            loadDashboardData();
        });
    }

    // 3. Refresh Button (Banned Sites)
    const refreshBannedBtn = document.getElementById('btn-refresh-banned');
    if (refreshBannedBtn) {
        refreshBannedBtn.onclick = null;
        refreshBannedBtn.addEventListener('click', (e) => {
            e.preventDefault();
            // Assuming loadBannedSites() is global or available
            if (typeof loadBannedSites === 'function') {
                loadBannedSites();
            } else {
                console.warn('[Admin] loadBannedSites is not defined');
            }
        });
    }
}

function setupModalHandlers() {
    // User Modal
    const userModal = document.getElementById('user-modal');
    const userCloseX = document.getElementById('modal-close-x');
    const userCloseBtn = document.getElementById('modal-close-btn');

    if (userCloseX) {
        userCloseX.addEventListener('click', () => {
            if (userModal) userModal.classList.add('hidden');
        });
    }

    if (userCloseBtn) {
        userCloseBtn.addEventListener('click', () => {
            if (userModal) userModal.classList.add('hidden');
        });
    }

    // Report Detail Modal
    const reportModal = document.getElementById('report-modal');
    const reportCloseX = document.getElementById('report-modal-close-x');

    if (reportCloseX) {
        reportCloseX.addEventListener('click', () => {
            if (reportModal) reportModal.classList.add('hidden');
        });
    }
}

function setupDebugTools() {
    // Check Environment
    if (!chrome.runtime || !chrome.runtime.id) {
        const header = document.querySelector('header');
        const alert = document.createElement('div');
        alert.style.cssText = "background:#dc3545; color:white; padding:15px; margin-bottom:20px; border-radius:8px; font-weight:bold; display:flex; align-items:center; gap:10px;";
        alert.innerHTML = "<span>⚠️ RUNNING IN FILE MODE. STORAGE IS DISCONNECTED. PLEASE OPEN VIA EXTENSION POPUP.</span>";
        header.prepend(alert);
    }

    // Add Debug Button
    const container = document.querySelector('#settings .table-container');
    if (container) {
        // Divider
        container.appendChild(document.createElement('hr'));

        // "Memory" Restore Button (No downloads)
        const btnRestore = document.createElement('button');
        btnRestore.className = "btn btn-outline";
        btnRestore.textContent = "🔄 Restore Data to Server";
        btnRestore.title = "Restores missing reports from this browser's memory to the server.";
        btnRestore.onclick = restoreFromMemory;
        container.appendChild(btnRestore);

        // Debug Button
        const btnDebug = document.createElement('button');
        btnDebug.className = "btn btn-outline";
        btnDebug.textContent = "🛠️ Inject Fake Data (Debug)";
        btnDebug.style.marginTop = "10px";
        btnDebug.style.display = "block"; // New line
        btnDebug.onclick = injectFakeData;
        container.appendChild(btnDebug);
    }

}

function restoreFromMemory() {
    chrome.storage.local.get(['cachedGlobalReports'], (data) => {
        const cached = data.cachedGlobalReports || [];

        if (cached.length === 0) {
            alert("No saved data found in this browser's memory.");
            return;
        }

        // 1. Fetch Current Server State first to differentiate between "Full Wipe" and "Partial Missing"
        const statusDiv = document.createElement('div');
        statusDiv.style.cssText = "position:fixed; top:20px; right:20px; background:#0d6efd; color:white; padding:15px; border-radius:5px; z-index:10000; font-weight:bold;";
        statusDiv.innerText = "🔍 Checking Server State...";
        document.body.appendChild(statusDiv);

        fetch('https://phishingshield.onrender.com/api/reports')
            .then(res => res.json())
            .then(serverReports => {
                // map existing IDs for fast lookup
                const serverIds = new Set(serverReports.map(r => r.id));

                // 2. Identify Missing Reports
                const missingReports = cached.filter(r => !serverIds.has(r.id));

                if (missingReports.length === 0) {
                    statusDiv.style.background = "#198754";
                    statusDiv.innerText = "✅ Server is already up-to-date.";
                    setTimeout(() => statusDiv.remove(), 2500);
                    return;
                }

                // 3. User Confirmation based on scenario
                statusDiv.remove(); // Remove checking status
                let message = "";
                if (serverReports.length === 0) {
                    message = `🚨 SERVER WIPE DETECTED!\n\nThe server is empty, but your browser remembers ${missingReports.length} reports.\n\nRestore all data?`;
                } else {
                    message = `⚠️ Sync Gap Detected\n\nFound ${missingReports.length} reports in your memory that are missing from the server.\n\nRestore them now?`;
                }

                if (!confirm(message)) return;

                // 4. Restore Logic
                statusDiv.innerText = "⏳ Syncing...";
                document.body.appendChild(statusDiv);
                statusDiv.style.background = "#0d6efd";

                let count = 0;
                let errors = 0;

                const uploadNext = (index) => {
                    if (index >= missingReports.length) {
                        statusDiv.style.background = "#198754";
                        statusDiv.innerText = `✅ Restoration Complete! (${count} sent)`;
                        setTimeout(() => statusDiv.remove(), 2500);
                        loadDashboardData();
                        return;
                    }

                    const report = missingReports[index];
                    fetch('https://phishingshield.onrender.com/api/reports', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify(report)
                    })
                        .then(res => {
                            if (res.ok) count++;
                            else errors++;
                        })
                        .catch(() => errors++)
                        .finally(() => {
                            statusDiv.innerText = `⏳ Restoring ${count}/${missingReports.length}...`;
                            uploadNext(index + 1);
                        });
                };

                uploadNext(0);
            })
            .catch(err => {
                statusDiv.style.background = "#dc3545";
                statusDiv.innerText = "❌ Connection Failed. Data saved in memory.";
                console.error(err);
                setTimeout(() => statusDiv.remove(), 3000);
            });
    });
}

function injectFakeData() {
    const fakeLogs = [
        { timestamp: Date.now(), url: "http://malicious-test.com", hostname: "malicious-test.com", score: 85, reasons: ["High Risk Geo", "Unusual Script"], reporter: "test@user.com" },
        { timestamp: Date.now() - 50000, url: "http://google.com", hostname: "google.com", score: 5, reasons: ["Safe"], reporter: "me@gmail.com" }
    ];

    // Save to storage (Polyfill aware)
    if (chrome.storage && chrome.storage.local) {
        chrome.storage.local.set({ visitLog: fakeLogs }, () => {
            alert('Fake Data Injected. Reloading...');
            loadDashboardData();
        });
    } else {
        localStorage.setItem('visitLog', JSON.stringify(fakeLogs));
        alert('Fake Data Injected into LocalStorage. Reloading...');
        loadDashboardData();
    }
}


async function checkAdminAccess() {
    const lockScreen = document.getElementById('lock-screen');
    const lockStatus = document.getElementById('lock-status');
    const API_BASE = "https://phishingshield.onrender.com/api";

    if (!lockScreen) return;

    // Check for admin token in storage
    chrome.storage.local.get(['adminToken', 'adminTokenExpiry'], async (res) => {
        const token = res.adminToken;
        const expiry = res.adminTokenExpiry;

        // Check if token exists and hasn't expired
        if (!token || !expiry || Date.now() > expiry) {
            // No valid token - redirect to admin login
            if (lockStatus) {
                const redirectToLogin = () => {
                    const adminLoginUrl = chrome.runtime?.getURL ? chrome.runtime.getURL('admin-login.html') : 'admin-login.html';
                    window.location.href = adminLoginUrl;
                };

                lockStatus.innerHTML = `
                    <div style="color:#dc3545; font-size:48px; margin-bottom:10px;">🔒</div>
                    <h3>Admin Access Required</h3>
                    <p>Please login to access the Admin Portal.</p>
                    <p style="color:#6c757d; font-size:14px; margin-top:10px;">Redirecting to login...</p>
                    <button id="manual-redirect-btn" style="margin-top:20px; padding:12px 24px; border:none; background:#0d6efd; color:white; border-radius:6px; cursor:pointer; font-weight:600; display:none;">Go to Admin Login</button>
                `;

                // Show manual button after 2 seconds if redirect didn't work
                setTimeout(() => {
                    const manualBtn = document.getElementById('manual-redirect-btn');
                    if (manualBtn) {
                        manualBtn.style.display = 'block';
                        manualBtn.onclick = redirectToLogin;
                    }
                }, 2000);

                // Auto-redirect after 1 second
                setTimeout(redirectToLogin, 1000);
            }
            return;
        }

        // Verify token with server
        try {
            const response = await fetch(`${API_BASE}/auth/admin/verify`, {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            const data = await response.json();

            if (data.success) {
                // Authorized Admin
                console.log("[Admin Check] ACCESS GRANTED ✅");
                unlockUI();

                // Trigger Fresh Data Load
                if (typeof Auth !== 'undefined' && Auth.getUsers) {
                    // Background refresh of global data
                    Auth.getUsers(() => {
                        console.log("Admin: Global Data Refreshed");
                        loadDashboardData();
                    });
                    if (Auth.getGlobalReports) Auth.getGlobalReports(() => null);
                }
            } else {
                // Token invalid - clear and redirect
                chrome.storage.local.remove(['adminToken', 'adminTokenExpiry', 'adminUser'], () => {
                    if (lockStatus) {
                        const redirectToLogin = () => {
                            const adminLoginUrl = chrome.runtime?.getURL ? chrome.runtime.getURL('admin-login.html') : 'admin-login.html';
                            window.location.href = adminLoginUrl;
                        };

                        lockStatus.innerHTML = `
                            <div style="color:#dc3545; font-size:48px; margin-bottom:10px;">🔒</div>
                            <h3>Session Expired</h3>
                            <p>Your admin session has expired. Please login again.</p>
                            <p style="color:#6c757d; font-size:14px; margin-top:10px;">Redirecting to login...</p>
                            <button id="manual-redirect-btn-expired" style="margin-top:20px; padding:12px 24px; border:none; background:#0d6efd; color:white; border-radius:6px; cursor:pointer; font-weight:600; display:none;">Go to Admin Login</button>
                        `;

                        // Show manual button after 2 seconds if redirect didn't work
                        setTimeout(() => {
                            const manualBtn = document.getElementById('manual-redirect-btn-expired');
                            if (manualBtn) {
                                manualBtn.style.display = 'block';
                                manualBtn.onclick = redirectToLogin;
                            }
                        }, 2000);

                        // Auto-redirect after 1 second
                        setTimeout(redirectToLogin, 1000);
                    }
                });
            }
        } catch (error) {
            console.error("[Admin Check] Server verification failed:", error);
            // Network error - show error but allow access if token exists (graceful degradation)
            if (lockStatus) {
                const retryBtn = document.createElement('button');
                retryBtn.textContent = 'Retry';
                retryBtn.style.cssText = 'margin-top:20px; padding:12px 24px; border:none; background:#0d6efd; color:white; border-radius:6px; cursor:pointer; font-weight:600;';
                retryBtn.onclick = () => window.location.reload();

                const loginBtn = document.createElement('button');
                loginBtn.textContent = 'Go to Login';
                loginBtn.style.cssText = 'margin-top:10px; padding:10px 20px; border:1px solid #6c757d; background:transparent; color:#6c757d; border-radius:6px; cursor:pointer;';
                loginBtn.onclick = () => {
                    const adminLoginUrl = chrome.runtime?.getURL ? chrome.runtime.getURL('admin-login.html') : 'admin-login.html';
                    window.location.href = adminLoginUrl;
                };

                lockStatus.innerHTML = `
                    <div style="color:#ffc107; font-size:48px; margin-bottom:10px;">⚠️</div>
                    <h3>Server Connection Error</h3>
                    <p>Could not verify admin session. Please check your connection.</p>
                `;
                lockStatus.appendChild(retryBtn);
                lockStatus.appendChild(loginBtn);
            }
        }
    });
}

function unlockUI() {
    const lockScreen = document.getElementById('lock-screen');
    if (lockScreen) {
        lockScreen.style.opacity = '0';
        setTimeout(() => {
            lockScreen.style.display = 'none';
        }, 500);
    }
}

function lockUI() {
    // Default state of HTML, but ensuring it here
    const lockScreen = document.getElementById('lock-screen');
    if (lockScreen) {
        lockScreen.style.display = 'flex';
        lockScreen.style.opacity = '1';
    }
}


// 2. DASHBOARD DATA
function loadDashboardData() {
    // Helper to process data after fetching users
    const processData = (users, globalReports) => {
        const storage = (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) ? chrome.storage.local : {
            get: (keys, cb) => {
                const res = {};
                keys.forEach(k => { const item = localStorage.getItem(k); if (item) res[k] = JSON.parse(item); });
                cb(res);
            }
        };

        storage.get(['visitLog', 'currentUser', 'stats_guest_count', 'reportedSites', 'userXP', 'userLevel'], (data) => {
            const logs = data.visitLog || [];
            // Use Global if available, else local
            const reports = (globalReports && globalReports.length > 0) ? globalReports : (data.reportedSites || []);

            // DYNAMIC FIX: Sync Current User Stats from Global Variables
            // This ensures the Admin Panel sees the latest Level/XP even if the 'users' array is stale.
            const currentEmail = data.currentUser ? data.currentUser.email : null;
            if (currentEmail) {
                const userIndex = users.findIndex(u => u.email === currentEmail);
                console.log("Admin Debug: Current Email", currentEmail, "Index", userIndex, "Global XP", data.userXP);
                if (userIndex !== -1) {
                    // Force update display data from live counters
                    users[userIndex].xp = (data.userXP !== undefined) ? data.userXP : users[userIndex].xp;
                    users[userIndex].level = (data.userLevel !== undefined) ? data.userLevel : users[userIndex].level;
                    console.log("Admin Debug: Synced User Data", users[userIndex]);
                }
            }

            // --- Update Stats Cards ---
            // 1. User Stats
            const signedCount = users.length;
            const unsignedCount = data.stats_guest_count || 0; // Reading tracked guest count
            const totalUsers = signedCount + unsignedCount;

            document.getElementById('stats-total-users').textContent = totalUsers;
            document.getElementById('stats-signed').textContent = signedCount;
            document.getElementById('stats-unsigned').textContent = unsignedCount;

            // 2. Total Threats (count high risk in logs)
            const totalThreats = logs.filter(l => l.score > 20).length;
            document.getElementById('stats-threats').textContent = totalThreats;

            // 3. Active Sessions (Recently Active < 5 min)
            // Estimation based on last Critical Interaction or Join time
            const fiveMinAgo = Date.now() - (5 * 60 * 1000);
            const activeUsers = users.filter(u => (u.lastCriticalTime > fiveMinAgo) || (u.joined > fiveMinAgo)).length + (data.currentUser ? 1 : 0);

            // Stats Card 3 (Active Sessions)
            // Finding by DOM context since ID is missing on Value
            const activeCard = document.querySelectorAll('.card')[2];
            if (activeCard) activeCard.querySelector('.card-value').textContent = activeUsers > 0 ? activeUsers : 1;

            // --- Populate Users Table ---

            // --- Populate Logs Table ---
            // GOD MODE: Aggregate logs from ALL users if available
            let aggregatedLogs = [...logs]; // Start with local logs
            users.forEach(u => {
                if (u.history && Array.isArray(u.history)) {
                    // Tag them with user email for context
                    const userLogs = u.history.map(h => ({ ...h, reporter: u.email }));
                    aggregatedLogs = aggregatedLogs.concat(userLogs);
                }
            });

            // Sort by timestamp (newest first)
            aggregatedLogs.sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));

            // Pass aggregated logs to renderUsers for Risk Factor calc
            renderUsers(users, aggregatedLogs);

            renderLogs(aggregatedLogs);

            // --- Populate Reports Table ---
            // Fetch from Node.js Backend
            // Fetch from Node.js Backend 
            fetch('https://phishingshield.onrender.com/api/reports')
                .then(res => res.json())
                .then(serverReports => {
                    console.log("[Admin] Fetched Global Reports:", serverReports);

                    // --- SERVER RESTORATION LOGIC (Persistence Hack) ---
                    // If server returns EMPTY list (because it reset), but we have a Local Cache,
                    // we assume the server wiped and we RESTORE it from our cache.
                    chrome.storage.local.get(['cachedGlobalReports'], (c) => {
                        const cached = c.cachedGlobalReports || [];

                        if (serverReports.length === 0 && cached.length > 0) {
                            console.warn("⚠️ SERVER DATA LOSS DETECTED! Restoring from Admin Cache...");

                            // 1. Show Recovery UI
                            const alertBox = document.createElement('div');
                            alertBox.style.cssText = "position:fixed; top:20px; right:20px; background:#ffc107; color:black; padding:15px; z-index:9999; border-radius:8px; font-weight:bold; box-shadow:0 5px 15px rgba(0,0,0,0.2);";
                            alertBox.innerHTML = `🔄 Server Reset Detected. Restoring ${cached.length} reports...`;
                            document.body.appendChild(alertBox);

                            // 2. Restore to Server (One by one to avoid payload limits, or batch if API supported)
                            // We'll just push them back effectively.
                            let restoredCount = 0;
                            cached.forEach(report => {
                                fetch('https://phishingshield.onrender.com/api/reports', {
                                    method: 'POST',
                                    headers: { 'Content-Type': 'application/json' },
                                    body: JSON.stringify(report)
                                }).then(() => {
                                    restoredCount++;
                                    if (restoredCount === cached.length) {
                                        alertBox.style.background = "#198754";
                                        alertBox.style.color = "white";
                                        alertBox.innerHTML = `✅ Server Restored (${restoredCount} reports).`;
                                        setTimeout(() => alertBox.remove(), 3000);
                                        loadDashboardData(); // Reload to confirm
                                    }
                                });
                            });

                            // Use Cached data for NOW so UI looks instant
                            renderReports(cached);

                        } else if (serverReports.length >= cached.length) {
                            // Normal Case: Server has data. Update our Cache.
                            console.log("[Admin] Updating Local Cache with latest Server Data");
                            chrome.storage.local.set({ cachedGlobalReports: serverReports });

                            // MERGE logic for UI
                            const localReports = data.reportedSites || [];
                            const mergedReports = [...serverReports];

                            localReports.forEach(localR => {
                                const exists = mergedReports.find(serverR => serverR.id === localR.id);
                                if (!exists) mergedReports.push(localR);
                            });

                            mergedReports.sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));
                            renderReports(mergedReports);
                        } else {
                            // Edge Case: Server has SOME data but less than cache? 
                            // Usually implies partial wipe or just new reports. We trust Server + Cache merge.
                            const mergedCache = [...cached];
                            serverReports.forEach(r => {
                                if (!mergedCache.find(c => c.id === r.id)) mergedCache.push(r);
                            });
                            chrome.storage.local.set({ cachedGlobalReports: mergedCache });
                            renderReports(mergedCache);
                        }
                    });
                })
                .catch(err => {
                    console.warn("[Admin] Could not fetch global reports (Server Offline?)", err);
                    // Fallback to Cache first, then Local
                    chrome.storage.local.get(['cachedGlobalReports'], (c) => {
                        const cached = c.cachedGlobalReports || [];
                        if (cached.length > 0) {
                            console.log("[Admin] Using Offline Cache");
                            renderReports(cached);
                        } else {
                            renderReports(reports); // Fallback to local user reports
                        }
                    });
                });

            // DEBUG: Inject Test Report Button if not exists
            if (!document.getElementById('btn-add-test-report')) {
                const header = document.querySelector('#reports .section-header');
                if (header) {
                    const btn = document.createElement('button');
                    btn.id = 'btn-add-test-report';
                    btn.className = 'btn btn-outline';
                    btn.textContent = '+ Add Test Report';
                    btn.style.marginLeft = '10px';
                    btn.onclick = () => {
                        // Send Test Report to Server
                        fetch('https://phishingshield.onrender.com/api/reports', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({
                                url: 'http://test-malicious-site.com',
                                reporter: 'Admin Test',
                                hostname: 'test-malicious-site.com'
                            })
                        }).then(() => {
                            alert("Test Report Sent to Server.");
                            loadDashboardData();
                        });
                    };
                    header.appendChild(btn);
                }
            }
        });
    };

    // Trigger Load
    console.log("Fetching Data...");

    // 1. Fetch Users logic with Auto-Restore
    const fetchUsers = () => {
        return fetch('https://phishingshield.onrender.com/api/users')
            .then(res => res.json())
            .then(serverUsers => {
                console.log("[Admin] Fetched Global Users:", serverUsers.length);

                return new Promise((resolve) => {
                    chrome.storage.local.get(['cachedUsers'], (data) => {
                        const cached = data.cachedUsers || [];

                        // CACHE LOGIC:
                        if (serverUsers.length === 0 && cached.length > 0) {
                            console.warn("⚠️ SERVER USER DATA LOSS DETECTED! Restoring users from Admin Cache...");

                            // Restore UI
                            const alertBox = document.createElement('div');
                            alertBox.style.cssText = "position:fixed; top:20px; left:20px; background:#ffc107; color:black; padding:15px; z-index:9999; border-radius:8px; font-weight:bold; box-shadow:0 5px 15px rgba(0,0,0,0.2);";
                            alertBox.innerText = `🔄 Restoring ${cached.length} missing users to server...`;
                            document.body.appendChild(alertBox);

                            // Restore execution
                            let restored = 0;
                            const promises = cached.map(u => {
                                return fetch('https://phishingshield.onrender.com/api/users/sync', {
                                    method: 'POST',
                                    headers: { 'Content-Type': 'application/json' },
                                    body: JSON.stringify(u)
                                }).then(() => restored++);
                            });

                            Promise.allSettled(promises).then(() => {
                                alertBox.innerText = `✅ Restored ${restored} users.`;
                                alertBox.style.background = "#198754";
                                alertBox.style.color = "white";
                                setTimeout(() => alertBox.remove(), 3000);
                                resolve(cached); // Use cached for now
                            });

                        } else if (serverUsers.length >= cached.length) {
                            // Normal / Update: Update Cache
                            console.log("[Admin] Updating User Cache");
                            chrome.storage.local.set({ cachedUsers: serverUsers });
                            resolve(serverUsers);
                        } else {
                            // Merge
                            const missing = cached.filter(c => !serverUsers.find(s => s.email === c.email));
                            if (missing.length > 0) {
                                console.log(`[Admin] Restoring ${missing.length} missing users`);
                                missing.forEach(u => {
                                    fetch('https://phishingshield.onrender.com/api/users/sync', {
                                        method: 'POST',
                                        headers: { 'Content-Type': 'application/json' },
                                        body: JSON.stringify(u)
                                    });
                                });
                            }
                            const merged = [...serverUsers, ...missing];
                            chrome.storage.local.set({ cachedUsers: merged });
                            resolve(merged);
                        }
                    });
                });
            })
            .catch(err => {
                console.warn("[Admin] User Fetch Failed (Offline?):", err);
                return new Promise(resolve => {
                    chrome.storage.local.get(['cachedUsers'], r => resolve(r.cachedUsers || []));
                });
            });
    };

    // Execute
    fetchUsers().then(users => {
        // Continue with processData
        chrome.storage.local.get(['reports'], r => {
            // We use the existing processData flow but pass our smart user list
            processData(users || [], []);
        });
    });
}


// Filter Logic
window.setReportFilter = function (status) {
    currentReportFilter = status;

    // Update Buttons UI
    ['all', 'pending', 'banned', 'ignored'].forEach(s => {
        const btn = document.getElementById(`filter-${s}`);
        if (btn) {
            if (s === status) {
                btn.classList.add('btn-active');
                btn.classList.remove('btn-outline');
            } else {
                btn.classList.remove('btn-active');
                btn.classList.add('btn-outline');
            }
        }
    });

    // Re-render
    renderReports();
};

function renderReports(reports) {
    const tbody = document.querySelector('#reports-table tbody');
    if (!tbody) return;
    tbody.innerHTML = '';

    // Update Cache if new data provided
    if (reports) {
        allReportsCache = reports;
    }

    // Use Cache
    let dataToRender = allReportsCache || [];

    // Apply Filter
    if (currentReportFilter !== 'all') {
        dataToRender = dataToRender.filter(r => {
            const status = r.status || 'pending';
            return status === currentReportFilter;
        });
    }

    if (!dataToRender || dataToRender.length === 0) {
        tbody.innerHTML = `<tr><td colspan="5" style="text-align:center; padding: 20px; color:#6c757d;">No ${currentReportFilter !== 'all' ? currentReportFilter : ''} reports found.</td></tr>`;
        return;
    }

    // Sort by Date (newest first)
    const sorted = [...dataToRender].sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));

    sorted.forEach((r, index) => {
        const date = new Date(r.timestamp).toLocaleDateString();
        const status = r.status || 'pending';

        // Escape HTML to prevent XSS
        const escapeHtml = (text) => {
            const div = document.createElement('div');
            div.textContent = text;
            return div.innerHTML;
        };

        let statusBadge = '<span class="badge" style="background:#ffc107; color:black">PENDING</span>';
        const escapedUrl = escapeHtml(r.url);
        const escapedId = escapeHtml(r.id || '');
        const escapedHostname = escapeHtml(r.hostname || new URL(r.url).hostname || r.url);

        // Action buttons based on status
        let actionBtn = '';
        if (status === 'banned') {
            statusBadge = '<span class="badge" style="background:#dc3545; color:white">🚫 BANNED</span>';
        } else if (status === 'ignored') {
            statusBadge = '<span class="badge" style="background:#6c757d; color:white">IGNORED</span>';
        }

        // Unified Action: Always show "View Details" to open Modal
        actionBtn = `
            <button class="btn btn-outline action-open-modal" data-id="${escapedId}" style="padding:4px 8px; font-size:12px;">View Details</button>
        `;

        // Parse reporter to separate Name and Email if possible for better display
        let reporterDisplay = r.reporter || 'Anonymous';
        // If format is "Name (email)", we can bold the name
        if (reporterDisplay.includes('(')) {
            const parts = reporterDisplay.split('(');
            const name = parts[0].trim();
            const email = '(' + parts[1]; // keep the email part
            reporterDisplay = `<strong>${escapeHtml(name)}</strong> <span style="font-size:12px; color:#6c757d;">${escapeHtml(email)}</span>`;
        } else {
            reporterDisplay = escapeHtml(reporterDisplay);
        }

        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td style="font-family:monospace; color:#0d6efd;">${escapeHtml(r.url)}</td>
            <td>${reporterDisplay}</td>
            <td>${date}</td>
            <td>${statusBadge}</td>
            <td>${actionBtn}</td>
        `;
        tbody.appendChild(tr);

        // Attach event listeners to buttons (CSP-safe, no inline handlers)

        // 1. Initial "View Details" Button Handler (Pending Status)
        const initialViewBtn = tr.querySelector('.action-initial-view');
        if (initialViewBtn) {
            initialViewBtn.addEventListener('click', (e) => {
                const container = e.target.closest('.action-wrapper');
                if (container) {
                    // Inject the full set of options
                    container.innerHTML = `
                        <button class="btn action-ban-dynamic" style="background:#dc3545; padding:4px 8px; font-size:11px;" title="Block">🚫 BAN</button>
                        <button class="btn action-ignore-dynamic" style="background:#6c757d; padding:4px 8px; font-size:11px;" title="Ignore">✓ IGNORE</button>
                        <button class="btn action-details-dynamic" style="background:#0d6efd; padding:4px 8px; font-size:11px;" title="Details">🔍 DETAILS</button>
                    `;

                    // Bind newly created buttons using closure variables
                    container.querySelector('.action-ban-dynamic').addEventListener('click', () => window.banSite(r.url, r.id));
                    container.querySelector('.action-ignore-dynamic').addEventListener('click', () => window.ignoreReport(r.url, r.id));
                    container.querySelector('.action-details-dynamic').addEventListener('click', () => window.viewSiteDetails(r.url, r.id));
                }
            });
        }

        // 1. Modal trigger
        const modalBtn = tr.querySelector('.action-open-modal');
        if (modalBtn) {
            modalBtn.addEventListener('click', () => {
                const report = allReportsCache.find(x => x.id === (modalBtn.dataset.id || '')) || r;
                openReportModal(report);
            });
        }

        // 2. Standard Listeners (for Banned/Ignored status where buttons exist immediately)
        const banBtn = tr.querySelector('.action-ban');
        if (banBtn) {
            banBtn.addEventListener('click', () => {
                window.banSite(banBtn.dataset.url, banBtn.dataset.id);
            });
        }

        const unbanBtn = tr.querySelector('.action-unban');
        if (unbanBtn) {
            unbanBtn.addEventListener('click', () => {
                window.unbanSite(unbanBtn.dataset.url, unbanBtn.dataset.id);
            });
        }

        const ignoreBtn = tr.querySelector('.action-ignore');
        if (ignoreBtn) {
            ignoreBtn.addEventListener('click', () => {
                window.ignoreReport(ignoreBtn.dataset.url, ignoreBtn.dataset.id);
            });
        }

        const detailsBtn = tr.querySelector('.action-details');
        if (detailsBtn) {
            detailsBtn.addEventListener('click', () => {
                window.viewSiteDetails(detailsBtn.dataset.url, detailsBtn.dataset.id);
            });
        }
    });
}

// Global function to ban a harmful site
window.banSite = function (url, reportId) {
    console.log('[Admin] banSite called with:', { url, reportId });

    try {
        let hostname;
        try {
            hostname = new URL(url).hostname;
        } catch (e) {
            hostname = url;
            console.warn('[Admin] Could not parse URL, using as-is:', url);
        }

        if (!confirm(`🚫 BAN HARMFUL SITE\n\nThis will block access to:\n${hostname}\n\nAll users will see a warning when visiting this site.\n\nProceed?`)) {
            console.log('[Admin] User cancelled ban');
            return;
        }

        console.log('[Admin] User confirmed ban, proceeding...');

        // Update status on server first
        fetch('https://phishingshield.onrender.com/api/reports/update', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id: reportId, status: 'banned' })
        }).then(res => res.json()).catch(err => console.error('Server update failed:', err));

        chrome.storage.local.get(['reportedSites', 'blacklist'], (data) => {
            let reports = data.reportedSites || [];
            let blacklist = data.blacklist || [];

            // 1. Update Report Status in local storage
            const reportIndex = reports.findIndex(r => r.id === reportId || r.url === url);
            if (reportIndex !== -1) {
                reports[reportIndex].status = 'banned';
                reports[reportIndex].bannedAt = Date.now();
            } else {
                // If not in local, add it
                reports.push({
                    id: reportId,
                    url: url,
                    hostname: hostname,
                    status: 'banned',
                    bannedAt: Date.now(),
                    timestamp: Date.now()
                });
            }

            // 2. Add to Blacklist (both URL and hostname for better blocking)
            if (!blacklist.includes(url)) {
                blacklist.push(url);
            }
            if (hostname && !blacklist.includes(hostname)) {
                blacklist.push(hostname);
            }

            // 3. Save to storage
            chrome.storage.local.set({ reportedSites: reports, blacklist: blacklist }, () => {
                console.log('[Admin] Site banned, blacklist updated:', blacklist);

                // Notify Background Script to update rules immediately
                chrome.runtime.sendMessage({ type: "UPDATE_BLOCKLIST" }, (response) => {
                    if (chrome.runtime.lastError) {
                        console.error('[Admin] Error sending UPDATE_BLOCKLIST:', chrome.runtime.lastError);
                    }
                    alert(`✅ Site Banned Successfully!\n\n${hostname} is now blocked.\n\nAll users will see a warning page when visiting this site.`);
                    loadDashboardData(); // Refresh UI
                });
            });
        });
    } catch (error) {
        console.error('[Admin] Error in banSite:', error);
        alert('Error banning site: ' + error.message);
    }
};

// Global function to ignore a report (mark as false positive)
window.ignoreReport = async function (url, reportId) {
    if (!confirm(`Mark this report as FALSE POSITIVE?\n\n${url}\n\nThis will mark the site as safe and ignore the report.`)) return;

    try {
        // Update status on server AND WAIT for it
        const response = await fetch('https://phishingshield.onrender.com/api/reports/update', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id: reportId, status: 'ignored' })
        });
        const resData = await response.json();

        if (!response.ok || !resData.success) {
            throw new Error(resData.message || 'Server returned error');
        }

        console.log("[Admin] Server ignored report successfully.");
    } catch (err) {
        console.error('Server update failed:', err);
        alert("Warning: Could not update server. Updating locally only.");
    }

    // Now update UI
    chrome.storage.local.get(['reportedSites'], (data) => {
        let reports = data.reportedSites || [];
        const reportIndex = reports.findIndex(r => r.id === reportId || r.url === url);
        if (reportIndex !== -1) {
            reports[reportIndex].status = 'ignored';
            reports[reportIndex].ignoredAt = Date.now();
            chrome.storage.local.set({ reportedSites: reports }, () => {
                alert(`✓ Report Ignored\n\nThis site has been marked as safe.`);
                loadDashboardData();
            });
        }
    });
};

// Global function to unban a site
window.unbanSite = function (url, reportId) {
    console.log('[Admin] unbanSite called with:', { url, reportId });

    try {
        let hostname;
        try {
            hostname = new URL(url).hostname;
        } catch (e) {
            hostname = url;
            console.warn('[Admin] Could not parse URL, using as-is:', url);
        }

        if (!confirm(`Unban this site?\n\n${url}\n\nThis will allow users to visit the site again.`)) {
            console.log('[Admin] User cancelled unban');
            return;
        }

        console.log('[Admin] User confirmed unban, proceeding...');

        // Update status on server
        fetch('https://phishingshield.onrender.com/api/reports/update', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id: reportId, status: 'pending' })
        }).then(res => res.json()).catch(err => console.error('Server update failed:', err));

        chrome.storage.local.get(['reportedSites', 'blacklist'], (data) => {
            let reports = data.reportedSites || [];
            let blacklist = data.blacklist || [];

            // Update report status
            const reportIndex = reports.findIndex(r => r.id === reportId || r.url === url);
            if (reportIndex !== -1) {
                reports[reportIndex].status = 'pending';
                delete reports[reportIndex].bannedAt;
            }

            // Remove from blacklist (both URL and hostname)
            blacklist = blacklist.filter(item => item !== url && item !== hostname);

            console.log('[Admin] Site unbanned, blacklist updated:', blacklist);

            chrome.storage.local.set({ reportedSites: reports, blacklist: blacklist }, () => {
                chrome.runtime.sendMessage({ type: "UPDATE_BLOCKLIST" }, (response) => {
                    if (chrome.runtime.lastError) {
                        console.error('[Admin] Error sending UPDATE_BLOCKLIST:', chrome.runtime.lastError);
                    }
                    alert(`✅ Site Unbanned\n\nUsers can now visit this site.`);
                    loadDashboardData();
                });
            });
        });
    } catch (error) {
        console.error('[Admin] Error in unbanSite:', error);
        alert('Error unbanning site: ' + error.message);
    }
};

// Global function to view site details
window.viewSiteDetails = function (url, reportId) {
    chrome.storage.local.get(['reportedSites'], (data) => {
        const reports = data.reportedSites || [];
        const report = reports.find(r => r.id === reportId || r.url === url);

        const hostname = new URL(url).hostname;
        const details = `
🚨 SITE REPORT DETAILS

URL: ${url}
Hostname: ${hostname}
Report ID: ${reportId}
Status: ${report?.status || 'pending'}
Reported by: ${report?.reporter || 'Unknown'}
Reported at: ${report?.timestamp ? new Date(report.timestamp).toLocaleString() : 'Unknown'}
${report?.bannedAt ? `Banned at: ${new Date(report.bannedAt).toLocaleString()}` : ''}

Actions:
• Copy URL to clipboard
• Open site in new tab (to verify)
• Export report data
        `;

        const action = confirm(details + '\n\nOpen this site in a new tab to verify?');
        if (action) {
            chrome.tabs.create({ url: url, active: false });
        }
    });
};

function renderUsers(users, allLogs) {
    const recentBody = document.querySelector('#recent-users-table tbody');
    const allBody = document.querySelector('#all-users-table tbody');

    if (!recentBody || !allBody) return;

    recentBody.innerHTML = '';
    allBody.innerHTML = '';

    if (users.length === 0) {
        recentBody.innerHTML = '<tr><td colspan="5" style="text-align:center; padding: 20px;">No users registered yet.</td></tr>';
        allBody.innerHTML = '<tr><td colspan="6" style="text-align:center; padding: 20px;">No users database found.</td></tr>';
        return;
    }

    // Sort users by joined date (descending)
    // Note: older user objects might not have 'joined', so fallback
    const sortedUsers = [...users].sort((a, b) => (b.joined || 0) - (a.joined || 0));

    sortedUsers.forEach((user, index) => {
        // Prepare Data
        const name = user.name || 'Unknown';
        const email = user.email || 'N/A';
        const level = user.level || 1;
        const xp = user.xp || 0;
        const joinedDate = user.joined ? new Date(user.joined).toLocaleDateString() : 'Unknown';

        // Calc Risk & Activity
        const userLogs = allLogs ? allLogs.filter(l => l.reporter === email) : [];
        const highRisk = userLogs.filter(l => l.score > 50).length;
        let riskBadge = '<span class="badge" style="background:#198754; color:white">LOW</span>';
        if (highRisk > 5) riskBadge = '<span class="badge" style="background:#dc3545; color:white">HIGH</span>';
        else if (highRisk > 0) riskBadge = '<span class="badge" style="background:#ffc107; color:black">MEDIUM</span>';

        let lastActive = 'Never';
        if (user.lastCriticalTime) lastActive = new Date(user.lastCriticalTime).toLocaleString();
        else if (user.joined) lastActive = new Date(user.joined).toLocaleDateString();

        // --- 1. Recent Users Row (Limit 5) ---
        if (index < 5) {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>
                    <div style="display:flex; align-items:center; gap:10px;">
                        <div style="width:32px; height:32px; background:#e9ecef; border-radius:50%; display:flex; align-items:center; justify-content:center; font-weight:bold; color:#6c757d;">
                            ${name.charAt(0).toUpperCase()}
                        </div>
                        ${name}
                    </div>
                </td>
                <td>${email}</td>
                <td><span class=\"badge badge-user\">User</span></td>
                <td><span class=\"badge badge-active\">Active</span></td>
                <td>${joinedDate}</td>
            `;
            recentBody.appendChild(row);
        }

        // --- 2. All Users Row ---
        // Calculate detailed XP progress (mock max 1000 for visuals)
        const xpPercent = Math.min((xp / (level * 100)) * 100, 100);

        const allRow = document.createElement('tr');
        // REPLACED: Added Last Active and Risk Factor columns
        allRow.innerHTML = `
            <td><strong>${name}</strong></td>
            <td>${email}</td>
            <td>Lvl ${level}</td>
            <td style="font-size:12px; color:#6c757d;">${lastActive}</td>
            <td>${riskBadge}</td>
        `;

        // Create Action Cell Programmatically
        const actionCell = document.createElement('td');
        const viewBtn = document.createElement('button');
        viewBtn.className = 'btn btn-outline';
        viewBtn.style.padding = '4px 8px';
        viewBtn.style.fontSize = '12px';
        viewBtn.textContent = 'View Details';

        viewBtn.addEventListener('click', () => {
            // Populate Modal
            document.getElementById('modal-name').textContent = name;
            document.getElementById('modal-email').textContent = email;
            document.getElementById('modal-avatar').textContent = name.charAt(0).toUpperCase();
            document.getElementById('modal-rank').textContent = user.level > 5 ? 'Elite' : 'Novice';

            document.getElementById('modal-xp').textContent = user.xp || 0;
            document.getElementById('modal-level').textContent = user.level || 1;
            document.getElementById('modal-streak').textContent = user.safeStreak || 0;

            const lastIncident = user.lastCriticalTime ? new Date(user.lastCriticalTime).toLocaleDateString() : 'None';
            document.getElementById('modal-incident').textContent = lastIncident;

            // History
            const histBody = document.getElementById('modal-history-body');
            histBody.innerHTML = '';

            if (user.history && user.history.length > 0) {
                [...user.history].reverse().slice(0, 10).forEach(h => {
                    const row = document.createElement('tr');
                    const riskColor = h.score > 50 ? '#dc3545' : '#198754';
                    row.innerHTML = `
                        <td>${h.timestamp ? new Date(h.timestamp).toLocaleTimeString() : 'N/A'}</td>
                        <td style="max-width:200px; overflow:hidden; text-overflow:ellipsis;">${h.url}</td>
                        <td style="color:${riskColor}; font-weight:bold;">${h.score}%</td>
                    `;
                    histBody.appendChild(row);
                });
            } else {
                histBody.innerHTML = '<tr><td colspan="3" style="text-align:center; padding:10px; color:#adb5bd;">No synced history available.</td></tr>';
            }
            document.getElementById('user-modal').classList.remove('hidden');

            // DYNAMIC BUTTON INJECTION into Modal Footer
            const footer = document.getElementById('modal-footer');
            if (footer) {
                footer.innerHTML = ''; // Clear previous

                // 1. Edit XP Button
                const editXPBtn = document.createElement('button');
                editXPBtn.className = 'btn btn-outline';
                editXPBtn.textContent = 'Edit XP';
                editXPBtn.style.color = '#ffc107';
                editXPBtn.style.borderColor = '#ffc107';
                editXPBtn.onclick = () => {
                    const newXPStr = prompt(`Update XP for ${name}\n\nCurrent: ${user.xp}`, user.xp);
                    if (newXPStr === null) return;

                    const newXP = parseInt(newXPStr);
                    if (isNaN(newXP) || newXP < 0) {
                        alert("Invalid XP");
                        return;
                    }

                    // Sync Logic
                    const updatedUser = { ...user, xp: newXP, level: Math.floor(Math.sqrt(newXP / 100)) + 1 };

                    fetch('https://phishingshield.onrender.com/api/users/sync', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify(updatedUser)
                    })
                        .then(res => res.json())
                        .then(data => {
                            if (data.success) {
                                alert("XP Updated & Synced!");
                                // Quick UI update
                                document.getElementById('modal-xp').textContent = newXP;
                                document.getElementById('modal-level').textContent = updatedUser.level;
                                // Background refresh
                                loadDashboardData();
                            } else {
                                alert("Sync failed: " + data.message);
                            }
                        })
                        .catch(e => alert("Server Error"));
                };

                // 2. Delete Button
                const deleteUserBtn = document.createElement('button');
                deleteUserBtn.className = 'btn btn-outline';
                deleteUserBtn.textContent = 'Delete User';
                deleteUserBtn.style.color = '#dc3545';
                deleteUserBtn.style.borderColor = '#dc3545';
                deleteUserBtn.onclick = () => {
                    if (confirm(`Delete ${name}? This cannot be undone.`)) {
                        fetch('https://phishingshield.onrender.com/api/users/delete', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ email: email })
                        }).then(() => {
                            alert("User deleted.");
                            document.getElementById('user-modal').classList.add('hidden');
                            loadDashboardData();
                        }).catch(e => alert("Delete failed: " + e));
                    }
                };

                // 3. Close Button
                const closeBtn = document.createElement('button');
                closeBtn.className = 'btn btn-outline';
                closeBtn.textContent = 'Close';
                closeBtn.onclick = () => document.getElementById('user-modal').classList.add('hidden');

                // Append with proper spacing
                footer.appendChild(editXPBtn);
                footer.appendChild(deleteUserBtn);
                footer.appendChild(closeBtn);
            }
        });

        actionCell.appendChild(viewBtn);
        // Note: Edit and Delete buttons moved to Modal Footer

        allRow.appendChild(actionCell);

        allBody.appendChild(allRow);
    });
}


function loadBannedSites() {
    const tbody = document.getElementById('banned-table-body');
    if (!tbody) return;

    tbody.innerHTML = '<tr><td colspan="4" style="text-align:center;">Loading...</td></tr>';

    chrome.storage.local.get(['reports'], (res) => {
        const reports = res.reports || [];
        // Filter for banned sites
        // In a real server scenario, we would fetch from /api/banned-sites or similar
        // For now, we simulate by filtering reports with status 'banned'
        const bannedSites = reports.filter(r => r.status === 'banned');

        if (bannedSites.length === 0) {
            tbody.innerHTML = '<tr><td colspan="4" style="text-align:center; padding: 20px; color:#adb5bd;">No banned sites found.</td></tr>';
            return;
        }

        tbody.innerHTML = '';
        bannedSites.forEach(site => {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>
                    <div style="font-weight:600;">${site.url}</div>
                    <div style="font-size:12px; color:#adb5bd;">${site.hostname}</div>
                </td>
                <td>${new Date(site.timestamp).toLocaleDateString()}</td>
                <td>${site.reportedBy || 'Unknown'}</td>
                <td>
                    <button class="btn btn-outline" style="color: #28a745; border-color: #28a745; font-size: 12px; padding: 4px 8px;" onclick="unbanSite('${site.url}', '${site.id}')">
                        ✅ Unban
                    </button>
                    ${site.notes ? `<div style="font-size:10px; margin-top:5px; color:#6c757d;">Note: ${site.notes}</div>` : ''}
                </td>
            `;
            tbody.appendChild(row);
        });
    });
}



function renderLogs(logs) {
    const tbody = document.querySelector('#logs-table tbody');
    if (!tbody) return;

    tbody.innerHTML = '';

    if (logs.length === 0) {
        tbody.innerHTML = '<tr><td colspan="5" style="text-align:center; padding: 20px; color:#adb5bd;">No threats detected yet. System clean.</td></tr>';
        return;
    }

    // Show last 20 logs
    const recentLogs = [...logs].reverse().slice(0, 20);

    recentLogs.forEach(log => {
        const time = new Date(log.timestamp).toLocaleString();
        const score = log.score || 0;

        // Determine Badges
        let statusHtml = '';
        if (score > 50) statusHtml = '<span class="badge" style="background:#dc3545; color:white">CRITICAL</span>';
        else if (score > 20) statusHtml = '<span class="badge" style="background:#ffc107; color:black">WARNING</span>';
        else statusHtml = '<span class="badge" style="background:#198754; color:white">SAFE</span>';

        // Reason logic
        const reasons = (log.reasons || []).join(', ').substring(0, 50) + (log.reasons?.length > 1 ? '...' : '');

        const row = document.createElement('tr');
        const reporterDisplay = log.reporter ? `<span title="${log.reporter}" style="cursor:help; border-bottom:1px dotted #ccc;">${log.reporter.split('@')[0]}...</span>` : '<span class="badge badge-user">Local</span>';

        row.innerHTML = `
            <td>${time}</td>
            <td>${reporterDisplay}</td>
            <td style="font-family:monospace; color:#0d6efd; max-width:150px; overflow:hidden; text-overflow:ellipsis;">${log.hostname}</td>
            <td>${reasons || 'N/A'}</td>
            <td>${score}/100</td>
            <td>${statusHtml}</td>
        `;
        tbody.appendChild(row);
    });
}

function openReportModal(report) {
    const modal = document.getElementById('report-modal');
    if (!modal) return;

    // Populate Data
    document.getElementById('report-modal-url').textContent = report.url;
    document.getElementById('report-modal-reporter').textContent = report.reporter || 'Anonymous';
    document.getElementById('report-modal-date').textContent = new Date(report.timestamp).toLocaleString();

    // Status Badge
    const statusContainer = document.getElementById('report-modal-status-container');
    const status = report.status || 'pending';
    if (status === 'banned') statusContainer.innerHTML = '<span class="badge" style="background:#dc3545; color:white">🚫 BANNED</span>';
    else if (status === 'ignored') statusContainer.innerHTML = '<span class="badge" style="background:#6c757d; color:white">IGNORED</span>';
    else statusContainer.innerHTML = '<span class="badge" style="background:#ffc107; color:black">PENDING REVIEW</span>';

    // Footer Actions
    const footer = document.getElementById('report-modal-footer');
    footer.innerHTML = '';

    // Create Buttons dynamically
    // 1. BAN (if not already banned)
    if (status !== 'banned') {
        const banBtn = document.createElement('button');
        banBtn.className = 'btn';
        banBtn.style.background = '#dc3545';
        banBtn.style.color = 'white';
        banBtn.innerHTML = '🚫 Ban Site';
        banBtn.onclick = () => {
            window.banSite(report.url, report.id);
            modal.classList.add('hidden');
        };
        footer.appendChild(banBtn);
    }

    // 2. UNBAN (if banned)
    if (status === 'banned') {
        const unbanBtn = document.createElement('button');
        unbanBtn.className = 'btn';
        unbanBtn.style.background = '#198754';
        unbanBtn.style.color = 'white';
        unbanBtn.textContent = '✅ Unban Site';
        unbanBtn.onclick = () => {
            window.unbanSite(report.url, report.id);
            modal.classList.add('hidden');
        };
        footer.appendChild(unbanBtn);
    }

    // 3. IGNORE (if pending)
    if (status === 'pending') {
        const ignoreBtn = document.createElement('button');
        ignoreBtn.className = 'btn btn-outline';
        ignoreBtn.textContent = '✓ Ignore Report';
        ignoreBtn.onclick = () => {
            window.ignoreReport(report.url, report.id);
            modal.classList.add('hidden');
        };
        footer.appendChild(ignoreBtn);
    }

    // 4. Verify Link
    const verifyBtn = document.createElement('button');
    verifyBtn.className = 'btn btn-outline';
    verifyBtn.style.borderColor = '#0d6efd';
    verifyBtn.style.color = '#0d6efd';
    verifyBtn.innerHTML = '🔗 Open Link';
    verifyBtn.onclick = () => {
        chrome.tabs.create({ url: report.url, active: false });
    };
    footer.appendChild(verifyBtn);

    // 5. Close Button
    const closeBtn = document.createElement('button');
    closeBtn.className = 'btn btn-outline';
    closeBtn.style.marginLeft = '10px';
    closeBtn.textContent = 'Close';
    closeBtn.onclick = () => modal.classList.add('hidden');
    footer.appendChild(closeBtn);

    // Show
    modal.classList.remove('hidden');
}
