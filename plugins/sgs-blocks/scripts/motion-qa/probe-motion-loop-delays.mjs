/**
 * Spec 38A unit M4.3: live acceptance of the server-written loop delays (FR-38A-26) on a deployed archive or a page
 * holding a post-grid, a core post-template or a WooCommerce product-template that carries a stagger.
 *
 * WHAT IT MEASURES (per case URL, per width; each judge has a negative control that must come out red):
 *   items-found, per-item-delay (the item's computed --sgs-me-delay at this width against the expected list),
 *   one-rule-per-item (exactly one top-level rule per index in the stylesheets), no-style-attribute (no item, and no
 *   other [data-sgs-loop-i] element, has a `style` attribute), no-nth-delay-rule (no stylesheet rule that writes a
 *   delay is keyed on :nth-child / :nth-of-type / :nth-last-child), restart-per-page (every case URL's first item has
 *   the same delay, the offset).
 *
 * Widths map to tiers: 1440 desktop, 768 tablet, 375 mobile. A tier with no --expect-<tier> list is not judged for
 * values (only structure), and reports UNANSWERED for per-item-delay, never PASS.
 *
 * Usage:
 *   node scripts/motion-qa/probe-motion-loop-delays.mjs --url <path-or-url> --expect 0,80,160,0,80,160
 *        [--expect-tablet 0,80,0,80,0,80] [--expect-mobile 0,80,160,240,320,400]
 *        [--url <page-2-url> --expect 0,80,160] ...  [--item-selector '[data-sgs-loop-i]']
 *        [--width 1440 --width 768 --width 375] [--engine chromium|firefox|webkit] [--site sandybrown]
 *   `--page <id>` is shorthand for `--url /?p=<id>`. An --expect* flag applies to the nearest --url before it.
 *   node scripts/motion-qa/probe-motion-loop-delays.mjs --self-test    (offline: the judges and their controls)
 * Output: one JSON row per check, then a summary row. Exit: 0 all pass; 1 any FAIL or any control that did not go red;
 * 2 only UNANSWERED rows remain.
 *
 * Nothing deployed uses the loop delays until M4.3 ships; run it after a deploy that carries the unit and a page
 * whose query loop stores a stagger.
 *
 * @package SGS\Blocks
 */

import { chromium, firefox, webkit } from 'playwright';
import { siteBase, Reporter, ENGINES, WIDTHS } from './probe-motion-model-lib.mjs';

const BROWSERS = { chromium, firefox, webkit };
const HEIGHT = 900;
const TIER_OF_WIDTH = { 1440: 'desktop', 768: 'tablet', 375: 'mobile' };
const NTH = /:nth-(child|of-type|last-child|last-of-type)\b/;

// ---- Pure judges ---------------------------------------------------------------------------------------------

/** Parse "0,80,160" into [0, 80, 160]; null for an absent flag; throws on a non-number. */
export function parseList( text ) {
	if ( text === undefined || text === null ) return null;
	return String( text ).split( ',' ).map( ( part ) => {
		const n = Number( part.trim() );
		if ( ! Number.isFinite( n ) ) throw new Error( `Not a number in list: ${ part }` );
		return n;
	} );
}

/** "80ms" / "0.08s" / "80" to milliseconds; NaN for anything else. */
export function toMs( value ) {
	const text = String( value ?? '' ).trim();
	const m = text.match( /^(-?\d*\.?\d+)(ms|s)?$/ );
	if ( ! m ) return NaN;
	return m[ 2 ] === 's' ? Number( m[ 1 ] ) * 1000 : Number( m[ 1 ] );
}

/** Measured and expected delay lists agree item for item (within 1 ms), same length. */
export function judgeDelays( measured, expected ) {
	if ( ! Array.isArray( measured ) || ! Array.isArray( expected ) || measured.length !== expected.length ) return false;
	return measured.every( ( value, i ) => Number.isFinite( value ) && Math.abs( value - expected[ i ] ) <= 1 );
}

/** Rules that write a delay and are keyed on a positional pseudo-class. `rules` rows: { selector, css }. */
export function findNthDelayRules( rules ) {
	return rules.filter( ( r ) => NTH.test( r.selector ) && /(--sgs-me-delay|animation-delay|transition-delay)\s*:/.test( r.css ) );
}

/** Top-level rules per loop index: array of counts indexed by item index (rows: { selector, css, media }). */
export function rulesPerIndex( rules, count ) {
	const counts = new Array( count ).fill( 0 );
	for ( const r of rules ) {
		const m = r.selector.match( /\[data-sgs-loop-i="(\d+)"\]/ );
		if ( m && ! r.media && /--sgs-me-delay\s*:/.test( r.css ) && Number( m[ 1 ] ) < count ) counts[ Number( m[ 1 ] ) ]++;
	}
	return counts;
}

