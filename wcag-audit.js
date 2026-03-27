/**
 * WCAG 2.2 AA Accessibility Audit — palestine-lives.org (Indus Foods)
 * Tests 4 pages at 375px mobile width using axe-core
 */

const { chromium } = require('playwright');
const fs = require('fs');

const PAGES = [
  { name: 'Homepage', url: 'https://palestine-lives.org/' },
  { name: 'Food Service', url: 'https://palestine-lives.org/food-service/' },
  { name: 'Contact', url: 'https://palestine-lives.org/contact/' },
  { name: 'Apply for Trade Account', url: 'https://palestine-lives.org/apply-for-trade-account/' },
];

const AXE_CDN = 'https://cdnjs.cloudflare.com/ajax/libs/axe-core/4.8.4/axe.min.js';

async function runAxe(page) {
  return page.evaluate((axeUrl) => {
    return new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.src = axeUrl;
      script.onload = () => {
        axe.run({
          runOnly: {
            type: 'tag',
            values: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa', 'best-practice']
          }
        }).then(resolve).catch(reject);
      };
      script.onerror = () => reject(new Error('Failed to load axe-core'));
      document.head.appendChild(script);
    });
  }, AXE_CDN);
}

async function checkSkipLink(page) {
  try {
    // Press Tab to focus the first focusable element (usually skip link)
    await page.keyboard.press('Tab');
    await page.waitForTimeout(300);

    const skipLink = await page.evaluate(() => {
      const focused = document.activeElement;
      return {
        tagName: focused?.tagName,
        text: focused?.textContent?.trim(),
        href: focused?.getAttribute('href'),
        isSkipLink: focused?.textContent?.toLowerCase().includes('skip') ||
                    focused?.getAttribute('href')?.startsWith('#'),
      };
    });

    // If we found a skip link, click it and check where focus moved
    if (skipLink.isSkipLink && skipLink.href) {
      await page.keyboard.press('Enter');
      await page.waitForTimeout(300);

      const afterClick = await page.evaluate(() => {
        const focused = document.activeElement;
        const target = document.querySelector('#main, #content, main, [role="main"]');
        return {
          focusedId: focused?.id,
          focusedTag: focused?.tagName,
          focusedRole: focused?.getAttribute('role'),
          targetId: target?.id,
          focusMoved: focused !== document.body,
        };
      });

      return { found: true, skipLink, afterClick };
    }

    return { found: skipLink.isSkipLink, skipLink, afterClick: null };
  } catch (e) {
    return { found: false, error: e.message };
  }
}

async function checkTabOrder(page) {
  const tabStops = [];
  // Tab through first 10 focusable elements to check header order
  for (let i = 0; i < 10; i++) {
    await page.keyboard.press('Tab');
    await page.waitForTimeout(100);
    const el = await page.evaluate(() => {
      const f = document.activeElement;
      return {
        tag: f?.tagName,
        text: f?.textContent?.trim()?.substring(0, 50),
        role: f?.getAttribute('role') || f?.getAttribute('aria-label'),
        id: f?.id,
        class: f?.className?.substring(0, 60),
        href: f?.getAttribute('href'),
      };
    });
    tabStops.push(el);
  }
  return tabStops;
}

async function checkHeadingHierarchy(page) {
  return page.evaluate(() => {
    const headings = Array.from(document.querySelectorAll('h1, h2, h3, h4, h5, h6'));
    const hierarchy = headings.map(h => ({
      level: parseInt(h.tagName[1]),
      text: h.textContent.trim().substring(0, 80),
      id: h.id || null,
    }));

    const issues = [];
    let prevLevel = 0;
    for (const h of hierarchy) {
      if (prevLevel > 0 && h.level > prevLevel + 1) {
        issues.push(`Skipped from h${prevLevel} to h${h.level}: "${h.text}"`);
      }
      prevLevel = h.level;
    }

    const h1Count = hierarchy.filter(h => h.level === 1).length;
    if (h1Count === 0) issues.push('No h1 found on page');
    if (h1Count > 1) issues.push(`Multiple h1 tags found: ${h1Count}`);

    return { hierarchy, issues, h1Count };
  });
}

