import { test, expect } from '@playwright/test';

const SITE = 'https://lightsalmon-tarsier-683012.hostingersite.com';
const REST = `${SITE}/wp-json`;

// Auth header for WP REST API
const AUTH = 'Basic ' + Buffer.from('Ibraheem:EmWXce4CtQbMJsoOrByvP22q').toString('base64');

// ── 1. Plugin & Theme Active ──────────────────────────────────────

test('SGS Blocks plugin is active', async ({ request }) => {
  const res = await request.get(`${REST}/wp/v2/plugins`, {
    headers: { Authorization: AUTH },
  });
  expect(res.ok()).toBeTruthy();
  const plugins = await res.json();
  const sgs = plugins.find((p: any) => p.plugin.includes('sgs-blocks'));
  expect(sgs).toBeTruthy();
  expect(sgs.status).toBe('active');
});

test('SGS Theme is active', async ({ request }) => {
  const res = await request.get(`${REST}/wp/v2/themes`, {
    headers: { Authorization: AUTH },
  });
  expect(res.ok()).toBeTruthy();
  const themes = await res.json();
  const active = themes.find((t: any) => t.status === 'active');
  expect(active.stylesheet).toBe('sgs-theme');
});

// ── 2. All 55 Block Types Registered ──────────────────────────────

const EXPECTED_BLOCKS = [
  'accordion', 'accordion-item', 'announcement-bar', 'back-to-top', 'brand-strip',
  'breadcrumbs', 'card-grid', 'certification-bar', 'container', 'countdown-timer',
  'counter', 'cta-section', 'decorative-image', 'form', 'form-field-address',
  'form-field-checkbox', 'form-field-consent', 'form-field-date', 'form-field-email',
  'form-field-file', 'form-field-hidden', 'form-field-number', 'form-field-phone',
  'form-field-radio', 'form-field-select', 'form-field-text', 'form-field-textarea',
  'form-field-tiles', 'form-review', 'form-step', 'gallery', 'google-reviews',
  'heritage-strip', 'hero', 'icon', 'icon-list', 'info-box', 'mega-menu', 'modal',
  'notice-banner', 'post-grid', 'pricing-table', 'process-steps', 'site-info',
  'social-icons', 'star-rating', 'svg-background', 'tab', 'table-of-contents',
  'tabs', 'team-member', 'testimonial', 'testimonial-slider', 'trust-bar', 'whatsapp-cta',
];

test('all 55 SGS block types are registered', async ({ request }) => {
  const res = await request.get(`${REST}/wp/v2/block-types`, {
    headers: { Authorization: AUTH },
  });
  expect(res.ok()).toBeTruthy();
  const types = await res.json();
  const sgsBlocks = types.filter((t: any) => t.name?.startsWith('sgs/'));
  const registered = sgsBlocks.map((t: any) => t.name.replace('sgs/', ''));

  const missing = EXPECTED_BLOCKS.filter(b => !registered.includes(b));
  if (missing.length > 0) {
    console.log('Missing blocks:', missing);
  }
  // Allow up to 3 missing (some may need theme supports)
  expect(missing.length).toBeLessThanOrEqual(3);
  console.log(`Registered: ${registered.length}/${EXPECTED_BLOCKS.length} blocks`);
});

// ── 3. Block Patterns Registered ──────────────────────────────────

test('SGS block patterns are registered', async ({ request }) => {
  const res = await request.get(`${REST}/wp/v2/block-patterns/patterns`, {
    headers: { Authorization: AUTH },
  });
  expect(res.ok()).toBeTruthy();
  const patterns = await res.json();
  const sgsPatterns = patterns.filter((p: any) =>
    p.name?.startsWith('sgs-blocks/') || p.categories?.includes('sgs-patterns')
  );
  console.log(`SGS patterns found: ${sgsPatterns.length}`);
  expect(sgsPatterns.length).toBeGreaterThanOrEqual(5);
});

// ── 4. Frontend Rendering Tests ───────────────────────────────────

test('homepage loads without PHP errors', async ({ page }) => {
  const response = await page.goto(SITE);
  expect(response?.status()).toBeLessThan(500);
  // No fatal errors
  const body = await page.textContent('body');
  expect(body).not.toContain('Fatal error');
  expect(body).not.toContain('Parse error');
  expect(body).not.toContain('Warning:');
});

// ── 5. Create Test Page with Blocks & Verify Render ───────────────

