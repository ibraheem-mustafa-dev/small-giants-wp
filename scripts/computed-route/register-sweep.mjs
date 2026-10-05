#!/usr/bin/env node
// Register <-> sweep command (A4).
//   node scripts/computed-route/register-sweep.mjs bundle --register <fix-register.md> --sweep <sweep.json> --pairs <qa/pairs dir> --out <folder>
//   node scripts/computed-route/register-sweep.mjs merge --register <fix-register.md> --sweep <sweep.json> --pairs <qa/pairs dir> --verdicts <file.json> [...] --out <file.md>
// bundle writes one input file per A4 group (its items, the sweep rows of the surfaces they sit on, the status rules) and
// reports each group's item count and any item in no group. merge reads the agents' verdict files (each a JSON array of
// { id, status, evidence }), runs checkStatuses and, only when it finds no problem, writes a copy of the register with a
// Sweep column to --out; it never writes the register itself. --pairs names the pairing reports (qa/pairs/<surface>.json):
// each surface's measured refs go into the bundles, and a clean claim must cite one of its surfaces' refs.
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { registerItems, groupItems, checkStatuses, addSweepColumn, bundleGroup, measuredRefs } from './lib/register-sweep.mjs';

const slug = ( name ) => name.toLowerCase().replace( /[^a-z0-9]+/g, '-' ).replace( /^-|-$/g, '' );
const readJson = ( file ) => JSON.parse( fs.readFileSync( file, 'utf8' ) );

// { surface: [refs] } from the pairing reports in pairsDir, for every surface of the sweep that has one.
export function measuredFrom( pairsDir, sweep ) {
	const names = [ ...Object.keys( sweep.surfaces || {} ), ...( sweep.unmeasured || [] ) ];
	return Object.fromEntries( names.map( ( n ) => [ n, path.join( pairsDir, `${ n }.json` ) ] ).filter( ( [ , f ] ) => fs.existsSync( f ) ).map( ( [ n, f ] ) => [ n, measuredRefs( readJson( f ) ) ] ) );
}

export function bundle( registerFile, sweepFile, pairsDir, outDir ) {
	const items = registerItems( fs.readFileSync( registerFile, 'utf8' ) );
	const sweep = readJson( sweepFile );
	const { groups, ungrouped } = groupItems( items );
	fs.mkdirSync( outDir, { recursive: true } );
	const files = groups.map( ( g, i ) => {
		const file = path.join( outDir, `group-${ i + 1 }-${ slug( g.name ) }.json` );
		fs.writeFileSync( file, JSON.stringify( bundleGroup( g, items, sweep, measuredFrom( pairsDir, sweep ) ), null, 1 ) );
		return { name: g.name, count: g.items.length, file };
	} );
	return { files, ungrouped: ungrouped.map( ( x ) => `${ x.ids.join( ', ' ) } (${ x.section })` ) };
}

export function merge( registerFile, sweepFile, pairsDir, verdictFiles, out ) {
	const markdown = fs.readFileSync( registerFile, 'utf8' );
	const items = registerItems( markdown );
	const verdicts = verdictFiles.flatMap( readJson );
	const sweep = readJson( sweepFile );
	// Walk reports a still-open verdict cites (evidence.walk: the walk's output folder).
	const walkDirs = [ ...new Set( verdicts.map( ( v ) => v.evidence?.walk ).filter( Boolean ) ) ];
	const walks = Object.fromEntries( walkDirs.filter( ( w ) => fs.existsSync( path.join( w, 'report.json' ) ) ).map( ( w ) => [ w, readJson( path.join( w, 'report.json' ) ) ] ) );
	const problems = checkStatuses( items, verdicts, sweep, measuredFrom( pairsDir, sweep ), walks );
	const { ungrouped } = groupItems( items );
	problems.push( ...ungrouped.map( ( x ) => `${ x.ids.join( ', ' ) }: section "${ x.section }" is in no group` ) );
	if ( ! problems.length ) {
		fs.mkdirSync( path.dirname( path.resolve( out ) ), { recursive: true } );
		fs.writeFileSync( out, addSweepColumn( markdown, items, verdicts ) );
	}
	return { problems, items: items.length };
}

if ( process.argv[ 1 ] && path.resolve( process.argv[ 1 ] ) === fileURLToPath( import.meta.url ) ) {
	const [ mode, ...argv ] = process.argv.slice( 2 );
	const all = ( name ) => argv.flatMap( ( a, i ) => ( a === name ? [ argv[ i + 1 ] ] : [] ) );
	const one = ( name ) => all( name )[ 0 ];
	const missing = [ '--register', '--sweep', '--pairs', '--out' ].filter( ( f ) => ! one( f ) );
	if ( ! [ 'bundle', 'merge' ].includes( mode ) || missing.length || ( 'merge' === mode && ! all( '--verdicts' ).length ) ) {
		console.error( 'usage: register-sweep.mjs bundle|merge --register <md> --sweep <json> --pairs <dir> --out <folder|file> [--verdicts <json> ...]' );
		process.exit( 2 );
	}
	try {
		if ( 'bundle' === mode ) {
			const { files, ungrouped } = bundle( one( '--register' ), one( '--sweep' ), one( '--pairs' ), one( '--out' ) );
			files.forEach( ( f ) => console.log( `${ String( f.count ).padStart( 4 ) } items  ${ f.name }  ${ f.file }` ) );
			console.log( ungrouped.length ? `ungrouped: ${ ungrouped.join( '; ' ) }` : 'ungrouped: none' );
			process.exit( ungrouped.length ? 1 : 0 );
		}
		const { problems, items } = merge( one( '--register' ), one( '--sweep' ), one( '--pairs' ), all( '--verdicts' ), one( '--out' ) );
		console.log( problems.length ? `register-sweep merge failed:\n- ${ problems.join( '\n- ' ) }` : `register-sweep merge: ${ items } items, Sweep column written to ${ one( '--out' ) }` );
		process.exit( problems.length ? 1 : 0 );
	} catch ( e ) {
		console.error( `[FAIL] register-sweep ${ mode }: ${ e.message }` );
		process.exit( 1 );
	}
}
