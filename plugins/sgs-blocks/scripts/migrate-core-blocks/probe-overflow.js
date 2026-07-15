#!/usr/bin/env node
/**
 * Track C overflow probe — at 375px, finds every element wider than the
 * viewport and reports its selector path + the computed properties that
 * govern its width. Live-DOM diagnosis, never static parsing.
 *
 * Run from plugins/sgs-blocks:
 *   node scripts/migrate-core-blocks/probe-overflow.js <url>
 */
const { chromium } = require( 'playwright' );

( async () => {
	const url = process.argv[ 2 ];
	const browser = await chromium.launch();
	const page = await browser.newPage( { viewport: { width: 375, height: 812 } } );
	await page.goto( url, { waitUntil: 'networkidle' } );
	const report = await page.evaluate( () => {
		const vw = document.documentElement.clientWidth;
		const offenders = [];
		for ( const el of document.querySelectorAll( 'body *' ) ) {
			const r = el.getBoundingClientRect();
			if ( r.width > vw + 1 || r.right > vw + 1 || r.left < -1 ) {
				const cs = getComputedStyle( el );
				offenders.push( {
					el: el.tagName.toLowerCase()
						+ ( el.className ? '.' + String( el.className ).trim().split( /\s+/ ).join( '.' ) : '' ),
					width: Math.round( r.width ),
					left: Math.round( r.left ),
					right: Math.round( r.right ),
					maxWidth: cs.maxWidth,
					cssWidth: cs.width,
					display: cs.display,
				} );
			}
		}
		return { vw, offenders };
	} );
	console.log( JSON.stringify( report, null, 1 ) );
	await browser.close();
} )();
