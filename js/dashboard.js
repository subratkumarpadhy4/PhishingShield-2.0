document.addEventListener('DOMContentLoaded', () => {
    try {
        console.log("Dashboard: Initializing...");

        // 0. ADMIN SECURITY CHECK
        checkAdminAccess();

        // 1. NAVIGATION TABS
        const navLinks = document.querySelectorAll('.nav-item');
        const tabs = document.querySelectorAll('.tab-content');
        const pageTitle = document.getElementById('page-title');

        if (navLinks.length > 0) {
            navLinks.forEach(link => {
                link.addEventListener('click', (e) => {
                    e.preventDefault();

                    // Remove Active Class from all
                    navLinks.forEach(l => l.classList.remove('active'));
                    tabs.forEach(t => t.classList.remove('active'));

                    // Add Active to Clicked
                    link.classList.add('active');
                    const tabId = link.getAttribute('data-tab');
                    const tab = document.getElementById(tabId);
                    if (tab) tab.classList.add('active');

                    // Update Title
                    if (pageTitle) {
                        let text = link.innerText.trim();
                        // Remove emoji prefix if present (likely 2 chars + space)
                        if (text.length > 3) text = text.substring(2).trim();
                        pageTitle.textContent = text + (tabId === 'tab-overview' ? ' Overview' : '');
                    }
                    console.log("Tab Switched to:", tabId);
                });
            });
        }

        const viewAllBtn = document.getElementById('view-all-users');
        if (viewAllBtn) {
            viewAllBtn.addEventListener('click', () => {
                const usersTab = document.querySelector('[data-tab="users"]');
                if (usersTab) usersTab.click();
            });
        }

        // 2. DATE
        const dateEl = document.getElementById('current-date');
        if (dateEl) {
            dateEl.textContent = new Date().toLocaleDateString('en-US', {
                weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
            });
        }

        // 3. LOAD DATA & STATS
        // 3. LOAD DATA & STATS
        function renderDashboardUI() {
            // Force Sync with Backend on Load to get latest XP
            chrome.runtime.sendMessage({ type: "SYNC_XP" });

            if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
                chrome.storage.local.get(['visitLog', 'theme', 'users', 'suspectedExtensions', 'userXP', 'userLevel'], (result) => {
                    let log = result.visitLog;
                    if (!Array.isArray(log)) log = [];

                    const users = result.users || [];
                    const extLog = result.suspectedExtensions || [];

                    updateStats(log);
                    renderTable(log);
                    renderExtensionTable(extLog); // New Function
                    renderLeaderboard(users);

                    if (result.theme === 'dark') {
                        document.body.classList.add('dark-theme');
                        const themeBtn = document.getElementById('theme-toggle');
                        if (themeBtn) themeBtn.innerText = '☀️';
                    }
                });
            } else {
                console.warn("Chrome Storage not available.");
            }
        }

        // Initial Render (Local Data)
        renderDashboardUI();

        // Fetch Global Data (Background Sync)
        if (typeof Auth !== 'undefined' && Auth.getUsers) {
            Auth.getUsers((users) => {
                console.log("[Dashboard] Global users fetched:", users.length);

                // CRITICAL FIX: Sync "My Profile" with Global Data immediately
                chrome.storage.local.get(['currentUser'], (res) => {
                    if (res.currentUser && res.currentUser.email) {
                        const meInGlobal = users.find(u => u.email === res.currentUser.email);
                        if (meInGlobal) {
                            console.log(`[Dashboard] Found self in global list. Syncing XP: ${meInGlobal.xp}`);

                            // Update Local Storage (This triggers the UI re-render listener)
                            chrome.storage.local.set({
                                userXP: meInGlobal.xp,
                                userLevel: meInGlobal.level || 1,
                                currentUser: { ...res.currentUser, ...meInGlobal } // Merge Update
                            });
                        }
                    }
                });
            });
        }

        // Listen for storage changes to update in real-time
        if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.onChanged) {
            chrome.storage.onChanged.addListener((changes, areaName) => {
                if (areaName === 'local') {
                    // Update if visitLog, userXP, userLevel, or users changed
                    if (changes.visitLog || changes.userXP || changes.userLevel || changes.users) {
                        renderDashboardUI();
                    }
                }
            });
        }

        // 4. AUTH & PROFILE
        initDashboardAuth();
        initProfileModal();

        // 5. ADMIN PASSKEY INPUT
        // 5. ADMIN ACCESS CHECK (OWNER ONLY)
        const OWNER_EMAIL = 'rajkumarpadhy2006@gmail.com';

        // We check session, if user is Owner, we show the link
        Auth.checkSession((user) => {
            if (user && user.email.toLowerCase() === OWNER_EMAIL.toLowerCase()) {
                const al = document.getElementById('open-admin');
                const pi = document.getElementById('admin-passkey');
                if (al) {
                    al.style.display = 'inline';
                    al.innerText = '👑 Admin Panel';
                }
                if (pi) pi.style.display = 'none'; // Hide passkey input, not needed
            }
        });

        // 6. ACTION LISTENERS
        const exportBtn = document.getElementById('export-pdf');
        if (exportBtn) {
            exportBtn.addEventListener('click', () => {
                generateAndPrintReport();
            });
        }

        const themeToggle = document.getElementById('theme-toggle');
        if (themeToggle) {
            themeToggle.addEventListener('click', () => {
                const isDark = document.body.classList.toggle('dark-theme');
                themeToggle.innerText = isDark ? '☀️' : '🌙';
                chrome.storage.local.set({ theme: isDark ? 'dark' : 'light' });
            });
        }

        const clearBtn = document.getElementById('clear-history');
        if (clearBtn) {
            document.getElementById('clear-history').addEventListener('click', () => {
                if (confirm('Clear all history? This cannot be undone.')) {
                    chrome.storage.local.set({ visitLog: [], siteHistory: [] }, () => {
                        location.reload();
                    });
                }
            });
        }

        const refreshBtn = document.getElementById('refresh-log');
        if (refreshBtn) {
            refreshBtn.addEventListener('click', () => {
                refreshBtn.textContent = 'Refreshing...';
                // Reload storage data
                chrome.storage.local.get(['visitLog'], (result) => {
                    try {
                        let log = result.visitLog;
                        if (!Array.isArray(log)) {
                            console.warn("Invalid visitLog format, resetting to empty array.");
                            log = [];
                        }

                        // Update Stats & Table
                        updateStats(log);
                        renderTable(log);
                    } catch (e) {
                        console.error("Refresh failed:", e);
                    } finally {
                        setTimeout(() => {
                            refreshBtn.textContent = 'Refresh';
                        }, 500);
                    }
                });
            });
        }

    } catch (err) {
        console.error("Dashboard Critical Error:", err);
    }

    // LISTENER: My Reports Refresh
    const refreshReportsBtn = document.getElementById('refresh-my-reports');
    if (refreshReportsBtn) {
        refreshReportsBtn.addEventListener('click', () => {
            refreshReportsBtn.textContent = 'Refreshing...';
            loadUserReports();
            setTimeout(() => refreshReportsBtn.textContent = '🔄 Refresh Status', 1000);
        });
    }

    // LISTENER: Tab Click (Specific for Reports to auto-load)
    const reportsTabLink = document.querySelector('[data-tab="tab-reports"]');
    if (reportsTabLink) {
        reportsTabLink.addEventListener('click', () => {
            loadUserReports();
        });
    }

    // Initial Load if starting on reports tab (unlikely but good practice)
    if (document.querySelector('#tab-reports.active')) {
        loadUserReports();
    }
});

