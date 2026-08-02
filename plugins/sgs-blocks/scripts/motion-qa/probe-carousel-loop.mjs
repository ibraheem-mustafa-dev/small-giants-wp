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
 * Usage: node scripts/motion-qa/probe-carousel-loop.mjs [url] [item-selector] [next-arrow-selector]
 *   url                 defaults to the gallery loop canary (below)
 *   item-selector       defaults to `.sgs-gallery__item` — pass the rolled-out
 *                       block's own card selector, e.g. `.sgs-post-grid__item`
 *   next-arrow-selector defaults to `.sgs-gallery__carousel-next` — pass the
 *                       block's own "next" arrow selector, e.g.
 *                       `.sgs-trustpilot-reviews__arrow--next`. A block with
 *                       NO arrow (sgs/buybox) reports its arm N/A, never a
 *                       false pass — see the register-item-M2 section below.
 *
 * REGISTER ITEM M2 ("Step Y", 2026-08-02). Two arms of the loop's contract
 * were BUILT but never MEASURED: (1) reduced-motion behaviour for the loop
 * module itself (unstated, not just untested — `fx-carousel-loop.js`'s own
 * docblock only argues by analogy that it should be a no-op), and
 * (2) keyboard arrow-wrap at the loop boundary (WCAG 2.5.7 — arrows were
 * proven to never DISABLE, but wrap was only ever driven by pointer/
 * `scrollLeft`, never by repeated keyboard ARROW-KEY activation). Both are
 * measured below, appended to the SAME results/verdict tally as the
 * pre-existing checks — a run that regresses either arm fails the whole
 * probe, not a silent side-channel.
 */

import { chromium } from 'playwright';

const URL =
	process.argv[ 2 ] ||
	'https://sandybrown-nightingale-600381.hostingersite.com/loop-carousel-canary/';

/** Per-block card selector. Default keeps every existing gallery invocation unchanged. */
const ITEM_SELECTOR = process.argv[ 3 ] || '.sgs-gallery__item';

/** Per-block "next" arrow selector, for the M2 keyboard-wrap arm. */
const NEXT_ARROW_SELECTOR = process.argv[ 4 ] || '.sgs-gallery__carousel-next';

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

/* =========================================================================
 * REGISTER ITEM M2 — ARM 1: reduced motion for the LOOP module itself.
 *
 * The hypothesis (stated in the brief, and echoed in `fx-carousel-loop.js`'s
 * own docblock) is SIMPLIFY-by-construction: the module performs no tween,
 * only instantaneous `scrollLeft` writes, so it should behave IDENTICALLY
 * whether or not the visitor has requested reduced motion. That is a
 * hypothesis, not a measured fact — the module contains zero
 * `matchMedia`/`prefers-reduced-motion` branches, so "identical" is the
 * ABSENCE of a gate, not a gate that was proven to do the right thing.
 * Measured here: boot a FRESH context with `reducedMotion: 'reduce'` (must
 * be set at context-creation time — `matchMedia` is read once at module
 * load, so emulating it post-navigation would not reproduce a real visit),
 * navigate cold, and re-run the same clone/neutralise/wrap assertions the
 * main probe already trusts under normal motion. Equal outcomes under both
 * conditions IS the evidence for "runs identically regardless of
 * preference" — not an assumption.
 *
 * NEGATIVE CONTROL for this arm: the gallery's OWN arrow-click code
 * (`view.js` `goToItem`) DOES branch on reduced motion —
 * `behavior: REDUCED_MOTION ? 'auto' : 'smooth'` passed to
 * `Element.prototype.scrollIntoView`. That is a real, independently-known
 * difference the reduced-motion context MUST produce. `scrollIntoView` is
 * monkey-patched before the click so the literal `behavior` argument is
 * captured, then compared against a normal-motion capture on the ORIGINAL
 * page. If the two ever come back equal, the reduced-motion emulation
 * itself did not take effect and every assertion in this arm is void —
 * this check exists specifically so that failure mode cannot pass silently.
 * ---------------------------------------------------------------------- */
// eslint-disable-next-line no-console
console.log( '\n--- ARM 1: reduced motion (loop module + arrow-click sanity check) ---' );

const rmContext = await browser.newContext( {
	viewport: { width: 1280, height: 900 },
	reducedMotion: 'reduce',
} );
const rmPage = await rmContext.newPage();
try {
	await rmPage.goto( `${ URL }?cb=${ Date.now() }-rm`, { waitUntil: 'networkidle' } );
} catch ( err ) {
	// eslint-disable-next-line no-console
	console.log(
		`  [note] networkidle not reached on reduced-motion context (${ err.name }) — falling back to load + 2s settle.`
	);
	await rmPage.goto( `${ URL }?cb=${ Date.now() }-rm`, { waitUntil: 'load' } );
	await rmPage.waitForTimeout( 2000 );
}

