/**
 * Generates includes/lucide-icons.php from lucide-static SVG files.
 *
 * Run: node scripts/generate-icons.js
 * Hooked into: npm run build (via prebuild script)
 */

const fs = require( 'fs' );
const path = require( 'path' );

const ICONS_DIR = path.resolve(
	__dirname,
	'../node_modules/lucide-static/icons'
);
const OUTPUT_FILE = path.resolve( __dirname, '../includes/lucide-icons.php' );

if ( ! fs.existsSync( ICONS_DIR ) ) {
	console.error( 'lucide-static icons directory not found. Run npm install.' );
	process.exit( 1 );
}

const files = fs.readdirSync( ICONS_DIR ).filter( ( f ) => f.endsWith( '.svg' ) );
const icons = {};

for ( const file of files ) {
	const name = file.replace( '.svg', '' );
	let svg = fs.readFileSync( path.join( ICONS_DIR, file ), 'utf8' ).trim();

	// Strip newlines and normalise whitespace for compact PHP output.
	svg = svg.replace( /\n/g, '' ).replace( /\s{2,}/g, ' ' );

	icons[ name ] = svg;
}

// Build PHP output.
const phpLines = [
	'<?php',
	'/**',
	' * Auto-generated Lucide icon map — DO NOT EDIT.',
	` * Generated from lucide-static (${ files.length } icons).`,
	` * Last generated: ${ new Date().toISOString() }`,
	' *',
	' * Auto-generated — exempt from 300-line limit. See scripts/generate-icons.js.',
	' *',
	' * @package SGS\\Blocks',
	' */',
	'',
	"defined( 'ABSPATH' ) || exit;",
	'',
	'/**',
	' * Return the full Lucide icon SVG map.',
	' *',
	' * Uses a static variable so the array is only built once per request.',
	' *',
	' * @param string $name Icon name (e.g. "clock", "shield-check").',
	' * @return string SVG markup or empty string if not found.',
	' */',
	'function sgs_get_lucide_icon( $name ) {',
	'	static $icons = null;',
	'	if ( null === $icons ) {',
	'		$icons = array(',
];

for ( const [ name, svg ] of Object.entries( icons ) ) {
	// Escape single quotes in SVG content for PHP.
	const escaped = svg.replace( /'/g, "\\'" );
	phpLines.push( `			'${ name }' => '${ escaped }',` );
}

phpLines.push(
	'		);',
	'	}',
	'',
	'	// Aliases for backwards-compatible icon names (e.g. @wordpress/icons slugs).',
	"	static $aliases = array(",
	"		'star-filled'  => 'star',",
	"		'user-group'   => 'users',",
	"		'shipping'     => 'truck',",
	"		'people'       => 'users',",
	"		'map-marker'   => 'map-pin',",
	"		'payment'      => 'credit-card',",
	"		'inbox'        => 'mail',",
	"		'megaphone'    => 'megaphone',",
	"	);",
	'',
	"	if ( isset( $icons[ $name ] ) ) {",
	"		return $icons[ $name ];",
	'	}',
	"	if ( isset( $aliases[ $name ] ) && isset( $icons[ $aliases[ $name ] ] ) ) {",
	"		return $icons[ $aliases[ $name ] ];",
	'	}',
	"	return '';",
	'}',
	''
);

// Ensure includes/ directory exists.
const includesDir = path.dirname( OUTPUT_FILE );
if ( ! fs.existsSync( includesDir ) ) {
	fs.mkdirSync( includesDir, { recursive: true } );
}

fs.writeFileSync( OUTPUT_FILE, phpLines.join( '\n' ), 'utf8' );
console.log(
	`Generated ${ OUTPUT_FILE } with ${ Object.keys( icons ).length } icons.`
);

// ── Editor-side assets for the in-editor IconPicker ─────────────────────────────
// These are static JSON assets fetched on-demand by the IconPicker modal (editor
// only, never the frontend, never inlined into the JS bundle). This keeps the
// editor script lean while still allowing a searchable visual grid of all icons.
// The frontend continues to render from lucide-icons.php (single source of truth).
const ASSETS_DIR = path.resolve( __dirname, '../assets/icons' );
if ( ! fs.existsSync( ASSETS_DIR ) ) {
	fs.mkdirSync( ASSETS_DIR, { recursive: true } );
}

// 1. Full Lucide SVG map { name: svgMarkup } — lazy-fetched once per editor session.
fs.writeFileSync(
	path.join( ASSETS_DIR, 'lucide-icons.json' ),
	JSON.stringify( icons ),
	'utf8'
);

// 2. Lucide search aliases { name: [tag, …] } — copied from lucide-static.
const tagsSrc = path.resolve(
	__dirname,
	'../node_modules/lucide-static/tags.json'
);
if ( fs.existsSync( tagsSrc ) ) {
	fs.copyFileSync( tagsSrc, path.join( ASSETS_DIR, 'lucide-tags.json' ) );
}

// 2b. WordPress-icon SVG map { slug: svgMarkup } — parsed from the canonical
//     server-side map in includes/wp-icons.php so the editor preview is byte-identical
//     to the frontend render (single source of truth — never hand-duplicated).
const WP_ICONS_PHP = path.resolve( __dirname, '../includes/wp-icons.php' );
if ( fs.existsSync( WP_ICONS_PHP ) ) {
	const php = fs.readFileSync( WP_ICONS_PHP, 'utf8' );
	const wpIcons = {};
	// Match array entries:  'slug' => '<svg …</svg>',
	const re = /'([a-z0-9-]+)'\s*=>\s*'(<svg[\s\S]*?<\/svg>)'/g;
	let m;
	while ( ( m = re.exec( php ) ) !== null ) {
		wpIcons[ m[ 1 ] ] = m[ 2 ];
	}
	fs.writeFileSync(
		path.join( ASSETS_DIR, 'wp-icons.json' ),
		JSON.stringify( wpIcons ),
		'utf8'
	);
}

// 3. Emoji dataset — flattened from unicode-emoji-json into a compact searchable
//    list [{ c: char, n: name, g: group, k: searchString }].
try {
	const byGroup = require( 'unicode-emoji-json/data-by-group.json' );
	const emoji = [];
	for ( const group of Object.values( byGroup ) ) {
		const groupName = group.name || '';
		for ( const item of group.emojis || [] ) {
			const search = `${ item.name } ${ item.slug || '' } ${ groupName }`
				.toLowerCase()
				.replace( /_/g, ' ' );
			emoji.push( {
				c: item.emoji,
				n: item.name,
				g: groupName,
				k: search,
			} );
		}
	}
	fs.writeFileSync(
		path.join( ASSETS_DIR, 'emoji.json' ),
		JSON.stringify( emoji ),
		'utf8'
	);
	console.log(
		`Generated editor icon assets in ${ ASSETS_DIR } (${ Object.keys( icons ).length } lucide + ${ emoji.length } emoji).`
	);
} catch ( err ) {
	console.warn(
		'unicode-emoji-json not found — emoji.json not generated. Run npm install.',
		err.message
	);
}
