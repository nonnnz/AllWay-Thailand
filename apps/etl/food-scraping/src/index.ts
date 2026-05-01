import { generateGrid } from './grid.js';
import { scrapeGoogleMaps } from './scraper.js';
import { analyzeMenu } from './ai.js';
import { saveFoodData } from './db.js';

async function main() {
  console.log("[ETL] Initializing Bangkok Food Scraping Pipeline...");
  
  const grid = generateGrid();
  console.log(`[ETL] Generated ${grid.length} grid points.`);

  // For POC, we might want to start with a subset
  const subset = grid.slice(0, 10); 

  for (const point of subset) {
    const places = await scrapeGoogleMaps(point.lat, point.lng);
    
    for (const place of places) {
      // 1. Scrape menu images if possible
      // 2. Use Gemini to analyze
      // 3. Save to DB
    }
  }
}

main().catch(console.error);
