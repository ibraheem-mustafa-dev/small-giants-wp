#!/usr/bin/env node
// Gate chain command (Spec 48 FR-48-64, FR-48-66): runs G0 to G7 (lib/gate-chain.mjs) on every distinct open issue of a
// Solve report, prints each row's first failing gate, class and evidence, and writes gaps.json.
//   node scripts/computed-route/gate-chain.mjs <solve-report.json> [--client <slug>] [--probes <module.mjs>] [--out <file>] [--debt-out <file>] [--gaps-out <file>]
// With --client the surface's tree, state map and site come from sites/<client>/build/surfaces.json (the block of each row
// is read from the tree; without it G0 fails every row, the block being unknown). The final walk is the highest
// round-N/report.json beside the report. The live gates G5 to G7 run lib/gate-probes.mjs against the surface's live site
// (the walker config's live url, or SGS_LIVE_ORIGIN) and a fresh walk of the draft served from the surface's draftDir; a
// module given with --probes replaces them (its default export is { measure(row, setting), probe(row, kind), recheck(row) }).
// Writes gate-chain.json beside the report (or --out) and, with --client, sites/<client>/build/qa/gaps.json (FR-48-66, or --gaps-out;
// a row without evidence for each gate it passed is refused) and sites/<client>/build/qa/instrument-debt.json (FR-48-67,
// or --debt-out): every I-class row grouped by owner, plus the known items (lib/instrument-debt.mjs). Reads the DB read-only.
import fs from 'fs';
import path from 'path';
import { createRequire } from 'module';
import os from 'os';
import { execFileSync, spawnSync } from 'child_process';
import { fileURLToPath, pathToFileURL } from 'url';
import { openDb } from './lib/db.mjs';
import { runChain } from './lib/gate-chain.mjs';
import { renderEvidence } from './lib/gate-evidence.mjs';
import { issuesOf } from './lib/triage.mjs';
import { cssProp, settingState } from './lib/solve-rows.mjs';
import { declaredRead, defectNamed, loadDraftIdentity } from './lib/draft-identity.mjs';
import { calibrationForSite } from './solve.mjs';
import { readTree, nodeByRef } from './lib/tree.mjs';
import { localBlockHash } from './lib/deploy-hash.mjs';
import { manifestSchemaVersion } from './lib/handoff.mjs';
import { createProbes, liveTarget } from './lib/gate-probes.mjs';
import { writeGaps, gapsPath } from './lib/gaps-file.mjs';
import { gapInput } from './lib/gap-input.mjs';
import { ancestorsOf, withDiscovery } from './lib/gap-classes.mjs';
import { debtRows, debtPath, staleSlotMaps, unroutedKnown, writeDebt } from './lib/instrument-debt.mjs';
import { READ_KEY } from './lib/calibrate-props.mjs';
import { serveDraft } from './lib/draft.mjs';
import { adminSession, readEnv, renderBlock } from './lib/trial-page.mjs';

const HERE = path.dirname( fileURLToPath( import.meta.url ) );
// SGS_REPO_ROOT points the reads (sites, the calibration cache, the build) at another checkout of the repository.
const REPO = process.env.SGS_REPO_ROOT ? path.resolve( process.env.SGS_REPO_ROOT ) : path.resolve( HERE, '..', '..' );

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

// The live probes for a surface (lib/gate-probes.mjs): the live origin from the walker config, a fresh walk of the draft
// the walker compares, and the block renderer behind the surface's admin login (opened only when a trial needs it).
export async function defaultProbes( { s, client, db, tmp = fs.mkdtempSync( path.join( os.tmpdir(), 'gate-chain-' ) ) } ) {
	const buildDir = path.join( REPO, 'sites', client, 'build' );
	const walkerFile = path.join( buildDir, s.walkerFull || s.walker );
	const cfg = ( await import( pathToFileURL( walkerFile ).href ) ).default;
	const { origin, url } = liveTarget( cfg.live.url, process.env.SGS_LIVE_ORIGIN );
	let session = null;
	return createProbes( {
		origin, url, db, states: s.states,
		walk: async ( row ) => {
			const served = await serveDraft( path.join( REPO, s.draftDir ), { index: s.draftIndex || null } );
			const out = path.join( tmp, `walk-${ row.state }-${ row.width }` );
			try {
				const r = spawnSync( 'node', [ 'scripts/parity/draft-live-walk.mjs', walkerFile, ...( process.env.SGS_HEADED ? [] : [ '--headless' ] ), '--no-review', '--lean', '--widths', String( row.width ), '--states', row.state, '--out', out ], { cwd: REPO, encoding: 'utf8', timeout: 1800000, env: { ...process.env, SGS_DRAFT_URL: served.url, SGS_LIVE_ORIGIN: origin } } );
				const file = path.join( out, 'report.json' );
				if ( ! fs.existsSync( file ) ) {
					throw new Error( `the walker wrote no report (exit ${ r.status }): ${ String( r.stderr || r.stdout ).slice( -200 ) }` );
				}
				return JSON.parse( fs.readFileSync( file, 'utf8' ) );
			} finally {
				await served.close();
			}
		},
		renderBlock: async ( block, attrs ) => {
			const { chromium } = await import( 'playwright' );
			session ||= await adminSession( await ( await chromium.launch( { headless: ! process.env.SGS_HEADED } ) ).newContext(), readEnv( path.join( REPO, s.envFile ) ), s.envKey );
			return renderBlock( session, block, attrs );
		},
	} );
}

