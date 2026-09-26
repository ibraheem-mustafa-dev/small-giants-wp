/**
 * U-16 live probe: entrances as their own layer, on /qa-entrance/ (fixture case `entrance`).
 *
 * Usage: node scripts/nav-qa/u16-entrance-probe.mjs <page-url> [--out dir]
 *
 * At 375, 768 and 1440 (headless):
 *   header    opacity sampled every 50ms from the first paint rises over at least 500ms through at least three
 *             in-between values (an extra-slow fade, not a snap), never reads 1 after the first paint and before
 *             the rise (no flash), and leaves no script animation behind;
 *   shrink    the header's padding-top is smaller at 250px of scroll than at the top;
 *   hide      from the top, scrolling down slides the header away through in-between positions; after 600px of
 *             scroll, scrolling back up slides it back and it pins at the top of the viewport;
 *   card      after its entrance, a real pointer hover moves the card to its own hover transform (the info-box
 *             hover scale) and reaches it within 450ms (its own 300ms transition, not the 800ms entrance, not never);
 *   footer    rows one and two travel 50px to 0 and start about 100ms apart; row three (footer stagger on) has no
 *             entrance of its own and the card inside it keeps one;
 *   dropdown  (1440) a dropdown opened mid-entrance sits where the same dropdown sits when opened afterwards (2px).
 * Then: reduced motion shows the header at once with no in-between values; JavaScript off and a blocked observer
 * both show the header, the card and the footer rows at opacity 1.
 * Exit code 1 on any failed assertion; JSON results in --out (default the OS temp directory).
 */
