/**
 * Standing gate for the sgs/site-header float attribute defaults
 * (src/blocks/site-header/float-preview.js::FLOAT_DEFAULTS vs block.json).
 *
 * What it protects: every "reset" path on the Header behaviour panel writes a
 * value back into the attribute. If that value is not the one block.json
 * DECLARES as the default, the reset is a change — the block stays dirty, and
 * the serialised post content carries an attribute matching no default. Three
 * paths had drifted: two ToolsPanelItem `onDeselect` handlers and
 * `floatResetAttributes()`, each with its own literal.
 *
 * The literals are now one exported constant, and this asserts that constant
 * against block.json itself, so the editor and the schema cannot disagree
 * silently. A deep comparison, not a shape check: a breakpoint of 1024 where
 * block.json says 768 is exactly the defect.
 *
 * Carries NEGATIVE CONTROLS. A comparison that cannot fail proves nothing, so
 * the same comparison is re-run against deliberately wrong defaults (the empty
 * inset that shipped, a carried-over breakpoint, a missing key) and must REJECT
 * each one. Without that, an assertion that stopped asserting stays green.
 *
 * Run:  node scripts/tests/test-float-defaults.mjs
 * Exit: 0 = green, 1 = red.
 */

import { fileURLToPath } from 'node:url';
import { readFileSync, existsSync } from 'node:fs';
import { registerHooks } from 'node:module';
import path from 'node:path';

const BS = String.fromCharCode( 92 );

// The source imports `../../utils/responsive` without an extension, which
// webpack resolves and node does not. Resolving it here keeps the test reading
// the REAL module — rewriting the import into a copy would test the copy.
registerHooks( {
	resolve( specifier, context, nextResolve ) {
		if ( specifier.startsWith( '.' ) && ! /\.[cm]?js$/.test( specifier ) ) {
			const from = fileURLToPath( context.parentURL );
			const guess = path.resolve( path.dirname( from ), specifier + '.js' );
			if ( existsSync( guess ) ) {
				return { url: 'file:///' + guess.split( BS ).join( '/' ), shortCircuit: true };
			}
		}
		return nextResolve( specifier, context );
	},
} );

const HERE = path.dirname( fileURLToPath( import.meta.url ) );
const P = ( process.argv[ 2 ] || path.resolve( HERE, '..', '..' ) )
	.split( BS )
	.join( '/' );

const { FLOAT_DEFAULTS, floatDefault, floatResetAttributes, isFloatDefault } =
	await import( 'file:///' + P + '/src/blocks/site-header/float-preview.js' );

const blockJson = JSON.parse(
	readFileSync( P + '/src/blocks/site-header/block.json', 'utf8' )
);

let failures = 0;
let ran = 0;

function report( name, ok, detail ) {
	ran++;
	if ( ok ) {
		return;
	}
	failures++;
	process.stdout.write( `FAIL ${ name }\n` );
	if ( detail ) {
		process.stdout.write( `     ${ detail }\n` );
	}
}

/**
 * Order-insensitive deep equality for the plain JSON shapes involved.
 *
 * @param {*} a First value.
 * @param {*} b Second value.
 * @return {boolean} True when equal.
 */
function deepEqual( a, b ) {
	const plain = ( v ) =>
		null !== v && typeof v === 'object' && ! Array.isArray( v );
	if ( plain( a ) && plain( b ) ) {
		const keys = new Set( [ ...Object.keys( a ), ...Object.keys( b ) ] );
		return [ ...keys ].every( ( k ) => deepEqual( a[ k ], b[ k ] ) );
	}
	return a === b;
}

// ── 1. Every constant matches the declared default, key for key. ───────────
const NAMES = Object.keys( FLOAT_DEFAULTS );
report(
	'FLOAT_DEFAULTS covers exactly the four float attributes',
	NAMES.length === 4 &&
		[
			'headerFloat',
			'headerFloatInset',
			'headerFloatCollapse',
			'backdropBlur',
		].every( ( n ) => NAMES.includes( n ) ),
	`got: ${ NAMES.join( ', ' ) }`
);

for ( const name of NAMES ) {
	const declared = blockJson.attributes?.[ name ]?.default;
	report(
		`${ name } constant equals the block.json default`,
		deepEqual( FLOAT_DEFAULTS[ name ], declared ),
		`constant ${ JSON.stringify(
			FLOAT_DEFAULTS[ name ]
		) } vs block.json ${ JSON.stringify( declared ) }`
	);
}

// ── 2. The reset path writes those same values. ────────────────────────────
const reset = floatResetAttributes();
for ( const name of NAMES ) {
	report(
		`floatResetAttributes() restores the declared ${ name }`,
		deepEqual( reset[ name ], blockJson.attributes?.[ name ]?.default ),
		`reset wrote ${ JSON.stringify( reset[ name ] ) }`
	);
}

// ── 3. floatDefault() hands back a COPY, never the shared object. ──────────
const copy = floatDefault( 'headerFloatCollapse' );
copy.breakpoint = 1;
report(
	'floatDefault() returns a copy, so a mutation cannot rewrite the default',
	FLOAT_DEFAULTS.headerFloatCollapse.breakpoint ===
		blockJson.attributes.headerFloatCollapse.default.breakpoint,
	`FLOAT_DEFAULTS mutated to ${ FLOAT_DEFAULTS.headerFloatCollapse.breakpoint }`
);

// ── 4. isFloatDefault() recognises the declared default and rejects a change.
report(
	'isFloatDefault() accepts the declared inset',
	true ===
		isFloatDefault(
			'headerFloatInset',
			blockJson.attributes.headerFloatInset.default
		)
);
report(
	'isFloatDefault() rejects an operator-set inset',
	false ===
		isFloatDefault( 'headerFloatInset', { desktop: { top: '3rem' } } )
);
report(
	'isFloatDefault() rejects the empty inset that used to be written on reset',
	false === isFloatDefault( 'headerFloatInset', {} )
);

// ── NEGATIVE CONTROLS — the comparison must be able to fail. ───────────────
const mustReject = [
	[ 'the empty inset that shipped as the reset value', 'headerFloatInset', {} ],
	[
		'a breakpoint carried over from the value being reset',
		'headerFloatCollapse',
		{ enabled: false, breakpoint: 1024 },
	],
	[
		'a collapse default missing its breakpoint key',
		'headerFloatCollapse',
		{ enabled: false },
	],
	[ 'a non-empty float tri-state', 'headerFloat', { desktop: 'on' } ],
	[ 'a blur default that is not empty', 'backdropBlur', '10px' ],
];
for ( const [ label, name, wrong ] of mustReject ) {
	report(
		`[neg] the comparison REJECTS ${ label }`,
		! deepEqual( wrong, blockJson.attributes[ name ].default ),
		'the deep comparison accepted a known-wrong default — it has stopped asserting'
	);
}

process.stdout.write(
	`${ ran - failures }/${ ran } float-default assertions passed\n`
);
process.exit( failures > 0 ? 1 : 0 );
