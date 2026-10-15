/**
 * Spec 38A unit M5.7: live acceptance of the parallax effect (FR-38A-43, FR-38A-50) on a deployed site.
 *
 * With the page basis the translate is ratio x scrolled px, so at scrollY 500 a ratio of -0.06 reads -30px and a
 * ratio of 0.18 reads 90px, identically in every engine. Checks, at 1440, 768 and 375 and at scrollY 0, 500 and 1500:
 *   parallax-translate:hero       the hero's split media part (ratio -0.06) computes translateY = round(ratio x scrollY)
 *   parallax-translate:fast       a block root (ratio 0.18) computes translateY = round(ratio x scrollY)
 *   parallax-travel:hero          the painted top of that part moves by the same px against the document (measured
 *                                 from getBoundingClientRect, not from the computed style)
 *   parallax-frame-still:image    an image part (ratio -0.06) moves inside a frame whose document position never moves
 *   parallax-clamp:clamped        ratio 0.18 with a 40px clamp reads min(|ratio x scrollY|, 40)
 *   parallax-no-motion:control    the element with no parallax layer reads rest at every depth
 *   parallax-reduced:hero         with reduced motion emulated the part stays at rest at scrollY 500
 *   parallax-reduced-switch:hero  a mid-session switch to reduced rests the part and the switch back resumes it
 *   parallax-scroll-lands        a scroll to 500 or 1500 lands on that scrollY: the moving parts do not make the browser
 *                                re-scroll the page against them (Firefox scroll anchoring does, unless the part opts out
 *                                with overflow-anchor: none)
 *   parallax-no-inline-translate  no parallax element carries an inline transform or translate (FR-38A-47)
 *   parallax-cross-engine         the readings agree across engines within 1px (when two or more --engine are given)
 * Each check has a negative control that reads a different element or state and must come out red.
 *
 * FIXTURE: tests/fixtures/motion/pages/parallax.json, built with scripts/wp-build-page.js. The elements are found by
 * marker class (`.m38-*`), so any page built from it works; a check whose marker is missing reports UNANSWERED.
 *
 * Usage:
 *   node scripts/motion-qa/probe-parallax.mjs --page <id> [--engine chromium|firefox|webkit ...] [--width 1440|768|375 ...] [--site sandybrown]
 * Output: one JSON row per check, then a summary row. Exit: 0 all pass; 1 any FAIL or any control that did not go
 * red; 2 only UNANSWERED rows remain.
 *
 * @package SGS\Blocks
 */

import { chromium, firefox, webkit } from 'playwright';
import { parseArgs, siteBase, Reporter, near, parseTranslate, isRest } from './probe-motion-model-lib.mjs';

const BROWSERS = { chromium, firefox, webkit };
const HEIGHT = 900;
const DEPTHS = [ 0, 500, 1500 ];
const TOLERANCE = 1;

/** Each target: marker class, ratio, optional clamp (px). The selector finds the element carrying the effect. */
const TARGETS = {
	hero: { cls: '.m38-hero', ratio: -0.06, clamp: null },
	fast: { cls: '.m38-fast', ratio: 0.18, clamp: null },
	image: { cls: '.m38-image-host', ratio: -0.06, clamp: null },
	clamped: { cls: '.m38-clamped', ratio: 0.18, clamp: 40 },
};
const FRAME = '.m38-frame';
const CONTROL = '.m38-control';

const hostOf = ( cls ) => `${ cls }[data-sgs-fx~="parallax"], ${ cls } [data-sgs-fx~="parallax"]`;

/** The offset the effect must read: round( clamp( ratio x scrolled px ) ). */
export function expectedOffset( ratio, scrollY, clamp ) {
	const raw = ratio * scrollY;
	const limited = clamp === null ? raw : Math.max( -clamp, Math.min( clamp, raw ) );
	return Math.round( limited );
}

async function scrollTo( page, y ) {
	await page.evaluate( ( top ) => window.scrollTo( { top, behavior: 'instant' } ), y );
	await page.waitForFunction( ( top ) => Math.abs( window.scrollY - top ) < 2 || window.scrollY >= document.documentElement.scrollHeight - window.innerHeight - 2, y, { timeout: 5000 } ).catch( () => null );
	await page.waitForTimeout( 450 );
	return page.evaluate( () => Math.round( window.scrollY ) );
}

/** Read one element: computed translate y, painted document top, inline style text. Null when it is missing. */
async function read( page, selector ) {
	return page.evaluate( ( sel ) => {
		const el = document.querySelector( sel );
		if ( ! el ) return null;
		const rect = el.getBoundingClientRect();
		return { translate: getComputedStyle( el ).translate, docTop: rect.top + window.scrollY, style: el.getAttribute( 'style' ) || '' };
	}, selector );
}

const translateY = ( reading ) => parseTranslate( reading.translate ).y;