const rmMediaMatches = await rmPage.evaluate(
	() => window.matchMedia( '(prefers-reduced-motion: reduce)' ).matches
);
check(
	'reduced-motion context actually applied prefers-reduced-motion: reduce',
	true === rmMediaMatches,
	`matchMedia(reduce).matches=${ rmMediaMatches }`
);

if ( true !== rmMediaMatches ) {
	// eslint-disable-next-line no-console
	console.log(
		'  [FAIL] the emulated context did not report reduced motion — every remaining Arm 1 assertion below would be measuring the NORMAL-motion page under a false label. Skipping the rest of this arm rather than reporting a meaningless result.'
	);
	skipped.push( 'Arm 1 loop/clone assertions under reduced motion (context emulation did not take effect)' );
} else if ( 0 === ( await rmPage.locator( '[data-sgs-loop]' ).count() ) ) {
	check(
		'[data-sgs-loop] present under reduced motion',
		false,
		'no [data-sgs-loop] element found on the reduced-motion navigation — fixture or marker missing'
	);
} else {
	const rmTrack = rmPage.locator( '[data-sgs-loop]' ).first();
	await rmTrack.scrollIntoViewIfNeeded();

	const rmLoop = await rmPage.evaluate( ( itemSelector ) => {
		const el = document.querySelector( '[data-sgs-loop]' );
		const clones = el.querySelectorAll( '[data-sgs-loop-clone]' );
		const notNeutralised = [ ...clones ].filter(
			( c ) => 'true' !== c.getAttribute( 'aria-hidden' ) || ! c.hasAttribute( 'inert' )
		).length;
		const real = el.querySelectorAll(
			`${ itemSelector }:not([data-sgs-loop-clone])`
		).length;
		return {
			scrollWidth: el.scrollWidth,
			clientWidth: el.clientWidth,
			cloneCount: clones.length,
			notNeutralised,
			real,
		};
	}, ITEM_SELECTOR );

	if ( rmLoop.scrollWidth <= rmLoop.clientWidth || 0 === rmLoop.real ) {
		// eslint-disable-next-line no-console
		console.log(
			`  [INCONCLUSIVE] reduced-motion track does not overflow or item selector matched nothing (scrollWidth=${ rmLoop.scrollWidth }, clientWidth=${ rmLoop.clientWidth }, real=${ rmLoop.real }) — cannot exercise the loop under reduced motion on this fixture.`
		);
		skipped.push( 'Arm 1 loop assertions under reduced motion (fixture does not overflow)' );
	} else {
		check(
			'clones inserted under reduced motion (loop mechanism is NOT suppressed)',
			rmLoop.cloneCount > 0,
			`${ rmLoop.cloneCount } clone(s), real cards=${ rmLoop.real }`
		);
		check(
			'clones neutralised (inert + aria-hidden) under reduced motion',
			0 === rmLoop.notNeutralised,
			`${ rmLoop.notNeutralised } clone(s) NOT neutralised`
		);

		const rmWrap = await rmPage.evaluate( async () => {
			const el = document.querySelector( '[data-sgs-loop]' );
			const max = el.scrollWidth - el.clientWidth;
			el.scrollLeft = max;
			await new Promise( ( r ) => setTimeout( r, 250 ) );
			el.scrollLeft = max + 200;
			await new Promise( ( r ) => setTimeout( r, 400 ) );
			return { max, afterPastEnd: el.scrollLeft };
		} );
		check(
			'boundary correction (scrollLeft re-seat) still fires under reduced motion — instant position writes are not gated, matching the module\'s no-tween contract',
			rmWrap.afterPastEnd < rmWrap.max,
			`max=${ rmWrap.max }, after pushing past=${ rmWrap.afterPastEnd }`
		);
	}
}

/*
 * The independently-known real difference the negative control needs is
 * SOME per-block mechanism that branches on reduced motion. Which DOM method
 * a block uses for its arrow-click varies (`sgs/gallery` and `sgs/post-grid`
 * use `Element.scrollIntoView`; `sgs/trustpilot-reviews` uses
 * `Element.scrollTo`/`scrollBy` with a HARDCODED `behavior: 'smooth'` and no
 * reduced-motion branch at all — found live this session, a genuine defect
 * in that block's own arrow-click, separate from the loop module under
 * test). All three are monkey-patched so the control works regardless of
 * which mechanism the block uses, and a block that never branches on
 * reduced motion is reported as its own finding rather than silently
 * folded into a pass OR mis-attributed to the loop module.
 */
