/**
 * Gap-register claim 7 — is "good by default" true for pin-scrub / scrub / scramble /
 * split-reveal? (2026-08-21, D729)
 *
 * WHAT THE CLAIM SAYS. `"Good by default" never proven for pin/scrub/scramble/split-reveal
 * — no drop-on-page screenshot test exists. This is the single biggest differentiator vs
 * Kadence/Spectra and it is unmeasured.`
 *
 * ⚠ THE CLAIM USES SHORTHAND. The shipped effect id is `pin-scrub`, not `pin`
 * (SHIPPED_EFFECTS: scrub, pin-scrub, horizontal-panel, split-reveal, scramble, draw,
 * motion-path, morph, cursor-field, surface-treatment). The first run of this probe
 * searched the canary for `pin` and correctly found nothing — which read as "no fixture
 * exists" when it actually meant "wrong token". Resolve a name back to its owner before
 * concluding from its absence.
 *
 * WHAT THIS MEASURES, AND WHAT IT DELIBERATELY DOES NOT.
 * "Good" has two halves and only one is mechanical:
 *
 *   MEASURABLE — (a) SAFE: does dropping the effect on a page leave content VISIBLE with
 *   no tuning? The signature failure of every competitor's scroll-effect library is an
 *   element animating from `opacity: 0` that, for a visitor landing mid-page, never
 *   becomes visible at all. That is content loss. (b) For pin-scrub specifically, does it
 *   actually PIN — hold its viewport position while the document scrolls past?
 *
 *   NOT MEASURABLE (Bean's eye, R-31-13) — whether the motion looks tasteful, is paced
 *   well, or suits the section. A PASS here means "safe and functional by default", the
 *   necessary half of "good by default", not the whole of it.
 *
 * NEGATIVE CONTROLS — one per assertion, because each could pass vacuously on its own:
 *   - visibility: a planted `opacity:0` node, measured through the SAME evaluate call as
 *     the real checks, must report invisible.
 *   - pinning: an ordinary non-pinned element on the same page, over the same scroll
 *     range, must report NOT pinned. Otherwise "it pinned" just means the detector calls
 *     everything pinned.
 *
 * Run:  npm run qa:motion:good-by-default
 */

import { chromium } from 'playwright';

const BASE = 'https://sandybrown-nightingale-600381.hostingersite.com';
const PAGES = [
	{ url: `${ BASE }/?p=2103&cb=d729gbd`, effects: [ 'scrub', 'scramble', 'split-reveal' ] },
	{ url: `${ BASE }/?p=2603&cb=d729gbd`, effects: [ 'pin-scrub' ] },
];

const line = ( s ) => console.log( `[good-by-default] ${ s }` );

/**
 * Effective visibility. CSS opacity does NOT inherit as a computed value, so checking the
 * element alone is the blind spot that hid D453's original defect — multiply up the
 * ancestor chain, and confirm the box occupies space.
 */
