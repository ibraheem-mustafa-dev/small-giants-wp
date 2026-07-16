#!/usr/bin/env node
/**
 * Group→container layout equivalence: compare the wrapper element's box +
 * background + the inner content-band width between a BEFORE (core/group) and
 * AFTER (sgs/container) render. Keyed by a text anchor inside the group.
 * Usage (from plugins/sgs-blocks): node scripts/migrate-core-blocks/probe-group-layout.js <before> <after> <anchor>
 */
const { chromium } = require( 'playwright' );

async function measure( page, url, anchor ) {
	await page.goto( url, { waitUntil: 'networkidle' } );
	return page.evaluate( ( a ) => {
		// The outermost element that contains the anchor text AND is full/wide bleed.
		const heading = Array.from( document.querySelectorAll( 'h1,h2,h3,p,summary' ) )
			.find( ( n ) => ( n.innerText || '' ).includes( a ) );
		if ( ! heading ) return 'anchor NOT FOUND';
		// Walk up to the section/div wrapper (the migrated container).
		let wrap = heading.closest( '.wp-block-group, .wp-block-sgs-container, section, main' );
		if ( ! wrap ) return 'wrapper NOT FOUND';
		const cs = getComputedStyle( wrap );
		const r = wrap.getBoundingClientRect();
		// Inner content band: the first block-level child that holds the content.
		const inner = wrap.querySelector( ':scope > *' );
		const ir = inner ? inner.getBoundingClientRect() : r;
		return {
			tag: wrap.tagName.toLowerCase(),
			wrapW: Math.round( r.width ),
			bg: cs.backgroundColor,
			padTop: cs.paddingTop,
			innerW: Math.round( ir.width ),
			innerLeft: Math.round( ir.left ),
		};
	}, anchor );
}

( async () => {
	const [ before, after, anchor ] = process.argv.slice( 2 );
	const browser = await chromium.launch();
	const page = await browser.newPage( { viewport: { width: 1440, height: 900 } } );
	const b = await measure( page, before, anchor );
	const a = await measure( page, after, anchor );
	console.log( 'BEFORE(core/group)   :', JSON.stringify( b ) );
	console.log( 'AFTER(sgs/container) :', JSON.stringify( a ) );
	await browser.close();
} )();
