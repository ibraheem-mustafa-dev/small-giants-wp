/**
 * stage8-self-test-cwv.js — Core Web Vitals assertions for --self-test, split out
 * purely so no self-test file exceeds the repo's 250-line limit. Orchestrated by
 * `stage8-self-test.js` via `runCwvSelfTests(check)`.
 *
 * @package SGS\Blocks
 */
'use strict';

const { buildCwvReport } = require( './stage8-report-builders.js' );
const { fixtureLhr, scoreOpts, zeroCwvExtras } = require( './stage8-self-test-fixtures.js' );

function runCwvSelfTests( check ) {
	// --- negative control (clean input -> pass) --------------------------------
	const cwvClean = buildCwvReport(
		fixtureLhr( { lcp: 1200, cls: 0.02, inp: 150, tbt: 50, fcp: 800, ...scoreOpts() } ),
		'https://example.com/',
		'mobile'
	);
	check( 'CWV negative control -> pass', cwvClean.severity === 'pass', JSON.stringify( cwvClean ) );

	// --- warn/critical branches (non-boundary) ----------------------------------
	check(
		'CWV warn branch (LCP 2800ms > 2500ms)',
		buildCwvReport( fixtureLhr( { lcp: 2800, cls: 0.02, ...zeroCwvExtras(), ...scoreOpts() } ), 'https://example.com/', 'mobile' ).severity === 'warn'
	);
	check(
		'CWV warn branch (CLS 0.15 > 0.1)',
		buildCwvReport( fixtureLhr( { lcp: 1200, cls: 0.15, ...zeroCwvExtras(), ...scoreOpts() } ), 'https://example.com/', 'mobile' ).severity === 'warn'
	);
	check(
		'CWV critical branch (LCP 4500ms > 4000ms)',
		buildCwvReport( fixtureLhr( { lcp: 4500, cls: 0.02, ...zeroCwvExtras(), ...scoreOpts() } ), 'https://example.com/', 'mobile' ).severity === 'critical'
	);
	check(
		'CWV critical branch (CLS 0.4 > 0.25)',
		buildCwvReport( fixtureLhr( { lcp: 1200, cls: 0.4, ...zeroCwvExtras(), ...scoreOpts() } ), 'https://example.com/', 'mobile' ).severity === 'critical'
	);

	// --- boundary assertions: exactly the threshold lands in the LOWER band ----
	// (spec is `>` not `>=` — this alone kills the `>` -> `>=` mutation on all four).
	check(
		'LCP exactly 4000ms -> warn, not critical (kills > to >= mutation)',
		buildCwvReport( fixtureLhr( { lcp: 4000, cls: 0.02, ...zeroCwvExtras(), ...scoreOpts() } ), 'https://example.com/', 'mobile' ).severity === 'warn'
	);
	check(
		'LCP exactly 2500ms -> pass, not warn (kills > to >= mutation)',
		buildCwvReport( fixtureLhr( { lcp: 2500, cls: 0.02, ...zeroCwvExtras(), ...scoreOpts() } ), 'https://example.com/', 'mobile' ).severity === 'pass'
	);
	check(
		'CLS exactly 0.25 -> warn, not critical (kills > to >= mutation)',
		buildCwvReport( fixtureLhr( { lcp: 100, cls: 0.25, ...zeroCwvExtras(), ...scoreOpts() } ), 'https://example.com/', 'mobile' ).severity === 'warn'
	);
	check(
		'CLS exactly 0.1 -> pass, not warn (kills > to >= mutation)',
		buildCwvReport( fixtureLhr( { lcp: 100, cls: 0.1, ...zeroCwvExtras(), ...scoreOpts() } ), 'https://example.com/', 'mobile' ).severity === 'pass'
	);

	// --- field-value extraction (kills key-swap/hardcode mutations) ------------
	const valueFixture = buildCwvReport(
		fixtureLhr( { lcp: 1234, cls: 0.03, inp: 111, tbt: 22, fcp: 456, ...scoreOpts() } ),
		'https://example.com/',
		'mobile'
	);
	check( 'lcp_ms value extracted precisely', valueFixture.lcp_ms === 1234, valueFixture.lcp_ms );
	check( 'cls value extracted precisely', valueFixture.cls === 0.03, valueFixture.cls );
	check( 'inp_ms value extracted precisely (kills hardcoded-null mutation)', valueFixture.inp_ms === 111, valueFixture.inp_ms );
	check( 'tbt_ms value extracted precisely', valueFixture.tbt_ms === 22, valueFixture.tbt_ms );
	check( 'fcp_ms value extracted precisely (kills fcp-reads-tbt mutation)', valueFixture.fcp_ms === 456, valueFixture.fcp_ms );
	check( 'score_perf reads the performance category (distinct scores)', valueFixture.score_perf === 99, valueFixture.score_perf );
	check( 'score_a11y reads the accessibility category (distinct scores)', valueFixture.score_a11y === 96, valueFixture.score_a11y );
	check(
		'score_seo reads the seo category, not best-practices (distinct scores, kills key-swap mutation)',
		valueFixture.score_seo === 100,
		valueFixture.score_seo
	);
	check( 'score_best_practices reads the best-practices category (distinct scores)', valueFixture.score_best_practices === 93, valueFixture.score_best_practices );

	// --- C1: error severity — the gate must not report PASS on a page that never
	// loaded. ------------------------------------------------------------------
	const navRuntimeError = { code: 'NO_FCP', message: 'The page did not paint any content.' };
	check(
		'C1: navigation failure (runtimeError) -> CWV error',
		buildCwvReport( fixtureLhr( { runtimeError: navRuntimeError } ), 'https://example.com/', 'mobile' ).severity === 'error'
	);
	check(
		'C1: audit errored (scoreDisplayMode error, no numericValue) -> CWV error',
		buildCwvReport(
			fixtureLhr( { lcp: 100, cls: 0.01, ...zeroCwvExtras(), ...scoreOpts(), erroredAudits: [ 'largest-contentful-paint' ] } ),
			'https://example.com/',
			'mobile'
		).severity === 'error'
	);
	check(
		'C1: audit key missing entirely (CLS) -> CWV error',
		buildCwvReport(
			fixtureLhr( { lcp: 100, cls: 0.01, ...zeroCwvExtras(), ...scoreOpts(), missingAudits: [ 'cumulative-layout-shift' ] } ),
			'https://example.com/',
			'mobile'
		).severity === 'error'
	);
}

module.exports = { runCwvSelfTests };
