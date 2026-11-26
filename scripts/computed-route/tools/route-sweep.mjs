#!/usr/bin/env node
// The all-client regression sweep: proposes (and optionally Fills) every surface of every client from frozen saved records,
// offline, and compares the result with an earlier sweep, failing when any surface gets worse (lib/route-sweep.mjs).
//   node tools/route-sweep.mjs --records <dir> --out <dir> [--fill <list>] [--baseline <dir>] [--jobs N] [--reread]
//        [--only client/surface,...] [--repo <checkout>] [--slot-dir <dir>] [--keep-work] [--held-out a,b]
//   node tools/route-sweep.mjs --freeze --records <dir> --from <client>:<source worktree> ... [--repo <checkout>]
// --records: the frozen records (`<records>/<client>/{build,MANIFEST.json}`); --out: where the sweep is written
// (sweep.json, SUMMARY.txt, `<client>/<surface>.{proposal,skeleton,nodes}.json`, and `fill/` with --fill).
// --fill: `default` (the first of each client's header, home or footer found, in that order: header), or a comma list of
// `client/surface`; each is Filled offline once its propose has finished (a browser on the served draft, no site).
// --baseline: a previous --out. Prints per surface the real-fault count and the hand-over count before and after, the new and gone
// lines of each and the changed nodes; exits 1 when any surface gains a real fault or a real-fault line the baseline did not have,
// or a surface proposed there fails now. A hand-over is a line the carried-ids machinery wrote (an id only a live run can make:
// lib/route-sweep.mjs::splitProblems); hand-over lines are listed and never fail. Changed nodes are listed for a person to judge and never fail.
// --reread: first re-read each client's committed draft with the intake command (`intake.mjs <client> --repo <work>`, the
// replay recorded when the records hold none) into a copy of the records, and rebuild every surface's inventory from what
// intake saved, then propose from that copy (the mode for a landing that touches the draft reading: lib/intake*,
// lib/skeleton-inventory*, intake*.mjs). A surface whose intake saved no inventory keeps its frozen one.
// --jobs: processes proposing at once (default 2). With --slot-dir the whole sweep holds exactly one heavy slot (a normal one,
// or the overflow slot after a long wait when the machine has room, lib/heavy-slot.mjs): one job never takes two slots (Bean,
// 2026-11-25), so the other sessions' heavy runs are never starved. It refuses to start with
// the system temp folder on C: (lib/temp-guard.mjs).
// --repo: the checkout under test (default this one): its code is run and its committed drafts are read. Each block's
// default look is built from it (site_look.py, offline, into its scripts/computed-route/site-look) the first time a propose or
// Fill worker reads it (lib/route-sweep.mjs::sweepWorkerEnv, lib/setting-record.mjs::siteLook), after one probe block per
// client proves the builder works (lib/route-sweep.mjs::probeSweepLooks); a checkout whose route cannot build on demand
// (no lib/setting-record.mjs::lookBuildOn) has every block's look built first, as before. A block proposed with no look is
// counted per surface and fails a comparison. Runs with SGS_NO_SITE=1 whatever the environment. Exit 0 pass, 1 a surface got worse or a stage failed, 2 usage.
import { acquire, keepAlive, releasePath } from '../lib/heavy-slot.mjs';
import { assertTempOffC } from '../lib/temp-guard.mjs';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { spawn, spawnSync } from 'node:child_process';
import { fileURLToPath, pathToFileURL } from 'node:url';
import {
	HELD_OUT, instrumentCarried, realFaultLines, freezeClient, recordClients, surfaceList, buildWork, summariseSurface, failedSummary, fingerprintNodes, writeSweep, readSweep, compareSweeps,
	formatComparison, formatSweep, probeSweepLooks, sweepWorkerEnv, shardItems, summariseFill, failedFill, filesUnder,
} from '../lib/route-sweep.mjs';

const HERE = path.dirname( fileURLToPath( import.meta.url ) );
const ROUTE = path.resolve( HERE, '..' );

const readJson = ( file, fallback = null ) => ( fs.existsSync( file ) ? JSON.parse( fs.readFileSync( file, 'utf8' ) ) : fallback );

