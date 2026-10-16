/**
 * Spec 38A unit M5.5: live acceptance of the horizontal-panel parameters and proximity focus
 * (FR-38A-38, FR-38A-39, FR-38A-50) on a deployed site.
 *
 * FIXTURE: tests/fixtures/motion/pages/horizontal-panel.json (an `sgs/timeline` horizontal with five panels, pin length
 * 70vh per panel plus a 40vh tail, no smoothing, proximity focus on; Tablet pin length 60vh, Mobile 50vh), built with
 * scripts/wp-build-page.js. The host is found by its marker class `.m55-hp`. With no --page the probe reports
 * UNANSWERED and exits 2.
 *
 * WHAT IT MEASURES (1440 x 900 unless noted; every scroll is forced to `scroll-behavior: auto`)
 *   hp-pin-length      the pin spans 5 x 70vh + 40vh = 390vh (the scroll range over which the host is `position: fixed`)
 *   hp-linear          the row's translate over the pin follows min(1, scrolled / (5 x 70vh)) of its full travel, within 0.01
 *   hp-focus-centre    the centred panel computes scale 1 and opacity 1 within 0.01
 *   hp-focus-edge      a panel one panel-width off centre computes scale 0.94 and opacity 0.55 within 0.01
 *   hp-progress        --sgs-fx-progress is 0 at the start of the pin and 1 at the end of its travel
 *   hp-progress-total  data-sgs-fx-progress-total reads 5
 *   hp-active          exactly one panel carries data-sgs-fx-panel-active, and it is the panel nearest the centre
 *   hp-snap-row        at 375 the host is a scroll-snap row (overflow-x auto, snap x) with no pin spacer
 *   hp-smoothing       a stored smoothing of 1.5s changes the measured scroll mapping (the FR-38A-50 negative control)
 *   hp-hold            a stored hold of 0.3 changes where the travel completes
 *   hp-per-device@768  the host's --sgs-horizontal-panel-pin-length computes the Tablet value `+=60%`
 *   hp-per-device@375  the same property computes the Mobile value `+=50%`
 *   hp-pin-length@768  at 768 x 900 the pin spans 5 x 60vh + 40vh = 340vh: the runtime reads the Tablet value
 *
 * NEGATIVE CONTROLS (each must come out red)
 *   hp-linear/control      the judge run on the smoothed page's lagging sample must reject it
 *   hp-focus-edge/control  the judge run on the centred panel's values must reject them as the edge values
 *   hp-per-device/control  the per-device judge run on the 1440 reading (the desktop `+=70%`) must reject it as Tablet
 *   hp-smoothing and hp-hold are themselves comparisons against a variant page (the response is rewritten in flight to
 *   store the parameter), so the baseline page is the control.
 *
 * Usage:
 *   node scripts/motion-qa/probe-horizontal-panel-params.mjs --page <id> [--site sandybrown]
 *   node scripts/motion-qa/probe-horizontal-panel-params.mjs --self-test   (offline: the judges)
 * Exit: 0 all pass; 1 any FAIL or any control that did not go red; 2 only UNANSWERED rows remain.
 *
 * @package SGS\Blocks
 */

import { chromium } from 'playwright';
import { launchOptions, gotoThroughCheck, parseArgs, siteBase, Reporter, near } from './probe-motion-model-lib.mjs';

const HEIGHT = 900;
const PANELS = 5;
const PER_PANEL_VH = 0.7;
const TAIL_VH = 0.4;
const TOL = 0.01;

/** The fixture's per-device pin length, as the emitter writes it (`Sgs_Motion_Effect_Properties`), and the property. */
export const PIN_PROPERTY = '--sgs-horizontal-panel-pin-length';
export const TIER_PIN = { 1440: '+=70%', 768: '+=60%', 375: '+=50%' };
const TABLET_PER_PANEL_VH = 0.6;

