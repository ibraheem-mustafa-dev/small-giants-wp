#!/usr/bin/env node
/**
 * Track C preset-gap first-paint capture — screenshots the probe page at
 * 375/768/1440 into reports/visual-diff/ + flags horizontal overflow.
 * Run from plugins/sgs-blocks: node scripts/migrate-core-blocks/capture-preset-gap.js
 */
const path = require( 'path' );
const { chromium } = require( 'playwright' );

const URL = 'https://sandybrown-nightingale-600381.hostingersite.com/tc-preset-gap-probe/';
const OUT = path.resolve( __dirname, '../../../../reports/visual-diff' );

( async () => {
	const browser = await chromium.launch();
	for ( const [ w, h, name ] of [ [ 375, 812, 'mobile' ], [ 768, 1024, 'tablet' ], [ 1440, 900, 'desktop' ] ] ) {
		const page = await browser.newPage( { viewport: { width: w, height: h } } );
		await page.goto( URL, { waitUntil: 'networkidle' } );
		await page.screenshot( { path: `${ OUT }/preset-gap-probe-${ name }-2026-07-15.png`, fullPage: true } );
		const overflow = await page.evaluate(
			() => document.documentElement.scrollWidth > document.documentElement.clientWidth
		);
		console.log( `${ name } ${ w }x${ h } captured; horizontal overflow: ${ overflow }` );
		await page.close();
	}
	await browser.close();
} )();
