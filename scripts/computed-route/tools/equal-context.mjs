#!/usr/bin/env node
// Lists every settled `equal` row of saved Fill reports whose baseline is the block's default look and whose node sits in a
// context other than the one that look was built in (lib/equal-context.mjs::reportContexts), by kind of
// difference, block, part and property, and counts every surface's equal rows per baseline kind. Reads files only: the
// report, the filled tree beside it, the setting record in the client's look and block.json; no browser, no site.
//   node scripts/computed-route/tools/equal-context.mjs --client <slug> [--cache <dir>] [--out <folder>] [--json]
//        <fill-report.json | fill run folder>...
//   --client: the client whose look Fill read. --cache: a folder of fixture records (lib/setting-record.mjs::
//   writeRecordFixture; default: none, the framework database and the client's site look). --out: writes rows.json (every flagged row) there. --json prints the result as JSON.
// Exit 0 always: the list is a report.
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { reportContexts } from '../lib/equal-context.mjs';
import { loadCalibration } from '../lib/cache.mjs';
import { calibrationForNode } from '../lib/paint-state.mjs';
import { blockSchema } from '../lib/resolve.mjs';
import { walk, refOf } from '../lib/tree.mjs';

const readJson = ( file ) => JSON.parse( fs.readFileSync( file, 'utf8' ) );

// The equal rows of a report per baseline kind: a per-width baseline counts as `per-width`, a row with none as `none`.
export function baselineCounts( report ) {
	const out = {};
	for ( const r of report.settled || [] ) {
		if ( 'equal' === r.reason ) {
			const k = r.baseline && 'object' === typeof r.baseline ? 'per-width' : String( r.baseline ?? 'none' );
			out[ k ] = ( out[ k ] || 0 ) + 1;
		}
	}
	return out;
}

// The filled tree's nodes as [ { ref, parent, name, attributes } ].
export function treeNodes( tree ) {
	const out = [];
	walk( Array.isArray( tree ) ? tree : [ tree ], ( n, i, parent ) => out.push( { ref: refOf( n ), parent: parent ? refOf( parent ) : null, name: n.name, attributes: n.attributes || {} } ) );
	return out;
}

// One surface's result: { surface, counts, flagged: [ { node, block, slot, property, value, kinds } ] }.
export function surfaceResult( reportFile, { client, cache } ) {
	const report = readJson( reportFile );
	const treeFile = path.join( path.dirname( reportFile ), 'filled.tree.json' );
	const nodes = fs.existsSync( treeFile ) ? treeNodes( readJson( treeFile ) ) : [];
	const cals = new Map();
	const calFor = ( name, node ) => {
		if ( ! cals.has( name ) ) {
			cals.set( name, loadCalibration( cache, name, client ) );
		}
		return calibrationForNode( cals.get( name ), node );
	};
	const flagged = reportContexts( report, nodes, calFor, blockSchema ).filter( ( x ) => x.kinds.length ).map( ( { row, kinds } ) => ( { node: row.node, block: row.block, slot: row.slot, property: row.property, value: row.value, widths: row.widths, kinds } ) );
	return { surface: report.surface, report: reportFile, counts: baselineCounts( report ), flagged };
}

// The flagged rows grouped: { kind: { 'block | slot | property': count } }.
export function groupFlagged( flagged ) {
	const out = {};
	for ( const f of flagged ) {
		for ( const k of new Set( f.kinds.map( ( x ) => x.kind ) ) ) {
			const key = `${ f.block } | ${ f.slot || '(root)' } | ${ f.property }`;
			out[ k ] ??= {};
			out[ k ][ key ] = ( out[ k ][ key ] || 0 ) + 1;
		}
	}
	return out;
}

function main( argv ) {
	const opt = ( name ) => ( argv.includes( name ) ? argv[ argv.indexOf( name ) + 1 ] : null );
	const client = opt( '--client' );
	const cache = opt( '--cache' ) ? path.resolve( opt( '--cache' ) ) : null;
	const out = opt( '--out' );
	const taken = new Set( [ '--client', '--cache', '--out' ].flatMap( ( n ) => ( argv.includes( n ) ? [ argv.indexOf( n ), argv.indexOf( n ) + 1 ] : [] ) ) );
	const files = argv.filter( ( a, i ) => ! taken.has( i ) && ! a.startsWith( '--' ) ).map( ( f ) => ( fs.statSync( f ).isDirectory() ? path.join( f, 'fill-report.json' ) : f ) );
	if ( ! client || ! files.length ) {
		console.error( 'usage: equal-context.mjs --client <slug> [--cache <dir>] [--out <folder>] [--json] <fill-report.json | run folder>...' );
		process.exit( 2 );
	}
	const results = files.map( ( f ) => surfaceResult( f, { client, cache } ) );
	const flagged = results.flatMap( ( r ) => r.flagged.map( ( f ) => ( { surface: r.surface, ...f } ) ) );
	const groups = groupFlagged( flagged );
	if ( out ) {
		fs.mkdirSync( out, { recursive: true } );
		fs.writeFileSync( path.join( out, 'rows.json' ), JSON.stringify( { results: results.map( ( r ) => ( { surface: r.surface, report: r.report, counts: r.counts } ) ), flagged, groups }, null, 1 ) );
	}
	if ( argv.includes( '--json' ) ) {
		console.log( JSON.stringify( { results, groups }, null, 1 ) );
		return;
	}
	for ( const r of results ) {
		console.log( `${ r.surface }: equal rows by baseline ${ JSON.stringify( r.counts ) }; flagged ${ r.flagged.length }` );
	}
	for ( const [ kind, rows ] of Object.entries( groups ) ) {
		const total = Object.values( rows ).reduce( ( a, b ) => a + b, 0 );
		console.log( `\n${ kind }: ${ total } rows` );
		for ( const [ key, n ] of Object.entries( rows ).sort( ( a, b ) => b[ 1 ] - a[ 1 ] ) ) {
			console.log( `  ${ n }  ${ key }` );
		}
	}
}

if ( process.argv[ 1 ] && path.resolve( process.argv[ 1 ] ) === fileURLToPath( import.meta.url ) ) {
	main( process.argv.slice( 2 ) );
}
