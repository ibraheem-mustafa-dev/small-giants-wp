/**
 * Spec 38A unit M4.5: live acceptance of the nav drawer on the Entrance model (FR-38A-51, clause d; the stored-delay
 * measurement that clauses a and b repeat on the client drawers).
 *
 * The page is built from `tests/fixtures/motion/pages/nav-drawer-stagger.json` with `scripts/wp-build-page.js`: a
 * drawer (`.m45-drawer`) whose panel fades in on the `open` trigger and whose five children carry stored delays, four
 * written by the stagger helper with Start offset 50 and Step 50 (`.m45-item`: 50, 100, 150, 200) and a customised
 * 300ms on the fifth (`.m45-custom`). The expected values are read from that tree, never typed here.
 *
 * WHAT IT MEASURES (per width 375, 768, 1440; each judge with a negative control that must come out red):
 *   opens               the store opens the drawer and the root's `data-sgs-motion-state` gains `open`
 *   open-delays         each item's computed `animation-delay` on its running open entrance equals its stored delay
 *   close-timing        on close, each item's close animation runs for its stored close duration after its stored close
 *                       delay, the panel's for its stored close duration, and the dialog stays open until they end
 *   reduced-motion      under `prefers-reduced-motion: reduce` every item opens with 0s delay, no running animation
 *                       and no movement (opacity 1, translate at rest)
 *
 * The probe changes nothing on the page it measures.
 *
 * Usage:
 *   node scripts/motion-qa/probe-motion-nav-drawer.mjs --page <id> [--width 375 --width 768 --width 1440]
 *        [--engine chromium|firefox|webkit] [--site sandybrown]
 *   node scripts/motion-qa/probe-motion-nav-drawer.mjs --self-test     (offline: the judges, their controls and the tree)
 * Output: one JSON row per check, then a summary row. Exit: 0 all pass; 1 any FAIL or any control that did not go red;
 * 2 only UNANSWERED rows remain.
 *
 * @package
 */

import fs from 'node:fs';
import path from 'node:path';
import { chromium, firefox, webkit } from 'playwright';
import {
	siteBase,
	Reporter,
	ENGINES,
	WIDTHS,
	FIXTURE_DIR,
	isRest,
} from './probe-motion-model-lib.mjs';
import { openDrawer as openVisibleDrawer } from './probe-drawer-open.mjs';

const BROWSERS = { chromium, firefox, webkit };
const HEIGHT = 900;
const TREE = path.join( FIXTURE_DIR, 'nav-drawer-stagger.json' );

// ---- Pure judges ---------------------------------------------------------------------------------------------

/**
 * "80ms" / "0.08s" / "80" to milliseconds; NaN for anything else. A list ("0s, 0.1s") reads its first entry.
 * @param value
 */
export function toMs( value ) {
	const text = String( value ?? '' )
		.split( ',' )[ 0 ]
		.trim();
	const m = text.match( /^(-?\d*\.?\d+)(ms|s)?$/ );
	if ( ! m ) {
		return NaN;
	}
	return m[ 2 ] === 's' ? Number( m[ 1 ] ) * 1000 : Number( m[ 1 ] );
}

/**
 * Measured and expected lists agree item for item within 1ms, same length.
 * @param measured
 * @param expected
 */
export function judgeList( measured, expected ) {
	if (
		! Array.isArray( measured ) ||
		! Array.isArray( expected ) ||
		measured.length !== expected.length ||
		! expected.length
	) {
		return false;
	}
	return measured.every(
		( value, i ) =>
			Number.isFinite( value ) && Math.abs( value - expected[ i ] ) <= 1
	);
}

/**
 * The expectations from the fixture tree: the panel's close duration and each item's stored timing, in tree order.
 * @param tree
 */
export function expectationsFrom( tree ) {
	const out = { panelClose: null, items: [] };
	const walk = ( blocks ) => {
		for ( const b of blocks ) {
			const attrs = b.attributes || {};
			const base = attrs.sgsMotion?.elements?.root?.entrance?.base;
			const cls = attrs.className || '';
			if ( b.name === 'sgs/nav-drawer' && base ) {
				out.panelClose =
					base.close?.closeDuration ?? base.values?.duration ?? null;
			}
			if ( base && /\bm45-(item|custom)\b/.test( cls ) ) {
				out.items.push( {
					marker: cls.match( /\bm45-(item|custom)\b/ )[ 0 ],
					delay: base.values?.delay ?? 0,
					closeDelay: base.close?.closeDelay ?? 0,
					closeDuration:
						base.close?.closeDuration ??
						base.values?.duration ??
						null,
					customised: ( base.customised || [] ).includes(
						'values.delay'
					),
				} );
			}
			walk( b.innerBlocks || [] );
		}
	};
	walk( tree );
	return out;
}

