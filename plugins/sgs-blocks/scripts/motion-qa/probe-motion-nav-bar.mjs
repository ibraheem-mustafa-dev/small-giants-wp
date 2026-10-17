/**
 * Spec 38A unit M4.6 (Gate 5b): live acceptance of the nav bar's mega panel on the Entrance model (FR-38A-51 clause a,
 * the bar and mega half; clause d for the panels).
 *
 * The header is built from `tests/fixtures/motion/pages/nav-bar-stagger-header.json` (an `sgs/nav-bar-menu`, marker
 * `.m46-bar`, carrying the U-5 measured mega panel values: a fade-lift panel over 340ms, items over 460ms on a 26ms step
 * capped at 320ms) and its mega panel from `nav-bar-stagger-mega.json` (15 columns, marker `.m46-mega`). The fixture
 * panel closes over a stored 200ms so the close is measurable (the measured panel closes in 0ms). The expected values are
 * read from those trees, never typed here.
 *
 * WHAT IT MEASURES (per width, 1440 by default; each judge with a negative control that must come out red):
 *   opens               a click on the mega trigger gives its panel wrap `data-sgs-motion-state` "open"
 *   open-delays         each mega column's computed `animation-delay` equals its stored delay, min(i x 26, 320)
 *   item-duration       each column's open animation runs for the stored item duration
 *   close-timing        on close the panel's close animation runs for its stored close duration with the host on
 *                       "close", and the panel is hidden once it ends (host back to empty, display none)
 *   reduced-motion      under `prefers-reduced-motion: reduce` every column opens with 0s delay, no running animation,
 *                       opacity 1 and no translate
 *
 * Usage:
 *   node scripts/motion-qa/probe-motion-nav-bar.mjs --url / --site <target> [--width 1440] [--engine chromium]
 *   node scripts/motion-qa/probe-motion-nav-bar.mjs --self-test     (offline: the judges, their controls and the trees)
 * Output and exit codes as `probe-motion-nav-drawer.mjs`.
 *
 * @package
 */

/* global getComputedStyle, requestAnimationFrame */

import { chromium, firefox, webkit } from 'playwright';
import {
	siteBase,
	Reporter,
	ENGINES,
	WIDTHS,
} from './probe-motion-model-lib.mjs';
import {
	toMs,
	judgeList,
	helperDelays,
	judgeReduced,
} from './probe-motion-nav-drawer.mjs';
import {
	readExpectations,
	COLUMNS,
	READ_COLUMNS,
	judgeDurations,
	selfTest,
} from './probe-motion-nav-bar-judges.mjs';

const BROWSERS = { chromium, firefox, webkit };
const HEIGHT = 900;

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
	args.engines = args.engines.length ? args.engines : [ 'chromium' ];
	args.widths = args.widths.length ? args.widths : [ 1440 ];
	if ( args.engines.some( ( e ) => ! ENGINES.includes( e ) ) ) {
		throw new Error( `--engine must be one of ${ ENGINES.join( ', ' ) }` );
	}
	if ( args.widths.some( ( w ) => ! WIDTHS.includes( w ) ) ) {
		throw new Error( `--width must be one of ${ WIDTHS.join( ', ' ) }` );
	}
	return args;
}

// ---- Page actions ----------------------------------------------------------------------------------------------

/**
 * Click the bar's mega trigger and wait for its panel's `open` motion state.
 * @param {Object} page Playwright page.
 * @return {Promise<{opened: boolean, why: string}>} The result.
 */
async function openMega( page ) {
	const found = await page.evaluate( () => {
		const panel = document
			.querySelector( '.m46-bar .sgs-mega-panel__content' )
			?.closest( '[data-sgs-mega-panel]' );
		const trigger =
			panel &&
			document.querySelector( `[aria-controls="${ panel.id }"]` );
		if ( ! trigger ) {
			return false;
		}
		trigger.click();
		return true;
	} );
	if ( ! found ) {
		return {
			opened: false,
			why: 'no mega panel in .m46-bar (build the header and mega trees and set the bar ref)',
		};
	}
	try {
		await page.waitForFunction(
			() =>
				/(^|\s)open(\s|$)/.test(
					document
						.querySelector( '.m46-bar .sgs-mega-panel__content' )
						?.closest( '[data-sgs-mega-panel]' )
						?.getAttribute( 'data-sgs-motion-state' ) || ''
				),
			null,
			{ timeout: 4000 }
		);
		return { opened: true, why: '' };
	} catch ( e ) {
		return {
			opened: false,
			why: 'the panel never gained the "open" motion state',
		};
	}
}

async function context( browser, width, reducedMotion ) {
	const ctx = await browser.newContext( {
		viewport: { width, height: HEIGHT },
		reducedMotion,
	} );
	return { ctx, page: await ctx.newPage() };
}

