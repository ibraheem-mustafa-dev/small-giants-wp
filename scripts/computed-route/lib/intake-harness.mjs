// The determinism harness (Spec 48 FR-48-28): every render intake takes runs under a virtual clock, a seeded
// Math.random, seeded storage and loaded fonts, and reads in rest mode or sample mode, so two runs of one surface at
// one width and mode give byte-identical records (lib/intake-reading.mjs).
//
// One harness run owns one browser context. Playwright's clock is context-wide and every clock call is replayed into
// each new page of that context, so a second page would start at a different virtual time; preparePage refuses a
// context it has already prepared. openHarness opens a fresh sandbox (lib/intake-sandbox.mjs) per run.
//
// Ordering (verified): the clock calls add context init scripts, which run before page init scripts,
// so harnessInit (lib/intake-harness-page.mjs) wraps the FAKE timers. The draft runtime boots with the clock paused
// (it needs no timer to boot), so componentDidMount runs at virtual time 0 in every run.
//
// What the clock does not reach: the document timeline (CSS and Web Animations run on real time; rest mode finishes
// or holds them before reading), React's scheduler (MessageChannel, flushed before every frame), and observer delivery
// (IntersectionObserver and ResizeObserver notify in real rendering frames). The harness waits for one real frame after
// every 16ms step, so each observer sees each step's state at that step's virtual time. The one residue: a frame can
// also fall between two timers that fire inside the same 16ms step, so an observer callback that reads the clock may
// see any time within that step.
import { parse } from '@babel/parser';
import { tplKeyOf } from '../../parity/lib/collect.mjs';
import { harnessInit } from './intake-harness-page.mjs';
import { openSandbox } from './intake-sandbox.mjs';

export const HARNESS_DEFAULTS = Object.freeze( {
	clock: '2026-01-05T10:00:00Z', // a Monday morning, inside every UK opening-hours window
	seed: 48028,
	stepMs: 16,
	timeoutMaxMs: 10000,
	intervalTicks: 3,
	rafFrames: 60,
	scrollStepMs: 100,
	// The ceiling for one settle phase: an interval that cannot tick intervalTicks times or a frame loop that never
	// pauses by then is a thrown error naming it, never a silent read.
	settleMaxMs: 30000,
	storage: Object.freeze( { local: Object.freeze( {} ), session: Object.freeze( {} ) } ),
	storageKeys: Object.freeze( [] ),
} );

// The items a negative control may switch off (opts.disable). This option exists ONLY for the harness's own negative
// controls (tests/intake-harness.test.mjs); intake never passes it.
export const DISABLE_ITEMS = [ 'clock', 'random', 'storage', 'timeouts', 'intervals', 'raf', 'scroll', 'fonts', 'animations' ];

// The options merged over HARNESS_DEFAULTS and checked.
export function harnessOptions( opts = {} ) {
	const o = { ...HARNESS_DEFAULTS, ...opts };
	o.disable = [ ...( opts.disable || [] ) ];
	const unknown = o.disable.filter( ( d ) => ! DISABLE_ITEMS.includes( d ) );
	if ( unknown.length ) {
		throw new Error( `unknown harness item(s) to disable: ${ unknown.join( ', ' ) } (known: ${ DISABLE_ITEMS.join( ', ' ) })` );
	}
	if ( ! Number.isFinite( Date.parse( o.clock ) ) ) {
		throw new Error( `harness clock ${ JSON.stringify( o.clock ) } is not an ISO instant` );
	}
	for ( const k of [ 'seed', 'stepMs', 'timeoutMaxMs', 'intervalTicks', 'rafFrames', 'scrollStepMs', 'settleMaxMs' ] ) {
		if ( ! Number.isInteger( o[ k ] ) || o[ k ] < 0 ) {
			throw new Error( `harness ${ k } must be a non-negative integer, not ${ JSON.stringify( o[ k ] ) }` );
		}
	}
	return o;
}

