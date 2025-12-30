// banned.js - Handles banned page functionality
console.log('[PhishingShield] banned.js loaded');

// Get URL from query parameter
const urlParams = new URLSearchParams(window.location.search);
const blockedUrl = urlParams.get('url') || 'Unknown URL';

// Display the blocked URL
const blockedUrlElement = document.getElementById('blocked-url');
if (blockedUrlElement) {
    blockedUrlElement.textContent = blockedUrl;
    console.log('[PhishingShield] Blocked URL displayed:', blockedUrl);
}

// Go Back button
const goBackBtn = document.getElementById('go-back-btn');
console.log('[PhishingShield] Go Back button element:', goBackBtn);
if (goBackBtn) {
    goBackBtn.onclick = function () {
        console.log('[PhishingShield] Go Back clicked');
        if (window.history.length > 1) {
            window.history.back();
        } else {
            window.location.href = 'about:blank';
        }
    };
    console.log('[PhishingShield] ✅ Go Back button handler attached');
} else {
    console.error('[PhishingShield] ❌ Go Back button not found!');
}

// Go Home button
const goHomeBtn = document.getElementById('go-home-btn');
console.log('[PhishingShield] Go Home button element:', goHomeBtn);
if (goHomeBtn) {
    goHomeBtn.onclick = function () {
        console.log('[PhishingShield] Go Home clicked');
        window.location.href = 'https://www.google.com';
    };
    console.log('[PhishingShield] ✅ Go Home button handler attached');
} else {
    console.error('[PhishingShield] ❌ Go Home button not found!');
}

// Log the block event
console.log('[PhishingShield] Community-banned site blocked:', blockedUrl);
