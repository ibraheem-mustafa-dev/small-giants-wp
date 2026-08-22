'use strict';

/**
 * Self-test for check-undefined-refs.js.
 *
 * Fixtures are written to a TEMP tree via fs.mkdtempSync and removed after.
 * ⛔ A repo file is NEVER mutated as a fixture — D659 records an agent doing
 * exactly that and the defect shipping.
 *
 * The three assertions that carry the weight:
 *
 *   1. The SIBLING-HELPER fixture. The real sgs/text defect was not a simple
 *      missing name: the identifier WAS destructured, inside a helper function
 *      whose scope does not cover the JSX. A naive "is this name mentioned
 *      anywhere in the file" check passes that file, so a self-test without
 *      this fixture is vacuous against the very bug that motivated the gate.
 *
 *   2. The EXACT TOTAL. Per-fixture assertions catch under-matching; only an
 *      exact total catches OVER-matching, which is how a gate becomes a noise
 *      generator nobody reads.
 *
 *   3. The CORPUS SIZE. Findings-count assertions cannot detect a file the
 *      walker never opened. Asserting the denominator is what proves
 *      src/components/-shaped files are actually in scope.
 */

const fs = require( 'fs' );
const os = require( 'os' );
const path = require( 'path' );

/**
 * @param {Object} api Injected from the detector so the self-test exercises
 *                     the SAME code path, never a reimplementation.
 */
