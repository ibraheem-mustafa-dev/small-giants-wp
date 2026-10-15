/**
 * Spec 38A unit M5.8b: live acceptance of the scroll-progress effect (FR-38A-36) on a deployed site.
 *
 * WHAT IT MEASURES (each check has a negative control that must come out red; a control that does not fails the run):
 *   scroll-progress-bar       the bar's computed `scale` (x factor) equals page progress within 0.01 at 0%, 50% and 100% scroll
 *   scroll-progress-counter   the counter text equals Math.round(progress * 100) + '%' at the same three points
 *   scroll-progress-section   the section-source bar is 0 before its section enters, tracks the section formula mid-crossing, and is 1 after it leaves
 *   scroll-progress-reduced   with prefers-reduced-motion: reduce emulated, the bar still tracks (progress is information)
 *   no-scroll-progress-assets a page without the effect (the no-motion page) requests nothing named fx-scroll-progress
 *
 * NEGATIVE CONTROLS
 *   - bar: the `data-sgs-fx` token is removed from the bar at runtime, so the stylesheet no longer paints it: the check must fail.
 *   - bar: `--sgs-scroll-progress: 0.3 !important` is forced on the bar with an injected rule (the driver rewrites an
 *     inline value on every frame, so only an author !important rule holds): the check must fail at 0% and at 100%.
 *   - counter: the judge is run on a static heading's text: it must reject it.
 *   - section / reduced: the token is removed from the bar: the check must fail.
 *   - assets: the same listener on the fixture page must see a request named fx-scroll-progress.
 *
 * FIXTURE: tests/fixtures/motion/pages/scroll-progress.json, built with scripts/wp-build-page.js. Elements are found by
 * marker class (`.m58-bar`, `.m58-counter`, `.m58-section-bar`), not by name. SCROLL_PROGRESS_PAGE below is 0 until the
 * page exists; at 0 (and with no --page) the probe reports UNANSWERED and exits 2.
 *
 * Usage:
 *   node scripts/motion-qa/probe-scroll-progress.mjs [--page <id>] [--no-motion-page <id>] [--engine chromium|firefox|webkit ...]
 *        [--width 1440|768|375 ...] [--site sandybrown]
 *   node scripts/motion-qa/probe-scroll-progress.mjs --self-test   (offline: the judges)
 *   node scripts/motion-qa/probe-scroll-progress.mjs --help
 * Output: one JSON row per check, then a summary row. Exit: 0 all pass; 1 any FAIL or any control that did not go red;
 * 2 only UNANSWERED rows remain.
 *
 * @package SGS\Blocks
 */

import { chromium, firefox, webkit } from 'playwright';
import { parseArgs, siteBase, Reporter, near, viewProgress } from './probe-motion-model-lib.mjs';

/** The canary page built from scroll-progress.json. 0 = not created yet. */
export const SCROLL_PROGRESS_PAGE = 5250;
/** The canary page with no motion (the asset-guard reference, shared with probe-motion-model.mjs). */
export const NO_MOTION_PAGE = 5229;

const BROWSERS = { chromium, firefox, webkit };
const HEIGHT = 900;
const TOLERANCE = 0.01;
const POINTS = [ 0, 0.5, 1 ];

// ---- Pure judges -----------------------------------------------------------------------------------------------

/** The x factor of a computed `scale` ("none", "0.5", "0.5 1"). `none` is the CSS initial value, a factor of 1. */
export function parseScaleX( value ) {
	if ( ! value || 'none' === value ) return 1;
	return parseFloat( value.split( /\s+/ )[ 0 ] );
}

/** Page progress for a scroll position. */
export const pageProgress = ( scrollY, scrollHeight, innerHeight ) => {
	const range = scrollHeight - innerHeight;
	return range > 0 ? Math.min( 1, Math.max( 0, scrollY / range ) ) : 0;
};

/** True when every row's bar scale equals its page progress. */
export const judgeBar = ( rows ) => rows.length > 0 && rows.every( ( r ) => near( r.scale, r.progress, TOLERANCE ) );

/** True when a counter text is the rounded percent of the progress. A value on a rounding boundary accepts either neighbour. */
export function judgeCounter( text, progress ) {
	const exact = progress * 100;
	if ( ! /^\d+%$/.test( ( text || '' ).trim() ) ) return false;
	const shown = parseInt( text, 10 );
	if ( shown === Math.round( exact ) ) return true;
	return Math.abs( exact - Math.trunc( exact ) - 0.5 ) < 0.05 && Math.abs( shown - exact ) <= 0.55;
}

