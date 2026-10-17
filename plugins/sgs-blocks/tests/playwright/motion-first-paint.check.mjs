// Real-browser first-paint check for scroll entrances (Spec 38A §9, FR-38A-19): a scroll entrance's target is never
// painted at its resting opacity before its entrance plays, and it is fully visible whenever the reveal module cannot
// run (JavaScript blocked, the module missing or failing, no IntersectionObserver, reduced motion).
//
// It drives real Chromium against a page served from memory (no WordPress site, no credentials) that prints what the
// renderer prints on a page with a scroll Fade up: assets/css/motion.css, the per-instance from-values, the ready gate
// (assets/js/motion-ready-gate.js, inline in the head, as Sgs_Motion_Assets::print_ready_gate prints it) and the
// deferred reveal module (assets/js/motion-reveal.js) at the end of the body, held back by a network delay so the first
// paint happens before it runs, as it does on a real connection. A per-frame sampler injected before the document
// exists records each target's computed opacity on every animation frame.
//
// Run:             node tests/playwright/motion-first-paint.check.mjs
// Mutation check:  SGS_FIRST_PAINT_MUTATE=<id> node tests/playwright/motion-first-paint.check.mjs  (the run must go red)
//                  no-gate     the head prints no ready gate;
//                  no-armed    the reveal module never reports itself armed, so the gate's load fallback shows everything.
import { createRequire } from 'module';
import { existsSync, readFileSync } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const here = path.dirname( fileURLToPath( import.meta.url ) );
const pluginRoot = path.resolve( here, '..', '..' );
const require = createRequire( path.join( pluginRoot, 'package.json' ) );
const { chromium } = require( 'playwright' );

const MUTATIONS = [ 'no-gate', 'no-armed' ];
const MUTATE = process.env.SGS_FIRST_PAINT_MUTATE || '';
if ( MUTATE && ! MUTATIONS.includes( MUTATE ) ) {
	console.error( `unknown mutation "${ MUTATE }"; one of: ${ MUTATIONS.join( ', ' ) }` );
	process.exit( 2 );
}

const read = ( rel ) => readFileSync( path.join( pluginRoot, rel ), 'utf8' );
const GATE_PATH = 'assets/js/motion-ready-gate.js';
const gate = existsSync( path.join( pluginRoot, GATE_PATH ) ) && 'no-gate' !== MUTATE ? read( GATE_PATH ) : '';
let reveal = read( 'assets/js/motion-reveal.js' );
if ( 'no-armed' === MUTATE ) {
	reveal = reveal.split( '\n' ).filter( ( line ) => ! line.includes( 'sgsMotionRevealArmed' ) ).join( '\n' );
}

const ORIGIN = 'http://sgs-first-paint.test';
const page = () => `<!doctype html><html><head><meta charset="utf-8">
<link rel="stylesheet" href="/motion.css">
<style>.fp-t{--sgs-me-from-op:0;--sgs-me-from-ty:28px;--sgs-me-dur:600ms;height:120px;background:#345}</style>
${ gate ? `<script>${ gate }</script>` : '' }
</head><body style="margin:0">
<div id="in-view" class="fp-t" data-sgs-me="scroll translate opacity">in view</div>
<div style="height:2400px"></div>
<div id="below" class="fp-t" data-sgs-me="scroll translate opacity">below the fold</div>
<script defer src="/motion-reveal.js"></script>
</body></html>`;

// Injected before the document exists: every animation frame, each target's opacity and whether it has been revealed.
const sampler = () => {
	const frames = ( window.__fp = [] );
	const tick = () => {
		const row = { t: performance.now(), ready: !! document.documentElement && document.documentElement.classList.contains( 'sgs-motion-ready' ) };
		for ( const id of [ 'in-view', 'below' ] ) {
			const el = document.getElementById( id );
			if ( el ) {
				row[ id ] = { op: parseFloat( getComputedStyle( el ).opacity ), in: el.hasAttribute( 'data-sgs-in' ) };
			}
		}
		frames.push( row );
		if ( frames.length < 600 ) {
			requestAnimationFrame( tick );
		}
	};
	requestAnimationFrame( tick );
};

const failures = [];
const check = ( name, pass, detail ) => {
	console.log( `${ pass ? 'PASS' : 'FAIL' }  ${ name }${ pass ? '' : `  ${ detail }` }` );
	if ( ! pass ) {
		failures.push( name );
	}
};

