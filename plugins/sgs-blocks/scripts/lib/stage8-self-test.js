/**
 * stage8-self-test.js — --self-test harness for stage8-audit.js, split into its own
 * file purely to keep stage8-audit.js under the repo's 250-line limit (the brief's
 * hard requirement #6). Nothing here launches a browser or touches the network —
 * every assertion runs against fixture Lighthouse Result objects, so the SAME pure
 * functions (`buildCwvReport`/`buildNetworkReport`/`buildConsoleReport`/
 * `worstSeverity`) that a real Lighthouse run feeds are exercised here too — proving
 * the machinery itself, not a self-test-only reimplementation (same discipline as
 * `check-device-toggle.js`'s PROBE_TOGGLE pattern).
 *
 * Every severity branch (pass/warn/critical) is asserted for all three report
 * types, INCLUDING a negative control (clean input -> "pass") — this repo's
 * recorded failure mode is a gate that cannot fail, and a self-test asserting only
 * the happy path is exactly that defect.
 *
 * @package SGS\Blocks
 */
'use strict';

const {
	worstSeverity,
	buildCwvReport,
	buildNetworkReport,
	buildConsoleReport,
} = require( './stage8-report-builders.js' );

function assert( label, condition, detail ) {
	if ( condition ) {
		process.stdout.write( `[self-test] PASS  ${ label }\n` );
		return true;
	}
	process.stdout.write( `[self-test] FAIL  ${ label }${ detail ? ' — ' + detail : '' }\n` );
	return false;
}

function fixtureLhr( { lcp, cls, inp, tbt, fcp, perf, a11y, seo, bp, network, errors, deprecations } ) {
	return {
		audits: {
			'largest-contentful-paint': { numericValue: lcp },
			'cumulative-layout-shift': { numericValue: cls },
			'interaction-to-next-paint': { numericValue: inp },
			'total-blocking-time': { numericValue: tbt },
			'first-contentful-paint': { numericValue: fcp },
			'network-requests': { details: { items: network || [] } },
			'errors-in-console': { details: { items: errors || [] } },
			deprecations: { details: { items: deprecations || [] } },
		},
		categories: {
			performance: { score: perf },
			accessibility: { score: a11y },
			seo: { score: seo },
			'best-practices': { score: bp },
		},
	};
}

/**
 * @param {(url: string, now: Date) => string} makeRunId Injected so the self-test
 *   can prove the run-id helper is deterministic without duplicating it here.
 */
