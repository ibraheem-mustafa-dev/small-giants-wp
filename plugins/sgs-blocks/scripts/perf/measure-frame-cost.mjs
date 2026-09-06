/**
 * Q6 (generative-background engine) — what does a frame of the WebGL
 * folded-ribbon layer actually cost?
 *
 * PROMOTED 2026-08-28 from `.claude/scratch/stripe-hero-poc/perf/` (per the
 * D874 technique spec's "Notes for a Tier W implementation" / Target file
 * section — the measurement tooling is due to survive Gate E firing) and
 * repointed at `generative-background-perf.html` — this harness now measures
 * THIS engine's own shipped module, not the Stripe/FR-38-31 study rigs. The
 * original Stripe/FR-38-31 CONFIGS array + its comparison logic (positive
 * control, post-pass-cost derivation) is intentionally NOT carried forward —
 * this engine has no post-pass (§7 is out of scope) and no Stripe rig to
 * compare against, so importing those configs would only ever fail.
 *
 * Usage:  node scripts/perf/measure-frame-cost.mjs                (from plugins/sgs-blocks)
 *         node scripts/perf/measure-frame-cost.mjs --frames 400
 *
 * Output:  scripts/perf/frame-cost.json  + a table on stdout
 *
 * ── Deliberate choices, each with its reason (unchanged from the original) ─────────────────
 *
 * 1. NO --ignore-gpu-blocklist. A cost measured on a configuration a real capability gate
 *    would decline is the wrong cost. The harness's own capability verdict is recorded via
 *    `window.__err` when `createGenerativeBackground()` returns null.
 *
 * 2. Its OWN browser instance, not the shared MCP browser. A concurrent session driving the
 *    same browser would silently corrupt these readings (this has happened on this project).
 *
 * 3. Its OWN static HTTP server. The harness uses ES modules and fetch(), so file:// will not
 *    do, and depending on an externally-started server makes the run non-reproducible.
 *
 * 4. gl.finish() after every draw in leg B. Without it the timing measures how fast JS can
 *    QUEUE work, not how long the GPU takes to do it — the classic way to measure ~0ms for an
 *    expensive shader.
 *
 * 5. Draws are counted by hooking drawElements/drawArrays on the effect's OWN GL context, not
 *    by a page-level rAF counter. A global counter catches every other animation on the page
 *    and proves nothing about this module.
 *
 * 6. Backing-store size (canvas.width/height) is recorded per config rather than the requested
 *    DPR. This engine's resize() clamps DPR to 1.5 by design, so "DPR 2" renders at 1.5x.
 *    Comparing on requested DPR would manufacture a false result. Every cost is therefore
 *    ALSO reported per megapixel, which is size-independent.
 */

import { chromium } from 'playwright';
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname( fileURLToPath( import.meta.url ) );
// Two levels up: scripts/perf -> scripts -> plugins/sgs-blocks. The harness
// imports `../../src/shared/effects/webgl/generative-background.js`, so the
// static server must serve from the plugin root, not just scripts/.
const ROOT = path.resolve( HERE, '../..' );

const argFrames = ( () => {
	const i = process.argv.indexOf( '--frames' );
	return i > -1 ? parseInt( process.argv[ i + 1 ], 10 ) : 240;
} )();
const WARMUP = 30;          // discarded: shader compile, texture upload, driver warm-up
const LOOP_MS = 6000;       // leg C observation window

const MIME = {
	'.html': 'text/html; charset=utf-8',
	'.js': 'text/javascript; charset=utf-8',
	'.mjs': 'text/javascript; charset=utf-8',
	'.glsl': 'text/plain; charset=utf-8',
	'.png': 'image/png',
	'.webp': 'image/webp',
	'.json': 'application/json',
};

/*
 * Extensionless relative ES-module imports (`from './capability'`) are valid
 * everywhere this harness's TARGET files actually ship — webpack resolves
 * them at bundle time (every sibling Tier W module does this: wave-gradient.js,
 * aurora.js, generative-background.js). A raw browser has no such resolver, so
 * SERVING (not editing) `.js` files rewrites bare relative specifiers to add
 * `.js`, matching the same class of dev-server shim any unbundled-ESM test
 * harness needs. The shipped module text on disk is never touched.
 */
