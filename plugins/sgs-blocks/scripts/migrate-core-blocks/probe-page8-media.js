#!/usr/bin/env node
/**
 * Page-8 (homepage clone) media geometry probe — regression net for the
 * sgs/media naked-mode max-width fix. Run before and after the deploy;
 * the two JSON outputs must be identical.
 *
 * Run from plugins/sgs-blocks:
 *   node scripts/migrate-core-blocks/probe-page8-media.js
 */
const { chromium } = require( 'playwright' );

( async () => {
	const browser = await chromium.launch();
	const page = await browser.newPage( { viewport: { width: 1440, height: 900 } } );
	await page.goto( 'https://sandybrown-nightingale-600381.hostingersite.com/?page_id=8', {
		waitUntil: 'networkidle',
	} );
	const out = await page.evaluate( () =>
		Array.from( document.querySelectorAll( 'img.sgs-media__img, .wp-block-sgs-media img' ) )
			.slice( 0, 12 )
			.map( ( i ) => {
				const r = i.getBoundingClientRect();
				return { alt: ( i.alt || '' ).slice( 0, 30 ), w: Math.round( r.width ), h: Math.round( r.height ) };
			} )
	);
	console.log( JSON.stringify( out ) );
	await browser.close();
} )();
