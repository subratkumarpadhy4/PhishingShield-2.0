// PhishingShield Content Script

console.log("PhishingShield Content Script Active");

chrome.storage.local.get(['enablePreview', 'enableLogin', 'enableDownloads', 'enableFortress'], (result) => {
    // Default to true if not set, meaning features are enabled by default
    const enablePreview = result.enablePreview !== false;
    const enableLogin = result.enableLogin !== false;
    const enableDownloads = result.enableDownloads !== false; // Default true
    const enableFortress = result.enableFortress === true; // Default false

    if (enablePreview) {
        initLinkPreview();
    }

    if (enableLogin) {
        initLoginProtection();
    }

    // Pass Fortress Mode to Risk Analysis
    initRiskAnalysis(enableFortress);
    initDownloadProtection(enableFortress, enableDownloads);
    initFortressClipboard(enableFortress);
});

// Listener for Real-Time Events (Level Up)
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.type === "LEVEL_UP") {
        const level = message.level;
        // Show Level Up Toast
        const toast = document.createElement('div');
        toast.innerHTML = `
            <div style="font-size: 24px;">🎉</div>
            <div style="font-weight: bold; margin-top: 5px;">LEVEL UP!</div>
            <div>You are now Level ${level}</div>
        `;
        toast.style.cssText = `
            position: fixed;
            bottom: 20px;
            left: 20px;
            background: linear-gradient(135deg, #0d6efd, #0dcaf0);
            color: white;
            padding: 15px 25px;
            border-radius: 10px;
            box-shadow: 0 4px 15px rgba(13, 110, 253, 0.4);
            z-index: 2147483647;
            text-align: center;
            font-family: sans-serif;
            animation: slideUp 0.5s ease-out;
        `;
        document.body.appendChild(toast);

        // Remove after 4 seconds
        setTimeout(() => {
            toast.style.opacity = '0';
            toast.style.transition = 'opacity 0.5s';
            setTimeout(() => toast.remove(), 500);
        }, 4000);
    }
});

// ... (Link Preview and Login - No changes needed) ...

/**
 * Feature 3 (Hackathon): Real-Time Risk Analysis HUD
 */
function initRiskAnalysis(isFortressMode) {
    if (window.location.href.includes('warning.html')) return;

    setTimeout(async () => {
        const analysis = RiskEngine.analyzePage();

        // Fortress Mode: Heightened Sensitivity
        if (isFortressMode) {
            analysis.score += 25; // Base paranoia penalty
            analysis.reasons.push("🛡️ Fortress Mode: Security Tightened (+25 Score)");
            if (analysis.score > 100) analysis.score = 100;
        }

        console.log("PhishingShield Risk Analysis:", analysis);

        // Feature: Extension Detection (Now Async) - DISABLED PER USER REQUEST (Scan on Install instead)
        /*
        const extAnalysis = await RiskEngine.analyzeExtensions();
        if (extAnalysis.count > 0) {
            analysis.score += extAnalysis.score;
            analysis.reasons.push(...extAnalysis.reasons);
            // Heighten threat level if extensions are interfering
            if (analysis.primaryThreat === "Generic Suspicion") {
                analysis.primaryThreat = "Suspicious Extension Activity";
            }
        }
        */

        // Cap score at 100
        analysis.score = Math.min(analysis.score, 100);

        chrome.runtime.sendMessage({
            type: "LOG_VISIT",
            data: {
                url: window.location.href,
                hostname: window.location.hostname || window.location.pathname.split('/').pop(),
                score: analysis.score,
                reasons: analysis.reasons,
                primaryThreat: analysis.primaryThreat, // New Analytics Field
                timestamp: Date.now()
            }
        }, (response) => {
            if (chrome.runtime.lastError) {
                console.error("PhishingShield Log Error:", chrome.runtime.lastError.message);
            }
        });

        // Fortress Mode: Show HUD for ALMOST EVERYTHING (Score > 0)
        // Standard Mode: Show HUD for Low Risk (Score > 10)
        const threshold = isFortressMode ? 0 : 10;

        if (analysis.score < 20) {
            // Award 10 XP for safe site browsing
            chrome.runtime.sendMessage({ type: "ADD_XP", amount: 10 });
        }

        if (analysis.score > threshold) {
            showRiskHUD(analysis);
        }
    }, 1500);
}

