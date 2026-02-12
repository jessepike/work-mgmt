/**
 * Auth smoke test — validates middleware enforcement.
 *
 * Usage:
 *   API_SECRET=<secret> npm run test:auth
 *   API_SECRET=<secret> node scripts/auth-smoke-test.mjs
 */

const API_BASE = process.env.API_URL || "http://localhost:3005";
const API_SECRET = process.env.API_SECRET;

if (!API_SECRET) {
    console.error("ERROR: API_SECRET env var required");
    process.exit(1);
}

let passed = 0;
let failed = 0;

async function test(name, fn) {
    try {
        await fn();
        console.log(`  PASS  ${name}`);
        passed++;
    } catch (err) {
        console.error(`  FAIL  ${name}: ${err.message}`);
        failed++;
    }
}

function assert(condition, message) {
    if (!condition) throw new Error(message);
}

console.log("\nAuth Smoke Tests\n");

// Test 1: Unauthenticated request → 401
await test("Unauthenticated request returns 401", async () => {
    const res = await fetch(`${API_BASE}/api/projects`);
    assert(res.status === 401, `Expected 401, got ${res.status}`);
});

// Test 2: Valid API_SECRET → 200
await test("Valid API_SECRET returns 200", async () => {
    const res = await fetch(`${API_BASE}/api/projects`, {
        headers: { Authorization: `Bearer ${API_SECRET}` },
    });
    assert(res.status === 200, `Expected 200, got ${res.status}`);
});

// Test 3: Invalid secret → 401
await test("Invalid API_SECRET returns 401", async () => {
    const res = await fetch(`${API_BASE}/api/projects`, {
        headers: { Authorization: "Bearer invalid-secret-value" },
    });
    assert(res.status === 401, `Expected 401, got ${res.status}`);
});

console.log(`\nResults: ${passed} passed, ${failed} failed\n`);
process.exit(failed > 0 ? 1 : 0);
