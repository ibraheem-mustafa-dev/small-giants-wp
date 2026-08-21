/**
 * Gap-register claim 7 (2026-08-21) — is "good by default" true for the scroll effects?
 *
 * WHAT THE CLAIM SAYS. `"Good by default" never proven for pin/scrub/scramble/split-reveal
 * — no drop-on-page screenshot test exists. This is the single biggest differentiator vs
 * Kadence/Spectra and it is unmeasured.`
 *
 * WHAT THIS PROBE MEASURES, AND WHAT IT DELIBERATELY DOES NOT.
 * "Good" has two halves and only one is mechanical:
 *
 *   MEASURABLE (here) — does dropping the effect on a page leave the content VISIBLE and
 *   readable with no tuning? The signature failure of every competitor's scroll-effect
 *   library is an element that animates from `opacity: 0` and, for a visitor who lands
 *   mid-page, on a short viewport, or with the trigger mis-set, never becomes visible at
 *   all. That is content loss, and it is exactly what a default should never do.
 *
 *   NOT MEASURABLE (Bean's eye, R-31-13) — whether the motion looks tasteful, is correctly
 *   paced, or suits the section. No script settles that, and this probe does not pretend
 *   to. A PASS here means "safe by default", which is the necessary half of "good by
 *   default", not the whole of it.
 *
 * ⚠ COVERAGE IS PARTIAL AND SAID SO OUT LOUD. Canary DB search (2026-08-21) found
 * `scrub`, `scramble` and `split-reveal` on page 2103 "FX Preset Comparison", and **no
 * page anywhere on the canary using `pin`**. `pin` is therefore UNANSWERED, not passed —
 * it needs a fixture that does not exist yet.
 *
 * NEGATIVE CONTROL. A node is planted with `opacity: 0` and run through the identical
 * visibility check. If the checker passed that, a PASS for the real effects would prove
 * nothing — it would just mean the checker calls everything visible.
 *
 * Run:  node scripts/motion-qa/probe-good-by-default.mjs
 */

import { chromium } from 'playwright';

const URL_UNDER_TEST =
	'https://sandybrown-nightingale-600381.hostingersite.com/?p=2103&cb=d728gbd';
const EFFECTS = [ 'scrub', 'scramble', 'split-reveal' ];
const NO_FIXTURE = [ 'pin' ];

const browser = await chromium.launch();
const page = await browser.newPage( { viewport: { width: 1440, height: 900 } } );

const line = ( s ) => console.log( `[good-by-default] ${ s }` );
let exitCode = 0;

/**
 * Effective visibility. CSS opacity does NOT inherit as a computed value, so checking the
 * element alone is the blind spot that hid D453's original defect — multiply up the
 * ancestor chain, and check the box actually occupies space.
 */
const VISIBILITY = ( sel ) => {
	const el = document.querySelector( sel );
	if ( ! el ) return { missing: true };
	let opacity = 1;
	let node = el;
	while ( node && node !== document.documentElement ) {
		const cs = getComputedStyle( node );
		opacity *= parseFloat( cs.opacity );
		if ( cs.visibility === 'hidden' || cs.display === 'none' ) opacity = 0;
		node = node.parentElement;
	}
	const r = el.getBoundingClientRect();
	return {
		missing: false,
		opacity: Number( opacity.toFixed( 3 ) ),
		width: Math.round( r.width ),
		height: Math.round( r.height ),
		text: ( el.innerText || '' ).trim().length,
	};
};

try {
	await page.goto( URL_UNDER_TEST, { waitUntil: 'load' } );

	// --- Negative control FIRST, so a broken checker is caught before anything is trusted.
	// Planted, then measured through the SAME page.evaluate( VISIBILITY, … ) call the real
	// effects go through — so the control exercises the identical code path rather than a
	// re-implementation of it, which is the whole point of having one.
	await page.evaluate( () => {
		const probe = document.createElement( 'div' );
		probe.id = 'sgs-gbd-control';
		probe.style.cssText = 'opacity:0;width:100px;height:20px';
		probe.textContent = 'control';
		document.body.appendChild( probe );
	} );
	const control = await page.evaluate( VISIBILITY, '#sgs-gbd-control' );
	await page.evaluate( () => document.getElementById( 'sgs-gbd-control' )?.remove() );

	line(
		`negative control (planted opacity:0 node): opacity=${ control.opacity }, ` +
			`${ control.width }x${ control.height }`
	);
	if ( control.opacity !== 0 ) {
		line(
			`FAIL — the checker reported opacity ${ control.opacity } for a node explicitly ` +
				'set to 0. It calls everything visible, so the results below prove nothing.'
		);
		process.exit( 1 );
	}
	line( 'negative control OK — the checker CAN report invisible.' );

	// --- Land mid-page, the way a visitor arriving on a deep link or a restored scroll
	// position does. This is precisely where a from-opacity-0 default strands content.
	await page.evaluate( () => window.scrollTo( 0, document.body.scrollHeight / 2 ) );
	await page.waitForTimeout( 1200 );
	await page.evaluate( () => window.scrollTo( 0, document.body.scrollHeight ) );
	await page.waitForTimeout( 1200 );

	for ( const fx of EFFECTS ) {
		const sel = `[data-sgs-fx="${ fx }"]`;
		const v = await page.evaluate( VISIBILITY, sel );
		if ( v.missing ) {
			line( `${ fx }: UNANSWERED — no ${ sel } on this page. Nothing measured.` );
			exitCode = 1;
			continue;
		}
		const safe = v.opacity > 0.9 && v.width > 0 && v.height > 0;
		line(
			`${ fx }: opacity=${ v.opacity } box=${ v.width }x${ v.height } ` +
				`text=${ v.text }ch — ${ safe ? 'SAFE' : 'UNSAFE' }`
		);
		if ( ! safe ) {
			line(
				`  FAIL — after scrolling through the page, ${ fx } leaves its content ` +
					'invisible or collapsed. A visitor never sees it. That is content loss ' +
					'by default, not a tasteful default.'
			);
			exitCode = 1;
		}
	}

	for ( const fx of NO_FIXTURE ) {
		line(
			`${ fx }: UNANSWERED — no page on the canary uses it (DB search 2026-08-21). ` +
				'Needs a fixture. Recorded as unknown, NOT as passing.'
		);
	}

	line(
		exitCode === 0
			? 'RESULT — the three effects with fixtures are SAFE by default (content stays ' +
					'visible untuned). The aesthetic half of "good" is Bean\'s eye, R-31-13.'
			: 'RESULT — at least one effect is not safe by default, or was not measurable.'
	);
} finally {
	await browser.close();
}

process.exit( exitCode );
