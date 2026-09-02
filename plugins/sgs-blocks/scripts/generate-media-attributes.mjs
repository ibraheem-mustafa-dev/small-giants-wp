/**
 * Single source of truth for the media attribute TYPE map, JS -> PHP.
 *
 * `MEDIA_ATTR_TYPES` and `MEDIA_BASES` live in
 * `src/components/MediaElementControls.js`. The server needs the same
 * information to register the attributes on `register_block_type_args`, so this
 * script imports the REAL module and emits
 * `includes/media-element-attributes.generated.php`.
 *
 * ⛔ WHY GENERATE RATHER THAN HAND-MAINTAIN. WordPress coerces a value that does
 * not match its declared type back to the attribute's default, SILENTLY. If the
 * two type maps drift, the client's stored media does not error - it vanishes on
 * load (STOP-D328-SHAPE-NOT-JUST-VALUE). A hand-kept copy is a slow leak with no
 * failure signal.
 *
 * Imports the module rather than parsing it, for the same reason
 * `generate-svg-allowlist.js` executes its PHP: a parser would reimplement the
 * thing it mirrors and could then disagree with it.
 *
 * USAGE
 *   node scripts/generate-media-attributes.mjs            # write
 *   node scripts/generate-media-attributes.mjs --check    # gate: fail if stale
 *   node scripts/generate-media-attributes.mjs --self-test
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const HERE = path.dirname( fileURLToPath( import.meta.url ) );
const PLUGIN_DIR = path.resolve( HERE, '..' );
const OUT_FILE = path.join(
	PLUGIN_DIR,
	'includes',
	'media-element-attributes.generated.php'
);

const toUrl = ( ...seg ) =>
	'file:///' +
	path
		.join( PLUGIN_DIR, ...seg )
		.split( String.fromCharCode( 92 ) )
		.join( '/' );

const { MEDIA_ATTR_TYPES, MEDIA_BASES, MEDIA_TIERED_BASES } = await import(
	toUrl( 'src', 'components', 'MediaElementControls.js' )
);

// The atom registry is imported, never re-declared: the atom -> bases map is
// what drives selective injection on BOTH sides, and two copies of it would be
// two chances to disagree about which attributes a surface receives.
const { MEDIA_ATOMS } = await import(
	toUrl( 'src', 'components', 'media', 'atoms', 'registry.js' )
);

function phpValue( value ) {
	if ( Array.isArray( value ) ) {
		return (
			'array( ' + value.map( ( v ) => JSON.stringify( v ) ).join( ', ' ) + ' )'
		);
	}
	return JSON.stringify( value );
}

function render() {
	const bases = Object.keys( MEDIA_ATTR_TYPES )
		.sort()
		.map(
			( b ) =>
				`\t\t${ JSON.stringify( b ).padEnd( 26 ) } => ${ phpValue(
					MEDIA_ATTR_TYPES[ b ]
				) },`
		);

	const groups = Object.keys( MEDIA_BASES )
		.sort()
		.map( ( g ) => {
			const list = MEDIA_BASES[ g ]
				.map( ( b ) => `\n\t\t\t${ JSON.stringify( b ) },` )
				.join( '' );
			return `\t\t${ JSON.stringify( g ).padEnd( 14 ) } => array(${ list }\n\t\t),`;
		} );

	const tiered = MEDIA_TIERED_BASES.slice()
		.sort()
		.map( ( b ) => `
		${ JSON.stringify( b ) },` )
		.join( '' );

	const atoms = Object.keys( MEDIA_ATOMS )
		.sort()
		.map( ( id ) => {
			const list = MEDIA_ATOMS[ id ].bases
				.map( ( b ) => `
			${ JSON.stringify( b ) },` )
				.join( '' );
			return `		${ JSON.stringify( id ).padEnd( 20 ) } => array(${ list }
		),`;
		} );

	return `<?php
/**
 * GENERATED FILE - DO NOT EDIT.
 *
 * Source: src/components/MediaElementControls.js
 *         ( MEDIA_ATTR_TYPES + MEDIA_BASES )
 * Regenerate: node scripts/generate-media-attributes.mjs
 * Gate:       node scripts/generate-media-attributes.mjs --check
 *
 * Four maps, mirrored for the server so register_block_type_args() registers
 * exactly the schema the editor injects:
 *
 *   bases   base -> declared type
 *   groups  vocabulary group -> its bases
 *   tiered  the bases that carry Tablet/Mobile siblings
 *   atoms   atom id -> its bases (this is what drives SELECTIVE injection)
 *
 * Editing this by hand makes the two sides disagree - and a type mismatch does
 * not error, it makes WordPress silently coerce the stored value back to its
 * default, deleting the client's media on load.
 *
 * @package SGS\\Blocks
 */

