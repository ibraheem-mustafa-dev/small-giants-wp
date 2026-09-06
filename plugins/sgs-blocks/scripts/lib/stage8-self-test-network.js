/**
 * stage8-self-test-network.js — network report assertions for --self-test, split out
 * purely so no self-test file exceeds the repo's 250-line limit. Orchestrated by
 * `stage8-self-test.js` via `runNetworkSelfTests(check)`.
 *
 * @package SGS\Blocks
 */
'use strict';

const { buildNetworkReport } = require( './stage8-network-console-builders.js' );
const { fixtureLhr } = require( './stage8-self-test-fixtures.js' );

function runNetworkSelfTests( check ) {
	// --- C1: error/critical severity coverage -----------------------------------
	const navRuntimeError = { code: 'NO_FCP', message: 'The page did not paint any content.' };
	check(
		'C1: navigation failure (runtimeError) -> network error',
		buildNetworkReport(
			fixtureLhr( { runtimeError: navRuntimeError, network: [ { url: 'https://example.com/', statusCode: 200, resourceType: 'Document', networkRequestTime: 0, networkEndTime: 10, finished: true } ] } ),
			'https://example.com/',
			{}
		).severity === 'error'
	);
	check(
		'C1: network-requests audit errored -> network error',
		buildNetworkReport(
			fixtureLhr( { network: [ { url: 'x', statusCode: 200, resourceType: 'Document', networkRequestTime: 0, networkEndTime: 1, finished: true } ], erroredAudits: [ 'network-requests' ] } ),
			'https://example.com/',
			{}
		).severity === 'error'
	);
	check(
		'C1: network-requests audit missing entirely -> network error',
		buildNetworkReport( fixtureLhr( { network: [ { url: 'x', statusCode: 200, resourceType: 'Document', networkRequestTime: 0, networkEndTime: 1, finished: true } ], missingAudits: [ 'network-requests' ] } ), 'https://example.com/', {} ).severity === 'error'
	);
	const emptyNetwork = buildNetworkReport( fixtureLhr( { network: [] } ), 'https://example.com/', {} );
	check(
		'C1: empty network log (total_requests===0) -> error, not pass',
		emptyNetwork.severity === 'error' && emptyNetwork.total_requests === 0,
		JSON.stringify( emptyNetwork )
	);
	check(
		'C1: main document 404 -> critical',
		buildNetworkReport(
			fixtureLhr( { network: [ { url: 'https://example.com/', statusCode: 404, resourceType: 'Document', networkRequestTime: 0, networkEndTime: 50, finished: true } ] } ),
			'https://example.com/',
			{}
		).severity === 'critical'
	);
	check(
		'C1: main document 500 -> critical (I2: 5xx was previously excluded)',
		buildNetworkReport(
			fixtureLhr( { network: [ { url: 'https://example.com/', statusCode: 500, resourceType: 'Document', networkRequestTime: 0, networkEndTime: 50, finished: true } ] } ),
			'https://example.com/',
			{}
		).severity === 'critical'
	);
	check(
		'C1: main stylesheet 503 -> critical (I2: 5xx was previously excluded)',
		buildNetworkReport(
			fixtureLhr( { network: [ { url: 'https://example.com/app.css', statusCode: 503, resourceType: 'Stylesheet', networkRequestTime: 0, networkEndTime: 50, finished: true } ] } ),
			'https://example.com/',
			{}
		).severity === 'critical'
	);

	// --- ordinary branches -------------------------------------------------------
	const cleanRequests = [
		{ url: 'https://example.com/', statusCode: 200, resourceType: 'Document', networkRequestTime: 0, networkEndTime: 100, finished: true },
		{ url: 'https://example.com/app.css', statusCode: 200, resourceType: 'Stylesheet', networkRequestTime: 0, networkEndTime: 200, finished: true },
	];
	const netClean = buildNetworkReport( fixtureLhr( { network: cleanRequests } ), 'https://example.com/', {} );
	check( 'Network negative control -> pass', netClean.severity === 'pass', JSON.stringify( netClean ) );
	check( 'Network negative control counts total_requests', netClean.total_requests === 2, netClean.total_requests );

	const imageWarnRequests = [
		{ url: 'https://example.com/hero.jpg', statusCode: 404, resourceType: 'Image', networkRequestTime: 0, networkEndTime: 50, finished: true },
	];
	check(
		'Network warn branch (image 404)',
		buildNetworkReport( fixtureLhr( { network: imageWarnRequests } ), 'https://example.com/', {} ).severity === 'warn'
	);

	const blockedRequests = [
		{ url: 'https://tracker.example.net/beacon.js', statusCode: 0, resourceType: 'Script', networkRequestTime: 0, networkEndTime: null, finished: false },
	];
	const netBlocked = buildNetworkReport( fixtureLhr( { network: blockedRequests } ), 'https://example.com/', {} );
	check( 'Network warn branch (blocked request, deliberate extension)', netBlocked.severity === 'warn' && netBlocked.blocked.length === 1 );

	// M3 — statusCode -1 must land in blocked, not fall through both buckets.
	const negOneRequests = [
		{ url: 'https://example.com/weird.js', statusCode: -1, resourceType: 'Script', networkRequestTime: 0, networkEndTime: 10, finished: true },
	];
	const netNegOne = buildNetworkReport( fixtureLhr( { network: negOneRequests } ), 'https://example.com/', {} );
	check( 'statusCode -1 lands in blocked, not silently dropped (M3)', netNegOne.blocked.length === 1, JSON.stringify( netNegOne ) );

	const fontFieldRequests = [
		{ url: 'https://example.com/font.woff2', statusCode: 404, resourceType: 'Font', entity: 'example.com', networkRequestTime: 0, networkEndTime: 20, finished: true },
	];
	const netFontCritical = buildNetworkReport( fixtureLhr( { network: fontFieldRequests } ), 'https://example.com/', {} );
	check( 'Network critical branch (font 404)', netFontCritical.severity === 'critical' );
	check( 'network errors[].url extracted', netFontCritical.errors[ 0 ].url === 'https://example.com/font.woff2' );
	check( 'network errors[].status extracted', netFontCritical.errors[ 0 ].status === 404 );
	check( 'network errors[].type extracted', netFontCritical.errors[ 0 ].type === 'Font' );
	check( 'network errors[].initiator extracted', netFontCritical.errors[ 0 ].initiator === 'example.com' );

	const scriptCriticalRequests = [
		{ url: 'https://example.com/app.js', statusCode: 403, resourceType: 'Script', networkRequestTime: 0, networkEndTime: 30, finished: true },
	];
	check(
		'Network critical branch (main JS 4xx)',
		buildNetworkReport( fixtureLhr( { network: scriptCriticalRequests } ), 'https://example.com/', {} ).severity === 'critical'
	);

	// slow[].durationMs must be the PRECISE difference (kills the +1000ms mutation).
	const slowRequests = [
		{ url: 'https://example.com/big.mp4', statusCode: 200, resourceType: 'Media', networkRequestTime: 1000, networkEndTime: 6500, finished: true },
	];
	const netSlow = buildNetworkReport( fixtureLhr( { network: slowRequests } ), 'https://example.com/', {} );
	check(
		'Network slow request captured with a precise durationMs, without forcing severity up',
		netSlow.slow.length === 1 && netSlow.slow[ 0 ].durationMs === 5500 && netSlow.severity === 'pass',
		JSON.stringify( netSlow )
	);

	const thirdPartyRequests = [
		{ url: 'https://cdn.thirdparty.test/lib.js', statusCode: 404, resourceType: 'Script', networkRequestTime: 0, networkEndTime: 10, finished: true },
	];
	const netAllowed = buildNetworkReport( fixtureLhr( { network: thirdPartyRequests } ), 'https://example.com/', { allowDomains: [ 'cdn.thirdparty.test' ] } );
	check(
		'--allow-domains suppresses a matching third-party host from errors',
		netAllowed.errors.length === 0 && netAllowed.severity === 'pass',
		JSON.stringify( netAllowed )
	);
	const netUnlisted = buildNetworkReport( fixtureLhr( { network: thirdPartyRequests } ), 'https://example.com/', { allowDomains: [ 'someone-else.test' ] } );
	check(
		'--allow-domains does NOT suppress a host not on the list (negative control)',
		netUnlisted.errors.length === 1 && netUnlisted.severity === 'critical',
		JSON.stringify( netUnlisted )
	);
}

module.exports = { runNetworkSelfTests };
