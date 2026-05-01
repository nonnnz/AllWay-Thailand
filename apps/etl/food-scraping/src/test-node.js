import { chromium } from 'playwright';

console.log("Testing Playwright Launch with Node.js (ESM)...");
try {
  const browser = await chromium.launch({ headless: true });
  console.log("Browser launched successfully!");
  const page = await browser.newPage();
  console.log("Page created!");
  await page.goto('https://example.com');
  console.log("Navigated to example.com");
  await browser.close();
  console.log("Browser closed successfully!");
} catch (err) {
  console.error("Launch failed:", err.message);
}
