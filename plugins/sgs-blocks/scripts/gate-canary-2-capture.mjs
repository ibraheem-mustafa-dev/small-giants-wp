// Ad-hoc capture script for the FR-32 no-inline gate-canary-2 evidence run
// (2026-07-30). NOT a permanent part of the build — safe to delete after the
// evidence has been baked into reports/visual-diff/*.md.
//
// For each of the six previously-BLOCKED blocks, at 1440px and 375px:
//   - confirms the target element's `style` attribute is null (no-inline contract)
//   - reads the computed value of the custom property that moved to scoped CSS
//
// Run: node scripts/gate-canary-2-capture.mjs

import { chromium } from 'playwright';

const URL = 'https://sandybrown-nightingale-600381.hostingersite.com/sgs-gate-canary-2/';
const VIEWPORTS = [
	{ label: '1440', width: 1440, height: 900 },
	{ label: '375', width: 375, height: 800 },
];

const TARGETS = [
	{
		block: 'cta-section',
		selector: '.sgs-cta-section__overlay',
		prop: '--sgs-cta-overlay-opacity',
	},
	{
		block: 'form',
		selector: '.sgs-form__progress',
		prop: '--sgs-progress-colour',
	},
	{
		block: 'gallery',
		selector: '.sgs-gallery__item:nth-child(1)',
		prop: '--sgs-item-aspect',
	},
	{
		block: 'gallery',
		selector: '.sgs-gallery__item:nth-child(1)',
		prop: '--sgs-item-index',
	},
	{
		block: 'google-reviews',
		selector: '.sgs-google-reviews__breakdown-row:nth-child(1) .sgs-google-reviews__breakdown-fill',
		prop: '--sgs-gr-pct',
	},
	{
		block: 'pricing-table',
		selector: '.sgs-pricing-table__ribbon',
		prop: '--sgs-pt-ribbon-bg',
	},
	{
		block: 'product-card',
		selector: '.product-card__discount-label',
		prop: '--sgs-pc-badge-fg',
	},
];

const browser = await chromium.launch();
const page = await browser.newPage();

const results = [];

for ( const viewport of VIEWPORTS ) {
	await page.setViewportSize( { width: viewport.width, height: viewport.height } );
	await page.goto( URL, { waitUntil: 'networkidle' } );

	for ( const target of TARGETS ) {
		const el = page.locator( target.selector ).first();
		const count = await el.count();
		if ( count === 0 ) {
			results.push( {
				...target,
				viewport: viewport.label,
				found: false,
				styleAttr: null,
				computedValue: null,
			} );
			continue;
		}

		const styleAttr = await el.getAttribute( 'style' );
		const computedValue = await el.evaluate( ( node, prop ) => {
			return getComputedStyle( node ).getPropertyValue( prop ).trim();
		}, target.prop );

		results.push( {
			...target,
			viewport: viewport.label,
			found: true,
			styleAttr,
			computedValue,
		} );
	}
}

await browser.close();

console.log( JSON.stringify( results, null, 2 ) );

const failures = results.filter(
	( r ) => ! r.found || r.styleAttr !== null || ! r.computedValue
);

if ( failures.length > 0 ) {
	console.error( '\nFAILURES:', JSON.stringify( failures, null, 2 ) );
	process.exit( 1 );
}

console.log( '\nAll targets: style attr null, computed value present, at both viewports.' );
