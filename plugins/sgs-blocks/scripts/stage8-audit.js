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
 * work. ONE Lighthouse run therefore yields all three reports — see
 * `lib/stage8-report-builders.js` for the pure extraction/severity logic (kept
 * separate so this file stays under the repo's 250-line limit and so --self-test can
 * exercise that logic without a browser).
 *
 * `lighthouse` and `chrome-launcher` are both native ESM packages (`"type":
 * "module"`); this script stays CommonJS to match every sibling script in this
 * directory, so both are loaded via a dynamic `import()` rather than converting the
 * whole file to ESM.
 *
 * NOT WIRED INTO `prebuild` (deliberately) — it needs a live URL + a real Chrome
 * launch; a gate that silently passes when the target is unreachable is worse than
 * no gate (see `check-device-toggle.js`'s identical rationale). Run on demand via
 * `npm run audit:stage8 -- --url <url>` or in a separate CI lane with network access.
 *
 * USAGE
 *   node scripts/stage8-audit.js --url <url> [--viewport mobile|desktop] [--runs N]
 *                                 [--allow-domains a.com,b.com] [--ignore-patterns "regex1,regex2"]
 *   node scripts/stage8-audit.js --url <url> --check     # exit 1 on any "critical" severity
 *   node scripts/stage8-audit.js --self-test              # proves the severity logic can fail
 *
 * @package SGS\Blocks
 */
'use strict';

const fs = require( 'fs' );
const path = require( 'path' );
const {
	worstSeverity,
	buildCwvReport,
	buildNetworkReport,
	buildConsoleReport,
} = require( './lib/stage8-report-builders.js' );

const CHECK_MODE = process.argv.includes( '--check' );
const SELF_TEST = process.argv.includes( '--self-test' );

const REPORTS_ROOT = path.resolve( __dirname, '../reports' );

// ---------------------------------------------------------------------------
// CLI parsing
// ---------------------------------------------------------------------------
function printUsage() {
	process.stdout.write( `
stage8-audit.js — Core Web Vitals + network + console audit from ONE Lighthouse run.

Usage:
  node scripts/stage8-audit.js --url <url> [options]

Options:
  --url <url>               Required. A live, publicly reachable page.
  --viewport mobile|desktop  Default: mobile (Lighthouse mobile is the Google ranking signal).
  --runs <n>                 Default: 1. Runs Lighthouse N times; reports use the LAST run.
  --allow-domains <a,b,c>    Comma-separated hosts suppressed from the network error/blocked lists.
  --ignore-patterns <r1,r2>  Comma-separated regex source strings suppressing known console noise.
  --check                    Exit non-zero if overall severity is "critical". Needs a live URL — do NOT wire into prebuild.
  --self-test                 Proves the severity/extraction logic against fixture data. No network, no browser.
` );
}

function parseArgs( argv ) {
	const args = {
		url: null,
		viewport: 'mobile',
		runs: 1,
		allowDomains: [],
		ignorePatterns: [],
	};
	for ( let i = 0; i < argv.length; i++ ) {
		const a = argv[ i ];
		if ( a === '--url' ) {
			args.url = argv[ ++i ];
		} else if ( a === '--viewport' ) {
			args.viewport = argv[ ++i ];
		} else if ( a === '--runs' ) {
			args.runs = parseInt( argv[ ++i ], 10 );
		} else if ( a === '--allow-domains' ) {
			args.allowDomains = argv[ ++i ].split( ',' ).map( ( s ) => s.trim() ).filter( Boolean );
		} else if ( a === '--ignore-patterns' ) {
			args.ignorePatterns = argv[ ++i ].split( ',' ).map( ( s ) => s.trim() ).filter( Boolean );
		}
	}
	if ( ! [ 'mobile', 'desktop' ].includes( args.viewport ) ) args.viewport = 'mobile';
	if ( ! Number.isFinite( args.runs ) || args.runs < 1 ) args.runs = 1;
	return args;
}

// ---------------------------------------------------------------------------
// Run-id — timestamp-derived, plus a short slug of the URL host. Deterministic
// given an explicit `now` (self-test never uses Date.now() directly, per the
// dispatch brief — it always passes a fixed Date).
// ---------------------------------------------------------------------------
function slugifyHost( url ) {
	try {
		const host = new URL( url ).hostname.toLowerCase();
		return host.replace( /[^a-z0-9]+/g, '-' ).replace( /^-+|-+$/g, '' ) || 'unknown-host';
	} catch ( e ) {
		return 'unknown-host';
	}
}

function makeRunId( url, now ) {
	const pad = ( n ) => String( n ).padStart( 2, '0' );
	const stamp =
		`${ now.getFullYear() }${ pad( now.getMonth() + 1 ) }${ pad( now.getDate() ) }-` +
		`${ pad( now.getHours() ) }${ pad( now.getMinutes() ) }${ pad( now.getSeconds() ) }`;
	return `${ stamp }-${ slugifyHost( url ) }`;
}

// ---------------------------------------------------------------------------
// Lighthouse orchestration (real network/browser path — never exercised by
// --self-test).
// ---------------------------------------------------------------------------
async function runLighthouse( { url, viewport, runs } ) {
	let launch;
	let lighthouse;
	try {
		( { launch } = await import( 'chrome-launcher' ) );
		lighthouse = ( await import( 'lighthouse' ) ).default;
	} catch ( err ) {
		throw new Error(
			`lighthouse/chrome-launcher failed to load (${ err.message }). Run "npm install" in plugins/sgs-blocks first.`
		);
	}

	let desktopConfig;
	if ( viewport === 'desktop' ) {
		desktopConfig = ( await import( 'lighthouse/core/config/desktop-config.js' ) ).default;
	}

	let chrome;
	try {
		chrome = await launch( { chromeFlags: [ '--headless=new', '--disable-gpu', '--no-sandbox' ] } );
	} catch ( err ) {
		// Requirement #8: never a silent pass — an explicit, unambiguous message.
		throw new Error(
			`Chrome/Chromium is unavailable — cannot run Lighthouse (${ err.message }). ` +
				'Install Google Chrome or Chromium, or set the CHROME_PATH environment variable to its binary.'
		);
	}

	try {
		let lhr = null;
		for ( let i = 0; i < runs; i++ ) {
			const result = await lighthouse(
				url,
				{ port: chrome.port, output: 'json', logLevel: 'error' },
				desktopConfig
			);
			if ( ! result || ! result.lhr ) {
				throw new Error( `Lighthouse run ${ i + 1 }/${ runs } against ${ url } returned no result.` );
			}
			lhr = result.lhr;
		}
		return lhr;
	} finally {
		await chrome.kill();
	}
}

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

function printSummary( label, report ) {
	process.stdout.write( `\n-- ${ label } (${ report.severity.toUpperCase() }) --\n` );
	process.stdout.write( JSON.stringify( report, null, 2 ) + '\n' );
}

// ---------------------------------------------------------------------------
async function main() {
	const args = parseArgs( process.argv.slice( 2 ) );
	if ( ! args.url ) {
		printUsage();
		process.stderr.write( '\n--url is required.\n' );
		process.exitCode = 1;
		return;
	}

	let lhr;
	try {
		lhr = await runLighthouse( args );
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

	process.exitCode = CHECK_MODE && overall === 'critical' ? 1 : 0;
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