/**
 * Positional delays the stagger helper writes on a single column: offset + i x step, capped (the cap includes the offset).
 * @param count
 * @param root0
 * @param root0.offset
 * @param root0.step
 * @param root0.cap
 */
export function helperDelays(
	count,
	{ offset = 0, step = 0, cap = null } = {}
) {
	return Array.from( { length: count }, ( unused, i ) => {
		const d = offset + i * step;
		return cap === null || cap === undefined ? d : Math.min( d, cap );
	} );
}

/**
 * Reduced motion: every item at 0 delay, nothing running, fully shown and at rest. Rows: { delay, running, opacity, translate }.
 * @param rows
 */
export function judgeReduced( rows ) {
	return (
		rows.length > 0 &&
		rows.every(
			( r ) =>
				toMs( r.delay ) === 0 &&
				r.running === 0 &&
				Number( r.opacity ) === 1 &&
				isRest( r.translate )
		)
	);
}

function selfTest() {
	const out = [];
	const ok = ( label, cond ) => out.push( { label, pass: Boolean( cond ) } );
	ok(
		'toMs parses ms, s and a list',
		toMs( '80ms' ) === 80 &&
			toMs( '0.05s' ) === 50 &&
			toMs( '0.1s, 0s' ) === 100 &&
			Number.isNaN( toMs( 'auto' ) )
	);
	ok( 'judgeList passes equal lists', judgeList( [ 50, 100 ], [ 50, 100 ] ) );
	ok(
		'control: judgeList fails a shifted list',
		! judgeList( [ 50, 170 ], [ 50, 100 ] )
	);
	ok(
		'control: judgeList fails a short or empty list',
		! judgeList( [ 50 ], [ 50, 100 ] ) && ! judgeList( [], [] )
	);
	ok(
		'judgeReduced passes a still, shown item',
		judgeReduced( [
			{ delay: '0s', running: 0, opacity: '1', translate: 'none' },
		] )
	);
	ok(
		'control: judgeReduced fails a delayed, running or moved item',
		! judgeReduced( [
			{ delay: '0.05s', running: 0, opacity: '1', translate: 'none' },
		] ) &&
			! judgeReduced( [
				{ delay: '0s', running: 1, opacity: '1', translate: 'none' },
			] ) &&
			! judgeReduced( [
				{
					delay: '0s',
					running: 0,
					opacity: '1',
					translate: '0px 18px',
				},
			] )
	);
	const tree = JSON.parse( fs.readFileSync( TREE, 'utf8' ) );
	const exp = expectationsFrom( tree );
	const items = exp.items.filter( ( i ) => i.marker === 'm45-item' );
	const custom = exp.items.find( ( i ) => i.marker === 'm45-custom' );
	const stagger =
		tree.find( ( b ) => b.name === 'sgs/nav-drawer' )?.attributes?.sgsMotion
			?.stagger || {};
	ok(
		'the tree: four helper items stored at offset 50, step 50 (50, 100, 150, 200)',
		judgeList(
			items.map( ( i ) => i.delay ),
			helperDelays( 4, stagger )
		) &&
			judgeList(
				items.map( ( i ) => i.delay ),
				[ 50, 100, 150, 200 ]
			)
	);
	ok(
		'the tree: the fifth item is a customised 300ms the helper would have written as 250',
		custom &&
			custom.delay === 300 &&
			custom.customised &&
			helperDelays( 5, stagger )[ 4 ] === 250
	);
	ok(
		'the tree: the panel closes in 200ms and every item in 250ms',
		exp.panelClose === 200 &&
			exp.items.every( ( i ) => i.closeDuration === 250 )
	);
	ok(
		'the tree: closeOrder reversed, the helper items close at 200, 150, 100, 50 (the open delays mirrored)',
		stagger.closeOrder === 'reversed' &&
			judgeList(
				items.map( ( i ) => i.closeDelay ),
				[ 200, 150, 100, 50 ]
			)
	);
	for ( const row of out ) {
		console.log(
			JSON.stringify( {
				check: row.label,
				verdict: row.pass ? 'PASS' : 'FAIL',
			} )
		);
	}
	const failed = out.filter( ( r ) => ! r.pass ).length;
	console.log(
		JSON.stringify( {
			summary: true,
			selfTest: true,
			pass: out.length - failed,
			fail: failed,
		} )
	);
	return failed ? 1 : 0;
}

