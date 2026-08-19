/**
 * stage8-self-test-console.js — console report assertions for --self-test, split out
 * purely so no self-test file exceeds the repo's 250-line limit. Orchestrated by
 * `stage8-self-test.js` via `runConsoleSelfTests(check)`.
 *
 * @package SGS\Blocks
 */
'use strict';

const { buildConsoleReport } = require( './stage8-network-console-builders.js' );
const { fixtureLhr } = require( './stage8-self-test-fixtures.js' );

function runConsoleSelfTests( check ) {
	// --- C1: error severity coverage ---------------------------------------------
	const navRuntimeError = { code: 'NO_FCP', message: 'The page did not paint any content.' };
	check(
		'C1: navigation failure (runtimeError) -> console error',
		buildConsoleReport( fixtureLhr( { runtimeError: navRuntimeError } ), 'https://example.com/', {} ).severity === 'error'
	);
	check(
		'C1: errors-in-console audit errored -> console error',
		buildConsoleReport( fixtureLhr( { erroredAudits: [ 'errors-in-console' ] } ), 'https://example.com/', {} ).severity === 'error'
	);
	check(
		'C1: errors-in-console audit missing entirely -> console error',
		buildConsoleReport( fixtureLhr( { missingAudits: [ 'errors-in-console' ] } ), 'https://example.com/', {} ).severity === 'error'
	);

	// --- ordinary branches -------------------------------------------------------
	const consoleClean = buildConsoleReport( fixtureLhr( {} ), 'https://example.com/', {} );
	check(
		'Console negative control -> pass',
		consoleClean.severity === 'pass' && consoleClean.errors.length === 0 && consoleClean.warnings.length === 0,
		JSON.stringify( consoleClean )
	);
	check( 'info_count is null, not a fabricated 0 (I4)', consoleClean.info_count === null, consoleClean.info_count );

	check(
		'Console warn branch (deprecation)',
		buildConsoleReport(
			fixtureLhr( { deprecations: [ { value: 'Deprecated API used', source: { url: 'https://example.com/app.js' } } ] } ),
			'https://example.com/',
			{}
		).severity === 'warn'
	);

	// I3 — csp-xss audit wired into console warnings.
	const consoleCsp = buildConsoleReport( fixtureLhr( { cspXss: [ { description: 'Missing CSP directive: script-src' } ] } ), 'https://example.com/', {} );
	check(
		'csp-xss audit wired into console warnings (I3)',
		consoleCsp.severity === 'warn' && consoleCsp.warnings.length === 1,
		JSON.stringify( consoleCsp )
	);

	const jsExceptionFixture = { source: 'exception', description: 'TypeError: x is not a function', sourceLocation: { url: 'https://example.com/app.js' } };
	const consoleCritical = buildConsoleReport( fixtureLhr( { errors: [ jsExceptionFixture ] } ), 'https://example.com/', {} );
	check( 'Console critical branch (uncaught JS error)', consoleCritical.severity === 'critical' );
	check( 'console errors[].source extracted', consoleCritical.errors[ 0 ].source === 'exception' );
	check( 'console errors[].description extracted', consoleCritical.errors[ 0 ].description === 'TypeError: x is not a function' );
	check( 'console errors[].url extracted', consoleCritical.errors[ 0 ].url === 'https://example.com/app.js' );

	// Live-run false alarm: a network-sourced console entry (e.g. favicon 404) must
	// NOT make console critical — it's already the network report's job — but stays
	// visible in errors[].
	const networkSourcedError = { source: 'network', description: 'Failed to load resource: the server responded with a status of 404 (favicon.ico)', sourceLocation: { url: 'https://example.com/favicon.ico' } };
	const consoleNetworkSourced = buildConsoleReport( fixtureLhr( { errors: [ networkSourcedError ] } ), 'https://example.com/', {} );
	check(
		'source:"network" console entry does NOT make console critical (favicon-404 false alarm)',
		consoleNetworkSourced.severity !== 'critical',
		consoleNetworkSourced.severity
	);
	check(
		'source:"network" console entry stays visible in errors[]',
		consoleNetworkSourced.errors.length === 1,
		JSON.stringify( consoleNetworkSourced )
	);

	const noisyErrors = [ { source: 'exception', description: 'Stripe widget failed to load', sourceLocation: { url: 'https://js.stripe.com/x.js' } } ];
	const consoleIgnored = buildConsoleReport( fixtureLhr( { errors: noisyErrors } ), 'https://example.com/', { ignorePatterns: [ 'Stripe' ] } );
	check(
		'--ignore-patterns suppresses a matching console error',
		consoleIgnored.errors.length === 0 && consoleIgnored.severity === 'pass',
		JSON.stringify( consoleIgnored )
	);
	const consoleNotIgnored = buildConsoleReport( fixtureLhr( { errors: noisyErrors } ), 'https://example.com/', { ignorePatterns: [ 'SomethingElseEntirely' ] } );
	check(
		'--ignore-patterns leaves a non-matching error visible (negative control)',
		consoleNotIgnored.errors.length === 1 && consoleNotIgnored.severity === 'critical',
		JSON.stringify( consoleNotIgnored )
	);
}

module.exports = { runConsoleSelfTests };