// The settings stored in every reading record's `harness` field and in intake.json `harness`.
export function harnessSettings( opts = {} ) {
	const o = harnessOptions( opts );
	const sortObj = ( x ) => Object.fromEntries( Object.entries( x || {} ).sort( ( [ a ], [ b ] ) => ( a < b ? -1 : a > b ? 1 : 0 ) ) );
	const out = {
		clock: new Date( o.clock ).toISOString(), seed: o.seed, stepMs: o.stepMs, timeoutMaxMs: o.timeoutMaxMs,
		intervalTicks: o.intervalTicks, rafFrames: o.rafFrames, scrollStepMs: o.scrollStepMs, settleMaxMs: o.settleMaxMs,
		storageKeys: [ ...o.storageKeys ].map( ( k ) => ( 'string' === typeof k ? k : `${ k.store }:${ k.key ?? k.expr }` ) ).sort(),
		storageSeeded: { local: sortObj( o.storage?.local ), session: sortObj( o.storage?.session ) },
	};
	if ( o.disable.length ) {
		out.disabled = [ ...o.disable ].sort();
	}
	return out;
}

// The storage keys a draft's logic both reads (getItem) and writes (setItem) on the same store, found on the
// @babel/parser syntax tree. A key is a string literal, a `this.X` class field or a const holding one; any other key
// expression is returned unresolved with its source text. Returns [ { store, key, expr, resolved } ] sorted. The
// harness seeds nothing it has no default for (an empty store); the caller records these keys (storageKeys).
export function bootStorageKeys( logicSource ) {
	let ast;
	try {
		ast = parse( logicSource, { sourceType: 'script', plugins: [ 'jsx' ], errorRecovery: false } );
	} catch ( e ) {
		throw new Error( `bootStorageKeys: the draft logic does not parse (${ e.message })` );
	}
	const strings = { field: new Map(), name: new Map() };
	const calls = [];
	const walk = ( n ) => {
		if ( ! n || 'object' !== typeof n ) {
			return;
		}
		if ( Array.isArray( n ) ) {
			n.forEach( walk );
			return;
		}
		if ( /^(ClassProperty|PropertyDefinition)$/.test( n.type ) && ! n.computed && 'StringLiteral' === n.value?.type ) {
			strings.field.set( n.key.name ?? n.key.value, n.value.value );
		}
		if ( 'VariableDeclarator' === n.type && 'Identifier' === n.id.type && 'StringLiteral' === n.init?.type ) {
			strings.name.set( n.id.name, n.init.value );
		}
		if ( 'CallExpression' === n.type && 'MemberExpression' === n.callee.type && ! n.callee.computed && [ 'getItem', 'setItem' ].includes( n.callee.property.name ) ) {
			const obj = n.callee.object;
			const store = 'Identifier' === obj.type ? obj.name : 'MemberExpression' === obj.type && ! obj.computed ? obj.property.name : null;
			if ( [ 'localStorage', 'sessionStorage' ].includes( store ) && n.arguments[ 0 ] ) {
				calls.push( { store, op: n.callee.property.name, arg: n.arguments[ 0 ] } );
			}
		}
		for ( const k of Object.keys( n ) ) {
			if ( ! [ 'loc', 'start', 'end', 'extra', 'leadingComments', 'trailingComments', 'innerComments' ].includes( k ) ) {
				walk( n[ k ] );
			}
		}
	};
	walk( ast.program );
	const keyOf = ( a ) => {
		if ( 'StringLiteral' === a.type ) {
			return a.value;
		}
		if ( 'MemberExpression' === a.type && 'ThisExpression' === a.object.type && ! a.computed ) {
			return strings.field.get( a.property.name ) ?? null;
		}
		return 'Identifier' === a.type ? strings.name.get( a.name ) ?? null : null;
	};
	const seen = new Map();
	for ( const c of calls ) {
		const key = keyOf( c.arg );
		const expr = logicSource.slice( c.arg.start, c.arg.end );
		const id = `${ c.store }\u0000${ key ?? `expr:${ expr }` }`;
		const row = seen.get( id ) || { store: c.store, key, expr, resolved: null !== key, ops: new Set() };
		row.ops.add( c.op );
		seen.set( id, row );
	}
	return [ ...seen.values() ].filter( ( r ) => r.ops.size === 2 ).map( ( { store, key, expr, resolved } ) => ( { store, key, expr, resolved } ) )
		.sort( ( a, b ) => `${ a.store }:${ a.key ?? a.expr }`.localeCompare( `${ b.store }:${ b.key ?? b.expr }` ) );
}