// ---- Pure judges ---------------------------------------------------------------------------------------------

/** The pin length the stored values give, in pixels. */
export const expectedPin = ( viewport, panels = PANELS ) => ( panels * PER_PANEL_VH + TAIL_VH ) * viewport;

/** True when a computed per-device property reads a tier's expected value (whitespace aside). */
export const judgeTier = ( measured, width ) => 'string' === typeof measured && measured.trim() === TIER_PIN[ width ];

/** The share of the pin the row travels over (the rest is the tail), for a stored hold. */
export const travelShare = ( hold = 0, panels = PANELS ) =>
	( ( panels * PER_PANEL_VH ) / ( panels * PER_PANEL_VH + TAIL_VH ) ) * ( 1 - hold );

/** The row's expected travelled fraction after scrolling a fraction of the pin. */
export const expectedTravel = ( scrolled, hold = 0 ) => Math.min( 1, scrolled / travelShare( hold ) );

/** Expected focus values at a distance from the centre in panel-widths (centre 1 and 1, edge 0.94 and 0.55). */
export const expectedFocus = ( ratio ) => {
	const t = Math.min( Math.max( ratio, 0 ), 1 );
	return { scale: 1 + ( 0.94 - 1 ) * t, opacity: 1 + ( 0.55 - 1 ) * t };
};

/** The x factor of a computed `scale` ("none", "0.94", "0.94 0.94"); `none` is a factor of 1. */
export const parseScale = ( value ) => ( ! value || 'none' === value ? 1 : parseFloat( value.split( /\s+/ )[ 0 ] ) );

/** True when the focus values match a distance within the tolerance. */
export const judgeFocus = ( measured, ratio ) => {
	const want = expectedFocus( ratio );
	return near( measured.scale, want.scale, TOL ) && near( measured.opacity, want.opacity, TOL );
};

// ---- Page helpers --------------------------------------------------------------------------------------------

/** Scroll and wait: `settle` frames for a scrubbed row at rest, none for a lagging sample one frame after the scroll. */
async function scrollTo( page, y, settle = true ) {
	await page.evaluate( ( top ) => {
		document.documentElement.style.scrollBehavior = 'auto';
		window.scrollTo( 0, top );
	}, y );
	await page.evaluate( ( n ) => new Promise( ( r ) => {
		let i = 0;
		const step = () => ( ++i >= n ? r() : requestAnimationFrame( step ) );
		requestAnimationFrame( step );
	} ), settle ? 6 : 1 );
	if ( settle ) {
		await page.waitForTimeout( 80 );
		// Lenis smooth scroll and a smoothed track keep moving after the jump: wait until the scroll position and the track's
		// transform are both unchanged between two polls and Lenis reports it has stopped.
		await page.waitForFunction( () => {
			const host = document.querySelector( '.m55-hp' );
			const marked = host && host.querySelector( ':scope > [data-sgs-fx-track]' );
			const track = marked && ( marked.querySelector( ':scope > .wp-block-sgs-container' ) || marked );
			const key = `${ window.scrollY }|${ track ? getComputedStyle( track ).transform : '' }`;
			const same = window.__hpKey === key;
			window.__hpKey = key;
			return same && ! document.documentElement.classList.contains( 'lenis-scrolling' );
		}, null, { polling: 100, timeout: 4000 } ).catch( () => null );
		await page.evaluate( () => { delete window.__hpKey; } );
	}
}

