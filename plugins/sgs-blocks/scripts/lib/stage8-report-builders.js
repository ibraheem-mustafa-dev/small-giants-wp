/**
 * stage8-report-builders.js — shared LHR helpers + Core Web Vitals report builder for
 * stage8-audit.js. Network/console report builders live in the sibling
 * `stage8-network-console-builders.js` (split purely to keep both files under the
 * repo's 250-line limit).
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
 * `error` SEVERITY (fix-review addition, 2026-08-18) — ranked WORSE than `critical`.
 * A `critical` result means the page loaded and something on it genuinely failed
 * (a 404, an uncaught exception). An `error` result means the MEASUREMENT ITSELF
 * failed — Lighthouse's `lhr.runtimeError` was set, an audit this script depends on
 * is missing/erroed (`scoreDisplayMode: 'error'`), or the network log came back
 * empty. A missing LCP is absence of evidence, not evidence of speed — treating it
 * as "0ms, therefore pass" (the original defect) meant a page that never loaded
 * reported OVERALL PASS. Never coerce a missing/errored measurement into a numeric
 * default; always route it to `error`. Every builder (here and in the network/console
 * sibling) uses `hasRuntimeError`/`auditErrored` from this file for that check.
 *
 * @package SGS\Blocks
 */
'use strict';

const SEVERITY_RANK = { pass: 0, warn: 1, critical: 2, error: 3 };

/** Worst-of helper — `worstSeverity('pass', 'warn', 'critical', 'error')` -> `'error'`. */
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

/** True when Lighthouse itself reports the page never loaded (nav failure, 404 doc
 * that never painted, NO_FCP, etc.) — `lhr.runtimeError` carries a `code`. */
function hasRuntimeError( lhr ) {
	return Boolean( lhr && lhr.runtimeError && lhr.runtimeError.code );
}

/** True when an audit this script depends on is missing entirely OR Lighthouse
 * itself marked it `scoreDisplayMode: 'error'` (ran, but produced no usable data). */
function auditErrored( lhr, id ) {
	const a = lhr && lhr.audits && lhr.audits[ id ];
	if ( ! a ) return true;
	return a.scoreDisplayMode === 'error';
}

// ---------------------------------------------------------------------------
// Median-of-runs (I6) — Lighthouse's own recommendation for CWV stability.
// ---------------------------------------------------------------------------

function median( nums ) {
	const valid = nums.filter( ( n ) => typeof n === 'number' );
	if ( valid.length === 0 ) return null;
	const sorted = [ ...valid ].sort( ( a, b ) => a - b );
	const mid = Math.floor( sorted.length / 2 );
	return sorted.length % 2 !== 0 ? sorted[ mid ] : ( sorted[ mid - 1 ] + sorted[ mid ] ) / 2;
}

const CWV_METRIC_AUDIT_IDS = [
	'largest-contentful-paint',
	'cumulative-layout-shift',
	'interaction-to-next-paint',
	'total-blocking-time',
	'first-contentful-paint',
];

/**
 * Runs N times -> one synthetic `lhr` whose five CWV metric `numericValue`s are the
 * MEDIAN across all runs (reduces single-run noise, per Lighthouse's own guidance).
 * `--runs 1` returns the input `lhr` completely unchanged (same object, no clone) —
 * behaviour is byte-identical to before this feature existed. Network/console/error
 * detection (`runtimeError`, `scoreDisplayMode`, category scores) all come from the
 * LAST run — median only makes sense for the numeric CWV metrics.
 */
function medianLhr( lhrs ) {
	if ( ! Array.isArray( lhrs ) || lhrs.length === 0 ) {
		throw new Error( 'medianLhr requires at least one lhr.' );
	}
	if ( lhrs.length === 1 ) return lhrs[ 0 ];

	const last = lhrs[ lhrs.length - 1 ];
	const merged = JSON.parse( JSON.stringify( last ) );
	for ( const id of CWV_METRIC_AUDIT_IDS ) {
		const values = lhrs.map( ( l ) => numericAudit( l, id ) );
		const med = median( values );
		if ( merged.audits && merged.audits[ id ] ) {
			merged.audits[ id ] = { ...merged.audits[ id ], numericValue: med };
		}
	}
	return merged;
}

// ---------------------------------------------------------------------------
// Core Web Vitals
// ---------------------------------------------------------------------------

/** Severity per the brief: critical if LCP > 4000ms OR CLS > 0.25; warn if LCP >
 * 2500ms OR CLS > 0.1; else pass. A MISSING metric (runtimeError, an errored/absent
 * audit, or a non-numeric value) is `error` — absence of evidence, not evidence of
 * speed. Never coerce null -> 0. */
function classifyCwvSeverity( lhr, lcpMs, cls ) {
	if ( hasRuntimeError( lhr ) ) return 'error';
	if ( auditErrored( lhr, 'largest-contentful-paint' ) || auditErrored( lhr, 'cumulative-layout-shift' ) ) {
		return 'error';
	}
	if ( typeof lcpMs !== 'number' || typeof cls !== 'number' ) return 'error';
	if ( lcpMs > 4000 || cls > 0.25 ) return 'critical';
	if ( lcpMs > 2500 || cls > 0.1 ) return 'warn';
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
		severity: classifyCwvSeverity( lhr, lcp_ms, cls ),
	};
}

module.exports = {
	worstSeverity,
	median,
	medianLhr,
	numericAudit,
	auditItems,
	categoryScorePct,
	hostnameOf,
	hasRuntimeError,
	auditErrored,
	classifyCwvSeverity,
	buildCwvReport,
};
