/**
 * stage8-self-test.js — --self-test orchestrator for stage8-audit.js. Nothing here
 * launches a browser or touches the network — every assertion runs against fixture
 * Lighthouse Result objects, so the SAME pure functions that a real Lighthouse run
 * feeds are exercised here too (same discipline as `check-device-toggle.js`'s
 * PROBE_TOGGLE pattern).
 *
 * Per-domain assertions live in `stage8-self-test-cwv.js` /
 * `-network.js` / `-console.js` (split purely to keep every self-test file under the
 * repo's 250-line limit); shared fixtures in `stage8-self-test-fixtures.js`.
 *
 * Fix-review addition (2026-08-18): a cross-tier review mutation-tested the original
 * version of this harness and found it caught only 2 of 10 injected bugs, because it
 * checked `severity` and array LENGTHS but never the extracted field VALUES, and used
 * a fixture where all three category scores were `1` (so a key-mapping swap was
 * invisible by construction). This version adds: boundary assertions at the exact
 * threshold values (kills `>` -> `>=` mutations), value assertions for every
 * extracted field, DISTINCT category scores, full coverage of the `error` severity
 * (a page that never loaded must never report "pass"), and a meta-assertion proving
 * `assert()` itself can report FAIL. `assertionCount` is a REAL counter incremented
 * per `check()` call (I5) — never a hardcoded literal that can drift from the truth.
 *
 * @package SGS\Blocks
 */
'use strict';

const { worstSeverity, medianLhr } = require( './stage8-report-builders.js' );
const { assert, fixtureLhr, scoreOpts } = require( './stage8-self-test-fixtures.js' );
const { runCwvSelfTests } = require( './stage8-self-test-cwv.js' );
const { runNetworkSelfTests } = require( './stage8-self-test-network.js' );
const { runConsoleSelfTests } = require( './stage8-self-test-console.js' );

/**
 * @param {(url: string, now: Date) => string} makeRunId Injected so the self-test
 *   can prove the run-id helper is deterministic without duplicating it here.
 */
function runSelfTest( makeRunId ) {
	let failures = 0;
	let total = 0;
	const check = ( label, cond, detail ) => {
		total++;
		if ( ! assert( label, cond, detail ) ) failures++;
	};

	// --- run-id (deterministic, no Date.now()) --------------------------------
	const fixedNow = new Date( 2026, 0, 15, 9, 5, 3 ); // 2026-01-15 09:05:03
	const runId = makeRunId( 'https://example.com/some-page', fixedNow );
	check( 'run-id is deterministic + host-sluggy', runId === '20260115-090503-example-com', runId );

	runCwvSelfTests( check );
	runNetworkSelfTests( check );
	runConsoleSelfTests( check );

	// --- overall severity -------------------------------------------------------
	check( "worstSeverity ranks 'error' above 'critical'", worstSeverity( 'critical', 'error' ) === 'error' );
	check( 'worstSeverity picks the worst across all layers', worstSeverity( 'pass', 'warn', 'critical' ) === 'critical' );
	check( 'worstSeverity stays pass when everything is pass', worstSeverity( 'pass', 'pass', 'pass' ) === 'pass' );
	check( 'worstSeverity picks warn over pass when nothing is worse', worstSeverity( 'pass', 'warn', 'pass' ) === 'warn' );

	// --- median-of-runs (I6) -----------------------------------------------------
	const singleRunLhr = fixtureLhr( { lcp: 1000, cls: 0.01, inp: 50, tbt: 10, fcp: 500, ...scoreOpts() } );
	check(
		'medianLhr with --runs 1 returns the input unchanged (byte-identical to before this feature)',
		medianLhr( [ singleRunLhr ] ) === singleRunLhr
	);
	const run1 = fixtureLhr( { lcp: 1000, cls: 0.01, inp: 10, tbt: 10, fcp: 100, ...scoreOpts() } );
	const run2 = fixtureLhr( { lcp: 3000, cls: 0.05, inp: 30, tbt: 30, fcp: 300, ...scoreOpts() } );
	const run3 = fixtureLhr( { lcp: 2000, cls: 0.03, inp: 20, tbt: 20, fcp: 200, ...scoreOpts() } );
	const medianThree = medianLhr( [ run1, run2, run3 ] );
	check(
		'medianLhr computes the median LCP across an odd number of runs',
		medianThree.audits[ 'largest-contentful-paint' ].numericValue === 2000,
		medianThree.audits[ 'largest-contentful-paint' ].numericValue
	);
	check(
		'medianLhr computes the median CLS across an odd number of runs',
		medianThree.audits[ 'cumulative-layout-shift' ].numericValue === 0.03,
		medianThree.audits[ 'cumulative-layout-shift' ].numericValue
	);
	const run4 = fixtureLhr( { lcp: 4000, cls: 0.01, inp: 1, tbt: 1, fcp: 1, ...scoreOpts() } );
	const medianFour = medianLhr( [ run1, run2, run3, run4 ] );
	check(
		'medianLhr computes the median LCP across an even number of runs (averages the two middle values)',
		medianFour.audits[ 'largest-contentful-paint' ].numericValue === 2500,
		medianFour.audits[ 'largest-contentful-paint' ].numericValue
	);

	// --- meta-assertion: the harness's own failure path must be exercised (C2) --
	// This line is EXPECTED to print FAIL — it is proving assert() can report one.
	const metaFailResult = assert( 'meta: assert() reporting FAIL is provable (this line prints FAIL, intentionally)', false, 'intentional negative control on the harness itself' );
	check( 'assert() correctly returns false for a failing condition (harness self-check)', metaFailResult === false, metaFailResult );
	const metaPassResult = assert( 'meta: assert() reporting PASS control', true );
	check( 'assert() correctly returns true for a passing condition (harness self-check)', metaPassResult === true, metaPassResult );

	process.stdout.write(
		failures > 0
			? `\n[self-test] ${ failures } of ${ total } assertion(s) FAILED — the severity machinery is not trustworthy. Fix before relying on --check.\n`
			: `\n[self-test] ALL ${ total } ASSERTIONS PASS — CWV/network/console severity branches (including error/negative controls) behave as specified.\n`
	);
	return failures === 0;
}

module.exports = { runSelfTest };