/** The live measurement of the host, its track and its panels at the current scroll. */
function measure( page ) {
	return page.evaluate( () => {
		const host = document.querySelector( '.m55-hp' );
		const marked = host && host.querySelector( ':scope > [data-sgs-fx-track]' );
		const track = marked && ( marked.querySelector( ':scope > .wp-block-sgs-container' ) || marked );
		if ( ! track ) return null;
		const panels = Array.from( track.children ).filter( ( n ) => n.nodeType === 1 && n.offsetWidth > 0 );
		const hostRect = host.getBoundingClientRect();
		const centre = hostRect.left + hostRect.width / 2;
		return {
			fixed: getComputedStyle( host ).position === 'fixed',
			translateX: new DOMMatrixReadOnly( getComputedStyle( track ).transform ).m41,
			travel: panels.length > 1 ? panels[ panels.length - 1 ].offsetLeft - panels[ 0 ].offsetLeft : 0,
			progress: parseFloat( getComputedStyle( host ).getPropertyValue( '--sgs-fx-progress' ) ),
			total: host.getAttribute( 'data-sgs-fx-progress-total' ),
			activeCount: host.querySelectorAll( '[data-sgs-fx-panel-active]' ).length,
			panels: panels.map( ( p, i ) => {
				const r = p.getBoundingClientRect();
				const cs = getComputedStyle( p );
				return {
					i, ratio: Math.abs( r.left + r.width / 2 - centre ) / p.offsetWidth,
					scale: cs.scale, opacity: parseFloat( cs.opacity ), active: p.hasAttribute( 'data-sgs-fx-panel-active' ),
				};
			} ),
		};
	} );
}

/** The scroll range over which the host is pinned (`position: fixed`), by bisection on that monotone predicate. */
async function pinRange( page ) {
	const total = await page.evaluate( () => document.documentElement.scrollHeight - innerHeight );
	const fixedAt = async ( y ) => ( await scrollTo( page, y ), ( await measure( page ) )?.fixed ?? false );
	let lo = 0;
	let hi = total;
	// First fixed position: the pin starts where the predicate flips from false to true, scanning in coarse steps.
	let first = null;
	for ( let y = 0; y <= total; y += 100 ) {
		if ( await fixedAt( y ) ) { first = y; break; }
	}
	if ( first === null ) return null;
	lo = Math.max( 0, first - 100 );
	hi = first;
	while ( hi - lo > 1 ) {
		const mid = Math.floor( ( lo + hi ) / 2 );
		if ( await fixedAt( mid ) ) hi = mid; else lo = mid;
	}
	const start = hi;
	let last = start;
	for ( let y = start; y <= total; y += 100 ) {
		if ( await fixedAt( y ) ) last = y; else break;
	}
	lo = last;
	hi = Math.min( total, last + 100 );
	while ( hi - lo > 1 ) {
		const mid = Math.floor( ( lo + hi ) / 2 );
		if ( await fixedAt( mid ) ) lo = mid; else hi = mid;
	}
	return { start, end: lo };
}

/** Open the fixture, optionally rewriting its host's stored attributes in the response. */
async function open( browser, url, width, attrs = {} ) {
	const context = await browser.newContext( { viewport: { width, height: HEIGHT } } );
	const page = await context.newPage();
	if ( Object.keys( attrs ).length ) {
		await page.route( url, async ( route ) => {
			const response = await route.fetch();
			let html = await response.text();
			html = html.replace( /<[^>]*\bdata-sgs-fx="horizontal-panel"[^>]*>/, ( tag ) => {
				let next = tag;
				for ( const [ name, value ] of Object.entries( attrs ) ) {
					const has = new RegExp( `\\s${ name }="[^"]*"` );
					next = has.test( next ) ? next.replace( has, ` ${ name }="${ value }"` ) : next.replace( /^<(\w+)/, `<$1 ${ name }="${ value }"` );
				}
				return next;
			} );
			await route.fulfill( { response, body: html } );
		} );
	}
	await gotoThroughCheck( page, url );
	await page.waitForLoadState( 'networkidle' ).catch( () => null );
	await page.waitForTimeout( 600 );
	return { context, page };
}

// ---- Live checks ---------------------------------------------------------------------------------------------

