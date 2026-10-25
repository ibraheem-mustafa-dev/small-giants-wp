#!/usr/bin/env node
// Counts the `no-setting` rows of a client's Fill runs by the cause signatures of
// .claude/reports/2026-10-25-no-setting-diagnosis.md, so every route unit can record a baseline and a drop.
//   node scripts/computed-route/tools/no-setting-count.mjs <client> [--surfaces a,b] [--runs <stamp>] [--root <repo>] [--json]
// Per surface the run is the newest folder under sites/<client>/build/qa/fill/<surface>/ that holds an unmapped.json,
// or the folder named by --runs (a stamp such as 2026-10-25T08-36-16; surfaces without it are skipped).
// A row is a `no-setting` row when its reason starts with "no-setting". It takes the FIRST signature below whose every
// field pattern matches the row's own block, property, value, state and reason; a row matching none is "other".
// Prints the total, each signature's count, then the block and property pairs; exit 0, or 2 on a usage error.
import fs from 'fs';
import path from 'path';
import { fileURLToPath, pathToFileURL } from 'url';

const HERE = path.dirname( fileURLToPath( import.meta.url ) );
const REPO = path.resolve( HERE, '..', '..', '..' );

// One entry per signature, in match order (an earlier entry wins an overlapping row). `cause` is the report's root
// cause number or verdict; `match` maps a row field (block, property, value, state, reason) to a regular expression
// source, every one of which must match (an absent state is the empty string). Add a signature by adding one entry.
export const SIGNATURES = [
	{ name: 'ring-decision', cause: 'ring', match: { block: '^sgs/decorative-image$' } },
	{ name: 'media-font-longhands', cause: 1, match: { block: '^sgs/media$', property: '^font-' } },
	{ name: 'form-no-host', cause: 2, match: { block: '^sgs/form-field-' } },
	{ name: 'label-dot-never-emitted', cause: 10, match: { block: '^sgs/label$', property: '^(align-items|column-gap|row-gap)$' } },
	{ name: 'zero-duration-read-as-design', cause: 8, match: { property: '^transition-duration$', value: '^0s(, 0s)*$', state: '^$' } },
	{ name: 'position-z-index-unmeasured', cause: 3, match: { property: '^(position|z-index)$', reason: 'default paint is unmeasured' } },
	{ name: 'transition-timing-reported-twice', cause: 4, match: { property: '^transition-(duration|timing-function|delay|property)$' } },
	{ name: 'hover-shorthand-reset', cause: 9, match: { property: '^background-(attachment|clip|origin|position-x|position-y|repeat|size)$', state: '^hover$' } },
	{ name: 'display-blockification', cause: 7, match: { property: '^display$' } },
	{ name: 'box-paint-other-slot', cause: 6, match: { block: '^sgs/(label|icon)$', property: '^(background-color|border-[a-z-]*radius)$' } },
	{ name: 'same-box-part-paint', cause: 10, match: { block: '^sgs/breadcrumbs$' } },
	{ name: 'option-picker-uncalibrated', cause: 10, match: { block: '^sgs/option-picker$' } },
	{ name: 'container-hover-shadow', cause: 'R4', match: { block: '^sgs/container$', property: '^box-shadow$', state: '^hover$' } },
	{ name: 'container-overflow', cause: 'R4', match: { block: '^sgs/container$', property: '^overflow-[xy]$' } },
	{ name: 'container-hover-padding', cause: 'R4', match: { block: '^sgs/container$', property: '^padding-', state: '^hover$' } },
	{ name: 'media-aspect-ratio', cause: 'R4', match: { block: '^sgs/media$', property: '^aspect-ratio$' } },
	{ name: 'text-font-variant-numeric', cause: 'R4', match: { property: '^font-variant-numeric$' } },
	{ name: 'text-cursor', cause: 'R4', match: { property: '^cursor$' } },
	{ name: 'text-shadow-and-overflow', cause: 'R4', match: { property: '^(text-shadow|text-overflow)$' } },
	{ name: 'button-hover-font-weight', cause: 'R4', match: { block: '^sgs/button$', property: '^font-weight$', state: '^hover$' } },
];

const COMPILED = SIGNATURES.map( ( s ) => ( {
	...s,
	tests: Object.entries( s.match ).map( ( [ field, source ] ) => [ field, new RegExp( source ) ] ),
} ) );

const text = ( v ) => ( 'string' === typeof v ? v : null == v ? '' : JSON.stringify( v ) );

export const isNoSetting = ( row ) => String( row?.reason ?? '' ).startsWith( 'no-setting' );

// The name of the first signature the row matches, or "other".
export function signatureOf( row ) {
	for ( const s of COMPILED ) {
		if ( s.tests.every( ( [ field, re ] ) => re.test( text( row[ field ] ) ) ) ) {
			return s.name;
		}
	}
	return 'other';
}

// Rows are Fill's unmapped.json entries; returns the grouped counts.
export function countRows( rows ) {
	const noSetting = rows.filter( isNoSetting );
	const bySignature = {};
	const byPair = {};
	for ( const row of noSetting ) {
		const name = signatureOf( row );
		bySignature[ name ] = ( bySignature[ name ] ?? 0 ) + 1;
		const pair = `${ row.block } ${ row.property }`;
		byPair[ pair ] = ( byPair[ pair ] ?? 0 ) + 1;
	}
	return { total: noSetting.length, bySignature, byPair, byBlock: tally( noSetting.map( ( r ) => r.block ) ) };
}