return array(
	'bases'  => array(
${ bases.join( '\n' ) }
	),
	'groups' => array(
${ groups.join( '\n' ) }
	),
	'tiered' => array(${ tiered }
	),
	'atoms'  => array(
${ atoms.join( '\n' ) }
	),
);
`;
}

function selfTest() {
	const fails = [];
	// `ran` counts real invocations. The total was a hardcoded 6, which silently
	// under-reported the moment an assertion was added - a counter that cannot
	// track its own subject is an instrument that lies.
	let ran = 0;
	const ck = ( n, c ) => {
		ran += 1;
		if ( ! c ) {
			fails.push( n );
		}
	};

	ck( 'MEDIA_ATTR_TYPES is populated', Object.keys( MEDIA_ATTR_TYPES ).length > 20 );
	ck( 'MEDIA_BASES has source + behaviour', !! MEDIA_BASES.source && !! MEDIA_BASES.behaviour );
	ck( 'MEDIA_BASES has the presentation groups', !! MEDIA_BASES.fit && !! MEDIA_BASES.overlay );
	ck( 'MEDIA_TIERED_BASES is populated', MEDIA_TIERED_BASES.length > 10 );
	// Exact-count assertions go stale every time a wave adds an atom (10 -> 16
	// across Waves 5a-5c alone) with no behavioural signal that anything is
	// actually wrong - a self-test failure that fires on every legitimate
	// addition trains people to ignore it. Threshold like the other
	// cardinality checks in this file instead.
	ck( 'MEDIA_ATOMS is populated', Object.keys( MEDIA_ATOMS ).length > 10 );

	// Every base must belong to exactly ONE atom. Two atoms claiming a base
	// would make selective injection ambiguous; zero would make the base
	// unreachable by any surface, which is a silently missing control.
	const owner = {};
	const dupes = [];
	Object.keys( MEDIA_ATOMS ).forEach( ( id ) =>
		MEDIA_ATOMS[ id ].bases.forEach( ( b ) => {
			if ( owner[ b ] ) {
				dupes.push( `${ b }: ${ owner[ b ] } + ${ id }` );
			}
			owner[ b ] = id;
		} )
	);
	ck( `no base claimed by two atoms (${ dupes.join( '; ' ) })`, dupes.length === 0 );

	const orphans = Object.keys( MEDIA_BASES )
		.flatMap( ( g ) => MEDIA_BASES[ g ] )
		.filter( ( b ) => ! owner[ b ] );
	ck( `every base belongs to an atom (${ orphans.join( ', ' ) })`, orphans.length === 0 );

	// A tiered base nothing owns would inject Tablet/Mobile siblings for an
	// attribute no atom can request.
	const strayTiers = MEDIA_TIERED_BASES.filter( ( b ) => ! owner[ b ] );
	ck( `every tiered base belongs to an atom (${ strayTiers.join( ', ' ) })`, strayTiers.length === 0 );

	// Every base named in MEDIA_BASES must carry a declared type, or the server
	// falls back to 'string' and an object-shaped value is coerced to default.
	const missing = [];
	Object.keys( MEDIA_BASES ).forEach( ( g ) =>
		MEDIA_BASES[ g ].forEach( ( b ) => {
			if ( ! MEDIA_ATTR_TYPES[ b ] ) {
				missing.push( `${ g }.${ b }` );
			}
		} )
	);
	ck( `every base has a declared type (missing: ${ missing.join( ', ' ) || 'none' })`, ! missing.length );

	const php = render();
	ck( 'render emits a php open tag', php.startsWith( '<?php' ) );
	ck( 'render emits the object shapes', php.includes( '"Thumbnail"' ) && php.includes( '"object"' ) );
	ck( 'render emits the groups', php.includes( '"behaviour"' ) );

	fails.forEach( ( f ) => process.stdout.write( `  FAIL ${ f }\n` ) );
	// NEGATIVE CONTROL - prove the harness can register a failure at all.
	// A self-test never seen to go red is a decoration.
	const before = fails.length;
	ck( 'NEGATIVE CONTROL (expected to fail)', false );
	const controlWorks = fails.length === before + 1;
	fails.pop();
	ran -= 1;
	if ( ! controlWorks ) {
		process.stdout.write( 'FAIL - the harness cannot detect a failure' );
		return 1;
	}
	const total = ran;
	process.stdout.write(
		`\n${ fails.length ? 'FAIL' : 'PASS' } - ${ total - fails.length }/${ total } assertions (negative control verified)\n`
	);
	return fails.length ? 1 : 0;
}

if ( process.argv.includes( '--self-test' ) ) {
	process.exit( selfTest() );
}

const out = render();

if ( process.argv.includes( '--check' ) ) {
	const current = fs.existsSync( OUT_FILE ) ? fs.readFileSync( OUT_FILE, 'utf8' ) : '';
	if ( current !== out ) {
		process.stderr.write(
			'[generate-media-attributes] STALE: includes/media-element-attributes.generated.php ' +
				'does not match MediaElementControls.js.\n' +
				'The server schema and the editor injection have DIVERGED. ' +
				'Run: node scripts/generate-media-attributes.mjs\n'
		);
		process.exit( 1 );
	}
	process.stdout.write( '[generate-media-attributes] OK - PHP mirrors JS.\n' );
	process.exit( 0 );
}

fs.writeFileSync( OUT_FILE, out, 'utf8' );
process.stdout.write(
	'[generate-media-attributes] wrote includes/media-element-attributes.generated.php\n'
);