async function checkDesktop( browser, url, report ) {
	const { context, page } = await open( browser, url, 1440 );
	const range = await pinRange( page );
	if ( ! range ) {
		report.check( 'hp-pin-length', { pass: null, why: 'the host never became position: fixed: the effect did not pin (fixture missing, or not deployed)' } );
		await context.close();
		return null;
	}
	const length = range.end - range.start;
	report.check( 'hp-pin-length', { selector: '.m55-hp', property: 'pin length (px)', measured: length, expected: expectedPin( HEIGHT ), pass: near( length, expectedPin( HEIGHT ), 3 ) } );

	const full = await ( async () => { await scrollTo( page, range.start + length ); return measure( page ); } )();
	const travel = full.travel;
	const samples = [];
	for ( const f of [ 0.25, 0.5, 0.75, 0.95 ] ) {
		await scrollTo( page, Math.round( range.start + f * length ) );
		const m = await measure( page );
		const got = Math.abs( m.translateX ) / travel;
		samples.push( { f, got, want: expectedTravel( f ) } );
		report.check( `hp-linear@${ f }`, { selector: '.m55-hp', property: 'travelled fraction', measured: +got.toFixed( 4 ), expected: +expectedTravel( f ).toFixed( 4 ), pass: near( got, expectedTravel( f ), TOL ) } );
	}

	// Focus: sweep the pin; the centred panel and the sample nearest one panel-width off.
	let centred = null;
	let edge = null;
	for ( let f = 0; f <= 1.0001; f += 0.01 ) {
		await scrollTo( page, Math.round( range.start + f * length ) );
		const m = await measure( page );
		for ( const p of m.panels ) {
			if ( ! centred || p.ratio < centred.ratio ) centred = p;
			if ( ! edge || Math.abs( p.ratio - 1 ) < Math.abs( edge.ratio - 1 ) ) edge = p;
		}
	}
	report.check( 'hp-focus-centre', { selector: '.m55-hp panel', property: 'scale, opacity', measured: [ parseScale( centred.scale ), centred.opacity ], expected: [ 1, 1 ], pass: judgeFocus( { scale: parseScale( centred.scale ), opacity: centred.opacity }, 0 ) && centred.ratio < 0.05 } );
	const edgeVals = { scale: parseScale( edge.scale ), opacity: edge.opacity };
	report.check( 'hp-focus-edge', { selector: '.m55-hp panel', property: 'scale, opacity', measured: [ edgeVals.scale, edgeVals.opacity, +edge.ratio.toFixed( 3 ) ], expected: [ 0.94, 0.55 ], pass: Math.abs( edge.ratio - 1 ) < 0.05 && judgeFocus( edgeVals, 1 ) } );
	report.control( 'hp-focus-edge', { measured: [ parseScale( centred.scale ), centred.opacity ], expected: [ 0.94, 0.55 ], red: ! judgeFocus( { scale: parseScale( centred.scale ), opacity: centred.opacity }, 1 ) } );

	await scrollTo( page, range.start );
	const atStart = await measure( page );
	await scrollTo( page, Math.round( range.start + travelShare() * length ) + 4 );
	const atEnd = await measure( page );
	report.check( 'hp-progress', { selector: '.m55-hp', property: '--sgs-fx-progress', measured: [ atStart.progress, atEnd.progress ], expected: [ 0, 1 ], pass: near( atStart.progress, 0, TOL ) && near( atEnd.progress, 1, TOL ) } );
	report.check( 'hp-progress-total', { selector: '.m55-hp', property: 'data-sgs-fx-progress-total', measured: atEnd.total, expected: String( PANELS ), pass: atEnd.total === String( PANELS ) } );
	const nearest = atEnd.panels.reduce( ( a, b ) => ( b.ratio < a.ratio ? b : a ) );
	report.check( 'hp-active', { selector: '.m55-hp panel', property: 'data-sgs-fx-panel-active', measured: [ atEnd.activeCount, nearest.active ], expected: [ 1, true ], pass: atEnd.activeCount === 1 && nearest.active } );
	await context.close();
	return { range, samples, travel };
}

