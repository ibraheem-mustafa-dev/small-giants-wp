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
