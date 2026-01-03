document.addEventListener('DOMContentLoaded', () => {
    try {
        console.log("Dashboard: Initializing...");

        // 0. ADMIN SECURITY CHECK
        checkAdminAccess();

        // 1. NAVIGATION TABS
        const navLinks = document.querySelectorAll('.nav-link');
        const tabs = document.querySelectorAll('.tab-content');
        const pageTitle = document.getElementById('page-title');

        if (navLinks.length > 0) {
            navLinks.forEach(link => {
                link.addEventListener('click', (e) => {
                    e.preventDefault();
                    navLinks.forEach(l => l.classList.remove('active'));
                    tabs.forEach(t => t.classList.remove('active'));

                    link.classList.add('active');
                    const tabId = link.getAttribute('data-tab');
                    const tab = document.getElementById(tabId);
                    if (tab) tab.classList.add('active');

                    if (pageTitle) pageTitle.textContent = link.textContent.replace(/^.\s/, '');
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
                    const log = result.visitLog || [];
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

        // Immediate XP Sync Check - Fix any mismatches between users array and userXP
        chrome.storage.local.get(['userXP', 'userLevel', 'users', 'currentUser'], (data) => {
            if (data.currentUser && data.currentUser.email && data.users && Array.isArray(data.users)) {
                const userInArray = data.users.find(u => u && u.email === data.currentUser.email);
                if (userInArray) {
                    const serverXP = Number(userInArray.xp) || 0;
                    const localXP = Number(data.userXP) || 0;

                    if (serverXP > localXP) {
                        console.log(`[Dashboard] ⚠️ XP mismatch detected! Users array has ${serverXP} but userXP is ${localXP}. Fixing...`);
                        chrome.storage.local.set({
                            userXP: serverXP,
                            userLevel: userInArray.level || Math.floor(Math.sqrt(serverXP / 100)) + 1
                        }, () => {
                            console.log(`[Dashboard] ✅ Fixed XP mismatch. Now showing ${serverXP} XP`);
                            renderDashboardUI(); // Re-render with correct XP
                        });
                    }
                }
            }
        });

        // Periodic XP Sync (every 10 seconds) to catch admin-promoted XP
        setInterval(() => {
            console.log("[Dashboard] Periodic XP sync triggered");
            chrome.runtime.sendMessage({ type: "SYNC_XP" }, (response) => {
                if (chrome.runtime.lastError) {
                    console.warn("[Dashboard] SYNC_XP error:", chrome.runtime.lastError);
                } else {
                    console.log("[Dashboard] Periodic sync completed");
                }
            });
        }, 10000); // Sync every 10 seconds

        // Sync when dashboard becomes visible (user switches back to tab)
        document.addEventListener('visibilitychange', () => {
            if (!document.hidden) {
                console.log("[Dashboard] Dashboard became visible, syncing XP...");
                chrome.runtime.sendMessage({ type: "SYNC_XP" });
            }
        });

        // Fetch Global Data (Background Sync)
        if (typeof Auth !== 'undefined' && Auth.getUsers) {
            Auth.getUsers((users) => {
                console.log("[Dashboard] Global users fetched:", users.length);
                // Note: This updates storage, which triggers the listener below => re-render
            });
        }

        // Listen for storage changes to update in real-time
        if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.onChanged) {
            chrome.storage.onChanged.addListener((changes, areaName) => {
                if (areaName === 'local') {
                    // Update if visitLog, userXP, userLevel, or users changed
                    if (changes.visitLog || changes.userXP || changes.userLevel || changes.users) {
                        console.log("[Dashboard] Storage changed, re-rendering UI. XP:", changes.userXP?.newValue, "Level:", changes.userLevel?.newValue);
                        renderDashboardUI();
                    }
                }
            });
        }

        // Listen for XP_UPDATE messages from background script (for admin-promoted XP)
        if (typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.onMessage) {
            chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
                if (message.type === "XP_UPDATE") {
                    console.log("[Dashboard] XP_UPDATE message received: XP=" + message.xp + ", Level=" + message.level);
                    // Update storage first, then re-render (storage listener will also trigger, but this ensures immediate update)
                    chrome.storage.local.set({
                        userXP: message.xp,
                        userLevel: message.level
                    }, () => {
                        // Force immediate re-render to show updated XP
                        renderDashboardUI();
                    });
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
                window.print();
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
            clearBtn.addEventListener('click', () => {
                if (confirm("Are you sure you want to clear your security history?")) {
                    chrome.storage.local.set({ visitLog: [] }, () => {
                        location.reload();
                    });
                }
            });
        }

    } catch (err) {
        console.error("Dashboard Critical Error:", err);
    }
});

// --- HELPER FUNCTIONS ---

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
    let threats = 0;
    log.forEach(e => { if (e.score > 20) threats++; });
    const safe = total - threats;

    // Safety Elements
    const elTotal = document.getElementById('total-scanned');
    const elSafe = document.getElementById('total-safe');
    const elThreats = document.getElementById('total-threats');
    const elSummary = document.getElementById('report-summary');
    const elTime = document.getElementById('time-spent');

    if (elTotal) elTotal.innerText = total;
    if (elSafe) elSafe.innerText = safe;
    if (elThreats) elThreats.innerText = threats;
    if (elTime) elTime.innerText = Math.round(safe * 0.5) + ' min';

    const safePercentage = total > 0 ? Math.round((safe / total) * 100) : 100;
    if (elSummary) elSummary.innerText = `Safety: ${safePercentage}%`;

    // Gamification - Read XP from storage, with fallback to users array
    chrome.storage.local.get(['userXP', 'userLevel', 'users', 'currentUser'], (g) => {
        let xp = Number(g.userXP) || 0;
        let level = Number(g.userLevel) || 1;

        // Fallback: If userXP seems stale, check users array for current user
        if (g.currentUser && g.currentUser.email && g.users && Array.isArray(g.users)) {
            const currentUserInArray = g.users.find(u => u && u.email === g.currentUser.email);
            if (currentUserInArray) {
                const serverXP = Number(currentUserInArray.xp) || 0;
                const serverLevel = Number(currentUserInArray.level) || 1;

                // Enforce Server Authority: If server is different (higher OR lower), we sync local to server.
                if (serverXP !== xp) {
                    console.log(`[Dashboard] Syncing Local XP to Server XP: ${xp} -> ${serverXP}`);
                    xp = serverXP;
                    level = serverLevel;

                    // Update local storage to match
                    chrome.storage.local.set({
                        userXP: serverXP,
                        userLevel: serverLevel
                    });
                }
            }
        }

        // Recalculate level from XP to ensure accuracy (level = floor(sqrt(xp/100)) + 1)
        const calculatedLevel = Math.floor(Math.sqrt(xp / 100)) + 1;
        if (calculatedLevel !== level) {
            console.log(`[Dashboard] Level mismatch! Recalculating: stored=${level}, calculated=${calculatedLevel} from XP=${xp}`);
            level = calculatedLevel;
        }

        const elRank = document.getElementById('user-rank');
        const elLevel = document.getElementById('user-level');
        const elXP = document.getElementById('current-xp');
        const bar = document.getElementById('xp-bar');
        const elNext = document.getElementById('next-level-xp');

        if (elLevel) elLevel.innerText = level;
        if (elXP) elXP.innerText = xp;
        if (elRank) elRank.innerText = (level >= 20 ? 'Sentinel' : (level >= 5 ? 'Scout' : 'Novice'));

        // Calculate XP requirements for current level
        // Level formula: level = floor(sqrt(xp/100)) + 1
        // So for level N, min XP = (N-1)^2 * 100, max XP = N^2 * 100
        const prevLevelXP = Math.pow(level - 1, 2) * 100;
        const nextLevelXP = Math.pow(level, 2) * 100;

        if (elNext) elNext.innerText = nextLevelXP; // Update the label

        // Update Badge Image
        const elBadge = document.getElementById('rank-badge');
        if (elBadge) {
            if (level >= 20) elBadge.src = 'images/badge_sentinel.png';
            else if (level >= 5) elBadge.src = 'images/badge_scout.png';
            else elBadge.src = 'images/badge_novice.png';
        }

        // Calculate progress percentage
        // For level 1: progress = (xp / 100) * 100
        // For other levels: progress = ((xp - prevLevelXP) / (nextLevelXP - prevLevelXP)) * 100
        let progressPercent = 0;
        if (level === 1) {
            progressPercent = (xp / 100) * 100;
        } else {
            const xpInCurrentLevel = xp - prevLevelXP;
            const xpNeededForLevel = nextLevelXP - prevLevelXP;
            progressPercent = (xpInCurrentLevel / xpNeededForLevel) * 100;
        }

        // Ensure progress is between 0 and 100
        progressPercent = Math.max(0, Math.min(100, progressPercent));

        console.log(`[Dashboard] XP Progress: ${xp} XP, Level ${level}, Progress: ${progressPercent.toFixed(1)}% (${prevLevelXP} -> ${nextLevelXP})`);

        if (bar) {
            bar.style.width = progressPercent + '%';
            console.log(`[Dashboard] Progress bar set to ${progressPercent}%`);
        }
    });
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
    [...log].sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0)).slice(0, 50).forEach(e => {
        const tr = document.createElement('tr');
        const status = e.score > 20 ? 'Critical' : 'Safe';
        const badgeClass = e.score > 20 ? 'risk-high' : 'risk-low';

        tr.innerHTML = `
            <td>${e.timestamp ? new Date(e.timestamp).toLocaleTimeString() : '-'}</td>
            <td>${e.hostname || 'Local File / Unknown'}</td>
            <td>${e.score}/100</td>
            <td><span class="risk-badge ${badgeClass}">${status}</span></td>
        `;
        tbody.appendChild(tr);
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
            <div style="display:flex; justify-content:space-between; align-items:center; padding: 10px; border-bottom: 1px solid #eee;">
                <div style="display:flex; align-items:center; gap:10px;">
                    <div style="font-weight:bold; font-size:16px; width:30px; text-align:center;">${medal}</div>
                    <div>
                        <div style="font-weight:600; color:#343a40; font-size:14px;">${name}</div>
                        <div style="font-size:12px; color:#6c757d;">Level ${level} <span style="font-size:10px; color:#adb5bd;">(${rankName})</span></div>
                    </div>
                </div>
                <div style="font-weight:bold; color:#0d6efd; font-size:14px;">${xp} XP</div>
            </div>
        `;
    });

    container.innerHTML = html;
}
