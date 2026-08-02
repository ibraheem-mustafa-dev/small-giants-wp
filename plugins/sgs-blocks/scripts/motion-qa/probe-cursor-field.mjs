/**
 * Live probe — cursor-reactive field (Spec 38 §3.3, FR-38-25).
 *
 * WHY THIS EXISTS, AND WHAT IT REFUSES TO ACCEPT AS A PASS
 *
 * The server-side chain for this effect was already verified by curl: the
 * emitter is marked, the stylesheet and module are enqueued, the per-instance
 * custom properties land in the lifted CSS. NONE of that proves the effect
 * works — morph shipped with every artefact correct and had never once
 * animated (D452).
 *
 * So this probe asserts the thing a person would actually look at, phrased the
 * way Bean's eye phrased it last wave: not "did something move?" but "did it
 * FOLLOW the pointer, and did the opaque child paint its share?".
 *
 * ⚠ VACUITY GUARDS FIRST. Three ways this probe could pass or fail while
 * measuring nothing, each checked before any assertion is trusted:
 *   1. The whole effect is gated behind `(hover: hover) and (pointer: fine)`.
 *      A headless browser reporting a coarse pointer would paint nothing, and
 *      every assertion below would fail for a reason that has nothing to do
 *      with the code. Checked explicitly, and reported as INCONCLUSIVE rather
 *      than FAIL.
 *   2. The emitter must exist on the page at all — a wrong URL yields zero
 *      elements and "no failures", which is not a pass.
 *   3. The participant walk marks children at init; if the fixture has no
 *      opaque child there is nothing to mark and the seamlessness assertion
 *      would pass vacuously. The fixture is asserted to contain one.
 *
 * Usage: node scripts/motion-qa/probe-cursor-field.mjs [url]
 */

import { chromium } from 'playwright';

const URL =
	process.argv[ 2 ] ||
	'https://sandybrown-nightingale-600381.hostingersite.com/cursor-field-canary-2/';

const results = [];

/**
 * Record one assertion.
 *
 * @param {string}  name   What was checked.
 * @param {boolean} pass   Whether it held.
 * @param {string}  detail Measured values, always — never just "ok".
 */
function check( name, pass, detail ) {
	results.push( { name, pass, detail } );
	const tag = pass ? 'PASS' : 'FAIL';
	// eslint-disable-next-line no-console
	console.log( `  [${ tag }] ${ name } — ${ detail }` );
}

const browser = await chromium.launch();
const context = await browser.newContext( {
	viewport: { width: 1440, height: 900 },
	// Force a fine pointer: the effect is deliberately gated to one, and the
	// default headless media state is what would otherwise make this vacuous.
	hasTouch: false,
} );
const page = await context.newPage();

// eslint-disable-next-line no-console
console.log( `\ncursor-field probe -> ${ URL }\n` );

await page.goto( `${ URL }?cb=${ Date.now() }`, { waitUntil: 'networkidle' } );

/* ---- VACUITY GUARD 1: is the effect even eligible to paint here? ---- */
const finePointer = await page.evaluate(
	() => window.matchMedia( '(hover: hover) and (pointer: fine)' ).matches
);
if ( ! finePointer ) {
	// eslint-disable-next-line no-console
	console.log(
		'  [INCONCLUSIVE] this browser reports a coarse pointer, so the effect ' +
			'is correctly gated OFF. The probe cannot measure the effect here — ' +
			'this is a probe limitation, NOT a code failure.'
	);
	await browser.close();
	process.exit( 3 );
}

/* ---- VACUITY GUARD 2: the emitter must actually be on the page ---- */
const emitterCount = await page.locator( '[data-sgs-cursor-field]' ).count();
if ( 0 === emitterCount ) {
	// eslint-disable-next-line no-console
	console.log(
		'  [FAIL] no [data-sgs-cursor-field] element on the page — the fixture ' +
			'is wrong or the render layer did not fire. Nothing below would mean anything.'
	);
	await browser.close();
	process.exit( 1 );
}
check( 'emitter present', true, `${ emitterCount } element(s)` );

/* ---- VACUITY GUARD 3: is there an opaque child to be seamless ACROSS? ---- */
const participantCount = await page
	.locator( '[data-sgs-cursor-participant]' )
	.count();
check(
	'participant walk ran (opaque child marked at runtime)',
	participantCount > 0,
	`${ participantCount } participant(s) — 0 would make the seamlessness check vacuous`
);

/* ---- THE REAL QUESTION 1: does the field actually PAINT? ---- */
const painted = await page.evaluate( () => {
	const el = document.querySelector( '[data-sgs-cursor-field]' );
	const before = window.getComputedStyle( el, '::before' );
	return {
		image: before.backgroundImage,
		attachment: before.backgroundAttachment,
		content: before.content,
	};
} );
check(
	'emitter ::before paints a gradient',
	painted.image.includes( 'gradient' ),
	`background-image=${ painted.image.slice( 0, 60 ) }…`
);
check(
	'field resolves against the VIEWPORT (the alignment mechanism)',
	'fixed' === painted.attachment,
	`background-attachment=${ painted.attachment }`
);

/* ---- THE REAL QUESTION 2: does it FOLLOW the pointer, 1:1? ---- */
const readVars = () =>
	page.evaluate( () => {
		const el = document.querySelector( '[data-sgs-cursor-field]' );
		const cs = window.getComputedStyle( el );
		return {
			x: cs.getPropertyValue( '--sgs-cursor-x' ).trim(),
			y: cs.getPropertyValue( '--sgs-cursor-y' ).trim(),
		};
	} );