const prepared = new WeakSet();
const pageErrors = new WeakMap();

// The draft errors seen on a prepared page: { page: [uncaught], console: [console.error texts] }.
export const draftErrors = ( page ) => pageErrors.get( page ) ?? { page: [], console: [] };

const assertNoPageErrors = ( page, when ) => {
	const { page: errs } = draftErrors( page );
	if ( errs.length ) {
		throw new Error( `harness: the draft threw ${ when }: ${ errs.join( '; ' ) }` );
	}
};

// Before page.goto: installs the virtual clock at opts.clock, paused, and the in-page harness (seeded random, seeded
// storage, timer, interval, frame and animation bookkeeping). Returns the merged options.
export async function preparePage( page, opts = {} ) {
	const o = harnessOptions( opts );
	const context = page.context();
	if ( prepared.has( context ) ) {
		throw new Error( 'preparePage: this browser context already ran the harness; the clock is context-wide, so open a fresh sandbox per run' );
	}
	prepared.add( context );
	// R-48-3: an uncaught draft error fails the run (settleRest throws it); console errors are kept for the summary.
	const errors = { page: [], console: [] };
	pageErrors.set( page, errors );
	page.on( 'pageerror', ( e ) => errors.page.push( e.message ) );
	page.on( 'console', ( m ) => {
		if ( 'error' === m.type() ) {
			errors.console.push( m.text().slice( 0, 300 ) );
		}
	} );
	if ( ! o.disable.includes( 'clock' ) ) {
		// pauseAt installs the fake clock (Playwright's _installIfNeeded) already paused at the instant. install()
		// followed by pauseAt() would replay the real milliseconds between the two calls into performance.now() in
		// every new document, shifting every frame boundary by that gap (seen: 2317 vs 2318 virtual ms).
		await page.clock.pauseAt( o.clock );
	}
	await page.addInitScript( harnessInit, { seed: o.seed, intervalTicks: o.intervalTicks, rafFrames: o.rafFrames, storage: o.storage, disable: o.disable } );
	return o;
}

// Opens a draft page and waits for the runtime to stamp it; throws if the in-page harness reported an error.
export async function gotoDraft( page, origin, file, { hash = '', timeout = 60000 } = {} ) {
	const url = `${ origin }/${ file.split( '/' ).map( encodeURIComponent ).join( '/' ) }${ hash ? `#${ hash.replace( /^#/, '' ) }` : '' }`;
	await page.goto( url, { waitUntil: 'load', timeout } );
	await page.waitForFunction( () => document.querySelector( '#dc-root [data-dc-tpl]' ) && 'function' === typeof window.__dcAnnotatedTemplate && window.__dcAnnotatedTemplate( window.__dcRootName() ), null, { timeout } );
	assertNoPageErrors( page, 'while booting' );
	const errors = await page.evaluate( () => window.__sgsHarness?.errors ?? [ 'the in-page harness is not installed (call preparePage before goto)' ] );
	if ( errors.length ) {
		throw new Error( `harness: ${ errors.join( '; ' ) }` );
	}
	return url;
}

// Fonts before any read: every stylesheet link loaded (or failed), every face in document.fonts loaded, and
// document.fonts.ready resolved. A failed sheet or a face that is not `loaded` is a thrown error naming it (R-48-3).
export async function ensureFonts( page, opts = {} ) {
	const o = harnessOptions( opts );
	if ( o.disable.includes( 'fonts' ) ) {
		return null;
	}
	await page.waitForFunction( () => window.__sgsHarness.sheetsSettled(), null, { timeout: opts.timeout ?? 30000 } ).catch( async ( e ) => {
		const hrefs = await page.evaluate( () => [ ...document.querySelectorAll( 'link[rel~="stylesheet"]' ) ].filter( ( l ) => ! l.sheet ).map( ( l ) => l.href ) );
		throw new Error( `fonts: stylesheet(s) never loaded: ${ hrefs.join( ', ' ) } (${ e.message.split( '\n' )[ 0 ] })` );
	} );
	const r = await page.evaluate( () => window.__sgsHarness.fonts() );
	if ( r.problems.length ) {
		throw new Error( `fonts: ${ r.problems.join( '; ' ) }` );
	}
	return r;
}

