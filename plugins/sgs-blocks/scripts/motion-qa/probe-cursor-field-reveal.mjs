/**
 * Spec 38A unit M5.11: live acceptance of the cursor-field `image-reveal` type (FR-38A-34, FR-38A-47, FR-38A-49).
 *
 * Run through `probe-cursor-field.mjs --local` (the offline harness) or `--page <id>` (a page built from
 * tests/fixtures/motion/pages/cursor-field.json).
 *
 * WHAT IT MEASURES, each at three pointer positions over the card, each from computed styles sampled every frame:
 *   reveal-radius        the `::before` radius is 0px at rest and reaches 90px on hover, rising through at least three
 *                        values in between, in 0.4s (the transition duration reads 0.4s). The clip circle is centred on
 *                        the pointer (computed `clip-path`). Control: the same page with the `@property` registration for
 *                        `--sgs-cursor-field-radius` removed jumps from 0 to 90 with nothing in between.
 *   reveal-wash          the wash opacity reads 0.5 at rest and 0.3 on hover, easing between them.
 *   ring                 the ring layer is aria-hidden, a 180px circle, scales 0 to 1 on hover, and follows the pointer
 *                        with a 0.4s lag (a jump of the pointer moves the ring through intermediate positions and it
 *                        arrives in 250 to 520ms). Control: a series that jumps in one frame fails the lag judge.
 *   reduced-motion       under reduced motion the radius transition is 0s, the ring is not displayed and no ring position is
 *                        written. Control: the same card under no preference has a 0.4s transition.
 *   ripple-with-reveal   a pointer press on the card, which carries both effects, sets the ripple's play state and its
 *                        `::after` runs the ripple animation. Control: the card with the cursor field alone never plays one.
 *
 * Usage:
 *   node scripts/motion-qa/probe-cursor-field.mjs --local [--engine chromium|firefox|webkit ...] [--width 1440|768|375]
 *   node scripts/motion-qa/probe-cursor-field.mjs --page <id> [--site sandybrown] [--engine ...]
 *   node scripts/motion-qa/probe-cursor-field-reveal.mjs --self-test      (the judges and their controls, no browser)
 * Output: one JSON row per check, then a summary row. Exit: 0 all pass; 1 any FAIL or any control that did not go red;
 * 2 only UNANSWERED rows remain.
 *
 * @package SGS\Blocks
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium, firefox, webkit } from 'playwright';
import { gotoThroughCheck, settleInView, parseArgs, siteBase, Reporter } from './probe-motion-model-lib.mjs';

const BROWSERS = { chromium, firefox, webkit };
const PLUGIN = path.resolve( path.dirname( fileURLToPath( import.meta.url ) ), '../..' );
const REVEAL = '.m511-reveal';
const PLAIN = '.m511-plain';
const RING_SIZE = 180;
const POSITIONS = [ [ 0.25, 0.3 ], [ 0.5, 0.5 ], [ 0.75, 0.7 ] ];
const HEIGHT = 900;

// ---- Pure judges (the live checks and --self-test both run them) ------------------------------------------------

/** The distinct values a series passes through strictly between its first and last. */
export const between = ( values, lo, hi, tol = 0.01 ) => [ ...new Set( values.map( ( v ) => Math.round( v * 100 ) ) ) ].filter( ( v ) => v > ( lo + tol ) * 100 && v < ( hi - tol ) * 100 );

/** A series that eases from `from` to `to` through at least three intermediate values, never reversing. */
export function animates( values, from, to ) {
	const rising = to > from;
	const ordered = values.every( ( v, i ) => i === 0 || ( rising ? v >= values[ i - 1 ] - 0.01 : v <= values[ i - 1 ] + 0.01 ) );
	const lo = Math.min( from, to );
	const hi = Math.max( from, to );
	return Math.abs( values[ 0 ] - from ) < 0.01 && Math.abs( values[ values.length - 1 ] - to ) < 0.01 && ordered && between( values, lo, hi, ( hi - lo ) * 0.01 ).length >= 3;
}