export function parseArgs( argv ) {
	const flag = ( n ) => ( argv.includes( n ) ? argv[ argv.indexOf( n ) + 1 ] : null );
	const all = ( n ) => argv.flatMap( ( a, i ) => ( a === n ? [ argv[ i + 1 ] ] : [] ) );
	const o = {
		freeze: argv.includes( '--freeze' ), records: flag( '--records' ), out: flag( '--out' ), baseline: flag( '--baseline' ), reread: argv.includes( '--reread' ), keepWork: argv.includes( '--keep-work' ),
		fill: argv.includes( '--fill' ) ? ( flag( '--fill' ) && ! flag( '--fill' ).startsWith( '--' ) ? flag( '--fill' ) : 'default' ) : null,
		jobs: Number( flag( '--jobs' ) ?? 2 ), only: flag( '--only' ) ? flag( '--only' ).split( ',' ) : null, repo: path.resolve( flag( '--repo' ) ?? path.join( ROUTE, '..', '..' ) ),
		slotDir: flag( '--slot-dir' ), heldOut: flag( '--held-out' ) ? [ ...HELD_OUT, ...flag( '--held-out' ).split( ',' ) ] : HELD_OUT, from: all( '--from' ),
		worker: flag( '--worker' ), work: flag( '--work' ), items: flag( '--items' ) ? flag( '--items' ).split( ',' ) : [],
	};
	if ( o.worker ) {
		return o;
	}
	if ( ! o.records || ( ! o.freeze && ! o.out ) || ( o.freeze && ! o.from.length ) || ! Number.isInteger( o.jobs ) || o.jobs < 1 ) {
		return { error: 'usage: route-sweep.mjs --records <dir> --out <dir> [--fill <list>] [--baseline <dir>] [--jobs N] [--reread] [--only client/surface,...]  |  --freeze --records <dir> --from <client>:<worktree>...' };
	}
	return o;
}

// The surface each client's default Fill runs: its header, else its footer, else its first surface.
export function defaultFills( records, clients, heldOut = HELD_OUT ) {
	return clients.map( ( c ) => {
		const list = surfaceList( records, c, heldOut );
		const pick = list.find( ( s ) => s === 'header' ) ?? list.find( ( s ) => s === 'footer' ) ?? list[ 0 ];
		return pick ? `${ c }/${ pick }` : null;
	} ).filter( Boolean );
}

const gitSha = ( repo ) => spawnSync( 'git', [ '-C', repo, 'rev-parse', '--short', 'HEAD' ], { encoding: 'utf8' }).stdout?.trim() || null;

// ---- freeze ----
// `--from <client>:<worktree>`: the checkout under test supplies every committed record of the client's build folder; the
// worktree supplies what intake generates and git does not keep (facts.json, inventories/, replay/).
async function freeze( o ) {
	for ( const spec of o.from ) {
		const [ client, wt ] = spec.split( /:(?![\\/])/ );
		const build = path.join( o.repo, 'sites', client, 'build' );
		const m = freezeClient( {
			dest: o.records, client, heldOut: o.heldOut,
			sources: [ { dir: build, label: `${ o.repo } @ ${ gitSha( o.repo ) } (committed)` }, { dir: path.join( wt, 'sites', client, 'build' ), label: `${ wt } (generated by intake)`, only: /^intake\/(inventories\/|replay\/|facts\.json$)/ } ],
		} );
		console.log( `froze ${ client }: ${ Object.keys( m.files ).length } files` );
	}
}

