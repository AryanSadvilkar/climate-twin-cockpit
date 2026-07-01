const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();

  try {
    console.log("Navigating...");
    await page.goto('http://127.0.0.1:3000/', { waitUntil: 'load', timeout: 30000 });
    await page.waitForTimeout(2000);
    
    // Evaluate header height
    const headerHeight = await page.evaluate(() => {
      const header = document.querySelector('header');
      return header ? header.getBoundingClientRect().height : 0;
    });

    // Evaluate progression engine height
    // It's in DashboardView.tsx, inside absolute bottom-6 div
    // Let's find the element containing 'PROGRESSION ENGINE' or similar
    const progressionHeight = await page.evaluate(() => {
      // Find the pill island wrapper
      // It has className="absolute bottom-6 z-40 transition-all duration-500 ease-in-out left-1/2 -translate-x-1/2"
      // or similar. Let's find it by looking for the text "PROGRESSION ENGINE"
      const el = Array.from(document.querySelectorAll('span')).find(el => el.textContent === 'PROGRESSION ENGINE');
      if (el) {
        // Find the wrapper with 'bottom-6'
        const wrapper = el.closest('.bottom-6');
        if (wrapper) {
            // Need the full height including bottom offset? The user said:
            // "The bottom edge of the panel must sit flush against the top edge of the Progression Engine bar with ZERO gap"
            // Wait, if it sits flush against the TOP edge of the bar, then the gap from the bottom of the viewport is:
            // (viewport bottom) - (top edge of progression engine)
            // Let's measure the actual top edge Y coordinate of the progression engine bar, and the viewport height.
            const rect = wrapper.getBoundingClientRect();
            const viewportHeight = window.innerHeight;
            return {
                height: rect.height,
                top: rect.top,
                bottomSpace: viewportHeight - rect.top // This is exactly how much space is below its top edge!
            };
        }
      }
      return null;
    });

    console.log("Header Height:", headerHeight);
    console.log("Progression Bar Info:", progressionHeight);
  } catch (e) {
    console.error(e);
  } finally {
    await browser.close();
  }
})();
