#!/usr/bin/env node
/**
 * probe-first-paint.mjs — the no-JS / first-paint capture the SGS visual-diff
 * gate's `first_paint_capture_passed` field is supposed to attest.
 *
 * WHAT IT ASSERTS, AND WHY THIS IS THE RIGHT ASSERTION FOR A LOOPING CAROUSEL.
 * The house rule is progressive enhancement: a block must render meaningful
 * content with JS blocked, and JS may only enhance it. `fx-carousel-loop.js`
 * inserts clones and re-seats `scrollLeft`, so the two ways it could damage
 * first paint are:
 *
 *   1. Content that only appears once JS runs — a blank or collapsed carousel
 *      at first paint, which is what a client sees on a slow connection.
 *   2. Clones present in SERVER markup. Clones are a JS-time construct; if any
 *      appear with JS disabled, the server is emitting duplicate content and
 *      every "real vs cloned" count elsewhere is built on sand.
 *
 * Run with JavaScript disabled, which is a strictly harder condition than
 * "before the module boots" — if the block is correct with JS off forever, it
 * is correct in the window before JS runs.
 *
 * Usage: node scripts/motion-qa/probe-first-paint.mjs <url> <item-selector>
 * Exit 0 = PASS, 1 = FAIL. Never exits 0 on a selector that matched nothing.
 */

import { chromium } from 'playwright';

const URL = process.argv[ 2 ];
const ITEM_SELECTOR = process.argv[ 3 ];

if ( ! URL || ! ITEM_SELECTOR ) {
	// eslint-disable-next-line no-console
	console.log( 'usage: probe-first-paint.mjs <url> <item-selector>' );
	process.exit( 2 );
}

const browser = await chromium.launch();
const page = await browser
	.newContext( { viewport: { width: 1280, height: 900 }, javaScriptEnabled: false } )
	.then( ( c ) => c.newPage() );

// eslint-disable-next-line no-console
console.log( `\nfirst-paint (JS DISABLED) -> ${ URL }\n  item selector: ${ ITEM_SELECTOR }\n` );

try {
	await page.goto( `${ URL }?cb=${ Date.now() }`, { waitUntil: 'load' } );
} catch ( err ) {
	// eslint-disable-next-line no-console
	console.log( `  [FAIL] navigation failed: ${ err.message }` );
	await browser.close();
	process.exit( 1 );
}

const seen = await page.evaluate( ( sel ) => {
	const items = [ ...document.querySelectorAll( sel ) ];
	const visible = items.filter( ( n ) => {
		const r = n.getBoundingClientRect();
		const cs = window.getComputedStyle( n );
		return (
			r.width > 0 &&
			r.height > 0 &&
			'hidden' !== cs.visibility &&
			'none' !== cs.display &&
			parseFloat( cs.opacity ) > 0.01
		);
	} );
	return {
		total: items.length,
		visible: visible.length,
		clonesInServerMarkup: document.querySelectorAll( '[data-sgs-loop-clone]' ).length,
		loopMarkerPresent: !! document.querySelector( '[data-sgs-loop]' ),
	};
}, ITEM_SELECTOR );

const results = [];
const check = ( name, pass, detail ) => {
	results.push( pass );
	// eslint-disable-next-line no-console
	console.log( `  [${ pass ? 'PASS' : 'FAIL' }] ${ name } — ${ detail }` );
};

// Vacuity guard first: a selector that matches nothing makes everything below meaningless.
if ( 0 === seen.total ) {
	// eslint-disable-next-line no-console
	console.log(
		`  [FAIL] item selector "${ ITEM_SELECTOR }" matched ZERO items with JS disabled. Either the block is not server-rendered (a real first-paint defect) or the selector is wrong. Broken probe or broken block — never a pass.`
	);
	await browser.close();
	process.exit( 1 );
}

check(
	'content is server-rendered and VISIBLE with JS disabled (no blank first paint)',
	seen.visible === seen.total,
	`${ seen.visible }/${ seen.total } items visible`
);
check(
	'NO clones in server markup (cloning is a JS-time construct only)',
	0 === seen.clonesInServerMarkup,
	`${ seen.clonesInServerMarkup } clone(s) found with JS off`
);
check(
	'the loop marker IS server-emitted (so JS has something to enhance)',
	seen.loopMarkerPresent,
	seen.loopMarkerPresent ? 'data-sgs-loop present' : 'data-sgs-loop MISSING'
);

await browser.close();
const failed = results.filter( ( r ) => ! r ).length;
// eslint-disable-next-line no-console
console.log(
	`\nVERDICT: ${ failed ? 'FAIL' : 'PASS' } — ${ results.length - failed }/${ results.length } assertions held\n`
);
process.exit( failed ? 1 : 0 );