function rewriteBareImports( text ) {
	return text.replace(
		/from\s+(['"])(\.\.?\/[^'".]+)\1/g,
		( match, quote, spec ) => `from ${ quote }${ spec }.js${ quote }`
	);
}

function startServer() {
	const server = http.createServer( ( req, res ) => {
		const rel = decodeURIComponent( req.url.split( '?' )[ 0 ] ).replace( /^\/+/, '' );
		const file = path.resolve( ROOT, rel );
		// Never serve outside the poc tree.
		if ( ! file.startsWith( ROOT ) ) {
			res.writeHead( 403 ); res.end( 'forbidden' ); return;
		}
		fs.readFile( file, ( err, buf ) => {
			if ( err ) { res.writeHead( 404 ); res.end( 'not found' ); return; }
			const ext = path.extname( file );
			const body = ext === '.js' ? rewriteBareImports( buf.toString( 'utf8' ) ) : buf;
			res.writeHead( 200, { 'Content-Type': MIME[ ext ] || 'application/octet-stream' } );
			res.end( body );
		} );
	} );
	return new Promise( ( resolve ) => {
		server.listen( 0, '127.0.0.1', () => resolve( { server, port: server.address().port } ) );
	} );
}

/**
 * The in-page measurement. Runs inside the browser against whichever page is loaded; every
 * page in this harness exposes the same window.__drawAt(t) contract.
 */
/* eslint-disable no-undef */
async function inPage( { frames, warmup, loopMs } ) {
	const out = { errors: [] };
	const canvas = document.querySelector( 'canvas' );
	if ( ! canvas ) { out.errors.push( 'no canvas' ); return out; }

	// getContext returns the EXISTING context for a matching type, so this is the effect's own
	// live context — not a second one.
	const gl = canvas.getContext( 'webgl2' ) || canvas.getContext( 'webgl' );
	if ( ! gl ) { out.errors.push( 'no gl context' ); return out; }

	out.backingStore = { width: canvas.width, height: canvas.height };
	out.megapixels = ( canvas.width * canvas.height ) / 1e6;
	out.cssSize = { width: canvas.clientWidth, height: canvas.clientHeight };
	out.devicePixelRatio = window.devicePixelRatio;
	out.capability = window.__capability || null;

	const dbg = gl.getExtension( 'WEBGL_debug_renderer_info' );
	out.gpu = dbg
		? { renderer: gl.getParameter( dbg.UNMASKED_RENDERER_WEBGL ), vendor: gl.getParameter( dbg.UNMASKED_VENDOR_WEBGL ) }
		: { renderer: gl.getParameter( gl.RENDERER ), vendor: gl.getParameter( gl.VENDOR ) };

	// ── Draw-call counting on THIS context (leg C's honest denominator) ──────────────────
	let drawCalls = 0;
	const origElements = gl.drawElements.bind( gl );
	const origArrays = gl.drawArrays.bind( gl );
	gl.drawElements = ( ...a ) => { drawCalls++; return origElements( ...a ); };
	gl.drawArrays = ( ...a ) => { drawCalls++; return origArrays( ...a ); };

	if ( typeof window.__drawAt !== 'function' ) { out.errors.push( 'no __drawAt' ); return out; }

	// ── LEG C — live rAF loop health ─────────────────────────────────────────────────────
	// MUST run FIRST, while the module's own rAF loop is still going. Stopping the loop before
	// observing it would measure an idle page and report a flawless 60fps for anything.
	// Only the Stripe rig owns a real loop; the other pages report null rather than a
	// fabricated figure.
	if ( typeof window.__stop === 'function' ) {
		const drawsBefore = drawCalls;
		const stamps = [];
		await new Promise( ( resolve ) => {
			const start = performance.now();
			const tick = () => {
				stamps.push( performance.now() );
				if ( performance.now() - start < loopMs ) requestAnimationFrame( tick );
				else resolve();
			};
			requestAnimationFrame( tick );
		} );
		const gaps = [];
		for ( let i = 1; i < stamps.length; i++ ) gaps.push( stamps[ i ] - stamps[ i - 1 ] );
		const drawCallsInWindow = drawCalls - drawsBefore;
		out.liveLoop = {
			observedMs: loopMs,
			rafTicks: stamps.length,
			drawCallsDuringWindow: drawCallsInWindow,
			// The rig draws every 2nd frame and issues 2 GL draw calls per drawn frame (wave
			// mesh + fullscreen quad), or 1 with ?nopost. Reported raw so the ratio can be
			// checked against the source rather than assumed.
			drawCallsPerRafTick: drawCallsInWindow / stamps.length,
			meanIntervalMs: mean( gaps ),
			medianIntervalMs: median( gaps ),
			p95IntervalMs: percentile( gaps, 95 ),
			longFramesOver20ms: gaps.filter( ( g ) => g > 20 ).length,
			effectiveFps: 1000 / mean( gaps ),
		};
		// NOW stop it, so legs A and B are not fighting the live loop for GPU time.
		window.__stop();
		await new Promise( ( r ) => setTimeout( r, 100 ) );
	} else {
		out.liveLoop = null;
	}

	// ── LEG A — GPU time via timer query, if the browser exposes it ──────────────────────
	const tq = gl.getExtension( 'EXT_disjoint_timer_query_webgl2' );
	if ( ! tq ) {
		out.gpuTimer = { available: false, note: 'EXT_disjoint_timer_query_webgl2 not exposed — Chrome gates this by default. No substitute figure invented.' };
	} else {
		const samples = [];
		for ( let i = 0; i < 60; i++ ) {
			const q = gl.createQuery();
			gl.beginQuery( tq.TIME_ELAPSED_EXT, q );
			window.__drawAt( 2.0 + i * 0.01 );
			gl.endQuery( tq.TIME_ELAPSED_EXT );
			gl.finish();
			// Spin briefly for the result; skip the sample if it never arrives.
			let ready = false;
			for ( let s = 0; s < 200 && ! ready; s++ ) {
				ready = gl.getQueryParameter( q, gl.QUERY_RESULT_AVAILABLE );
				if ( ! ready ) await new Promise( ( r ) => setTimeout( r, 1 ) );
			}
			const disjoint = gl.getParameter( tq.GPU_DISJOINT_EXT );
			if ( ready && ! disjoint ) samples.push( gl.getQueryParameter( q, gl.QUERY_RESULT ) / 1e6 );
			gl.deleteQuery( q );
		}
		out.gpuTimer = samples.length
			? {
				available: true,
				samples: samples.length,
				medianMs: median( samples ),
				meanMs: mean( samples ),
				p95Ms: percentile( samples, 95 ),
				minMs: Math.min( ...samples ),
				maxMs: Math.max( ...samples ),
			}
			: { available: true, samples: 0, note: 'extension present but every sample was disjoint or never resolved' };
	}

	// ── LEG B — BATCHED wall-clock, as an independent check on leg A ─────────────────────
	// The first version of this leg timed each draw individually and returned 0.00ms for
	// EVERYTHING, including a glClear-only negative control. Cause: Chrome clamps
	// performance.now() to 100us, and real frame times here are 0.06-1.1ms — at or below the
	// clock's resolution. Per-draw timing cannot see them.
	//
	// Batching N draws between two timestamps puts the total (tens of ms) far above the clamp,
	// and the per-frame figure falls out of the division. One gl.finish() before the batch
	// drains prior work; one after forces the GPU to actually complete it.
	//
	// This exists to CORROBORATE leg A by a different mechanism. Two independent methods
	// agreeing is the evidence standard; one number on its own is not.
	//
	// ⚠ gl.finish() ALONE IS NOT A STALL on this stack. The first batched attempt used it and
	// reported 0.015ms where the GPU timer said 0.375ms — a 25x disagreement. Under ANGLE/D3D11
	// finish() flushes the command queue rather than blocking until completion. A 1x1
	// readPixels() is a genuine synchronous read-back and does force the GPU to finish.
	const drawCallsBeforeLegB = drawCalls;
	const BATCH = 60;
	const batches = [];
	const px = new Uint8Array( 4 );
	const stall = () => { gl.finish(); gl.readPixels( 0, 0, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, px ); };
	let seq = 0;
	for ( let b = 0; b < Math.max( 1, Math.floor( frames / BATCH ) ); b++ ) {
		stall();
		const t0 = performance.now();
		for ( let i = 0; i < BATCH; i++ ) window.__drawAt( 2.0 + ( seq++ ) * 0.005 );
		stall();
		batches.push( ( performance.now() - t0 ) / BATCH );
	}
	// Discard the first batch wholesale — it carries shader compile and texture upload.
	const kept = batches.length > 1 ? batches.slice( 1 ) : batches;
	out.throughput = {
		method: 'batched: ' + BATCH + ' draws per timed block, one gl.finish() either side',
		batches: batches.length,
		batchSize: BATCH,
		warmupBatchesDiscarded: batches.length > 1 ? 1 : 0,
		firstBatchMsPerFrame: batches[ 0 ],
		meanMs: mean( kept ),
		medianMs: median( kept ),
		p95Ms: percentile( kept, 95 ),
		minMs: Math.min( ...kept ),
		maxMs: Math.max( ...kept ),
	};
	// GL draw calls issued per __drawAt() call — 2 for the two-pass rig, 1 with ?nopost.
	// Measured, so the pass structure is confirmed rather than assumed from reading the source.
	out.drawCallsPerDraw = ( drawCalls - drawCallsBeforeLegB ) / frames;

	function mean( a ) { return a.reduce( ( s, v ) => s + v, 0 ) / a.length; }
	function median( a ) { const s = [ ...a ].sort( ( x, y ) => x - y ); return s[ Math.floor( s.length / 2 ) ]; }
	function percentile( a, p ) { const s = [ ...a ].sort( ( x, y ) => x - y ); return s[ Math.min( s.length - 1, Math.floor( s.length * p / 100 ) ) ]; }

	return out;
}
/* eslint-enable no-undef */

const CONFIGS = [
	{ id: 'genbg-dpr1', label: 'Generative background — §1-§6, DPR 1', url: 'scripts/perf/generative-background-perf.html?w=1393&h=761&dpr=1', dpr: 1 },
	{ id: 'genbg-dpr2', label: 'Generative background — §1-§6, requested DPR 2 (capped to 1.5)', url: 'scripts/perf/generative-background-perf.html?w=1393&h=761&dpr=2', dpr: 2 },
	{ id: 'negative-control', label: 'NEGATIVE CONTROL — glClear only', url: 'scripts/perf/negative-control.html?w=1393&h=761&dpr=1', dpr: 1 },
];

const { server, port } = await startServer();
const base = `http://127.0.0.1:${ port }/`;

const browser = await chromium.launch( {
	headless: false,
	// Real GPU. Note the ABSENCE of --ignore-gpu-blocklist: see header note 1.
	args: [ '--use-angle=default', '--enable-gpu', '--enable-webgl' ],
} );

const results = {};
const meta = {
	generated: new Date().toISOString(),
	browserVersion: browser.version(),
	launchArgs: [ '--use-angle=default', '--enable-gpu', '--enable-webgl' ],
	ignoreGpuBlocklist: false,
	framesPerLeg: argFrames,
	warmupDiscarded: WARMUP,
	canvasCssBox: '1393x761 (the Stripe rig\'s own box; FR-38-31 harness matched to it)',
};

for ( const cfg of CONFIGS ) {
	process.stdout.write( `\n▶ ${ cfg.id } … ` );
	const ctx = await browser.newContext( {
		viewport: { width: 1440, height: 900 },
		deviceScaleFactor: cfg.dpr,
	} );
	const page = await ctx.newPage();
	const problems = [];
	page.on( 'console', ( m ) => { if ( m.type() === 'error' ) problems.push( 'console: ' + m.text() ); } );
	page.on( 'pageerror', ( e ) => problems.push( 'pageerror: ' + e.message ) );

	try {
		await page.goto( base + cfg.url, { waitUntil: 'load', timeout: 60000 } );
		await page.waitForFunction( () => window.__ready === true, { timeout: 30000 } );
		// NB: the rAF loop is deliberately left RUNNING here — leg C observes it, then stops it
		// itself before legs A and B. Stopping it out here would make leg C measure an idle page.
		const r = await page.evaluate( inPage, { frames: argFrames, warmup: WARMUP, loopMs: LOOP_MS } );
		r.label = cfg.label;
		r.requestedDpr = cfg.dpr;
		r.url = cfg.url;
		r.pageProblems = problems;
		if ( r.gpuTimer && typeof r.gpuTimer.medianMs === 'number' ) {
			r.msPerMegapixel = r.gpuTimer.medianMs / r.megapixels;
		}
		results[ cfg.id ] = r;
		process.stdout.write(
			( r.gpuTimer && typeof r.gpuTimer.medianMs === 'number' )
				? `GPU ${ r.gpuTimer.medianMs.toFixed( 3 ) } ms/frame  (${ r.megapixels.toFixed( 2 ) } MP)`
				: `FAILED: ${ ( r.errors || [] ).join( '; ' ) }`
		);
	} catch ( e ) {
		results[ cfg.id ] = { error: e.message, pageProblems: problems, label: cfg.label };
		process.stdout.write( `ERROR: ${ e.message.split( '\n' )[ 0 ] }` );
	}
	await ctx.close();
}

await browser.close();
server.close();

// ── Derived figures ─────────────────────────────────────────────────────────────────────────
// PRIMARY metric is the GPU timer query (leg A): it measures GPU execution directly. The
// batched wall-clock (leg B) is the independent corroboration, not the headline.
const derived = {};
const g = ( id ) => ( results[ id ] && results[ id ].gpuTimer && typeof results[ id ].gpuTimer.medianMs === 'number' )
	? results[ id ].gpuTimer.medianMs
	: null;
const wall = ( id ) => ( results[ id ] && results[ id ].throughput ) ? results[ id ].throughput.medianMs : null;

// Do the two independent methods agree? If they diverge wildly, neither is trustworthy.
derived.methodAgreement = {};
for ( const id of Object.keys( results ) ) {
	const a = g( id ), b = wall( id );
	if ( a !== null && b !== null && a > 0 ) {
		derived.methodAgreement[ id ] = { gpuTimerMs: a, batchedWallMs: b, ratio: b / a };
	}
}

// This engine has no post-pass (§7 is out of scope, D874) and no Stripe rig
// to compare against, so the postPassCost/stripeVsFr3831 derivations from the
// original harness are gone — they would only ever report null here.
if ( g( 'genbg-dpr1' ) !== null ) {
	// Acceptance criterion from the technique spec's "Acceptance criteria"
	// section: §1-§6 combined stays under 300 μs/frame on a reference rig.
	derived.acceptanceThresholdMs = 0.3;
	derived.underAcceptanceThreshold_dpr1 = g( 'genbg-dpr1' ) < derived.acceptanceThresholdMs;
}

// ── Controls ────────────────────────────────────────────────────────────────────────────────
const controls = {};
if ( g( 'genbg-dpr1' ) !== null && g( 'genbg-dpr2' ) !== null ) {
	controls.positive = {
		test: 'DPR 2 (capped to 1.5 by this engine\'s own resize()) must cost measurably more than DPR 1 on a fillrate-bound effect',
		dpr1Ms: g( 'genbg-dpr1' ),
		dpr2Ms: g( 'genbg-dpr2' ),
		ratio: g( 'genbg-dpr2' ) / g( 'genbg-dpr1' ),
		pass: g( 'genbg-dpr2' ) > g( 'genbg-dpr1' ) * 1.2,
	};
}
if ( g( 'negative-control' ) !== null && g( 'genbg-dpr1' ) !== null ) {
	controls.negative = {
		test: 'a glClear-only page must cost far less than the real effect; if it does not, the harness is measuring itself',
		clearOnlyMs: g( 'negative-control' ),
		realEffectMs: g( 'genbg-dpr1' ),
		ratio: g( 'genbg-dpr1' ) / g( 'negative-control' ),
		pass: g( 'negative-control' ) < g( 'genbg-dpr1' ) * 0.25,
	};
}

const payload = { meta, controls, derived, results };
fs.writeFileSync( path.join( HERE, 'frame-cost.json' ), JSON.stringify( payload, null, 2 ) );

// ── Report ──────────────────────────────────────────────────────────────────────────────────
console.log( '\n\n' + '='.repeat( 78 ) );
console.log( 'Q6 — PER-FRAME COST' );
console.log( '='.repeat( 78 ) );
console.log( `browser        : ${ meta.browserVersion }` );
const anyGpu = Object.values( results ).find( ( r ) => r && r.gpu );
console.log( `gpu            : ${ anyGpu ? anyGpu.gpu.renderer : 'unknown' }` );
console.log( `blocklist      : NOT bypassed (no --ignore-gpu-blocklist)` );
console.log( `frames/leg     : ${ argFrames } (first ${ WARMUP } discarded)\n` );

console.log( 'PRIMARY metric = GPU timer query (EXT_disjoint_timer_query_webgl2), median of 60.' );
console.log( 'Batched wall-clock is the independent corroboration, not the headline.\n' );

console.log( 'config'.padEnd( 22 ) + 'backing'.padEnd( 12 ) + 'MP'.padEnd( 6 ) + 'GPU med'.padEnd( 11 ) + 'GPU p95'.padEnd( 11 ) + 'ms/MP'.padEnd( 8 ) + 'wall' );
console.log( '-'.repeat( 78 ) );
for ( const [ id, r ] of Object.entries( results ) ) {
	if ( ! r || ! r.gpuTimer || typeof r.gpuTimer.medianMs !== 'number' ) {
		console.log( id.padEnd( 22 ) + 'FAILED — ' + ( r && ( r.error || ( r.errors || [] ).join( ';' ) ) ) );
		continue;
	}
	console.log(
		id.padEnd( 22 ) +
		`${ r.backingStore.width }x${ r.backingStore.height }`.padEnd( 12 ) +
		r.megapixels.toFixed( 2 ).padEnd( 6 ) +
		( r.gpuTimer.medianMs.toFixed( 3 ) + 'ms' ).padEnd( 11 ) +
		( r.gpuTimer.p95Ms.toFixed( 3 ) + 'ms' ).padEnd( 11 ) +
		r.msPerMegapixel.toFixed( 3 ).padEnd( 8 ) +
		( r.throughput ? r.throughput.medianMs.toFixed( 3 ) + 'ms' : '—' )
	);
}

console.log( '\nLIVE LOOP (leg C — measured while the module\'s own rAF loop was running)' );
console.log( '-'.repeat( 78 ) );
for ( const [ id, r ] of Object.entries( results ) ) {
	if ( ! r || ! r.liveLoop ) continue;
	const l = r.liveLoop;
	console.log(
		id.padEnd( 22 ) +
		`${ l.rafTicks } ticks / ${ ( l.observedMs / 1000 ) }s  ` +
		`interval ${ l.medianIntervalMs.toFixed( 1 ) }ms (${ l.effectiveFps.toFixed( 0 ) }Hz)  ` +
		`drawcalls ${ l.drawCallsDuringWindow }  >20ms: ${ l.longFramesOver20ms }`
	);
}

console.log( '\nCONTROLS' );
console.log( '-'.repeat( 78 ) );
for ( const [ k, c ] of Object.entries( controls ) ) {
	console.log( `${ k.padEnd( 10 ) } ${ c.pass ? 'PASS' : '*** FAIL ***' }  ratio ${ Number.isFinite( c.ratio ) ? c.ratio.toFixed( 2 ) + 'x' : 'n/a' }  — ${ c.test }` );
}

console.log( '\nDERIVED' );
console.log( '-'.repeat( 78 ) );
for ( const [ k, v ] of Object.entries( derived ) ) {
	if ( k === 'methodAgreement' ) continue;
	console.log( `${ k.padEnd( 28 ) } ${ typeof v === 'number' ? v.toFixed( 4 ) : v }` );
}

console.log( '\nMETHOD AGREEMENT (batched wall-clock / GPU timer — near 1.0 means they concur)' );
console.log( '-'.repeat( 78 ) );
for ( const [ k, v ] of Object.entries( derived.methodAgreement || {} ) ) {
	console.log( `${ k.padEnd( 22 ) } gpu ${ v.gpuTimerMs.toFixed( 3 ) }ms  wall ${ v.batchedWallMs.toFixed( 3 ) }ms  ratio ${ v.ratio.toFixed( 2 ) }` );
}

console.log( `\nwritten        : perf/frame-cost.json` );