/** Milliseconds from the first change to arriving within `tol` of the final value; null when it never changed or arrived. */
export function settleMs( series, key, tol = 1 ) {
	const first = series.findIndex( ( s ) => Math.abs( s[ key ] - series[ 0 ][ key ] ) > tol );
	const final = series[ series.length - 1 ][ key ];
	const done = series.findIndex( ( s, i ) => i >= first && first >= 0 && Math.abs( s[ key ] - final ) <= tol );
	return first < 0 || done < 0 ? null : series[ done ].t - series[ first ].t;
}

/** A follower with a lag: it changed through intermediate positions and arrived within the window. */
export function lagged( series, key, lo = 250, hi = 520 ) {
	const ms = settleMs( series, key );
	const first = series[ 0 ][ key ];
	const last = series[ series.length - 1 ][ key ];
	return null !== ms && ms >= lo && ms <= hi && between( series.map( ( s ) => s[ key ] ), Math.min( first, last ), Math.max( first, last ), Math.abs( last - first ) * 0.01 ).length >= 3;
}

/** `circle(90px at 120px 60px)` as numbers. */
export function parseCircle( value ) {
	const m = /circle\(\s*([\d.]+)px at ([\d.-]+)px ([\d.-]+)px\s*\)/.exec( value || '' );
	return m ? { r: parseFloat( m[ 1 ] ), x: parseFloat( m[ 2 ] ), y: parseFloat( m[ 3 ] ) } : null;
}

/** The stylesheet with the radius registration removed (the negative control). */
export const stripRadiusProperty = ( css ) => css.replace( /@property\s+--sgs-cursor-field-radius\s*\{[^}]*\}/, '' );

function selfTest() {
	const failures = [];
	const want = ( ok, msg ) => ok || failures.push( msg );
	const ramp = ( from, to, n ) => Array.from( { length: n }, ( _, i ) => ( { t: i * 16, v: from + ( ( to - from ) * ( 1 - Math.pow( 1 - i / ( n - 1 ), 3 ) ) ) } ) );
	const eased = ramp( 0, 90, 26 );
	want( animates( eased.map( ( s ) => s.v ), 0, 90 ), 'an eased radius counts as animating' );
	want( ! animates( [ 0, 0, 0, 90, 90, 90 ], 0, 90 ), 'a radius that jumps is rejected' );
	want( ! animates( [ 0, 20, 60, 40, 90 ], 0, 90 ), 'a radius that reverses is rejected' );
	want( lagged( ramp( 100, 250, 26 ).map( ( s ) => ( { t: s.t, x: s.v } ) ), 'x' ), 'a 0.4s follower is lagged' );
	want( ! lagged( [ { t: 0, x: 100 }, { t: 16, x: 250 }, { t: 32, x: 250 } ], 'x' ), 'a one-frame jump is not a lag' );
	want( ! lagged( ramp( 100, 250, 90 ).map( ( s ) => ( { t: s.t * 3, x: s.v } ) ), 'x' ), 'a 1.2s follower is too slow' );
	want( parseCircle( 'circle(90px at 120px 60px)' ).x === 120, 'circle parse reads the centre' );
	want( parseCircle( 'none' ) === null, 'no circle parses to null' );
	want( ! /@property\s+--sgs-cursor-field-radius/.test( stripRadiusProperty( '@property --sgs-cursor-field-radius { syntax: "<length>"; }\n.a{}' ) ), 'the strip removes the registration' );
	console.log( JSON.stringify( { selfTest: true, failures } ) );
	return failures.length ? 1 : 0;
}

// ---- The offline harness ------------------------------------------------------------------------------------------