async function captureScrollBehaviour( targetPage ) {
	const arrowExists = await targetPage.evaluate(
		( sel ) => !! document.querySelector( sel ),
		NEXT_ARROW_SELECTOR
	);
	if ( ! arrowExists ) {
		return null;
	}
	return targetPage.evaluate( ( sel ) => {
		return new Promise( ( resolve ) => {
			let captured = 'NONE_CALLED';
			const capture = ( opts ) => {
				if ( 'NONE_CALLED' === captured ) {
					captured =
						opts && opts.behavior ? opts.behavior : 'NO_BEHAVIOUR_ARG';
				}
			};
			const originals = {
				scrollIntoView: Element.prototype.scrollIntoView,
				scrollBy: Element.prototype.scrollBy,
				scrollTo: Element.prototype.scrollTo,
			};
			Element.prototype.scrollIntoView = function ( opts ) {
				capture( opts );
				return originals.scrollIntoView.call( this, opts );
			};
			Element.prototype.scrollBy = function ( opts ) {
				capture( opts );
				return originals.scrollBy.call( this, opts );
			};
			Element.prototype.scrollTo = function ( opts ) {
				capture( opts );
				return originals.scrollTo.call( this, opts );
			};
			document.querySelector( sel ).click();
			setTimeout( () => {
				Object.assign( Element.prototype, originals );
				resolve( captured );
			}, 50 );
		} );
	}, NEXT_ARROW_SELECTOR );
}

const normalBehaviour = await captureScrollBehaviour( page );
const rmBehaviour = true === rmMediaMatches ? await captureScrollBehaviour( rmPage ) : null;

if ( null === normalBehaviour || null === rmBehaviour ) {
	skipped.push(
		'reduced-motion negative control (scroll-behaviour capture) — this block has no next-arrow at NEXT_ARROW_SELECTOR'
	);
	// eslint-disable-next-line no-console
	console.log(
		`  [N/A ] negative control not exercised — no element at "${ NEXT_ARROW_SELECTOR }" on this block. Pass the block's own next-arrow selector as the 4th CLI arg.`
	);
} else if ( 'auto' === rmBehaviour && 'smooth' === normalBehaviour ) {
	check(
		'NEGATIVE CONTROL: reduced-motion context measurably changes THIS block\'s own arrow-click scroll behaviour (auto vs smooth) — proves the emulation is real, not self-reported',
		true,
		`normal="${ normalBehaviour }", reduced="${ rmBehaviour }"`
	);
} else if ( normalBehaviour === rmBehaviour && 'NONE_CALLED' !== normalBehaviour ) {
	// The mechanism fired, and identically both times — this block's OWN
	// arrow-click does not branch on reduced motion at all. Real finding,
	// but it is a defect in the BLOCK's per-instance arrow code, not in the
	// loop module under test (Arm 1's actual subject, already measured
	// above via clone/neutralise/boundary-correction). Reported separately
	// so it is neither a silent pass nor mis-attributed to the loop module.
	skipped.push(
		`reduced-motion negative control via this block's arrow-click — INCONCLUSIVE, but a finding: captured "${ normalBehaviour }" under BOTH normal and reduced motion (this block's own arrow-click ignores prefers-reduced-motion; separate from the loop module's contract)`
	);
	// eslint-disable-next-line no-console
	console.log(
		`  [FINDING] this block's own arrow-click never branches on reduced motion — captured "${ normalBehaviour }" identically under both conditions. That is a real defect in the BLOCK's per-instance code, not the loop module under test here; recorded as a finding, not folded into this arm's pass/fail.`
	);
} else {
	check(
		'NEGATIVE CONTROL: reduced-motion context measurably changes THIS block\'s own arrow-click scroll behaviour',
		false,
		`normal="${ normalBehaviour }", reduced="${ rmBehaviour }" — captured a real mechanism call but the values do not fit the expected auto/smooth split`
	);
}

await rmContext.close();

