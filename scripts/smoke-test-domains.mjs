/**
 * Smoke-test marketing + app production domains.
 * Usage: node scripts/smoke-test-domains.mjs
 */

const MARKETING_URL = process.env.MARKETING_URL ?? "https://studybuddy.al";
const APP_URL = process.env.APP_URL ?? "https://app.studybuddy.al";

async function check(name, url, { requireOk = true } = {}) {
  try {
    const response = await fetch(url, { redirect: "follow" });
    const ok = response.status >= 200 && response.status < 400;
    console.log(
      ok ? "PASS" : requireOk ? "FAIL" : "WARN",
      `${name}: ${url} → HTTP ${response.status}`
    );
    return requireOk ? ok : true;
  } catch (error) {
    console.log(requireOk ? "FAIL" : "WARN", `${name}: ${url} → ${error.message}`);
    return !requireOk;
  }
}

const results = await Promise.all([
  check("Marketing", MARKETING_URL),
  check("App sign-in", `${APP_URL}/sign-in`),
  check("App root (dashboard)", APP_URL, { requireOk: false }),
]);

if (results.every(Boolean)) {
  console.log("\nAll checks passed.");
  process.exit(0);
}

console.log("\nSome checks failed. See docs/DEPLOYMENT.md for setup steps.");
process.exit(1);
