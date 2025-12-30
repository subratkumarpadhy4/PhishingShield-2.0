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

        // Password visibility toggle
        const togglePassword = document.getElementById('toggle-password');
        if (togglePassword && passwordInput) {
            togglePassword.addEventListener('click', function () {
                const type = passwordInput.getAttribute('type') === 'password' ? 'text' : 'password';
                passwordInput.setAttribute('type', type);

                // Update icon
                const eyeIcon = document.getElementById('eye-icon');
                if (type === 'text') {
                    // Eye with slash (hidden)
                    eyeIcon.innerHTML = `
                        <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path>
                        <line x1="1" y1="1" x2="23" y2="23"></line>
                    `;
                } else {
                    // Normal eye
                    eyeIcon.innerHTML = `
                        <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
                        <circle cx="12" cy="12" r="3"></circle>
                    `;
                }
            });
        }
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();
