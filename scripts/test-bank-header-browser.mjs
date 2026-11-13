import assert from "node:assert/strict";
import { mkdir } from "node:fs/promises";
import { chromium } from "playwright";

const base = process.env.BANK_TEST_URL || "http://127.0.0.1:3000";
const output = "test-results/bank-header";
await mkdir(output, { recursive: true });
for (let n = 0; n < 60; n++) {
  try { if ((await fetch(base)).ok) break; } catch {}
  await new Promise(resolve => setTimeout(resolve, 1000));
}
const browser = await chromium.launch();
try {
  for (const width of [1440, 390, 320]) {
    const page = await browser.newPage({ viewport: { width, height: 1000 } });
    const errors = [];
    page.on("pageerror", error => errors.push(error.message));
    for (const [slug, code] of [["aa-hl", "AA HL"], ["aa-sl", "AA SL"], ["ai-hl", "AI HL"], ["ai-sl", "AI SL"]]) {
      await page.goto(base + "/question-bank/" + slug, { waitUntil: "domcontentloaded" });
      await page.locator(".qb-bank-frame").waitFor({ state: "visible", timeout: 60000 });
      const bank = page.frameLocator(".qb-bank-frame");
      await bank.locator(".qb-card").first().waitFor({ timeout: 60000 });
      assert.equal(await page.locator("h1").innerText(), code);
      assert.equal(await page.locator('.qb-course-switcher [aria-current="page"]').innerText(), code);
      assert.equal(await page.locator(".qb-course-highlights").count(), 0);
      assert.equal(await page.locator(".qb-dashboard-return").count(), 0);
      assert.equal(await bank.locator(".qb-header").isVisible(), false);
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth), true);
      await page.screenshot({ path: output + "/" + slug + "-" + width + ".png" });
      const first = bank.locator(".qb-card").first();
      await first.locator(".qb-ms-toggle").click();
      assert.equal(await first.locator(".qb-markscheme").isVisible(), true);
      await first.locator(".qb-ms-toggle").click();
      await first.getByRole("button", { name: "Open whiteboard", exact: true }).click();
      await first.locator(".qb-whiteboard-open-button[aria-expanded=\"true\"]").waitFor();
      await first.locator(".qb-whiteboard-close").click();
      await first.getByRole("button", { name: "Open whiteboard", exact: true }).waitFor();
      const search = bank.locator("#qb-search");
      await search.fill("zzzx-no-matching-question");
      await bank.locator(".qb-empty").waitFor();
      await search.fill("");
      await bank.locator(".qb-card").first().waitFor();
      const topic = bank.locator("#qb-topic");
      const value = await topic.locator("option").nth(1).getAttribute("value");
      assert.ok(value);
      await topic.selectOption(value);
      await bank.locator(".qb-card").first().waitFor();
      await topic.selectOption("");
      await bank.locator(".qb-card").first().waitFor();
      await page.reload({ waitUntil: "domcontentloaded" });
      await page.locator(".qb-bank-frame").waitFor({ state: "visible", timeout: 60000 });
      await page.frameLocator(".qb-bank-frame").locator(".qb-card").first().waitFor({ timeout: 60000 });
      console.log("PASS", code, width, "header, filters, mark scheme, whiteboard, reload");
    }
    await page.locator('.qb-course-switcher a[href="/question-bank/aa-hl"]').click();
    await page.waitForURL("**/question-bank/aa-hl");
    await page.frameLocator(".qb-bank-frame").locator(".qb-card").first().waitFor({ timeout: 60000 });
    assert.equal(await page.locator("h1").innerText(), "AA HL");
    assert.deepEqual(errors, [], "No browser runtime errors");
    await page.close();
  }
  // Repeated real scrolling exercises parent height and progressive batches.
  const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
  for (const route of ["/question-bank/aa-hl", "/igcse/question-bank"]) {
    await page.goto(base + route);
    const frame = page.frameLocator(route.startsWith("/igcse/") ? ".igcse-qb-frame" : ".qb-bank-frame");
    await frame.locator(".qb-card").first().waitFor({ timeout: 60000 });
    let count = await frame.locator(".qb-card").count();
    for (let batch = 0; batch < 20 && count < 300; batch++) {
      await frame.locator(".qb-card").last().scrollIntoViewIfNeeded();
      await page.waitForTimeout(800);
      count = await frame.locator(".qb-card").count();
    }
    assert.ok(count >= 300, route + " loads at least 300 questions; got " + count);
    assert.equal(await frame.locator(".qb-card").last().isVisible(), true);
    console.log("PASS", route, "repeated scrolling:", count);
  }
  await page.close();
} finally {
  await browser.close();
}