function tally( keys ) {
	const out = {};
	for ( const k of keys ) {
		out[ k ] = ( out[ k ] ?? 0 ) + 1;
	}
	return out;
}

// The run folder to read for a surface: the named stamp, or the newest folder that holds an unmapped.json.
export function runFolder( surfaceDir, stamp ) {
	if ( stamp ) {
		const dir = path.join( surfaceDir, stamp );
		return fs.existsSync( path.join( dir, 'unmapped.json' ) ) ? dir : null;
	}
	const stamps = fs.readdirSync( surfaceDir ).filter( ( d ) => fs.existsSync( path.join( surfaceDir, d, 'unmapped.json' ) ) ).sort();
	return stamps.length ? path.join( surfaceDir, stamps[ stamps.length - 1 ] ) : null;
}

// Counts a client's runs: { surfaces: { <surface>: { run, total } }, total, bySignature, byPair, byBlock, motionRefusals }.
export function countClient( { root, client, surfaces = null, stamp = null } ) {
	const fillDir = path.join( root, 'sites', client, 'build', 'qa', 'fill' );
	if ( ! fs.existsSync( fillDir ) ) {
		throw new Error( `no Fill runs at ${ fillDir }` );
	}
	const names = ( surfaces ?? fs.readdirSync( fillDir ) ).filter( ( s ) => fs.statSync( path.join( fillDir, s ), { throwIfNoEntry: false } )?.isDirectory() );
	const all = [];
	const perSurface = {};
	let motionRefusals = 0;
	for ( const surface of names.sort() ) {
		const dir = runFolder( path.join( fillDir, surface ), stamp );
		if ( ! dir ) {
			continue;
		}
		const rows = JSON.parse( fs.readFileSync( path.join( dir, 'unmapped.json' ), 'utf8' ) );
		all.push( ...rows );
		perSurface[ surface ] = { run: path.basename( dir ), total: rows.filter( isNoSetting ).length };
		motionRefusals += rows.filter( ( r ) => ! isNoSetting( r ) && String( r.reason ?? '' ).includes( '[object Object]' ) ).length;
	}
	return { surfaces: perSurface, ...countRows( all ), motionRefusals };
}

function parseArgs( argv ) {
	const args = { client: null, surfaces: null, stamp: null, root: REPO, json: false };
	for ( let i = 0; i < argv.length; i++ ) {
		const a = argv[ i ];
		if ( '--json' === a ) {
			args.json = true;
		} else if ( '--surfaces' === a ) {
			args.surfaces = ( argv[ ++i ] ?? '' ).split( ',' ).filter( Boolean );
		} else if ( '--runs' === a ) {
			args.stamp = argv[ ++i ] ?? null;
		} else if ( '--root' === a ) {
			args.root = path.resolve( argv[ ++i ] ?? '' );
		} else if ( ! a.startsWith( '--' ) && ! args.client ) {
			args.client = a;
		} else {
			return null;
		}
	}
	return args.client ? args : null;
}

const sorted = ( counts ) => Object.entries( counts ).sort( ( a, b ) => b[ 1 ] - a[ 1 ] || a[ 0 ].localeCompare( b[ 0 ] ) );

function print( result ) {
	const lines = [ `no-setting rows: ${ result.total } across ${ Object.keys( result.surfaces ).length } surfaces`, '', 'by signature:' ];
	for ( const s of [ ...SIGNATURES.map( ( x ) => x.name ), 'other' ] ) {
		lines.push( `  ${ String( result.bySignature[ s ] ?? 0 ).padStart( 5 ) }  ${ s }` );
	}
	lines.push( '', 'by block:' );
	sorted( result.byBlock ).forEach( ( [ k, v ] ) => lines.push( `  ${ String( v ).padStart( 5 ) }  ${ k }` ) );
	lines.push( '', 'by block and property (top 40):' );
	sorted( result.byPair ).slice( 0, 40 ).forEach( ( [ k, v ] ) => lines.push( `  ${ String( v ).padStart( 5 ) }  ${ k }` ) );
	lines.push( '', `refused-motion rows holding "[object Object]" (not no-setting rows, not counted above): ${ result.motionRefusals }` );
	console.log( lines.join( '\n' ) );
}

if ( import.meta.url === pathToFileURL( process.argv[ 1 ] ?? '' ).href ) {
	const args = parseArgs( process.argv.slice( 2 ) );
	if ( ! args ) {
		console.error( 'usage: no-setting-count.mjs <client> [--surfaces a,b] [--runs <stamp>] [--root <repo>] [--json]' );
		process.exit( 2 );
	}
	try {
		const result = countClient( { root: args.root, client: args.client, surfaces: args.surfaces, stamp: args.stamp } );
		if ( args.json ) {
			console.log( JSON.stringify( result, null, 1 ) );
		} else {
			print( result );
		}
	} catch ( err ) {
		console.error( err.message );
		process.exit( 2 );
	}
}