/** The offline self-test: each judge against a passing input, a failing input and its planted fault. */
function selfTest() {
	const out = [];
	const ok = ( label, cond ) => {
		out.push( { label, pass: Boolean( cond ) } );
	};
	ok( 'toMs parses ms and s', toMs( '80ms' ) === 80 && toMs( '0.08s' ) === 80 && Number.isNaN( toMs( 'none' ) ) );
	ok( 'judgeDelays passes equal lists', judgeDelays( [ 0, 80, 160 ], [ 0, 80, 160 ] ) );
	ok( 'control: judgeDelays fails a shifted list', ! judgeDelays( [ 0, 80, 160 ], [ 0, 80, 240 ] ) );
	ok( 'control: judgeDelays fails a short list', ! judgeDelays( [ 0, 80 ], [ 0, 80, 160 ] ) );
	ok( 'control: judgeDelays fails NaN', ! judgeDelays( [ NaN ], [ 0 ] ) );
	const ladder = [ { selector: '.a > li:nth-child(2)', css: '--sgs-me-delay:80ms;' } ];
	ok( 'findNthDelayRules flags an nth ladder', findNthDelayRules( ladder ).length === 1 );
	ok( 'findNthDelayRules ignores an nth rule with no delay', findNthDelayRules( [ { selector: 'li:nth-child(2)', css: 'color:red;' } ] ).length === 0 );
	ok( 'findNthDelayRules ignores the attribute form', findNthDelayRules( [ { selector: '.a > *[data-sgs-loop-i="2"]', css: '--sgs-me-delay:80ms;' } ] ).length === 0 );
	const rules = [ 0, 1, 2 ].map( ( i ) => ( { selector: `.a > *[data-sgs-loop-i="${ i }"]`, css: `--sgs-me-delay:${ i * 80 }ms;`, media: '' } ) );
	rules.push( { selector: '.a > *[data-sgs-loop-i="1"]', css: '--sgs-me-delay:0ms;', media: '(max-width:767px)' } );
	ok( 'rulesPerIndex counts top-level rules only', rulesPerIndex( rules, 3 ).join() === '1,1,1' );
	ok( 'control: rulesPerIndex sees a missing rule', rulesPerIndex( rules.slice( 1 ), 3 ).join() === '0,1,1' );
	for ( const row of out ) console.log( JSON.stringify( { check: row.label, verdict: row.pass ? 'PASS' : 'FAIL' } ) );
	const failed = out.filter( ( r ) => ! r.pass ).length;
	console.log( JSON.stringify( { summary: true, selfTest: true, pass: out.length - failed, fail: failed } ) );
	return failed ? 1 : 0;
}

// ---- Arguments -------------------------------------------------------------------------------------------------

function parseArgv( argv ) {
	const args = { cases: [], engines: [], widths: [], site: 'sandybrown', itemSelector: '[data-sgs-loop-i]', selfTest: false };
	const last = () => {
		if ( ! args.cases.length ) throw new Error( 'An --expect flag needs a --url before it' );
		return args.cases[ args.cases.length - 1 ];
	};
	for ( let i = 2; i < argv.length; i++ ) {
		const a = argv[ i ];
		if ( a === '--url' ) args.cases.push( { url: argv[ ++i ], expect: {} } );
		else if ( a === '--page' ) args.cases.push( { url: `/?p=${ argv[ ++i ] }`, expect: {} } );
		else if ( a === '--expect' ) last().expect.desktop = parseList( argv[ ++i ] );
		else if ( a === '--expect-tablet' ) last().expect.tablet = parseList( argv[ ++i ] );
		else if ( a === '--expect-mobile' ) last().expect.mobile = parseList( argv[ ++i ] );
		else if ( a === '--item-selector' ) args.itemSelector = argv[ ++i ];
		else if ( a === '--engine' ) args.engines.push( argv[ ++i ] );
		else if ( a === '--width' ) args.widths.push( Number( argv[ ++i ] ) );
		else if ( a === '--site' ) args.site = argv[ ++i ];
		else if ( a === '--self-test' ) args.selfTest = true;
		else throw new Error( `Unknown argument ${ a }` );
	}
	if ( ! args.engines.length ) args.engines = [ 'chromium' ];
	if ( ! args.widths.length ) args.widths = [ ...WIDTHS ];
	for ( const e of args.engines ) if ( ! ENGINES.includes( e ) ) throw new Error( `--engine must be one of ${ ENGINES.join( ', ' ) }` );
	for ( const w of args.widths ) if ( ! WIDTHS.includes( w ) ) throw new Error( `--width must be one of ${ WIDTHS.join( ', ' ) }` );
	return args;
}

// ---- Page reads ------------------------------------------------------------------------------------------------

/** Item facts, in document order: the index attribute, the computed delay, the style attribute and the animation delay. */
async function readItems( page, selector ) {
	return page.evaluate( ( sel ) => [ ...document.querySelectorAll( sel ) ].map( ( el ) => {
		const target = el.matches( '[data-sgs-me]' ) ? el : el.querySelector( '[data-sgs-me]' );
		return {
			index: el.getAttribute( 'data-sgs-loop-i' ),
			delay: getComputedStyle( el ).getPropertyValue( '--sgs-me-delay' ).trim(),
			animationDelay: target ? getComputedStyle( target ).animationDelay : null,
			hasStyleAttr: el.hasAttribute( 'style' ),
		};
	} ), selector );
}