/** The depth sweep: every target at every depth, the frame, the clamp and the control. */
async function sweep( ctx, url ) {
	const { rep, shared, engine, width } = ctx;
	const { page, close } = await ctx.newPage( url );
	const base = {};
	const record = ( key, value ) => {
		( shared.readings[ engine ] ||= {} )[ `${ width }:${ key }` ] = value;
	};
	for ( const depth of DEPTHS ) {
		const y = await scrollTo( page, depth );
		const hostSelectors = Object.fromEntries( Object.entries( TARGETS ).map( ( [ name, t ] ) => [ name, hostOf( t.cls ) ] ) );
		if ( depth > 0 ) {
			rep.check( 'parallax-scroll-lands', { selector: 'window', property: `scrollY after scrolling to ${ depth }`, measured: y, expected: depth, pass: near( y, depth, TOLERANCE ) } );
			if ( depth === 500 ) {
				rep.control( 'parallax-scroll-lands', { selector: 'window', property: 'the same reading against a target 137px further down', measured: y, expected: depth + 137, red: ! near( y, depth + 137, TOLERANCE ) } );
			}
		}
		for ( const [ name, t ] of Object.entries( TARGETS ) ) {
			const reading = await read( page, hostSelectors[ name ] );
			const id = name === 'hero' ? 'hero' : name;
			if ( ! reading ) {
				rep.check( `parallax-translate:${ id }`, { selector: t.cls, property: `translate at scrollY ${ depth }`, pass: null, why: `no ${ t.cls } element with data-sgs-fx="parallax" on the page` } );
				continue;
			}
			base[ name ] ??= reading.docTop; // the part's document position at the first depth (scrollY 0)
			const want = expectedOffset( t.ratio, y, t.clamp );
			const got = translateY( reading );
			record( `${ name }@${ depth }`, got );
			if ( name === 'clamped' ) {
				rep.check( 'parallax-clamp:clamped', { selector: t.cls, property: `translateY at scrollY ${ y }`, measured: got, expected: want, pass: near( got, want, TOLERANCE ) } );
			} else {
				rep.check( `parallax-translate:${ id }`, { selector: t.cls, property: `translateY at scrollY ${ y } (ratio ${ t.ratio })`, measured: got, expected: want, pass: near( got, want, TOLERANCE ) } );
			}
			if ( name === 'hero' || name === 'image' ) {
				const moved = reading.docTop - base[ name ];
				rep.check( `parallax-travel:${ id }`, { selector: t.cls, property: `painted top against the document at scrollY ${ y }`, measured: Math.round( moved ), expected: want, pass: near( moved, want, TOLERANCE + 1 ) } );
			}
			if ( reading.style && /(^|;|\s)(transform|translate)\s*:/i.test( reading.style ) ) {
				rep.check( 'parallax-no-inline-translate', { selector: t.cls, measured: reading.style, expected: 'no transform or translate in style', pass: false } );
			}
		}
		const frame = await read( page, FRAME );
		if ( frame ) {
			base.frame ??= frame.docTop;
			rep.check( 'parallax-frame-still:image', { selector: FRAME, property: `frame document top at scrollY ${ y }`, measured: Math.round( frame.docTop ), expected: Math.round( base.frame ), pass: near( frame.docTop, base.frame, TOLERANCE ) && isRest( frame.translate ) } );
		} else {
			rep.check( 'parallax-frame-still:image', { selector: FRAME, pass: null, why: 'no .m38-frame on the page' } );
		}
		const control = await read( page, CONTROL );
		if ( control ) {
			rep.check( 'parallax-no-motion:control', { selector: CONTROL, property: `translate at scrollY ${ y }`, measured: control.translate, expected: 'rest', pass: isRest( control.translate ) } );
			if ( depth === 500 ) {
				rep.control( 'parallax-translate:hero', { selector: CONTROL, property: 'the no-parallax element read against the hero expectation (-30px at 500)', measured: translateY( control ), expected: -30, red: ! near( translateY( control ), -30, TOLERANCE ) } );
			}
		} else {
			rep.check( 'parallax-no-motion:control', { selector: CONTROL, pass: null, why: 'no .m38-control on the page' } );
		}
		if ( depth === 500 ) {
			const fast = await read( page, hostSelectors.fast );
			const hero = await read( page, hostSelectors.hero );
			if ( fast && hero ) {
				rep.control( 'parallax-clamp:clamped', { selector: TARGETS.fast.cls, property: 'the unclamped ratio 0.18 element read against the clamp (40px)', measured: translateY( fast ), expected: 40, red: ! near( translateY( fast ), 40, TOLERANCE ) } );
				rep.control( 'parallax-frame-still:image', { selector: TARGETS.hero.cls, property: 'a moving part read against a still frame', measured: Math.round( hero.docTop - base.hero ), expected: 0, red: ! near( hero.docTop - base.hero, 0, TOLERANCE ) } );
			}
		}
	}
	await close();
}

