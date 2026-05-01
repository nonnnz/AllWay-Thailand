import { chromium } from 'playwright-extra';
import stealth from 'puppeteer-extra-plugin-stealth';

chromium.use(stealth());

const PROXIES = process.env.PROXY_LIST?.split(',') || [];
let currentProxyIndex = 0;

function getNextProxy() {
  if (PROXIES.length === 0) return null;
  const proxy = PROXIES[currentProxyIndex];
  currentProxyIndex = (currentProxyIndex + 1) % PROXIES.length;
  return proxy;
}

const USER_AGENTS = [
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36',
  'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:123.0) Gecko/20100101 Firefox/123.0',
  'Mozilla/5.0 (Apple) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.2 Safari/605.1.15'
];

function getFakeAgent() {
  return USER_AGENTS[Math.floor(Math.random() * USER_AGENTS.length)];
}

export async function scrapeGoogleMaps(lat: number, lng: number, keyword: string = "restaurants") {
  const proxy = getNextProxy();
  console.log(`[Scraper] Step 1: Launching browser (Headless: true)...`);
  
  const browser = await chromium.launch({ 
    headless: true, 
    proxy: proxy ? { server: proxy } : undefined
  });
  console.log(`[Scraper] Step 2: Browser launched.`);

  const context = await browser.newContext({
    viewport: { 
      width: 1280 + Math.floor(Math.random() * 100), 
      height: 800 + Math.floor(Math.random() * 100) 
    },
    userAgent: getFakeAgent()
  });
  console.log(`[Scraper] Step 3: Context created.`);

  const page = await context.newPage();
  console.log(`[Scraper] Step 4: Page created.`);

  const url = `https://www.google.com/maps/search/${encodeURIComponent(keyword)}/@${lat},${lng},17z`;
  
  console.log(`[Scraper] Step 5: Navigating to ${url}`);
  try {
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 });
    console.log(`[Scraper] Step 6: Navigation complete.`);
  } catch (err: any) {
    console.log(`[Scraper] ERROR during navigation: ${err.message}`);
    await browser.close();
    return [];
  }

  console.log(`[Scraper] Step 7: Waiting for feed...`);
  const feedSelector = 'div[role="feed"]';
  const feed = await page.waitForSelector(feedSelector, { timeout: 15000 }).catch(() => null);
  
  if (!feed) {
    console.log(`[Scraper] Step 7b: Feed not found, trying backup...`);
    await page.screenshot({ path: 'debug-no-feed.png' });
  } else {
    console.log(`[Scraper] Step 8: Feed found.`);
  }

  // Minimal extraction for debugging
  const results = [];
  const names = await page.$$eval('div.fontHeadlineSmall', elements => 
    elements.map(el => el.textContent?.trim()).filter(Boolean)
  ).catch(() => []);
  
  console.log(`[Scraper] Step 9: Extracted ${names.length} names.`);
  
  for (const name of names.slice(0, 5)) {
    results.push({ name });
  }

  await browser.close();
  console.log(`[Scraper] Step 10: Browser closed.`);
  return results;
}
