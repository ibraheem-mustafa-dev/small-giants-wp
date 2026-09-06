/**
 * stage8-network-console-builders.js — network + console report builders for
 * stage8-audit.js. CWV builder + the shared LHR helpers (`hasRuntimeError`,
 * `auditErrored`, `auditItems`, `hostnameOf`) live in the sibling
 * `stage8-report-builders.js` (split purely to keep both files under the repo's
 * 250-line limit — see that file's header for the full "why a separate module" and
 * `error`-severity rationale, which applies here identically).
 *
 * `blocked.length > 0 -> warn` (network severity) is a deliberate extension beyond
 * the source brief — a blocked/cancelled request never got an HTTP response at all,
 * which is worse-than-silent than a 4xx the site owner can see in server logs, so it
 * is treated as at least a warning even though the brief only specified 404s/4xx.
 *
 * `info_count` is always `null`, not `0` — Lighthouse's public LHR does not expose
 * the raw non-error console buffer (`console.log`/`console.info`), so a literal `0`
 * would be indistinguishable from "measured and confirmed zero". `null` documents
 * "not measurable" honestly instead of fabricating a number.
 *
 * Console `critical` counts ONLY genuine JS exceptions (`source !== 'network'`).
 * Lighthouse's `errors-in-console` audit reports failed network requests (a missing
 * favicon, a blocked third-party script) as console errors with `source: "network"`
 * — those are already the NETWORK report's job; counting them again here turned a
 * missing favicon into a build-blocking CRITICAL on the live canary. The entries stay
 * visible in `errors[]` (they are real) — only the severity classification excludes
 * them.
 *
 * @package SGS\Blocks
 */
'use strict';

const { auditItems, hostnameOf, hasRuntimeError, auditErrored } = require( './stage8-report-builders.js' );

const SLOW_REQUEST_MS = 3000;

// ---------------------------------------------------------------------------
// Network
// ---------------------------------------------------------------------------

/** A request with statusCode 0/-1 (or explicitly unfinished) never reached a real
 * HTTP response — Lighthouse/DevTools' signature for a blocked/cancelled/aborted
 * request, as opposed to a 4xx/5xx which DID get a response. `-1` is Lighthouse's
 * marker for some failed requests and previously fell through both buckets (M3). */
function isBlockedItem( item ) {
	return item.statusCode === 0 || item.statusCode === -1 || item.finished === false;
}

function isErrorItem( item ) {
	return typeof item.statusCode === 'number' && item.statusCode >= 400;
}

/** critical: any font 404, OR any document/script/stylesheet 4xx OR 5xx (I2 — the
 * original rule excluded 5xx entirely, so a main-document 500 or a stylesheet 503
 * scored PASS). warn: an image 404, or any blocked/cancelled request (see file
 * header — a deliberate extension). */
function classifyNetworkSeverity( errors, blocked ) {
	const font404 = errors.some( ( e ) => e.status === 404 && /font/i.test( e.type || '' ) );
	const documentScriptOrStylesheetError = errors.some(
		( e ) => e.status >= 400 && /document|script|stylesheet/i.test( e.type || '' )
	);
	if ( font404 || documentScriptOrStylesheetError ) return 'critical';
	const image404 = errors.some( ( e ) => e.status === 404 && /image/i.test( e.type || '' ) );
	if ( image404 || blocked.length > 0 ) return 'warn';
	return 'pass';
}

/**
 * @param {object} lhr
 * @param {string} url
 * @param {{allowDomains?: string[]}} [opts] `allowDomains` suppresses matching
 *   third-party hosts from the errors/blocked lists (they still count toward
 *   `total_requests`). Exact-hostname match only (no wildcard/subdomain matching) —
 *   list every subdomain you want suppressed explicitly.
 */