async function load( browser, { js = true, revealStatus = 200, reducedMotion = 'no-preference', noIO = false } = {} ) {
	const ctx = await browser.newContext( { javaScriptEnabled: js, reducedMotion, viewport: { width: 1280, height: 800 } } );
	if ( noIO ) {
		await ctx.addInitScript( () => {
			delete window.IntersectionObserver;
		} );
	}
	await ctx.addInitScript( sampler );
	await ctx.route( `${ ORIGIN }/**`, async ( route ) => {
		const url = new URL( route.request().url() );
		if ( '/motion.css' === url.pathname ) {
			return route.fulfill( { contentType: 'text/css', body: read( 'assets/css/motion.css' ) } );
		}
		if ( '/motion-reveal.js' === url.pathname ) {
			// Held back so the page paints first, as the deferred footer script lands after first paint on a real connection.
			await new Promise( ( r ) => setTimeout( r, 700 ) );
			return 200 === revealStatus ? route.fulfill( { contentType: 'text/javascript', body: reveal } ) : route.fulfill( { status: revealStatus, body: '' } );
		}
		return route.fulfill( { contentType: 'text/html', body: page() } );
	} );
	const p = await ctx.newPage();
	await p.goto( `${ ORIGIN }/`, { waitUntil: 'load' } );
	await p.waitForTimeout( 1500 );
	const state = await p.evaluate( () => ( {
		ready: document.documentElement.classList.contains( 'sgs-motion-ready' ),
		inView: parseFloat( getComputedStyle( document.getElementById( 'in-view' ) ).opacity ),
		below: parseFloat( getComputedStyle( document.getElementById( 'below' ) ).opacity ),
		frames: window.__fp || [],
	} ) );
	await ctx.close();
	return state;
}

// The frames in which a target was on the page but not yet revealed, painted at more than a trace of opacity.
const shownBeforeReveal = ( frames, id ) => frames.filter( ( f ) => f[ id ] && ! f[ id ].in && f[ id ].op > 0.05 );

const browser = await chromium.launch();
try {
	if ( ! gate ) {
		console.log( `note: no ready gate in the head (${ MUTATE ? `mutation ${ MUTATE }` : `${ GATE_PATH } missing` })` );
	}

	const on = await load( browser );
	const early = shownBeforeReveal( on.frames, 'in-view' );
	check( 'js-on: the in-view target is never painted visible before its entrance plays', on.frames.some( ( f ) => f[ 'in-view' ] ) && 0 === early.length, `${ early.length } frames at opacity > 0.05 before data-sgs-in, the first at ${ early[ 0 ] && Math.round( early[ 0 ].t ) }ms (opacity ${ early[ 0 ] && early[ 0 ][ 'in-view' ].op })` );
	const lateBelow = shownBeforeReveal( on.frames, 'below' );
	check( 'js-on: the below-the-fold target is never painted visible before it is revealed', on.frames.some( ( f ) => f.below ) && 0 === lateBelow.length, `${ lateBelow.length } frames at opacity > 0.05, the first at ${ lateBelow[ 0 ] && Math.round( lateBelow[ 0 ].t ) }ms` );
	check( 'js-on: the in-view entrance plays to opacity 1', 1 === on.inView, `opacity ${ on.inView }` );
	check( 'js-on: the below-the-fold target stays hidden until scrolled to, after load', on.ready && on.below < 0.05, `ready ${ on.ready }, opacity ${ on.below }` );

	const off = await load( browser, { js: false } );
	check( 'js-blocked: both targets visible, no ready class', ! off.ready && 1 === off.inView && 1 === off.below, JSON.stringify( { ready: off.ready, inView: off.inView, below: off.below } ) );

	const missing = await load( browser, { revealStatus: 404 } );
	check( 'reveal-missing: both targets visible after load, no ready class', ! missing.ready && 1 === missing.inView && 1 === missing.below, JSON.stringify( { ready: missing.ready, inView: missing.inView, below: missing.below } ) );

	const noIO = await load( browser, { noIO: true } );
	check( 'no-intersection-observer: both targets visible from first paint', ! noIO.ready && noIO.frames.every( ( f ) => ! f[ 'in-view' ] || 1 === f[ 'in-view' ].op ) && 1 === noIO.below, JSON.stringify( { ready: noIO.ready, below: noIO.below } ) );

	const reduced = await load( browser, { reducedMotion: 'reduce' } );
	check( 'reduced-motion: both targets visible from first paint', ! reduced.ready && reduced.frames.every( ( f ) => ! f[ 'in-view' ] || 1 === f[ 'in-view' ].op ) && 1 === reduced.below, JSON.stringify( { ready: reduced.ready, below: reduced.below } ) );
} finally {
	await browser.close();
}

console.log( failures.length ? `\n${ failures.length } failed` : '\nall passed' );
process.exit( failures.length ? 1 : 0 );
