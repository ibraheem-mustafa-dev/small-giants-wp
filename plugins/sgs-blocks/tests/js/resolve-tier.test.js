/**
 * Tests for resolveTier() — canonical tier resolver for responsive values.
 *
 * Verifies that the JS implementation matches the contract exactly:
 *   - Tri-state enums ('inherit'/'on'/'off')
 *   - Scalar/null-marker values
 *   - Desktop coercion to default (§6b guard)
 *   - Tablet/mobile inherit upward
 *   - Non-object junk input defence (D328)
 */

const assert = require( 'assert' );
const fs = require( 'fs' );
const path = require( 'path' );

// Load the fixtures
const fixturesPath = path.join( __dirname, '..', 'fixtures', 'resolve-tier-fixtures.json' );
const fixtures = JSON.parse( fs.readFileSync( fixturesPath, 'utf8' ) );

// Import the function under test
// NOTE: This test is meant to run via `node tests/js/resolve-tier.test.js`.
// The function is not built yet (build/ doesn't exist until npm run build).
// So we import from the source file directly.
const { resolveTier } = require( '../../src/utils/responsive.js' );

// ─── Test runner ────────────────────────────────────────────────────────────

let passed = 0;
let failed = 0;

fixtures.forEach( ( fixture, idx ) => {
	const { name, value, tier, default: defaultValue, expect } = fixture;
	const result = resolveTier( value, tier, defaultValue );

	// Check both value and inherited flag
	const valueMatch = result.value === expect.value;
	const inheritedMatch = result.inherited === expect.inherited;

	if ( valueMatch && inheritedMatch ) {
		console.log( `✓ Case ${ idx + 1 }: ${ name }` );
		passed++;
	} else {
		console.log( `✗ Case ${ idx + 1 }: ${ name }` );
		if ( ! valueMatch ) {
			console.log( `  Value mismatch: expected ${ JSON.stringify( expect.value ) }, got ${ JSON.stringify( result.value ) }` );
		}
		if ( ! inheritedMatch ) {
			console.log( `  Inherited mismatch: expected ${ expect.inherited }, got ${ result.inherited }` );
		}
		failed++;
	}
} );

// Summary
console.log( `\n${ passed }/${ fixtures.length } passed` );
if ( failed > 0 ) {
	console.log( `${ failed } failed` );
	process.exit( 1 );
}