async function checkImages(page) {
  return page.evaluate(() => {
    const images = Array.from(document.querySelectorAll('img'));
    const issues = [];
    const stats = { total: 0, hasAlt: 0, emptyAlt: 0, missingAlt: 0, filenameAlt: 0, decorative: 0 };

    for (const img of images) {
      stats.total++;
      const alt = img.getAttribute('alt');
      const src = img.getAttribute('src') || '';
      const role = img.getAttribute('role');

      if (alt === null) {
        stats.missingAlt++;
        issues.push({ type: 'missing-alt', src: src.substring(0, 80), selector: img.className?.substring(0, 40) });
      } else if (alt === '') {
        if (role === 'presentation' || img.closest('[role="presentation"]') || img.closest('figure[aria-hidden]')) {
          stats.decorative++;
        } else {
          stats.emptyAlt++;
          // Empty alt is OK if decorative — flag but don't count as error unless not decorative
          issues.push({ type: 'empty-alt-check', src: src.substring(0, 80), note: 'Verify this is truly decorative' });
        }
      } else {
        // Check for filename-as-alt (e.g. "image-123.jpg" or "DSC_0001")
        const filenamePattern = /\.(jpg|jpeg|png|webp|gif|svg)$/i;
        const dscPattern = /^(IMG|DSC|DCIM|image|photo|pic|screenshot|untitled)/i;
        if (filenamePattern.test(alt) || dscPattern.test(alt)) {
          stats.filenameAlt++;
          issues.push({ type: 'filename-alt', alt, src: src.substring(0, 80) });
        } else {
          stats.hasAlt++;
        }
      }
    }

    return { stats, issues };
  });
}

async function checkFormLabels(page) {
  return page.evaluate(() => {
    const inputs = Array.from(document.querySelectorAll('input:not([type="hidden"]):not([type="submit"]):not([type="button"]), textarea, select'));
    const issues = [];

    for (const input of inputs) {
      const id = input.id;
      const ariaLabel = input.getAttribute('aria-label');
      const ariaLabelledBy = input.getAttribute('aria-labelledby');
      const title = input.getAttribute('title');
      const placeholder = input.getAttribute('placeholder');
      const type = input.getAttribute('type');

      // Check for explicit label
      const label = id ? document.querySelector(`label[for="${id}"]`) : null;
      // Check for wrapping label
      const wrappingLabel = input.closest('label');

      const hasLabel = label || wrappingLabel || ariaLabel || ariaLabelledBy || title;

      if (!hasLabel) {
        issues.push({
          type: 'missing-label',
          inputType: type || input.tagName.toLowerCase(),
          id: id || 'no-id',
          placeholder: placeholder || 'none',
          name: input.getAttribute('name') || 'no-name',
        });
      }
    }

    return { total: inputs.length, issues };
  });
}

async function checkFocusRings(page) {
  return page.evaluate(() => {
    const focusable = Array.from(document.querySelectorAll(
      'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
    )).slice(0, 20); // Check first 20 focusable elements

    const issues = [];

    for (const el of focusable) {
      el.focus();
      const styles = window.getComputedStyle(el, ':focus');
      const outline = styles.outline;
      const outlineWidth = styles.outlineWidth;
      const outlineStyle = styles.outlineStyle;
      const boxShadow = styles.boxShadow;

      const hasFocusRing = (
        (outline && outline !== 'none' && outlineStyle !== 'none' && outlineWidth !== '0px') ||
        (boxShadow && boxShadow !== 'none')
      );

      if (!hasFocusRing) {
        issues.push({
          tag: el.tagName,
          text: el.textContent?.trim()?.substring(0, 40),
          id: el.id,
          outline,
          boxShadow,
        });
      }
    }

    return { checked: Math.min(focusable.length, 20), issues };
  });
}

