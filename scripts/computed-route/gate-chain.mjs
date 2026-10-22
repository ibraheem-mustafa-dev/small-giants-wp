#!/usr/bin/env node
// Gate chain command (Spec 48 FR-48-64): runs G0 to G7 (lib/gate-chain.mjs) on every distinct open issue of a Solve
// report and prints each row's first failing gate, class and evidence.
//   node scripts/computed-route/gate-chain.mjs <solve-report.json> [--client <slug>] [--probes <module.mjs>] [--out <file>]
// With --client the surface's tree, state map and site come from sites/<client>/build/surfaces.json (the block of each row
// is read from the tree; without it G0 fails every row, the block being unknown). The final walk is the highest
// round-N/report.json beside the report. The live gates G5 to G7 need a module given with --probes whose default export
// is { measure(row, setting), probe(row, kind), recheck(row) }; without it a row that reaches one of them stops there
// with the "not supplied" evidence. Writes gate-chain.json beside the report (or --out). Reads the DB read-only.
import fs from 'fs';
import path from 'path';
import { createRequire } from 'module';
import { execFileSync } from 'child_process';
import { fileURLToPath, pathToFileURL } from 'url';
import { openDb } from './lib/db.mjs';
import { runChain } from './lib/gate-chain.mjs';
import { issuesOf } from './lib/triage.mjs';
import { draftValues, cssProp, settingState } from './lib/solve-rows.mjs';
import { calibrationForSite } from './solve.mjs';
import { readTree, nodeByRef } from './lib/tree.mjs';
import { localBlockHash } from './lib/deploy-hash.mjs';
import { manifestSchemaVersion } from './lib/handoff.mjs';

const HERE = path.dirname( fileURLToPath( import.meta.url ) );
const REPO = path.resolve( HERE, '..', '..' );

// The newest walker report beside a Solve report: the highest round-N/report.json.
export function finalWalk( dir ) {
	const rounds = fs.readdirSync( dir ).map( ( d ) => /^round-(\d+)$/.exec( d ) ).filter( Boolean ).map( ( m ) => Number( m[ 1 ] ) ).sort( ( a, b ) => b - a );
	return rounds.length ? JSON.parse( fs.readFileSync( path.join( dir, `round-${ rounds[ 0 ] }`, 'report.json' ), 'utf8' ) ) : null;
}

// The pair a row was measured on, in its own run.
const pairOf = ( walk, r ) => ( walk?.runs || [] ).find( ( x ) => x.state === r.state && x.width === r.width )?.pairs?.[ r.pair ] ?? null;

async function installedVersions() {
	const playwrightVersion = createRequire( import.meta.url )( 'playwright/package.json' ).version;
	const { chromium } = await import( 'playwright' );
	const b = await chromium.launch();
	const browserVersion = b.version();
	await b.close();
	return { playwrightVersion, browserVersion };
}

