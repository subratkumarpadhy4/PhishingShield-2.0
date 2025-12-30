(function () {
    // UI Elements
    let strengthFill, strengthText;

    // Password strength logic
    function checkPasswordStrength(password) {
        let strength = 0;
        let strengthLabel = '';
        let strengthClass = '';

        if (password.length >= 6) strength++;
        if (password.length >= 8) strength++;
        if (/[a-z]/.test(password) && /[A-Z]/.test(password)) strength++;
        if (/\d/.test(password)) strength++;
        if (/[^a-zA-Z\d]/.test(password)) strength++;

        if (strength <= 2) {
            strengthLabel = 'Weak';
            strengthClass = 'strength-weak';
            strengthFill.style.width = '25%';
        } else if (strength === 3) {
            strengthLabel = 'Fair';
            strengthClass = 'strength-fair';
            strengthFill.style.width = '50%';
        } else if (strength === 4) {
            strengthLabel = 'Good';
            strengthClass = 'strength-good';
            strengthFill.style.width = '75%';
        } else {
            strengthLabel = 'Strong';
            strengthClass = 'strength-strong';
            strengthFill.style.width = '100%';
        }

        strengthFill.className = 'strength-fill ' + strengthClass;
        strengthText.textContent = password.length > 0 ? `Password strength: ${strengthLabel}` : '';
    }

    // Auth Loading Logic
    let authRetries = 0;
    function waitForAuth() {
        if (typeof Auth === 'undefined') {
            authRetries++;
            if (authRetries > 50) {
                const btn = document.getElementById('signup-btn');
                if (btn) btn.textContent = "Error: Auth Failed";
                console.error("Critical: Auth module (js/auth.js) failed to load.");
                return;
            }
            setTimeout(waitForAuth, 100);
            return;
        }

        // Auth loaded - enable button
        const btnInit = document.getElementById('signup-btn');
        if (btnInit) {
            btnInit.disabled = false;
            btnInit.textContent = "Create Account";
        }
    }

    function init() {
        // Initialize UI Elements
        strengthFill = document.getElementById('strength-fill');
        strengthText = document.getElementById('strength-text');

        const passwordInput = document.getElementById('password');
        if (passwordInput) {
            passwordInput.addEventListener('input', function () {
                checkPasswordStrength(this.value);
            });
        }

        // Start waiting for Auth
        waitForAuth();

        const form = document.getElementById('signup-form');
        const nameInput = document.getElementById('name');
        const emailInput = document.getElementById('email');
        const confirmPasswordInput = document.getElementById('confirm-password');
        const signupBtn = document.getElementById('signup-btn');
        const errorMsg = document.getElementById('error-msg');
        const successMsg = document.getElementById('success-msg');
        const otpNotification = document.getElementById('otp-notification');
        const otpDisplay = document.getElementById('otp-display');

        // Handle Form Submission
        if (signupBtn) {
            signupBtn.addEventListener('click', function (e) {
                e.preventDefault();

                if (signupBtn.disabled) return;

                const name = nameInput.value.trim();
                const email = emailInput.value.trim();
                const password = passwordInput.value;
                const confirmPassword = confirmPasswordInput.value;

                // Validation
                if (!name || !email || !password || !confirmPassword) {
                    showError("Please fill in all fields.");
                    return;
                }

                /*
                if (password.length < 6) {
                    showError("Password must be at least 6 characters long.");
                    return;
                }
                */

                if (password !== confirmPassword) {
                    showError("Passwords do not match.");
                    return;
                }

                // Disable button and show loading state
                signupBtn.disabled = true;
                signupBtn.textContent = "Creating Account...";
                hideMessages();

                // Register user
                console.log("Calling Auth.register...");
                if (typeof Auth !== 'undefined') {
                    Auth.register(name, email, password, function (response) {
                        console.log("Auth Response:", response);
                        if (response.success) {
                            // Show OTP notification
                            // if (otpDisplay) otpDisplay.textContent = response.otp; // REMOVED DEMO CODE
                            if (otpNotification) otpNotification.style.display = 'block';

                            // Redirect to OTP page after 3 seconds
                            setTimeout(function () {
                                const otpUrl = (typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.getURL)
                                    ? chrome.runtime.getURL('otp.html?email=' + encodeURIComponent(email))
                                    : 'otp.html?email=' + encodeURIComponent(email);
                                window.location.href = otpUrl;
                            }, 3000);
                        } else {
                            showError(response.message || "Registration failed. Please try again.");
                            signupBtn.disabled = false;
                            signupBtn.textContent = "Create Account";
                        }
                    });
                } else {
                    showError("System Error: Auth module not loaded.");
                }
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

        function hideMessages() {
            if (errorMsg) errorMsg.style.display = 'none';
            if (successMsg) successMsg.style.display = 'none';
        }
    }

    // Start initialization
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();
