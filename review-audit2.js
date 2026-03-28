const { chromium } = require('playwright');
(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 375, height: 812 } });
  await page.goto('https://palestine-lives.org', { waitUntil: 'networkidle' });

  await page.locator('.sgs-mobile-nav-toggle').click();
  await page.waitForTimeout(600);

  // Check social icons area
  const socialsHtml = await page.locator('.sgs-mobile-nav__socials').evaluate(el => el.outerHTML);
  console.log('Socials HTML (first 500 chars):');
  console.log(socialsHtml.substring(0, 500));

  // Check computed styles on social list
  const listStyle = await page.locator('.sgs-mobile-nav__socials').evaluate(el => {
    const cs = getComputedStyle(el);
    return { listStyleType: cs.listStyleType, padding: cs.padding, display: cs.display };
  });
  console.log('\nSocials computed:', JSON.stringify(listStyle));

  // Check for stray bullets on social items
  const itemStyle = await page.locator('.sgs-mobile-nav__social-item').first().evaluate(el => {
    const cs = getComputedStyle(el);
    return { listStyleType: cs.listStyleType, display: cs.display, marker: cs.getPropertyValue('list-style-type') };
  });
  console.log('Social item computed:', JSON.stringify(itemStyle));

  // Check top bar button truncation
  const topBarBtns = await page.locator('.sgs-top-bar-mobile-cta__btn').all();
  for (let btn of topBarBtns) {
    const text = (await btn.textContent()).trim();
    const box = await btn.boundingBox();
    console.log('\nTop bar: "' + text + '" w=' + Math.round(box?.width || 0));

    const overflow = await btn.evaluate(el => {
      const cs = getComputedStyle(el);
      return { overflow: cs.overflow, textOverflow: cs.textOverflow, whiteSpace: cs.whiteSpace };
    });
    console.log('  overflow:', JSON.stringify(overflow));
  }

  // Deep-check Brands submenu
  console.log('\n=== BRANDS MOBILE SUBMENU ===');
  const toggles = await page.locator('.sgs-mobile-nav__toggle').all();
  // Brands is toggle index 2
  await toggles[2].click();
  await page.waitForTimeout(300);

  const brandsSubmenu = await page.locator('.sgs-mobile-nav__submenu').nth(2);
  const brandsItems = await brandsSubmenu.locator('li').all();
  console.log('Brands submenu items:', brandsItems.length);
  for (let item of brandsItems) {
    const text = (await item.textContent()).trim();
    const cls = await item.getAttribute('class');
    console.log('  ' + text.substring(0, 40) + ' [' + (cls || '') + ']');
  }

  // Take screenshot of Brands expanded
  await page.screenshot({ path: 'C:/Users/Bean/projects/small-giants-wp/review-mobile-brands-expanded.png' });

  // Check the drawer covers full width correctly
  const drawerBox = await page.locator('#sgs-mobile-nav').boundingBox();
  console.log('\nDrawer box:', JSON.stringify(drawerBox));

  // Check the drawer handle/grab bar
  const handleExists = await page.locator('.sgs-mobile-nav__handle, .sgs-mobile-nav__grab-bar').count();
  console.log('Handle/grab-bar element:', handleExists);

  // Focus trap test: Tab from close button
  const closeBtn = await page.locator('.sgs-mobile-nav__close');
  await closeBtn.focus();
  console.log('\nFocus trap test:');
  for (let i = 0; i < 15; i++) {
    await page.keyboard.press('Tab');
    await page.waitForTimeout(50);
    const focused = await page.evaluate(() => {
      const el = document.activeElement;
      return (el?.tagName || '') + ' ' + (el?.textContent?.trim().substring(0, 25) || '');
    });
    console.log('  Tab ' + (i + 1) + ': ' + focused);
  }

  await browser.close();
})();
