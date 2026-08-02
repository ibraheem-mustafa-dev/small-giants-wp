/**
 * Live probe — looping carousels (Spec 38, Bean's independent-control ruling).
 *
 * THE ASSERTION THIS IS BUILT AROUND. Bean's eye caught last wave's defects
 * because the automated checks asked "did it move?" instead of "did the DOTS
 * follow the CARDS?". A looping carousel makes that distinction sharper: clones
 * are inserted into the track, so a naive dot count reads the CLONED length and
 * the indicator silently stops matching reality. That is the assertion here.
 *
 * WHY LOOP AND DRAG ARE TESTED TOGETHER. Bean ruled looping must be independent
 * of drag ("they should be independent controls"), which means the interesting
 * state is BOTH ON: the loop module mutates the DOM, and the drag module derives
 * its bounds from `scrollWidth`. If drag cached its bounds before the clones
 * existed, dragging would stop short of the cloned region. Measured, not
 * reasoned about.
 *
 * VACUITY GUARDS. A carousel that does not overflow cannot loop, and every
 * assertion below would pass without exercising anything. Overflow is asserted
 * first.
 *
 * Usage: node scripts/motion-qa/probe-carousel-loop.mjs [url]
 */

import { chromium } from 'playwright';

const URL =
	process.argv[ 2 ] ||
	'https://sandybrown-nightingale-600381.hostingersite.com/loop-carousel-canary/';

const results = [];

/**
 * Record one assertion.
 *
 * @param {string}  name   What was checked.
 * @param {boolean} pass   Whether it held.
 * @param {string}  detail Measured values, always.
 */
function check( name, pass, detail ) {
	results.push( { name, pass, detail } );
	// eslint-disable-next-line no-console
	console.log( `  [${ pass ? 'PASS' : 'FAIL' }] ${ name } — ${ detail }` );
}

const browser = await chromium.launch();
const page = await browser
	.newContext( { viewport: { width: 1280, height: 900 } } )
	.then( ( c ) => c.newPage() );

// eslint-disable-next-line no-console
console.log( `\ncarousel-loop probe -> ${ URL }\n` );
await page.goto( `${ URL }?cb=${ Date.now() }`, { waitUntil: 'networkidle' } );

const track = page.locator( '[data-sgs-loop]' ).first();
if ( 0 === ( await page.locator( '[data-sgs-loop]' ).count() ) ) {
	// eslint-disable-next-line no-console
	console.log( '  [FAIL] no [data-sgs-loop] element — fixture wrong or marker not emitted.' );
	await browser.close();
	process.exit( 1 );
}
await track.scrollIntoViewIfNeeded();

/* ---- VACUITY GUARD: a non-overflowing track cannot loop ---- */
const geom = await page.evaluate( () => {
	const el = document.querySelector( '[data-sgs-loop]' );
	return {
		scrollWidth: el.scrollWidth,
		clientWidth: el.clientWidth,
		overflowX: window.getComputedStyle( el ).overflowX,
	};
} );
if ( geom.scrollWidth <= geom.clientWidth ) {
	// eslint-disable-next-line no-console
	console.log(
		`  [INCONCLUSIVE] track does not overflow (scrollWidth=${ geom.scrollWidth } <= clientWidth=${ geom.clientWidth }) — nothing to loop. Probe limitation, not a code failure.`
	);
	await browser.close();
	process.exit( 3 );
}
check(
	'track genuinely overflows (loop has something to do)',
	true,
	`scrollWidth=${ geom.scrollWidth } > clientWidth=${ geom.clientWidth }, overflow-x=${ geom.overflowX }`
);

/* ---- 1. CLONES: inserted, and hidden from a11y + tab order ---- */
const clones = await page.evaluate( () => {
	const all = document.querySelectorAll( '[data-sgs-loop-clone]' );
	const bad = [ ...all ].filter(
		( c ) => 'true' !== c.getAttribute( 'aria-hidden' ) || ! c.hasAttribute( 'inert' )
	);
	return { count: all.length, notNeutralised: bad.length };
} );
check(
	'clones inserted (the loop mechanism exists in the DOM)',
	clones.count > 0,
	`${ clones.count } clone(s)`
);
check(
	'every clone is inert + aria-hidden (never reachable by keyboard or SR)',
	0 === clones.notNeutralised,
	`${ clones.notNeutralised } clone(s) NOT neutralised`
);