// ...HUD function...

/**
 * Feature 4: Download Protection
 */
function initDownloadProtection(isFortressMode, isEnabled) {
    // If feature is disabled AND not in Fortress Mode, do nothing.
    // Fortress Mode overrides the toggle to ensure safety.
    if (!isEnabled && !isFortressMode) return;

    document.addEventListener('click', (e) => {
        const link = e.target.closest('a');
        if (!link || !link.href) return;

        const url = link.href.toLowerCase();
        // Standard risky list + New additions (zip, iso)
        const riskyExtensions = ['.exe', '.msi', '.bat', '.cmd', '.sh', '.zip', '.rar', '.dmg', '.iso'];
        const isRiskyFile = riskyExtensions.some(ext => url.endsWith(ext));

        // Fortress Mode: Check ALL downloads (basic heuristic for files)
        // Checks if it ends in a 3-4 letter extension that isn't .html/.php
        const isFileDownload = /\.[a-z0-9]{3,4}$/.test(url) && !url.includes('.html') && !url.includes('.htm');

        if (isRiskyFile || (isFortressMode && isFileDownload)) {
            const isHttp = window.location.protocol === 'http:';
            const analysis = RiskEngine.analyzePage(); // Recalculate if needed
            const isRiskyScore = analysis.score > 30;

            // Trigger if: HTTP OR Risky Score OR Fortress Mode (Zero Trust)
            if (isHttp || isRiskyScore || isFortressMode) {
                let message = `⚠️ SECURITY WARNING: Download Intercepted.\n`;
                if (isFortressMode) message += `🛡️ Fortress Mode is Active (Zero Trust Enabled).\n`;

                message += `\nRisk Factors:\n${isHttp ? '- Connection is not secure (HTTP)\n' : ''}${isRiskyScore ? '- High Risk Score\n' : ''}`;
                message += `\nDo you want to proceed?`;

                if (!confirm(message)) {
                    e.preventDefault();
                } else {
                    // Double Confirmation Requirement for Risky Extensions in all modes
                    if (isRiskyFile) {
                        if (!confirm("⚠️ FINAL WARNING: This file type is commonly used for malware.\n\nAre you ABSOLUTELY sure you want to download this?")) {
                            e.preventDefault();
                        }
                    }
                }
            }
        }
    });
}


/**
 * Feature 1: Link Hover Preview
 */