const HARNESS_ORIGIN = 'http://sgs.test';
const IMAGE = "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='400' height='240'%3E%3Cdefs%3E%3ClinearGradient id='g'%3E%3Cstop offset='0' stop-color='%23c2410c'/%3E%3Cstop offset='1' stop-color='%231d4ed8'/%3E%3C/linearGradient%3E%3C/defs%3E%3Crect width='400' height='240' fill='url(%23g)'/%3E%3C/svg%3E\")";
const HARNESS = `<!doctype html><html><head><meta charset="utf-8"><title>cursor field reveal harness</title>
<link rel="stylesheet" href="/assets/css/motion.css"><link rel="stylesheet" href="/assets/css/fx-cursor-field.css"><link rel="stylesheet" href="/assets/css/fx-ripple.css">
<style>
body { margin: 0; padding: 120px 160px; font: 16px sans-serif; }
.card { position: relative; width: 420px; height: 240px; margin: 0 0 80px; background: #ddd; }
.m511-reveal, .m511-plain { --sgs-cursor-field-image: ${ IMAGE }; --sgs-ring-size: ${ RING_SIZE }px; }
</style></head><body>
<div class="card m511-reveal" data-sgs-fx="cursor-field ripple" data-sgs-mc="::before ::after injected" data-sgs-cursor-field="image-reveal">
<span class="sgs-motion-layer" data-sgs-layer="cursor-field-ring" aria-hidden="true"></span><p>Ingredient card</p></div>
<div class="card m511-plain" data-sgs-fx="cursor-field" data-sgs-mc="::before" data-sgs-cursor-field="image-reveal"><p>Cursor field only</p></div>
<script type="module" src="/src/shared/effects/fx-cursor-field.js"></script>
<script type="module" src="/src/shared/effects/fx-ripple.js"></script>
</body></html>`;

/** Route the harness origin (or a live site's stylesheet, when `strip` is set) to the repository's real files. */
async function openPage( context, { local, url, strip } ) {
	if ( local ) {
		await context.route( `${ HARNESS_ORIGIN }/**`, ( route ) => {
			const rel = new URL( route.request().url() ).pathname;
			if ( rel === '/' || rel === '/harness.html' ) return route.fulfill( { status: 200, contentType: 'text/html', body: HARNESS } );
			const file = path.join( PLUGIN, path.extname( rel ) ? rel : `${ rel }.js` );
			if ( ! file.startsWith( PLUGIN ) || ! fs.existsSync( file ) ) return route.fulfill( { status: 404, body: 'not found' } );
			if ( file.endsWith( '.css' ) ) {
				const css = fs.readFileSync( file, 'utf8' );
				return route.fulfill( { status: 200, contentType: 'text/css', body: strip ? stripRadiusProperty( css ) : css } );
			}
			return route.fulfill( { status: 200, contentType: 'text/javascript', body: fs.readFileSync( file ) } );
		} );
	} else if ( strip ) {
		await context.route( /fx-cursor-field\.css/, async ( route ) => {
			const response = await route.fetch();
			return route.fulfill( { response, body: stripRadiusProperty( await response.text() ) } );
		} );
	}
	const page = await context.newPage();
	if ( process.env.SGS_PROBE_DEBUG ) {
		page.on( 'console', ( m ) => console.error( 'console:', m.text() ) );
		page.on( 'pageerror', ( e ) => console.error( 'pageerror:', e.message ) );
	}
	if ( local ) await page.goto( `${ HARNESS_ORIGIN }/harness.html`, { waitUntil: 'load' } );
	else await gotoThroughCheck( page, url );
	await page.waitForTimeout( 400 );
	return page;
}

// ---- In-page readers ----------------------------------------------------------------------------------------------

/** Sample the card's `::before` radius and wash and the ring's centre and scale every frame for `ms`. */
export const sampleSeries = ( { sel, ms, ring } ) => new Promise( ( resolve ) => {
	const el = document.querySelector( sel );
	const layer = el.querySelector( '.sgs-motion-layer[data-sgs-layer="cursor-field-ring"]' );
	const out = [];
	const t0 = performance.now();
	const frame = () => {
		const cs = getComputedStyle( el, '::before' );
		const row = { t: performance.now() - t0, r: parseFloat( cs.getPropertyValue( '--sgs-cursor-field-radius' ) ), w: parseFloat( cs.getPropertyValue( '--sgs-cursor-field-wash' ) ), clip: cs.clipPath };
		if ( ring && layer ) {
			const rcs = getComputedStyle( layer, '::before' );
			const tr = rcs.translate === 'none' ? [ 0, 0 ] : rcs.translate.split( /\s+/ ).map( parseFloat );
			row.x = tr[ 0 ];
			row.y = tr[ 1 ];
			row.s = rcs.scale === 'none' ? 1 : parseFloat( rcs.scale );
		}
		out.push( row );
		if ( performance.now() - t0 < ms ) requestAnimationFrame( frame );
		else resolve( out );
	};
	frame();
} );

