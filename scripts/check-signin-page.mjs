const url = process.argv[2] || "http://localhost:3000/sign-in";
const html = await fetch(url).then((r) => r.text());
const pk = html.match(/data-clerk-publishable-key="([^"]+)"/);
console.log("url:", url);
const key = pk?.[1] ?? null;
const env = key?.startsWith("pk_live")
  ? "PRODUCTION (no Development mode badge)"
  : key?.startsWith("pk_test")
    ? "DEVELOPMENT (Development mode badge expected)"
    : "UNKNOWN";
console.log("publishableKey:", key ? `${key.slice(0, 12)}...` : "MISSING");
console.log("clerkEnvironment:", env);
console.log("clerk.browser.js:", html.includes("clerk.browser.js"));
console.log("ui.browser.js:", html.includes("ui.browser.js"));
console.log("clerk component markup:", /cl-(signIn|root|card)/i.test(html));
console.log(
  "after logo:",
  html.includes("StudyBuddy") &&
    html.split("StudyBuddy").pop()?.slice(0, 250).replace(/\s+/g, " ")
);
