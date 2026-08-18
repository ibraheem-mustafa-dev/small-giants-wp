/**
 * stage8-report-builders.js — pure extraction/severity logic for stage8-audit.js.
 *
 * WHY A SEPARATE MODULE
 * ----------------------
 * `stage8-audit.js` needs to stay under the repo's 250-line house limit while also
 * carrying CLI parsing, Chrome/Lighthouse orchestration and the --self-test harness.
 * Everything here is a PURE function of a Lighthouse Result object (`lhr`) — no
 * browser, no network, no filesystem — so it is exercised identically by a real
 * Lighthouse run and by --self-test's fixture objects. That is what makes the
 * self-test a genuine proof of the severity machinery rather than a reimplementation
 * of it (same discipline as `check-device-toggle.js`'s PROBE_TOGGLE pattern).
 *
 * One Lighthouse run yields all three reports (Bean's decision, 2026-08-18 —
 * `errors-in-console` + `network-requests` audits ship inside core Lighthouse, so a
 * second/third bespoke script would duplicate Google's own work). CWV comes from the
 * metrics audits; network from the `network-requests` audit; console errors from
 * `errors-in-console` and console warnings from the `deprecations` audit (the closest
 * built-in Lighthouse source for "deprecation/CSP warning" — Lighthouse's public LHR
 * does not expose the raw non-error console buffer, so `info_count` is always 0; see
 * the comment on buildConsoleReport).
 *
 * @package SGS\Blocks
 */
'use strict';

const SEVERITY_RANK = { pass: 0, warn: 1, critical: 2 };
const SLOW_REQUEST_MS = 3000;

/** Worst-of helper — `worstSeverity('pass', 'warn', 'critical')` -> `'critical'`. */
function worstSeverity( ...severities ) {
	return severities.reduce(
		( worst, s ) => ( SEVERITY_RANK[ s ] > SEVERITY_RANK[ worst ] ? s : worst ),
		'pass'
	);
}

function numericAudit( lhr, id ) {
	const a = lhr && lhr.audits && lhr.audits[ id ];
	return a && typeof a.numericValue === 'number' ? a.numericValue : null;
}

function auditItems( lhr, id ) {
	const a = lhr && lhr.audits && lhr.audits[ id ];
	return ( a && a.details && Array.isArray( a.details.items ) ) ? a.details.items : [];
}

function categoryScorePct( lhr, categoryId ) {
	const c = lhr && lhr.categories && lhr.categories[ categoryId ];
	return c && typeof c.score === 'number' ? Math.round( c.score * 100 ) : null;
}

function hostnameOf( url ) {
	try {
		return new URL( url ).hostname.toLowerCase();
	} catch ( e ) {
		return '';
	}
}

// ---------------------------------------------------------------------------
// 1. Core Web Vitals
// ---------------------------------------------------------------------------

/** Severity per the brief: critical if LCP > 4000ms OR CLS > 0.25; warn if LCP >
 * 2500ms OR CLS > 0.1; else pass. A missing (null) metric never trips a threshold. */
function classifyCwvSeverity( lcpMs, cls ) {
	const lcp = typeof lcpMs === 'number' ? lcpMs : 0;
	const c = typeof cls === 'number' ? cls : 0;
	if ( lcp > 4000 || c > 0.25 ) return 'critical';
	if ( lcp > 2500 || c > 0.1 ) return 'warn';
	return 'pass';
}

function buildCwvReport( lhr, url, viewport ) {
	const lcp_ms = numericAudit( lhr, 'largest-contentful-paint' );
	const cls = numericAudit( lhr, 'cumulative-layout-shift' );
	const inp_ms = numericAudit( lhr, 'interaction-to-next-paint' );
	const tbt_ms = numericAudit( lhr, 'total-blocking-time' );
	const fcp_ms = numericAudit( lhr, 'first-contentful-paint' );
	return {
		url,
		viewport,
		lcp_ms,
		cls,
		inp_ms,
		tbt_ms,
		fcp_ms,
		score_perf: categoryScorePct( lhr, 'performance' ),
		score_a11y: categoryScorePct( lhr, 'accessibility' ),
		score_seo: categoryScorePct( lhr, 'seo' ),
		score_best_practices: categoryScorePct( lhr, 'best-practices' ),
		severity: classifyCwvSeverity( lcp_ms, cls ),
	};
}

// ---------------------------------------------------------------------------
// 2. Network
// ---------------------------------------------------------------------------

/** A request with statusCode 0 (or explicitly unfinished) never reached a real HTTP
 * response — that is Lighthouse/DevTools' signature for a blocked/cancelled request,
 * as opposed to a 4xx/5xx which DID get a response. */
function isBlockedItem( item ) {
	return item.statusCode === 0 || item.finished === false;
}

function isErrorItem( item ) {
	return typeof item.statusCode === 'number' && item.statusCode >= 400;
}

function classifyNetworkSeverity( errors, blocked ) {
	const fontOr404 = errors.some( ( e ) => e.status === 404 && /font/i.test( e.type || '' ) );
	const mainCssOrJs4xx = errors.some(
		( e ) => e.status >= 400 && e.status < 500 && /script|stylesheet/i.test( e.type || '' )
	);
	if ( fontOr404 || mainCssOrJs4xx ) return 'critical';
	const image404 = errors.some( ( e ) => e.status === 404 && /image/i.test( e.type || '' ) );
	if ( image404 || blocked.length > 0 ) return 'warn';
	return 'pass';
}

/**
 * @param {object} lhr
 * @param {string} url
 * @param {{allowDomains?: string[]}} [opts] `allowDomains` suppresses matching
 *   third-party hosts from the errors/blocked lists (they still count toward
 *   `total_requests`).
 */
function buildNetworkReport( lhr, url, opts ) {
	const { allowDomains = [] } = opts || {};
	const allowSet = new Set( allowDomains.map( ( d ) => d.toLowerCase() ) );
	const items = auditItems( lhr, 'network-requests' );

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
// 3. Console
// ---------------------------------------------------------------------------

function classifyConsoleSeverity( errors, warnings ) {
	if ( errors.length > 0 ) return 'critical';
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
	const regexes = ignorePatterns.map( ( p ) => new RegExp( p ) );
	const isIgnored = ( text ) => regexes.some( ( re ) => re.test( text || '' ) );

	const errors = auditItems( lhr, 'errors-in-console' )
		.map( ( item ) => ( {
			source: item.source || 'unknown',
			description: item.description || '',
			url: ( item.sourceLocation && item.sourceLocation.url ) || null,
		} ) )
		.filter( ( e ) => ! isIgnored( e.description ) );

	// Lighthouse's public LHR only surfaces console ERRORS (via `errors-in-console`)
	// and deprecation/CSP issues (via `deprecations`) — it does not expose the raw
	// non-error console buffer (`console.log`/`console.info`), so info_count is
	// always 0 rather than a fabricated number. Documented, not silently dropped.
	const warnings = auditItems( lhr, 'deprecations' )
		.map( ( item ) => ( {
			description: item.value || '',
			url: ( item.source && item.source.url ) || null,
		} ) )
		.filter( ( w ) => ! isIgnored( w.description ) );

	return {
		url,
		errors,
		warnings,
		info_count: 0,
		severity: classifyConsoleSeverity( errors, warnings ),
	};
}

module.exports = {
	worstSeverity,
	classifyCwvSeverity,
	buildCwvReport,
	classifyNetworkSeverity,
	buildNetworkReport,
	classifyConsoleSeverity,
	buildConsoleReport,
};