// Every input the gates read, built from the report's files; a value that cannot be read is left undefined or throws, and
// runChain fails that gate closed.
export function buildContext( { report, walk, surfaces, surface, client, probes, installed, db, intakeFile } ) {
	const s = surfaces?.[ surface ] ?? null;
	const buildDir = client ? path.join( REPO, 'sites', client, 'build' ) : null;
	const tree = s && buildDir ? readTree( path.join( buildDir, s.tree ) ) : null;
	const blockOf = ( row ) => ( tree && row.ref ? nodeByRef( tree, row.ref )?.name ?? null : null );
	const calFor = s?.site ? calibrationForSite( s.site, path.join( REPO, 'scripts', 'computed-route', 'cache' ) ) : () => null;
	const intake = intakeFile && fs.existsSync( intakeFile ) ? JSON.parse( fs.readFileSync( intakeFile, 'utf8' ) ) : null;
	const ancestors = ancestorsOf( db );
	const draftIdOf = loadDraftIdentity( { buildDir, surface, s, intake } );
	// An enum setting calibration discovered is routed through discovery: G3 never reads it as an unrouted setting.
	const discovered = ( r ) => !! calFor( r.block_slug )?.discovered?.[ r.attr_name ];
	const gateDb = withDiscovery( db, discovered );
	const need = ( v, what ) => {
		if ( null == v ) {
			throw new Error( `${ what } is not readable` );
		}
		return v;
	};
	// The row as the probes read it: its block and that block's ancestors, which the settings it may take are looked up on.
	const probed = ( row ) => ( { ...row, block: blockOf( row ), ancestors: ancestors( blockOf( row ) ), words: [ row.key, row.draftId ].filter( Boolean ) } );
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
			// The declared value at the row's own state and width (hover declarations for a hover row), and FR-48-34's
			// defect joined through the row's draft identity; an unreadable identity fails G2 with its reason.
			G2: ( row ) => {
				const prop = cssProp( row.key );
				const id = draftIdOf( row );
				if ( ! id.draftId ) {
					throw new Error( `the row's draft identity is unreadable: ${ id.reason }` );
				}
				const { declared, unread } = declaredRead( walk, row, prop );
				return { property: prop, declared, unread, renderedDraft: row.draft, fr34Passes: defectNamed( intake, id.draftId, prop, 'hover' === row.kind ), ledgered: !! row.decided };
			},
			G3: ( row ) => ( { db: gateDb, block: need( blockOf( row ), 'the block of the row' ), ancestors: ancestors( blockOf( row ) ), property: cssProp( row.key ), state: settingState( row, s?.states ) ?? null } ),
			G4: ( row, soFar ) => ( {
				cache: calFor( blockOf( row ) ),
				settings: need( soFar.G3?.settings, 'the candidate settings' ),
				state: settingState( row, s?.states ) ?? null,
				boxAgrees: ! ( pairOf( walk, row )?.diffs || [] ).some( ( d ) => ! d.accepted && 'box' === d.kind ),
			} ),
			G5: ( row, soFar ) => ( { settings: soFar.G3?.settings ?? [], measure: probes?.measure ? ( setting ) => probes.measure( probed( row ), setting ) : undefined } ),
			G6: ( row ) => ( { kind: 'hardcode' === row.solveClass ? 'hardcode' : ( 'drive' === row.kind ? 'behaviour' : 'missing-setting' ), probe: probes?.probe ? ( kind ) => probes.probe( probed( row ), kind ) : undefined } ),
			G7: ( row ) => ( { recheck: probes?.recheck ? () => probes.recheck( probed( row ) ) : undefined } ),
		},
		blockOf,
		treeBlocks: () => {
			const names = new Set();
			const visit = ( nodes ) => ( nodes || [] ).forEach( ( n ) => ( names.add( n.name ), visit( n.innerBlocks ) ) );
			visit( tree );
			return names;
		},
		// The setting state a row's values belong to: the one G3 reads, null for the resting state or an unmapped walker state.
		stateOf: ( row ) => settingState( row, s?.states ) ?? null,
		declaredOf: ( row ) => declaredRead( walk, row, cssProp( row.key ) ).declared,
		// The row's draft id (intake's `<component>:<n>`) through the surface's origin map, or null when it is unreadable.
		draftIdOf: ( row ) => draftIdOf( row ).draftId ?? null,
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
		console.error( 'usage: node scripts/computed-route/gate-chain.mjs <solve-report.json> [--client <slug>] [--probes <module.mjs>] [--out <file>] [--debt-out <file>] [--gaps-out <file>]' );
		process.exit( 2 );
	}
	const report = JSON.parse( fs.readFileSync( reportFile, 'utf8' ) );
	const client = flag( '--client' );
	const walk = finalWalk( path.dirname( path.resolve( reportFile ) ) );
	const surfacesFile = client ? path.join( REPO, 'sites', client, 'build', 'surfaces.json' ) : null;
	const probes = flag( '--probes' ) ? ( await import( pathToFileURL( path.resolve( flag( '--probes' ) ) ).href ) ).default : null;
	const surfaces = surfacesFile ? JSON.parse( fs.readFileSync( surfacesFile, 'utf8' ) ) : null;
	const ctx = buildContext( { report, walk, surfaces, surface: report.surface, client, probes, installed: await installedVersions(), db: openDb(), intakeFile: client ? path.join( REPO, 'sites', client, 'build', 'intake', 'intake.json' ) : null } );
	const out = [];
	for ( const issue of issuesOf( report, report.surface ) ) {
		const row = { ...issue.rows[ 0 ], solveClass: issue.solveClass };
		const res = await runChain( row, ctx );
		out.push( gapInput( { issue, row, res }, ctx ) );
		console.log( `${ issue.key }: ${ res.gate ? `stopped at ${ res.gate } (${ res.class }): ${ renderEvidence( res.evidence ) }` : `passed all gates: ${ res.class } candidate` }` );
	}
	const file = path.resolve( flag( '--out' ) || path.join( path.dirname( reportFile ), 'gate-chain.json' ) );
	fs.writeFileSync( file, JSON.stringify( { surface: report.surface, rows: out }, null, 1 ) );
	console.log( `gate chain: ${ out.length } rows, ${ out.filter( ( r ) => r.candidate ).length } framework-gap candidates. Written ${ file }` );
	// FR-48-66: one gaps.json row per open item; a row without evidence for every gate it passed is refused, and a row a fresh walk closed is left out.
	if ( client ) {
		const gaps = writeGaps( { file: path.resolve( flag( '--gaps-out' ) || gapsPath( client, REPO ) ), rows: out, surface: report.surface, publishedOn: new Date().toISOString().slice( 0, 10 ) } );
		console.log( `gaps: ${ gaps.rows.length } rows, ${ gaps.dropped } closed rows left out. Written ${ gaps.file }` );
	}
	// FR-48-67: every I-class row, and the known items whose inputs are present, grouped by owner beside gaps.json.
	if ( client ) {
		const db = openDb();
		const cacheDir = path.join( REPO, 'scripts', 'computed-route', 'cache' );
		const inTree = ctx.treeBlocks();
		const stale = staleSlotMaps( { cacheDir, readKey: READ_KEY, localHash: ( short ) => {
			const dir = path.join( REPO, 'plugins', 'sgs-blocks', 'build', 'blocks', short );
			return fs.existsSync( dir ) ? localBlockHash( dir ) : null;
		} } );
		const known = [ ...unroutedKnown( { db, isDiscovered: ( r ) => !! calibrationForSite( surfaces?.[ report.surface ]?.site ?? '', cacheDir )( r.block_slug )?.discovered?.[ r.attr_name ] } ), ...stale.rows.filter( ( r ) => inTree.has( r.block ) ) ];
		const written = writeDebt( { file: path.resolve( flag( '--debt-out' ) || debtPath( client, REPO ) ), rows: [ ...debtRows( out, { surface: report.surface } ), ...known.map( ( r ) => debtRows( [ r ], { surface: null } )[ 0 ] ) ], surface: report.surface, publishedOn: new Date().toISOString().slice( 0, 10 ) } );
		console.log( `instrument debt: ${ written.rows.length } rows by owner ${ JSON.stringify( written.byOwner ) }; ${ debtRows( out, { surface: report.surface } ).length } from the chain, ${ known.length } known items${ stale.missing.length ? `; inputs missing: ${ stale.missing.slice( 0, 3 ).join( '; ' ) }` : '' }. Written ${ written.file }` );
	}
}