/** The static facts of the card and its ring layer. */
export const readFacts = ( sel ) => {
	const el = document.querySelector( sel );
	const layer = el.querySelector( '.sgs-motion-layer[data-sgs-layer="cursor-field-ring"]' );
	const bcs = getComputedStyle( el, '::before' );
	const lcs = layer ? getComputedStyle( layer ) : null;
	const rcs = layer ? getComputedStyle( layer, '::before' ) : null;
	const box = el.getBoundingClientRect();
	return {
		box: { x: box.x, y: box.y },
		transitionDuration: bcs.transitionDuration,
		clip: bcs.clipPath,
		ringStyle: layer ? layer.getAttribute( 'style' ) : null,
		ring: layer ? { ariaHidden: layer.getAttribute( 'aria-hidden' ), display: lcs.display, width: rcs.width, height: rcs.height, radius: rcs.borderTopLeftRadius, border: rcs.borderTopWidth } : null,
		ripple: { play: el.getAttribute( 'data-sgs-ripple' ), animation: getComputedStyle( el, '::after' ).animationName },
	};
};

/** Park the pointer outside the card and let every transition finish. */
const park = async ( page ) => {
	await page.mouse.move( 2, 2 );
	await page.waitForTimeout( 900 );
};

/** Sample while the pointer moves to a point of the card; returns the samples and the point's element-local coordinates. */
async function hoverAt( page, sel, [ fx, fy ], ring = true, ms = 1100 ) {
	// The card sits wherever the page has scrolled to; under Lenis it keeps moving after a jump, so settle it in view first.
	await settleInView( page, sel );
	const facts = await page.evaluate( readFacts, sel );
	const size = await page.evaluate( ( s ) => {
		const r = document.querySelector( s ).getBoundingClientRect();
		return { w: r.width, h: r.height };
	}, sel );
	const lx = Math.round( size.w * fx );
	const ly = Math.round( size.h * fy );
	const pending = page.evaluate( sampleSeries, { sel, ms, ring } );
	await page.waitForTimeout( 40 );
	await page.mouse.move( facts.box.x + lx, facts.box.y + ly );
	return { series: await pending, lx, ly };
}

// ---- The checks ---------------------------------------------------------------------------------------------------

async function radiusAndWash( page, rep, control ) {
	const out = [];
	for ( const pos of POSITIONS ) {
		await park( page );
		const { series, lx, ly } = await hoverAt( page, REVEAL, pos, false );
		const radius = series.map( ( s ) => s.r );
		const wash = series.map( ( s ) => s.w );
		const clip = parseCircle( series[ series.length - 1 ].clip );
		out.push( { pos: `${ lx },${ ly }`, radius, wash, clip, ms: settleMs( series, 'r', 0.5 ) } );
	}
	if ( control ) return out;
	const facts = await page.evaluate( readFacts, REVEAL );
	rep.check( 'reveal-radius', {
		selector: REVEAL, property: '::before --sgs-cursor-field-radius, sampled every frame, at three pointer positions',
		measured: out.map( ( o ) => ( { pos: o.pos, start: o.radius[ 0 ], end: o.radius[ o.radius.length - 1 ], settleMs: o.ms, distinct: between( o.radius, 0, 90, 0.9 ).length } ) ).concat( { transitionDuration: facts.transitionDuration } ),
		expected: '0px at rest, 90px on hover through at least three values, settling in 0.4s (duration 0.4s)',
		pass: out.every( ( o ) => animates( o.radius, 0, 90 ) && null !== o.ms && o.ms <= 520 ) && facts.transitionDuration.split( ',' ).every( ( d ) => d.trim() === '0.4s' ),
	} );
	rep.check( 'reveal-clip-follows-pointer', {
		selector: REVEAL, property: '::before clip-path circle centre once hovered',
		measured: out.map( ( o ) => ( { pos: o.pos, clip: o.clip } ) ), expected: 'circle(90px at <the pointer in the card>) within 1px',
		pass: out.every( ( o ) => o.clip && Math.abs( o.clip.r - 90 ) < 0.6 && `${ Math.round( o.clip.x ) },${ Math.round( o.clip.y ) }` === o.pos ),
	} );
	rep.check( 'reveal-wash', {
		selector: REVEAL, property: '::before --sgs-cursor-field-wash, sampled every frame, at three pointer positions',
		measured: out.map( ( o ) => ( { pos: o.pos, start: o.wash[ 0 ], end: o.wash[ o.wash.length - 1 ], distinct: between( o.wash, 0.3, 0.5, 0.002 ).length } ) ),
		expected: '0.5 at rest easing to 0.3 on hover', pass: out.every( ( o ) => animates( o.wash, 0.5, 0.3 ) ),
	} );
	return out;
}