/*
 * ⚠ THE POINTS MUST BE OVER THE EMITTER. This probe FAILED on its first run
 * with hardcoded viewport points (300,300 / 600,450 / 900,600): those land on
 * the page header, not on the container, so `mousemove` never reached the
 * emitter and the field correctly stayed at its resting position. The probe
 * reported a tracking failure that did not exist — a synthetic event
 * dispatched straight at the element moved it to the exact pixel.
 *
 * That is the "a probe that never reaches the effect measures the probe"
 * failure, which this project has hit repeatedly. Points are now derived from
 * the emitter's OWN bounding box, so they cannot drift off it as the fixture
 * changes.
 */
const box = await page.locator( '[data-sgs-cursor-field]' ).first().boundingBox();
if ( ! box ) {
	// eslint-disable-next-line no-console
	console.log( '  [FAIL] emitter has no bounding box — cannot aim the pointer at it.' );
	await browser.close();
	process.exit( 1 );
}
await page.locator( '[data-sgs-cursor-field]' ).first().scrollIntoViewIfNeeded();
const liveBox = await page
	.locator( '[data-sgs-cursor-field]' )
	.first()
	.boundingBox();
const points = [
	[ Math.round( liveBox.x + liveBox.width * 0.25 ), Math.round( liveBox.y + liveBox.height * 0.3 ) ],
	[ Math.round( liveBox.x + liveBox.width * 0.5 ), Math.round( liveBox.y + liveBox.height * 0.5 ) ],
	[ Math.round( liveBox.x + liveBox.width * 0.75 ), Math.round( liveBox.y + liveBox.height * 0.7 ) ],
];

const samples = [];
for ( const [ x, y ] of points ) {
	await page.mouse.move( x, y );
	// rAF-throttled: one frame is enough, but poll rather than sleep a fixed
	// delay — a fixed delay is the flake this project has already been bitten by.
	await page.waitForFunction(
		( expected ) => {
			const el = document.querySelector( '[data-sgs-cursor-field]' );
			const v = window
				.getComputedStyle( el )
				.getPropertyValue( '--sgs-cursor-x' )
				.trim();
			return v === `${ expected }px`;
		},
		x,
		{ timeout: 2000 }
	).catch( () => {} );
	const got = await readVars();
	samples.push( { sent: `${ x },${ y }`, got: `${ got.x },${ got.y }` } );
}

const tracked = samples.filter( ( s ) => {
	const [ sx, sy ] = s.sent.split( ',' );
	return s.got === `${ sx }px,${ sy }px`;
} ).length;
check(
	'field FOLLOWS the pointer 1:1 (not merely "it moved")',
	tracked === samples.length,
	samples.map( ( s ) => `${ s.sent } -> ${ s.got }` ).join( '  |  ' )
);

/* ---- THE REAL QUESTION 3: is it SEAMLESS across the opaque child? ---- */
const seam = await page.evaluate( () => {
	const emitter = document.querySelector( '[data-sgs-cursor-field]' );
	const part = document.querySelector( '[data-sgs-cursor-participant]' );
	if ( ! part ) {
		return null;
	}
	const e = window.getComputedStyle( emitter, '::before' );
	const p = window.getComputedStyle( part );
	return {
		emitterImage: e.backgroundImage,
		partImage: p.backgroundImage,
		partAttachment: p.backgroundAttachment,
		// The participant must read the SAME inherited coordinates, or the two
		// halves of the field would be painted in different places.
		emitterX: window
			.getComputedStyle( emitter )
			.getPropertyValue( '--sgs-cursor-x' )
			.trim(),
		partX: p.getPropertyValue( '--sgs-cursor-x' ).trim(),
	};
} );

if ( seam ) {
	check(
		'opaque child paints its own share of the field',
		seam.partImage.includes( 'gradient' ),
		`participant background-image=${ seam.partImage.slice( 0, 50 ) }…`
	);
	check(
		'participant resolves against the viewport too',
		'fixed' === seam.partAttachment,
		`participant background-attachment=${ seam.partAttachment }`
	);
	check(
		'participant reads the SAME coordinates (no seam by construction)',
		seam.emitterX === seam.partX && '' !== seam.partX,
		`emitter --sgs-cursor-x=${ seam.emitterX } vs participant=${ seam.partX }`
	);
}

/* ---- REDUCED MOTION: §10 says SIMPLIFY, never suppress ---- */
const rmContext = await browser.newContext( {
	viewport: { width: 1440, height: 900 },
	reducedMotion: 'reduce',
} );
const rmPage = await rmContext.newPage();
await rmPage.goto( `${ URL }?cb=${ Date.now() + 1 }`, {
	waitUntil: 'networkidle',
} );
const rmBefore = await rmPage.evaluate( () => {
	const el = document.querySelector( '[data-sgs-cursor-field]' );
	return window.getComputedStyle( el, '::before' ).backgroundImage;
} );
await rmPage.mouse.move( 400, 400 );
await rmPage.waitForTimeout( 200 );
const rmAfter = await rmPage.evaluate( () => {
	const el = document.querySelector( '[data-sgs-cursor-field]' );
	return window
		.getComputedStyle( el )
		.getPropertyValue( '--sgs-cursor-x' )
		.trim();
} );
check(
	'reduced motion SIMPLIFIES (field still paints)',
	rmBefore.includes( 'gradient' ),
	`::before background-image=${ rmBefore.slice( 0, 45 ) }…`
);
check(
	'reduced motion stops TRACKING (rests, does not follow to 400px)',
	'400px' !== rmAfter,
	`--sgs-cursor-x after moving to 400,400 = ${ rmAfter }`
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