// ---- Page helpers ----------------------------------------------------------------------------------------------

const settle = async ( page ) => {
	await page.evaluate( () => new Promise( ( r ) => requestAnimationFrame( () => requestAnimationFrame( r ) ) ) );
	await page.waitForTimeout( 120 );
};

/** Scroll to a fraction of the document range, settle two frames, and read the geometry plus the three outputs. */
async function readAt( page, fraction, selectors ) {
	await page.evaluate( ( f ) => {
		const range = document.documentElement.scrollHeight - window.innerHeight;
		window.scrollTo( { top: f * range, behavior: 'instant' } );
	}, fraction );
	await settle( page );
	return page.evaluate( ( sel ) => {
		const el = ( s ) => document.querySelector( s );
		const bar = el( sel.bar );
		const counter = el( sel.counter );
		return {
			scrollY: window.scrollY,
			scrollHeight: document.documentElement.scrollHeight,
			innerHeight: window.innerHeight,
			scale: bar ? getComputedStyle( bar ).scale : null,
			text: counter ? counter.textContent : null,
		};
	}, selectors );
}

const SELECTORS = { bar: '.m58-bar', counter: '.m58-counter' };

async function barRows( page ) {
	const rows = [];
	for ( const f of POINTS ) {
		const r = await readAt( page, f, SELECTORS );
		rows.push( { at: f, scrollY: r.scrollY, scale: parseScaleX( r.scale ), rawScale: r.scale, progress: pageProgress( r.scrollY, r.scrollHeight, r.innerHeight ) } );
	}
	return rows;
}

async function counterRows( page ) {
	const rows = [];
	for ( const f of POINTS ) {
		const r = await readAt( page, f, SELECTORS );
		rows.push( { at: f, text: r.text, progress: pageProgress( r.scrollY, r.scrollHeight, r.innerHeight ) } );
	}
	return rows;
}

/** The section bar at the top, mid-crossing and the end; expected values come from the section's own geometry. */
async function sectionRows( page ) {
	const reads = [];
	for ( const where of [ 'before', 'mid', 'after' ] ) {
		await page.evaluate( ( w ) => {
			const section = document.querySelector( '.m58-section-bar' ).closest( 'section' );
			const top = section.getBoundingClientRect().top + window.scrollY;
			const max = document.documentElement.scrollHeight - window.innerHeight;
			const y = 'before' === w ? 0 : 'after' === w ? max : Math.min( max, Math.max( 0, top + section.offsetHeight / 2 - window.innerHeight / 2 ) );
			window.scrollTo( { top: y, behavior: 'instant' } );
		}, where );
		await settle( page );
		reads.push( await page.evaluate( ( w ) => {
			const bar = document.querySelector( '.m58-section-bar' );
			const section = bar.closest( 'section' );
			const rect = section.getBoundingClientRect();
			return { where: w, scale: getComputedStyle( bar ).scale, top: rect.top, height: rect.height, viewport: window.innerHeight };
		}, where ) );
	}
	return reads.map( ( r ) => ( {
		where: r.where,
		scale: parseScaleX( r.scale ),
		expected: 'before' === r.where ? 0 : 'after' === r.where ? 1 : viewProgress( r.top, r.height, r.viewport ),
	} ) );
}

const judgeSection = ( rows ) => rows.length === 3 && rows.every( ( r ) => near( r.scale, r.expected, TOLERANCE ) );

// ---- Live checks -----------------------------------------------------------------------------------------------

async function open( ctx, opts = {}, mutate ) {
	const { browser, width, url } = ctx;
	const context = await browser.newContext( { viewport: { width, height: HEIGHT }, ...opts } );
	const page = await context.newPage();
	await page.goto( url, { waitUntil: 'load' } ).catch( () => page.goto( url, { waitUntil: 'load' } ) );
	await page.waitForTimeout( 500 );
	if ( mutate ) {
		await mutate( page );
		await settle( page );
	}
	return { page, close: () => context.close() };
}

const removeToken = ( selector ) => ( page ) => page.evaluate( ( s ) => document.querySelector( s ).removeAttribute( 'data-sgs-fx' ), selector );
const forceProgress = ( page ) => page.addStyleTag( { content: '.m58-bar{--sgs-scroll-progress:0.3 !important}' } );

