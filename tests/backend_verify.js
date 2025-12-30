const API = 'http://localhost:3000/api';

async function testBackend() {
    console.log("🧪 Testing Backend API connectivity...");

    // 1. Register User
    const testUser = {
        name: "Backend Test User",
        email: "backend_test@example.com",
        password: "password123",
        level: 1,
        xp: 0
    };

    try {
        console.log("1. Syncing User...");
        const res1 = await fetch(`${API}/users/sync`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(testUser)
        });
        const data1 = await res1.json();

        if (data1.success || data1.user) console.log("✅ User Synced");
        else console.error("❌ User Sync Failed", data1);

        console.log("2. Fetching Users...");
        const res2 = await fetch(`${API}/users`);
        const users = await res2.json();
        const userFound = users.find(u => u.email === testUser.email);
        if (userFound) console.log("✅ User Found in DB:", userFound.name);
        else console.error("❌ User Persistence Failed");

        console.log("3. Creating Report...");
        const report = {
            id: "test_" + Date.now(),
            url: "http://phishing-test.com",
            status: "pending"
        };
        const res3 = await fetch(`${API}/reports`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(report)
        });
        const data3 = await res3.json();
        if (data3.success) console.log("✅ Report Synced");

        console.log("4. Fetching Reports...");
        const res4 = await fetch(`${API}/reports`);
        const reports = await res4.json();
        const reportFound = reports.find(r => r.url === report.url);
        if (reportFound) console.log("✅ Report Found in DB");
        else console.log("❌ Report Persistence Failed");

        console.log("\n🎉 Backend Verification Complete!");

    } catch (e) {
        console.error("❌ BE Test Failed:", e.message);
        if (e.cause && e.cause.code === 'ECONNREFUSED') {
            console.error(">>> SERVER IS NOT RUNNING on port 3000. Please start it.");
        }
    }
}

testBackend();