/** Every style rule in every readable stylesheet, flattened with its media condition. */
async function readRules( page ) {
	return page.evaluate( () => {
		const rows = [];
		let unreadable = 0;
		const walk = ( list, media ) => {
			for ( const rule of list ) {
				if ( rule.cssRules && rule.conditionText !== undefined ) walk( rule.cssRules, rule.conditionText );
				else if ( rule.selectorText ) rows.push( { selector: rule.selectorText, css: rule.style ? rule.style.cssText : '', media } );
			}
		};
		for ( const sheet of document.styleSheets ) {
			try {
				walk( sheet.cssRules, '' );
			} catch ( e ) {
				unreadable++;
			}
		}
		return { rows, unreadable };
	} );
}

async function checkCase( rep, page, args, kase, width ) {
	const tier = TIER_OF_WIDTH[ width ];
	const url = /^https?:/.test( kase.url ) ? kase.url : `${ siteBase( args.site ) }${ kase.url.startsWith( '/' ) ? '' : '/' }${ kase.url }`;
	await page.goto( url, { waitUntil: 'load' } );
	const items = await readItems( page, args.itemSelector );
	const where = { selector: args.itemSelector, url, width };
	rep.check( 'items-found', { ...where, measured: items.length, expected: '>= 1', pass: items.length > 0 ? true : null, why: items.length ? '' : 'no loop item on the page' } );
	if ( ! items.length ) return null;

	const measured = items.map( ( item ) => toMs( item.delay ) );
	const expected = kase.expect[ tier ];
	if ( expected ) {
		rep.check( 'per-item-delay', { ...where, property: '--sgs-me-delay', measured, expected, pass: judgeDelays( measured, expected ) } );
		const shifted = expected.map( ( v ) => v + 40 );
		rep.control( 'per-item-delay', { ...where, property: '--sgs-me-delay', measured, expected: shifted, red: ! judgeDelays( measured, shifted ) } );
	} else {
		rep.check( 'per-item-delay', { ...where, property: '--sgs-me-delay', measured, expected: null, pass: null, why: `no --expect list for ${ tier }` } );
	}
	const indexes = items.map( ( item ) => Number( item.index ) );
	rep.check( 'index-is-document-order', { ...where, measured: indexes, expected: 'from 0, step 1', pass: indexes.every( ( n, i ) => n === i ) } );

	const styled = items.filter( ( item ) => item.hasStyleAttr ).length;
	rep.check( 'no-style-attribute', { ...where, property: 'style', measured: styled, expected: 0, pass: styled === 0 } );

	const { rows, unreadable } = await readRules( page );
	const counts = rulesPerIndex( rows, items.length );
	rep.check( 'one-rule-per-item', { ...where, measured: counts, expected: 'one top-level rule per index', pass: counts.every( ( n ) => n === 1 ) } );
	const nth = findNthDelayRules( rows );
	rep.check( 'no-nth-delay-rule', { ...where, measured: nth.length, expected: 0, pass: nth.length === 0, why: unreadable ? `${ unreadable } stylesheet(s) unreadable (cross-origin)` : '' } );
	rep.control( 'no-nth-delay-rule', { ...where, measured: 1, expected: 0, red: findNthDelayRules( [ ...rows, { selector: '.x > li:nth-child(2)', css: '--sgs-me-delay: 80ms;', media: '' } ] ).length > 0 } );
	return measured[ 0 ];
}

async function main() {
	const args = parseArgv( process.argv );
	if ( args.selfTest ) process.exit( selfTest() );
	if ( ! args.cases.length ) throw new Error( 'Give at least one --url or --page (or --self-test)' );
	const rep = new Reporter( {} );
	for ( const engine of args.engines ) {
		const browser = await BROWSERS[ engine ].launch();
		for ( const width of args.widths ) {
			const context = await browser.newContext( { viewport: { width, height: HEIGHT } } );
			const page = await context.newPage();
			rep.context = { engine, width };
			const firsts = [];
			for ( const kase of args.cases ) firsts.push( await checkCase( rep, page, args, kase, width ) );
			if ( args.cases.length > 1 ) {
				const known = firsts.filter( ( v ) => v !== null );
				rep.check( 'restart-per-page', { measured: firsts, expected: 'every case starts at the same delay', pass: known.length === firsts.length ? known.every( ( v ) => v === known[ 0 ] ) : null, why: known.length === firsts.length ? '' : 'a case had no items' } );
			}
			await context.close();
		}
		await browser.close();
	}
	process.exit( rep.summary() );
}

if ( import.meta.url === `file:///${ process.argv[ 1 ].replace( /\\/g, '/' ) }` || process.argv[ 1 ]?.endsWith( 'probe-motion-loop-delays.mjs' ) ) {
	main().catch( ( e ) => {
		console.error( e.message );
		process.exit( 1 );
	} );
}