async function barChecks( ctx ) {
	const { rep } = ctx;
	const live = await open( ctx );
	const rows = await barRows( live.page );
	await live.close();
	rep.check( 'scroll-progress-bar', { selector: '.m58-bar', property: 'scale (x) vs scrollY / (scrollHeight - innerHeight) at 0%, 50%, 100%', measured: rows, expected: 'equal within 0.01', pass: judgeBar( rows ) } );

	const cut = await open( ctx, {}, removeToken( '.m58-bar' ) );
	const cutRows = await barRows( cut.page );
	await cut.close();
	rep.control( 'scroll-progress-bar', { selector: '.m58-bar', property: 'scale after the data-sgs-fx token is removed', measured: cutRows, expected: 'the check fails', red: ! judgeBar( cutRows ) } );

	const forced = await open( ctx, {}, forceProgress );
	const forcedRows = await barRows( forced.page );
	await forced.close();
	const at = ( f ) => forcedRows.find( ( r ) => r.at === f );
	rep.control( 'scroll-progress-bar', { selector: '.m58-bar', property: '--sgs-scroll-progress forced to 0.3 (author !important)', measured: forcedRows, expected: 'fails at 0% and at 100%', red: ! near( at( 0 ).scale, at( 0 ).progress, TOLERANCE ) && ! near( at( 1 ).scale, at( 1 ).progress, TOLERANCE ) } );
}

async function counterChecks( ctx ) {
	const { rep } = ctx;
	const live = await open( ctx );
	const rows = await counterRows( live.page );
	const heading = await live.page.evaluate( () => document.querySelector( '.m58-first h2' )?.textContent ?? '' );
	await live.close();
	rep.check( 'scroll-progress-counter', { selector: '.m58-counter', property: "textContent vs Math.round(progress * 100) + '%' at 0%, 50%, 100%", measured: rows, expected: 'equal', pass: rows.every( ( r ) => judgeCounter( r.text, r.progress ) ) } );
	rep.control( 'scroll-progress-counter', { selector: '.m58-first h2', property: 'the judge run on a static heading', measured: heading, expected: 'rejected', red: ! rows.every( ( r ) => judgeCounter( heading, r.progress ) ) } );
}

async function sectionChecks( ctx ) {
	const { rep } = ctx;
	const live = await open( ctx );
	const rows = await sectionRows( live.page );
	await live.close();
	rep.check( 'scroll-progress-section', { selector: '.m58-section-bar', property: 'scale before the section enters, mid-crossing, after it leaves', measured: rows, expected: '0, the view formula, 1', pass: judgeSection( rows ) } );
	const cut = await open( ctx, {}, removeToken( '.m58-section-bar' ) );
	const cutRows = await sectionRows( cut.page );
	await cut.close();
	rep.control( 'scroll-progress-section', { selector: '.m58-section-bar', property: 'scale after the data-sgs-fx token is removed', measured: cutRows, expected: 'the check fails', red: ! judgeSection( cutRows ) } );
}

async function reducedChecks( ctx ) {
	const { rep } = ctx;
	const reduced = await open( ctx, { reducedMotion: 'reduce' } );
	const emulated = await reduced.page.evaluate( () => matchMedia( '(prefers-reduced-motion: reduce)' ).matches );
	const rows = await barRows( reduced.page );
	await reduced.close();
	rep.check( 'scroll-progress-reduced', { selector: '.m58-bar', property: 'scale under prefers-reduced-motion: reduce', measured: { emulated, rows }, expected: 'emulation on, bar still equals page progress', pass: emulated && judgeBar( rows ) } );
	const cut = await open( ctx, { reducedMotion: 'reduce' }, removeToken( '.m58-bar' ) );
	const cutRows = await barRows( cut.page );
	await cut.close();
	rep.control( 'scroll-progress-reduced', { selector: '.m58-bar', property: 'scale under reduced motion after the token is removed', measured: cutRows, expected: 'the check fails', red: ! judgeBar( cutRows ) } );
}

async function assetChecks( ctx ) {
	const { rep, base, noMotionPage, pageId } = ctx;
	const load = async ( id ) => {
		const context = await ctx.browser.newContext( { viewport: { width: ctx.width, height: HEIGHT } } );
		const page = await context.newPage();
		const seen = [];
		page.on( 'request', ( r ) => seen.push( r.url() ) );
		const res = await page.goto( `${ base }/?p=${ id }&cb=m58`, { waitUntil: 'load' } );
		await page.waitForTimeout( 800 );
		await context.close();
		return { status: res ? res.status() : 0, hits: seen.filter( ( u ) => u.includes( 'fx-scroll-progress' ) ) };
	};
	const none = await load( noMotionPage );
	rep.check( 'no-scroll-progress-assets', { selector: `page ${ noMotionPage }`, property: 'request URLs containing fx-scroll-progress', measured: none.hits, expected: [], pass: 200 === none.status && 0 === none.hits.length } );
	const some = await load( pageId );
	rep.control( 'no-scroll-progress-assets', { selector: `page ${ pageId }`, property: 'the same listener on the fixture page', measured: some.hits, expected: 'at least one request', red: some.hits.length > 0 } );
}

