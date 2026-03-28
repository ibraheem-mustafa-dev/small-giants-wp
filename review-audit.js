const { chromium } = require('playwright');
(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  await page.goto('https://palestine-lives.org', { waitUntil: 'networkidle' });

  console.log('=== DESKTOP MEGA MENU AUDIT ===');

  // 1. Check trigger ARIA attributes
  const triggers = await page.locator('.sgs-mega-menu__trigger').all();
  for (let i = 0; i < triggers.length; i++) {
    const role = await triggers[i].getAttribute('role');
    const expanded = await triggers[i].getAttribute('aria-expanded');
    const hasPopup = await triggers[i].getAttribute('aria-haspopup');
    const controls = await triggers[i].getAttribute('aria-controls');
    const label = (await triggers[i].textContent()).trim();
    console.log(`Trigger ${i} "${label}": role=${role} expanded=${expanded} haspopup=${hasPopup} controls=${controls}`);
  }

  // 2. Check panel ARIA
  const panels = await page.locator('.sgs-mega-menu__panel').all();
  for (let i = 0; i < panels.length; i++) {
    const role = await panels[i].getAttribute('role');
    const id = await panels[i].getAttribute('id');
    const hidden = await panels[i].getAttribute('hidden');
    console.log(`Panel ${i}: id=${id} role=${role} hidden=${hidden}`);
  }

  // 3. Check <li> wrapper has no invalid role
  const wrappers = await page.locator('.sgs-mega-menu').all();
  for (let i = 0; i < wrappers.length; i++) {
    const tag = await wrappers[i].evaluate(el => el.tagName);
    const role = await wrappers[i].getAttribute('role');
    console.log(`Wrapper ${i}: tag=${tag} role=${role || 'none'}`);
  }

  // 4. Keyboard navigation test
  console.log('\n=== KEYBOARD NAV TEST ===');
  await triggers[0].focus();
  await page.waitForTimeout(100);

  // Press Enter to open
  await page.keyboard.press('Enter');
  await page.waitForTimeout(300);
  const expandedAfter = await triggers[0].getAttribute('aria-expanded');
  console.log(`After Enter: aria-expanded=${expandedAfter}`);

  const focusedAfterEnter = await page.evaluate(() => {
    const el = document.activeElement;
    return { tag: el?.tagName, cls: el?.className?.substring(0, 50), txt: el?.textContent?.substring(0, 30) };
  });
  console.log('Focus after Enter:', JSON.stringify(focusedAfterEnter));

  // Press Escape to close
  await page.keyboard.press('Escape');
  await page.waitForTimeout(200);
  const expandedAfterEsc = await triggers[0].getAttribute('aria-expanded');
  const focusAfterEsc = await page.evaluate(() => document.activeElement?.className?.substring(0, 50));
  console.log(`After Escape: aria-expanded=${expandedAfterEsc} focus=${focusAfterEsc}`);

  // ArrowDown opens and focuses first item
  await triggers[0].focus();
  await page.keyboard.press('ArrowDown');
  await page.waitForTimeout(300);
  const focusAfterArrow = await page.evaluate(() => {
    const el = document.activeElement;
    return { tag: el?.tagName, txt: el?.textContent?.substring(0, 40) };
  });
  console.log('After ArrowDown:', JSON.stringify(focusAfterArrow));

  // ArrowLeft/Right movement
  await page.keyboard.press('Escape');
  await triggers[0].focus();
  await page.keyboard.press('ArrowRight');
  await page.waitForTimeout(200);
  const afterRight = await page.evaluate(() => document.activeElement?.textContent?.substring(0, 30));
  console.log('After ArrowRight from trigger 0:', afterRight?.trim());

  // 5. Panel sizing check
  console.log('\n=== PANEL SIZING (full-width) ===');
  await triggers[0].hover();
  await page.waitForTimeout(500);
  const panelBox = await page.locator('.sgs-mega-menu.is-open .sgs-mega-menu__panel').first().boundingBox();
  if (panelBox) {
    console.log(`Panel: x=${panelBox.x} y=${panelBox.y} w=${panelBox.width} h=${panelBox.height}`);
    console.log(`Full viewport width? ${panelBox.width >= 1430 ? 'YES' : 'NO (width=' + panelBox.width + ')'}`);
  }

  // 6. Check About & Trade — these have chevrons but are NOT mega menus
  console.log('\n=== NON-MEGA MENU ITEMS ===');
  const allNavLinks = await page.locator('.wp-block-navigation-item').all();
  for (let link of allNavLinks) {
    const text = (await link.textContent()).trim().split('\n')[0].trim();
    const hasSubmenu = await link.locator('.wp-block-navigation__submenu-container').count();
    const isMega = await link.locator('.sgs-mega-menu').count();
    if (hasSubmenu > 0 || isMega > 0) {
      console.log(`  ${text}: submenu=${hasSubmenu > 0} mega=${isMega > 0}`);
    }
  }

  // 7. Check mobile nav block in DOM at desktop
  console.log('\n=== MOBILE NAV AT DESKTOP ===');
  const mobileNav = await page.locator('#sgs-mobile-nav');
  const mobileNavExists = await mobileNav.count();
  console.log(`Mobile nav in DOM: ${mobileNavExists > 0}`);
  if (mobileNavExists > 0) {
    const mobileNavVisible = await mobileNav.isVisible();
    console.log(`Mobile nav visible at 1440px: ${mobileNavVisible}`);
  }

  const hamburger = await page.locator('.sgs-mobile-nav-toggle');
  const hamburgerVisible = await hamburger.isVisible();
  console.log(`Hamburger visible at 1440px: ${hamburgerVisible}`);

  // 8. Catch console errors
  const errors = [];
  page.on('console', msg => {
    if (msg.type() === 'error') errors.push(msg.text());
  });
  await page.reload({ waitUntil: 'networkidle' });
  await page.waitForTimeout(1000);
  console.log(`\nConsole errors: ${errors.length || 'none'}`);
  errors.forEach(e => console.log('  ERR:', e));

  await browser.close();
})();