async function ringChecks( page, rep ) {
	const rows = [];
	for ( const pos of POSITIONS ) {
		await park( page );
		const { series, lx, ly } = await hoverAt( page, REVEAL, pos );
		rows.push( { pos: `${ lx },${ ly }`, lx, ly, scale: series.map( ( s ) => s.s ), end: series[ series.length - 1 ] } );
	}
	const facts = await page.evaluate( readFacts, REVEAL );
	const ring = facts.ring;
	rep.check( 'ring-layer', {
		selector: `${ REVEAL } .sgs-motion-layer`, property: 'aria-hidden, display, diameter, shape, border width',
		measured: ring, expected: `aria-hidden true, a ${ RING_SIZE }px circle with a 3px border`,
		pass: !! ring && ring.ariaHidden === 'true' && ring.width === `${ RING_SIZE }px` && ring.height === `${ RING_SIZE }px` && ring.radius === '50%' && ring.border === '3px',
	} );
	rep.check( 'ring-scale', {
		selector: `${ REVEAL } .sgs-motion-layer`, property: '::before scale on hover, sampled every frame, at three pointer positions',
		measured: rows.map( ( r ) => ( { pos: r.pos, start: r.scale[ 0 ], end: r.scale[ r.scale.length - 1 ] } ) ), expected: '0 at rest rising to 1 on hover',
		pass: rows.every( ( r ) => animates( r.scale, 0, 1 ) ),
	} );
	rep.check( 'ring-at-pointer', {
		selector: `${ REVEAL } .sgs-motion-layer`, property: 'ring centre once settled, in the card',
		measured: rows.map( ( r ) => ( { pos: r.pos, x: r.end.x, y: r.end.y } ) ), expected: 'the pointer position within 1.5px',
		pass: rows.every( ( r ) => Math.abs( r.end.x - r.lx ) < 1.5 && Math.abs( r.end.y - r.ly ) < 1.5 ),
	} );

	// Lag: settle on one position, then jump to another and sample the ring while it follows.
	const lags = [];
	for ( let i = 0; i < POSITIONS.length; i++ ) {
		const a = POSITIONS[ i ];
		const b = POSITIONS[ ( i + 1 ) % POSITIONS.length ];
		await park( page );
		await hoverAt( page, REVEAL, a, true, 100 );
		await page.waitForTimeout( 800 );
		const size = await page.evaluate( ( s ) => {
			const r = document.querySelector( s ).getBoundingClientRect();
			return { x: r.x, y: r.y, w: r.width, h: r.height };
		}, REVEAL );
		const pending = page.evaluate( sampleSeries, { sel: REVEAL, ms: 1000, ring: true } );
		await page.waitForTimeout( 40 );
		await page.mouse.move( size.x + size.w * b[ 0 ], size.y + size.h * b[ 1 ] );
		const series = await pending;
		lags.push( { move: `${ a } to ${ b }`, ms: settleMs( series, 'x' ), ok: lagged( series, 'x' ), distinct: between( series.map( ( s ) => s.x ), Math.min( series[ 0 ].x, series[ series.length - 1 ].x ), Math.max( series[ 0 ].x, series[ series.length - 1 ].x ), 1 ).length } );
	}
	rep.check( 'ring-lag', {
		selector: `${ REVEAL } .sgs-motion-layer`, property: 'ring centre x after the pointer jumps, sampled every frame',
		measured: lags, expected: 'a follower: intermediate positions, arriving 250 to 520ms after it starts (0.4s lag)', pass: lags.every( ( l ) => l.ok ),
	} );
	rep.control( 'ring-lag', {
		selector: `${ REVEAL } .sgs-motion-layer`, property: 'a synthetic series that jumps in one frame', measured: [ { t: 0, x: 100 }, { t: 16, x: 250 }, { t: 32, x: 250 } ],
		expected: 'the same lag judge rejects it', red: ! lagged( [ { t: 0, x: 100 }, { t: 16, x: 250 }, { t: 32, x: 250 } ], 'x' ),
	} );
}