// Moves virtual time by ms (real time when the clock is disabled for a negative control). A draft timer that throws
// fails the run with its message.
async function advance( page, ms, o ) {
	if ( o.disable.includes( 'clock' ) ) {
		await page.waitForTimeout( ms );
		return;
	}
	try {
		await page.clock.runFor( ms );
	} catch ( e ) {
		throw new Error( `harness: a draft timer threw while the clock ran: ${ e.message.split( '\n' )[ 0 ] }` );
	}
}

// Advances ms in stepMs steps, a real frame after each; returns the last pending report.
async function steps( page, ms, o, windowEnd ) {
	let left = ms;
	let p = null;
	while ( left > 0 ) {
		const d = Math.min( o.stepMs, left );
		await advance( page, d, o );
		p = await page.evaluate( ( w ) => window.__sgsHarness.step( w ), windowEnd );
		left -= d;
	}
	return p;
}

const describe = ( p ) => [ ...p.timeouts, ...p.intervals, ...p.frames ]
	.map( ( x ) => `${ x.kind }${ x.delay !== undefined ? ` ${ x.delay }ms` : '' }${ x.ticks !== undefined ? ` (${ x.ticks } ticks)` : '' }: ${ x.fn }` ).join( '\n  ' );

// One settle phase: steps until no timeout due within timeoutMaxMs of the phase start is pending, every interval has
// ticked intervalTicks times and no frame callback is scheduled. Throws, naming what is still pending, at settleMaxMs.
async function settlePhase( page, o, label ) {
	const start = await page.evaluate( () => performance.now() );
	const windowEnd = start + o.timeoutMaxMs;
	for ( ;; ) {
		const p = await steps( page, o.stepMs, o, windowEnd );
		if ( ! p.timeouts.length && ! p.intervals.length && ! p.frames.length ) {
			return Math.round( p.t - start );
		}
		if ( p.t - start >= o.settleMaxMs ) {
			throw new Error( `harness: the page did not settle (${ label }) within ${ o.settleMaxMs }ms of virtual time; still pending:\n  ${ describe( p ) }` );
		}
	}
}

// One scroll pass: top to the end of the page and back in steps of one viewport height, a frame after each scroll
// and the clock advanced scrollStepMs, so every IntersectionObserver reveal fires once. Returns the positions used.
async function scrollPass( page, o ) {
	const at = async ( y ) => {
		await page.evaluate( async ( top ) => {
			window.scrollTo( { top, left: 0, behavior: 'instant' } );
			await window.__sgsHarness.frame();
		}, y );
		await steps( page, o.scrollStepMs, o, -Infinity );
	};
	const geom = () => page.evaluate( () => ( { h: window.innerHeight, max: Math.max( 0, document.documentElement.scrollHeight - window.innerHeight ) } ) );
	const ys = [];
	let y = 0;
	for ( ;; ) {
		await at( y );
		ys.push( y );
		const { h, max } = await geom();
		if ( y >= max ) {
			break;
		}
		y = Math.min( y + h, max );
	}
	const { h } = await geom();
	while ( y > 0 ) {
		y = Math.max( 0, y - h );
		await at( y );
		ys.push( y );
	}
	return ys;
}