async function auditPage(browser, pageConfig) {
  console.log(`\n${'='.repeat(60)}`);
  console.log(`Auditing: ${pageConfig.name} — ${pageConfig.url}`);
  console.log('='.repeat(60));

  const context = await browser.newContext({
    viewport: { width: 375, height: 812 },
    userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 15_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/15.0 Mobile/15E148 Safari/604.1',
  });

  const page = await context.newPage();

  try {
    await page.goto(pageConfig.url, { waitUntil: 'networkidle', timeout: 30000 });
    await page.waitForTimeout(2000);

    // Run axe-core
    console.log('Running axe-core...');
    let axeResults;
    try {
      axeResults = await runAxe(page);
    } catch (e) {
      console.log('axe-core failed:', e.message);
      axeResults = { violations: [], passes: [] };
    }

    // Manual checks
    console.log('Checking skip link...');
    const skipLink = await checkSkipLink(page);

    // Reload page for clean tab order check
    await page.goto(pageConfig.url, { waitUntil: 'networkidle', timeout: 30000 });
    await page.waitForTimeout(1000);
    await page.click('body');

    console.log('Checking tab order...');
    const tabOrder = await checkTabOrder(page);

    console.log('Checking heading hierarchy...');
    const headings = await checkHeadingHierarchy(page);

    console.log('Checking images...');
    const images = await checkImages(page);

    console.log('Checking form labels...');
    const forms = await checkFormLabels(page);

    console.log('Checking focus rings...');
    const focusRings = await checkFocusRings(page);

    return {
      page: pageConfig.name,
      url: pageConfig.url,
      axe: axeResults,
      manual: { skipLink, tabOrder, headings, images, forms, focusRings },
    };
  } finally {
    await context.close();
  }
}

function formatViolation(v) {
  return {
    id: v.id,
    impact: v.impact,
    description: v.description,
    help: v.help,
    helpUrl: v.helpUrl,
    nodes: v.nodes.map(n => ({
      target: n.target?.join(' ') || 'unknown',
      html: n.html?.substring(0, 120),
      failureSummary: n.failureSummary?.substring(0, 200),
    })).slice(0, 3), // Max 3 nodes per violation
  };
}

