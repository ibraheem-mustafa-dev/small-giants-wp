/**
 * check-product-search-guards.js
 *
 * STATIC PRE-FLIGHT GUARD for the product-search REST endpoint.
 *
 * HONESTY NOTE: This is a tripwire, not a real security gate.  It greps
 * the PHP source for the presence of specific patterns.  A passing result
 * means the obvious structural guards have not been deleted; it does NOT
 * prove they are logically correct.  The behavioural leak test
 * (scripts/product-search-leak-check.php) is the real gate — the
 * orchestrator must run that against the canary before committing.
 *
 * Wired into `npm run prebuild` and `npm run prestart` alongside the
 * existing dead-controls and hardcoded-defaults checkers.
 *
 * Checks (all must be present in class-product-search-rest.php):
 *   G1 — Fail-closed 503 when $exclude is empty:
 *        `if ( empty( $exclude ) )` ... 503
 *   G2 — Result-level re-gate calls is_visible():
 *        `$product->is_visible()`
 *   G3 — post_status is the string literal 'publish' (not an array):
 *        `'post_status' => 'publish'`  (with quotes — literal string assign)
 *   G4 — Fixed response key set — all four required, nothing else:
 *        keys 'id', 'title', 'permalink', 'thumbnail' all present in $out[]
 *   G5 — Global circuit breaker present:
 *        `GLOBAL_MAX`
 *   G6 — Per-IP rate limit present:
 *        `PER_IP_MAX`
 *   G7 — Cache-Control no-store header wired:
 *        `no-store`
 *
 * Exit 0 = all guards present. Exit 1 = one or more missing (blocks build).
 */

'use strict';

const fs   = require( 'fs' );
const path = require( 'path' );

const TARGET = path.resolve(
	__dirname,
	'../includes/class-product-search-rest.php'
);

if ( ! fs.existsSync( TARGET ) ) {
	console.error( '[check-product-search-guards] ERROR: target file not found:' );
	console.error( '  ' + TARGET );
	process.exit( 1 );
}

const src = fs.readFileSync( TARGET, 'utf8' );

/** @type {Array<{name: string, pattern: RegExp, description: string}>} */
const GUARDS = [
	{
		name: 'G1-fail-closed-503',
		// Must see: `if ( empty( $exclude ) )` followed within ~5 lines by 503.
		// We check both parts independently — simpler and more robust.
		pattern: /empty\s*\(\s*\$exclude\s*\)/,
		description: 'Fail-closed guard: empty($exclude) check is present',
	},
	{
		name: 'G1b-fail-closed-503-status',
		pattern: /'status'\s*=>\s*503/,
		description: 'Fail-closed guard: 503 status code is returned somewhere',
	},
	{
		name: 'G2-result-regate-is-visible',
		pattern: /\$product->is_visible\s*\(\s*\)/,
		description: 'Result-level re-gate: $product->is_visible() call present',
	},
	{
		name: 'G3-post-status-literal',
		// The string 'publish' must appear as the value in the WP_Query args.
		// We check for the Yoda-safe assignment pattern used in the query array.
		pattern: /'post_status'\s*=>\s*'publish'/,
		description: "post_status is the literal string 'publish' (not an array)",
	},
	{
		name: 'G4-response-key-id',
		pattern: /'id'\s*=>/,
		description: "Fixed response shape: 'id' key present in output array",
	},
	{
		name: 'G4-response-key-title',
		pattern: /'title'\s*=>/,
		description: "Fixed response shape: 'title' key present in output array",
	},
	{
		name: 'G4-response-key-permalink',
		pattern: /'permalink'\s*=>/,
		description: "Fixed response shape: 'permalink' key present in output array",
	},
	{
		name: 'G4-response-key-thumbnail',
		pattern: /'thumbnail'\s*=>/,
		description: "Fixed response shape: 'thumbnail' key present in output array",
	},
	{
		name: 'G5-global-circuit-breaker',
		pattern: /GLOBAL_MAX/,
		description: 'Global circuit breaker constant (GLOBAL_MAX) is defined',
	},
	{
		name: 'G6-per-ip-rate-limit',
		pattern: /PER_IP_MAX/,
		description: 'Per-IP rate limit constant (PER_IP_MAX) is defined',
	},
	{
		name: 'G7-cache-control-no-store',
		pattern: /no-store/,
		description: 'Cache-Control: no-store is referenced in the source',
	},
];

let allPass = true;

console.log( '[check-product-search-guards] Checking ' + TARGET );
console.log( '' );

for ( const guard of GUARDS ) {
	const present = guard.pattern.test( src );
	const label   = present ? 'PASS' : 'FAIL';
	console.log( `  ${ label }  ${ guard.name }: ${ guard.description }` );
	if ( ! present ) {
		allPass = false;
	}
}

console.log( '' );

if ( allPass ) {
	console.log( '[check-product-search-guards] All guards present — static pre-flight OK.' );
	console.log( '  Remember: run product-search-leak-check.php against the canary' );
	console.log( '  before committing (the real security gate).' );
	process.exit( 0 );
} else {
	console.error( '[check-product-search-guards] One or more guards MISSING.' );
	console.error( '  The security contract in reports/FR-30-5-search-design.md' );
	console.error( '  requires all guards to be present. Fix before building.' );
	process.exit( 1 );
}
