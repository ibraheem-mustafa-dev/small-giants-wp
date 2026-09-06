/**
 * stage8-audit.js — Stage 8 runtime audit: Core Web Vitals + network + console, in
 * ONE Lighthouse run.
 *
 * WHY THIS EXISTS
 * ----------------
 * The SGS clone pipeline (Spec 20, Stage 11.6 computed-parity) is strong on visual
 * diff and computed-style parity, but has ZERO runtime-health monitoring — no Core
 * Web Vitals, no console-error capture, no network-failure detection, on any deploy.
 * This script closes that gap.
 *
 * `.claude/plans/strategy/chrome-devtools-stage-8-integration.md` designed this as
 * THREE scripts each "calling" an `mcp__…chrome-devtools__*` tool. Both are wrong
 * for a shippable script: (1) MCP tools are invoked by an AI agent inside a Claude
 * session — a standalone Node script cannot call one, so it needs a real runnable
 * mechanism (`lighthouse` + `chrome-launcher`) instead; (2) Lighthouse's own
 * `errors-in-console` and `network-requests` audits already cover two of the three
 * report types, so building bespoke scripts for them would duplicate Google's own
 * work. ONE Lighthouse run therefore yields all three reports.
 *
 * This file is deliberately thin — CLI parsing lives in `lib/stage8-cli.js`, browser
 * orchestration in `lib/stage8-lighthouse.js`, and the pure severity/extraction
 * logic (+ --self-test) in `lib/stage8-report-builders.js` / `lib/stage8-self-test.js`
 * — all so this file, and each of them, stays under the repo's 250-line limit, and
 * so --self-test can exercise the severity logic without a browser.
 *
 * SEVERITY LEVELS (worst to best): error > critical > warn > pass. `error` means the
 * MEASUREMENT failed (nav failure, missing/errored Lighthouse audit, empty network
 * log) — never coerced into "pass". `critical` means the page loaded and something
 * on it genuinely failed. See `lib/stage8-report-builders.js`'s header for the full
 * rationale.
 *
 * DELIBERATE EXTENSION BEYOND THE SOURCE BRIEF: a blocked/cancelled network request
 * (no HTTP response at all) is treated as at least `warn`, even though the brief
 * only specified 404/4xx thresholds — a request that never got a response is a real
 * signal worth surfacing, not a silent no-op.
 *
 * NOT WIRED INTO `prebuild` (deliberately) — it needs a live URL + a real Chrome
 * launch; a gate that silently passes when the target is unreachable is worse than
 * no gate (see `check-device-toggle.js`'s identical rationale). Run on demand via
 * `npm run audit:stage8 -- --url <url>` or in a separate CI lane with network access.
 *
 * USAGE
 *   node scripts/stage8-audit.js --url <url> [--viewport mobile|desktop] [--runs N]
 *                                 [--allow-domains a.com,b.com] [--ignore-patterns "regex1,regex2"]
 *   node scripts/stage8-audit.js --url <url> --check     # exit 1 on "critical" OR "error" severity
 *   node scripts/stage8-audit.js --self-test              # proves the severity logic can fail
 *
 * @package SGS\Blocks
 */
'use strict';

const fs = require( 'fs' );
const path = require( 'path' );
const { printUsage, parseArgs, makeRunId } = require( './lib/stage8-cli.js' );
const { runLighthouse } = require( './lib/stage8-lighthouse.js' );
const { worstSeverity, medianLhr, buildCwvReport } = require( './lib/stage8-report-builders.js' );
const { buildNetworkReport, buildConsoleReport } = require( './lib/stage8-network-console-builders.js' );

const CHECK_MODE = process.argv.includes( '--check' );
const SELF_TEST = process.argv.includes( '--self-test' );

const REPORTS_ROOT = path.resolve( __dirname, '../reports' );