// ---- Arguments -------------------------------------------------------------------------------------------------

function parseArgv( argv ) {
	const args = {
		url: null,
		engines: [],
		widths: [],
		site: 'sandybrown',
		selfTest: false,
	};
	for ( let i = 2; i < argv.length; i++ ) {
		const a = argv[ i ];
		if ( a === '--page' ) {
			args.url = `/?p=${ argv[ ++i ] }`;
		} else if ( a === '--url' ) {
			args.url = argv[ ++i ];
		} else if ( a === '--engine' ) {
			args.engines.push( argv[ ++i ] );
		} else if ( a === '--width' ) {
			args.widths.push( Number( argv[ ++i ] ) );
		} else if ( a === '--site' ) {
			args.site = argv[ ++i ];
		} else if ( a === '--self-test' ) {
			args.selfTest = true;
		} else {
			throw new Error( `Unknown argument ${ a }` );
		}
	}
	if ( ! args.engines.length ) {
		args.engines = [ 'chromium' ];
	}
	if ( ! args.widths.length ) {
		args.widths = [ 375, 768, 1440 ];
	}
	for ( const e of args.engines ) {
		if ( ! ENGINES.includes( e ) ) {
			throw new Error(
				`--engine must be one of ${ ENGINES.join( ', ' ) }`
			);
		}
	}
	for ( const w of args.widths ) {
		if ( ! WIDTHS.includes( w ) ) {
			throw new Error(
				`--width must be one of ${ WIDTHS.join( ', ' ) }`
			);
		}
	}
	return args;
}

// ---- Page actions ----------------------------------------------------------------------------------------------

/**
 * Open the drawer the way a visitor does (`probe-drawer-open.mjs`): a real click on its visible burger, repeated until
 * the Interactivity API has hydrated it, then the `open` motion state.
 * @param page
 */
function openDrawer( page ) {
	return openVisibleDrawer( page, '.m45-drawer' );
}

/**
 * Each item's running open entrance: its computed animation-delay.
 * @param page
 */
async function readOpen( page ) {
	return page.evaluate( () =>
		[
			...document.querySelectorAll(
				'.m45-drawer :is(.m45-item, .m45-custom)'
			),
		].map( ( el ) => {
			const cs = getComputedStyle( el );
			return {
				marker: el.classList.contains( 'm45-custom' )
					? 'm45-custom'
					: 'm45-item',
				delay: cs.animationDelay,
				name: cs.animationName,
				entrance: el.hasAttribute( 'data-sgs-me' ),
			};
		} )
	);
}