// Rest mode: fonts, settle (timeouts up to timeoutMaxMs, intervals intervalTicks ticks, frame loops rafFrames frames),
// one scroll pass, settle again (what the reveals started), infinite animations held at phase 0 and finite ones
// finished, fonts again. Returns a summary of what ran (a diagnostic, not a record: animations.finished counts the
// finite animations still running on the real timeline at the hold, so it can vary between runs whose reads agree).
export async function settleRest( page, opts = {} ) {
	const o = harnessOptions( opts );
	const out = { startMs: await page.evaluate( () => performance.now() ) };
	out.fontsBefore = await ensureFonts( page, o );
	out.settleMs = await settlePhase( page, o, 'after boot' );
	if ( ! o.disable.includes( 'scroll' ) ) {
		out.scroll = await scrollPass( page, o );
		out.settleAfterScrollMs = await settlePhase( page, o, 'after the scroll pass' );
	}
	if ( ! o.disable.includes( 'animations' ) ) {
		out.animations = await page.evaluate( () => window.__sgsHarness.hold() );
	}
	out.fontsAfter = await ensureFonts( page, o );
	out.virtualMs = await page.evaluate( () => performance.now() );
	assertNoPageErrors( page, 'during the rest settle' );
	out.consoleErrors = [ ...draftErrors( page ).console ];
	return out;
}

// The sample times for a recorded duration (FR-48-47): 0, the midpoint and the end.
export const sampleTimes = ( duration ) => {
	if ( ! Number.isFinite( duration ) || duration <= 0 ) {
		throw new Error( `sampleTimes needs a finite positive duration, not ${ duration }` );
	}
	return [ 0, duration / 2, duration ];
};

// The animations registered on a sample target (a CSS selector or { draftId }):
// [ { index, label, delay, duration, iterations } ].
export const targetAnimations = ( page, target ) => page.evaluate( ( [ t, src ] ) => window.__sgsHarness.targetAnimations( t, src ), [ target, tplKeyOf.toString() ] );

// Sample mode. kind 'animation' (after settleRest): every animation on the target is paused at its delay plus t for
// each t. kind 'clock' (on a page not yet settled): the clock is advanced in stepMs steps to virtual time t since
// boot, for timer and frame writers. `read(t)` reads the page at each time; returns all its records in time order.
export async function sampleAt( page, { target, times, kind = 'animation', read, ...opts } ) {
	const o = harnessOptions( opts );
	if ( 'function' !== typeof read ) {
		throw new Error( 'sampleAt needs read(t), which returns the records read at time t' );
	}
	const out = [];
	if ( 'animation' === kind ) {
		const anims = await targetAnimations( page, target );
		if ( ! anims.length ) {
			throw new Error( `sampleAt: no animation runs on ${ JSON.stringify( target ) }` );
		}
		for ( const t of times ) {
			await page.evaluate( ( x ) => window.__sgsHarness.seek( x ), t );
			out.push( ...( await read( t ) ) );
		}
		assertNoPageErrors( page, 'while sampling' );
		return out;
	}
	if ( 'clock' !== kind ) {
		throw new Error( `sampleAt kind must be 'animation' or 'clock', not ${ JSON.stringify( kind ) }` );
	}
	await ensureFonts( page, o );
	for ( const t of [ ...times ].sort( ( a, b ) => a - b ) ) {
		const now = await page.evaluate( () => performance.now() );
		if ( t > now ) {
			await steps( page, t - now, o, -Infinity );
		}
		out.push( ...( await read( t ) ) );
	}
	assertNoPageErrors( page, 'while sampling' );
	return out;
}

// Opens a fresh sandbox for one run, prepares its page and opens the draft at `file` (plus `hash`, a hash route) at
// `width`. Returns { sb, page, options, settings, close }.
export async function openHarness( { folder, index, harPath, file = index, hash = '', width = 1440, height = 900, timeout = 60000, ...opts } ) {
	const options = harnessOptions( opts );
	const sb = await openSandbox( { folder, index, harPath, mode: 'replay', widths: [ width ], timeout } );
	try {
		const page = await sb.newPage();
		await page.setViewportSize( { width, height } );
		await preparePage( page, options );
		await gotoDraft( page, sb.origin, file, { hash, timeout } );
		return { sb, page, options, settings: harnessSettings( options ), close: () => sb.close() };
	} catch ( e ) {
		await sb.close();
		throw e;
	}
}