async function reducedMotion( page, rep ) {
	await park( page );
	const normal = await page.evaluate( readFacts, REVEAL );
	// Clear the positions the earlier checks wrote, so any write seen afterwards is a write under reduced motion.
	await page.evaluate( ( s ) => document.querySelector( s + ' .sgs-motion-layer' ).removeAttribute( 'style' ), REVEAL );
	await page.emulateMedia( { reducedMotion: 'reduce' } );
	await page.waitForTimeout( 200 );
	const { series } = await hoverAt( page, REVEAL, POSITIONS[ 1 ], true, 500 );
	const after = await page.evaluate( readFacts, REVEAL );
	const first = series.findIndex( ( s ) => s.r > 0 );
	await page.emulateMedia( { reducedMotion: 'no-preference' } );
	rep.check( 'reduced-motion', {
		selector: REVEAL, property: 'radius transition duration, ring display, ring position writes, radius samples after hover',
		measured: { transitionDuration: after.transitionDuration, ringDisplay: after.ring && after.ring.display, ringStyle: after.ringStyle, firstNonZero: first >= 0 ? series[ first ].r : null },
		expected: 'no transition (0s), no ring, no ring position written, and the radius arrives at 90px at once rather than easing',
		pass: after.transitionDuration.split( ',' ).every( ( d ) => d.trim() === '0s' ) && !! after.ring && after.ring.display === 'none' && ! /--sgs-ring-x/.test( after.ringStyle || '' ) && first >= 0 && Math.abs( series[ first ].r - 90 ) < 0.6,
	} );
	rep.control( 'reduced-motion', {
		selector: REVEAL, property: 'the same card under no preference', measured: normal.transitionDuration,
		expected: 'a 0.4s transition, so the 0s above is a change', red: normal.transitionDuration.split( ',' ).every( ( d ) => d.trim() === '0.4s' ),
	} );
}

async function rippleWithReveal( page, rep ) {
	const press = async ( sel ) => {
		await park( page );
		const box = await settleInView( page, sel );
		await page.mouse.move( box.x + box.width * 0.4, box.y + box.height * 0.5, { steps: 2 } );
		await page.mouse.down();
		await page.waitForTimeout( 120 );
		const facts = await page.evaluate( readFacts, sel );
		await page.mouse.up();
		return facts;
	};
	const both = await press( REVEAL );
	const alone = await press( PLAIN );
	rep.check( 'ripple-with-reveal', {
		selector: REVEAL, property: 'data-sgs-ripple and the ::after animation after a press on the card with both effects',
		measured: both.ripple, expected: 'play, and the sgs-ripple animation running', pass: both.ripple.play === 'play' && both.ripple.animation === 'sgs-ripple',
	} );
	rep.control( 'ripple-with-reveal', {
		selector: PLAIN, property: 'the card with the cursor field and no ripple, pressed the same way', measured: alone.ripple,
		expected: 'no ripple state and no ripple animation', red: alone.ripple.play === null && alone.ripple.animation !== 'sgs-ripple',
	} );
}

