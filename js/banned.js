// banned.js - Handles banned page functionality
// This file is loaded externally to comply with CSP (Content Security Policy)

(function() {
    'use strict';
    
    console.log('[PhishingShield] banned.js loaded');

    // Initialize when DOM is ready
    function init() {
        // Get URL from query parameter
        const urlParams = new URLSearchParams(window.location.search);
        const blockedUrl = urlParams.get('url') || 'Unknown URL';

        // Display the blocked URL
        const blockedUrlElement = document.getElementById('blocked-url');
        if (blockedUrlElement) {
            blockedUrlElement.textContent = blockedUrl;
            console.log('[PhishingShield] Blocked URL displayed:', blockedUrl);
        }

        // Deduct 500 XP for visiting a banned website
        // Use sessionStorage to prevent duplicate penalties on page refresh (within 30 seconds)
        const penaltyKey = 'banned_penalty_' + encodeURIComponent(blockedUrl);
        const lastPenaltyTime = sessionStorage.getItem(penaltyKey);
        const now = Date.now();
        const PENALTY_COOLDOWN = 30000; // 30 seconds cooldown to prevent refresh spam
        
        if (!lastPenaltyTime || (now - parseInt(lastPenaltyTime)) > PENALTY_COOLDOWN) {
            console.log('[PhishingShield] Applying 500 XP penalty for visiting banned website');
            
            // Mark penalty as applied (with timestamp)
            sessionStorage.setItem(penaltyKey, now.toString());
            
            // Deduct 500 XP
            chrome.runtime.sendMessage({
                type: 'ADD_XP',
                amount: -500
            }, function(response) {
                if (response && response.success) {
                    console.log('[PhishingShield] ✅ 500 XP penalty applied');
                } else {
                    console.error('[PhishingShield] Failed to apply XP penalty');
                }
            });
        } else {
            const timeSincePenalty = Math.floor((now - parseInt(lastPenaltyTime)) / 1000);
            console.log(`[PhishingShield] Penalty already applied ${timeSincePenalty}s ago (cooldown active)`);
        }

        // Go Back button
        const goBackBtn = document.getElementById('go-back-btn');
        if (goBackBtn) {
            goBackBtn.addEventListener('click', function() {
                console.log('[PhishingShield] Go Back clicked');
                if (window.history.length > 1) {
                    window.history.back();
                } else {
                    window.location.href = 'about:blank';
                }
            });
            console.log('[PhishingShield] ✅ Go Back button handler attached');
        } else {
            console.error('[PhishingShield] ❌ Go Back button not found!');
        }

        // Go Home button
        const goHomeBtn = document.getElementById('go-home-btn');
        if (goHomeBtn) {
            goHomeBtn.addEventListener('click', function() {
                console.log('[PhishingShield] Go Home clicked');
                window.location.href = 'https://www.google.com';
            });
            console.log('[PhishingShield] ✅ Go Home button handler attached');
        } else {
            console.error('[PhishingShield] ❌ Go Home button not found!');
        }

        // Proceed Anyway button
        const proceedBtn = document.getElementById('proceed-anyway-btn');
        if (proceedBtn) {
            // Add hover effects using event listeners (replaces inline onmouseover/onmouseout)
            proceedBtn.addEventListener('mouseenter', function() {
                this.style.background = '#dc3545';
                this.style.color = 'white';
            });
            
            proceedBtn.addEventListener('mouseleave', function() {
                this.style.background = 'white';
                this.style.color = '#dc3545';
            });

            // Add click handler (replaces inline onclick)
            proceedBtn.addEventListener('click', function() {
                console.log('[PhishingShield] Proceed Anyway button clicked on banned.html');
                console.log('[PhishingShield] Blocked URL:', blockedUrl);

                if (confirm('⚠️ FINAL WARNING\n\nThis site has been banned by PhishingShield administrators.\n\nProceeding may result in:\n• Identity theft\n• Financial loss\n• Malware infection\n• Data breach\n\nAre you absolutely sure you want to continue?')) {
                    console.log('[PhishingShield] User confirmed, attempting navigation...');
                    if (blockedUrl && blockedUrl !== 'Unknown URL') {
                        // Normalize URL for consistent matching
                        let normalizedUrl = blockedUrl;
                        try {
                            const urlObj = new URL(blockedUrl);
                            // Store both full URL and hostname for flexible matching
                            normalizedUrl = urlObj.href;
                        } catch (e) {
                            // If URL parsing fails, use as-is
                            normalizedUrl = blockedUrl;
                        }
                        
                        // Store bypass token for one-time use
                        const bypassToken = {
                            url: normalizedUrl,
                            timestamp: Date.now(),
                            used: false
                        };
                        
                        // Store in chrome.storage.local (if available) or sessionStorage
                        if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
                            chrome.storage.local.get(['bypassTokens'], function(data) {
                                const tokens = data.bypassTokens || [];
                                // Remove any existing token for this URL (prevent duplicates)
                                const filteredTokens = tokens.filter(t => t.url !== normalizedUrl);
                                filteredTokens.push(bypassToken);
                                chrome.storage.local.set({ bypassTokens: filteredTokens }, function() {
                                    console.log('[PhishingShield] Bypass token stored for one-time use:', normalizedUrl);
                                    // Notify background script to update blocklist (exclude this URL)
                                    chrome.runtime.sendMessage({ 
                                        type: "UPDATE_BLOCKLIST",
                                        bypassUrl: normalizedUrl 
                                    }, function(response) {
                                        // Wait for blocklist to be updated before navigating
                                        if (response && response.success) {
                                            console.log('[PhishingShield] Blocklist updated, navigating to:', blockedUrl);
                                            // Use a small delay to ensure rules are applied
                                            setTimeout(function() {
                                                window.location.href = blockedUrl;
                                            }, 200);
                                        } else {
                                            // Fallback: try navigation anyway after a delay
                                            console.warn('[PhishingShield] Blocklist update response unclear, attempting navigation');
                                            setTimeout(function() {
                                                window.location.href = blockedUrl;
                                            }, 300);
                                        }
                                    });
                                });
                            });
                        } else {
                            // Fallback to sessionStorage
                            const tokens = JSON.parse(sessionStorage.getItem('bypassTokens') || '[]');
                            const filteredTokens = tokens.filter(t => t.url !== normalizedUrl);
                            filteredTokens.push(bypassToken);
                            sessionStorage.setItem('bypassTokens', JSON.stringify(filteredTokens));
                            console.log('[PhishingShield] Bypass token stored (sessionStorage)');
                            window.location.href = blockedUrl;
                        }
                    } else {
                        console.error('[PhishingShield] Cannot proceed - URL is:', blockedUrl);
                        alert('Cannot proceed - URL not available');
                    }
                } else {
                    console.log('[PhishingShield] User cancelled navigation');
                }
            });
            console.log('[PhishingShield] ✅ Proceed Anyway button handler attached');
        } else {
            console.error('[PhishingShield] ❌ Proceed Anyway button not found!');
        }

        // Log the block event
        console.log('[PhishingShield] Community-banned site blocked:', blockedUrl);
    }

    // Run when DOM is ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        // DOM already loaded
        init();
    }
})();
