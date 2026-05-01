import { chromium } from 'playwright';

async function testLaunch() {
  console.log("Testing Playwright Launch...");
  try {
    const browser = await chromium.launch({ headless: true });
    console.log("Browser launched successfully!");
    await browser.close();
    console.log("Browser closed successfully!");
  } catch (err: any) {
    console.error("Launch failed:", err.message);
  }
}

testLaunch();
