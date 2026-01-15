// tests/test_fix_reporter_match.js

async function testFix() {
    const API_URL = 'http://localhost:3000/api';
    const EMAIL = 'fix_user@example.com';
    const DISPLAY_NAME = `Test User (${EMAIL})`;

    console.log(`[Test-Fix] Testing Fuzzy Match for: "${DISPLAY_NAME}"`);

    // 1. Submit a Legacy-style Report
    const reportData = {
        url: 'http://legacy-format-test.com',
        hostname: 'legacy-format-test.com',
        reporter: DISPLAY_NAME, // "Name (email)" format
        status: 'pending'
    };

    try {
        const postRes = await fetch(`${API_URL}/reports`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(reportData)
        });

        const postJson = await postRes.json();
        const reportId = postJson.report.id;
        console.log('[Test-Fix] Report submitted ID:', reportId);

        // 2. Fetch using ONLY Email (Simulating Dashboard)
        console.log(`[Test-Fix] Querying API with reporter=${EMAIL}...`);
        const getRes = await fetch(`${API_URL}/reports?reporter=${encodeURIComponent(EMAIL)}`);
        const reports = await getRes.json();

        const found = reports.find(r => r.id === reportId);
        if (found) {
            console.log('✅ PASS: Server found report using fuzzy email match!');
        } else {
            console.error('❌ FAIL: Report not returned. Filter logic is still too strict.');
            console.log('Returned Reports Reporter Fields:', reports.map(r => r.reporter));
        }

    } catch (e) {
        console.error('Test Failed:', e.message);
    }
}

testFix();
