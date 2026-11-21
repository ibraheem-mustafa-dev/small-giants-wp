#!/usr/bin/env node
// Lists the hover and state transitions no motion recogniser took (lib/state-transitions.mjs): for each client, the newest
// Fill run of every surface (the folder holding a fill-report.json), its never-silent motion rows set against the client's
// re-derived animation inventory (build/intake/intake.json), facts template (build/intake/facts.json) and the surface's
// skeleton (build/skeleton/<surface>.skeleton.json), grouped by (block, part, property family, trigger, why). Reads files
// only: no browser, no site.
//   node scripts/computed-route/tools/state-transitions.mjs [--cache <dir>] [--out <folder>] [--json]
//        --client <build dir> <fill root> [--client <build dir> <fill root>]...
//   <build dir>: a client's sites/<client>/build; <fill root>: its build/qa/fill (another worktree's may be given).
//   --out: writes rows.json (every row and group) there. --json prints the result as JSON.
// Exit 0 always: the list is a report.
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { surfaceRows, groupRows, skeletonTargetKeys } from '../lib/state-transitions.mjs';
import { loadCalibration } from '../lib/cache.mjs';
import { rootDraftOf } from '../lib/key-space.mjs';

const HERE = path.dirname( fileURLToPath( import.meta.url ) );
const readJson = ( file ) => JSON.parse( fs.readFileSync( file, 'utf8' ) );

// The newest run folder of a surface's fill folder that holds a fill-report.json, or null.
export function newestRun( surfaceDir ) {
	const runs = fs.readdirSync( surfaceDir ).filter( ( d ) => fs.existsSync( path.join( surfaceDir, d, 'fill-report.json' ) ) ).sort();
	return runs.length ? path.join( surfaceDir, runs.at( -1 ) ) : null;
}

// One client's rows: every surface of the fill root with a run, read against the client's build folder.
export function clientRows( buildDir, fillRoot, { cache } ) {
	const intake = readJson( path.join( buildDir, 'intake', 'intake.json' ) );
	const inv = intake.inventory?.animations || {};
	const facts = readJson( path.join( buildDir, 'intake', 'facts.json' ) );
	const template = Object.fromEntries( Object.entries( facts.elements || {} ).map( ( [ k, e ] ) => [ k, e.template || {} ] ) );
	const surfaces = fs.existsSync( path.join( buildDir, 'surfaces.json' ) ) ? readJson( path.join( buildDir, 'surfaces.json' ) ) : {};
	const cals = new Map();
	const settingsOf = ( block ) => {
		if ( ! cals.has( block ) ) {
			cals.set( block, block ? loadCalibration( cache, block, null )?.settings ?? null : null );
		}
		return cals.get( block );
	};
	const out = [];
	for ( const surface of fs.readdirSync( fillRoot ).sort() ) {
		const run = fs.statSync( path.join( fillRoot, surface ) ).isDirectory() ? newestRun( path.join( fillRoot, surface ) ) : null;
		const skeletonFile = path.join( buildDir, 'skeleton', `${ surface }.skeleton.json` );
		if ( ! run || ! fs.existsSync( skeletonFile ) ) {
			continue;
		}
		const report = readJson( path.join( run, 'fill-report.json' ) );
		const unmapped = readJson( path.join( run, 'unmapped.json' ) );
		const rootComponent = rootDraftOf( inv.drafts, surfaces[ surface ]?.draftIndex ?? null )?.dc ?? null;
		const targetKeys = skeletonTargetKeys( readJson( skeletonFile ), rootComponent );
		const rows = surfaceRows( { unmapped, records: inv.records, targetKeys, template, writes: report.writes, settingsOf } );
		out.push( { surface, run, rows: rows.map( ( r ) => ( { surface, ...r } ) ) } );
	}
	return out;
}

function main( argv ) {
	const opt = ( name ) => ( argv.includes( name ) ? argv[ argv.indexOf( name ) + 1 ] : null );
	const cache = path.resolve( opt( '--cache' ) || path.join( HERE, '..', 'cache' ) );
	const outDir = opt( '--out' );
	const pairs = argv.flatMap( ( a, i ) => ( '--client' === a ? [ [ argv[ i + 1 ], argv[ i + 2 ] ] ] : [] ) );
	if ( ! pairs.length || pairs.some( ( p ) => ! p[ 0 ] || ! p[ 1 ] ) ) {
		console.error( 'usage: state-transitions.mjs [--cache <dir>] [--out <folder>] [--json] --client <build dir> <fill root>...' );
		process.exit( 2 );
	}
	const clients = pairs.map( ( [ b, f ] ) => ( { build: b, fill: f, surfaces: clientRows( b, f, { cache } ) } ) );
	const rows = clients.flatMap( ( c ) => c.surfaces.flatMap( ( s ) => s.rows.map( ( r ) => ( { client: path.basename( path.dirname( path.resolve( c.build ) ) ), ...r } ) ) ) );
	const transitions = rows.filter( ( r ) => r.transition );
	const result = {
		counts: { rows: rows.length, records: new Set( rows.map( ( r ) => `${ r.client }:${ r.id }` ) ).size, transitionRows: transitions.length, transitionRecords: new Set( transitions.map( ( r ) => `${ r.client }:${ r.id }` ) ).size },
		runs: clients.flatMap( ( c ) => c.surfaces.map( ( s ) => ( { surface: s.surface, run: s.run, rows: s.rows.length } ) ) ),
		groups: groupRows( transitions ),
		others: groupRows( rows.filter( ( r ) => ! r.transition ) ),
		rows,
	};
	if ( outDir ) {
		fs.mkdirSync( outDir, { recursive: true } );
		fs.writeFileSync( path.join( outDir, 'rows.json' ), JSON.stringify( result, null, 1 ) );
	}
	if ( argv.includes( '--json' ) ) {
		console.log( JSON.stringify( result, null, 1 ) );
		return;
	}
	console.log( `rows ${ result.counts.rows } (records ${ result.counts.records }); transitions ${ result.counts.transitionRows } (records ${ result.counts.transitionRecords })` );
	for ( const r of result.runs ) {
		console.log( `  ${ r.rows }  ${ r.surface }  ${ r.run }` );
	}
	for ( const [ title, list ] of [ [ 'transitions', result.groups ], [ 'other mechanisms', result.others ] ] ) {
		console.log( `\n${ title }:` );
		for ( const g of list ) {
			console.log( `  ${ g.rows }  ${ g.key }  [${ g.records.slice( 0, 4 ).join( ' ' ) }${ g.records.length > 4 ? ' ...' : '' }]` );
		}
	}
}

if ( process.argv[ 1 ] && path.resolve( process.argv[ 1 ] ) === fileURLToPath( import.meta.url ) ) {
	main( process.argv.slice( 2 ) );
}