function run( api ) {
	const { scanTree, collectFiles, babelAvailable, babelUnavailableReason } = api;

	const failures = [];
	const assert = ( label, cond ) => {
		process.stdout.write( `  ${ cond ? 'PASS' : 'FAIL' }  ${ label }\n` );
		if ( ! cond ) {
			failures.push( label );
		}
	};

	process.stdout.write( '[check-undefined-refs --self-test]\n\n' );

	if ( ! babelAvailable ) {
		process.stdout.write( `  FAIL  babel must be available to self-test: ${ babelUnavailableReason }\n` );
		process.exitCode = 1;
		return;
	}

	const root = fs.mkdtempSync( path.join( os.tmpdir(), 'cur-' ) );
	const write = ( rel, body ) => {
		const full = path.join( root, rel );
		fs.mkdirSync( path.dirname( full ), { recursive: true } );
		fs.writeFileSync( full, body, 'utf8' );
	};

	// ── POSITIVE 1 — the exact c7e4ebdb shape: referenced in JSX, absent from
	// the Edit component's destructure. `div` is an intrinsic tag so it
	// contributes no finding of its own.
	write(
		'blocks/bad-jsx-ref/edit.js',
		[
			"export default function Edit( { attributes } ) {",
			"\tconst { borderColour } = attributes;",
			"\treturn <div data-a={ borderColour } data-b={ borderColourHover } />;",
			'}',
			'',
		].join( '\n' )
	);

	// ── POSITIVE 2 — THE TRICKY VARIANT. `quoteColourHover` IS destructured,
	// but inside a sibling helper whose scope does not cover the JSX below.
	write(
		'blocks/bad-helper-scope/edit.js',
		[
			'function buildStyle( attributes ) {',
			"\tconst { quoteColourHover } = attributes;",
			'\treturn quoteColourHover;',
			'}',
			'',
			'export default function Edit( { attributes } ) {',
			"\tconst { quoteColour } = attributes;",
			'\treturn <div data-a={ quoteColour } data-b={ quoteColourHover } />;',
			'}',
			'',
		].join( '\n' )
	);

	// ── POSITIVE 3 — an unparseable file must be COUNTED, never silently
	// skipped. A skipped file reports zero findings, which is indistinguishable
	// from a clean one.
	write( 'blocks/bad-parse/edit.js', 'export default function Edit( { attributes ) {\n' );

	// ── NEGATIVE 1 — the same shape with the binding present.
	write(
		'blocks/good-bound/edit.js',
		[
			'export default function Edit( { attributes } ) {',
			"\tconst { borderColour, borderColourHover } = attributes;",
			'\treturn <div data-a={ borderColour } data-b={ borderColourHover } />;',
			'}',
			'',
		].join( '\n' )
	);

	// ── NEGATIVE 2 — a whitelisted runtime global in JSX.
	write(
		'components/GoodGlobal.js',
		[
			'export default function GoodGlobal() {',
			"\treturn <div data-u={ encodeURIComponent( 'x' ) } data-w={ window.innerWidth } />;",
			'}',
			'',
		].join( '\n' )
	);

	// ── NEGATIVE 3 — sgs/product-search's real require-in-try/catch shape.
	// Legitimate graceful degradation, explicitly NOT a defect.
	write(
		'blocks/good-require/edit.js',
		[
			'let NumberControl;',
			'try {',
			"\t( { __experimentalNumberControl: NumberControl } = require( '@wordpress/components' ) );",
			'} catch ( e ) {',
			'\tNumberControl = null;',
			'}',
			'',
			'export default function Edit() {',
			'\treturn <div data-n={ NumberControl ? 1 : 0 } />;',
			'}',
			'',
		].join( '\n' )
	);

	// ── NEGATIVE 4 — ESLint's `/* global */` directive declares an optional
	// runtime global. post-grid/view.js's real shape.
	write(
		'blocks/good-declared-global/view.js',
		[
			'/* global wpApiSettings */',
			'',
			"export const BASE = wpApiSettings.root + '/x';",
			'',
		].join( '\n' )
	);

	// ── NEGATIVE 5 — a `typeof` operand never throws, even undeclared. That is
	// the whole point of the optional-global guard; flagging it would be a
	// false positive on correct defensive code.
	write(
		'blocks/good-typeof/view.js',
		[
			"export const HAS = typeof someOptionalThing !== 'undefined';",
			'',
		].join( '\n' )
	);

	// ── POSITIVE 4 — THE OVER-SKIP CONTROL. A file carrying a `/* global */`
	// directive for one name must STILL be checked for every other name. Without
	// this, one directive could silently switch the gate off for a whole file.
	write(
		'blocks/bad-despite-directive/view.js',
		[
			'/* global someDeclaredThing */',
			'',
			'export const V = someDeclaredThing + stillUnbound;',
			'',
		].join( '\n' )
	);

	// ── CORPUS assertion. A findings count cannot detect a file the walker
	// never opened; the denominator can. components/ is included on purpose —
	// roster.js-style block.json-gated enumeration would miss it entirely.
	const files = collectFiles( root );
	assert( 'corpus: walker finds all 9 fixture files', files.length === 9 );
	assert(
		'corpus: components/ is IN scope (not block.json-gated)',
		files.some( ( f ) => f.replace( /\\/g, '/' ).includes( '/components/GoodGlobal.js' ) )
	);

	const { findings } = scanTree( root );
	const at = ( slug ) => findings.filter( ( f ) => f.file.replace( /\\/g, '/' ).includes( slug ) );

	assert(
		'CATCHES the c7e4ebdb shape (referenced in JSX, never destructured)',
		at( 'bad-jsx-ref' ).length === 1 && at( 'bad-jsx-ref' )[ 0 ].name === 'borderColourHover'
	);
	assert(
		'CATCHES the sibling-helper-scope variant (bound in a helper, used in Edit JSX)',
		at( 'bad-helper-scope' ).length === 1 &&
			at( 'bad-helper-scope' )[ 0 ].name === 'quoteColourHover'
	);
	assert(
		'COUNTS an unparseable file rather than skipping it',
		at( 'bad-parse' ).length === 1 && at( 'bad-parse' )[ 0 ].kind === 'parse-error'
	);
	assert( 'does NOT flag a correctly destructured attribute', at( 'good-bound' ).length === 0 );
	assert( 'does NOT flag whitelisted globals', at( 'GoodGlobal' ).length === 0 );
	assert( 'does NOT flag require-in-try/catch (product-search shape)', at( 'good-require' ).length === 0 );
	assert(
		'does NOT flag a name declared via ESLint /* global */',
		at( 'good-declared-global' ).length === 0
	);
	assert( 'does NOT flag a typeof operand (never throws)', at( 'good-typeof' ).length === 0 );

	// The exemption must not overmatch: one /* global */ cannot silence a file.
	assert(
		'STILL flags an unbound name in a file that carries a /* global */ for a DIFFERENT name',
		at( 'bad-despite-directive' ).length === 1 &&
			at( 'bad-despite-directive' )[ 0 ].name === 'stillUnbound'
	);

	// ── The over-match control. Per-fixture assertions above catch a gate that
	// finds too little; only this one catches a gate that finds too much.
	assert( 'total findings are EXACTLY 4', findings.length === 4 );

	fs.rmSync( root, { recursive: true, force: true } );

	process.stdout.write(
		failures.length === 0
			? '\n[check-undefined-refs --self-test] ALL ASSERTIONS PASS.\n'
			: `\n[check-undefined-refs --self-test] ${ failures.length } FAILURE(S).\n`
	);
	process.exitCode = failures.length === 0 ? 0 : 1;
}

module.exports = { run };
