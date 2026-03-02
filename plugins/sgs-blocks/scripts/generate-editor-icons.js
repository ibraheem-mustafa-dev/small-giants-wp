#!/usr/bin/env node
/**
 * Generate a JS module of Lucide icon SVG inner paths for the block editor.
 *
 * Parses includes/lucide-icons.php and extracts icon-name → inner SVG content.
 * Output: src/utils/lucide-editor-map.js
 *
 * Usage: node scripts/generate-editor-icons.js
 *
 * @package SGS\Blocks
 */

const fs = require( 'fs' );
const path = require( 'path' );

const phpFile = path.resolve( __dirname, '..', 'includes', 'lucide-icons.php' );
const outFile = path.resolve( __dirname, '..', 'src', 'utils', 'lucide-editor-map.js' );

const php = fs.readFileSync( phpFile, 'utf-8' );

// Match: 'icon-name' => '...svg markup...',
const iconRegex = /^\s*'([a-z0-9-]+)'\s*=>\s*'(.+?)',?\s*$/gm;
const icons = {};
let match;

while ( ( match = iconRegex.exec( php ) ) !== null ) {
	const name = match[ 1 ];
	const fullSvg = match[ 2 ];

	// Extract inner content (everything between <svg ...> and </svg>)
	const innerMatch = fullSvg.match( /<svg[^>]*>([\s\S]*?)<\/svg>/ );
	if ( innerMatch ) {
		icons[ name ] = innerMatch[ 1 ].trim();
	}
}

const count = Object.keys( icons ).length;

// Build output — export as a default object + a names array for search
const lines = [
	'/**',
	` * Auto-generated Lucide icon map for the block editor (${ count } icons).`,
	' * DO NOT EDIT — run: node scripts/generate-editor-icons.js',
	` * Generated: ${ new Date().toISOString() }`,
	' *',
	' * @package SGS\\Blocks',
	' */',
	'',
	'/* eslint-disable */',
	'',
	'const LUCIDE_ICONS = {',
];

for ( const [ name, inner ] of Object.entries( icons ) ) {
	// Escape single quotes in SVG content
	const escaped = inner.replace( /'/g, "\\'" );
	lines.push( `\t'${ name }': '${ escaped }',` );
}

lines.push( '};', '' );
lines.push( 'export const ICON_NAMES = Object.keys( LUCIDE_ICONS );', '' );
lines.push( 'export default LUCIDE_ICONS;', '' );

fs.writeFileSync( outFile, lines.join( '\n' ), 'utf-8' );
console.log( `Generated ${ outFile } with ${ count } icons.` );
