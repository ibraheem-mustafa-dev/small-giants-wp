/**
 * Tests for emitTierRules() — scoped per-tier CSS emission helper.
 *
 * Verifies that the JS implementation matches the contract exactly:
 *   - Base rule always uses the resolved desktop state
 *   - Tablet/mobile rules emit ONLY when their resolved state differs from
 *     the tier immediately above (minimal output)
 *   - A tier whose resolved CSS text is empty emits no rule at all
 *   - Rules are scoped to the caller-supplied selector, never a body class
 *   - Breakpoints match SGS_BREAKPOINTS (1023px tablet / 767px mobile)
 *   - Non-object/junk value input defends via resolveTier() (D328)
 */

const fs = require( 'fs' );
const path = require( 'path' );

// Load the fixtures
const fixturesPath = path.join( __dirname, '..', 'fixtures', 'emit-tier-rules-fixtures.json' );
const fixtures = JSON.parse( fs.readFileSync( fixturesPath, 'utf8' ) );

// Import the function under test
// NOTE: This test is meant to run via `node tests/js/emit-tier-rules.test.js`.
// The function is not built yet (build/ doesn't exist until npm run build).
// So we import from the source file directly.
const { emitTierRules } = require( '../../src/utils/responsive.js' );

// Whitespace-normalised equality (design gate §T1.3 contract).
const normalise = ( s ) => String( s ).replace( /\s+/g, ' ' ).trim();

// ─── Test runner ────────────────────────────────────────────────────────────

let passed = 0;
let failed = 0;

fixtures.forEach( ( fixture, idx ) => {
	const { name, uidSelector, value, cssOn, cssOff, default: defaultValue, expect } = fixture;
	const result = emitTierRules( uidSelector, value, cssOn, cssOff, defaultValue );

	if ( normalise( result ) === normalise( expect ) ) {
		console.log( `✓ Case ${ idx + 1 }: ${ name }` );
		passed++;
	} else {
		console.log( `✗ Case ${ idx + 1 }: ${ name }` );
		console.log( `  Expected: ${ normalise( expect ) }` );
		console.log( `  Got:      ${ normalise( result ) }` );
		failed++;
	}
} );

// Summary
console.log( `\n${ passed }/${ fixtures.length } passed` );
if ( failed > 0 ) {
	console.log( `${ failed } failed` );
	process.exit( 1 );
}
