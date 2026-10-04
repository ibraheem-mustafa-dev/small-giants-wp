#!/usr/bin/env node
/**
 * Removes context keys nothing reads from every block.json: `sgs/formId`,
 * `sgs/tabsOrientation`, `sgs/tabsStyle` (usesContext entries and
 * providesContext entries). Text-level edit so each file keeps its own
 * indentation; the result is re-parsed to prove it is still valid JSON.
 *
 * Usage: node scripts/codemods/remove-dead-context-keys.js [--check]
 *   --check  list files that still carry a dead key and exit 1 (no writes).
 */
const fs = require( 'fs' );
const path = require( 'path' );

const DEAD_KEYS = [ 'sgs/formId', 'sgs/tabsOrientation', 'sgs/tabsStyle' ];
const BLOCKS_DIR = path.join( __dirname, '..', '..', 'src', 'blocks' );

function stripKeys( text ) {
	const lines = text.split( /\r?\n/ );
	const eol = text.includes( '\r\n' ) ? '\r\n' : '\n';
	const out = [];
	let i = 0;
	while ( i < lines.length ) {
		const open = lines[ i ].match( /^(\s*)"(usesContext|providesContext)"\s*:\s*([\[{])\s*$/ );
		if ( ! open ) {
			out.push( lines[ i ] );
			i++;
			continue;
		}
		const closer = '[' === open[ 3 ] ? ']' : '}';
		let j = i + 1;
		const body = [];
		while ( ! lines[ j ].trim().startsWith( closer ) ) {
			body.push( lines[ j ] );
			j++;
		}
		const kept = body.filter( ( l ) => ! DEAD_KEYS.some( ( k ) => l.includes( `"${ k }"` ) ) );
		if ( kept.length === body.length ) {
			out.push( lines[ i ], ...body, lines[ j ] );
		} else if ( kept.length > 0 ) {
			kept[ kept.length - 1 ] = kept[ kept.length - 1 ].replace( /,\s*$/, '' );
			out.push( lines[ i ], ...kept, lines[ j ] );
		} else {
			// Whole entry empty: drop it, and the trailing comma on its closer.
			const trailingComma = /,\s*$/.test( lines[ j ] );
			if ( ! trailingComma && out.length ) {
				out[ out.length - 1 ] = out[ out.length - 1 ].replace( /,\s*$/, '' );
			}
		}
		i = j + 1;
	}
	return out.join( eol );
}

function carriesDeadKey( text ) {
	return DEAD_KEYS.some( ( k ) => text.includes( `"${ k }"` ) );
}

const check = process.argv.includes( '--check' );
let dirty = 0;
for ( const slug of fs.readdirSync( BLOCKS_DIR ) ) {
	const file = path.join( BLOCKS_DIR, slug, 'block.json' );
	if ( ! fs.existsSync( file ) ) {
		continue;
	}
	const text = fs.readFileSync( file, 'utf8' );
	if ( ! carriesDeadKey( text ) ) {
		continue;
	}
	dirty++;
	if ( check ) {
		console.log( `${ slug }/block.json still lists a dead context key` );
		continue;
	}
	const next = stripKeys( text );
	JSON.parse( next );
	if ( carriesDeadKey( next ) ) {
		throw new Error( `${ slug }: dead key survived the strip` );
	}
	fs.writeFileSync( file, next );
	console.log( `fixed ${ slug }/block.json` );
}
if ( check && dirty ) {
	process.exit( 1 );
}
console.log( check ? 'no dead context keys' : `${ dirty } files changed` );
