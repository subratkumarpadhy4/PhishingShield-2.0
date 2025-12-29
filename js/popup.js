document.addEventListener('DOMContentLoaded', () => {
    // --- 1. SETTINGS LOGIC ---
    const togglePreview = document.getElementById('toggle-preview');
    const toggleLogin = document.getElementById('toggle-login');
    const toggleDownloads = document.getElementById('toggle-downloads');
    const toggleFortress = document.getElementById('toggle-fortress');

    // Load Settings
    chrome.storage.local.get(['enablePreview', 'enableLogin', 'enableDownloads', 'enableFortress', 'logHistoryLimit'], (result) => {
        if (togglePreview) togglePreview.checked = result.enablePreview !== false;
        if (toggleLogin) toggleLogin.checked = result.enableLogin !== false;
        if (toggleDownloads) toggleDownloads.checked = result.enableDownloads !== false;
        if (toggleFortress) toggleFortress.checked = result.enableFortress === true;

        const limitInput = document.getElementById('history-limit');
        if (limitInput) limitInput.value = result.logHistoryLimit || 100;
    });

    // Save Settings Listeners
    if (togglePreview) {
        togglePreview.addEventListener('change', () => {
            const val = togglePreview.checked;
            chrome.storage.local.set({ enablePreview: val });
            if (typeof Auth !== 'undefined' && Auth.syncSettings) Auth.syncSettings({ enablePreview: val });
        });
    }
    if (toggleLogin) {
        toggleLogin.addEventListener('change', () => {
            const val = toggleLogin.checked;
            chrome.storage.local.set({ enableLogin: val });
            if (typeof Auth !== 'undefined' && Auth.syncSettings) Auth.syncSettings({ enableLogin: val });
        });
    }
    if (toggleDownloads) {
        toggleDownloads.addEventListener('change', () => {
            const val = toggleDownloads.checked;
            chrome.storage.local.set({ enableDownloads: val });
            if (typeof Auth !== 'undefined' && Auth.syncSettings) Auth.syncSettings({ enableDownloads: val });
        });
    }
    const limitInput = document.getElementById('history-limit');
    if (limitInput) {
        limitInput.addEventListener('change', () => {
            let val = parseInt(limitInput.value);
            if (val < 10) val = 10;
            if (val > 100) val = 100;
            chrome.storage.local.set({ logHistoryLimit: val });
            if (typeof Auth !== 'undefined' && Auth.syncSettings) Auth.syncSettings({ logHistoryLimit: val });
        });
    }

    if (toggleFortress) {
        toggleFortress.addEventListener('change', () => {
            const isEnabled = toggleFortress.checked;
            chrome.storage.local.set({ enableFortress: isEnabled });
            chrome.runtime.sendMessage({ type: "TOGGLE_FORTRESS", enabled: isEnabled });
            if (typeof Auth !== 'undefined' && Auth.syncSettings) Auth.syncSettings({ enableFortress: isEnabled });
        });
    }

    // --- 2. ADMIN LOGIC (MOVED TO DASHBOARD) ---

    // --- 3. AUTHENTICATION LOGIC ---
    function initAuth() {
        if (typeof Auth === 'undefined') {
            setTimeout(initAuth, 100);
            return;
        }

        const btnLogin = document.getElementById('btn-login');
        const userProfileLink = document.getElementById('user-profile-link');
        const userInitial = document.getElementById('user-initial');
        const btnLogout = document.getElementById('btn-logout');

        // Check if essential elements exist
        if (!btnLogin || !userProfileLink) return;

        function updateAuthUI() {
            Auth.checkSession((user) => {
                if (user) {
                    // Logged In
                    btnLogin.style.display = 'none';
                    if (userProfileLink) userProfileLink.style.display = 'flex';

                    if (userInitial) {
                        const name = user.name || 'User';
                        userInitial.textContent = name.charAt(0).toUpperCase();
                    }

                    if (btnLogout) btnLogout.style.display = 'block';

                    // Explicitly Handle Profile Link Click to ensure Tab Open
                    userProfileLink.onclick = (e) => {
                        e.preventDefault();
                        chrome.tabs.create({ url: chrome.runtime.getURL('dashboard.html') });
                    };

                    // Admin Access Check
                    const adminLink = document.getElementById('open-admin');
                    const OWNER = 'rajkumarpadhy2006@gmail.com';
                    if (adminLink && user.email.toLowerCase() === OWNER.toLowerCase()) {
                        adminLink.style.display = 'inline';
                    }
                } else {
                    // Logged Out
                    btnLogin.style.display = 'inline-block';
                    if (userProfileLink) userProfileLink.style.display = 'none';

                    if (btnLogout) btnLogout.style.display = 'none';
                }
            });
        }

        // Initial Check
        updateAuthUI();

        // Logout Listener
        if (btnLogout) {
            btnLogout.addEventListener('click', (e) => {
                e.preventDefault();
                if (confirm("Are you sure you want to log out?")) {
                    Auth.logout(() => {
                        updateAuthUI();
                    });
                }
            });
        }
    }

    initAuth();

    // Trigger Pending Syncs (XP, History, Settings)
    if (typeof Auth !== 'undefined') {
        setTimeout(() => {
            if (Auth.syncState) Auth.syncState();
            if (Auth.syncHistory) Auth.syncHistory();
        }, 2000);
    }

    // --- 4. STATS & GAMIFICATION ---
    function updateSafetyLevel() {
        chrome.storage.local.get(['siteHistory', 'userXP', 'userLevel'], (result) => {
            const history = result.siteHistory || [];
            const attacksBlocked = history.filter(h => h.score > 50).length;

            const xp = result.userXP || 0;
            const level = result.userLevel || 1;

            const levelEl = document.getElementById('safety-level');
            const xpEl = document.getElementById('safety-xp');
            const barEl = document.getElementById('xp-bar-fill');
            const blockedEl = document.getElementById('blocked-count');

            if (levelEl) levelEl.textContent = level;
            if (xpEl) xpEl.textContent = `${xp} XP`;
            if (blockedEl) blockedEl.textContent = attacksBlocked;

            if (barEl) {
                const nextLevelXp = Math.pow(level, 2) * 100;
                const prevLevelXp = Math.pow(level - 1, 2) * 100;

                let progress = 0;
                if (level === 1) {
                    progress = (xp / 100) * 100;
                } else {
                    progress = ((xp - prevLevelXp) / (nextLevelXp - prevLevelXp)) * 100;
                }
                barEl.style.width = `${Math.max(5, Math.min(progress, 100))}%`;
            }
        });
    }

    updateSafetyLevel();

    // --- 5. DOJO INIT ---
    if (typeof Dojo !== 'undefined') {
        Dojo.init();
    }

    // --- 6. GUEST TRACKING & DEBUG ---
    chrome.storage.local.get(['currentUser', 'stats_guest_count', 'visitLog'], (res) => {
        if (!res.currentUser) {
            const newCount = (res.stats_guest_count || 0) + 1;
            chrome.storage.local.set({ stats_guest_count: newCount });
        }
        // Update Log Count
        const logs = res.visitLog || [];
        const logCountEl = document.getElementById('debug-log-count');
        if (logCountEl) logCountEl.textContent = logs.length;
    });



});