async function unregisteredControl( browserType, rep, { local, url, width } ) {
	const browser = await browserType.launch( { headless: ! process.env.SGS_HEADED, ...( process.env.SGS_HEADED && { channel: "chrome" } ) } );
	const context = await browser.newContext( { viewport: { width, height: HEIGHT } } );
	try {
		const page = await openPage( context, { local, url, strip: true } );
		const out = await radiusAndWash( page, rep, true );
		rep.control( 'reveal-radius', {
			selector: REVEAL, property: 'the radius with the @property registration removed, at three pointer positions',
			measured: out.map( ( o ) => ( { pos: o.pos, distinct: between( o.radius, 0, 90, 0.9 ).length, end: o.radius[ o.radius.length - 1 ] } ) ),
			expected: 'it jumps (no intermediate values), so the animation above comes from the registration',
			red: out.every( ( o ) => between( o.radius, 0, 90, 0.9 ).length === 0 && Math.abs( o.radius[ o.radius.length - 1 ] - 90 ) < 0.6 ),
		} );
	} finally {
		await browser.close();
	}
}

export async function main( argv ) {
	const local = argv.includes( '--local' );
	const args = parseArgs( [ 'node', 'probe', ...argv.filter( ( a ) => a !== '--local' ) ] );
	if ( ! local && ! args.pages.length ) {
		console.error( 'Pass --page <id> (a page built from tests/fixtures/motion/pages/cursor-field.json) or --local.' );
		return 1;
	}
	const url = local ? null : `${ siteBase( args.site ) }/?p=${ args.pages[ 0 ] }&cb=m511`;
	const all = [];
	for ( const engine of args.engines ) {
		for ( const width of args.widths ) {
			const rep = new Reporter( { engine, width, mode: local ? 'local' : 'live' } );
			const browser = await BROWSERS[ engine ].launch( { headless: ! process.env.SGS_HEADED, ...( process.env.SGS_HEADED && { channel: "chrome" } ) } );
			const context = await browser.newContext( { viewport: { width, height: HEIGHT } } );
			try {
				const page = await openPage( context, { local, url, strip: false } );
				if ( ! ( await page.$( REVEAL ) ) || ! ( await page.$( PLAIN ) ) ) {
					rep.check( 'reveal-radius', { pass: null, why: `the page has no ${ REVEAL } and ${ PLAIN } (build tests/fixtures/motion/pages/cursor-field.json)` } );
				} else if ( ! ( await page.evaluate( () => matchMedia( '(hover: hover) and (pointer: fine)' ).matches ) ) ) {
					rep.check( 'reveal-radius', { pass: null, why: 'this browser reports a coarse pointer, so the field is gated off' } );
				} else {
					await radiusAndWash( page, rep, false );
					await ringChecks( page, rep );
					await reducedMotion( page, rep );
					await rippleWithReveal( page, rep );
				}
			} catch ( e ) {
				rep.check( 'error:checks', { pass: false, why: String( e && e.message ? e.message : e ) } );
			}
			await browser.close();
			try {
				await unregisteredControl( BROWSERS[ engine ], rep, { local, url, width } );
			} catch ( e ) {
				rep.control( 'reveal-radius', { red: null, why: String( e && e.message ? e.message : e ) } );
			}
			all.push( ...rep.rows );
		}
	}
	const finish = new Reporter( {} );
	finish.rows = all;
	return finish.summary();
}

if ( process.argv[ 1 ] && path.resolve( process.argv[ 1 ] ) === fileURLToPath( import.meta.url ) ) {
	const argv = process.argv.slice( 2 );
	if ( argv.includes( '--self-test' ) ) process.exit( selfTest() );
	main( argv ).then( ( code ) => process.exit( code ), ( e ) => {
		console.error( e );
		process.exit( 1 );
	} );
}
