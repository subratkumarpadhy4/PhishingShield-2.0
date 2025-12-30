document.addEventListener('DOMContentLoaded', function () {
    const emailInput = document.getElementById('email');
    const sendBtn = document.getElementById('send-btn');
    const stepEmail = document.getElementById('step-email');
    const stepReset = document.getElementById('step-reset');
    const errorMsg = document.getElementById('error-msg');
    const successMsg = document.getElementById('success-msg');
    const updateBtn = document.getElementById('update-btn');
    const otpInput = document.getElementById('otp');
    const newPassInput = document.getElementById('new-password');

    function showError(msg) {
        errorMsg.textContent = msg;
        errorMsg.style.display = 'block';
        successMsg.style.display = 'none';
    }

    function showSuccess(msg) {
        successMsg.textContent = msg;
        successMsg.style.display = 'block';
        errorMsg.style.display = 'none';
    }

    sendBtn.addEventListener('click', function () {
        const email = emailInput.value.trim();
        if (!email) {
            showError("Please enter your email address.");
            return;
        }

        sendBtn.disabled = true;
        sendBtn.textContent = "Sending...";
        errorMsg.style.display = 'none';

        if (typeof Auth === 'undefined' || !Auth.sendResetCode) {
            showError("Auth module not loaded yet.");
            sendBtn.disabled = false;
            return;
        }

        Auth.sendResetCode(email, function (response) {
            sendBtn.disabled = false;
            sendBtn.textContent = "Send Reset Code";

            if (response.success) {
                showSuccess("Code sent! Please check your email inbox (and spam).");
                stepEmail.classList.add('hidden');
                stepReset.classList.remove('hidden');
            } else {
                showError(response.message || "Failed to send code.");
            }
        });
    });

    updateBtn.addEventListener('click', function () {
        const email = emailInput.value.trim();
        const otp = otpInput.value.trim();
        const newPass = newPassInput.value.trim();

        if (!otp || !newPass) {
            showError("Please enter the code and new password.");
            return;
        }

        updateBtn.disabled = true;
        updateBtn.textContent = "Updating...";
        errorMsg.style.display = 'none';

        Auth.confirmReset(email, otp, newPass, function (response) {
            updateBtn.disabled = false;
            updateBtn.textContent = "Update Password";

            if (response.success) {
                alert("✅ Success! Your password has been updated. Please login.");
                window.location.href = "login.html";
            } else {
                showError(response.message || "Invalid code or error.");
            }
        });
    });
});
