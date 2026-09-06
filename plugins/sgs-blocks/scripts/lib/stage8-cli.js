/**
 * stage8-cli.js — CLI parsing + run-id helpers for stage8-audit.js, split out purely
 * to keep stage8-audit.js under the repo's 250-line limit. No browser, no network —
 * `makeRunId` is deterministic given an explicit `now` (never calls `Date.now()`
 * itself) so --self-test can prove it without touching the clock.
 *
 * @package SGS\Blocks
 */
'use strict';

function printUsage() {
	process.stdout.write( `
stage8-audit.js — Core Web Vitals + network + console audit from ONE Lighthouse run.

Usage:
  node scripts/stage8-audit.js --url <url> [options]

Options:
  --url <url>               Required. A live, publicly reachable page.
  --viewport mobile|desktop  Default: mobile (Lighthouse mobile is the Google ranking signal).
  --runs <n>                 Default: 1. Runs Lighthouse N times; CWV metrics (LCP/CLS/INP/TBT/FCP)
                              use the MEDIAN across runs (Lighthouse's own recommendation for
                              stability). Network/console reports use the LAST run. --runs 1 is
                              byte-identical to not passing the flag at all.
  --allow-domains <a,b,c>    Comma-separated hosts suppressed from the network error/blocked lists
                              (EXACT hostname match only — list every subdomain explicitly, no
                              wildcard/suffix matching).
  --ignore-patterns <r1,r2>  Comma-separated regex source strings suppressing known console noise.
  --check                    Exit non-zero if overall severity is "critical" OR "error". Needs a
                              live URL — do NOT wire into prebuild.
  --self-test                 Proves the severity/extraction logic against fixture data. No network, no browser.

Severity: error (worst) > critical > warn > pass. "error" means the measurement itself
failed (nav failure, missing Lighthouse audit, empty network log) — distinct from
"critical", which means the page loaded and something on it genuinely failed.

Deliberate extension beyond the source brief: a blocked/cancelled network request
(no HTTP response) is treated as at least "warn".
` );
}

/** True for a bare value token — false for anything flag-shaped (`--foo`) or absent.
 * M7: `--url --check` previously silently set `url = '--check'`; every option that
 * takes a value now runs through this before being accepted. */
function isValueToken( v ) {
	return typeof v === 'string' && v.length > 0 && ! v.startsWith( '--' );
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
		const next = argv[ i + 1 ];
		if ( a === '--url' && isValueToken( next ) ) {
			args.url = next;
			i++;
		} else if ( a === '--viewport' && isValueToken( next ) ) {
			args.viewport = next;
			i++;
		} else if ( a === '--runs' && isValueToken( next ) ) {
			args.runs = parseInt( next, 10 );
			i++;
		} else if ( a === '--allow-domains' && isValueToken( next ) ) {
			args.allowDomains = next.split( ',' ).map( ( s ) => s.trim() ).filter( Boolean );
			i++;
		} else if ( a === '--ignore-patterns' && isValueToken( next ) ) {
			args.ignorePatterns = next.split( ',' ).map( ( s ) => s.trim() ).filter( Boolean );
			i++;
		}
	}
	// M7: reject a URL that is really a leftover flag token or otherwise malformed —
	// isValueToken already rules out `--`-prefixed values; the URL constructor check
	// catches anything else that cannot possibly be a live, fetchable page.
	if ( args.url !== null ) {
		try {
			new URL( args.url );
		} catch ( e ) {
			args.url = null;
		}
	}
	if ( ! [ 'mobile', 'desktop' ].includes( args.viewport ) ) args.viewport = 'mobile';
	if ( ! Number.isFinite( args.runs ) || args.runs < 1 ) args.runs = 1;
	return args;
}

// ---------------------------------------------------------------------------
// Run-id — timestamp-derived, plus a short slug of the URL host.
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

module.exports = { printUsage, isValueToken, parseArgs, slugifyHost, makeRunId };
