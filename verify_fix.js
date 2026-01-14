// const fetch = require('node-fetch'); // Native fetch in Node 18+
const fs = require('fs');

const API_URL = 'http://localhost:3000/api';
const TEST_USER = {
    email: 'zombie_test@example.com',
    name: 'Zombie Tester',
    xp: 100
};

function log(msg) {
    console.log(msg);
    fs.appendFileSync('verify_result.log', msg + '\n');
}

async function test() {
    fs.writeFileSync('verify_result.log', ''); // Clear file
    log("🧪 Starting Zombie User Fix Verification...");

    // 1. Create User (Sync)
    try {
        log("1. Creating Test User...");
        const res1 = await fetch(`${API_URL}/users/sync`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(TEST_USER)
        });
        const data1 = await res1.json();
        if (res1.status === 200) log("✅ User Created: " + data1.success);
        else log("❌ Failed to create user: " + JSON.stringify(data1));

        // 2. Delete User
        log("2. Deleting Test User...");
        const res2 = await fetch(`${API_URL}/users/delete`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email: TEST_USER.email })
        });
        const data2 = await res2.json();
        if (data2.success) log("✅ User Deleted");
        else log("❌ Failed to delete user: " + JSON.stringify(data2));

        // 3. Attempt Resurrection (Sync after delete)
        log("3. Attempting Resurrection (Sync)...");
        const res3 = await fetch(`${API_URL}/users/sync`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(TEST_USER)
        });

        const data3 = await res3.json();

        if (res3.status === 410 && data3.error === 'USER_DELETED') {
            log("✅ SUCCESS: Server rejected zombie user!");
            log("   Status: " + res3.status);
            log("   Message: " + data3.message);
        } else {
            log("❌ FAILURE: Server allowed zombie user (or wrong error).");
            log("   Status: " + res3.status);
            log("   Data: " + JSON.stringify(data3));
        }

    } catch (e) {
        log("❌ CRTICAL ERROR during test: " + e.message);
    }
}

test();