// ---------------------------------------------------------------------------
// Report writing
// ---------------------------------------------------------------------------
function writeReport( subdir, runId, data ) {
	const dir = path.join( REPORTS_ROOT, subdir );
	fs.mkdirSync( dir, { recursive: true } );
	const file = path.join( dir, `${ runId }.json` );
	fs.writeFileSync( file, JSON.stringify( data, null, 2 ) + '\n' );
	return file;
}

// M6: a bad page can carry hundreds of network/console entries — dumping the full
// JSON to stdout is unbounded. Print a short summary line; the written report file
// holds the detail.
function printSummary( label, report ) {
	const bits = [];
	if ( 'lcp_ms' in report ) bits.push( `LCP ${ report.lcp_ms ?? 'n/a' }ms`, `CLS ${ report.cls ?? 'n/a' }` );
	if ( 'total_requests' in report ) {
		bits.push( `${ report.total_requests } requests`, `${ report.errors.length } errors`, `${ report.blocked.length } blocked`, `${ report.slow.length } slow` );
	}
	if ( 'errors' in report && 'warnings' in report && ! ( 'total_requests' in report ) ) {
		bits.push( `${ report.errors.length } errors`, `${ report.warnings.length } warnings` );
	}
	const suffix = bits.length > 0 ? ` — ${ bits.join( ', ' ) }` : '';
	process.stdout.write( `-- ${ label } (${ report.severity.toUpperCase() })${ suffix } --\n` );
}

// ---------------------------------------------------------------------------
async function main() {
	const args = parseArgs( process.argv.slice( 2 ) );
	if ( ! args.url ) {
		printUsage();
		process.stderr.write( '\n--url is required (and must parse as a valid URL).\n' );
		process.exitCode = 1;
		return;
	}

	let lhr;
	try {
		const lhrs = await runLighthouse( args );
		lhr = medianLhr( lhrs ); // I6: median of the CWV metrics across --runs (identity when runs=1).
	} catch ( err ) {
		process.stderr.write( `[stage8-audit] FATAL: ${ err.message }\n` );
		process.exitCode = 1;
		return;
	}

	const runId = makeRunId( args.url, new Date() );
	const cwv = buildCwvReport( lhr, args.url, args.viewport );
	const network = buildNetworkReport( lhr, args.url, { allowDomains: args.allowDomains } );
	const consoleReport = buildConsoleReport( lhr, args.url, { ignorePatterns: args.ignorePatterns } );
	const overall = worstSeverity( cwv.severity, network.severity, consoleReport.severity );

	const cwvFile = writeReport( 'cwv', runId, cwv );
	const networkFile = writeReport( 'network', runId, network );
	const consoleFile = writeReport( 'console', runId, consoleReport );

	process.stdout.write( `\n=== stage8-audit — ${ args.url } (${ args.viewport }) ===\n` );
	printSummary( 'Core Web Vitals', cwv );
	printSummary( 'Network', network );
	printSummary( 'Console', consoleReport );
	process.stdout.write( `\nWritten:\n  ${ cwvFile }\n  ${ networkFile }\n  ${ consoleFile }\n` );
	process.stdout.write( `\nOVERALL SEVERITY: ${ overall.toUpperCase() }\n` );

	// CRITICAL 1 fix: "error" (measurement failed — nav failure, missing audit,
	// empty network log) must fail the gate exactly like "critical" does. The
	// original code only checked `=== 'critical'`, so a page that never loaded
	// reported OVERALL PASS and exit 0.
	process.exitCode = CHECK_MODE && ( overall === 'critical' || overall === 'error' ) ? 1 : 0;
}

// ---------------------------------------------------------------------------
if ( SELF_TEST ) {
	const { runSelfTest } = require( './lib/stage8-self-test.js' );
	process.exitCode = runSelfTest( makeRunId ) ? 0 : 1;
} else {
	main().catch( ( e ) => {
		process.stderr.write( `[stage8-audit] FATAL: ${ e.stack || e.message }\n` );
		process.exitCode = 2;
	} );
}
