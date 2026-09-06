/**
 * stage8-self-test-fixtures.js — shared fixture builder for the stage8-self-test
 * family, split out purely so no self-test file exceeds the repo's 250-line limit.
 *
 * `missingAudits` deletes an audit key entirely (proves the "audit key missing"
 * error branch); `erroredAudits` sets `scoreDisplayMode: 'error'` and drops
 * `numericValue` (proves the "audit errored, no numericValue" branch);
 * `runtimeError` proves the navigation-failure branch.
 *
 * @package SGS\Blocks
 */
'use strict';

function assert( label, condition, detail ) {
	if ( condition ) {
		process.stdout.write( `[self-test] PASS  ${ label }\n` );
		return true;
	}
	process.stdout.write( `[self-test] FAIL  ${ label }${ detail ? ' — ' + detail : '' }\n` );
	return false;
}

function fixtureLhr( opts ) {
	const {
		lcp, cls, inp, tbt, fcp, perf, a11y, seo, bp,
		network, errors, deprecations, cspXss,
		runtimeError = null,
		missingAudits = [],
		erroredAudits = [],
	} = opts;

	const audits = {
		'largest-contentful-paint': { numericValue: lcp, scoreDisplayMode: 'numeric' },
		'cumulative-layout-shift': { numericValue: cls, scoreDisplayMode: 'numeric' },
		'interaction-to-next-paint': { numericValue: inp, scoreDisplayMode: 'numeric' },
		'total-blocking-time': { numericValue: tbt, scoreDisplayMode: 'numeric' },
		'first-contentful-paint': { numericValue: fcp, scoreDisplayMode: 'numeric' },
		'network-requests': { details: { items: network || [] }, scoreDisplayMode: 'informative' },
		'errors-in-console': { details: { items: errors || [] }, scoreDisplayMode: 'informative' },
		deprecations: { details: { items: deprecations || [] }, scoreDisplayMode: 'informative' },
		'csp-xss': { details: { items: cspXss || [] }, scoreDisplayMode: 'informative' },
	};

	for ( const id of erroredAudits ) {
		if ( audits[ id ] ) audits[ id ] = { scoreDisplayMode: 'error' };
	}
	for ( const id of missingAudits ) {
		delete audits[ id ];
	}

	const lhr = {
		audits,
		categories: {
			performance: { score: perf },
			accessibility: { score: a11y },
			seo: { score: seo },
			'best-practices': { score: bp },
		},
	};
	if ( runtimeError ) lhr.runtimeError = runtimeError;
	return lhr;
}

// Distinct scores per category (I5-adjacent finding) — a key-mapping swap
// (e.g. score_seo reading the best-practices category) is invisible when every
// category shares the same score. perf 0.99 / a11y 0.96 / seo 1.0 / bp 0.93.
const DISTINCT_SCORES = { perf: 0.99, a11y: 0.96, seo: 1, bp: 0.93 };

/** Distinct-per-category score fixture options (see DISTINCT_SCORES above). */
function scoreOpts() {
	return { perf: DISTINCT_SCORES.perf, a11y: DISTINCT_SCORES.a11y, seo: DISTINCT_SCORES.seo, bp: DISTINCT_SCORES.bp };
}

/** Shared filler for CWV fixtures that only care about LCP/CLS thresholds. */
function zeroCwvExtras() {
	return { inp: 1, tbt: 1, fcp: 1 };
}

module.exports = { assert, fixtureLhr, scoreOpts, zeroCwvExtras, DISTINCT_SCORES };