const VISIBILITY = ( sel ) => {
	const el = document.querySelector( sel );
	if ( ! el ) return { missing: true };
	let opacity = 1;
	let node = el;
	while ( node && node !== document.documentElement ) {
		const cs = getComputedStyle( node );
		opacity *= Number.parseFloat( cs.opacity );
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

const VIEWPORT_TOP = ( sel ) => {
	const el = document.querySelector( sel );
	return el ? Math.round( el.getBoundingClientRect().top ) : null;
};

const browser = await chromium.launch();
const page = await browser.newPage( { viewport: { width: 1440, height: 900 } } );
let exitCode = 0;

async function settleAt( y ) {
	await page.evaluate( ( t ) => window.scrollTo( { top: t, behavior: 'auto' } ), y );
	await page.evaluate(
		() =>
			new Promise( ( resolve ) => {
				let last = -1;
				let stable = 0;
				const tick = () => {
					stable = Math.abs( window.scrollY - last ) < 0.5 ? stable + 1 : 0;
					last = window.scrollY;
					if ( stable >= 6 ) resolve();
					else requestAnimationFrame( tick );
				};
				requestAnimationFrame( tick );
			} )
	);
}

/**
 * Find the longest run of scroll samples over which `selector` HOLDS its viewport
 * position, and return how far the document scrolled during it. That is the definition of
 * a pin, and it is deliberately implementation-agnostic: ScrollTrigger may pin via
 * `position: fixed` OR via a transform on a pin-spacer, and asserting on either one would
 * make this a test of today's GSAP internals rather than of what a visitor sees.
 */
async function heldDistance( selector, from, to, steps ) {
	const samples = [];
	for ( let i = 0; i <= steps; i++ ) {
		const y = from + ( ( to - from ) * i ) / steps;
		await settleAt( y );
		const top = await page.evaluate( VIEWPORT_TOP, selector );
		const sy = await page.evaluate( () => Math.round( window.scrollY ) );
		if ( top !== null ) samples.push( { top, sy } );
	}

	let best = 0;
	let runStart = 0;
	for ( let i = 1; i < samples.length; i++ ) {
		// <=4px tolerates sub-pixel layout jitter without admitting real movement.
		if ( Math.abs( samples[ i ].top - samples[ runStart ].top ) <= 4 ) {
			best = Math.max( best, samples[ i ].sy - samples[ runStart ].sy );
		} else {
			runStart = i;
		}
	}
	return { held: best, samples: samples.length };
}

try {
	for ( const { url, effects } of PAGES ) {
		await page.goto( url, { waitUntil: 'load' } );

		// --- Visibility negative control, on THIS page, before trusting anything on it.
		await page.evaluate( () => {
			const probe = document.createElement( 'div' );
			probe.id = 'sgs-gbd-control';
			probe.style.cssText = 'opacity:0;width:100px;height:20px';
			probe.textContent = 'control';
			document.body.appendChild( probe );
		} );
		const control = await page.evaluate( VISIBILITY, '#sgs-gbd-control' );
		await page.evaluate( () => document.getElementById( 'sgs-gbd-control' )?.remove() );
		if ( control.opacity !== 0 ) {
			line(
				`FAIL — visibility checker reported ${ control.opacity } for a node set to 0. ` +
					'It calls everything visible; results on this page would prove nothing.'
			);
			exitCode = 1;
			continue;
		}

		// Land mid-page then bottom, the way a visitor on a deep link or restored scroll
		// position does — precisely where a from-opacity-0 default strands content.
		await page.evaluate( () => window.scrollTo( 0, document.body.scrollHeight / 2 ) );
		await page.waitForTimeout( 1200 );
		await page.evaluate( () => window.scrollTo( 0, document.body.scrollHeight ) );
		await page.waitForTimeout( 1200 );

		for ( const fx of effects ) {
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
					`  FAIL — after scrolling the page, ${ fx } leaves its content invisible ` +
						'or collapsed. A visitor never sees it: content loss by default.'
				);
				exitCode = 1;
			}

			// --- pin-scrub carries a second, stronger obligation: it must actually pin.
			if ( fx === 'pin-scrub' ) {
				// ⛔ Measure the element's DOCUMENT offset from scrollY 0, never from wherever
				// the visibility pass left us. The first version measured it at the bottom of
				// the page, where the pin had already released and ScrollTrigger's pin-spacer
				// had shifted the element by a full viewport — so the derived scroll range
				// missed the pin entirely and the probe reported a real, working pin as broken.
				await settleAt( 0 );
				const geom = await page.evaluate( ( s ) => {
					const el = document.querySelector( s );
					return { top: Math.round( el.getBoundingClientRect().top + window.scrollY ) };
				}, sel );

				// Bracket generously either side of the element so the run-finder sees the
				// approach, the hold and the release, rather than a hardcoded pin window.
				const from = Math.max( 0, geom.top - 600 );
				const to = geom.top + 1400;

				const pinned = await heldDistance( sel, from, to, 20 );
				// Control = <body>, whose viewport top is exactly -scrollY, so it can NEVER
				// hold still while the page scrolls. An arbitrary page element is not safe
				// here: the first attempt used the last site-block, which was itself sticky and
				// moved only 56px over a 900px scroll — the guard below caught that before a
				// misleading verdict could be printed.
				const moving = await heldDistance( 'body', from, to, 20 );

				line(
					`  pin check: element held its viewport position across ${ pinned.held }px ` +
						`of scroll (range ${ from }-${ to }); control held ${ moving.held }px`
				);

				if ( moving.held > 20 ) {
					line(
						`  FAIL — the control appeared to hold for ${ moving.held }px. An element ` +
							'that cannot pin reads as pinned, so the verdict below is meaningless.'
					);
					exitCode = 1;
				} else if ( pinned.held < 200 ) {
					line(
						`  FAIL — the element held for only ${ pinned.held }px. It scrolls past ` +
							'without sticking; pin-scrub is not pinning.'
					);
					exitCode = 1;
				} else {
					line(
						`  PASS — held for ${ pinned.held }px of scroll while the control held ` +
							`${ moving.held }px. pin-scrub genuinely pins.`
					);
				}
			}
		}
	}

	line(
		exitCode === 0
			? 'RESULT — all four effects are SAFE by default (content stays visible untuned), ' +
					'and pin-scrub additionally pins. The aesthetic half of "good" is Bean\'s ' +
					'eye, R-31-13.'
			: 'RESULT — at least one effect is not safe by default, or was not measurable.'
	);
} finally {
	await browser.close();
}

process.exit( exitCode );
