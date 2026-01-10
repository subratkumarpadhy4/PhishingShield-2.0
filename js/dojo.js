/**
 * Phishing Shield - Dojo Module
 * Handles the gamification and quiz logic.
 */

const Dojo = {
    currentQuestion: null,
    streak: 0, // Added streak tracking

    // Question Bank: A mix of obvious and subtle phishing scenarios
    questions: [
        // --- LEVEL 1: Basic Url Mismatches ---
        {
            id: 1,
            scenario: "You receive an email claiming your account is locked.",
            url: "http://paypal-support-secure.com/login",
            isPhishing: true,
            explanation: "The domain 'paypal-support-secure.com' is not 'paypal.com'. Attackers often use hyphens and 'secure' to fool you."
        },
        {
            id: 2,
            scenario: "You want to visit Google.",
            url: "https://www.google.com/search?q=cats",
            isPhishing: false,
            explanation: "This is the legitimate Google domain."
        },
        // --- LEVEL 2: Subdomain Tricks ---
        {
            id: 3,
            scenario: "A text message sends you a link to claim a prize.",
            url: "http://amazon.com.prizes-winner.xyz",
            isPhishing: true,
            explanation: "Read the URL from right to left! The real domain is 'prizes-winner.xyz'. 'amazon.com' is just a subdomain here."
        },
        {
            id: 4,
            scenario: "Logging into your bank.",
            url: "https://onlinesbi.sbi/personal",
            isPhishing: false,
            explanation: "This is the official secured domain for SBI (State Bank of India)."
        },
        // --- LEVEL 3: Typosquatting ---
        {
            id: 5,
            scenario: "Quickly typing Facebook to login.",
            url: "https://facebo0k.com",
            isPhishing: true,
            explanation: "Look closely! That's a zero '0', not an 'o'. This is a classic Typosquatting attack."
        },
        {
            id: 6,
            scenario: "Microsoft Security Alert",
            url: "http://microsoft-alert.support",
            isPhishing: true,
            explanation: "Microsoft uses microsoft.com. '.support' is not an official domain for security alerts."
        },
        {
            id: 7,
            scenario: "Netflix subscription update.",
            url: "https://netflix.com-verify.net/login",
            isPhishing: true,
            explanation: "The actual domain is 'com-verify.net'. Real Netflix is just 'netflix.com' before the first slash."
        },
        // --- LEVEL 4: Country Code & TLDs ---
        {
            id: 8,
            scenario: "Shopping on Amazon India.",
            url: "https://www.amazon.in/gp/cart",
            isPhishing: false,
            explanation: "Amazon uses .in for India. This is safe."
        },
        {
            id: 9,
            scenario: "Download an attachment.",
            url: "file:///C:/Users/Admin/Downloads/invoice.exe",
            isPhishing: true,
            explanation: "This is a local file path, not a website. If a link tries to open this, it might be malware trying to execute."
        },
        // --- LEVEL 5: Brand Spoofing ---
        {
            id: 10,
            scenario: "Instagram DM: 'Is this you in the video?'",
            url: "https://instagram-login-portal.tk",
            isPhishing: true,
            explanation: ".tk is a free domain often used by scammers. Official Instagram is instagram.com."
        },
        {
            id: 11,
            scenario: "HDFC Bank Alert",
            url: "https://netbanking.hdfcbank.com/netbanking",
            isPhishing: false,
            explanation: "Correct. 'hdfcbank.com' is the trusted domain."
        },
        {
            id: 12,
            scenario: "HR Dept: Update your payroll info.",
            url: "http://company-internal-hr.biz",
            isPhishing: true,
            explanation: "Unless your company explicitly uses .biz (rare), this generic domain is suspicious for internal tools."
        },
        // --- LEVEL 6: Homograph & IDN Attacks ---
        {
            id: 13,
            scenario: "Checking Apple's homepage.",
            url: "https://www.appIe.com",
            isPhishing: true,
            explanation: "Look VERY closely. The 'l' is actually a capital 'I' (Eye). This is a Homograph attack."
        },
        {
            id: 14,
            scenario: "A generic secure login page.",
            url: "https://secure-login.com",
            isPhishing: true,
            explanation: "Generic names like 'secure-login.com' are often owned by attackers to harvest credentials from various services."
        },
        // --- LEVEL 7: Obfuscation & Redirects ---
        {
            id: 15,
            scenario: "A link from a friend.",
            url: "https://google.com@evil-site.com",
            isPhishing: true,
            explanation: "Everything before the '@' is treated as a username! The browser will actually take you to 'evil-site.com'."
        },
        {
            id: 16,
            scenario: "Clicking a shortened link.",
            url: "http://bit.ly/secure-bank-login",
            isPhishing: true,
            explanation: "Banks almost never use URL shorteners for login pages. This hides the true destination."
        },
        // --- LEVEL 8: Advanced Structure ---
        {
            id: 17,
            scenario: "Connecting to your Router.",
            url: "http://192.168.1.1/admin",
            isPhishing: false,
            explanation: "This is a standard local IP address for home routers. It is safe and internal."
        },
        {
            id: 18,
            scenario: "A link asking for urgent action.",
            url: "http://45.33.22.11/login",
            isPhishing: true,
            explanation: "Legitimate professional sites use domain names, not raw public IP addresses. This is highly suspicious."
        }
    ],

    init: function () {
        this.bindEvents();
        this.loadNewQuestion();
    },

    bindEvents: function () {
        document.getElementById('btn-safe').addEventListener('click', () => this.checkAnswer(false));
        document.getElementById('btn-phish').addEventListener('click', () => this.checkAnswer(true));
        document.getElementById('btn-next').addEventListener('click', () => {
            document.getElementById('dojo-feedback').style.display = 'none';
            document.getElementById('btn-next').style.display = 'none';
            this.loadNewQuestion();
        });

        // Tab Switching Logic
        document.getElementById('tab-dashboard').addEventListener('click', () => this.switchTab('dashboard'));
        document.getElementById('tab-dojo').addEventListener('click', () => this.switchTab('dojo'));
    },

    switchTab: function (tabName) {
        document.querySelectorAll('.tab').forEach(t => {
            t.classList.remove('active');
            // Removed inline style resets to allow CSS to control appearance
            t.removeAttribute('style');
        });
        document.querySelectorAll('[id^="view-"]').forEach(v => v.style.display = 'none');

        const tab = document.getElementById(`tab-${tabName}`);
        tab.classList.add('active');
        // Removed inline active styles

        document.getElementById(`view-${tabName}`).style.display = 'block';
    },

    loadNewQuestion: function () {
        const randomIndex = Math.floor(Math.random() * this.questions.length);
        this.currentQuestion = this.questions[randomIndex];

        document.getElementById('dojo-scenario').textContent = this.currentQuestion.scenario;
        document.getElementById('dojo-url').textContent = this.currentQuestion.url;

        // Reset Buttons
        document.getElementById('btn-safe').disabled = false;
        document.getElementById('btn-phish').disabled = false;
    },

    checkAnswer: function (userSaysPhishing) {
        const isCorrect = userSaysPhishing === this.currentQuestion.isPhishing;
        const feedbackEl = document.getElementById('dojo-feedback');

        if (isCorrect) {
            this.streak++;
            let xpReward = 50;
            let msg = `<span style="color: #28a745; font-weight: bold;">Correct! 🎉</span> <br> ${this.currentQuestion.explanation}`;

            // Streak Bonus Logic
            if (this.streak > 1) {
                msg += `<br><div style="margin-top:5px; font-size:12px; color:#f59e0b; font-weight:bold;">🔥 Streak: ${this.streak}</div>`;
            }
            if (this.streak % 3 === 0) {
                xpReward += 25; // Bonus XP
                msg += `<span style="color: #f59e0b; font-size: 11px;">(+25 Streak Bonus!)</span>`;
            }

            feedbackEl.innerHTML = msg;
            this.grantXP(xpReward);
        } else {
            this.streak = 0; // Reset streak
            feedbackEl.innerHTML = `<span style="color: #dc3545; font-weight: bold;">Wrong! 💀</span> <br> ${this.currentQuestion.explanation}`;
        }

        feedbackEl.style.display = 'block';
        document.getElementById('btn-next').style.display = 'block';

        // Disable buttons to prevent farming
        document.getElementById('btn-safe').disabled = true;
        document.getElementById('btn-phish').disabled = true;
    },

    grantXP: function (amount) {
        chrome.storage.local.get(['userXP', 'userLevel'], (result) => {
            let xp = result.userXP || 0;
            let level = result.userLevel || 1;

            xp += amount;

            // Level Up Calculation (Level^2 * 100)
            const nextLevelXp = Math.pow(level, 2) * 100;
            if (xp >= nextLevelXp) {
                level++;
                // xp = 0; // FIXED: Do not reset XP, it is cumulative!
                // alert(`Level Up! You are now Level ${level}`); 
            }

            chrome.storage.local.set({ userXP: xp, userLevel: level, pendingXPSync: true }, () => {
                // Refresh UI if visible
                if (window.updateSafetyLevel) window.updateSafetyLevel();

                // Trigger Cloud Sync if Auth available
                if (typeof Auth !== 'undefined' && Auth.syncXP) Auth.syncXP();
            });
        });
    }
};

// Initialize when DOM is ready (popup.js handles this order usually, but safer here too)
// We will call Dojo.init() from popup.js
