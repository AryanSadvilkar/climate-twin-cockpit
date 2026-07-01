const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();
  
  const missingDistricts = [];
  page.on('console', msg => {
    const text = msg.text();
    if (text.includes('Missing or invalid data for district:')) {
      const parts = text.split('Missing or invalid data for district:');
      if (parts.length > 1) {
        missingDistricts.push(parts[1].trim());
      }
    }
  });

  try {
    console.log("Navigating...");
    await page.goto('http://127.0.0.1:3000/', { waitUntil: 'load', timeout: 30000 });
    
    // wait for map to load
    await page.waitForTimeout(3000);
    
    console.log("Clicking Maharashtra...");
    await page.mouse.click(400, 400); 
    await page.waitForTimeout(2000);
    
    // Switch to precip layer
    await page.mouse.click(100, 350); 
    
    console.log("Waiting for fetch...");
    await page.waitForTimeout(4000);
    
    console.log("Found missing districts: ", [...new Set(missingDistricts)]);
  } catch (e) {
    console.error(e);
  } finally {
    await browser.close();
  }
})();