// --- HELPER FUNCTIONS ---

function loadUserReports() {
    chrome.storage.local.get(['currentUser'], (data) => {
        const user = data.currentUser;
        if (!user || !user.email) {
            const tbody = document.getElementById('user-reports-body');
            if (tbody) tbody.innerHTML = '<tr><td colspan="4" style="text-align:center; padding:20px;">Please log in (Guest Mode doesn\'t save reports).</td></tr>';
            return;
        }

        // Fetch reports for this user
        fetch(`http://localhost:3000/api/reports?reporter=${encodeURIComponent(user.email)}`)
            .then(res => res.json())
            .then(reports => {
                renderUserReportsTable(reports);
            })
            .catch(err => {
                console.error("Failed to fetch reports:", err);
                const tbody = document.getElementById('user-reports-body');
                if (tbody) tbody.innerHTML = '<tr><td colspan="4" style="text-align:center; color: #ef4444; padding:20px;">Failed to load reports. Server may be offline.</td></tr>';
            });
    });
}

function renderUserReportsTable(reports) {
    const tbody = document.getElementById('user-reports-body');
    if (!tbody) return;
    tbody.innerHTML = '';

    if (!reports || reports.length === 0) {
        tbody.innerHTML = '<tr><td colspan="4" style="text-align:center; padding:20px; color: #64748b;">You haven\'t reported any sites yet.</td></tr>';
        return;
    }

    // Sort newest first
    reports.sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));

    reports.forEach(r => {
        const tr = document.createElement('tr');

        let statusBadge = '<span class="badge" style="background:#ffc107; color:#000; padding:4px 8px; border-radius:4px; font-size:11px; font-weight:bold;">PENDING</span>';
        if (r.status === 'banned') statusBadge = '<span class="badge" style="background:#dc3545; color:#fff; padding:4px 8px; border-radius:4px; font-size:11px; font-weight:bold;">🚫 BANNED</span>';
        else if (r.status === 'ignored') statusBadge = '<span class="badge" style="background:#6c757d; color:#fff; padding:4px 8px; border-radius:4px; font-size:11px; font-weight:bold;">IGNORED</span>';

        let analysisHtml = '<span style="color:#adb5bd; font-size:12px;">No feedback yet.</span>';

        if (r.aiAnalysis) {
            const score = r.aiAnalysis.score || 0;
            const suggestion = r.aiAnalysis.suggestion || 'N/A';
            // Escape backticks in reason to prevents JS errors in onclick
            const reason = (r.aiAnalysis.reason || '').replace(/`/g, "'");

            let color = '#64748b';
            if (suggestion === 'BAN') color = '#dc3545';
            else if (suggestion === 'CAUTION') color = '#d97706';
            else if (suggestion === 'SAFE') color = '#166534';

            // Truncate long reasons
            const shortReason = reason.length > 80 ? reason.substring(0, 80) + '...' : reason;

            analysisHtml = `
                <div style="font-size:12px;">
                    <div style="margin-bottom:4px;"><strong>Verfication:</strong> <span style="color:${color}; font-weight:bold;">${suggestion}</span> (${score}/100)</div>
                    <div style="color:#475569; font-style:italic; line-height:1.4;">"${shortReason}"</div>
                    ${reason.length > 80 ? `<div style="color:${color}; cursor:pointer; font-size:11px; margin-top:2px; text-decoration:underline;" onclick="alert(\`${reason.replace(/"/g, '&quot;')}\`)">View Full Analysis</div>` : ''}
                </div>
             `;
        }

        tr.innerHTML = `
            <td>${new Date(r.timestamp).toLocaleDateString()}</td>
            <td style="max-width:200px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;" title="${r.url}">
                <a href="${r.url}" target="_blank" style="color:#2563eb; text-decoration:none;">${r.hostname || r.url}</a>
            </td>
            <td>${statusBadge}</td>
            <td>${analysisHtml}</td>
        `;
        tbody.appendChild(tr);
    });
}

function initDashboardAuth() {
    if (typeof Auth === 'undefined') {
        setTimeout(initDashboardAuth, 100);
        return;
    }

    const ui = document.getElementById('user-info');
    const un = document.getElementById('user-name');
    const guestNav = document.getElementById('guest-nav');

    Auth.checkSession((user) => {
        if (user) {
            // Logged In
            if (ui) ui.style.display = 'flex';
            if (un) un.textContent = user.name;
            if (guestNav) guestNav.style.display = 'none';
        } else {
            // Guest / Logged Out
            if (ui) ui.style.display = 'none';
            if (guestNav) guestNav.style.display = 'flex';
        }
    });

    const logoutLink = document.getElementById('logout-link');
    if (logoutLink) {
        logoutLink.addEventListener('click', (e) => {
            e.preventDefault();
            if (confirm("Logout?")) {
                Auth.logout(() => { window.location.reload(); });
            }
        });
    }
}

function initProfileModal() {
    const editLink = document.getElementById('edit-profile-link');
    const avatar = document.getElementById('user-avatar');
    const modal = document.getElementById('profile-modal');
    const cancelBtn = document.getElementById('cancel-profile');
    const saveBtn = document.getElementById('save-profile');
    const nameInput = document.getElementById('edit-name');
    const passInput = document.getElementById('edit-password');

    if (!modal) return;

    function openModal() {
        Auth.checkSession((user) => {
            if (user) {
                if (nameInput) nameInput.value = user.name || '';
                if (passInput) passInput.value = '';

                modal.style.display = 'flex';
                // Trigger animation
                requestAnimationFrame(() => {
                    modal.classList.add('active');
                });
            }
        });
    }
    const closeModal = () => {
        modal.classList.remove('active');
        setTimeout(() => {
            modal.style.display = 'none';
        }, 300);
    };

    if (editLink) editLink.addEventListener('click', (e) => { e.preventDefault(); openModal(); });
    if (avatar) {
        avatar.style.cursor = 'pointer';
        avatar.addEventListener('click', openModal);
    }
    if (cancelBtn) cancelBtn.addEventListener('click', closeModal);

    if (saveBtn) {
        saveBtn.addEventListener('click', () => {
            const newName = nameInput.value.trim();
            const newPass = passInput.value;
            if (!newName) { alert("Name required"); return; }

            saveBtn.textContent = 'Saving...';
            saveBtn.disabled = true;

            Auth.checkSession((currentUser) => {
                if (currentUser) {
                    const data = { name: newName };
                    if (newPass) data.password = newPass;

                    Auth.updateProfile(currentUser.email, data, (res) => {
                        saveBtn.textContent = 'Save Changes';
                        saveBtn.disabled = false;
                        if (res.success) {
                            alert("Profile Updated");
                            closeModal();
                            const un = document.getElementById('user-name');
                            if (un) un.textContent = newName;
                        } else {
                            alert(res.message);
                        }
                    });
                }
            });
        });
    }

    const deleteBtn = document.getElementById('delete-profile');
    if (deleteBtn) {
        deleteBtn.addEventListener('click', () => {
            if (confirm("⚠️ WARNING: Are you sure you want to PERMANENTLY delete your account? This cannot be undone.")) {
                Auth.checkSession((user) => {
                    if (user) {
                        Auth.deleteAccount(user.email, () => {
                            alert("Account deleted.");
                            window.location.reload();
                        });
                    }
                });
            }
        });
    }

    const logoutBtn = document.getElementById('logout-btn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', () => {
            if (confirm("Are you sure you want to logout?")) {
                Auth.logout(() => { window.location.reload(); });
            }
        });
    }
}

function checkAdminAccess() {
    // Check if we are in admin mode (optional for dashboard, but kept for consistency if copied)
    const lockScreen = document.getElementById('lock-screen');
    if (!lockScreen) return; // Dashboard doesn't have lockscreen usually, so strict return.

    // ... Copy logic if needed, but for Dashboard this is mostly checking Handoff ...
    // Dashboard GENERATES handoff. Admin CONSUMES it.
    // So actually Dashboard doesn't need to check access to itself.
    // Dashboard is public (user facing).
}

function updateStats(log) {
    const total = log.length;

    // Safety Elements
    const elTotal = document.getElementById('total-scanned');
    const elSafe = document.getElementById('total-safe');
    const elThreats = document.getElementById('total-threats');
    const elSummary = document.getElementById('report-summary');
    const elTime = document.getElementById('time-spent');

    // --- WEEKLY FILTER LOGIC (User Request: Reset every Monday 00:00) ---
    const now = new Date();
    const day = now.getDay(); // 0(Sun) ... 6(Sat)
    // Calculate days to subtract to get to last Monday
    // Mon(1) -> 0. Tue(2) -> 1. ... Sun(0) -> 6.
    const diffToMon = day === 0 ? 6 : day - 1;

    const startOfWeek = new Date(now);
    startOfWeek.setDate(now.getDate() - diffToMon);
    startOfWeek.setHours(0, 0, 0, 0);
    const startOfWeekMs = startOfWeek.getTime();

    // Filter log for Weekly Chart Data
    const weeklyLog = log.filter(e => (e.timestamp || 0) >= startOfWeekMs);

    let highRisk = 0;
    let medRisk = 0;
    let safe = 0;

    // Calculate Chart Stats based on WEEKLY data
    weeklyLog.forEach(e => {
        if (e.score >= 50) {
            highRisk++;
        } else if (e.score >= 20) {
            medRisk++;
        } else {
            safe++;
        }
    });

    // Calculate Lifetime Stats for Overview Cards (Optional: keep lifetime or switch all?)
    // User specifically asked for "Pie Graph" to be weekly.
    // For consistency, let's keep the Text Stats as Lifetime (Total Scanned) 
    // but the Pie Chart as Weekly Monitoring.

    // Recalculate lifetime threats for the specific text counter? 
    // Actually, elThreats usually pairs with the chart. 
    // Let's make the "Threats Blocked" card satisfy the "Weekly" context too?
    // The user screenshot shows "Threats Blocked: 1" and Chart "1 Threats". They usually match.
    // I will use WEEKLY stats for the "Threats Blocked" card to match the chart.

    // However, "Total Scanned" (elTotal) usually implies lifetime usage. 
    // I will use `log.length` for Total Scanned, but `weeklyLog` for Threats/Safe breakdown in chart.

    // Update Text Elements
    if (elTotal) elTotal.innerText = total; // Lifetime

    // For Safe/Threats detail cards, let's use Weekly to match chart, or Lifetime?
    // If chart resets to 0, and "Threats Blocked" says 500, it looks broken.
    // I will set THREATS BLOCKED (elThreats) to match the CHART (Weekly).
    if (elThreats) elThreats.innerText = highRisk + medRisk;

    // Safe Streak/Total Safe? "Total Safe" implies lifetime. 
    // Let's filter lifetime Safe count for that specific card if needed, 
    // but typically `safe` var is reused. 
    // Let's calculate lifetime safe for the card:
    const lifetimeSafe = log.filter(e => e.score < 20).length;
    if (elSafe) elSafe.innerText = lifetimeSafe;

    if (elTime) elTime.innerText = Math.round(lifetimeSafe * 0.5) + ' min';

    const safePercentage = total > 0 ? Math.round((lifetimeSafe / total) * 100) : 100;
    if (elSummary) elSummary.innerText = `Safety: ${safePercentage}%`;

    // Format Date Range for Label
    const endOfWeek = new Date(startOfWeek);
    endOfWeek.setDate(startOfWeek.getDate() + 6);

    // Format: "Jan 12 - Jan 18"
    const options = { month: 'short', day: 'numeric' };
    const dateRange = `${startOfWeek.toLocaleDateString('en-US', options)} - ${endOfWeek.toLocaleDateString('en-US', options)}`;

    // Update the Date Range Display Below Chart
    const rangeEl = document.getElementById('chart-date-range');
    if (rangeEl) rangeEl.innerText = dateRange;

    // --- RENDER CHARTS ---
    if (typeof SimpleCharts !== 'undefined') {
        // Doughnut: High, Suspicious, Safe (WEEKLY DATA)
        SimpleCharts.doughnut(
            'threat-pie-canvas',
            [highRisk, medRisk, safe],
            ['#dc3545', '#ffc107', '#0d6efd'],
            ['Phishing', 'Suspicious', 'Safe'],
            highRisk + medRisk, // Center Value
            "Weekly"           // Center Label (General Context, specific dates are below)
        );

        // Line: Last 10 Visit Scores (Recent Activity)
        // Get last 10, reverse to show chronological left-to-right
        const recentScores = [...log]
            .sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0)) // Newest first
            .slice(0, 10)
            .reverse() // Chronological
            .map(e => e.score || 0);

        if (recentScores.length > 0) {
            SimpleCharts.line('activity-line-canvas', recentScores, '#0d6efd');
        }
    }

    // Gamification
    chrome.storage.local.get(['userXP', 'userLevel'], (g) => {
        const xp = g.userXP || 0;
        const level = g.userLevel || 1;

        const elRank = document.getElementById('user-rank');
        const elLevel = document.getElementById('user-level');
        const elXP = document.getElementById('current-xp');
        const bar = document.getElementById('xp-bar');
        const elNext = document.getElementById('next-level-xp');

        if (elLevel) elLevel.innerText = level;
        if (elXP) elXP.innerText = xp;
        if (elRank) elRank.innerText = (level >= 20 ? 'Sentinel' : (level >= 5 ? 'Scout' : 'Novice'));

        // Bar
        const prev = Math.pow(level - 1, 2) * 100;
        const next = Math.pow(level, 2) * 100;

        if (elNext) elNext.innerText = next; // Update the label

        // Update Badge Image
        const elBadge = document.getElementById('rank-badge');
        if (elBadge) {
            if (level >= 20) elBadge.src = 'images/badge_sentinel.png';
            else if (level >= 5) elBadge.src = 'images/badge_scout.png';
            else elBadge.src = 'images/badge_novice.png';
        }

        const p = level === 1 ? (xp / 100) * 100 : ((xp - prev) / (next - prev)) * 100;
        if (bar) bar.style.width = Math.min(p, 100) + '%';
    });

    // --- NEW: Radar Stats Population ---
    const elRadarCount = document.getElementById('radar-threat-count');
    const elRadarLast = document.getElementById('radar-last-threat');

    // Calculate total threats (high risk + medium risk)
    const threats = highRisk + medRisk;

    // Updates
    if (elRadarCount) elRadarCount.innerText = threats.toLocaleString();

    if (elRadarLast) {
        if (threats > 0) {
            // Find most recent threat
            // log items have {timestamp, core, hostname, etc.}
            const lastThreat = [...log]
                .filter(e => e.score > 20)
                .sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0))[0];

            if (lastThreat) {
                elRadarLast.innerText = lastThreat.hostname || "Unknown";
                elRadarLast.style.color = "#dc3545"; // Red for danger
                elRadarLast.title = `Score: ${lastThreat.score} | Detected: ${new Date(lastThreat.timestamp || Date.now()).toLocaleString()}`;
            } else {
                elRadarLast.innerText = "None";
                elRadarLast.style.color = "#adb5bd";
            }
        } else {
            elRadarLast.innerText = "None";
            elRadarLast.style.color = "#28a745"; // Green/Grey if clean
        }
    }

    // --- NEW: Radar Visualization Logic ---
    const radarContainer = document.getElementById('threat-radar');
    if (radarContainer) {
        // Get the absolute latest entry (regardless of whether it's a threat or not)
        const absoluteLast = [...log].sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0))[0];

        // If the very last site visited was High Risk, show red alert blips
        if (absoluteLast && absoluteLast.score > 20) {
            radarContainer.classList.add('danger-mode');
            if (document.getElementById('radar-status')) {
                document.getElementById('radar-status').innerHTML =
                    '<span style="display:inline-block; width:8px; height:8px; background:#dc3545; border-radius:50%; margin-right:5px; animation: blink 0.5s infinite;"></span> Threat Detected!';
                document.getElementById('radar-status').style.color = '#dc3545';
            }
        } else {
            radarContainer.classList.remove('danger-mode');
            // Revert status to normal
            if (document.getElementById('radar-status')) {
                document.getElementById('radar-status').innerHTML =
                    '<span style="display:inline-block; width:8px; height:8px; background:#28a745; border-radius:50%; margin-right:5px; animation: blink 2s infinite;"></span> Active Monitoring';
                document.getElementById('radar-status').style.color = '#28a745';
            }
        }
    }
}

function renderExtensionTable(log) {
    const tbody = document.getElementById('ext-log-body');
    if (!tbody) return;
    tbody.innerHTML = '';

    if (!log || log.length === 0) {
        tbody.innerHTML = '<tr><td colspan=4 align=center>No activity.</td></tr>';
        return;
    }

    [...log].reverse().slice(0, 50).forEach(e => {
        const tr = document.createElement('tr');
        const badgeClass = e.tier === 'HIGH_RISK' ? 'risk-high' : 'risk-med';

        tr.innerHTML = `
            <td>${e.timestamp ? new Date(e.timestamp).toLocaleTimeString() : '-'}</td>
            <td><strong>${e.name}</strong> <small style="color:#6c757d">(${e.id.substring(0, 8)}...)</small></td>
            <td><span class="risk-badge ${badgeClass}">${e.tier}</span></td>
            <td>${e.installType}</td>
        `;
        tbody.appendChild(tr);
    });
}

function renderTable(log) {
    const tbody = document.getElementById('log-body');
    if (!tbody) return;
    tbody.innerHTML = '';

    if (log.length === 0) {
        tbody.innerHTML = '<tr><td colspan=4 align=center>No activity.</td></tr>';
        return;
    }

    // Sort by timestamp (newest first) and show most recent 50
    const visibleLogs = [...log].sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0)).slice(0, 50);

    visibleLogs.forEach((e, i) => {
        const tr = document.createElement('tr');

        let status = 'Safe';
        let badgeClass = 'risk-low';

        if (e.score >= 60) {
            status = 'Critical';
            badgeClass = 'risk-high';
        } else if (e.score >= 20) {
            status = 'Warning';
            badgeClass = 'risk-med';
        }

        let timeStr = '-';
        if (e.timestamp) {
            try {
                timeStr = new Date(e.timestamp).toLocaleTimeString();
            } catch (err) { timeStr = 'Invalid Date'; }
        }

        const rowId = `log-row-${i}`;
        tr.innerHTML = `
            <td>${timeStr}</td>
            <td>${e.hostname || 'Local File / Unknown'}</td>
            <td id="trust-${rowId}" class="trust-cell"><span style="color:#adb5bd; font-size:11px;">...</span></td>
            <td>${e.score}/100</td>
            <td><span class="risk-badge ${badgeClass}">${status}</span></td>
        `;
        tbody.appendChild(tr);
    });

    // Valid Hostnames for Trust Score Fetch
    const validEntries = visibleLogs.map((e, i) => ({
        hostname: e.hostname,
        elementId: `trust-log-row-${i}`
    })).filter(e => e.hostname && e.hostname.includes('.'));

    // Async Fetch Trust Scores
    fetchLogTrustScores(validEntries);
}

async function fetchLogTrustScores(entries) {
    if (typeof ThreatIntel === 'undefined') return;

    for (const entry of entries) {
        try {
            // Check cache or fetch
            // We use the same service but we need to be careful not to spam.
            // For now, sequential is safer for the demo server.
            const data = await ThreatIntel.getTrustScore("http://" + entry.hostname);
            const el = document.getElementById(entry.elementId);

            if (el && data) {
                if (data.score === null) {
                    el.innerHTML = `<span style="color:#adb5bd;">N/A</span>`;
                } else if (data.score >= 80) {
                    el.innerHTML = `<span style="color:#198754; font-weight:bold;">${data.score}%</span>`;
                } else if (data.score <= 40) {
                    el.innerHTML = `<span style="color:#dc3545; font-weight:bold;">${data.score}%</span>`;
                } else {
                    el.innerHTML = `<span style="color:#ffc107; font-weight:bold;">${data.score}%</span>`;
                }
            } else if (el) {
                el.innerHTML = `<span style="color:#adb5bd;">N/A</span>`;
            }
        } catch (e) {
            // Silent fail
        }
    }
}


function generateAndPrintReport() {
    chrome.storage.local.get(['visitLog', 'userXP', 'userLevel', 'currentUser'], (data) => {
        const log = data.visitLog || [];
        const user = data.currentUser || { name: 'User' };

        const html = `
            <div class="print-header">
                <img src="images/image.png" style="width:60px; height:60px;">
                <h1>PhishingShield Security Report</h1>
                <p>Generated: ${new Date().toLocaleString()}</p>
            </div>
            <div class="print-section">
                <h3>👤 User Profile</h3>
                <div class="print-card">
                    <p><strong>Name:</strong> ${user.name}</p>
                    <p><strong>Security Rank:</strong> Level ${data.userLevel || 1} (${(data.userLevel || 1) >= 20 ? 'Sentinel' : 'Novice'})</p>
                </div>
            </div>
            <div class="print-section">
                <h3>🔍 Security Summary</h3>
                <div class="print-card">
                    <p><strong>Total Sites Scanned:</strong> ${log.length}</p>
                    <p><strong>Threats Blocked:</strong> ${log.filter(e => e.score > 20).length}</p>
                </div>
            </div>
            <div class="print-section">
                <h3>📅 Recent Activity</h3>
                <table class="print-table">
                    <thead><tr><th>Time</th><th>Domain</th><th>Status</th></tr></thead>
                    <tbody>
                        ${[...log].sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0)).slice(0, 10).map(e =>
            `<tr><td>${new Date(e.timestamp).toLocaleTimeString()}</td><td>${e.hostname}</td><td>${e.score > 20 ? 'Threat' : 'Safe'}</td></tr>`
        ).join('')}
                    </tbody>
                </table>
            </div>
            <div style="text-align:center; font-size:10px; color:#999; margin-top:50px;">
                Generated by PhishingShield Extension
            </div>
        `;

        const container = document.getElementById('print-report-container');
        if (container) {
            container.innerHTML = html;
            document.body.classList.add('printing-mode');
            window.print();
            document.body.classList.remove('printing-mode');
        }
    });
}

function renderLeaderboard(users) {
    const container = document.getElementById('leaderboard-list');
    if (!container) return;

    if (!users || users.length === 0) {
        container.innerHTML = '<div style="color:#adb5bd; padding:10px;">No other users active.</div>';
        return;
    }

    // Sort by XP Descending
    const sorted = [...users].sort((a, b) => (b.xp || 0) - (a.xp || 0)).slice(0, 5);

    let html = '';
    sorted.forEach((u, i) => {
        const rank = i + 1;
        let medal = '';
        if (rank === 1) medal = '🥇';
        else if (rank === 2) medal = '🥈';
        else if (rank === 3) medal = '🥉';
        else medal = `#${rank}`;

        const name = u.name || 'Anonymous';
        const level = u.level || 1;
        const xp = u.xp || 0;

        let rankName = 'Novice';
        if (level >= 20) rankName = 'Sentinel';
        else if (level >= 5) rankName = 'Scout';

        html += `
            <div class="leaderboard-item" style="display:flex; justify-content:space-between; align-items:center; padding: 10px; border-bottom: 1px solid var(--border-color);">
                <div style="display:flex; align-items:center; gap:10px;">
                    <div style="font-weight:bold; font-size:16px; width:30px; text-align:center;">${medal}</div>
                    <div>
                        <div class="lb-name" style="font-weight:600; color:#343a40; font-size:14px;">${name}</div>
                        <div class="lb-rank" style="font-size:12px; color:#6c757d;">Level ${level} <span style="font-size:10px; color:#adb5bd;">(${rankName})</span></div>
                    </div>
                </div>
                <div style="font-weight:bold; color:#0d6efd; font-size:14px;">${xp} XP</div>
            </div>
        `;
    });

    container.innerHTML = html;
}