import { chromium } from 'playwright';
import { mkdirSync, writeFileSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';

const url    = process.argv[ 2 ];
const outDir = process.argv.includes( '--out' ) ? process.argv[ process.argv.indexOf( '--out' ) + 1 ] : join( tmpdir(), 'u16-entrance-probe' );
if ( ! url ) {
	console.error( 'usage: u16-entrance-probe.mjs <page-url> [--out dir]' );
	process.exit( 2 );
}
mkdirSync( outDir, { recursive: true } );
const fresh = () => url + ( url.includes( '?' ) ? '&' : '?' ) + 'nocache=' + Date.now();

const HEADER = 'header.sgs-site-header';
const CARD   = '.sgs-info-box';
const ROWS   = 'main .sgs-site-footer-row';

// Runs before any page script: samples the header's opacity every 50ms and records the first paint.
const SAMPLER = `
	window.__u16 = { paint: null, samples: [] };
	new PerformanceObserver( ( l ) => { for ( const e of l.getEntries() ) { if ( ! window.__u16.paint ) { window.__u16.paint = e.startTime; } } } ).observe( { type: 'paint', buffered: true } );
	setInterval( () => {
		const h = document.querySelector( '${ HEADER }' );
		if ( h ) { window.__u16.samples.push( [ performance.now(), +getComputedStyle( h ).opacity ] ); }
	}, 50 );
`;

const failures = [];
const results  = {};
const check    = ( ok, label, detail ) => {
	if ( ! ok ) {
		failures.push( `${ label }: ${ JSON.stringify( detail ) }` );
	}
	return ok;
};
const browser = await chromium.launch( { headless: true } );

async function openPage( width, options = {} ) {
	const context = await browser.newContext( { viewport: { width, height: 900 }, ...options } );
	await context.addInitScript( SAMPLER );
	const page = await context.newPage();
	return { context, page };
}

async function count( page, sel, label ) {
	const n = await page.locator( sel ).count();
	check( n > 0, `${ label }: selector matched 0 elements`, sel );
	return n;
}

// Samples fn() in the page every `step` ms for `ms` ms.
async function sample( page, fn, arg, ms, step = 30 ) {
	return page.evaluate( async ( [ src, a, total, every ] ) => {
		const f   = new Function( 'a', src );
		const out = [];
		const t0  = performance.now();
		while ( performance.now() - t0 < total ) {
			out.push( [ Math.round( performance.now() - t0 ), f( a ) ] );
			await new Promise( ( r ) => setTimeout( r, every ) );
		}
		return out;
	}, [ fn, arg, ms, step ] );
}

const MATRIX   = 'const t = getComputedStyle( document.querySelector( a ) ).transform; if ( "none" === t ) { return t; } return new DOMMatrix( t ).toFloat64Array().map( ( v ) => Math.round( v * 100 ) / 100 ).join( "," );';
const HDR_TOP  = 'return Math.round( document.querySelector( a ).getBoundingClientRect().top );';

for ( const width of [ 375, 768, 1440 ] ) {
	const r = ( results[ width ] = {} );
	const { context, page } = await openPage( width );
	await page.goto( fresh(), { waitUntil: 'load' } );
	await count( page, HEADER, `${ width } header` );
	await count( page, CARD, `${ width } card` );
	await page.waitForTimeout( 2200 );

	// Header entrance.
	const u16      = await page.evaluate( () => window.__u16 );
	const after    = u16.samples.filter( ( [ t ] ) => null !== u16.paint && t >= u16.paint );
	const between  = after.filter( ( [ , o ] ) => o > 0.02 && o < 0.98 );
	const firstLow = after.findIndex( ( [ , o ] ) => o < 0.98 );
	const flash    = firstLow > 0 && after.slice( 0, firstLow ).some( ( [ , o ] ) => o >= 0.98 );
	// The rise, bracketed: from the last sample still at 0 to the first sample at 1.
	const lastZero = after.map( ( [ , o ] ) => o <= 0.02 ).lastIndexOf( true );
	const firstOne = after.findIndex( ( [ , o ], i ) => i > lastZero && o >= 0.98 );
	const rise     = lastZero >= 0 && firstOne > lastZero ? after[ firstOne ][ 0 ] - after[ lastZero ][ 0 ] : 0;
	r.header = { paint: u16.paint, samplesAfterPaint: after.length, between: between.length, riseMs: Math.round( rise ), flash, trace: after.slice( 0, 30 ).map( ( [ t, o ] ) => [ Math.round( t ), Math.round( o * 100 ) / 100 ] ) };
	check( between.length >= 3 && rise >= 650, `${ width } header entrance is a slow fade`, { ...r.header, trace: undefined } );
	check( ! flash, `${ width } header painted visible before its entrance`, { ...r.header, trace: undefined } );
	r.header.leftover = await page.evaluate( ( s ) => document.querySelector( s ).getAnimations().filter( ( a ) => ! ( a instanceof CSSAnimation ) && ! ( a instanceof CSSTransition ) ).length, HEADER );
	check( 0 === r.header.leftover, `${ width } header entrance left an animation behind`, r.header.leftover );

	// A dropdown opened mid-entrance lands where it sits when opened afterwards.
	if ( 1440 === width ) {
		const PARENT = '.sgs-nav-bar-menu__item--has-submenu';
		const PANEL  = '.sgs-nav-bar-menu__submenu-wrap';
		const openAt = async ( p, waitBefore, waitAfter ) => {
			await p.waitForTimeout( waitBefore );
			const b = await p.locator( PARENT ).first().boundingBox();
			await p.mouse.move( b.x + b.width / 2, b.y + b.height / 2, { steps: 3 } );
			await p.waitForTimeout( waitAfter );
			return p.evaluate( ( s ) => {
				const r = document.querySelector( s ).getBoundingClientRect();
				return [ Math.round( r.left ), Math.round( r.top ), Math.round( r.width ), Math.round( r.height ) ];
			}, PANEL );
		};
		if ( await count( page, PARENT, '1440 dropdown parent' ) && await count( page, PANEL, '1440 dropdown panel' ) ) {
			const settled = await openAt( page, 0, 700 );
			await page.mouse.move( 5, 800 );
			await page.waitForTimeout( 500 );
			const second = await openPage( width );
			await second.page.goto( fresh(), { waitUntil: 'load' } );
			const mid = await openAt( second.page, 150, 1600 );
			await second.context.close();
			r.dropdown = { settled, openedMidEntrance: mid };
			check( settled[ 3 ] > 0 && settled.every( ( v, i ) => Math.abs( v - mid[ i ] ) <= 2 ), '1440 dropdown opened mid-entrance lands in place', r.dropdown );
		}
	}

	// Card: its own hover transform, at its own speed, after the entrance.
	await page.mouse.move( 5, 800 );
	await page.waitForTimeout( 400 );
	const box = await page.locator( CARD ).first().boundingBox();
	await page.mouse.move( box.x + box.width / 2, box.y + box.height / 2, { steps: 4 } );
	const hover   = await sample( page, MATRIX, CARD, 1000 );
	const final   = hover[ hover.length - 1 ][ 1 ];
	const reached = hover.find( ( [ , m ] ) => m === final );
	r.card = { rest: hover[ 0 ][ 1 ], final, reachedMs: reached[ 0 ] };
	check( 'none' !== final && reached[ 0 ] <= 450, `${ width } card hover runs at its own speed`, r.card );
	await page.mouse.move( 5, 800 );

	// From the top: the header shrinks and slides away scrolling down; after 600px it slides back and pins.
	await page.evaluate( () => window.scrollTo( 0, 0 ) );
	await page.waitForTimeout( 600 );
	const pad0 = await page.evaluate( ( s ) => parseFloat( getComputedStyle( document.querySelector( s ) ).paddingTop ), HEADER );
	await page.mouse.wheel( 0, 250 );
	const away = await sample( page, HDR_TOP, HEADER, 700 );
	const pad250 = await page.evaluate( ( s ) => parseFloat( getComputedStyle( document.querySelector( s ) ).paddingTop ), HEADER );
	r.shrink = { pad0, pad250 };
	check( pad250 < pad0, `${ width } header shrinks on scroll`, r.shrink );
	await page.mouse.wheel( 0, 350 );
	await page.waitForTimeout( 500 );
	await page.mouse.wheel( 0, -150 );
	const back = await sample( page, HDR_TOP, HEADER, 700 );
	const scrollY = await page.evaluate( () => window.scrollY );
	const steps = ( s ) => new Set( s.map( ( [ , v ] ) => v ) ).size;
	r.hide = { awayMin: Math.min( ...away.map( ( [ , v ] ) => v ) ), awaySteps: steps( away ), backFinal: back[ back.length - 1 ][ 1 ], backSteps: steps( back ), scrollY };
	check( r.hide.awayMin < -20 && r.hide.awaySteps >= 3, `${ width } hide-on-scroll slides away`, r.hide );
	check( Math.abs( r.hide.backFinal ) <= 2 && r.hide.backSteps >= 3 && scrollY > 300, `${ width } header slides back and pins`, r.hide );

	// Footer rows: 50px travel, 100ms apart; the staggered row gives way, its card keeps its entrance.
	const rows = await page.evaluate( ( s ) => [ ...document.querySelectorAll( s ) ].map( ( el ) => ( {
		entrance: el.getAttribute( 'data-sgs-animation' ),
		distance: el.getAttribute( 'data-sgs-animation-distance' ),
		childDistance: el.querySelector( '[data-sgs-animation]' )?.getAttribute( 'data-sgs-animation-distance' ) ?? null,
	} ) ), ROWS );
	r.rows = rows;
	check( 3 === rows.length, `${ width } footer rows found`, rows.length );
	check( 'fade-up' === rows[ 0 ]?.entrance && '50' === rows[ 0 ]?.distance, `${ width } row one carries fade-up 50`, rows[ 0 ] );
	check( null === rows[ 2 ]?.entrance && '50' === rows[ 2 ]?.childDistance, `${ width } staggered row gives way, its card keeps its entrance`, rows[ 2 ] );
	// Step scroll (the page runs Lenis, which swallows scrollIntoView): first to 150px above the rows' near
	// margin edge, where they already hold their paused start pose, then to the bottom.
	await page.evaluate( ( s ) => window.scrollTo( 0, document.querySelector( s ).getBoundingClientRect().top + window.scrollY - window.innerHeight - 150 ), ROWS );
	await page.waitForTimeout( 400 );
	const travel = await page.evaluate( async ( s ) => {
		const els = [ ...document.querySelectorAll( s ) ].slice( 0, 2 );
		window.scrollTo( 0, document.documentElement.scrollHeight );
		const out = els.map( () => ( { start: null, maxY: 0, finalY: null } ) );
		const t0  = performance.now();
		while ( performance.now() - t0 < 1400 ) {
			els.forEach( ( el, i ) => {
				const cs = getComputedStyle( el );
				const y  = cs.translate && 'none' !== cs.translate ? parseFloat( cs.translate.split( ' ' )[ 1 ] || 0 ) : 0;
				out[ i ].maxY = Math.max( out[ i ].maxY, y );
				if ( null === out[ i ].start && +cs.opacity > 0.05 ) {
					out[ i ].start = Math.round( performance.now() - t0 );
				}
				out[ i ].finalY = y;
			} );
			await new Promise( ( r ) => setTimeout( r, 20 ) );
		}
		return out;
	}, ROWS );
	r.travel = travel;
	check( travel.every( ( t ) => Math.abs( t.maxY - 50 ) <= 2 && Math.abs( t.finalY ) <= 0.5 ), `${ width } footer rows travel 50px to 0`, travel );
	const gap = null !== travel[ 0 ].start && null !== travel[ 1 ].start ? travel[ 1 ].start - travel[ 0 ].start : null;
	check( null !== gap && gap >= 60 && gap <= 180, `${ width } footer rows start about 100ms apart`, gap );
	await context.close();
}

// Reduced motion (the slow fade above is the positive control), JavaScript off, observer blocked.
const still = async ( label, options, route ) => {
	const { context, page } = await openPage( 1440, options );
	if ( route ) {
		await page.route( /animation-observer\.js/, ( rt ) => rt.abort() );
	}
	await page.goto( fresh(), { waitUntil: 'load' } );
	await page.waitForTimeout( 1200 );
	const state = await page.evaluate( ( [ h, c, rw ] ) => ( {
		header: +getComputedStyle( document.querySelector( h ) ).opacity,
		card: +getComputedStyle( document.querySelector( c ) ).opacity,
		rows: [ ...document.querySelectorAll( rw ) ].filter( ( el ) => ! el.hasAttribute( 'data-sgs-fx' ) ).map( ( el ) => +getComputedStyle( el ).opacity ),
		samples: ( window.__u16?.samples || [] ).filter( ( [ , o ] ) => o > 0.02 && o < 0.98 ).length,
	} ), [ HEADER, CARD, ROWS ] );
	results[ label ] = state;
	check( 1 === state.header && 1 === state.card && state.rows.every( ( o ) => 1 === o ), `${ label } shows everything`, state );
	check( 0 === state.samples, `${ label } has no in-between opacity`, state.samples );
	await context.close();
};
await still( 'reduced-motion', { reducedMotion: 'reduce' } );
await still( 'no-js', { javaScriptEnabled: false } );
await still( 'observer-blocked', {}, true );

await browser.close();
writeFileSync( join( outDir, 'results.json' ), JSON.stringify( { url, results, failures }, null, 2 ) );
console.log( JSON.stringify( results, null, 1 ) );
console.log( failures.length ? `FAIL (${ failures.length })\n- ` + failures.join( '\n- ' ) : 'PASS' );
process.exit( failures.length ? 1 : 0 );
