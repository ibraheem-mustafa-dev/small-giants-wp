/**
 * FR-38A-29 — editor typing performance: p95 keystroke-to-paint latency and JS heap after a minute of typing
 * on a 200-block page in the real block editor.
 *
 * Usage (from plugins/sgs-blocks):
 *   node scripts/perf/measure-editor-typing.mjs                                  (5 runs on the baseline page)
 *   node scripts/perf/measure-editor-typing.mjs --out scripts/perf/editor-typing-baseline.json
 *   node scripts/perf/measure-editor-typing.mjs --compare scripts/perf/editor-typing-baseline.json
 *   node scripts/perf/measure-editor-typing.mjs --ab --a-url <editorUrl> --b-url <editorUrl>
 *
 * Flags
 *   --page <id>          page to open in the editor (default 5196, the 200-block fixture built from fixtures/editor-200-blocks.json)
 *   --runs <n>           measured runs (default 5)
 *   --warmup <n>         extra runs measured first and discarded (default 2: the first boots of a session are colder, latency fell 20% over the first four unwarmed runs)
 *   --duration <s>       seconds of typing per run (default 60; the committed baseline uses 60)
 *   --interval <ms>      base gap between keystrokes (default 50, plus 0-16.7 ms of seeded jitter; about 15 keys per second, roughly 900 samples per minute)
 *   --out <file>         write the full result JSON here (default scripts/perf/editor-typing-latest.json)
 *   --compare <file>     compare this run's medians with a baseline file; exit 1 if p95 or heap exceeds it by more than 10%
 *   --no-frame-pump      do not run the empty requestAnimationFrame loop (choice 7 below); results are not comparable with a pumped baseline
 *   --stall-ms <ms>      a run whose worst keystroke exceeds this is a machine stall, not editor typing cost, and is re-run (default 400)
 *   --stall-retries <n>  re-runs allowed per slot before the stalled run is kept and flagged (default 2)
 *   --ab                 A/B mode, see below
 *   --a-url / --b-url    editor URLs for A and B (--ab); both default to the --page editor URL
 *   --no-effect-check    skip the "toggle has no detectable effect" test in --ab
 *   --env-file / --env-key   credentials (default .claude/secrets/sandybrown.env, key SANDYBROWN)
 *   --headless           run headless (default headed: the host's edge challenges headless browsers under load)
 *   --wp-version <v>     record this WP version instead of asking the host over SSH
 *
 * Exit codes: 0 ok / within tolerance, 1 over tolerance (--compare) or an A/B regression, 2 --ab toggle has no
 * detectable effect, 3 editor or harness failure.
 *
 * ── Deliberate choices, each with its reason ───────────────────────────────────────────────────────────────
 *
 * 1. LATENCY = keystroke to the first paint after the keystroke, measured INSIDE the editor canvas iframe.
 *    A capture-phase `keydown` listener takes `event.timeStamp` (the moment Chrome created the event, on the same
 *    clock as performance.now()) as the start. It schedules requestAnimationFrame; the frame callback then posts a
 *    MessageChannel message, and that message's task runs after the frame's style, layout and paint have finished.
 *    The end is that message's performance.now(). Why not the alternatives:
 *      - Event Timing (PerformanceObserver 'event') is the browser's own number but rounds to 8 ms and, with the
 *        smallest allowed durationThreshold (16 ms), drops every fast event, so a p95 over it is a p95 of the slow
 *        tail only. It is recorded as corroboration (slowEvents), never the headline.
 *      - A plain double requestAnimationFrame measures frame cadence, not the input; it is a constant ~33 ms.
 *    The listener lives in the iframe because that is where the typed block renders; a top-window observer cannot
 *    see iframe events.
 *
 *    HEADLINE STATISTIC: the median of the p95s of consecutive 10-second windows (p95Ms). The plain whole-run p95 is kept
 *    as p95WholeRunMs. On a shared machine a burst of outside load lands in one or two windows and the median
 *    ignores them (whole-run p95 ranged 14.9 to 26.3 ms over five identical runs); a real per-keystroke cost
 *    raises every window, so the median still moves with it.
 *
 * 2. HEAP = Runtime.getHeapUsage after HeapProfiler.collectGarbage, read through CDP once the minute ends.
 *    performance.memory is quantised and moves with GC timing; a forced collection first makes the number
 *    reproducible. The un-collected reading is kept too (heapRawBytes) for reference. The editor and its canvas
 *    iframe are same-origin, so one isolate covers both.
 *
 * 3. NOTHING IS SAVED. Every request that writes to the REST API is aborted by a route (counted in
 *    blockedWrites), because Gutenberg autosaves a draft by updating the post itself after about a minute. The
 *    page is closed with runBeforeUnload:false so no "leave site?" prompt appears and no typed text reaches the
 *    post. After all runs the post content is fetched and its hash compared with the hash taken before the first
 *    run; a mismatch fails the harness.
 *
 * 4. ITS OWN browser (real Chrome, channel 'chrome'), one tab per run, a fresh tab per run (so sessionStorage
 *    autosave backups from a previous run cannot raise a "restore" prompt), fixed 1440x900 viewport, and
 *    background-throttling switches off so a window that loses focus does not skew requestAnimationFrame.
 *
 * 5. The typed block is the 13th sgs/text that sits directly inside an sgs/container, clicked and moved to the end
 *    of its text, so every run types into the same block on the same page.
 *
 * 6. The fixture (fixtures/editor-200-blocks.json) authors 120 blocks; each of its 16 sgs/info-box blocks creates five
 *    inner blocks when the editor loads (icon, heading, text, multi-button, button), so the editor holds exactly 200
 *    (`getGlobalBlockCount`, recorded per run as blockCount). Rebuild the page with
 *    `SGS_HEADED=1 node scripts/wp-build-page.js --env-file .claude/secrets/sandybrown.env --env-key SANDYBROWN
 *     --tree plugins/sgs-blocks/scripts/perf/fixtures/editor-200-blocks.json --post-id <id> --status draft`.
 *
 * 7. FRAME PUMP: an empty requestAnimationFrame loop runs in the canvas for the whole run (see installRecorder). It
 *    trades a little realism (Chrome is never idle between keystrokes) for a repeatable number: without it five
 *    identical runs ranged 11.3 to 16.5 ms median latency; with it they agreed within 5%. The same pump is on for the
 *    baseline and for every comparison, so the difference between two measurements is still the editor's own cost.
 *
 * ── --ab ───────────────────────────────────────────────────────────────────────────────────────────────────────
 * The `sgs_motion_support_enabled` filter does not exist yet, and a toggle needs server code, so --ab takes two
 * editor URLs and interleaves A, B, A, B ... (cancelling drift in the host or the machine). To flip a filter
 * without editing the theme, give B a query argument that a small mu-plugin maps onto the filter, for example
 *   --b-url "<site>/wp-admin/post.php?post=5196&action=edit&sgs_motion_support_enabled=0"
 * (the mu-plugin is the site owner's; this script only sends the URL). Detectable effect: after each editor boot
 * the harness reads the union of attribute names registered by every sgs/ block; if A and B register the same
 * set, the toggle did nothing, so it prints "filter not present on this site" and exits 2. Use --no-effect-check
 * to compare two pages or two builds whose registered attributes are meant to be identical. --runs is the count
 * per side. B regresses when its median p95 or median heap exceeds A's by more than 10%.
 */

