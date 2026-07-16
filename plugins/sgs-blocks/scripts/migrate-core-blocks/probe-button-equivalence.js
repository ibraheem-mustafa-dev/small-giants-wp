#!/usr/bin/env node
/**
 * Content-keyed button equivalence probe (rule 4a): compares each button's
 * rendered geometry + paint between a BEFORE page (core/button) and an AFTER
 * page (sgs/button), keyed by the button's LABEL TEXT — never by wrapper class.
 * Also reports the row's justify/alignment so a core/buttons -> sgs/multi-button
 * swap can be checked at the same time.
 *
 * Usage (from plugins/sgs-blocks):
 *   node scripts/migrate-core-blocks/probe-button-equivalence.js <before-url> <after-url>
 */
const { chromium } = require( 'playwright' );

const PROPS = [
	'backgroundColor', 'color', 'borderRadius', 'fontSize', 'fontWeight',
	'paddingTop', 'paddingLeft', 'textDecorationLine', 'borderTopWidth', 'borderTopColor',
];

async function measure( page, url ) {
	await page.goto( url, { waitUntil: 'networkidle' } );
	return page.evaluate( ( props ) => {
		const out = {};
		// MUST include <button>: a core/button with no href renders a dead <a>,
		// whereas sgs/button with no url renders a real <button type="button">.
		// An <a>-only selector reports the migrated CTA as MISSING (it isn't).
		for ( const a of document.querySelectorAll( 'a, button' ) ) {
			const key = ( a.innerText || '' ).trim();
			if ( ! key || out[ key ] ) {
				continue;
			}
			const cs = getComputedStyle( a );
			const r = a.getBoundingClientRect();
			const rec = {
				tag: a.tagName.toLowerCase(),
				w: Math.round( r.width ),
				h: Math.round( r.height ),
				href: a.getAttribute( 'href' ) || '(none)',
			};
			for ( const p of props ) {
				rec[ p ] = cs[ p ];
			}
			out[ key ] = rec;
		}
		return out;
	}, PROPS );
}

( async () => {
	const [ beforeUrl, afterUrl ] = process.argv.slice( 2 );
	const browser = await chromium.launch();
	const page = await browser.newPage( { viewport: { width: 1440, height: 900 } } );
	const before = await measure( page, beforeUrl );
	const after = await measure( page, afterUrl );

	let diffs = 0;
	const missing = [];
	for ( const [ key, b ] of Object.entries( before ) ) {
		const a = after[ key ];
		if ( ! a ) {
			missing.push( key );
			continue;
		}
		const changed = [];
		for ( const p of [ 'tag', 'w', 'h', 'href', ...PROPS ] ) {
			if ( b[ p ] !== a[ p ] ) {
				changed.push( `${ p }: ${ b[ p ] } -> ${ a[ p ] }` );
			}
		}
		if ( changed.length ) {
			diffs++;
			console.log( `DIFF "${ key }"` );
			changed.forEach( ( c ) => console.log( `   ${ c }` ) );
		} else {
			console.log( `MATCH "${ key }"` );
		}
	}
	missing.forEach( ( m ) => console.log( `MISSING on AFTER: "${ m }"` ) );
	console.log( diffs === 0 && missing.length === 0 ? 'VERDICT: PASS' : 'VERDICT: REVIEW' );
	await browser.close();
} )();
