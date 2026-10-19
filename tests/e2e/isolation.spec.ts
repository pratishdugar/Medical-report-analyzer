import { expect, test, type Page } from "@playwright/test";
import { strFromU8, unzipSync } from "fflate";

/*
 * End-to-end proof that one account can never reach another account's data
 * through any HTTP surface: pages, file downloads, status/export APIs.
 */

async function signup(page: Page, name: string) {
  const email = `${name.toLowerCase().replace(/\W/g, "")}-${Date.now()}@e2e.test`;
  await page.goto("/signup");
  await page.fill("#name", name);
  await page.fill("#email", email);
  await page.fill("#password", "a long and memorable phrase");
  for (const n of ["terms", "age", "health"]) await page.check(`input[name="${n}"]`);
  await page.click('button[type="submit"]');
  await page.waitForURL(/family\?first=1/);
  await page.fill('input[name="dateOfBirth"]', "1980-03-15");
  await page.selectOption('select[name="sex"]', "male");
  await page.click('button[type="submit"]');
  await page.waitForURL(/dashboard/);
  return email;
}

async function upload(page: Page, file: string) {
  await page.goto("/reports/upload");
  await page.setInputFiles("#file", `samples/${file}`);
  await page.click('button[type="submit"]');
  await page.waitForURL(/\/reports\/[0-9a-f-]{36}$/);
  await expect(page.getByText("Processing…")).toHaveCount(0, { timeout: 90_000 });
  return page.url().split("/reports/")[1];
}

test("users cannot access each other's reports, files or exports", async ({ browser }) => {
  const alice = await (await browser.newContext()).newPage();
  await signup(alice, "Alice Iyer");
  const reportId = await upload(alice, "sample-report-jan-2026.pdf");
  await expect(alice.getByText("Glucose Fasting (FBS)")).toBeVisible();
  const ownFile = await alice.request.get(`/api/files/${reportId}`);
  expect(ownFile.status()).toBe(200);
  expect(ownFile.headers()["content-type"]).toBe("application/pdf");

  const bob = await (await browser.newContext()).newPage();
  await signup(bob, "Bob Khan");

  // Pages
  const res = await bob.goto(`/reports/${reportId}`);
  expect(res?.status()).toBe(404);
  await expect(bob.getByText("Glucose Fasting (FBS)")).toHaveCount(0);
  // Original file
  expect((await bob.request.get(`/api/files/${reportId}`)).status()).toBe(404);
  // Status API
  expect((await bob.request.get(`/api/reports/${reportId}/status`)).status()).toBe(404);
  // Bob's own data views are empty
  await bob.goto("/dashboard");
  await expect(bob.getByText("Let's add your first report")).toBeVisible();
  await bob.goto("/trends");
  await expect(bob.getByText("No results yet")).toBeVisible();
  // Export contains only Bob's data
  const exp = await bob.request.get("/api/export");
  expect(exp.status()).toBe(200);
  const files = unzipSync(new Uint8Array(await exp.body()));
  const data = JSON.parse(strFromU8(files["data.json"])) as { profiles: { name: string }[]; reports: unknown[]; observations: unknown[] };
  expect(data.profiles.map((p) => p.name)).toEqual(["Bob Khan"]);
  expect(data.reports).toHaveLength(0);
  expect(data.observations).toHaveLength(0);
  expect(JSON.stringify(data)).not.toContain(reportId);
  expect(Object.keys(files).some((f) => f.startsWith("files/"))).toBe(false);

  // Alice's own export does include her report and original file.
  const aliceExport = unzipSync(new Uint8Array(await (await alice.request.get("/api/export")).body()));
  expect(strFromU8(aliceExport["data.json"])).toContain(reportId);
  expect(Object.keys(aliceExport).some((f) => f.startsWith("files/") && f.endsWith(".pdf"))).toBe(true);
});

test("unauthenticated and cross-site requests are refused", async ({ browser, request }) => {
  const anon = await (await browser.newContext()).newPage();
  await anon.goto("/dashboard");
  await expect(anon).toHaveURL(/\/login\?next=%2Fdashboard/);
  expect((await request.get("/api/files/11111111-1111-4111-8111-111111111111")).status()).toBe(401);
  expect((await request.get("/api/export")).status()).toBe(401);

  // A logged-in user's cookies must not be usable from another origin (CSRF).
  const page = await (await browser.newContext()).newPage();
  await signup(page, "Csrf Tester");
  const forged = await page.request.post("/api/reports", {
    headers: { origin: "https://evil.example" },
    multipart: { file: { name: "x.pdf", mimeType: "application/pdf", buffer: Buffer.from("%PDF-1.4 test") } },
  });
  expect(forged.status()).toBe(403);
});

test("security headers are present", async ({ request }) => {
  const res = await request.get("/login");
  const h = res.headers();
  expect(h["content-security-policy"]).toContain("frame-ancestors 'none'");
  expect(h["content-security-policy"]).toMatch(/script-src 'self' 'nonce-/);
  expect(h["x-frame-options"]).toBe("DENY");
  expect(h["x-content-type-options"]).toBe("nosniff");
  expect(h["x-powered-by"]).toBeUndefined();
});

test("uploads are checked by content, not by extension", async ({ browser }) => {
  const page = await (await browser.newContext()).newPage();
  await signup(page, "Upload Tester");
  const profileId = await page.locator("#profile-switch").inputValue();
  const origin = new URL(page.url()).origin;
  const res = await page.request.post("/api/reports", {
    headers: { origin },
    multipart: { profileId, file: { name: "report.pdf", mimeType: "application/pdf", buffer: Buffer.from("<html><script>alert(1)</script></html>") } },
  });
  expect(res.status()).toBe(415);
});