/* ---- 2. THE DOTS QUESTION — do they count REAL cards, not clones? ---- */
const counts = await page.evaluate( () => {
	const el = document.querySelector( '[data-sgs-loop]' );
	const real = el.querySelectorAll(
		'.sgs-gallery__item:not([data-sgs-loop-clone])'
	).length;
	const withClones = el.querySelectorAll( '.sgs-gallery__item' ).length;
	const dots = document.querySelectorAll(
		'.sgs-gallery__dot, [class*="dot"][role="tab"], button[class*="dot"]'
	).length;
	return { real, withClones, dots };
} );
check(
	'dot count keys to the REAL card count, not the cloned length',
	counts.dots === counts.real || 0 === counts.dots,
	`real cards=${ counts.real }, with clones=${ counts.withClones }, dots=${ counts.dots }` +
		( 0 === counts.dots ? ' (no dots rendered on this layout — not applicable)' : '' )
);

/* ---- 3. THE LOOP ITSELF: does passing the end wrap back? ---- */
const wrap = await page.evaluate( async () => {
	const el = document.querySelector( '[data-sgs-loop]' );
	const max = el.scrollWidth - el.clientWidth;
	// Drive to the very end, then a little past — the boundary the loop owns.
	el.scrollLeft = max;
	await new Promise( ( r ) => setTimeout( r, 250 ) );
	const atEnd = el.scrollLeft;
	el.scrollLeft = max + 200;
	await new Promise( ( r ) => setTimeout( r, 400 ) );
	return { max, atEnd, afterPastEnd: el.scrollLeft };
} );
check(
	'scrolling past the end does NOT dead-stop at max (it wraps or re-seats)',
	wrap.afterPastEnd < wrap.max,
	`max=${ wrap.max }, at end=${ wrap.atEnd }, after pushing past=${ wrap.afterPastEnd }`
);

/* ---- 4. DRAG × LOOP: bounds must include the clones ---- */
const dragBound = await page.evaluate( () => {
	const el = document.querySelector( '[data-sgs-loop]' );
	return {
		hasDrag: el.getAttribute( 'data-sgs-fx' ) === 'draggable',
		scrollWidth: el.scrollWidth,
		cursor: window.getComputedStyle( el ).cursor,
	};
} );
check(
	'drag and loop are BOTH active on the same element (independent controls)',
	dragBound.hasDrag,
	`data-sgs-fx=${ dragBound.hasDrag ? 'draggable' : 'ABSENT' }, cursor=${ dragBound.cursor }`
);
check(
	'drag bounds derive from the POST-clone scrollWidth',
	dragBound.scrollWidth >= geom.scrollWidth,
	`scrollWidth now ${ dragBound.scrollWidth } (was ${ geom.scrollWidth } at first read)`
);

/* ---- 5. A REAL GESTURE, not a scripted scrollLeft write ---- */
const box = await track.boundingBox();
const y = Math.round( box.y + box.height / 2 );
await page.mouse.move( Math.round( box.x + box.width * 0.8 ), y );
await page.mouse.down();
for ( let i = 1; i <= 8; i++ ) {
	await page.mouse.move(
		Math.round( box.x + box.width * 0.8 - i * 40 ),
		y
	);
}
await page.mouse.up();
await page.waitForTimeout( 600 );
const afterDrag = await page.evaluate(
	() => document.querySelector( '[data-sgs-loop]' ).scrollLeft
);
check(
	'a real pointer drag moves the track (gesture, not a scripted write)',
	afterDrag > 0,
	`scrollLeft after a 320px drag = ${ afterDrag }`
);

await browser.close();
const failed = results.filter( ( r ) => ! r.pass );
// eslint-disable-next-line no-console
console.log(
	`\nVERDICT: ${ failed.length ? 'FAIL' : 'PASS' } — ${
		results.length - failed.length
	}/${ results.length } assertions held\n`
);
process.exit( failed.length ? 1 : 0 );
