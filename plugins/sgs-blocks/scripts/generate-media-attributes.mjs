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

const { MEDIA_ATTR_TYPES, MEDIA_BASES } = await import(
	'file:///' +
		path
			.join( PLUGIN_DIR, 'src', 'components', 'MediaElementControls.js' )
			.split( String.fromCharCode( 92 ) )
			.join( '/' )
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

	return `<?php
/**
 * GENERATED FILE - DO NOT EDIT.
 *
 * Source: src/components/MediaElementControls.js
 *         ( MEDIA_ATTR_TYPES + MEDIA_BASES )
 * Regenerate: node scripts/generate-media-attributes.mjs
 * Gate:       node scripts/generate-media-attributes.mjs --check
 *
 * The declared TYPE for every media attribute base, mirrored for the server so
 * register_block_type_args() can register the same schema the editor injects.
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
);
`;
}

function selfTest() {
	const fails = [];
	const ck = ( n, c ) => {
		if ( ! c ) {
			fails.push( n );
		}
	};

	ck( 'MEDIA_ATTR_TYPES is populated', Object.keys( MEDIA_ATTR_TYPES ).length > 20 );
	ck( 'MEDIA_BASES has source + behaviour', !! MEDIA_BASES.source && !! MEDIA_BASES.behaviour );

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
	ck( 'render emits the object shapes', php.includes( '"Image"' ) && php.includes( '"object"' ) );
	ck( 'render emits the groups', php.includes( '"behaviour"' ) );

	fails.forEach( ( f ) => process.stdout.write( `  FAIL ${ f }\n` ) );
	const total = 6;
	process.stdout.write(
		`\n${ fails.length ? 'FAIL' : 'PASS' } - ${ total - fails.length }/${ total } assertions\n`
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
