#!/usr/bin/env node
// Framework backlog merge (Spec 48 FR-48-68): merges the F-class rows of every client's sites/<client>/build/qa/gaps.json,
// and the residual Custom CSS gap rows of each surface's latest Fill run (FR-48-109, lib/framework-backlog.mjs::findResidualGapRows),
// into .claude/reports/framework-backlog.json, one row per block, attribute and property, listing every client that
// shows the gap. A row already closed stays closed; a re-merge keeps firstSeen and never duplicates a row. A row that is
// not a well-formed F-class row is refused and counted. Re-check the open rows after a framework change with
// backlog-recheck.mjs.
//   node scripts/computed-route/framework-backlog.mjs [--sites <dir>] [--out <file>] [--on <YYYY-MM-DD>]
import path from 'path';
import { BACKLOG_FILE, SITES_DIR, findGapsFiles, findResidualGapRows, mergeBacklog, readBacklog, readGapsFile, writeBacklog } from './lib/framework-backlog.mjs';

const argv = process.argv.slice( 2 );
const flag = ( n ) => {
	const i = argv.indexOf( n );
	return -1 === i ? null : argv[ i + 1 ];
};

try {
	const sites = path.resolve( flag( '--sites' ) || SITES_DIR );
	const found = findGapsFiles( sites );
	const skipped = [];
	const residual = findResidualGapRows( sites, skipped );
	if ( ! found.length && ! residual.length ) {
		throw new Error( 'no client has a build/qa/gaps.json or a Fill run with residual Custom CSS: run gate-chain.mjs --client <slug> or a Fill run first' );
	}
	const out = path.resolve( flag( '--out' ) || BACKLOG_FILE );
	const { backlog, stats } = mergeBacklog( {
		backlog: readBacklog( out ), sources: [ ...found.map( ( f ) => ( { client: f.client, file: f.file, rows: readGapsFile( f.file ) } ) ), ...residual ],
		mergedOn: flag( '--on' ) || new Date().toISOString().slice( 0, 10 ),
	} );
	writeBacklog( out, backlog );
	console.log( `framework backlog: ${ stats.clients.length } clients, ${ stats.rowsRead } rows read, ${ stats.merged } F rows merged, ${ stats.crossClientRows } cross-client, ${ stats.refusedNonF } non-F refused` );
	console.log( `  ${ backlog.rows.length } backlog rows (${ stats.newRows } new, ${ stats.updatedRows } updated), ${ stats.refusedMalformed } malformed and ${ stats.refusedUnkeyed } unkeyed refused, ${ stats.keptClosed } closed row(s) seen again, ${ stats.unpublishedEntries } entry(ies) no longer published` );
	for ( const r of stats.refused.filter( ( x ) => 'non-F' !== x.reason ) ) {
		console.log( `  refused ${ r.client } ${ r.id ?? '(no id)' }: ${ r.reason }` );
	}
	skipped.forEach( ( x ) => console.log( `  skipped ${ x }` ) );
	console.log( `  ${ residual.reduce( ( n, s ) => n + s.rows.length, 0 ) } residual Custom CSS gap row(s) read from the latest Fill runs (FR-48-109)` );
	console.log( `Written ${ out }` );
} catch ( e ) {
	console.error( `framework backlog: ${ e.message }` );
	process.exit( 1 );
}