function initLinkPreview() {
    function createTooltip() {
        let tooltip = document.getElementById('phishingshield-tooltip');
        if (!tooltip) {
            tooltip = document.createElement('div');
            tooltip.id = 'phishingshield-tooltip';
            tooltip.style.display = 'none';
            document.body.appendChild(tooltip);
        }
        return tooltip;
    }

    const tooltip = createTooltip();

    document.addEventListener('mouseover', (event) => {
        const target = event.target.closest('a');
        if (target && target.href) {
            const href = target.href;
            const text = target.innerText.trim();

            // Show true destination
            // User Request: Show only the "main website" (hostname) to avoid clutter
            let displayUrl = href;
            try {
                const urlObj = new URL(href);
                // If it's a valid URL with a hostname, show ONLY the hostname (e.g. "www.apple.com")
                if (urlObj.hostname) {
                    displayUrl = urlObj.hostname;
                }
            } catch (e) {
                // Keep full text if parsing fails
            }

            let tooltipText = `Destination: ${displayUrl}`;
            let isSuspicious = false;

            // Basic Heuristic for Tooltip Suspicion
            try {
                const url = new URL(href);
                // Excessive subdomains (more than 3 dots is a simple heuristic)
                // e.g. login.update.banc.com
                const parts = url.hostname.split('.');
                if (parts.length > 4) { // e.g. a.b.c.com is 4 parts. 
                    isSuspicious = true;
                }

                // Feature: Mismatch Check
                // SKIP this check on Search Engines (Google, Bing) because their links often redirect/track
                // causing valid links to look like mismatches (e.g. Text: "apple.com", Href: "google.com/url?...")
                const hostname = window.location.hostname;
                const isSearchEngine = /google|bing|yahoo|duckduckgo/.test(hostname);

                if (!isSearchEngine) {
                    // Strict Check: Only flag if the text is EXPLICITLY a domain name (e.g., "google.com")
                    // AND nothing else. If it contains spaces, newlines, or extra words, ignore it.
                    // Regex: Starts with alphanumeric, has dot, ends with alphanumeric (2+ chars). No whitespace.
                    const isStrictDomain = /^[a-zA-Z0-9-]+\.[a-zA-Z]{2,}$/.test(text);

                    if (isStrictDomain) {
                        if (!href.includes(text)) {
                            // e.g. Text is "google.com" but href is "evil.com"
                            isSuspicious = true;
                            tooltipText += `\n(⚠️ Text '${text}' does not match destination!)`;
                        }
                    }
                }

            } catch (e) {
                // Invalid URL
            }

            tooltip.textContent = tooltipText;
            if (isSuspicious) {
                tooltip.classList.add('suspicious');
                tooltip.textContent = "⚠️ SUSPICIOUS LINK: " + tooltipText;
                // Add Pulse Effect to the Anchor itself
                target.classList.add('suspicious-pulse');
            } else {
                tooltip.classList.remove('suspicious');
                target.classList.remove('suspicious-pulse');
            }

            tooltip.style.display = 'block';

            // Position next to cursor
            // We'll update position in mousemove
        }
    });

    document.addEventListener('mousemove', (event) => {
        if (tooltip.style.display === 'block') {
            const x = event.pageX + 10;
            const y = event.pageY + 10;
            tooltip.style.left = x + 'px';
            tooltip.style.top = y + 'px';
        }
    });

    document.addEventListener('mouseout', (event) => {
        const target = event.target.closest('a');
        if (target) {
            tooltip.style.display = 'none';
        }
    });
}


/**
 * Feature 2: Login Form Honeypot / Security Check
 */
function initLoginProtection() {
    function checkForInsecureLogin() {
        const passwordInputs = document.querySelectorAll('input[type="password"]');

        if (passwordInputs.length > 0) {
            if (window.location.protocol !== 'https:') {
                // Insecure page with password field!
                injectSecurityBanner();
            }
        }
    }

    function injectSecurityBanner() {
        if (document.getElementById('phishingshield-banner')) return;

        const banner = document.createElement('div');
        banner.id = 'phishingshield-banner';
        banner.innerHTML = `
            <p>⚠️ SECURITY ALERT: Unencrypted password field detected on this page. DO NOT ENTER YOUR CREDENTIALS.</p>
        `;
        document.body.prepend(banner); // Add to top of body

        // Adjust body margin if needed to not hide content, or just overlay (user request says "prominent... top of page")
        document.body.style.marginTop = '60px';
    }

    // Run immediately
    checkForInsecureLogin();

    // Also run on DOM changes in case it's an SPA
    const observer = new MutationObserver(() => {
        checkForInsecureLogin();
    });
    observer.observe(document.body, { childList: true, subtree: true });
}

/**
 * Feature 3 (Hackathon): Real-Time Risk Analysis HUD
 */
// (Old initRiskAnalysis and initLogVisit logic removed - Replaced by new structured logic at top of file)
// This space intentionally left blank to clean up the file structure during refactor.