/* =========================================================================
 * REGISTER ITEM M2 — ARM 2: keyboard arrow-wrap at the loop boundary
 * (WCAG 2.5.7 — the dragging-movements keyboard alternative).
 *
 * Arrows were already proven never to DISABLE (main probe's context, and
 * Spec 38 §11's own a11y contract). What was never exercised is repeated
 * KEYBOARD activation carrying the visitor PAST the boundary — the pointer/
 * `scrollLeft`-driven wrap path is not the same code path as a synthetic
 * click, and WCAG 2.5.7 specifically requires a keyboard-operable
 * alternative to work, not merely exist.
 *
 * Method: reset the track to a clean starting `scrollLeft` first — the main
 * probe above deliberately drove `scrollLeft` straight to `max` and past it
 * to test the boundary, and starting Arm 2 from that leftover position is a
 * PROBE-CONTAMINATION bug, not a fixture property (caught live: it made
 * post-grid/trustpilot read as "index frozen" when a fresh-navigation debug
 * run proved the wrap genuinely works — see the git history for this file).
 * Then focus the next-arrow via keyboard (`.focus()` is the reachable-outcome
 * equivalent of Tab, without depending on how many Tab stops precede it on
 * a given fixture), and press Enter — a native `<button>`'s keyboard
 * -activation key — exactly `realCardCount` times, waiting for BOTH the
 * smooth-scroll animation AND the block's own scroll-driven index resync to
 * settle between presses (proven live to need >400ms on post-grid/
 * trustpilot; 700ms is used here with margin). With correct modulo wrap, N
 * presses of "next" lands back at the SAME index the sequence started from
 * (generic — the starting index is whatever it is, not assumed to be 0).
 *
 * NEGATIVE CONTROL for this arm is the assertion shape itself, not a
 * separate probe: a BROKEN wrap (arrows clamp instead of wrapping) would
 * leave the active dot at index `realCardCount - 1` after N presses, not
 * back at the start — the check can genuinely fail, it is not a tautology.
 * ---------------------------------------------------------------------- */
// eslint-disable-next-line no-console
console.log( '\n--- ARM 2: keyboard arrow-wrap at the loop boundary (WCAG 2.5.7) ---' );

/*
 * Wait for the earlier drag-gesture assertion's momentum coast to actually
 * FINISH before touching scrollLeft or starting keyboard presses — proven
 * live to matter: `sgs/gallery` genuinely wrapped correctly (0->1->2->3->4
 * ->5->0, isolated debug run) but FAILED in-probe (start=4, end=1) when
 * Arm 2 began immediately after the drag test, because the drag/momentum
 * gesture holds `el.style.scrollSnapType = 'none'` for its WHOLE duration
 * (`fx-draggable.js`'s own documented contract, restated in this file's
 * docblock) and a raw `scrollLeft` write racing against still-decelerating
 * inertia corrupts the position the block's own scroll-driven dot-resync
 * then reads. Poll the SAME public signal `fx-carousel-loop.js` itself uses
 * to detect "drag currently owns this element", so Arm 2 starts from a
 * state a real visitor would actually be in (gesture fully released), not
 * a race condition manufactured by testing two arms back-to-back.
 */
await page.waitForFunction(
	() => {
		const el = document.querySelector( '[data-sgs-loop]' );
		return el && 'none' !== el.style.scrollSnapType;
	},
	{ timeout: 5000 }
).catch( () => {
	// eslint-disable-next-line no-console
	console.log( '  [note] scrollSnapType still \'none\' after 5s — proceeding anyway; Arm 2 below may reflect residual momentum.' );
} );

// Clean starting position — see the contamination note above.
await page.evaluate( () => {
	const el = document.querySelector( '[data-sgs-loop]' );
	if ( el ) {
		el.scrollLeft = 0;
	}
} );
await page.waitForTimeout( 800 );

const arrowPresent = await page.evaluate(
	( sel ) => !! document.querySelector( sel ),
	NEXT_ARROW_SELECTOR
);