import { chromium } from 'playwright';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { createRequire } from 'node:module';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname( fileURLToPath( import.meta.url ) );
const REPO = path.resolve( HERE, '../../../..' );
const require = createRequire( import.meta.url );
const wpSession = require( path.join( REPO, 'scripts', 'lib', 'wp-session.js' ) );

const TOLERANCE = 0.10;
const WINDOW_MS = 10000;
const DEFAULT_PAGE = '5196';
const TARGET_TEXT_INDEX = 12; // zero-based: the 13th sgs/text that sits directly in an sgs/container, in document order

function parseArgs( argv ) {
	const a = {
		page: DEFAULT_PAGE, runs: 5, warmup: 2, duration: 60, interval: 50,
		out: path.join( HERE, 'editor-typing-latest.json' ), compare: null, ab: false,
		stallMs: 400, stallRetries: 2, noPump: false, aUrl: null, bUrl: null, effectCheck: true, headless: false, wpVersion: null,
		envFile: path.join( REPO, '.claude', 'secrets', 'sandybrown.env' ), envKey: 'SANDYBROWN',
	};
	const num = ( v ) => Number( v );
	for ( let i = 2; i < argv.length; i++ ) {
		const k = argv[ i ];
		if ( k === '--page' ) a.page = argv[ ++i ];
		else if ( k === '--runs' ) a.runs = Math.max( 1, num( argv[ ++i ] ) | 0 );
		else if ( k === '--warmup' ) a.warmup = Math.max( 0, num( argv[ ++i ] ) | 0 );
		else if ( k === '--duration' ) a.duration = Math.max( 1, num( argv[ ++i ] ) );
		else if ( k === '--interval' ) a.interval = Math.max( 20, num( argv[ ++i ] ) );
		else if ( k === '--out' ) a.out = path.resolve( argv[ ++i ] );
		else if ( k === '--compare' ) a.compare = path.resolve( argv[ ++i ] );
		else if ( k === '--no-frame-pump' ) a.noPump = true;
		else if ( k === '--stall-ms' ) a.stallMs = num( argv[ ++i ] );
		else if ( k === '--stall-retries' ) a.stallRetries = Math.max( 0, num( argv[ ++i ] ) | 0 );
		else if ( k === '--ab' ) a.ab = true;
		else if ( k === '--a-url' ) a.aUrl = argv[ ++i ];
		else if ( k === '--b-url' ) a.bUrl = argv[ ++i ];
		else if ( k === '--no-effect-check' ) a.effectCheck = false;
		else if ( k === '--headless' ) a.headless = true;
		else if ( k === '--wp-version' ) a.wpVersion = argv[ ++i ];
		else if ( k === '--env-file' ) a.envFile = path.resolve( argv[ ++i ] );
		else if ( k === '--env-key' ) a.envKey = argv[ ++i ];
		else { console.error( `unknown argument ${ k }` ); process.exit( 3 ); }
	}
	return a;
}

