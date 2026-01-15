// tests/test_my_reports_api.js

async function testMyReports() {
    const API_URL = 'http://localhost:3000/api';
    const TEST_USER = 'test_reporter_' + Date.now() + '@example.com';
    const OTHER_USER = 'other_user@example.com';

    console.log(`[Test] Starting My Reports API Test for ${TEST_USER}`);

    // 1. Submit a Report
    const reportData = {
        url: 'http://example-phishing-test.com',
        hostname: 'example-phishing-test.com',
        reporter: TEST_USER,
        status: 'pending'
    };

    try {
        const postRes = await fetch(`${API_URL}/reports`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(reportData)
        });

        if (!postRes.ok) throw new Error(`POST failed: ${postRes.status}`);
        const postJson = await postRes.json();
        console.log('[Test] Report submitted:', postJson.report.id);

        // 2. Fetch Reports for Test User
        const getRes = await fetch(`${API_URL}/reports?reporter=${encodeURIComponent(TEST_USER)}`);
        const myReports = await getRes.json();

        const found = myReports.find(r => r.id === postJson.report.id);
        if (found) {
            console.log('✅ PASS: Report found for correct user.');
        } else {
            console.error('❌ FAIL: Report NOT found for correct user.');
        }

        // 3. Fetch Reports for Other User
        const getOther = await fetch(`${API_URL}/reports?reporter=${encodeURIComponent(OTHER_USER)}`);
        const otherReports = await getOther.json();
        const foundInOther = otherReports.find(r => r.id === postJson.report.id);

        if (!foundInOther) {
            console.log('✅ PASS: Report NOT found for other user (filtered correctly).');
        } else {
            console.error('❌ FAIL: Data leak! Report found for wrong user.');
        }

    } catch (e) {
        console.log('⚠️ Test Skipped/Failed: Server might be offline or fetch not supported.');
        console.error('Error:', e.message);
    }
}

testMyReports();
