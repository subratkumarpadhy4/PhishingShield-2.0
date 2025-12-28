(function () {
    let authRetries = 0;
    function init() {
        if (typeof Auth === 'undefined') {
            authRetries++;
            if (authRetries > 50) {
                const btn = document.getElementById('login-btn');
                if (btn) btn.textContent = "Error: Auth Failed";
                console.error("Critical: Auth module failed to load.");
                return;
            }
            setTimeout(init, 100);
            return;
        }

        // Auth loaded
        const btnInit = document.getElementById('login-btn');
        if (btnInit) {
            btnInit.disabled = false;
            btnInit.textContent = "Secure Login";
        }

        const emailInput = document.getElementById('email');
        const passwordInput = document.getElementById('password');
        const loginBtn = document.getElementById('login-btn');
        const errorMsg = document.getElementById('error-msg');
        const successMsg = document.getElementById('success-msg');

        function showError(message) {
            errorMsg.textContent = message;
            errorMsg.style.display = 'block';
            successMsg.style.display = 'none';
        }

        function showSuccess(message) {
            successMsg.textContent = message;
            successMsg.style.display = 'block';
            errorMsg.style.display = 'none';
        }

        if (loginBtn) {
            loginBtn.addEventListener('click', function (e) {
                e.preventDefault();

                const email = emailInput.value.trim();
                const password = passwordInput.value;

                if (!email || !password) {
                    showError("Please enter email and password.");
                    return;
                }

                loginBtn.disabled = true;
                loginBtn.textContent = "Verifying...";
                errorMsg.style.display = 'none';

                Auth.login(email, password, function (response) {
                    if (response.success) {
                        showSuccess("✅ Login Successful! Redirecting...");

                        setTimeout(() => {
                            try {
                                window.close();
                            } catch (e) { console.error(e); }
                            alert("You are now logged in! You can close this tab and open the extension.");
                        }, 1000);

                    } else {
                        showError(response.message || "Login failed.");
                        loginBtn.disabled = false;
                        loginBtn.textContent = "Secure Login";
                    }
                });
            });
        }
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();