function readEnv( file, key ) {
	const out = {};
	for ( const line of fs.readFileSync( file, 'utf8' ).split( /\r?\n/ ) ) {
		const m = line.match( /^([A-Z0-9_]+)=(.*)$/ );
		if ( m ) out[ m[ 1 ] ] = m[ 2 ].trim().replace( /^["']|["']$/g, '' );
	}
	const url = out[ `WP_URL_${ key }` ], user = out[ `WP_USER_${ key }` ], pwd = out[ `WP_PWD_${ key }` ];
	if ( ! url || ! user || ! pwd ) throw new Error( `WP_URL_/WP_USER_/WP_PWD_${ key } missing from ${ file }` );
	return { url: url.replace( /\/+$/, '' ), user, pwd };
}

const median = ( xs ) => { const s = [ ...xs ].sort( ( p, q ) => p - q ); const n = s.length; return n % 2 ? s[ ( n - 1 ) / 2 ] : ( s[ n / 2 - 1 ] + s[ n / 2 ] ) / 2; };
const percentile = ( xs, p ) => { const s = [ ...xs ].sort( ( a, b ) => a - b ); return s[ Math.min( s.length - 1, Math.ceil( ( p / 100 ) * s.length ) - 1 ) ]; };
const r2 = ( x ) => Math.round( x * 100 ) / 100;
function summarise( values ) {
	const med = median( values );
	const lo = Math.min( ...values ), hi = Math.max( ...values );
	const r4 = ( x ) => Math.round( x * 10000 ) / 10000;
	return { median: r2( med ), min: r2( lo ), max: r2( hi ), spread: r4( ( hi - lo ) / med ) };
}

/** Recorder installed in the canvas iframe. Runs in the page. */
/* eslint-disable no-undef */
function installRecorder( pump ) {
	const rec = { lat: [], latT: [], idle: [], slowEvents: [], longTasks: 0, keys: 0 };
	let lastT0 = 0;
	// Frame pump: an empty requestAnimationFrame loop keeps Chrome producing frames at the display rate for the whole
	// run. Without it Chrome produces frames on demand and the wake-up path varied from boot to boot (median
	// keystroke latency 11.3 to 16.5 ms across identical runs, spread 54% with the CPU probe flat at 33-35 ms);
	// with it five runs agreed within 5%. Cadence is recorded (frameIntervalMs) so a baseline taken at one refresh
	// rate is not compared with a run at another.
	rec.raf = [];
	if ( pump ) {
		let lastRaf = 0;
		const loop = ( t ) => { if ( lastRaf ) rec.raf.push( t - lastRaf ); lastRaf = t; requestAnimationFrame( loop ); };
		requestAnimationFrame( loop );
	}
	window.__typingRec = rec;
	document.addEventListener( 'keydown', ( e ) => {
		if ( ! e.isTrusted ) return;
		rec.keys++;
		const t0 = e.timeStamp;
		lastT0 = t0;
		requestAnimationFrame( () => {
			const ch = new MessageChannel();
			ch.port1.onmessage = () => { rec.lat.push( performance.now() - t0 ); rec.latT.push( t0 ); ch.port1.close(); };
			ch.port2.postMessage( 0 );
		} );
	}, true );
	// Main-thread turnaround: keydown to the first task after the input event has been fully dispatched (every
	// handler plus the synchronous React render ran). Unlike the paint figure it does not wait for the next vsync.
	document.addEventListener( 'input', ( e ) => {
		if ( ! e.isTrusted ) return;
		const t0 = lastT0;
		const ch = new MessageChannel();
		ch.port1.onmessage = () => { rec.idle.push( performance.now() - t0 ); ch.port1.close(); };
		ch.port2.postMessage( 0 );
	}, true );
	try {
		new PerformanceObserver( ( list ) => {
			for ( const en of list.getEntries() ) if ( 'keydown' === en.name || 'input' === en.name || 'keypress' === en.name ) rec.slowEvents.push( en.duration );
		} ).observe( { type: 'event', durationThreshold: 16, buffered: true } );
		new PerformanceObserver( ( list ) => { rec.longTasks += list.getEntries().length; } ).observe( { type: 'longtask', buffered: true } );
	} catch ( e ) { /* Event Timing or Long Tasks unavailable: the headline latency does not depend on them */ }
}

async function bootEditor( context, editorUrl, writeCounter ) {
	const page = await context.newPage();
	await page.route( /\/wp-json\/|[?&]rest_route=/, ( route ) => {
		const m = route.request().method();
		if ( 'GET' === m || 'HEAD' === m || 'OPTIONS' === m ) return route.continue();
		writeCounter.n++;
		return route.abort();
	} );
	await page.goto( editorUrl, { waitUntil: 'domcontentloaded', timeout: 120000 } );
	await page.waitForFunction( () => window.wp && window.wp.data && window.wp.blocks &&
		window.wp.data.select( 'core/editor' ) && window.wp.data.select( 'core/editor' ).getCurrentPostId() &&
		window.wp.data.select( 'core/block-editor' ).getGlobalBlockCount() > 0, { timeout: 120000 } );
	await page.evaluate( () => {
		// The welcome guide and the autosave interval would both interfere; neither changes the typing path.
		const prefs = window.wp.data.dispatch( 'core/preferences' );
		if ( prefs ) { prefs.set( 'core/edit-post', 'welcomeGuide', false ); prefs.set( 'core/edit-post', 'fullscreenMode', false ); }
	} );
	await page.waitForFunction( () => !! document.querySelector( 'iframe[name="editor-canvas"]' ), { timeout: 60000 } );
	const frame = page.frame( { name: 'editor-canvas' } );
	await frame.waitForFunction( () => document.querySelectorAll( '[data-type="sgs/text"]' ).length > 30, { timeout: 120000 } );
	await page.waitForTimeout( 3000 ); // let async-mode block rendering and the editor's own startup work settle
	return { page, frame };
}

async function measureRun( context, editorUrl, opts, label ) {
	const writeCounter = { n: 0 };
	const { page, frame } = await bootEditor( context, editorUrl, writeCounter );
	try {
		const blockCount = await page.evaluate( () => window.wp.data.select( 'core/block-editor' ).getGlobalBlockCount() );
		const attrSignature = await page.evaluate( () => {
			const names = new Set();
			window.wp.blocks.getBlockTypes().filter( ( b ) => b.name.startsWith( 'sgs/' ) ).forEach( ( b ) => Object.keys( b.attributes || {} ).forEach( ( k ) => names.add( k ) ) );
			return [ ...names ].sort();
		} );
		const targetId = await page.evaluate( ( idx ) => {
			const flat = [];
			const walk = ( bs ) => bs.forEach( ( b ) => { flat.push( b ); walk( b.innerBlocks ); } );
			walk( window.wp.data.select( 'core/block-editor' ).getBlocks() );
			const se = window.wp.data.select( 'core/block-editor' );
			const texts = flat.filter( ( b ) => 'sgs/text' === b.name && 'sgs/container' === ( se.getBlockName( se.getBlockRootClientId( b.clientId ) ) ) );
			return texts[ idx ] ? texts[ idx ].clientId : null;
		}, TARGET_TEXT_INDEX );
		if ( ! targetId ) throw new Error( 'the fixture has fewer sgs/text blocks than the typing target needs' );

		const editable = frame.locator( `[data-block="${ targetId }"][contenteditable="true"]` ).first();
		await editable.scrollIntoViewIfNeeded();
		await editable.click();
		await page.keyboard.press( 'Control+End' );
		await frame.evaluate( installRecorder, ! opts.noPump );

		const cpuProbe = async () => page.evaluate( () => {
			const times = [];
			for ( let k = 0; k < 7; k++ ) {
				const t = performance.now();
				let acc = 0;
				for ( let i = 1; i < 6000000; i++ ) acc += Math.sqrt( i ) % 7;
				times.push( performance.now() - t );
				if ( acc < 0 ) return -1;
			}
			return Math.min( ...times );
		} );
		const cpuBefore = await cpuProbe();
		const cdp = await context.newCDPSession( page );
		await cdp.send( 'HeapProfiler.enable' );
		await cdp.send( 'HeapProfiler.collectGarbage' );
		const heapBefore = ( await cdp.send( 'Runtime.getHeapUsage' ) ).usedSize;

		// Typed text and key timing are deterministic (seeded). Each gap is the interval plus 0-16.7 ms of jitter, so
		// keystrokes land at every phase of the 60 Hz frame; a fixed interval would sit at one phase for a whole run and
		// shift the latency distribution from run to run for reasons that have nothing to do with the editor.
		const words = [ 'steady', 'planning', 'saves', 'time', 'clear', 'pages', 'help', 'visitors', 'find', 'answers', 'quickly', 'and', 'calmly' ];
		const text = words.join( ' ' ) + ' ';
		let seed = 0x9e3779b9;
		const rand = () => { seed = ( seed + 0x6d2b79f5 ) | 0; let t = Math.imul( seed ^ ( seed >>> 15 ), 1 | seed ); t = ( t + Math.imul( t ^ ( t >>> 7 ), 61 | t ) ) ^ t; return ( ( t ^ ( t >>> 14 ) ) >>> 0 ) / 4294967296; };
		const started = Date.now();
		let nextAt = started;
		for ( let i = 0; Date.now() - started < opts.duration * 1000; i++ ) {
			await page.keyboard.type( text[ i % text.length ] );
			nextAt += opts.interval + rand() * 16.7;
			const wait = nextAt - Date.now();
			if ( wait > 0 ) await new Promise( ( r ) => setTimeout( r, wait ) );
		}
		await page.waitForTimeout( 500 ); // let the last keystroke's paint report

		const rec = await frame.evaluate( () => window.__typingRec );
		const heapRaw = ( await cdp.send( 'Runtime.getHeapUsage' ) ).usedSize;
		await cdp.send( 'HeapProfiler.collectGarbage' );
		const heap = ( await cdp.send( 'Runtime.getHeapUsage' ) ).usedSize;
		await cdp.detach().catch( () => {} );
		const cpuAfter = await cpuProbe();

		if ( rec.lat.length < 20 ) throw new Error( `only ${ rec.lat.length } keystroke latencies recorded` );
		// Headline: the median of the p95s of consecutive 10-second windows. A bursty slowdown from outside the editor
		// (another process on a shared machine) lands in one or two windows and the median ignores them; a real
		// per-keystroke cost moves every window. The plain whole-run p95 is kept as p95WholeRunMs.
		const t00 = rec.latT[ 0 ];
		const windows = [];
		for ( let i = 0; i < rec.lat.length; i++ ) {
			const w = Math.floor( ( rec.latT[ i ] - t00 ) / WINDOW_MS );
			( windows[ w ] = windows[ w ] || [] ).push( rec.lat[ i ] );
		}
		const windowP95s = windows.filter( ( w ) => w && w.length >= 20 ).map( ( w ) => r2( percentile( w, 95 ) ) );
		const run = {
			label,
			p95Ms: r2( median( windowP95s ) ),
			p95WholeRunMs: r2( percentile( rec.lat, 95 ) ),
			windowP95sMs: windowP95s,
			medianMs: r2( median( rec.lat ) ),
			maxMs: r2( Math.max( ...rec.lat ) ),
			idleP95Ms: r2( percentile( rec.idle, 95 ) ),
			idleMedianMs: r2( median( rec.idle ) ),
			keystrokes: rec.lat.length,
			frameIntervalMs: rec.raf.length ? r2( median( rec.raf ) ) : null,
			cpuProbeBeforeMs: r2( cpuBefore ),
			cpuProbeAfterMs: r2( cpuAfter ),
			heapBytes: heap,
			heapRawBytes: heapRaw,
			heapBeforeBytes: heapBefore,
			slowEvents: rec.slowEvents.length,
			longTasks: rec.longTasks,
			blockCount,
			blockedWrites: writeCounter.n,
		};
		return { run, attrSignature };
	} finally {
		await page.close( { runBeforeUnload: false } ).catch( () => {} );
	}
}

async function fetchContentHash( context, env, pageId ) {
	const page = await context.newPage();
	try {
		await page.goto( `${ env.url }/wp-admin/post.php?post=${ pageId }&action=edit`, { waitUntil: 'domcontentloaded', timeout: 120000 } );
		await page.waitForFunction( () => window.wp && window.wp.apiFetch && window.wpApiSettings, { timeout: 120000 } );
		const raw = await page.evaluate( async ( id ) => ( await window.wp.apiFetch( { path: `/wp/v2/pages/${ id }?context=edit` } ) ).content.raw, pageId );
		return crypto.createHash( 'sha256' ).update( raw ).digest( 'hex' );
	} finally {
		await page.close( { runBeforeUnload: false } ).catch( () => {} );
	}
}

/**
 * One measured slot. A run whose slowest keystroke exceeds --stall-ms is a stall of the machine or the browser's
 * compositor (seen: a single 1017 ms paint gap with five ordinary long tasks), not the per-keystroke cost this
 * script exists to compare, so it is repeated; every discarded attempt is listed in the output. A regression that
 * really stalls typing stalls every attempt, so after --stall-retries the last run is kept with stalled:true and the
 * comparison sees it.
 */
async function measureSlot( context, url, opts, label, discarded ) {
	for ( let attempt = 0; ; attempt++ ) {
		const res = await measureRun( context, url, opts, label );
		if ( res.run.maxMs <= opts.stallMs ) return res;
		if ( attempt >= opts.stallRetries ) { res.run.stalled = true; return res; }
		console.log( `${ label }: worst keystroke ${ res.run.maxMs } ms > ${ opts.stallMs } ms, treated as a machine stall; re-running (p95 was ${ res.run.p95Ms } ms)` );
		discarded.push( { label, attempt: attempt + 1, p95Ms: res.run.p95Ms, maxMs: res.run.maxMs, heapBytes: res.run.heapBytes } );
	}
}

function tryExec( cmd, args ) {
	try { return execFileSync( cmd, args, { encoding: 'utf8', timeout: 30000, cwd: REPO } ).trim(); } catch ( e ) { return null; }
}

function summaryOf( runs ) {
	const fi = runs.map( ( r ) => r.frameIntervalMs ).filter( ( x ) => x );
	return { p95Ms: summarise( runs.map( ( r ) => r.p95Ms ) ), heapBytes: summarise( runs.map( ( r ) => r.heapBytes ) ), frameIntervalMs: fi.length ? r2( median( fi ) ) : null };
}

function compareToBaseline( summary, baseline, label, typingSeconds ) {
	const bp = baseline.summary.p95Ms.median, bh = baseline.summary.heapBytes.median;
	const dp = summary.p95Ms.median / bp - 1, dh = summary.heapBytes.median / bh - 1;
	console.log( `\n${ label }` );
	console.log( `  p95 latency : now ${ summary.p95Ms.median } ms   baseline ${ bp } ms   change ${ ( dp * 100 ).toFixed( 1 ) }%   ${ dp > TOLERANCE ? '*** OVER 10% ***' : 'ok' }` );
	console.log( `  heap (GC'd) : now ${ ( summary.heapBytes.median / 1048576 ).toFixed( 2 ) } MiB   baseline ${ ( bh / 1048576 ).toFixed( 2 ) } MiB   change ${ ( dh * 100 ).toFixed( 1 ) }%   ${ dh > TOLERANCE ? '*** OVER 10% ***' : 'ok' }` );
	return dp > TOLERANCE || dh > TOLERANCE;
}

async function main() {
	const args = parseArgs( process.argv );
	const env = readEnv( args.envFile, args.envKey );
	const defaultUrl = `${ env.url }/wp-admin/post.php?post=${ encodeURIComponent( args.page ) }&action=edit`;
	if ( args.ab && ( args.aUrl || args.bUrl ) && ! ( args.aUrl && args.bUrl ) ) { console.error( '--ab needs both --a-url and --b-url (or neither, to use --page for both)' ); process.exit( 3 ); }

	const browser = await chromium.launch( {
		channel: 'chrome',
		headless: args.headless,
		args: [ '--disable-backgrounding-occluded-windows', '--disable-renderer-backgrounding', '--disable-background-timer-throttling', '--no-default-browser-check' ],
	} );
	const context = await browser.newContext( { ignoreHTTPSErrors: true, viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1 } );
	context.on( 'dialog', ( d ) => ( 'beforeunload' === d.type() ? d.accept() : d.dismiss() ).catch( () => {} ) );
	let exitCode = 0;
	try {
		const loginPage = await context.newPage();
		await wpSession.ensureLoggedIn( loginPage, env, 120000 );
		await loginPage.close();

		const hashBefore = await fetchContentHash( context, env, args.page );
		const chromeVersion = browser.version();
		const sides = args.ab ? [ { id: 'A', url: args.aUrl || defaultUrl }, { id: 'B', url: args.bUrl || defaultUrl } ] : [ { id: 'run', url: defaultUrl } ];
		const results = Object.fromEntries( sides.map( ( s ) => [ s.id, { runs: [], signatures: [] } ] ) );

		const discarded = [];
		for ( let i = 0; i < args.warmup; i++ ) {
			for ( const s of sides ) { // discarded; also proves the page boots before the timed runs start
				const { run } = await measureRun( context, s.url, args, `warmup-${ s.id }-${ i + 1 }` );
				console.log( `warm-up ${ s.id } ${ i + 1 }: p95 ${ run.p95Ms } ms, heap ${ ( run.heapBytes / 1048576 ).toFixed( 1 ) } MiB (discarded)` );
			}
		}
		for ( let i = 0; i < args.runs; i++ ) {
			for ( const s of sides ) {
				const { run, attrSignature } = await measureSlot( context, s.url, args, `${ s.id }-${ i + 1 }`, discarded );
				results[ s.id ].runs.push( run );
				results[ s.id ].signatures.push( attrSignature.join( ',' ) );
				console.log( `${ s.id } ${ i + 1 }/${ args.runs }: p95 ${ run.p95Ms } ms [windows ${ run.windowP95sMs.join( '/' ) }, whole-run ${ run.p95WholeRunMs }] cpu probe ${ run.cpuProbeBeforeMs }/${ run.cpuProbeAfterMs } ms (median ${ run.medianMs }, max ${ run.maxMs }), idle p95 ${ run.idleP95Ms } (median ${ run.idleMedianMs }), ${ run.keystrokes } keys, heap ${ ( run.heapBytes / 1048576 ).toFixed( 2 ) } MiB (raw ${ ( run.heapRawBytes / 1048576 ).toFixed( 2 ) }), long tasks ${ run.longTasks }, blocks ${ run.blockCount }, blocked writes ${ run.blockedWrites }` );
			}
		}

		const hashAfter = await fetchContentHash( context, env, args.page );
		const untouched = hashBefore === hashAfter;
		if ( ! untouched ) { console.error( '[FAIL] the page content changed during the runs: something saved typed text' ); exitCode = 3; }

		const meta = {
			date: new Date().toISOString(),
			pageId: Number( args.page ),
			siteUrl: env.url,
			wpVersion: args.wpVersion || tryExec( 'ssh', [ '-i', path.join( process.env.USERPROFILE || process.env.HOME || '', '.ssh', 'id_ed25519' ), '-p', '65002', 'u945238940@141.136.39.73', `cd domains/${ env.url.replace( /^https?:\/\//, '' ) }/public_html && wp core version` ] ),
			gitCommit: tryExec( 'git', [ 'rev-parse', 'HEAD' ] ),
			chromeVersion,
			headless: args.headless,
			viewport: '1440x900',
			typingSeconds: args.duration,
			keystrokeIntervalMs: `${ args.interval } + seeded jitter 0-16.7`,
			warmupRunsDiscarded: args.warmup,
			targetBlock: `sgs/text #${ TARGET_TEXT_INDEX + 1 } directly inside an sgs/container, in document order`,
			latencyMethod: 'keydown event.timeStamp to the MessageChannel task posted from the next requestAnimationFrame callback, inside the editor canvas iframe',
			heapMethod: 'CDP Runtime.getHeapUsage after HeapProfiler.collectGarbage, read at the end of the typing minute',
			postContentUnchanged: untouched,
			stallMs: args.stallMs,
			stallRetries: args.stallRetries,
			stallRunsDiscarded: discarded,
		};

		if ( ! args.ab ) {
			const r = results.run;
			const summary = summaryOf( r.runs );
			const payload = { meta, runs: r.runs, summary };
			fs.writeFileSync( args.out, JSON.stringify( payload, null, 2 ) + '\n' );
			console.log( `\nSUMMARY over ${ r.runs.length } runs (page ${ args.page }):` );
			console.log( `  p95 latency : median ${ summary.p95Ms.median } ms  min ${ summary.p95Ms.min }  max ${ summary.p95Ms.max }  spread ${ ( summary.p95Ms.spread * 100 ).toFixed( 1 ) }%` );
			console.log( `  heap (GC'd) : median ${ ( summary.heapBytes.median / 1048576 ).toFixed( 2 ) } MiB  min ${ ( summary.heapBytes.min / 1048576 ).toFixed( 2 ) }  max ${ ( summary.heapBytes.max / 1048576 ).toFixed( 2 ) }  spread ${ ( summary.heapBytes.spread * 100 ).toFixed( 1 ) }%` );
			console.log( `  written to ${ args.out }` );
			if ( args.compare ) {
				const baseline = JSON.parse( fs.readFileSync( args.compare, 'utf8' ) );
				if ( compareToBaseline( summary, baseline, `COMPARE against ${ args.compare } (baseline commit ${ baseline.meta.gitCommit })`, args.duration ) && 0 === exitCode ) exitCode = 1;
			}
		} else {
			const sigA = new Set( results.A.signatures ), sigB = new Set( results.B.signatures );
			const identical = sigA.size === 1 && sigB.size === 1 && [ ...sigA ][ 0 ] === [ ...sigB ][ 0 ];
			const sa = summaryOf( results.A.runs ), sb = summaryOf( results.B.runs );
			fs.writeFileSync( args.out, JSON.stringify( { meta, A: { url: sides[ 0 ].url, runs: results.A.runs, summary: sa }, B: { url: sides[ 1 ].url, runs: results.B.runs, summary: sb }, toggleHadEffect: ! identical }, null, 2 ) + '\n' );
			if ( args.effectCheck && identical ) {
				console.error( '\nNotice: filter not present on this site, or the toggle has no effect. A and B registered exactly the same sgs/ block attributes, so the two sides ran identical code and the comparison below proves nothing. Exiting 2 (use --no-effect-check to compare two pages or builds on purpose).' );
				exitCode = 2;
			} else {
				const asBaseline = { meta: { gitCommit: 'A side of this run' }, summary: sa };
				if ( compareToBaseline( sb, asBaseline, 'A/B: B (second side) against A', args.duration ) && 0 === exitCode ) exitCode = 1;
			}
		}
	} catch ( e ) {
		console.error( `[FAIL] ${ e && e.stack || e }` );
		exitCode = 3;
	} finally {
		await browser.close().catch( () => {} );
	}
	process.exit( exitCode );
}

main();