function showRiskHUD(analysis) {
    if (document.getElementById('phishingshield-hud')) return;

    console.log("PhishingShield: Displaying HUD. Score:", analysis.score);

    const hud = document.createElement('div');
    hud.id = 'phishingshield-hud';

    // FORCE VISIBILITY: Standard CSS classes might be overridden by page styles.
    // Using inline important styles ensures the HUD is always on top.
    hud.style.cssText = "position: fixed; bottom: 20px; right: 20px; z-index: 2147483647 !important; display: block !important; width: 300px !important; opacity: 1 !important; transform: none !important;";

    // Determine color based on score
    let color = '#ffc107'; // Warning Yellow
    let level = 'Medium Risk';
    if (analysis.score >= 50) {
        color = '#dc3545'; // Danger Red
        level = 'HIGH RISK';
    }

    // Build lists
    const reasonsHtml = analysis.reasons.map(r => `<li>${r}</li>`).join('');

    hud.innerHTML = `
        <div class="hud-header" style="background-color: ${color}">
            <span class="hud-icon">🛡️</span>
            <div>
                <div class="hud-title">PhishingShield Alert</div>
                <div style="font-size: 11px; opacity: 0.9;">${analysis.primaryThreat || 'Potential Risk'}</div>
            </div>
            <div class="hud-controls">
                 <button id="hud-report" class="hud-btn" style="margin-right:5px; background:#6c757d;" title="Report as Phishing">🚩 Report</button>
                 <button id="hud-inspect" class="hud-btn" style="margin-right:5px;" title="Highlight Risky Elements">🔍 Inspect</button>
                 <button id="hud-close" class="hud-btn">×</button>
            </div>
        </div>
        <div class="hud-body">
            <div class="risk-score">
                <span class="score-val" style="color: ${color}">${analysis.score}</span> / 100
            </div>
            <div class="risk-level" style="color: ${color}">${level}</div>
            <ul class="risk-factors">
                ${reasonsHtml}
            </ul>
             <a href="#" id="hud-learn-more" style="display:block; margin-top:10px; color:${color}; font-size:12px; font-weight:bold;">Learn about these threats &rsaquo;</a>
        </div>
    `;

    document.body.appendChild(hud);

    // Event Listeners
    document.getElementById('hud-close').addEventListener('click', () => hud.remove());

    document.getElementById('hud-inspect').addEventListener('click', () => {
        activateInspectorMode(analysis);
        chrome.runtime.sendMessage({ type: "ADD_XP", amount: 50 });
    });

    document.getElementById('hud-report').addEventListener('click', () => {
        if (confirm("Report this website to the PhishingShield community?\n\nThis will flag it for review.")) {
            const currentUrl = window.location.href;
            // Fix for local files having empty hostname
            const hostname = window.location.hostname || "Local File";

            chrome.runtime.sendMessage({
                type: "REPORT_SITE",
                url: currentUrl,
                hostname: hostname
            }, (response) => {
                if (chrome.runtime.lastError) {
                    alert("❌ Report Failed: " + chrome.runtime.lastError.message + "\n\nTip: content scripts on file:// might be restricted.");
                    console.error("PhishingShield Report Error:", chrome.runtime.lastError);
                } else {
                    alert("✅ Thanks! Report submitted to Admin Portal.\n\nOpen Dashboard to view it.");
                    hud.remove();
                }
            });
        }
    });
}

/**
 * Feature 5: Visual Inspector Mode
 * Highlights elements on the page that triggered risk factors.
 */
