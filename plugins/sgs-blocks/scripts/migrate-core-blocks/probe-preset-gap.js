#!/usr/bin/env node
/**
 * Track C preset-gap probe — measures the LIVE computed font-size of the four
 * PROBE blocks on the canary test page (id 1468, /tc-preset-gap-probe/).
 *
 * Baseline (pre-fix) prediction: A (sgs/text fontSize:"small") and C
 * (sgs/heading fontSize:"small") render at their inherited theme sizes — the
 * slug is dropped; B (numeric 18px) renders 18px; D (core paragraph preset)
 * renders 14px = var(--wp--preset--font-size--small), the parity target.
 * Post-fix prediction: A and C render 14px, B and D unchanged.
 *
 * Run from plugins/sgs-blocks (playwright resolves from its node_modules):
 *   node scripts/migrate-core-blocks/probe-preset-gap.js
 */
const { chromium } = require( 'playwright' );

const URL = 'https://sandybrown-nightingale-600381.hostingersite.com/tc-preset-gap-probe/';

( async () => {
	const browser = await chromium.launch();
	const page = await browser.newPage();
	await page.goto( URL, { waitUntil: 'networkidle' } );
	const result = await page.evaluate( () => {
		const out = {};
		for ( const label of [ 'PROBE-A', 'PROBE-B', 'PROBE-C', 'PROBE-D' ] ) {
			const el = Array.from( document.querySelectorAll( 'p, h1, h2, h3, h4, h5, h6' ) )
				.find( ( n ) => n.textContent.trim().startsWith( label ) );
			out[ label ] = el
				? {
						tag: el.tagName.toLowerCase(),
						fontSize: getComputedStyle( el ).fontSize,
						classes: el.className,
				  }
				: 'NOT FOUND';
		}
		return out;
	} );
	console.log( JSON.stringify( result, null, 1 ) );
	await browser.close();
} )();