// ---- workers (child processes) ----
async function proposeWorker( o ) {
	const route = path.join( o.repo, 'scripts', 'computed-route' );
	const { proposeSurface } = await import( pathToFileURL( path.join( route, 'skeleton.mjs' ) ).href );
	const { proposeSkeleton } = await import( pathToFileURL( path.join( route, 'lib', 'skeleton-propose.mjs' ) ).href );
	const allow = {};
	for ( const item of o.items ) {
		const [ client, surface ] = item.split( '/' );
		const a = ( allow[ client ] ||= [] );
		// The propose, with the allowed missing paint growing as the paint gate names blocks; `carried` is the carried-ids reader
		// (a probe says whether any lookup could have written a hand-over line) or null (no carried id at all).
		const run = ( carried, probe ) => {
			let r = null;
			let err = null;
			for ( let i = 0; i < 12 && ! r; i++ ) {
				try {
					r = proposeSurface( { client, surface, repo: o.work, allowMissingPaint: a, propose: ( args ) => proposeSkeleton( { ...args, carried: 'keep' === carried ? instrumentCarried( args.carried, probe ) : null } ) } );
				} catch ( e ) {
					err = e;
					// Two jobs opening the framework database at once can find it locked: wait and try again.
					if ( /database is locked/.test( String( e.message ) ) ) {
						Atomics.wait( new Int32Array( new SharedArrayBuffer( 4 ) ), 0, 0, 2000 );
						continue;
					}
					const named = /--allow-missing-paint (\S+) to resolve/.exec( String( e.message ) )?.[ 1 ];
					if ( ! named ) {
						break;
					}
					a.push( ...named.split( ',' ).filter( ( x ) => ! a.includes( x ) ) );
				}
			}
			return { r, err };
		};
		const probe = { touched: false };
		const { r, err } = run( 'keep', probe );
		const dir = path.join( o.out, client );
		fs.mkdirSync( dir, { recursive: true } );
		if ( ! r ) {
			fs.writeFileSync( path.join( dir, `${ surface }.summary.json` ), JSON.stringify( failedSummary( { client, surface, error: err?.message ?? 'no result' } ) ) );
			console.log( `${ item }: CANNOT PROPOSE ${ String( err?.message ).split( '\n' )[ 0 ].slice( 0, 160 ) }` );
			continue;
		}
		// The hand-over lines are the ones the carried ids write: when a lookup could have written one, the surface is proposed
		// again with no carried ids, and the lines that second run also writes are the real faults (splitProblems). The second run
		// overwrites the surface's saved skeleton and proposal in the work folder, so the first run's are written back.
		let classified = { lines: null, by: null };
		if ( probe.touched ) {
			const second = run( null, null );
			second.err && console.log( `${ item }: the carry-less run failed (${ String( second.err.message ).split( '\n' )[ 0 ].slice( 0, 160 ) }): hand-overs told by the recorded lookup reasons` );
			classified = realFaultLines( { problems: r.problems, carryless: second.r ? second.r.problems : null, reasons: probe.reasons } );
			const write = ( file, value ) => fs.writeFileSync( file, `${ JSON.stringify( value, null, '\t' ) }\n` );
			write( r.paths.skeleton, r.skeleton );
			write( r.paths.proposal, r.proposal );
		}
		const summary = summariseSurface( { client, surface, proposal: r.proposal, problems: r.problems, realProblems: classified.lines, classifiedBy: classified.by, skeleton: r.skeleton, withoutLook: r.withoutLook ?? [] } );
		fs.writeFileSync( path.join( dir, `${ surface }.summary.json` ), JSON.stringify( summary ) );
		fs.writeFileSync( path.join( dir, `${ surface }.nodes.json` ), JSON.stringify( fingerprintNodes( r.skeleton, r.proposal ) ) );
		fs.writeFileSync( path.join( dir, `${ surface }.proposal.json` ), JSON.stringify( r.proposal, null, 1 ) );
		fs.writeFileSync( path.join( dir, `${ surface }.skeleton.json` ), JSON.stringify( r.skeleton, null, 1 ) );
		console.log( `${ item }: nodes ${ summary.nodes } real faults ${ summary.problemCount } hand-overs ${ summary.handoverCount }` );
	}
}

// What Fill reads for one surface, from the checkout under test (`repo`, like fill.mjs itself): a surface the manifest reaches at a
// route of its own (a form's page: `draftRoute`) is served and read there, as the site run reads it (site-run.mjs::surfaceReach);
// one with no route is read at the draft's entry page from the folder. Returns { read: { draftUrl } | { draftDir }, close }.
const fromRepo = ( repo, file ) => import( pathToFileURL( path.join( repo, 'scripts', 'computed-route', file ) ).href );
export async function fillReach( { repo, site, surface, entry } ) {
	const reach = entry.draftRoute ? ( await fromRepo( repo, 'site-run.mjs' ) ).surfaceReach( { key: surface, entry, skel: null, rows: [], routing: readJson( path.join( site, 'build', 'intake', 'intake.json' ) )?.routing ?? null } ) : null;
	if ( ! reach?.hash ) {
		return { read: { draftDir: path.join( site, 'handoff' ) }, close: async () => {} };
	}
	const { assertDraftPage, serveDraft } = await fromRepo( repo, 'lib/draft.mjs' );
	const served = await serveDraft( assertDraftPage( path.join( site, 'handoff' ), entry.draftIndex ), { index: entry.draftIndex } );
	return { read: { draftUrl: `${ served.url }${ reach.hash }` }, close: () => served.close() };
}