/** Reduced motion: at rest from load, and a mid-session switch in both directions. */
async function reducedChecks( ctx, url ) {
	const { rep } = ctx;
	const hero = hostOf( TARGETS.hero.cls );
	const calm = await ctx.newPage( url, { reducedMotion: 'reduce' } );
	await scrollTo( calm.page, 500 );
	const still = await read( calm.page, hero );
	if ( ! still ) {
		rep.check( 'parallax-reduced:hero', { selector: TARGETS.hero.cls, pass: null, why: 'no hero parallax element' } );
	} else {
		rep.check( 'parallax-reduced:hero', { selector: TARGETS.hero.cls, property: 'translate at scrollY 500 with prefers-reduced-motion: reduce', measured: still.translate, expected: 'rest', pass: isRest( still.translate ) } );
	}
	await calm.close();

	const live = await ctx.newPage( url, { reducedMotion: 'no-preference' } );
	const y = await scrollTo( live.page, 500 );
	const moving = await read( live.page, hero );
	if ( moving ) {
		rep.control( 'parallax-reduced:hero', { selector: TARGETS.hero.cls, property: 'the same read with no preference', measured: moving.translate, expected: 'not rest', red: ! isRest( moving.translate ) } );
		await live.page.emulateMedia( { reducedMotion: 'reduce' } );
		await live.page.waitForTimeout( 500 );
		const rested = await read( live.page, hero );
		await live.page.emulateMedia( { reducedMotion: 'no-preference' } );
		await live.page.evaluate( () => window.dispatchEvent( new Event( 'scroll' ) ) );
		await live.page.waitForTimeout( 600 );
		const back = await read( live.page, hero );
		const want = expectedOffset( TARGETS.hero.ratio, y, null );
		rep.check( 'parallax-reduced-switch:hero', { selector: TARGETS.hero.cls, property: 'rest after the switch to reduced, ratio x scrolled px after the switch back', measured: [ rested.translate, translateY( back ) ], expected: [ 'rest', want ], pass: isRest( rested.translate ) && near( translateY( back ), want, TOLERANCE ) } );
		rep.control( 'parallax-reduced-switch:hero', { selector: TARGETS.hero.cls, property: 'the moving reading read as if it were the rested one', measured: moving.translate, expected: 'rest', red: ! isRest( moving.translate ) } );
	}
	await live.close();
}

async function findPage( browser, urls ) {
	const context = await browser.newContext( { viewport: { width: 1440, height: HEIGHT } } );
	for ( const url of urls ) {
		const page = await context.newPage();
		await page.goto( url, { waitUntil: 'load' } );
		const found = await page.evaluate( ( sel ) => !! document.querySelector( sel ), hostOf( TARGETS.hero.cls ) );
		await page.close();
		if ( found ) {
			await context.close();
			return url;
		}
	}
	await context.close();
	return urls[ 0 ];
}

async function main() {
	const args = parseArgs( process.argv );
	if ( ! args.pages.length ) {
		console.error( 'Pass a --page <id> (a page built from tests/fixtures/motion/pages/parallax.json).' );
		process.exit( 1 );
	}
	const base = siteBase( args.site );
	const urls = args.pages.map( ( id ) => `${ base }/?p=${ id }&cb=m38` );
	const shared = { readings: {} };
	const all = [];
	for ( const engine of args.engines ) {
		const browser = await BROWSERS[ engine ].launch();
		const url = await findPage( browser, urls );
		for ( const width of args.widths ) {
			const rep = new Reporter( { engine, width, site: args.site } );
			const newPage = async ( target, opts = {} ) => {
				const context = await browser.newContext( { viewport: { width, height: HEIGHT }, ...opts } );
				const page = await context.newPage();
				await page.goto( target, { waitUntil: 'load' } ).catch( () => page.goto( target, { waitUntil: 'load' } ) );
				await page.waitForTimeout( 400 );
				return { page, close: () => context.close() };
			};
			const ctx = { browser, engine, width, rep, shared, newPage };
			for ( const run of [ sweep, reducedChecks ] ) {
				try {
					await run( ctx, url );
				} catch ( e ) {
					rep.check( `error:${ run.name }`, { pass: false, why: String( e && e.message ? e.message : e ) } );
				}
			}
			all.push( ...rep.rows );
		}
		await browser.close();
	}
	const finish = new Reporter( {} );
	finish.rows = all;
	const engines = Object.keys( shared.readings );
	if ( engines.length > 1 ) {
		const ref = shared.readings[ engines[ 0 ] ];
		const keys = Object.keys( ref );
		const equal = engines.slice( 1 ).every( ( e ) => keys.every( ( k ) => near( shared.readings[ e ][ k ], ref[ k ], TOLERANCE ) ) );
		finish.check( 'parallax-cross-engine', { property: 'translateY of every target at every width and depth', measured: shared.readings, expected: 'equal across engines within 1px', pass: equal } );
		const spread = Math.max( ...keys.map( ( k ) => Math.abs( ref[ k ] ) ) );
		finish.control( 'parallax-cross-engine', { measured: spread, expected: 'readings are not all zero, so equality is not trivially true', red: spread > 10 } );
	} else {
		finish.check( 'parallax-cross-engine', { pass: null, why: 'pass two or more --engine values to compare engines' } );
	}
	process.exit( finish.summary() );
}

main().catch( ( e ) => {
	console.error( e );
	process.exit( 1 );
} );
