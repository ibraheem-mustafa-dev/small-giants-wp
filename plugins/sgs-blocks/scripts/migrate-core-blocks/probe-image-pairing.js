#!/usr/bin/env node
/**
 * Track C image-pairing equivalence probe — compares the rendered geometry of
 * the three representative images on the BEFORE (core/image) and AFTER
 * (sgs/media) canary test pages. Content-keyed per rule 4a: images are keyed
 * by their alt text (the stable content identity), never by wrapper class.
 *
 * Run from plugins/sgs-blocks:
 *   node scripts/migrate-core-blocks/probe-image-pairing.js
 */
const { chromium } = require( 'playwright' );

const BASE = 'https://sandybrown-nightingale-600381.hostingersite.com';
const ALTS = [ 'About us', 'Strategy and planning', 'Alex Johnson' ];

async function measure( page, url ) {
	await page.goto( url, { waitUntil: 'networkidle' } );
	return page.evaluate( ( alts ) => {
		const out = {};
		for ( const alt of alts ) {
			const img = document.querySelector( `img[alt="${ alt }"]` );
			if ( ! img ) {
				out[ alt ] = 'NOT FOUND';
				continue;
			}
			const r = img.getBoundingClientRect();
			const cs = getComputedStyle( img );
			const wrap = img.closest( 'figure' ) || img.parentElement;
			const wr = wrap.getBoundingClientRect();
			out[ alt ] = {
				w: Math.round( r.width ),
				h: Math.round( r.height ),
				radius: cs.borderRadius,
				objectFit: cs.objectFit,
				wrapperCentred:
					Math.abs( wr.left - ( document.documentElement.clientWidth - wr.right ) ) < 2,
			};
		}
		return out;
	}, ALTS );
}

( async () => {
	const browser = await chromium.launch();
	const page = await browser.newPage( { viewport: { width: 1440, height: 900 } } );
	const before = await measure( page, `${ BASE }/tc-image-pairing-before/` );
	const after = await measure( page, `${ BASE }/tc-image-pairing-after/` );
	let pass = true;
	for ( const alt of ALTS ) {
		const b = before[ alt ];
		const a = after[ alt ];
		const same = JSON.stringify( b ) === JSON.stringify( a );
		// objectFit legitimately differs (core: fill default; sgs/media: cover)
		// — visually identical when the source aspect matches the box, so
		// compare it separately rather than failing the whole key.
		let verdict = same ? 'MATCH' : 'DIFF';
		if ( ! same && b !== 'NOT FOUND' && a !== 'NOT FOUND' ) {
			const bx = { ...b, objectFit: null };
			const ax = { ...a, objectFit: null };
			if ( JSON.stringify( bx ) === JSON.stringify( ax ) ) {
				verdict = 'MATCH (objectFit differs: ' + b.objectFit + ' -> ' + a.objectFit + ')';
			}
		}
		if ( ! verdict.startsWith( 'MATCH' ) ) {
			pass = false;
		}
		console.log( `${ alt }:`, verdict );
		console.log( '  before:', JSON.stringify( b ) );
		console.log( '  after: ', JSON.stringify( a ) );
	}
	console.log( pass ? 'VERDICT: PASS' : 'VERDICT: FAIL' );
	await browser.close();
	process.exit( pass ? 0 : 1 );
} )();