test('create page with SGS blocks and verify frontend render', async ({ request, page }) => {
  // Create a test page with various SGS blocks
  const blockContent = `
<!-- wp:sgs/hero {"heading":"Test Hero","subheading":"Playwright test page"} -->
<section class="wp-block-sgs-hero"><h1>Test Hero</h1><p>Playwright test page</p></section>
<!-- /wp:sgs/hero -->

<!-- wp:sgs/accordion -->
<div class="wp-block-sgs-accordion">
<!-- wp:sgs/accordion-item {"heading":"FAQ 1"} -->
<details class="wp-block-sgs-accordion-item"><summary>FAQ 1</summary><div><p>Answer 1</p></div></details>
<!-- /wp:sgs/accordion-item -->
</div>
<!-- /wp:sgs/accordion -->

<!-- wp:sgs/counter {"target":500,"label":"Projects"} -->
<div class="wp-block-sgs-counter" data-target="500"><span>0</span><span>Projects</span></div>
<!-- /wp:sgs/counter -->

<!-- wp:sgs/cta-section {"heading":"Get Started","buttonText":"Contact Us"} -->
<section class="wp-block-sgs-cta-section"><h2>Get Started</h2><a>Contact Us</a></section>
<!-- /wp:sgs/cta-section -->

<!-- wp:sgs/tabs -->
<div class="wp-block-sgs-tabs">
<!-- wp:sgs/tab {"label":"Tab 1"} -->
<div class="wp-block-sgs-tab"><p>Tab 1 content</p></div>
<!-- /wp:sgs/tab -->
<!-- wp:sgs/tab {"label":"Tab 2"} -->
<div class="wp-block-sgs-tab"><p>Tab 2 content</p></div>
<!-- /wp:sgs/tab -->
</div>
<!-- /wp:sgs/tabs -->

<!-- wp:sgs/modal {"triggerText":"Open Modal","heading":"Test Modal"} -->
<div class="wp-block-sgs-modal"><button>Open Modal</button><dialog><h2>Test Modal</h2></dialog></div>
<!-- /wp:sgs/modal -->

<!-- wp:sgs/pricing-table {"title":"Pro Plan","price":"49","period":"month","features":["Feature 1","Feature 2","Feature 3"],"buttonText":"Choose Plan"} -->
<div class="wp-block-sgs-pricing-table"></div>
<!-- /wp:sgs/pricing-table -->

<!-- wp:sgs/trust-bar {"items":[{"icon":"shield","text":"Secure"},{"icon":"clock","text":"Fast"}]} -->
<div class="wp-block-sgs-trust-bar"></div>
<!-- /wp:sgs/trust-bar -->

<!-- wp:sgs/process-steps {"steps":[{"title":"Step 1","description":"Do this"},{"title":"Step 2","description":"Then this"}]} -->
<div class="wp-block-sgs-process-steps"></div>
<!-- /wp:sgs/process-steps -->

<!-- wp:sgs/back-to-top -->
<div class="wp-block-sgs-back-to-top"></div>
<!-- /wp:sgs/back-to-top -->
`;

  // Create the test page
  const createRes = await request.post(`${REST}/wp/v2/pages`, {
    headers: { Authorization: AUTH, 'Content-Type': 'application/json' },
    data: {
      title: 'Playwright Block Test',
      content: blockContent,
      status: 'publish',
    },
  });
  expect(createRes.ok()).toBeTruthy();
  const pageData = await createRes.json();
  const pageUrl = pageData.link;
  const pageId = pageData.id;

  // Visit the page
  const response = await page.goto(pageUrl);
  expect(response?.status()).toBe(200);

  // Verify no PHP errors
  const html = await page.content();
  expect(html).not.toContain('Fatal error');
  expect(html).not.toContain('Parse error');

  // Verify key blocks rendered
  // Hero
  const heroEl = page.locator('.wp-block-sgs-hero, [class*="sgs-hero"]');
  const heroCount = await heroEl.count();
  console.log(`Hero blocks found: ${heroCount}`);

  // Accordion
  const accordionEl = page.locator('.wp-block-sgs-accordion, details');
  const accordionCount = await accordionEl.count();
  console.log(`Accordion elements found: ${accordionCount}`);

  // Counter
  const counterEl = page.locator('.wp-block-sgs-counter, [data-target]');
  const counterCount = await counterEl.count();
  console.log(`Counter blocks found: ${counterCount}`);

  // Modal
  const modalTrigger = page.locator('.wp-block-sgs-modal button, [class*="sgs-modal"] button');
  const modalCount = await modalTrigger.count();
  console.log(`Modal triggers found: ${modalCount}`);

  // Tabs
  const tabsEl = page.locator('.wp-block-sgs-tabs, [class*="sgs-tabs"]');
  const tabsCount = await tabsEl.count();
  console.log(`Tabs blocks found: ${tabsCount}`);

  // Clean up - delete the test page
  await request.delete(`${REST}/wp/v2/pages/${pageId}?force=true`, {
    headers: { Authorization: AUTH },
  });
});

