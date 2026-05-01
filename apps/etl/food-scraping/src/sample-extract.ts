import { scrapeGoogleMaps } from './scraper.js';

async function testExtraction() {
  console.log("=== Bangkok Food Data Extraction Sample ===");
  
  // Test coordinate: Near Siam Paragon / Central World area
  const sampleLat = 13.7468;
  const sampleLng = 100.5393;
  
  const results = await scrapeGoogleMaps(sampleLat, sampleLng, "street food");
  
  console.log(`\nFound ${results.length} locations. Sample data:`);
  console.log(JSON.stringify(results.slice(0, 5), null, 2));

  if (results.length > 0) {
    console.log("\nSuccess: Data extraction working.");
  } else {
    console.log("\nNo data found. Check selectors or connectivity.");
  }
}

testExtraction().catch(console.error);