async function checkSnapRow( browser, url, report ) {
	const { context, page } = await open( browser, url, 375 );
	const row = await page.evaluate( () => {
		const host = document.querySelector( '.m55-hp' );
		const cs = host && getComputedStyle( host );
		return host && { overflowX: cs.overflowX, snap: cs.scrollSnapType, pinned: !! host.closest( '.pin-spacer' ) };
	} );
	report.check( 'hp-snap-row', { selector: '.m55-hp @375', property: 'overflow-x, scroll-snap-type, pin-spacer', measured: row, expected: { overflowX: 'auto', snap: 'x mandatory', pinned: false },
		pass: !! row && row.overflowX === 'auto' && /^x\b/.test( row.snap ) && ! row.pinned } );
	await context.close();
}

/** The per-device pin length read back at 768 and 375, the measured Tablet pin, and the desktop reading as control. */
async function checkPerDevice( browser, url, report ) {
	const readings = {};
	for ( const width of [ 1440, 768, 375 ] ) {
		const { context, page } = await open( browser, url, width );
		readings[ width ] = await page.evaluate( ( name ) => {
			const host = document.querySelector( '.m55-hp' );
			return host ? getComputedStyle( host ).getPropertyValue( name ) : null;
		}, PIN_PROPERTY );
		if ( 768 === width ) {
			const range = await pinRange( page );
			const want = ( PANELS * TABLET_PER_PANEL_VH + TAIL_VH ) * HEIGHT;
			report.check( 'hp-pin-length@768', range
				? { selector: '.m55-hp @768', property: 'pin length (px)', measured: range.end - range.start, expected: want, pass: near( range.end - range.start, want, 3 ) }
				: { pass: null, why: 'the host never became position: fixed at 768' } );
		}
		await context.close();
	}
	for ( const width of [ 768, 375 ] ) {
		const measured = readings[ width ];
		report.check( `hp-per-device@${ width }`, null === measured
			? { pass: null, why: `no .m55-hp host at ${ width }` }
			: { selector: `.m55-hp @${ width }`, property: PIN_PROPERTY, measured: measured.trim(), expected: TIER_PIN[ width ], pass: judgeTier( measured, width ) } );
	}
	report.control( 'hp-per-device', { measured: readings[ 1440 ]?.trim() ?? null, expected: TIER_PIN[ 768 ], red: ! judgeTier( readings[ 1440 ], 768 ) } );
}

/** The scrolled fraction at which a variant's row has travelled `target` of its distance, one frame after an instant scroll. */
async function lagAt( browser, url, attrs, fraction, settle ) {
	const { context, page } = await open( browser, url, 1440, attrs );
	const range = await pinRange( page );
	if ( ! range ) { await context.close(); return null; }
	await scrollTo( page, range.start );
	await scrollTo( page, Math.round( range.start + fraction * ( range.end - range.start ) ), settle );
	const m = await measure( page );
	await context.close();
	return Math.abs( m.translateX ) / m.travel;
}

async function checkVariants( browser, url, report ) {
	const base = await lagAt( browser, url, {}, 0.5, false );
	const smoothed = await lagAt( browser, url, { 'data-sgs-fx-scrub': '1.5' }, 0.5, false );
	if ( base === null || smoothed === null ) {
		report.check( 'hp-smoothing', { pass: null, why: 'a variant page did not pin' } );
		return;
	}
	report.check( 'hp-smoothing', { selector: '.m55-hp', property: 'travelled fraction one frame after a jump to 50%', measured: { stored0: +base.toFixed( 3 ), stored1_5: +smoothed.toFixed( 3 ) }, expected: 'the two differ by more than 0.1', pass: Math.abs( base - smoothed ) > 0.1 } );
	report.control( 'hp-linear', { measured: smoothed, expected: expectedTravel( 0.5 ), red: ! near( smoothed, expectedTravel( 0.5 ), TOL ) } );

	const held = await lagAt( browser, url, { 'data-sgs-fx-hold': '0.3' }, 0.7, true );
	const plain = await lagAt( browser, url, {}, 0.7, true );
	report.check( 'hp-hold', { selector: '.m55-hp', property: 'travelled fraction at 70% of the pin', measured: { hold0: plain && +plain.toFixed( 3 ), hold0_3: held && +held.toFixed( 3 ) },
		expected: { hold0: +expectedTravel( 0.7 ).toFixed( 3 ), hold0_3: +expectedTravel( 0.7, 0.3 ).toFixed( 3 ) },
		pass: plain !== null && held !== null && near( plain, expectedTravel( 0.7 ), TOL ) && near( held, expectedTravel( 0.7, 0.3 ), TOL ) } );
}