async function main() {
  const browser = await chromium.launch({ headless: true });
  const results = [];

  for (const pageConfig of PAGES) {
    try {
      const result = await auditPage(browser, pageConfig);
      results.push(result);
    } catch (e) {
      console.error(`Failed to audit ${pageConfig.name}:`, e.message);
      results.push({ page: pageConfig.name, url: pageConfig.url, error: e.message });
    }
  }

  await browser.close();

  // Save full results
  const outputPath = '/c/Users/Bean/Projects/small-giants-wp/wcag-audit-results.json';
  fs.writeFileSync(outputPath, JSON.stringify(results, null, 2));
  console.log(`\nFull results saved to: ${outputPath}`);

  // Print summary
  console.log('\n' + '='.repeat(80));
  console.log('WCAG 2.2 AA AUDIT SUMMARY — palestine-lives.org — 375px mobile');
  console.log('='.repeat(80));
  console.log('');

  // Summary table
  console.log('PAGE SUMMARY TABLE');
  console.log('-'.repeat(80));
  console.log('Page'.padEnd(30) + 'Total'.padEnd(8) + 'Critical'.padEnd(12) + 'Serious'.padEnd(12) + 'Moderate'.padEnd(12) + 'Minor');
  console.log('-'.repeat(80));

  for (const r of results) {
    if (r.error) {
      console.log(`${r.page.padEnd(30)} ERROR: ${r.error}`);
      continue;
    }

    const violations = r.axe?.violations || [];
    const critical = violations.filter(v => v.impact === 'critical').length;
    const serious = violations.filter(v => v.impact === 'serious').length;
    const moderate = violations.filter(v => v.impact === 'moderate').length;
    const minor = violations.filter(v => v.impact === 'minor').length;

    console.log(
      r.page.padEnd(30) +
      String(violations.length).padEnd(8) +
      String(critical).padEnd(12) +
      String(serious).padEnd(12) +
      String(moderate).padEnd(12) +
      String(minor)
    );
  }

  console.log('-'.repeat(80));

  // Detailed violations per page
  for (const r of results) {
    if (r.error) continue;

    const violations = r.axe?.violations || [];
    if (violations.length === 0) {
      console.log(`\n✓ ${r.page}: No axe-core violations`);
      continue;
    }

    console.log(`\n--- ${r.page.toUpperCase()} VIOLATIONS ---`);

    // Sort by impact: critical > serious > moderate > minor
    const impactOrder = { critical: 0, serious: 1, moderate: 2, minor: 3 };
    const sorted = [...violations].sort((a, b) =>
      (impactOrder[a.impact] || 4) - (impactOrder[b.impact] || 4)
    );

    for (const v of sorted) {
      const formatted = formatViolation(v);
      console.log(`\n  [${v.impact.toUpperCase()}] ${v.id}`);
      console.log(`  Rule: ${v.help}`);
      console.log(`  Description: ${v.description}`);
      console.log(`  Affected elements (${v.nodes.length} total):`);
      for (const node of formatted.nodes) {
        console.log(`    - ${node.target}`);
        if (node.html) console.log(`      HTML: ${node.html}`);
        if (node.failureSummary) console.log(`      Fix: ${node.failureSummary}`);
      }
    }
  }

  // Manual checks summary
  console.log('\n' + '='.repeat(80));
  console.log('MANUAL CHECKS SUMMARY');
  console.log('='.repeat(80));

  for (const r of results) {
    if (r.error || !r.manual) continue;

    console.log(`\n--- ${r.page.toUpperCase()} ---`);

    // Skip link
    const sl = r.manual.skipLink;
    if (sl.found) {
      console.log(`  Skip link: FOUND — "${sl.skipLink?.text}" → ${sl.skipLink?.href}`);
      if (sl.afterClick) {
        console.log(`  After activation: focus on <${sl.afterClick.focusedTag}> id="${sl.afterClick.focusedId}" — ${sl.afterClick.focusMoved ? 'MOVED' : 'DID NOT MOVE'}`);
      }
    } else {
      console.log(`  Skip link: NOT FOUND or not first tab stop`);
    }

    // Tab order
    console.log(`  Tab order (first 10 stops):`);
    for (let i = 0; i < r.manual.tabOrder.length; i++) {
      const t = r.manual.tabOrder[i];
      console.log(`    ${i + 1}. <${t.tag}> "${t.text || t.role || t.id || '(no text)'}"`);
    }

    // Headings
    const h = r.manual.headings;
    console.log(`  Heading hierarchy: ${h.hierarchy.length} headings, ${h.h1Count} h1`);
    if (h.issues.length > 0) {
      for (const issue of h.issues) {
        console.log(`    WARNING: ${issue}`);
      }
    } else {
      console.log(`    Hierarchy: OK`);
    }
    // Print heading structure
    for (const heading of h.hierarchy.slice(0, 15)) {
      const indent = '  '.repeat(heading.level);
      console.log(`    ${'h' + heading.level}${indent} "${heading.text}"`);
    }
    if (h.hierarchy.length > 15) {
      console.log(`    ... (${h.hierarchy.length - 15} more headings not shown)`);
    }

    // Images
    const img = r.manual.images;
    console.log(`  Images: ${img.stats.total} total — ${img.stats.hasAlt} with alt, ${img.stats.missingAlt} missing alt, ${img.stats.emptyAlt} empty alt, ${img.stats.filenameAlt} filename as alt`);
    if (img.issues.length > 0) {
      for (const issue of img.issues.slice(0, 5)) {
        console.log(`    [${issue.type}] ${issue.src || issue.alt} ${issue.note || ''}`);
      }
      if (img.issues.length > 5) console.log(`    ... (${img.issues.length - 5} more image issues)`);
    }

    // Forms
    const form = r.manual.forms;
    console.log(`  Form inputs: ${form.total} total`);
    if (form.issues.length > 0) {
      for (const issue of form.issues) {
        console.log(`    [missing-label] <${issue.inputType}> name="${issue.name}" placeholder="${issue.placeholder}"`);
      }
    } else if (form.total > 0) {
      console.log(`    All inputs have labels: OK`);
    }

    // Focus rings
    const fr = r.manual.focusRings;
    console.log(`  Focus rings: checked ${fr.checked} elements`);
    if (fr.issues.length > 0) {
      for (const issue of fr.issues) {
        console.log(`    [no-focus-ring] <${issue.tag}> "${issue.text || issue.id}"`);
      }
    } else {
      console.log(`    Focus rings: OK`);
    }
  }

  console.log('\n' + '='.repeat(80));
  console.log('Audit complete.');
}

main().catch(console.error);