function activateInspectorMode(analysis) {
    // 0. Spotlight Overlay
    if (!document.getElementById('phishingshield-spotlight-overlay')) {
        const overlay = document.createElement('div');
        overlay.id = 'phishingshield-spotlight-overlay';
        document.body.appendChild(overlay);

        overlay.style.display = 'block';
    }

    // Add Exit Inspector Button
    if (!document.getElementById('phishingshield-exit-inspect')) {
        const exitBtn = document.createElement('button');
        exitBtn.id = 'phishingshield-exit-inspect';
        exitBtn.innerText = "Exit Inspector Mode";
        exitBtn.style.cssText = "position: fixed; top: 20px; right: 20px; z-index: 2147483647; padding: 10px 20px; background: #007bff; color: white; border: none; border-radius: 5px; cursor: pointer; font-weight: bold; box-shadow: 0 4px 6px rgba(0,0,0,0.3);";
        exitBtn.onclick = deactivateInspectorMode;
        document.body.appendChild(exitBtn);
    }

    // 1. Highlight Urgency Keywords
    if (typeof RiskEngine !== 'undefined') {
        const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT, null, false);
        const urgencyNodes = [];

        while (walker.nextNode()) {
            const node = walker.currentNode;
            const text = node.textContent.toLowerCase();

            // Check if this text node contains any urgency keywords
            RiskEngine.urgencyKeywords.forEach(keyword => {
                if (text.includes(keyword)) {
                    // Start strict: only highlight if it's the dominant text or a significant phrase
                    if (node.parentElement && node.parentElement.tagName !== 'SCRIPT' && node.parentElement.tagName !== 'STYLE') {
                        urgencyNodes.push(node.parentElement);
                    }
                }
            });
        }

        urgencyNodes.forEach(el => {
            el.style.border = "3px solid #dc3545";
            el.style.boxShadow = "0 0 10px #dc3545";
            el.classList.add('antigravity-float'); // Add animation
            el.setAttribute("title", "⚠️ PhishingShield: Detected Urgency Keyword");
        });
    }

    // 2. Highlight Insecure Password Fields
    const passwordInputs = document.querySelectorAll('input[type="password"]');
    passwordInputs.forEach(input => {
        input.style.border = "3px solid #ff0000";
        input.style.backgroundColor = "#ffe6e6";
        input.classList.add('antigravity-float'); // Add animation
        input.setAttribute("title", "⚠️ Insecure Password Field");
    });

    // 3. Highlight Risky Links (from Download Protection)
    const links = document.querySelectorAll('a');
    links.forEach(link => {
        const href = link.href.toLowerCase();
        if (/\.[a-z0-9]{3,4}$/.test(href) && !href.includes('.html')) {
            // Executable/file check
            if (href.endsWith('.exe') || href.endsWith('.zip') || href.endsWith('.dmg')) {
                link.style.border = "2px dashed #ffc107";
                link.style.backgroundColor = "rgba(255, 193, 7, 0.2)";
            }
        }
    });

    // alert("🔍 Inspector Mode Active..."); // REMOVED for user preference
}

function deactivateInspectorMode() {
    // Remove Overlay
    const overlay = document.getElementById('phishingshield-spotlight-overlay');
    if (overlay) overlay.remove();

    // Remove Exit Button
    const exitBtn = document.getElementById('phishingshield-exit-inspect');
    if (exitBtn) exitBtn.remove();

    // Remove Highlights
    document.querySelectorAll('.antigravity-float').forEach(el => {
        el.classList.remove('antigravity-float');
        el.style.border = '';
        el.style.boxShadow = '';
        el.style.backgroundColor = '';
        el.removeAttribute('title');
    });

    document.querySelectorAll('.suspicious-pulse').forEach(el => {
        el.classList.remove('suspicious-pulse');
        el.style.border = '';
        el.style.backgroundColor = '';
    });

    // Remove link borders
    document.querySelectorAll('a').forEach(el => {
        if (el.style.border.includes('dashed')) {
            el.style.border = '';
            el.style.backgroundColor = '';
        }
    });
}

/**
 * Feature 6: Fortress Mode Clipboard Protection
 */
function initFortressClipboard(isFortressMode) {
    if (!isFortressMode) return;

    // Only block if site is risky (>70)
    ['copy', 'cut', 'paste'].forEach(event => {
        document.addEventListener(event, (e) => {
            const analysis = RiskEngine.analyzePage();
            if (analysis.score > 70) {
                e.preventDefault();
                e.stopPropagation();

                // Show mini toast
                let toast = document.createElement('div');
                toast.textContent = "🛡️ Fortress Mode: Clipboard Disabled on High-Risk Site";
                toast.style.cssText = "position:fixed; top:50%; left:50%; transform:translate(-50%, -50%); background:rgba(0,0,0,0.8); color:white; padding:15px; border-radius:5px; z-index:2147483647;";
                document.body.appendChild(toast);
                setTimeout(() => toast.remove(), 2000);
            }
        }, true); // Capture phase
    });
}

