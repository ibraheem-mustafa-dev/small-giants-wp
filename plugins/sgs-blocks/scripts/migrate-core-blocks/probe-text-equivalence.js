#!/usr/bin/env node
/**
 * Content-keyed typography equivalence probe (rule 4a).
 *
 * Compares every text node's COMPUTED typography between a BEFORE page
 * (core blocks) and an AFTER page (SGS blocks), keyed by normalised TEXT
 * CONTENT — never by wrapper class, and never by source declaration (both
 * of those failure modes are documented in CLAUDE.md rule 4a). Catches
 * inherited values, which a source-diff cannot see.
 *
 * Usage (from plugins/sgs-blocks):
 *   node scripts/migrate-core-blocks/probe-text-equivalence.js <before-url> <after-url>
 */
const { chromium } = require( 'playwright' );

const PROPS = [
	'fontSize', 'fontWeight', 'fontStyle', 'lineHeight', 'letterSpacing',
	'textTransform', 'textAlign', 'color', 'fontFamily', 'textDecorationLine',
];

async function measure( page, url ) {
	await page.goto( url, { waitUntil: 'networkidle' } );
	return page.evaluate(
		( props ) => {
			const out = {};
			const nodes = document.querySelectorAll(
				'p, h1, h2, h3, h4, h5, h6, .wp-block-sgs-text, .wp-block-sgs-heading'
			);
			for ( const el of nodes ) {
				const key = ( el.innerText || '' ).trim().replace( /\s+/g, ' ' ).slice( 0, 60 );
				if ( ! key || out[ key ] ) {
					continue;
				}
				const cs = getComputedStyle( el );
				const rec = { tag: el.tagName.toLowerCase() };
				for ( const p of props ) {
					rec[ p ] = cs[ p ];
				}
				out[ key ] = rec;
			}
			return out;
		},
		PROPS
	);
}

( async () => {
	const [ beforeUrl, afterUrl ] = process.argv.slice( 2 );
	const browser = await chromium.launch();
	const page = await browser.newPage( { viewport: { width: 1440, height: 900 } } );
	const before = await measure( page, beforeUrl );
	const after = await measure( page, afterUrl );

	let diffs = 0;
	let matched = 0;
	const missing = [];
	for ( const [ key, b ] of Object.entries( before ) ) {
		const a = after[ key ];
		if ( ! a ) {
			missing.push( key );
			continue;
		}
		matched++;
		const changed = [];
		for ( const p of [ 'tag', ...PROPS ] ) {
			if ( b[ p ] !== a[ p ] ) {
				changed.push( `${ p }: ${ b[ p ] } -> ${ a[ p ] }` );
			}
		}
		if ( changed.length ) {
			diffs++;
			console.log( `DIFF "${ key }"` );
			changed.forEach( ( c ) => console.log( `   ${ c }` ) );
		}
	}
	console.log( `\nmatched ${ matched } text nodes; ${ diffs } with computed diffs; ${ missing.length } missing on AFTER` );
	missing.forEach( ( m ) => console.log( `  MISSING: "${ m }"` ) );
	console.log( diffs === 0 && missing.length === 0 ? 'VERDICT: PASS' : 'VERDICT: REVIEW' );
	await browser.close();
} )();
