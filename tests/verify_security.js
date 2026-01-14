
const axios = require('axios');

const BASE_URL = 'http://localhost:3000/api';

async function testRateLimit() {
    console.log('\n--- Testing Admin Rate Limiting ---');
    console.log('Attempting 16 failed logins (Limit is 15)...');

    for (let i = 1; i <= 16; i++) {
        try {
            const response = await axios.post(`${BASE_URL}/auth/admin/login`, {
                email: 'admin@example.com',
                password: 'wrong_password'
            });
            console.log(`Attempt ${i}: Success (Unexpected: ${response.status})`);
        } catch (error) {
            if (error.response) {
                if (error.response.status === 429) {
                    console.log(`Attempt ${i}: ✅ BLOCKED by Rate Limiter (Status 429)`);
                    console.log('SUCCESS: Rate limiting is working!');
                    return;
                }
                console.log(`Attempt ${i}: Failed as expected (Status ${error.response.status})`);
            } else {
                console.log(`Attempt ${i}: Error - ${error.message}`);
            }
        }
    }
    console.log('❌ FAILURE: Rate limiter did not trigger after 16 attempts.');
}

async function testOTPStructure() {
    console.log('\n--- Testing OTP Generation (Structure Check) ---');
    try {
        const email = 'testuser@example.com';
        const res = await axios.post(`${BASE_URL}/send-otp`, { email });
        console.log(`OTP Request: ${res.data.success ? '✅ Sent' : '❌ Failed'}`);
        console.log('Note: We cannot verify Expiry programmatically without waiting 10 mins,');
        console.log('but the server logs should show the creation.');
    } catch (error) {
        console.error('OTP Test Error:', error.message);
    }
}

async function runVerify() {
    console.log('Starting Security Verification...');
    console.log('Ensure server is running on port 3000');

    await testRateLimit();
    // await testOTPStructure(); // Optional, focus on rate limit first
}

runVerify();