function buildNetworkReport( lhr, url, opts ) {
	const { allowDomains = [] } = opts || {};

	// Fail closed: a navigation failure or a missing/errored network-requests audit
	// means "we could not measure the page", not "the page has no network activity".
	if ( hasRuntimeError( lhr ) || auditErrored( lhr, 'network-requests' ) ) {
		return { url, total_requests: 0, errors: [], blocked: [], slow: [], severity: 'error' };
	}

	const items = auditItems( lhr, 'network-requests' );

	// An empty network log on a real page is impossible (a page always loads at
	// least its own HTML document) — this is a measurement failure, not a clean page.
	if ( items.length === 0 ) {
		return { url, total_requests: 0, errors: [], blocked: [], slow: [], severity: 'error' };
	}

	const allowSet = new Set( allowDomains.map( ( d ) => d.toLowerCase() ) );
	const errors = [];
	const blocked = [];
	const slow = [];

	for ( const item of items ) {
		const host = hostnameOf( item.url );
		const allowed = host !== '' && allowSet.has( host );
		const type = item.resourceType || 'Other';
		const initiator = item.entity || null;

		if ( isErrorItem( item ) && ! allowed ) {
			errors.push( { url: item.url, status: item.statusCode, type, initiator } );
		} else if ( isBlockedItem( item ) && ! allowed ) {
			blocked.push( { url: item.url, status: item.statusCode ?? null, type, initiator } );
		}

		const durationMs =
			typeof item.networkEndTime === 'number' && typeof item.networkRequestTime === 'number'
				? item.networkEndTime - item.networkRequestTime
				: null;
		if ( typeof durationMs === 'number' && durationMs > SLOW_REQUEST_MS ) {
			slow.push( { url: item.url, durationMs, type } );
		}
	}

	return {
		url,
		total_requests: items.length,
		errors,
		blocked,
		slow,
		severity: classifyNetworkSeverity( errors, blocked ),
	};
}

// ---------------------------------------------------------------------------
// Console
// ---------------------------------------------------------------------------

/** critical only counts genuine JS exceptions — a console entry whose `source` is
 * `"network"` is a failed request Lighthouse ALSO reports (that's the network
 * report's job); counting it again here double-counts a single failure and can turn
 * a missing favicon into a build-blocking CRITICAL. It still appears in `errors[]`. */
function classifyConsoleSeverity( errors, warnings ) {
	const jsErrors = errors.filter( ( e ) => e.source !== 'network' );
	if ( jsErrors.length > 0 ) return 'critical';
	if ( warnings.length > 0 ) return 'warn';
	return 'pass';
}

/**
 * @param {object} lhr
 * @param {string} url
 * @param {{ignorePatterns?: string[]}} [opts] `ignorePatterns` are regex source
 *   strings tested against each message's description text; a match suppresses it
 *   from both the errors and warnings list (known third-party noise).
 */
function buildConsoleReport( lhr, url, opts ) {
	const { ignorePatterns = [] } = opts || {};

	if ( hasRuntimeError( lhr ) || auditErrored( lhr, 'errors-in-console' ) ) {
		return { url, errors: [], warnings: [], info_count: null, severity: 'error' };
	}

	const regexes = ignorePatterns.map( ( p ) => new RegExp( p ) );
	const isIgnored = ( text ) => regexes.some( ( re ) => re.test( text || '' ) );

	const errors = auditItems( lhr, 'errors-in-console' )
		.map( ( item ) => ( {
			source: item.source || 'unknown',
			description: item.description || '',
			url: ( item.sourceLocation && item.sourceLocation.url ) || null,
		} ) )
		.filter( ( e ) => ! isIgnored( e.description ) );

	// deprecations = deprecation warnings; csp-xss = CSP warnings (I3 — the spec's
	// console warn branch is "deprecation OR CSP"; only deprecations was wired in).
	const deprecationWarnings = auditItems( lhr, 'deprecations' ).map( ( item ) => ( {
		description: item.value || '',
		url: ( item.source && item.source.url ) || null,
	} ) );
	const cspWarnings = auditItems( lhr, 'csp-xss' ).map( ( item ) => ( {
		description: item.description || item.value || '',
		url: null,
	} ) );
	const warnings = [ ...deprecationWarnings, ...cspWarnings ].filter( ( w ) => ! isIgnored( w.description ) );

	return {
		url,
		errors,
		warnings,
		// Lighthouse's public LHR does not expose the raw non-error console buffer
		// (console.log/console.info) — null documents "not measurable", never a
		// fabricated 0 that looks like "measured, confirmed zero" (I4).
		info_count: null,
		severity: classifyConsoleSeverity( errors, warnings ),
	};
}

module.exports = {
	classifyNetworkSeverity,
	buildNetworkReport,
	classifyConsoleSeverity,
	buildConsoleReport,
};
