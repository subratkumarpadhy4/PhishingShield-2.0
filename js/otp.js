(function () {
    let authRetries = 0;
    function init() {
        if (typeof Auth === 'undefined') {
            authRetries++;
            if (authRetries > 50) {
                const btn = document.getElementById('verify-btn');
                if (btn) btn.textContent = "Error: Auth Failed";
                console.error("Critical: Auth module failed to load.");
                return;
            }
            setTimeout(init, 100);
            return;
        }

        // Auth loaded
        const btnInit = document.getElementById('verify-btn');
        if (btnInit) {
            btnInit.disabled = false;
            btnInit.textContent = "Verify Account";
        }

        // Get Email from URL
        const params = new URLSearchParams(window.location.search);
        const email = params.get('email');
        if (email) document.getElementById('email-display').innerText = email;

        const otpInput = document.getElementById('otp');
        const verifyBtn = document.getElementById('verify-btn');
        const errorMsg = document.getElementById('error-msg');
        const resendLink = document.getElementById('resend-link');

        if (verifyBtn) {
            verifyBtn.addEventListener('click', function () {
                const code = otpInput.value.trim();
                if (code.length !== 4) {
                    errorMsg.textContent = "Please enter 4 digits.";
                    errorMsg.style.display = 'block';
                    return;
                }

                verifyBtn.disabled = true;
                verifyBtn.textContent = "Verifying...";
                errorMsg.style.display = 'none';

                Auth.verifyOTP(code, function (response) {
                    if (response.success) {
                        alert("✅ Success! You are now logged in.");
                        // Attempt to close or redirect
                        try {
                            window.close();
                        } catch (e) { console.error(e); }
                        // Fallback
                        // window.location.href = 'dashboard.html';
                    } else {
                        errorMsg.textContent = response.message || "Invalid Code.";
                        errorMsg.style.display = 'block';
                        verifyBtn.disabled = false;
                        verifyBtn.textContent = "Verify Account";
                    }
                });
            });
        }

        if (resendLink) {
            resendLink.addEventListener('click', function () {
                alert("A new code has been sent! (Simulated)");
            });
        }
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();