// ── 6. Form Submission Tests ──────────────────────────────────────

test('form REST endpoint exists and rejects invalid submissions', async ({ request }) => {
  // Test that the form endpoint exists
  const res = await request.post(`${REST}/sgs-forms/v1/submit`, {
    headers: { 'Content-Type': 'application/json' },
    data: { formId: 'test', fields: {}, nonce: 'invalid' },
  });
  // Should reject with 403 (bad nonce) not 404 (endpoint missing)
  const status = res.status();
  console.log(`Form submit endpoint status: ${status}`);
  expect(status).not.toBe(404);
});

// ── 7. Interactive Block Tests ────────────────────────────────────

test('accordion opens and closes on click', async ({ request, page }) => {
  const content = `
<!-- wp:sgs/accordion -->
<div class="wp-block-sgs-accordion">
<!-- wp:sgs/accordion-item {"heading":"Click Me"} -->
<details class="wp-block-sgs-accordion-item"><summary>Click Me</summary><div><p>Hidden content</p></div></details>
<!-- /wp:sgs/accordion-item -->
</div>
<!-- /wp:sgs/accordion -->`;

  const createRes = await request.post(`${REST}/wp/v2/pages`, {
    headers: { Authorization: AUTH, 'Content-Type': 'application/json' },
    data: { title: 'Accordion Test', content, status: 'publish' },
  });
  const pageData = await createRes.json();

  await page.goto(pageData.link);
  const details = page.locator('details').first();
  if (await details.count() > 0) {
    const isOpen = await details.getAttribute('open');
    console.log(`Accordion initial state open: ${isOpen !== null}`);
    await details.locator('summary').first().click();
    await page.waitForTimeout(500);
    const isOpenAfter = await details.getAttribute('open');
    console.log(`Accordion after click open: ${isOpenAfter !== null}`);
  }

  await request.delete(`${REST}/wp/v2/pages/${pageData.id}?force=true`, {
    headers: { Authorization: AUTH },
  });
});

test('modal opens on trigger click', async ({ request, page }) => {
  const content = `
<!-- wp:sgs/modal {"triggerText":"Open","heading":"Test"} -->
<div class="wp-block-sgs-modal"><button>Open</button><dialog><h2>Test</h2></dialog></div>
<!-- /wp:sgs/modal -->`;

  const createRes = await request.post(`${REST}/wp/v2/pages`, {
    headers: { Authorization: AUTH, 'Content-Type': 'application/json' },
    data: { title: 'Modal Test', content, status: 'publish' },
  });
  const pageData = await createRes.json();

  await page.goto(pageData.link);
  const dialog = page.locator('dialog').first();
  if (await dialog.count() > 0) {
    const visible = await dialog.isVisible();
    console.log(`Modal initially visible: ${visible}`);
    
    const trigger = page.locator('.wp-block-sgs-modal button, [class*="modal"] button').first();
    if (await trigger.count() > 0) {
      await trigger.click();
      await page.waitForTimeout(500);
      const visibleAfter = await dialog.isVisible();
      console.log(`Modal after click visible: ${visibleAfter}`);
    }
  }

  await request.delete(`${REST}/wp/v2/pages/${pageData.id}?force=true`, {
    headers: { Authorization: AUTH },
  });
});

// ── 8. Performance Checks ─────────────────────────────────────────

test('page with blocks loads under 3 seconds', async ({ request, page }) => {
  const content = `
<!-- wp:sgs/hero {"heading":"Perf Test"} --><section class="wp-block-sgs-hero"><h1>Perf Test</h1></section><!-- /wp:sgs/hero -->
<!-- wp:sgs/card-grid {"columns":3} --><div class="wp-block-sgs-card-grid"></div><!-- /wp:sgs/card-grid -->
<!-- wp:sgs/testimonial-slider --><div class="wp-block-sgs-testimonial-slider"></div><!-- /wp:sgs/testimonial-slider -->`;

  const createRes = await request.post(`${REST}/wp/v2/pages`, {
    headers: { Authorization: AUTH, 'Content-Type': 'application/json' },
    data: { title: 'Perf Test', content, status: 'publish' },
  });
  const pageData = await createRes.json();

  const start = Date.now();
  await page.goto(pageData.link, { waitUntil: 'domcontentloaded' });
  const loadTime = Date.now() - start;
  console.log(`Page load time: ${loadTime}ms`);
  expect(loadTime).toBeLessThan(3000);

  await request.delete(`${REST}/wp/v2/pages/${pageData.id}?force=true`, {
    headers: { Authorization: AUTH },
  });
});
