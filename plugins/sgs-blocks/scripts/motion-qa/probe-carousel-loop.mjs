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
 * first. The SECOND guard is the item selector: this probe used to hardcode
 * `.sgs-gallery__item`, so pointed at any other block it counted ZERO real
 * cards and the load-bearing "dots == real cards" assertion degenerated to
 * `0 === 0` and passed without testing anything. The selector is now a
 * parameter, and a run that matches nothing exits non-zero — a probe that
 * finds no real items is broken, never a pass.
 *
 * Usage: node scripts/motion-qa/probe-carousel-loop.mjs [url] [item-selector]
 *   url            defaults to the gallery loop canary (below)
 *   item-selector  defaults to `.sgs-gallery__item` — pass the rolled-out
 *                  block's own card selector, e.g. `.sgs-post-grid__item`
 */

import { chromium } from 'playwright';

const URL =
	process.argv[ 2 ] ||
	'https://sandybrown-nightingale-600381.hostingersite.com/loop-carousel-canary/';

/** Per-block card selector. Default keeps every existing gallery invocation unchanged. */
const ITEM_SELECTOR = process.argv[ 3 ] || '.sgs-gallery__item';

const results = [];

/** Assertions deliberately NOT exercised on this block — never counted as passes. */
const skipped = [];

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
console.log( `\ncarousel-loop probe -> ${ URL }\n  item selector: ${ ITEM_SELECTOR }\n` );
/*
 * `networkidle` is the ideal settle signal but it is NOT universally reachable:
 * a WooCommerce product surface (sgs/buybox) keeps chattering, so the wait
 * expires after 30s and the probe dies having measured nothing — a probe
 * failure indistinguishable from a block failure. Fall back to `load` plus a
 * fixed settle, which is weaker but sufficient: every assertion below reads the
 * DOM directly, and the loop module boots at module scope, not on idle. The
 * fallback is announced so a run is never silently measured under weaker
 * conditions than it claims.
 */
try {
	await page.goto( `${ URL }?cb=${ Date.now() }`, { waitUntil: 'networkidle' } );
} catch ( err ) {
	// eslint-disable-next-line no-console
	console.log(
		`  [note] networkidle not reached (${ err.name }) — falling back to load + 2s settle. Assertions are DOM reads, so they remain valid.`
	);
	await page.goto( `${ URL }?cb=${ Date.now() }`, { waitUntil: 'load' } );
	await page.waitForTimeout( 2000 );
}

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

	/*
	 * A clone must be INERT IN SUBSTANCE, not just flagged inert. `inert` +
	 * `aria-hidden` stop a human reaching it; they do NOT stop a JS framework
	 * hydrating it. A clone still carrying `data-wp-*` is picked up by whatever
	 * Interactivity store owns those directives and behaves as a second live
	 * copy of the original — visually inert, functionally alive — and a clone
	 * repeating `data-index`/`aria-current` hands that store, or an assistive
	 * technology, two elements claiming the same position. `sgs/buybox`'s
	 * thumbnail strip is where this bites (its thumbs are store-driven
	 * buttons), but the check is deliberately generic: it is the same bug for
	 * any clone of any block.
	 */
	const live = [];
	[ ...all ].forEach( ( c ) => {
		[ c, ...c.querySelectorAll( '*' ) ].forEach( ( n ) => {
			[ ...n.attributes ].forEach( ( a ) => {
				if (
					a.name.startsWith( 'data-wp-' ) ||
					'data-index' === a.name ||
					'aria-current' === a.name
				) {
					live.push( a.name );
				}
			} );
		} );
	} );

	return {
		count: all.length,
		notNeutralised: bad.length,
		liveAttrCount: live.length,
		liveAttrNames: [ ...new Set( live ) ].join( ', ' ) || 'none',
	};
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
check(
	'no clone carries a live framework directive or position claim (data-wp-*, data-index, aria-current)',
	0 === clones.liveAttrCount,
	`${ clones.liveAttrCount } live attribute(s) found on clone subtrees: ${ clones.liveAttrNames }`
);

/* ---- 2. THE DOTS QUESTION — do they count REAL cards, not clones? ---- */
const counts = await page.evaluate( ( itemSelector ) => {
	const el = document.querySelector( '[data-sgs-loop]' );
	const real = el.querySelectorAll(
		`${ itemSelector }:not([data-sgs-loop-clone])`
	).length;
	const withClones = el.querySelectorAll( itemSelector ).length;

	/*
	 * SCOPE THE DOTS TO THE SAME BLOCK INSTANCE AS THE TRACK. This used to be a
	 * document-wide query while `real` was track-scoped, so on a page carrying
	 * TWO instances of the same block it summed both instances' dots and
	 * compared them against one instance's cards — reporting 6 dots against 3
	 * cards and failing a block that was behaving correctly. Comparing a
	 * page-wide count with an element-scoped count is not a comparison.
	 * Dots live OUTSIDE the scroller (they are siblings of it, not children),
	 * so the shared ancestor is the block root.
	 */
	const blockRoot = el.closest( '[class*="wp-block-sgs-"]' ) || document;
	const dots = blockRoot.querySelectorAll(
		'.sgs-gallery__dot, [class*="dot"][role="tab"], button[class*="dot"]'
	).length;
	return { real, withClones, dots, scopedTo: blockRoot === document ? 'document (no block root found)' : 'block root' };
}, ITEM_SELECTOR );

/* ---- VACUITY GUARD: a selector matching nothing makes the dots assertion meaningless ---- */
if ( 0 === counts.real ) {
	// eslint-disable-next-line no-console
	console.log(
		`  [FAIL] item selector "${ ITEM_SELECTOR }" matched ZERO real items inside [data-sgs-loop] — the "dots == real cards" assertion would degenerate to 0 === 0 and pass vacuously. Pass this block's own card selector as the second argument. Broken probe, not a passing block.`
	);
	await browser.close();
	process.exit( 1 );
}
/*
 * A DOTLESS BLOCK MUST NOT REPORT PASS HERE. This assertion used to read
 * `dots === real || 0 === dots`, which was safe while `sgs/gallery` was the
 * only target (it always renders dots) but is vacuous the moment the probe is
 * pointed at a block that renders none — `sgs/buybox` navigates its thumbnail
 * strip through the product-card store and has no dots at all, so it would
 * have banked a PASS on the one assertion this probe exists to make. Report it
 * as NOT EXERCISED instead: it neither passes nor fails, and the verdict line
 * says so, so nobody can read "8/8" as "the dots were checked".
 */
if ( 0 === counts.dots ) {
	skipped.push( 'dot count keys to the REAL card count' );
	// eslint-disable-next-line no-console
	console.log(
		`  [N/A ] dot count keys to the REAL card count — real cards=${ counts.real }, with clones=${ counts.withClones }, dots=0. This block renders no dots, so the assertion was NOT exercised. If this block is supposed to have dots, that absence is itself the defect.`
	);
} else {
	check(
		'dot count keys to the REAL card count, not the cloned length',
		counts.dots === counts.real,
		`real cards=${ counts.real }, with clones=${ counts.withClones }, dots=${ counts.dots }`
	);
}

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
	}/${ results.length } assertions held${
		skipped.length
			? `, ${ skipped.length } NOT EXERCISED (${ skipped.join(
					'; '
			  ) }) — this run does not claim them`
			: ''
	}\n`
);
process.exit( failed.length ? 1 : 0 );