async function fillWorker( o ) {
	const { fillSurface } = await import( pathToFileURL( path.join( o.repo, 'scripts', 'computed-route', 'fill.mjs' ) ).href );
	for ( const item of o.items ) {
		const [ client, surface ] = item.split( '/' );
		const dir = path.join( o.out, 'fill', client, surface );
		fs.rmSync( dir, { recursive: true, force: true } );
		const site = path.join( o.work, 'sites', client );
		const entry = readJson( path.join( site, 'build', 'surfaces.json' ) )?.[ surface ] ?? {};
		let summary;
		let reach = null;
		try {
			reach = await fillReach( { repo: o.repo, site, surface, entry } );
			const report = await fillSurface( {
				client, surface, skeleton: path.join( site, 'build', 'skeleton', `${ surface }.skeleton.json` ), ...reach.read, draftIndex: entry.draftIndex, liveUrl: 'http://127.0.0.1/', external: true,
				out: dir, repo: o.work, allowMissingPaint: [ 'sgs/whatsapp-cta', 'sgs/product-card' ], log: () => {},
			} );
			summary = summariseFill( { client, surface, report, opener: readJson( path.join( dir, 'opener.json' ) ) } );
		} catch ( e ) {
			summary = failedFill( { client, surface, error: e.message || e } );
		} finally {
			await reach?.close();
		}
		fs.mkdirSync( dir, { recursive: true } );
		fs.writeFileSync( path.join( dir, 'summary.json' ), JSON.stringify( summary ) );
		console.log( `fill ${ item }: ${ summary.ok ? `writes ${ summary.writes } unmapped ${ summary.unmapped } refusals ${ summary.refusals }` : `FAILED ${ summary.error }` }` );
	}
}

// Runs `shards` as child processes of this command at once; resolves when every one ends.
function runShards( mode, shards, o, extra = [] ) {
	return Promise.all( shards.map( ( items ) => new Promise( ( resolve ) => {
		const args = [ fileURLToPath( import.meta.url ), '--worker', mode, '--records', o.records, '--out', o.out, '--work', o.work, '--repo', o.repo, '--items', items.join( ',' ), ...extra ];
		const child = spawn( process.execPath, args, { env: sweepWorkerEnv( process.env, os.tmpdir() ), stdio: [ 'ignore', 'pipe', 'inherit' ] } );
		child.stdout.on( 'data', ( d ) => String( d ).split( '\n' ).filter( ( l ) => l && ! l.startsWith( 'facts:' ) ).forEach( ( l ) => console.log( l ) ) );
		child.on( 'exit', ( code ) => resolve( code ) );
	} ) ) );
}

// ---- reread ----
// Intake re-reads each client's committed draft into the work copy; every surface naming an intake skeleton then takes its
// inventory from what intake saved. Returns the lines naming a surface that kept its frozen inventory and why.
async function reread( o, clients ) {
	const saved = await import( pathToFileURL( path.join( o.repo, 'scripts', 'computed-route', 'lib', 'skeleton-saved-inventory.mjs' ) ).href );
	const notes = [];
	for ( const c of clients ) {
		const build = path.join( o.work, 'sites', c, 'build' );
		const record = ! filesUnder( path.join( build, 'intake', 'replay' ) ).length;
		console.log( `re-reading ${ c }'s draft with intake${ record ? ' (recording the replay)' : '' }` );
		const r = spawnSync( process.execPath, [ path.join( o.repo, 'scripts', 'computed-route', 'intake.mjs' ), c, '--repo', o.work, ...( record ? [ '--record' ] : [] ) ], { stdio: 'inherit', env: { ...process.env, SGS_NO_SITE: '1' } } );
		if ( r.status ) {
			throw new Error( `intake failed for ${ c } (exit ${ r.status })` );
		}
		const surfaces = readJson( path.join( build, 'surfaces.json' ) );
		const intake = readJson( path.join( build, 'intake', 'intake.json' ) );
		for ( const s of surfaceList( o.records, c, o.heldOut ) ) {
			try {
				fs.writeFileSync( path.join( build, 'skeleton', `${ s }.inventory.json` ), `${ JSON.stringify( saved.savedInventoryOf( { repo: o.work, client: c, surface: s, surfaces, intake } ), null, '\t' ) }\n` );
			} catch ( e ) {
				notes.push( `${ c }/${ s }: kept the frozen inventory (${ String( e.message ).split( '\n' )[ 0 ].slice( 0, 120 ) })` );
			}
		}
	}
	return notes;
}