// Every input the gates read, built from the report's files; a value that cannot be read is left undefined or throws, and
// runChain fails that gate closed.
export function buildContext( { report, walk, surfaces, surface, client, probes, installed, db, intakeFile } ) {
	const s = surfaces?.[ surface ] ?? null;
	const buildDir = client ? path.join( REPO, 'sites', client, 'build' ) : null;
	const tree = s && buildDir ? readTree( path.join( buildDir, s.tree ) ) : null;
	const blockOf = ( row ) => ( tree && row.ref ? nodeByRef( tree, row.ref )?.name ?? null : null );
	const calFor = s?.site ? calibrationForSite( s.site ) : () => null;
	const intake = intakeFile && fs.existsSync( intakeFile ) ? JSON.parse( fs.readFileSync( intakeFile, 'utf8' ) ) : null;
	const parentOf = db.prepare( 'SELECT parent_block FROM blocks WHERE slug = ?' );
	const ancestors = ( b ) => {
		const out = [];
		for ( let p = parentOf.get( b )?.parent_block; p && ! out.includes( p ); p = parentOf.get( p )?.parent_block ) {
			out.push( p );
		}
		return out;
	};
	const need = ( v, what ) => {
		if ( null == v ) {
			throw new Error( `${ what } is not readable` );
		}
		return v;
	};
	return {
		inputs: {
			G0: ( row ) => {
				const block = need( blockOf( row ), 'the block of the row' );
				const short = block.replace( /^sgs\//, '' );
				const manifest = JSON.parse( fs.readFileSync( path.join( REPO, 'sites', need( client, '--client' ), 'handoff', 'MANIFEST.json' ), 'utf8' ) );
				return {
					dbRefreshedAt: db.prepare( "SELECT value FROM schema_metadata WHERE key = 'last_full_refresh_ts'" ).get()?.value,
					blockCommittedAt: execFileSync( 'git', [ 'log', '-1', '--format=%cI', '--', `plugins/sgs-blocks/src/blocks/${ short }` ], { cwd: REPO, encoding: 'utf8' } ).trim(),
					cache: calFor( block ),
					deployHash: localBlockHash( path.join( REPO, 'plugins', 'sgs-blocks', 'build', 'blocks', short ) ),
					installed,
					manifest: { schema_version: manifest.schema_version, files: Object.fromEntries( ( manifest.files || [] ).map( ( f ) => [ f.path, f.sha256 ] ) ) },
					intake: need( intake, 'intake.json' ).manifest,
					blockChanges: execFileSync( 'git', [ 'status', '--porcelain', '--', `plugins/sgs-blocks/src/blocks/${ short }` ], { cwd: REPO, encoding: 'utf8' } ).split( '\n' ).filter( Boolean ),
					schemaVersion: manifestSchemaVersion(),
				};
			},
			G1: ( row ) => {
				const p = pairOf( walk, row );
				const box = p?.live?.box;
				return {
					row,
					pairing: { by: p?.live?.trace?.ref ? 'identity' : null },
					paint: { inert: ! p?.live || p.live.missing || 'none' === p.live.layoutDisplay || ! box || ! box.w || ! box.h, paints: null != row.live && null != row.draft },
					stateListed: !! s?.states && Object.hasOwn( s.states, row.state ) && undefined !== settingState( row, s.states ),
				};
			},
			G2: ( row ) => {
				const prop = cssProp( row.key );
				const dv = draftValues( walk, row.pair, prop, 'hover' === row.kind );
				const defects = new Set( ( intake?.draftDefects || [] ).flatMap( ( g ) => g.rows || [ g ] ).filter( ( d ) => d.draftId && d.draftId === row.draftId ).flatMap( ( d ) => String( d.evidence?.declared ?? '' ).split( ';' ).map( ( x ) => x.split( ':' )[ 0 ].trim().toLowerCase() ) ) );
				return { property: prop, declared: dv.declared[ row.width ] ?? null, renderedDraft: row.draft, fr34Passes: defects.has( prop ), ledgered: !! row.decided };
			},
			G3: ( row ) => ( { db, block: need( blockOf( row ), 'the block of the row' ), ancestors: ancestors( blockOf( row ) ), property: cssProp( row.key ), state: settingState( row, s?.states ) ?? null } ),
			G4: ( row, soFar ) => ( {
				cache: calFor( blockOf( row ) ),
				settings: need( soFar.G3?.settings, 'the candidate settings' ),
				state: settingState( row, s?.states ) ?? null,
				boxAgrees: ! ( pairOf( walk, row )?.diffs || [] ).some( ( d ) => ! d.accepted && 'box' === d.kind ),
			} ),
			G5: ( row, soFar ) => ( { settings: soFar.G3?.settings ?? [], measure: probes?.measure ? ( setting ) => probes.measure( row, setting ) : undefined } ),
			G6: ( row ) => ( { kind: 'hardcode' === row.solveClass ? 'hardcode' : ( 'drive' === row.kind ? 'behaviour' : 'missing-setting' ), probe: probes?.probe ? ( kind ) => probes.probe( row, kind ) : undefined } ),
			G7: ( row ) => ( { recheck: probes?.recheck ? () => probes.recheck( row ) : undefined } ),
		},
		blockOf,
	};
}

if ( process.argv[ 1 ] && path.resolve( process.argv[ 1 ] ) === fileURLToPath( import.meta.url ) ) {
	const argv = process.argv.slice( 2 );
	const flag = ( n ) => {
		const i = argv.indexOf( n );
		return -1 === i ? null : argv[ i + 1 ];
	};
	const reportFile = argv.find( ( a, i ) => ! a.startsWith( '--' ) && ( 0 === i || ! argv[ i - 1 ].startsWith( '--' ) ) );
	if ( ! reportFile ) {
		console.error( 'usage: node scripts/computed-route/gate-chain.mjs <solve-report.json> [--client <slug>] [--probes <module.mjs>] [--out <file>]' );
		process.exit( 2 );
	}
	const report = JSON.parse( fs.readFileSync( reportFile, 'utf8' ) );
	const client = flag( '--client' );
	const walk = finalWalk( path.dirname( path.resolve( reportFile ) ) );
	const surfacesFile = client ? path.join( REPO, 'sites', client, 'build', 'surfaces.json' ) : null;
	const probes = flag( '--probes' ) ? ( await import( pathToFileURL( path.resolve( flag( '--probes' ) ) ).href ) ).default : null;
	const ctx = buildContext( { report, walk, surfaces: surfacesFile ? JSON.parse( fs.readFileSync( surfacesFile, 'utf8' ) ) : null, surface: report.surface, client, probes, installed: await installedVersions(), db: openDb(), intakeFile: client ? path.join( REPO, 'sites', client, 'build', 'intake', 'intake.json' ) : null } );
	const out = [];
	for ( const issue of issuesOf( report, report.surface ) ) {
		const row = { ...issue.rows[ 0 ], solveClass: issue.solveClass };
		const res = await runChain( row, ctx );
		out.push( { key: issue.key, solveClass: issue.solveClass, ref: row.ref ?? null, pair: row.pair, property: row.key, widths: [ ...new Set( issue.rows.map( ( x ) => x.width ) ) ], ...res } );
		console.log( `${ issue.key }: ${ res.gate ? `stopped at ${ res.gate } (${ res.class }): ${ res.evidence }` : `passed all gates: ${ res.class } candidate` }` );
	}
	const file = path.resolve( flag( '--out' ) || path.join( path.dirname( reportFile ), 'gate-chain.json' ) );
	fs.writeFileSync( file, JSON.stringify( { surface: report.surface, rows: out }, null, 1 ) );
	console.log( `gate chain: ${ out.length } rows, ${ out.filter( ( r ) => r.candidate ).length } framework-gap candidates. Written ${ file }` );
}
