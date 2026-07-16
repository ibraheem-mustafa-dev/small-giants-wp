#!/usr/bin/env node
/**
 * Columns→container responsive equivalence: compares the two column cells'
 * geometry between BEFORE (core/columns) and AFTER (sgs/container grid) at
 * DESKTOP (1440, expect side-by-side split) and MOBILE (375, expect stacked
 * full-width). Keyed by each column's first text/image content.
 * Usage: node probe-columns-responsive.js <before-url> <after-url>
 */
const { chromium } = require( 'playwright' );

async function measure( page, url, width ) {
	await page.setViewportSize( { width, height: 900 } );
	await page.goto( url, { waitUntil: 'networkidle' } );
	return page.evaluate( () => {
		// The two columns: core = .wp-block-column; sgs = the grid cells
		// (.wp-block-sgs-container children of the grid row). Grab the first two
		// column-ish boxes that sit side-by-side or stacked.
		const cells = Array.from( document.querySelectorAll(
			'.wp-block-column, .sgs-container--grid > .wp-block-sgs-container, .sgs-container[style*="grid"] > .wp-block-sgs-container'
		) ).slice( 0, 2 );
		return cells.map( ( c ) => {
			const r = c.getBoundingClientRect();
			return { w: Math.round( r.width ), left: Math.round( r.left ), top: Math.round( r.top ) };
		} );
	} );
}

( async () => {
	const [ before, after ] = process.argv.slice( 2 );
	const browser = await chromium.launch();
	const page = await browser.newPage();
	for ( const w of [ 1440, 375 ] ) {
		const b = await measure( page, before, w );
		const a = await measure( page, after, w );
		const stacked = ( cells ) => cells.length === 2 && cells[ 1 ].top > cells[ 0 ].top + 20;
		console.log( `--- ${ w }px ---` );
		console.log( '  BEFORE(core):', JSON.stringify( b ), stacked( b ) ? '[STACKED]' : '[side-by-side]' );
		console.log( '  AFTER(sgs) :', JSON.stringify( a ), stacked( a ) ? '[STACKED]' : '[side-by-side]' );
	}
	await browser.close();
} )();
