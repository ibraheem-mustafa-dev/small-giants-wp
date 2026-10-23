#!/usr/bin/env node
// Framework backlog re-check (Spec 48 FR-48-68): after a framework change, re-runs G3 to G6 (lib/gate-chain.mjs) for every
// open row of .claude/reports/framework-backlog.json against each entry's client site, and moves a row whose gap no longer
// holds (a setting now fits and reaches, a trial now changes it, a block now matches, the flow now agrees) to closed, with
// the commit (git rev-parse HEAD at the time of the run) and the gate evidence. A row whose re-check cannot run stays open
// with the reason. Prints every entry's outcome.
//   node scripts/computed-route/backlog-recheck.mjs [--dry-run] [--probes <module.mjs>] [--backlog <file>]
// --dry-run reports without writing the backlog. A module given with --probes replaces the live probes for every client
// (its default export is { measure(row, setting), probe(row, kind) }); without it each entry's surface runs
// gate-chain.mjs::defaultProbes against its live site. Reads the DB read-only.
import fs from 'fs';
import path from 'path';
import { execFileSync } from 'child_process';
import { fileURLToPath, pathToFileURL } from 'url';
import { openDb } from './lib/db.mjs';
import { calibrationForSite } from './solve.mjs';
import { defaultProbes } from './gate-chain.mjs';
import { recheckBacklog } from './lib/backlog-recheck.mjs';
import { BACKLOG_FILE, writeBacklog } from './lib/framework-backlog.mjs';

const REPO = path.resolve( path.dirname( fileURLToPath( import.meta.url ) ), '..', '..' );
const argv = process.argv.slice( 2 );
const flag = ( n ) => {
	const i = argv.indexOf( n );
	return -1 === i ? null : argv[ i + 1 ];
};
const dryRun = argv.includes( '--dry-run' );
const file = path.resolve( flag( '--backlog' ) || BACKLOG_FILE );

if ( ! fs.existsSync( file ) ) {
	console.error( `backlog re-check: no backlog at ${ file }: run framework-backlog.mjs first` );
	process.exit( 1 );
}
let backlog;
let commit;
try {
	backlog = JSON.parse( fs.readFileSync( file, 'utf8' ) );
	if ( ! Array.isArray( backlog?.rows ) ) {
		throw new Error( 'it has no rows array' );
	}
	commit = execFileSync( 'git', [ 'rev-parse', 'HEAD' ], { cwd: REPO, encoding: 'utf8' } ).trim();
} catch ( e ) {
	console.error( `backlog re-check: ${ file } or the commit cannot be read: ${ String( e.message || e ).slice( 0, 160 ) }` );
	process.exit( 1 );
}

const override = flag( '--probes' ) ? ( await import( pathToFileURL( path.resolve( flag( '--probes' ) ) ).href ) ).default : null;
const opened = [];
let db = null;
const envFor = async ( client, surface ) => {
	const surfacesFile = path.join( REPO, 'sites', client, 'build', 'surfaces.json' );
	let s;
	try {
		s = JSON.parse( fs.readFileSync( surfacesFile, 'utf8' ) )[ surface ];
	} catch ( e ) {
		throw new Error( `${ path.relative( REPO, surfacesFile ).replace( /\\/g, '/' ) } is not readable (${ String( e.message || e ).slice( 0, 80 ) })` );
	}
	if ( ! s?.site ) {
		throw new Error( `${ client }'s surfaces.json has no surface ${ surface } with a site` );
	}
	db ||= openDb();
	const probes = override || await defaultProbes( { s, client, db } );
	opened.push( probes );
	return { db, cache: calibrationForSite( s.site ), states: s.states, probes };
};

const today = new Date().toISOString().slice( 0, 10 );
const res = await recheckBacklog( { backlog, envFor, commit, today } );
for ( const p of opened ) {
	await p.close?.();
}
for ( const e of res.report.entries ) {
	console.log( `${ e.outcome.padEnd( 6 ) } ${ e.client } ${ e.id } -> ${ e.rowKey }${ e.gate ? ` [${ e.gate }]` : '' }: ${ e.reason }` );
}
const s = res.stats;
console.log( `backlog re-check${ dryRun ? ' (dry run, nothing written)' : '' } at ${ commit.slice( 0, 9 ) }: ${ s.rows } rows, ${ s.skippedClosed } already closed, ${ s.entries } entries re-checked, ${ s.newlyClosed } newly closed, ${ s.open } still open` );
if ( ! dryRun ) {
	writeBacklog( file, res.backlog );
	console.log( `Written ${ file }` );
}