function runSelfTest( makeRunId ) {
	let failures = 0;
	const check = ( label, cond, detail ) => {
		if ( ! assert( label, cond, detail ) ) failures++;
	};

	// --- run-id (deterministic, no Date.now()) --------------------------------
	const fixedNow = new Date( 2026, 0, 15, 9, 5, 3 ); // 2026-01-15 09:05:03
	const runId = makeRunId( 'https://example.com/some-page', fixedNow );
	check( 'run-id is deterministic + host-sluggy', runId === '20260115-090503-example-com', runId );

	// --- CWV: negative control (clean input -> pass) --------------------------
	const cwvClean = buildCwvReport(
		fixtureLhr( { lcp: 1200, cls: 0.02, inp: 150, tbt: 50, fcp: 800, perf: 0.98, a11y: 1, seo: 1, bp: 1 } ),
		'https://example.com/',
		'mobile'
	);
	check( 'CWV negative control -> pass', cwvClean.severity === 'pass', JSON.stringify( cwvClean ) );

	// --- CWV: warn branch (LCP > 2500ms) ---------------------------------------
	const cwvWarnLcp = buildCwvReport(
		fixtureLhr( { lcp: 2800, cls: 0.02, inp: 150, tbt: 50, fcp: 800, perf: 0.8, a11y: 1, seo: 1, bp: 1 } ),
		'https://example.com/',
		'mobile'
	);
	check( 'CWV warn branch (LCP 2800ms > 2500ms)', cwvWarnLcp.severity === 'warn', cwvWarnLcp.severity );

	// --- CWV: warn branch (CLS > 0.1) ------------------------------------------
	const cwvWarnCls = buildCwvReport(
		fixtureLhr( { lcp: 1200, cls: 0.15, inp: 150, tbt: 50, fcp: 800, perf: 0.9, a11y: 1, seo: 1, bp: 1 } ),
		'https://example.com/',
		'mobile'
	);
	check( 'CWV warn branch (CLS 0.15 > 0.1)', cwvWarnCls.severity === 'warn', cwvWarnCls.severity );

	// --- CWV: critical branch (LCP > 4000ms) -----------------------------------
	const cwvCriticalLcp = buildCwvReport(
		fixtureLhr( { lcp: 4500, cls: 0.02, inp: 150, tbt: 50, fcp: 800, perf: 0.3, a11y: 1, seo: 1, bp: 1 } ),
		'https://example.com/',
		'mobile'
	);
	check( 'CWV critical branch (LCP 4500ms > 4000ms)', cwvCriticalLcp.severity === 'critical', cwvCriticalLcp.severity );

	// --- CWV: critical branch (CLS > 0.25) --------------------------------------
	const cwvCriticalCls = buildCwvReport(
		fixtureLhr( { lcp: 1200, cls: 0.4, inp: 150, tbt: 50, fcp: 800, perf: 0.5, a11y: 1, seo: 1, bp: 1 } ),
		'https://example.com/',
		'mobile'
	);
	check( 'CWV critical branch (CLS 0.4 > 0.25)', cwvCriticalCls.severity === 'critical', cwvCriticalCls.severity );

	check( 'CWV score_perf converts 0-1 score to a 0-100 percentage', cwvClean.score_perf === 98, cwvClean.score_perf );

	// --- Network: negative control (clean requests -> pass) --------------------
	const cleanRequests = [
		{ url: 'https://example.com/', statusCode: 200, resourceType: 'Document', networkRequestTime: 0, networkEndTime: 100, finished: true },
		{ url: 'https://example.com/app.css', statusCode: 200, resourceType: 'Stylesheet', networkRequestTime: 0, networkEndTime: 200, finished: true },
	];
	const netClean = buildNetworkReport( fixtureLhr( { network: cleanRequests } ), 'https://example.com/', {} );
	check( 'Network negative control -> pass', netClean.severity === 'pass', JSON.stringify( netClean ) );
	check( 'Network negative control counts total_requests', netClean.total_requests === 2, netClean.total_requests );

	// --- Network: warn branch (image 404) ---------------------------------------
	const imageWarnRequests = [
		{ url: 'https://example.com/hero.jpg', statusCode: 404, resourceType: 'Image', networkRequestTime: 0, networkEndTime: 50, finished: true },
	];
	const netWarn = buildNetworkReport( fixtureLhr( { network: imageWarnRequests } ), 'https://example.com/', {} );
	check( 'Network warn branch (image 404)', netWarn.severity === 'warn', netWarn.severity );

	// --- Network: warn branch (blocked request, no status) ---------------------
	const blockedRequests = [
		{ url: 'https://tracker.example.net/beacon.js', statusCode: 0, resourceType: 'Script', networkRequestTime: 0, networkEndTime: null, finished: false },
	];
	const netBlocked = buildNetworkReport( fixtureLhr( { network: blockedRequests } ), 'https://example.com/', {} );
	check( 'Network warn branch (blocked request)', netBlocked.severity === 'warn' && netBlocked.blocked.length === 1, netBlocked.severity );

	// --- Network: critical branch (font 404) ------------------------------------
	const fontCriticalRequests = [
		{ url: 'https://example.com/font.woff2', statusCode: 404, resourceType: 'Font', networkRequestTime: 0, networkEndTime: 20, finished: true },
	];
	const netFontCritical = buildNetworkReport( fixtureLhr( { network: fontCriticalRequests } ), 'https://example.com/', {} );
	check( 'Network critical branch (font 404)', netFontCritical.severity === 'critical', netFontCritical.severity );

	// --- Network: critical branch (main JS 4xx) ---------------------------------
	const scriptCriticalRequests = [
		{ url: 'https://example.com/app.js', statusCode: 403, resourceType: 'Script', networkRequestTime: 0, networkEndTime: 30, finished: true },
	];
	const netScriptCritical = buildNetworkReport( fixtureLhr( { network: scriptCriticalRequests } ), 'https://example.com/', {} );
	check( 'Network critical branch (main JS 4xx)', netScriptCritical.severity === 'critical', netScriptCritical.severity );

	// --- Network: slow request is captured but does not raise severity alone ---
	const slowRequests = [
		{ url: 'https://example.com/big.mp4', statusCode: 200, resourceType: 'Media', networkRequestTime: 0, networkEndTime: 5000, finished: true },
	];
	const netSlow = buildNetworkReport( fixtureLhr( { network: slowRequests } ), 'https://example.com/', {} );
	check(
		'Network slow request captured (>3000ms) without forcing severity up',
		netSlow.slow.length === 1 && netSlow.severity === 'pass',
		JSON.stringify( netSlow )
	);

	// --- Network: --allow-domains suppresses a third-party host -----------------
	const thirdPartyRequests = [
		{ url: 'https://cdn.thirdparty.test/lib.js', statusCode: 404, resourceType: 'Script', networkRequestTime: 0, networkEndTime: 10, finished: true },
	];
	const netAllowed = buildNetworkReport( fixtureLhr( { network: thirdPartyRequests } ), 'https://example.com/', {
		allowDomains: [ 'cdn.thirdparty.test' ],
	} );
	check(
		'--allow-domains suppresses a matching third-party host from errors',
		netAllowed.errors.length === 0 && netAllowed.severity === 'pass',
		JSON.stringify( netAllowed )
	);
	// Negative control on the suppression itself: an UNLISTED third-party host must
	// still be flagged, proving the allow-list is not silently swallowing everything.
	const netUnlisted = buildNetworkReport( fixtureLhr( { network: thirdPartyRequests } ), 'https://example.com/', {
		allowDomains: [ 'someone-else.test' ],
	} );
	check(
		'--allow-domains does NOT suppress a host not on the list (negative control)',
		netUnlisted.errors.length === 1 && netUnlisted.severity === 'critical',
		JSON.stringify( netUnlisted )
	);

	// --- Console: negative control (no messages -> pass) ------------------------
	const consoleClean = buildConsoleReport( fixtureLhr( {} ), 'https://example.com/', {} );
	check(
		'Console negative control -> pass',
		consoleClean.severity === 'pass' && consoleClean.errors.length === 0 && consoleClean.warnings.length === 0,
		JSON.stringify( consoleClean )
	);

	// --- Console: warn branch (deprecation warning) ------------------------------
	const consoleWarn = buildConsoleReport(
		fixtureLhr( { deprecations: [ { value: 'Deprecated API used', source: { url: 'https://example.com/app.js' } } ] } ),
		'https://example.com/',
		{}
	);
	check( 'Console warn branch (deprecation)', consoleWarn.severity === 'warn', consoleWarn.severity );

	// --- Console: critical branch (uncaught JS error) ----------------------------
	const consoleCritical = buildConsoleReport(
		fixtureLhr( { errors: [ { source: 'exception', description: 'TypeError: x is not a function', sourceLocation: { url: 'https://example.com/app.js' } } ] } ),
		'https://example.com/',
		{}
	);
	check( 'Console critical branch (uncaught JS error)', consoleCritical.severity === 'critical', consoleCritical.severity );

	// --- Console: --ignore-patterns suppresses known noise -----------------------
	const noisyErrors = [ { source: 'exception', description: 'Stripe widget failed to load', sourceLocation: { url: 'https://js.stripe.com/x.js' } } ];
	const consoleIgnored = buildConsoleReport( fixtureLhr( { errors: noisyErrors } ), 'https://example.com/', {
		ignorePatterns: [ 'Stripe' ],
	} );
	check(
		'--ignore-patterns suppresses a matching console error',
		consoleIgnored.errors.length === 0 && consoleIgnored.severity === 'pass',
		JSON.stringify( consoleIgnored )
	);
	// Negative control: a pattern that does NOT match must NOT suppress it.
	const consoleNotIgnored = buildConsoleReport( fixtureLhr( { errors: noisyErrors } ), 'https://example.com/', {
		ignorePatterns: [ 'SomethingElseEntirely' ],
	} );
	check(
		'--ignore-patterns leaves a non-matching error visible (negative control)',
		consoleNotIgnored.errors.length === 1 && consoleNotIgnored.severity === 'critical',
		JSON.stringify( consoleNotIgnored )
	);

	// --- Overall severity = worst of the three ------------------------------------
	check( 'worstSeverity picks the worst across all three layers', worstSeverity( 'pass', 'warn', 'critical' ) === 'critical' );
	check( 'worstSeverity stays pass when everything is pass', worstSeverity( 'pass', 'pass', 'pass' ) === 'pass' );
	check( 'worstSeverity picks warn over pass when nothing is critical', worstSeverity( 'pass', 'warn', 'pass' ) === 'warn' );

	const assertionCount = 24;
	process.stdout.write(
		failures > 0
			? `\n[self-test] ${ failures } of ${ assertionCount } assertion(s) FAILED — the severity machinery is not trustworthy. Fix before relying on --check.\n`
			: `\n[self-test] ALL ${ assertionCount } ASSERTIONS PASS — CWV/network/console severity branches (including negative controls) behave as specified.\n`
	);
	return failures === 0;
}

module.exports = { runSelfTest };
