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
 * Modules (lib/): config.mjs (paths and constants), args.mjs (flags and credentials), stats.mjs (median, percentile,
 * summary), recorder.mjs (the script injected into the editor canvas), editor-session.mjs (opening the editor, one
 * timed run, the content hash and the deployed version), output.mjs (run summary and baseline comparison).
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
 *    HEADLINE STATISTIC: the median of the p95s of consecutive 10-second windows (p95Ms). The plain whole-run p95 is
 *    kept as p95WholeRunMs. On a shared machine a burst of outside load lands in one or two windows and the median
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
 * 7. FRAME PUMP: an empty requestAnimationFrame loop runs in the canvas for the whole run (see lib/recorder.mjs). It
 *    trades a little realism (Chrome is never idle between keystrokes) for a repeatable number: without it five
 *    identical runs ranged 11.3 to 16.5 ms median latency; with it they agreed within 5%. The same pump is on for the
 *    baseline and for every comparison, so the difference between two measurements is still the editor's own cost.
 *
 * 8. RECORDED VERSIONS: meta.harnessCommit is the commit of the checkout this script runs from (`git rev-parse HEAD`),
 *    which is not the code being measured. meta.deployedPluginVersion is the SGS_BLOCKS_VERSION that the live site
 *    serves, read from the editor page (lib/editor-session.mjs::fetchDeployedPluginVersion). Baselines written before
 *    the split recorded the harness commit as meta.gitCommit; --compare reads that key when harnessCommit is absent.
 *
 * ── --ab ───────────────────────────────────────────────────────────────────────────────────────────────────────
 * The `sgs_motion_support_enabled` filter (`includes/motion/support-registration.php`) is server code, so --ab takes two
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
import { createRequire } from 'node:module';
import { execFileSync } from 'node:child_process';
import { REPO_ROOT, TARGET_TEXT_INDEX } from './lib/config.mjs';
import { parseArgs, readEnv } from './lib/args.mjs';
import { summaryOf } from './lib/stats.mjs';
import { printSummary, compareToBaseline } from './lib/output.mjs';
import { measureRun, fetchContentHash, fetchDeployedPluginVersion } from './lib/editor-session.mjs';

const require = createRequire( import.meta.url );
const wpSession = require( path.join( REPO_ROOT, 'scripts', 'lib', 'wp-session.js' ) );

async function measureSlot( context, url, opts, label, discarded ) {
	for ( let attempt = 0; ; attempt++ ) {
		const res = await measureRun( context, url, opts, label );
		if ( res.run.maxMs <= opts.stallMs ) return res;
		if ( attempt >= opts.stallRetries ) { res.run.stalled = true; return res; }
		console.log( `${ label }: worst keystroke ${ res.run.maxMs } ms > ${ opts.stallMs } ms, treated as a machine stall; re-running (p95 was ${ res.run.p95Ms } ms)` );
		discarded.push( { label, attempt: attempt + 1, p95Ms: res.run.p95Ms, maxMs: res.run.maxMs, heapBytes: res.run.heapBytes } );
	}
}

/** The deployed commit recorded in build-deploy.py's `~/.sgs-deploy-marker-<target>.json`, or 'unknown'. */
function deployedCommit( target ) {
	const raw = tryExec( 'ssh', [ '-i', path.join( process.env.USERPROFILE || process.env.HOME || '', '.ssh', 'id_ed25519' ), '-p', '65002', 'u945238940@141.136.39.73', `cat .sgs-deploy-marker-${ target }.json` ] );
	try {
		const marker = JSON.parse( raw || '' );
		return marker.commit ? `${ marker.commit } (${ marker.at })` : 'unknown';
	} catch ( e ) {
		return 'unknown';
	}
}

function tryExec( cmd, args ) {
	try { return execFileSync( cmd, args, { encoding: 'utf8', timeout: 30000, cwd: REPO_ROOT } ).trim(); } catch ( e ) { return null; }
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

		const deployedPluginVersion = await fetchDeployedPluginVersion( context, env, args.page );
		if ( 'unknown' === deployedPluginVersion ) console.warn( 'WARNING: sgs-extensions-editor stylesheet not found on the editor page; deployedPluginVersion recorded as "unknown"' );
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
			harnessCommit: tryExec( 'git', [ 'rev-parse', 'HEAD' ] ),
			// The commit build-deploy.py last shipped to this target, from the marker it writes on the server: the code being measured.
			deployedCommit: deployedCommit( args.deployTarget ),
			deployedPluginVersion,
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
			printSummary( summary, { runs: r.runs.length, page: args.page, out: args.out } );
			if ( args.compare ) {
				const baseline = JSON.parse( fs.readFileSync( args.compare, 'utf8' ) );
				const baselineCommit = baseline.meta.harnessCommit ?? baseline.meta.gitCommit;
				if ( compareToBaseline( summary, baseline, `COMPARE against ${ args.compare } (baseline commit ${ baselineCommit })` ) && 0 === exitCode ) exitCode = 1;
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
				const asBaseline = { meta: { harnessCommit: 'A side of this run' }, summary: sa };
				if ( compareToBaseline( sb, asBaseline, 'A/B: B (second side) against A' ) && 0 === exitCode ) exitCode = 1;
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
