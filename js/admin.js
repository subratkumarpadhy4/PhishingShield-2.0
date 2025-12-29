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
});

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
        const btn = document.createElement('button');
        btn.className = "btn btn-outline";
        btn.textContent = "🛠️ Inject Fake Data (Debug)";
        btn.style.marginTop = "10px";
        btn.onclick = injectFakeData;
        container.appendChild(btn);
    }
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

function checkAdminAccess() {
    const lockScreen = document.getElementById('lock-screen');
    const lockStatus = document.getElementById('lock-status');
    const OWNER_EMAIL = 'rajkumarpadhy2006@gmail.com';

    if (!lockScreen) return;

    // Check Current User directly from Storage
    chrome.storage.local.get(['currentUser'], (res) => {
        const user = res.currentUser;
        console.log("[Admin Check] Stored User:", user ? user.email : "NULL"); // DEBUG
        console.log("[Admin Check] Expected Owner:", OWNER_EMAIL); // DEBUG

        const normalizedEmail = user ? user.email.toLowerCase().trim() : '';
        const normalizedOwner = OWNER_EMAIL.toLowerCase().trim();

        if (normalizedEmail === normalizedOwner) {
            // Authorized Owner
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
            // Unauthorized
            if (lockStatus) {
                lockStatus.innerHTML = `
                    <div style="color:#dc3545; font-size:48px; margin-bottom:10px;">🔒</div>
                    <h3>Access Denied</h3>
                    <p>Restricted Area. Project Owner Only.</p>
                    <p style="font-size:12px; margin-top:10px; color:#6c757d;">Logged in as: ${user ? user.email : 'Guest'}</p>
                    <button onclick="window.close()" style="margin-top:20px; padding:10px 20px; border:none; background:#6c757d; color:white; border-radius:4px; cursor:pointer;">Close</button>
                    <div style="margin-top:20px; font-size:10px; color:#adb5bd;">Expected: ${OWNER_EMAIL}</div>
                `;
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
            fetch('http://localhost:3000/api/reports')
                .then(res => res.json())
                .then(serverReports => {
                    console.log("[Admin] Fetched Global Reports:", serverReports);
                    renderReports(serverReports);
                })
                .catch(err => {
                    console.warn("[Admin] Could not fetch global reports (Server Offline?)", err);
                    // Fallback to local
                    renderReports(reports);
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
                        fetch('http://localhost:3000/api/reports', {
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
    // Just perform local check + server fetch logic inside processData
    // We removed Auth dependency for Reports, but keep it for Users if needed.
    if (typeof Auth !== 'undefined' && Auth.getUsers) {
        Auth.getUsers((users) => {
            processData(users || [], []);
        });
    } else {
        chrome.storage.local.get(['users'], r => processData(r.users || [], []));
    }
}

function renderReports(reports) {
    const tbody = document.querySelector('#reports-table tbody');
    if (!tbody) return;
    tbody.innerHTML = '';

    if (!reports || reports.length === 0) {
        tbody.innerHTML = '<tr><td colspan="5" style="text-align:center; padding: 20px; color:#6c757d;">No reports submitted yet.</td></tr>';
        return;
    }

    // Sort by Date (newest first)
    // We assume reports have 'timestamp' or 'date'
    const sorted = [...reports].reverse();

    sorted.forEach((r, index) => {
        const date = new Date(r.timestamp).toLocaleDateString();
        const status = r.status || 'pending';

        let statusBadge = '<span class="badge" style="background:#ffc107; color:black">PENDING</span>';
        let actionBtn = `<button class="btn" style="background:#dc3545; padding:4px 8px; font-size:12px;" onclick="banSite('${r.url}', '${r.id}')">BAN SITE</button>`;

        if (status === 'banned') {
            statusBadge = '<span class="badge" style="background:#dc3545; color:white">BANNED</span>';
            actionBtn = `<span style="color:#198754; font-size:12px; font-weight:bold;">Accounted For</span>`;
        } else if (status === 'ignored') {
            statusBadge = '<span class="badge" style="background:#6c757d; color:white">IGNORED</span>';
            actionBtn = '-';
        }

        // Parse reporter to separate Name and Email if possible for better display
        let reporterDisplay = r.reporter || 'Anonymous';
        // If format is "Name (email)", we can bold the name
        if (reporterDisplay.includes('(')) {
            const parts = reporterDisplay.split('(');
            const name = parts[0].trim();
            const email = '(' + parts[1]; // keep the email part
            reporterDisplay = `<strong>${name}</strong> <span style="font-size:12px; color:#6c757d;">${email}</span>`;
        }

        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td style="font-family:monospace; color:#0d6efd;">${r.url}</td>
            <td>${reporterDisplay}</td>
            <td>${date}</td>
            <td>${statusBadge}</td>
            <td>${actionBtn}</td>
        `;
        tbody.appendChild(tr);
    });
}

// Global function for onclick
window.banSite = function (url, reportId) {
    if (!confirm(`Are you sure you want to BLACKLIST blocking access for everyone?\n\nTarget: ${url}`)) return;

    chrome.storage.local.get(['reportedSites', 'blacklist'], (data) => {
        let reports = data.reportedSites || [];
        let blacklist = data.blacklist || [];

        // 1. Update Report Status
        const reportIndex = reports.findIndex(r => r.id === reportId || r.url === url);
        if (reportIndex !== -1) {
            reports[reportIndex].status = 'banned';
        }

        // 2. Add to Blacklist if not exists
        if (!blacklist.includes(url)) {
            blacklist.push(url);
        }

        // 3. Save
        chrome.storage.local.set({ reportedSites: reports, blacklist: blacklist }, () => {
            alert(`🚫 Domain Banned: ${url}\nUsers will now see a Critical Threat warning.`);

            // Notify Background Script to update rules immediately
            chrome.runtime.sendMessage({ type: "UPDATE_BLOCKLIST" });

            // Sync to Global DB
            if (typeof Auth !== 'undefined' && Auth.syncReports) Auth.syncReports();

            loadDashboardData(); // Refresh UI
        });
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
        });

        // Edit Button (Promote/Degrade)
        const editBtn = document.createElement('button');
        editBtn.className = 'btn btn-outline';
        editBtn.style.padding = '4px 8px';
        editBtn.style.fontSize = '12px';
        editBtn.style.marginLeft = '5px';
        editBtn.textContent = 'Edit XP';
        editBtn.style.borderColor = '#ffc107';
        editBtn.style.color = '#ffc107';

        editBtn.addEventListener('click', () => {
            const newXPStr = prompt(`Promote/Degrade ${name}\n\nCurrent XP: ${xp}\nCurrent Level: ${level}\n\nEnter New XP Value:`, xp);
            if (newXPStr !== null) {
                const newXP = parseInt(newXPStr);
                if (isNaN(newXP) || newXP < 0) {
                    alert("Invalid XP Value.");
                    return;
                }

                // Update Logic
                user.xp = newXP;
                user.level = Math.floor(Math.sqrt(newXP / 100)) + 1;

                chrome.storage.local.set({ users: users }, () => {
                    alert(`✅ Updated ${name}:\nXP: ${newXP}\nLevel: ${user.level}`);
                    loadDashboardData();

                    // Sync Global if Current
                    chrome.storage.local.get(['currentUser'], (res) => {
                        if (res.currentUser && res.currentUser.email === email) {
                            chrome.storage.local.set({ userXP: newXP, userLevel: user.level });
                        }
                    });
                });
            }
        });

        actionCell.appendChild(viewBtn);
        actionCell.appendChild(editBtn);

        // Delete Button
        const delBtn = document.createElement('button');
        delBtn.className = 'btn btn-outline';
        delBtn.style.padding = '4px 8px';
        delBtn.style.fontSize = '12px';
        delBtn.style.marginLeft = '5px';
        delBtn.textContent = '🗑️';
        delBtn.title = 'Delete User';
        delBtn.style.borderColor = '#dc3545';
        delBtn.style.color = '#dc3545';

        delBtn.addEventListener('click', () => {
            if (confirm(`⚠️ CRITICAL WARNING ⚠️\n\nAre you sure you want to PERMANENTLY DELETE user "${name}" (${email})?\n\nThis action cannot be undone.`)) {
                // Delete Logic
                const idx = users.findIndex(u => u.email === email);
                if (idx !== -1) {
                    users.splice(idx, 1);
                    chrome.storage.local.set({ users: users }, () => {
                        alert(`User ${name} deleted.`);
                        loadDashboardData();

                        // If we deleted ourselves (Admin delete self?), logout.
                        // Checking against current session is good practice
                        chrome.storage.local.get(['currentUser'], (res) => {
                            if (res.currentUser && res.currentUser.email === email) {
                                // Logout immediate
                                chrome.storage.local.remove(['currentUser', 'userXP', 'userLevel'], () => {
                                    location.reload();
                                });
                            }
                        });
                    });
                }
            }
        });

        actionCell.appendChild(delBtn);
        allRow.appendChild(actionCell);

        allBody.appendChild(allRow);
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
