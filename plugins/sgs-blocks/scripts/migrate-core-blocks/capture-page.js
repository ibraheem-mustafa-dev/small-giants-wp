#!/usr/bin/env node
/**
 * Generic Track C first-paint capture: screenshots a URL at 375/768/1440 into
 * reports/visual-diff/ and flags horizontal overflow.
 *
 * Run from plugins/sgs-blocks:
 *   node scripts/migrate-core-blocks/capture-page.js <url> <out-prefix>
 */
const path = require( 'path' );
const { chromium } = require( 'playwright' );

const [ url, prefix ] = process.argv.slice( 2 );
if ( ! url || ! prefix ) {
	console.error( 'usage: capture-page.js <url> <out-prefix>' );
	process.exit( 2 );
}
const OUT = path.resolve( __dirname, '../../../../reports/visual-diff' );

( async () => {
	const browser = await chromium.launch();
	for ( const [ w, h, name ] of [ [ 375, 812, 'mobile' ], [ 768, 1024, 'tablet' ], [ 1440, 900, 'desktop' ] ] ) {
		const page = await browser.newPage( { viewport: { width: w, height: h } } );
		await page.goto( url, { waitUntil: 'networkidle' } );
		await page.screenshot( { path: `${ OUT }/${ prefix }-${ name }.png`, fullPage: true } );
		const overflow = await page.evaluate(
			() => document.documentElement.scrollWidth > document.documentElement.clientWidth
		);
		console.log( `${ name } ${ w }x${ h } captured; horizontal overflow: ${ overflow }` );
		await page.close();
	}
	await browser.close();
} )();