if ( ! arrowPresent ) {
	skipped.push(
		`keyboard arrow-wrap (no next-arrow at "${ NEXT_ARROW_SELECTOR }" on this block)`
	);
	// eslint-disable-next-line no-console
	console.log(
		`  [N/A ] no element at "${ NEXT_ARROW_SELECTOR }" — this block has no next-arrow (e.g. sgs/buybox navigates its thumbnail strip through the product-card store, not arrows). Pass the block's own selector as the 4th CLI arg if this is wrong.`
	);
} else {
	const activeDotIndex = async () =>
		page.evaluate( () => {
			const el = document.querySelector( '[data-sgs-loop]' );
			const blockRoot = el.closest( '[class*="wp-block-sgs-"]' ) || document;
			const dots = [
				...blockRoot.querySelectorAll(
					'.sgs-gallery__dot, [class*="dot"][role="tab"], button[class*="dot"]'
				),
			];
			if ( ! dots.length ) {
				return null;
			}
			return dots.findIndex(
				( d ) =>
					[ ...d.classList ].some(
						( c ) => c.endsWith( '--active' ) || 'is-active' === c
					) ||
					'true' === d.getAttribute( 'aria-selected' ) ||
					'true' === d.getAttribute( 'aria-current' )
			);
		} );

	const realCardCount = counts.real; // From the main probe's earlier measurement.
	const startIndex = await activeDotIndex();

	await page.evaluate( ( sel ) => document.querySelector( sel ).focus(), NEXT_ARROW_SELECTOR );
	const focusLanded = await page.evaluate(
		( sel ) => document.activeElement === document.querySelector( sel ),
		NEXT_ARROW_SELECTOR
	);
	check(
		'next-arrow is keyboard-focusable',
		focusLanded,
		`document.activeElement matches "${ NEXT_ARROW_SELECTOR }": ${ focusLanded }`
	);

	/*
	 * Press tolerance: N presses is the THEORETICAL minimum for a full lap
	 * (index-counted wrap, as `sgs/gallery`/`sgs/post-grid` implement it —
	 * `currentIndex` is an internal counter, wrapped by modulo on every
	 * press). `sgs/trustpilot-reviews` syncs its active dot a DIFFERENT way
	 * — nearest-real-card-to-scroll-position, the same technique
	 * `sgs/post-grid`'s own drag/scroll resync uses — and that geometry can
	 * spend one press "inside" the clone region before the loop module's own
	 * boundary correction re-seats `scrollLeft`, before the dot position
	 * catches up. Measured live: trustpilot needs N+1 presses, not N, to
	 * complete a lap; gallery/post-grid need exactly N. N+2 presses is used
	 * as the tolerance so a genuinely broken wrap (permanently clamped) is
	 * still caught, without over-fitting the assertion to one mechanism.
	 */
	const PRESS_TOLERANCE = realCardCount + 2;
	let arrowDisabledMidSequence = false;
	let pressesTaken = 0;
	let wrappedAtPress = null;
	for ( let i = 0; i < PRESS_TOLERANCE; i++ ) {
		const isDisabled = await page.evaluate(
			( sel ) => document.querySelector( sel ).disabled === true,
			NEXT_ARROW_SELECTOR
		);
		if ( isDisabled ) {
			arrowDisabledMidSequence = true;
			break;
		}
		await page.keyboard.press( 'Enter' );
		pressesTaken++;
		// Settle past the ~120ms loop-module debounce AND the block's own
		// scroll-driven index resync + smooth-scroll animation — proven live
		// (post-grid/trustpilot) that 400ms was not enough and produced a
		// false "frozen index" read; 700ms holds with margin on both, and
		// 900ms was used for the standalone debug that measured trustpilot's
		// extra press cleanly.
		await page.waitForTimeout( 900 );
		if ( pressesTaken >= realCardCount ) {
			const probe = await activeDotIndex();
			if ( probe === startIndex ) {
				wrappedAtPress = pressesTaken;
				break;
			}
		}
	}

	check(
		`next-arrow never disabled across a full lap of repeated keyboard activation (WCAG 2.5.7 — a loop has no last item; tolerance up to ${ PRESS_TOLERANCE } presses)`,
		! arrowDisabledMidSequence,
		arrowDisabledMidSequence
			? `arrow became disabled after ${ pressesTaken } press(es), before completing the lap`
			: `completed ${ pressesTaken } keyboard activation(s) without the arrow disabling`
	);

	if ( null === startIndex ) {
		skipped.push(
			'keyboard-wrap dot-index assertion (this block renders no dots to read a position from)'
		);
		// eslint-disable-next-line no-console
		console.log(
			'  [N/A ] no dots found to read active-index from — this block has no dot indicator. The "never disabled" check above still stands as the WCAG 2.5.7 evidence for this block.'
		);
	} else {
		const endIndex = null === wrappedAtPress ? await activeDotIndex() : startIndex;
		check(
			`keyboard-driven wrap lands back at the SAME index it started from within ${ PRESS_TOLERANCE } "next" activations (full lap, not clamped at the last real item)`,
			null !== wrappedAtPress,
			null !== wrappedAtPress
				? `start index=${ startIndex } -> back to ${ startIndex } after ${ wrappedAtPress } press(es) (real cards=${ realCardCount }; exact-N is the index-counted mechanism gallery/post-grid use, N+1 is trustpilot's own nearest-scroll-position mechanism — both are a genuine lap, neither is clamped)`
				: `start index=${ startIndex }, never returned within ${ PRESS_TOLERANCE } presses — last observed index=${ endIndex } — a broken wrap would strand end index at ${ realCardCount - 1 } regardless of start`
		);
	}
}

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
