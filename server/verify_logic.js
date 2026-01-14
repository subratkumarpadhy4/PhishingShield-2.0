
function getStartOfWeek(mockDateStr) {
    const now = new Date(mockDateStr);
    const day = now.getDay(); // 0(Sun) ... 6(Sat)
    const diffToMon = day === 0 ? 6 : day - 1;

    const startOfWeek = new Date(now);
    startOfWeek.setDate(now.getDate() - diffToMon);
    startOfWeek.setHours(0, 0, 0, 0);
    return startOfWeek;
}

const tests = [
    { name: "Current (Tue Jan 13)", input: "2026-01-13T10:00:00", expected: "Mon Jan 12 2026" },
    { name: "This Sunday (Jan 18)", input: "2026-01-18T23:59:59", expected: "Mon Jan 12 2026" },
    { name: "Next Monday (Jan 19 - RESET DAY)", input: "2026-01-19T00:01:00", expected: "Mon Jan 19 2026" },
    { name: "Next Tuesday (Jan 20)", input: "2026-01-20T10:00:00", expected: "Mon Jan 19 2026" }
];

console.log("--- Verifying Weekly Logic ---");
tests.forEach(t => {
    const result = getStartOfWeek(t.input);
    const resultStr = result.toDateString();
    const passed = resultStr === t.expected;
    console.log(`[${passed ? 'PASS' : 'FAIL'}] ${t.name}`);
    console.log(`   Input: ${t.input}`);
    console.log(`   Calc Start: ${resultStr}`);
    console.log("--------------------------");
});