// ---- Entry -----------------------------------------------------------------------------------------------------

function selfTest() {
	const failures = [];
	const need = ( name, ok ) => { if ( ! ok ) failures.push( name ); };
	need( 'scale none is 1', 1 === parseScaleX( 'none' ) );
	need( 'scale pair', 0.5 === parseScaleX( '0.5 1' ) );
	need( 'bar accepts equal', judgeBar( [ { scale: 0.5, progress: 0.505 } ] ) );
	need( 'bar rejects 0.3 at 0', ! judgeBar( [ { scale: 0.3, progress: 0 } ] ) );
	need( 'bar rejects empty', ! judgeBar( [] ) );
	need( 'counter exact', judgeCounter( '50%', 0.5 ) && judgeCounter( '100%', 1 ) && judgeCounter( '0%', 0 ) );
	need( 'counter rejects wrong', ! judgeCounter( '30%', 0.5 ) && ! judgeCounter( 'Scroll progress', 0 ) );
	need( 'counter boundary', judgeCounter( '50%', 0.495 ) && judgeCounter( '49%', 0.495 ) );
	need( 'page progress', 0.5 === pageProgress( 500, 1900, 900 ) );
	need( 'section judge', judgeSection( [ { scale: 0, expected: 0 }, { scale: 0.5, expected: 0.5 }, { scale: 1, expected: 1 } ] ) && ! judgeSection( [ { scale: 1, expected: 0 }, { scale: 0.5, expected: 0.5 }, { scale: 1, expected: 1 } ] ) );
	console.log( JSON.stringify( { selfTest: true, failures } ) );
	return failures.length ? 1 : 0;
}

async function main() {
	const argv = process.argv.slice( 0 );
	if ( argv.includes( '--help' ) ) {
		console.log( 'Usage: node probe-scroll-progress.mjs [--page <id>] [--no-motion-page <id>] [--engine chromium|firefox|webkit ...] [--width 1440|768|375 ...] [--site sandybrown] | --self-test | --help' );
		process.exit( 0 );
	}
	if ( argv.includes( '--self-test' ) ) process.exit( selfTest() );
	let noMotionPage = NO_MOTION_PAGE;
	const at = argv.indexOf( '--no-motion-page' );
	if ( at > -1 ) noMotionPage = Number( argv.splice( at, 2 )[ 1 ] );
	const args = parseArgs( argv );
	const pageId = Number( args.pages[ 0 ] ?? SCROLL_PROGRESS_PAGE );
	if ( ! pageId ) {
		const rep = new Reporter( {} );
		rep.check( 'scroll-progress-fixture', { pass: null, why: 'fixture page not created: build tests/fixtures/motion/pages/scroll-progress.json, then set SCROLL_PROGRESS_PAGE in this file (or pass --page <id>)' } );
		process.exit( rep.summary() );
	}
	const base = siteBase( args.site );
	const url = `${ base }/?p=${ pageId }&cb=m58`;
	const all = [];
	for ( const engine of args.engines ) {
		const browser = await BROWSERS[ engine ].launch();
		for ( const width of args.widths ) {
			const rep = new Reporter( { engine, width, site: args.site } );
			const ctx = { browser, width, base, url, rep, noMotionPage, pageId };
			const probe = await open( ctx );
			const present = await probe.page.evaluate( () => [ '.m58-bar', '.m58-counter', '.m58-section-bar' ].filter( ( s ) => ! document.querySelector( s ) ) );
			await probe.close();
			if ( present.length ) {
				rep.check( 'scroll-progress-fixture', { selector: url, measured: present, expected: 'every marker present', pass: null, why: `markers missing from page ${ pageId }: ${ present.join( ', ' ) }` } );
			} else {
				for ( const run of [ barChecks, counterChecks, sectionChecks, reducedChecks, assetChecks ] ) {
					try {
						await run( ctx );
					} catch ( e ) {
						rep.check( `error:${ run.name }`, { pass: false, why: String( e && e.message ? e.message : e ) } );
					}
				}
			}
			all.push( ...rep.rows );
		}
		await browser.close();
	}
	const finish = new Reporter( {} );
	finish.rows = all;
	process.exit( finish.summary() );
}

main().catch( ( e ) => {
	console.error( e );
	process.exit( 1 );
} );
