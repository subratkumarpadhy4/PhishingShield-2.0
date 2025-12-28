const urlParams = new URLSearchParams(window.location.search);
const targetUrl = urlParams.get('url');

// Log this as a "Rescued" / "Blocked" event
if (targetUrl) {
    try {
        const urlObj = new URL(targetUrl);
        chrome.runtime.sendMessage({
            type: "LOG_VISIT",
            data: {
                url: targetUrl,
                hostname: urlObj.hostname,
                score: 999, // Special code for "Blocked/Rescued"
                timestamp: Date.now()
            }
        });
    } catch (e) {
        console.error("Error logging blocked visit", e);
    }
}

document.getElementById('go-back').addEventListener('click', () => {
    history.back();
});

document.getElementById('proceed-unsafe').addEventListener('click', (e) => {
    e.preventDefault();
    if (targetUrl) {
        chrome.runtime.sendMessage({ type: "ALLOW_TEMPORARY", url: targetUrl }, (response) => {
            if (response && response.success) {
                window.location.href = targetUrl;
            } else {
                alert("Failed to whitelist URL. Please try again.");
            }
        });
    }
});