async function checkWidth( rep, browser, args, width, exp ) {
	const url = /^https?:/.test( args.url )
		? args.url
		: `${ siteBase( args.site ) }${ args.url }`;
	const where = { selector: '.m45-drawer', width };
	const expectedOpen = exp.items.map( ( i ) => i.delay );

	// Open and close, no preference.
	let context = await browser.newContext( {
		viewport: { width, height: HEIGHT },
		reducedMotion: 'no-preference',
	} );
	let page = await context.newPage();
	await page.goto( url, { waitUntil: 'load' } );
	const opened = await openDrawer( page );
	rep.check( 'opens', {
		...where,
		property: 'data-sgs-motion-state',
		measured: opened.opened,
		expected: true,
		pass: opened.opened ? true : null,
		why: opened.why,
	} );
	if ( opened.opened ) {
		const rows = await readOpen( page );
		const measured = rows.map( ( r ) => toMs( r.delay ) );
		rep.check( 'open-delays', {
			...where,
			property: 'animation-delay',
			measured,
			expected: expectedOpen,
			pass: judgeList( measured, expectedOpen ),
		} );
		rep.control( 'open-delays', {
			...where,
			property: 'animation-delay',
			measured,
			expected: expectedOpen.map( ( d ) => d + 40 ),
			red: ! judgeList(
				measured,
				expectedOpen.map( ( d ) => d + 40 )
			),
		} );

		await page.waitForTimeout( Math.max( ...expectedOpen ) + 700 );
		const started = Date.now();
		const close = await page.evaluate( () => {
			const drawer = document.querySelector( '.m45-drawer' );
			drawer.querySelector( '[data-sgs-nav-close]' )?.click();
			const timing = ( el ) =>
				el
					.getAnimations()
					.filter( ( a ) =>
						/^sgs-me-close-/.test( a.animationName || '' )
					)
					.map( ( a ) => ( {
						duration: a.effect.getTiming().duration,
						delay: a.effect.getTiming().delay,
					} ) )[ 0 ] || null;
			return {
				state: drawer.getAttribute( 'data-sgs-motion-state' ),
				panel: timing( drawer ),
				items: [
					...drawer.querySelectorAll( ':is(.m45-item, .m45-custom)' ),
				].map( timing ),
			};
		} );
		await page
			.waitForFunction(
				() => ! document.querySelector( '.m45-drawer' )?.open,
				null,
				{ timeout: 5000 }
			)
			.catch( () => null );
		const elapsed = Date.now() - started;
		const durations = close.items.map( ( t ) => ( t ? t.duration : NaN ) );
		const delays = close.items.map( ( t ) => ( t ? t.delay : NaN ) );
		const longest = Math.max(
			...exp.items.map( ( i ) => i.closeDelay + i.closeDuration ),
			exp.panelClose
		);
		rep.check( 'close-timing', {
			...where,
			property: 'close animation duration / delay',
			measured: {
				state: close.state,
				panel: close.panel?.duration ?? null,
				durations,
				delays,
				elapsedMs: elapsed,
			},
			expected: {
				state: 'close',
				panel: exp.panelClose,
				durations: exp.items.map( ( i ) => i.closeDuration ),
				delays: exp.items.map( ( i ) => i.closeDelay ),
				elapsedMs: `>= ${ longest - 50 }`,
			},
			pass:
				/(^|\s)close(\s|$)/.test( close.state || '' ) &&
				close.panel?.duration === exp.panelClose &&
				judgeList(
					durations,
					exp.items.map( ( i ) => i.closeDuration )
				) &&
				judgeList(
					delays,
					exp.items.map( ( i ) => i.closeDelay )
				) &&
				elapsed >= longest - 50,
		} );
		rep.control( 'close-timing', {
			...where,
			property: 'close animation duration',
			measured: durations,
			expected: exp.items.map( ( i ) => i.closeDuration * 2 ),
			red: ! judgeList(
				durations,
				exp.items.map( ( i ) => i.closeDuration * 2 )
			),
		} );
	}
	await context.close();

	// Reduced motion: no delay, no animation, no movement.
	context = await browser.newContext( {
		viewport: { width, height: HEIGHT },
		reducedMotion: 'reduce',
	} );
	page = await context.newPage();
	await page.goto( url, { waitUntil: 'load' } );
	const still = await openDrawer( page );
	if ( still.opened ) {
		const rows = await page.evaluate( () =>
			[
				...document.querySelectorAll(
					'.m45-drawer :is(.m45-item, .m45-custom)'
				),
			].map( ( el ) => {
				const cs = getComputedStyle( el );
				return {
					delay: cs.animationDelay,
					running: el.getAnimations().length,
					opacity: cs.opacity,
					translate: cs.translate,
				};
			} )
		);
		rep.check( 'reduced-motion', {
			...where,
			property: 'animation-delay, animations, opacity, translate',
			measured: rows,
			expected: 'every item 0s, none running, opacity 1, at rest',
			pass: judgeReduced( rows ),
		} );
		rep.control( 'reduced-motion', {
			...where,
			property: 'animation-delay',
			measured: rows.map( ( r ) => r.delay ),
			expected: 'an item still delayed',
			red: ! judgeReduced(
				rows.map( ( r, i ) =>
					0 === i ? { ...r, delay: '0.05s' } : r
				)
			),
		} );
	} else {
		rep.check( 'reduced-motion', {
			...where,
			measured: null,
			expected: null,
			pass: null,
			why: still.why,
		} );
	}
	await context.close();
}

async function main() {
	const args = parseArgv( process.argv );
	if ( args.selfTest ) {
		process.exit( selfTest() );
	}
	if ( ! args.url ) {
		throw new Error( 'Give --page <id> or --url (or --self-test)' );
	}
	const exp = expectationsFrom(
		JSON.parse( fs.readFileSync( TREE, 'utf8' ) )
	);
	const rep = new Reporter( {} );
	for ( const engine of args.engines ) {
		const browser = await BROWSERS[ engine ].launch();
		for ( const width of args.widths ) {
			rep.context = { engine, width };
			await checkWidth( rep, browser, args, width, exp );
		}
		await browser.close();
	}
	process.exit( rep.summary() );
}

if (
	import.meta.url ===
		`file:///${ process.argv[ 1 ].replace( /\\/g, '/' ) }` ||
	process.argv[ 1 ]?.endsWith( 'probe-motion-nav-drawer.mjs' )
) {
	main().catch( ( e ) => {
		console.error( e.message );
		process.exit( 1 );
	} );
}