// ---- Self-test and main --------------------------------------------------------------------------------------

function selfTest() {
	const failures = [];
	const expect = ( name, ok ) => { if ( ! ok ) failures.push( name ); console.log( `${ ok ? 'ok  ' : 'FAIL' } ${ name }` ); };
	expect( 'pin is 390vh', near( expectedPin( 900 ), 3510, 0.001 ) );
	expect( 'travel completes at share', near( expectedTravel( travelShare() ), 1, 1e-9 ) && near( expectedTravel( travelShare() / 2 ), 0.5, 1e-9 ) );
	expect( 'hold moves the completion earlier', expectedTravel( 0.7, 0.3 ) > expectedTravel( 0.7, 0 ) );
	expect( 'centre focus accepts 1 and 1', judgeFocus( { scale: 1, opacity: 1 }, 0 ) );
	expect( 'edge focus accepts 0.94 and 0.55', judgeFocus( { scale: 0.94, opacity: 0.55 }, 1 ) );
	expect( 'edge judge rejects the centre values (control)', ! judgeFocus( { scale: 1, opacity: 1 }, 1 ) );
	expect( 'a lagging sample fails the linear judge (control)', ! near( 0.2, expectedTravel( 0.5 ), TOL ) );
	expect( 'parseScale reads none and a pair', parseScale( 'none' ) === 1 && parseScale( '0.94 0.94' ) === 0.94 );
	expect( 'tier judge accepts the Tablet and Mobile values', judgeTier( ' +=60%', 768 ) && judgeTier( '+=50%', 375 ) );
	expect( 'tier judge rejects the desktop value as Tablet (control)', ! judgeTier( TIER_PIN[ 1440 ], 768 ) );
	expect( 'tier judge rejects an unset property (control)', ! judgeTier( '', 375 ) && ! judgeTier( null, 768 ) );
	return failures.length ? 1 : 0;
}

async function main() {
	const args = parseArgs( process.argv );
	if ( args.selfTest ) process.exit( selfTest() );
	const report = new Reporter( { probe: 'horizontal-panel-params', site: args.site } );
	if ( ! args.pages.length ) {
		report.check( 'hp-pin-length', { pass: null, why: 'no --page: build tests/fixtures/motion/pages/horizontal-panel.json with scripts/wp-build-page.js and pass its id' } );
		process.exit( report.summary() );
	}
	const url = `${ siteBase( args.site ) }/?page_id=${ args.pages[ 0 ] }`;
	const browser = await chromium.launch( launchOptions() );
	try {
		const desktop = await checkDesktop( browser, url, report );
		await checkSnapRow( browser, url, report );
		await checkPerDevice( browser, url, report );
		if ( desktop ) await checkVariants( browser, url, report );
	} finally {
		await browser.close();
	}
	process.exit( report.summary() );
}

if ( import.meta.url === `file://${ process.argv[ 1 ].replace( /\\/g, '/' ) }` || process.argv[ 1 ]?.endsWith( 'probe-horizontal-panel-params.mjs' ) ) {
	main();
}
