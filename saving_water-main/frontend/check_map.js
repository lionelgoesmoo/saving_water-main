const { chromium } = require('playwright');
(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  await page.goto('http://localhost:3000');
  await page.waitForTimeout(3000);
  
  const mapCanvas = await page.$('.maplibregl-canvas');
  if (mapCanvas) {
    const box = await mapCanvas.boundingBox();
    console.log("Canvas Box:", box);
  } else {
    console.log("No maplibregl-canvas found!");
  }
  
  const mapContainer = await page.$('.maplibregl-map');
  if (mapContainer) {
    const box = await mapContainer.boundingBox();
    console.log("Container Box:", box);
  } else {
    console.log("No maplibregl-map found!");
  }

  await browser.close();
})();