// ---- the sweep ----
async function sweep( o ) {
	const t0 = Date.now();
	const clients = recordClients( o.records );
	if ( ! clients.length ) {
		throw new Error( `${ o.records } holds no client records (a <client>/build/surfaces.json each): freeze them first with --freeze` );
	}
	o.out = path.resolve( o.out );
	o.records = path.resolve( o.records );
	if ( o.baseline && path.resolve( o.baseline ) === o.out ) {
		throw new Error( '--out is the --baseline folder: the sweep would erase what it compares with' );
	}
	o.work = path.resolve( o.out, '.work' );
	fs.rmSync( o.out, { recursive: true, force: true } );
	fs.mkdirSync( o.out, { recursive: true } );
	let items = clients.flatMap( ( c ) => surfaceList( o.records, c, o.heldOut ).map( ( s ) => `${ c }/${ s }` ) );
	o.only && ( items = items.filter( ( i ) => o.only.includes( i ) ) );
	const owner = { label: `sweep:${ path.basename( o.out ) }`, pid: process.pid };
	const held = o.slotDir ? [ ( await acquire( { dir: o.slotDir, owner: { ...owner, beat: Date.now() }, log: ( m ) => console.log( m ) } ) ).path ] : [];
	const stopBeat = keepAlive( held, owner );
	const jobs = o.jobs;
	try {
		const wanted = new Set( items.map( ( i ) => i.split( '/' )[ 0 ] ) );
		for ( const c of clients.filter( ( x ) => wanted.has( x ) ) ) {
			buildWork( { records: o.records, client: c, repo: o.repo, work: o.work } );
		}
		const notes = o.reread ? await reread( o, clients.filter( ( x ) => wanted.has( x ) ) ) : [];
		// The default looks come from the checkout under test: its workers build each block's look the first time they read it
		// (sweepWorkerEnv), after one probe block per client shows the builder works. A checkout whose route has no on-demand
		// build (no lookBuildOn) has every block's look built here first, as its workers would build none.
		const lib = ( f ) => import( pathToFileURL( path.join( o.repo, 'scripts', 'computed-route', 'lib', f ) ).href );
		const [ { prepareLooks, lookBuildOn }, { openDb } ] = await Promise.all( [ lib( 'setting-record.mjs' ), lib( 'db.mjs' ) ] );
		const tLooks = Date.now();
		const log = ( m ) => console.log( m );
		probeSweepLooks( { clients: [ ...wanted ], prepare: prepareLooks, log } );
		if ( ! lookBuildOn ) {
			const db = openDb();
			const blocks = db.prepare( "SELECT slug FROM blocks WHERE slug LIKE 'sgs/%' ORDER BY slug" ).all().map( ( r ) => r.slug );
			db.close();
			console.log( `building the default looks of ${ blocks.length } blocks for ${ wanted.size } client(s): ${ o.repo } builds none on demand` );
			for ( const c of wanted ) {
				const missed = prepareLooks( blocks, c, { build: true, log } );
				missed.length && console.log( `${ c }: no default look built for ${ missed.join( ', ' ) }` );
			}
		}
		console.log( `looks ${ Math.round( ( Date.now() - tLooks ) / 1000 ) }s` );
		// The re-read records, kept as frozen records of their own (`<out>/records`): a baseline made with --reread can be
		// re-run later without reading the drafts again.
		for ( const c of o.reread ? clients.filter( ( x ) => wanted.has( x ) ) : [] ) {
			freezeClient( { dest: path.join( o.out, 'records' ), client: c, sources: [ { dir: path.join( o.work, 'sites', c, 'build' ), label: `intake re-read of the committed draft at ${ gitSha( o.repo ) }` } ], heldOut: o.heldOut } );
		}
		console.log( `proposing ${ items.length } surface(s) of ${ wanted.size } client(s) with ${ jobs } job(s)` );
		const tPropose = Date.now();
		await runShards( 'propose', shardItems( items, jobs ), o );
		const surfaces = {};
		const nodes = {};
		for ( const i of items ) {
			const [ c, s ] = i.split( '/' );
			const summary = readJson( path.join( o.out, c, `${ s }.summary.json` ), null ) ?? failedSummary( { client: c, surface: s, error: 'the propose process ended without a result' } );
			surfaces[ i ] = summary;
			summary.ok && ( nodes[ i ] = readJson( path.join( o.out, c, `${ s }.nodes.json` ), [] ) );
		}
		const proposeSecs = Math.round( ( Date.now() - tPropose ) / 1000 );
		const fills = o.fill ? ( 'default' === o.fill ? defaultFills( o.records, clients, o.heldOut ) : o.fill.split( ',' ) ).filter( ( i ) => surfaces[ i ]?.ok ) : [];
		const fillSummaries = {};
		if ( fills.length ) {
			console.log( `filling ${ fills.join( ', ' ) }` );
			await runShards( 'fill', shardItems( fills, Math.min( jobs, fills.length ) ), o );
			for ( const i of fills ) {
				const [ c, s ] = i.split( '/' );
				fillSummaries[ i ] = readJson( path.join( o.out, 'fill', c, s, 'summary.json' ), failedFill( { client: c, surface: s, error: 'the fill process ended without a result' } ) );
			}
		}
		const meta = { mainSha: gitSha( o.repo ), repo: o.repo, records: o.records, generatedAt: new Date().toISOString(), reread: o.reread, rereadNotes: notes, proposeSeconds: proposeSecs, fill: fillSummaries };
		for ( const c of clients ) {
			meta[ `manifest:${ c }` ] = readJson( path.join( o.records, c, 'MANIFEST.json' ), {} ).frozenAt ?? null;
		}
		writeSweep( { out: o.out, surfaces, nodes, meta } );
		process.stdout.write( `\n${ formatSweep( { surfaces, mainSha: meta.mainSha } ) }` );
		notes.forEach( ( n ) => console.log( n ) );
		Object.values( fillSummaries ).forEach( ( f ) => console.log( f.ok ? `fill ${ f.client }/${ f.surface }: writes ${ f.writes }, unmapped ${ f.unmapped }, refusals ${ f.refusals }` : `fill ${ f.client }/${ f.surface }: FAILED ${ f.error }` ) );
		console.log( `propose ${ proposeSecs }s, whole sweep ${ Math.round( ( Date.now() - t0 ) / 1000 ) }s` );
	} finally {
		stopBeat();
		held.forEach( releasePath );
		! o.keepWork && fs.rmSync( o.work, { recursive: true, force: true } );
	}
	let exit = 0;
	if ( o.baseline ) {
		const before = readSweep( path.resolve( o.baseline ) );
		const after = readSweep( o.out );
		// A run limited with --only is compared with the baseline's same surfaces, not with every one it holds.
		o.only && Object.keys( before.surfaces ).filter( ( k ) => ! o.only.includes( k ) ).forEach( ( k ) => delete before.surfaces[ k ] );
		const cmp = compareSweeps( before, after );
		const text = formatComparison( cmp );
		fs.writeFileSync( path.join( o.out, 'COMPARISON.txt' ), text );
		process.stdout.write( `\n${ text }` );
		exit = cmp.ok ? 0 : 1;
		for ( const [ k, f ] of Object.entries( after.meta.fill || {} ) ) {
			const was = before.meta.fill?.[ k ];
			was?.ok && ! f.ok && ( console.log( `FAIL fill ${ k }: filled in the baseline, fails now (${ f.error })` ), ( exit = 1 ) );
		}
	}
	return exit;
}

if ( process.argv[ 1 ] && path.resolve( process.argv[ 1 ] ) === fileURLToPath( import.meta.url ) ) {
	assertTempOffC( 'route-sweep' );
	const o = parseArgs( process.argv.slice( 2 ) );
	if ( o.error ) {
		process.stderr.write( `${ o.error }\n` );
		process.exit( 2 );
	}
	try {
		if ( o.worker ) {
			o.records = path.resolve( o.records );
			await ( 'propose' === o.worker ? proposeWorker( o ) : fillWorker( o ) );
		} else if ( o.freeze ) {
			await freeze( o );
		} else {
			process.exitCode = await sweep( o );
		}
	} catch ( e ) {
		console.error( e.stack || e );
		process.exit( 1 );
	}
}
