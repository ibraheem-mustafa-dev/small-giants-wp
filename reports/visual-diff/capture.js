const { chromium } = require('playwright');
(async () => {
  const browser = await chromium.launch();
  const url = 'https://palestine-lives.org/mamas-munches-homepage-test/';
  const viewports = [{w:375,h:812},{w:768,h:1024},{w:1440,h:900}];
  for (const vp of viewports) {
    const ctx = await browser.newContext({viewport:{width:vp.w,height:vp.h},deviceScaleFactor:1});
    const page = await ctx.newPage();
    page.on('pageerror', e => console.log(`[${vp.w}] pageerror:`, e.message));
    await page.goto(url, {waitUntil:'networkidle', timeout: 60000});
    await page.waitForTimeout(1500);
    await page.screenshot({path: `staging-${vp.w}.png`, fullPage: true});
    console.log(`captured ${vp.w}px`);
    await ctx.close();
  }
  await browser.close();
})();