async function checkWidth( rep, browser, args, width, exp ) {
	const url = /^https?:/.test( args.url )
		? args.url
		: `${ siteBase( args.site ) }${ args.url }`;
	const where = { selector: `.m46-bar ${ COLUMNS }`, width };

	// Open, then close.
	let { ctx, page } = await context( browser, width, 'no-preference' );
	await page.goto( url, { waitUntil: 'load' } );
	const opened = await openMega( page );
	rep.check( 'opens', {
		...where,
		property: 'data-sgs-motion-state',
		measured: opened.opened,
		expected: true,
		pass: opened.opened ? true : null,
		why: opened.why,
	} );
	if ( opened.opened ) {
		const rows = await page.evaluate( READ_COLUMNS, COLUMNS );
		const measured = rows.map( ( r ) => toMs( r.delay ) );
		rep.check( 'open-delays', {
			...where,
			property: 'animation-delay',
			measured,
			expected: exp.delays,
			pass: judgeList( measured, exp.delays ),
		} );
		rep.control( 'open-delays', {
			...where,
			property: 'animation-delay',
			measured,
			expected: helperDelays( exp.columns, { step: exp.stagger.step } ),
			red: ! judgeList(
				measured,
				helperDelays( exp.columns, { step: exp.stagger.step } )
			),
		} );
		const anims = rows.flatMap( ( r ) => r.animations );
		rep.check( 'item-duration', {
			...where,
			property: 'animation duration',
			measured: anims.map( ( a ) => a.duration ),
			expected: exp.itemDuration,
			pass: judgeDurations( anims, exp.itemDuration ),
		} );
		rep.control( 'item-duration', {
			...where,
			property: 'animation duration',
			measured: anims.map( ( a ) => a.duration ),
			expected: exp.itemDuration / 2,
			red: ! judgeDurations( anims, exp.itemDuration / 2 ),
		} );

		await page.waitForTimeout(
			Math.max( ...exp.delays ) + exp.itemDuration + 200
		);
		const close = await page.evaluate( () => {
			const panel = document
				.querySelector( '.m46-bar .sgs-mega-panel__content' )
				.closest( '[data-sgs-mega-panel]' );
			document.querySelector( `[aria-controls="${ panel.id }"]` ).click();
			return new Promise( ( resolve ) =>
				requestAnimationFrame( () => {
					const a = panel
						.getAnimations()
						.find( ( x ) =>
							/^sgs-me-close-/.test( x.animationName || '' )
						);
					resolve( {
						state: panel.getAttribute( 'data-sgs-motion-state' ),
						display: getComputedStyle( panel ).display,
						duration: a ? a.effect.getTiming().duration : null,
					} );
				} )
			);
		} );
		await page.waitForTimeout( exp.panelClose + 300 );
		const after = await page.evaluate( () => {
			const panel = document
				.querySelector( '.m46-bar .sgs-mega-panel__content' )
				.closest( '[data-sgs-mega-panel]' );
			return {
				state: panel.getAttribute( 'data-sgs-motion-state' ),
				display: getComputedStyle( panel ).display,
			};
		} );
		rep.check( 'close-timing', {
			...where,
			selector: '.m46-bar [data-sgs-mega-panel]',
			property: 'close animation duration, state, display',
			measured: { close, after },
			expected: {
				state: 'close',
				duration: exp.panelClose,
				afterState: '',
				afterDisplay: 'none',
			},
			pass:
				/(^|\s)close(\s|$)/.test( close.state || '' ) &&
				close.display !== 'none' &&
				close.duration === exp.panelClose &&
				'' === after.state &&
				'none' === after.display,
		} );
		rep.control( 'close-timing', {
			...where,
			property: 'close animation duration',
			measured: close.duration,
			expected: exp.panelClose * 2,
			red: close.duration !== exp.panelClose * 2,
		} );
	}
	await ctx.close();

	// Reduced motion: no delay, no animation, no movement.
	( { ctx, page } = await context( browser, width, 'reduce' ) );
	await page.goto( url, { waitUntil: 'load' } );
	const still = await openMega( page );
	if ( still.opened ) {
		const rows = await page.evaluate( READ_COLUMNS, COLUMNS );
		rep.check( 'reduced-motion', {
			...where,
			property: 'animation-delay, animations, opacity, translate',
			measured: rows.map( ( { animations, name, ...r } ) => r ),
			expected: 'every column 0s, none running, opacity 1, at rest',
			pass: judgeReduced( rows ),
		} );
		rep.control( 'reduced-motion', {
			...where,
			property: 'animation-delay',
			measured: rows.map( ( r ) => r.delay ),
			expected: 'a column still delayed',
			red: ! judgeReduced(
				rows.map( ( r, i ) =>
					0 === i ? { ...r, delay: '0.026s' } : r
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
	await ctx.close();
}

async function main() {
	const args = parseArgv( process.argv );
	if ( args.selfTest ) {
		process.exit( selfTest() );
	}
	if ( ! args.url ) {
		throw new Error( 'Give --url <path> or --page <id> (or --self-test)' );
	}
	const exp = readExpectations();
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
	process.argv[ 1 ]?.endsWith( 'probe-motion-nav-bar.mjs' )
) {
	main().catch( ( e ) => {
		console.error( e.message );
		process.exit( 1 );
	} );
}
