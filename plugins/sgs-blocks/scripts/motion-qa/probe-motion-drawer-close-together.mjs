/**
 * Spec 38A FR-38A-51, Track S open item 1: a drawer whose old `itemStaggerOnClose` was off closes all at once.
 *
 * The fixture is an old-shape drawer (`tests/fixtures/motion/pages/nav-drawer-close-together-drawer.json`: a 60ms item
 * stagger, close in order off, the canary's Primary Menu and a button) migrated by `wp sgs motion-migrate`, whose
 * nav-drawer mapper stores `closeOrder: together`, and a page with its burger (`nav-drawer-close-together-page.json`).
 * On close every menu item's close animation starts with no delay and the dialog closes within the panel's close time
 * plus a frame margin, the old drawer's behaviour (Gate 5b measured a hold of about 330ms before this value existed).
 *
 * Checks, per engine at 375:
 *   opens          the burger opens the dialog (`data-sgs-motion-state` gains `open`)
 *   close-delays   every item's `sgs-me-close-*` animation delay is 0
 *   no-hold        the dialog closes within the panel close duration + 150ms
 * Control: the same two judges run on the reversed-order fixture page (5276, `closeOrder: reversed`), where they must
 * go red, so a pass here is not a page whose items have no close motion at all.
 *
 *   node scripts/motion-qa/probe-motion-drawer-close-together.mjs --page <id> [--control-page 5276] [--engine webkit]
 */
import { chromium, firefox, webkit } from 'playwright';
import { siteBase, Reporter, ENGINES, gotoThroughCheck } from './probe-motion-model-lib.mjs';
import { openDrawer } from './probe-drawer-open.mjs';

const BROWSERS = { chromium, firefox, webkit };
const WIDTH = 375;
const MARGIN_MS = 150;
const ITEMS = '.sgs-nav-drawer-menu__item, .m1t-item, .m45-item, .m45-custom';

function parseArgv( argv ) {
	const args = { page: null, control: '5276', engines: [], site: 'sandybrown' };
	for ( let i = 2; i < argv.length; i++ ) {
		const a = argv[ i ];
		if ( '--page' === a ) {
			args.page = argv[ ++i ];
		} else if ( '--control-page' === a ) {
			args.control = argv[ ++i ];
		} else if ( '--engine' === a ) {
			args.engines.push( argv[ ++i ] );
		} else if ( '--site' === a ) {
			args.site = argv[ ++i ];
		} else {
			throw new Error( `Unknown argument ${ a }` );
		}
	}
	if ( ! args.page ) {
		throw new Error( 'Give --page <id>' );
	}
	args.engines = args.engines.length ? args.engines : [ ...ENGINES ];
	if ( args.engines.some( ( e ) => ! ENGINES.includes( e ) ) ) {
		throw new Error( `--engine must be one of ${ ENGINES.join( ', ' ) }` );
	}
	return args;
}

/** Open the drawer at `?p=<id>`, settle, close it, and read each item's close animation delay and the close time. */
async function measure( browser, base, id ) {
	const context = await browser.newContext( { viewport: { width: WIDTH, height: 900 }, reducedMotion: 'no-preference' } );
	const page = await context.newPage();
	try {
		if ( ! ( await gotoThroughCheck( page, `${ base }/?p=${ id }` ) ) ) {
			return { opened: false, why: 'the host edge kept serving its browser check' };
		}
		const drawerSel = await page.evaluate( () => {
			const d = document.querySelector( 'dialog[data-sgs-motion-state]' );
			return d ? `#${ d.id }` : null;
		} );
		if ( ! drawerSel ) {
			return { opened: false, why: `no motion-model dialog on ?p=${ id } (title "${ await page.title() }")` };
		}
		const opened = await openDrawer( page, drawerSel );
		if ( ! opened.opened ) {
			return opened;
		}
		await page.waitForTimeout( 1500 );
		const started = Date.now();
		const close = await page.evaluate( ( [ sel, items ] ) => {
			const drawer = document.querySelector( sel );
			drawer.querySelector( '[data-sgs-nav-close]' )?.click();
			const timing = ( el ) => el.getAnimations().filter( ( a ) => /^sgs-me-close-/.test( a.animationName || '' ) ).map( ( a ) => a.effect.getTiming() )[ 0 ] || null;
			return {
				panel: timing( drawer )?.duration ?? null,
				delays: [ ...drawer.querySelectorAll( items ) ].map( timing ).filter( Boolean ).map( ( t ) => t.delay ),
			};
		}, [ drawerSel, ITEMS ] );
		await page.waitForFunction( ( sel ) => ! document.querySelector( sel )?.open, drawerSel, { timeout: 5000 } ).catch( () => null );
		return { opened: true, elapsed: Date.now() - started, ...close };
	} finally {
		await context.close();
	}
}

const allZero = ( m ) => m.delays.length > 0 && m.delays.every( ( d ) => 0 === d );
const noHold = ( m ) => Number.isFinite( m.panel ) && m.elapsed <= m.panel + MARGIN_MS;

async function main() {
	const args = parseArgv( process.argv );
	const base = siteBase( args.site );
	const rep = new Reporter( {} );
	for ( const engine of args.engines ) {
		const browser = await BROWSERS[ engine ].launch( { headless: ! process.env.SGS_HEADED } );
		rep.context = { engine, width: WIDTH };
		const m = await measure( browser, base, args.page );
		const where = { selector: `?p=${ args.page }` };
		rep.check( 'opens', { ...where, property: 'data-sgs-motion-state', measured: m.opened, expected: true, pass: m.opened ? true : null, why: m.why || '' } );
		if ( m.opened ) {
			rep.check( 'close-delays', { ...where, property: 'close animation delay', measured: m.delays, expected: 'every 0', pass: allZero( m ) } );
			rep.check( 'no-hold', { ...where, property: 'click to dialog closed (ms)', measured: m.elapsed, expected: `<= ${ m.panel } + ${ MARGIN_MS }`, pass: noHold( m ) } );
		}
		const c = await measure( browser, base, args.control );
		const cwhere = { selector: `?p=${ args.control }` };
		rep.control( 'close-delays', { ...cwhere, property: 'close animation delay', measured: c.delays ?? null, expected: 'every 0', red: c.opened ? ! allZero( c ) : null, why: c.why || '' } );
		rep.control( 'no-hold', { ...cwhere, property: 'click to dialog closed (ms)', measured: c.elapsed ?? null, expected: `<= panel + ${ MARGIN_MS }`, red: c.opened ? ! noHold( c ) : null, why: c.why || '' } );
		await browser.close();
	}
	process.exit( rep.summary() );
}

main().catch( ( e ) => {
	console.error( e.message );
	process.exit( 1 );
} );
