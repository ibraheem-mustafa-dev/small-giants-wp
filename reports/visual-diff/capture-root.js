const { chromium } = require('playwright');
(async () => {
  const browser = await chromium.launch();
  const url = 'https://sandybrown-nightingale-600381.hostingersite.com/?_=' + Date.now();
  const ctx = await browser.newContext({viewport:{width:1440,height:900},deviceScaleFactor:1});
  const page = await ctx.newPage();
  page.on('pageerror', e => console.log('err:', e.message));
  page.on('console', m => { if (m.type()==='error') console.log('console err:', m.text()); });
  await page.goto(url, {waitUntil:'networkidle', timeout: 60000});
  await page.waitForTimeout(2000);
  await page.screenshot({path: 'sandybrown-root-1440.png', fullPage: true});
  console.log('captured root');
  await ctx.close();
  await browser.close();
})();
