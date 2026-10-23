// The intake command (Spec 48 FR-48-17, FR-48-35, §9): stage 1 on sites/<client>/handoff/, closed by Bean's one
// batched review. This parent process reads and writes files only: it re-checks MANIFEST.json (a version other than
// "1.0" stops the run before any browser starts), checks the replay file, starts the secret-free worker
// (lib/intake-run-worker.mjs, through lib/intake-process.mjs::runIsolated) that runs every stage that renders or reads
// the draft, then assembles intake.json, validates it against data/intake.schema.json (an invalid record is never
// written), carries Bean's marks over from the previous intake.json (kept as intake.prev.json), and writes review.md
// and page-map.json. `--apply-review` reads review.md back and writes the marks, the confirmed page map and Bean's
// confirmed skeleton choices (the client decisions file). `--finalise`, `--apply-picks` and `--render` are
// lib/intake-run-finalise.mjs.
import fs from 'fs';
import os from 'os';
import path from 'path';
import { fileURLToPath } from 'url';
import { recheckManifest } from './intake-sandbox.mjs';
import { runIsolated } from './intake-process.mjs';
import { loadAjv, schemaProblems } from './handoff.mjs';
import { pageMapProblems } from './intake-pagemap.mjs';
import { renderReview, applyReview, carryOver, reviewRows, isoDay, ROW_TYPES } from './intake-review.mjs';
import { withUnappliedMarks, writeProposedPageMap, writeConfirmedPageMap } from './intake-review-carry.mjs';
import { mergeBlocked } from './intake-run-collapse.mjs';
import { reviewDecisions, recordReviewDecisions, decisionsFile, dbKnownBlock } from './intake-run-finalise.mjs';
import { refreshIntakeSkeletons } from './skeleton-rerun.mjs';
import { openDb } from './db.mjs';
import { sourcesOf } from './freshness.mjs';

const HERE = path.dirname( fileURLToPath( import.meta.url ) );
export const REPO = path.resolve( HERE, '..', '..', '..' );
export const INTAKE_SCHEMA = path.join( HERE, '..', 'data', 'intake.schema.json' );
const WORKER = path.join( HERE, 'intake-run-worker.mjs' );
const WIDTHS = [ 375, 768, 1440 ];
export const USAGE = [
	'usage: node scripts/computed-route/intake.mjs <client> [--record] [--widths 375,768,1440] [--surfaces a,b] [--repo <path>]',
	'       node scripts/computed-route/intake.mjs --apply-review <client> [--repo <path>]',
	'       node scripts/computed-route/intake.mjs --finalise <client> | --apply-picks <client> | --render <client> | --rerun-skeletons <client> | --facts <client> | --page-map <client> [--repo <path>]',
].join( '\n' );

const MODES = { '--apply-review': 'apply', '--finalise': 'finalise', '--apply-picks': 'apply-picks', '--render': 'render', '--rerun-skeletons': 'rerun-skeletons', '--facts': 'facts', '--page-map': 'page-map' };

// argv (after the script) to { mode: 'run'|'apply'|'finalise'|'apply-picks'|'render'|'rerun-skeletons'|'facts'|'page-map', client, record, widths, surfaces,
// repo } or { error }.
export function parseArgs( argv ) {
	const o = { mode: 'run', client: null, record: false, widths: WIDTHS, surfaces: null, repo: REPO };
	for ( let i = 0; i < argv.length; i++ ) {
		const a = argv[ i ];
		const value = () => ( i + 1 < argv.length && ! argv[ i + 1 ].startsWith( '--' ) ? argv[ ++i ] : null );
		if ( '--record' === a ) {
			o.record = true;
		} else if ( a in MODES ) {
			if ( 'run' !== o.mode ) {
				return { error: `one mode only (got ${ a } after another)` };
			}
			o.mode = MODES[ a ];
		} else if ( '--widths' === a ) {
			const v = value();
			o.widths = v ? v.split( ',' ).map( Number ) : [];
			if ( ! o.widths.length || o.widths.some( ( w ) => ! Number.isInteger( w ) || w < 200 || w > 4000 ) ) {
				return { error: `--widths needs a comma list of widths in pixels, not ${ JSON.stringify( v ) }` };
			}
		} else if ( '--surfaces' === a ) {
			const v = value();
			if ( ! v ) {
				return { error: '--surfaces needs a comma list of surface slugs or surfaces.json ids' };
			}
			o.surfaces = v.split( ',' ).map( ( s ) => s.trim() ).filter( Boolean );
		} else if ( '--repo' === a ) {
			const v = value();
			if ( ! v ) {
				return { error: '--repo needs a path' };
			}
			o.repo = path.resolve( v );
		} else if ( a.startsWith( '--' ) ) {
			return { error: `unknown option ${ a }` };
		} else if ( o.client ) {
			return { error: `one client only (got ${ o.client } and ${ a })` };
		} else {
			o.client = a;
		}
	}
	if ( ! o.client || ! /^[a-z0-9-]+$/.test( o.client ) ) {
		return { error: o.client ? `client "${ o.client }" is not a slug` : 'no client given' };
	}
	if ( 'run' !== o.mode && ( o.record || o.surfaces || o.widths !== WIDTHS ) ) {
		return { error: `${ Object.keys( MODES ).find( ( k ) => MODES[ k ] === o.mode ) } takes only the client (and --repo)` };
	}
	return o;
}

// Where a client's intake reads and writes.
export function pathsFor( repo, client ) {
	const build = path.join( repo, 'sites', client, 'build' );
	const dir = path.join( build, 'intake' );
	return { folder: path.join( repo, 'sites', client, 'handoff' ), dir, intake: path.join( dir, 'intake.json' ), prev: path.join( dir, 'intake.prev.json' ), review: path.join( dir, 'review.md' ), inventories: path.join( dir, 'inventories' ), facts: path.join( dir, 'facts.json' ), pageMap: path.join( build, 'page-map.json' ), confirmed: path.join( dir, 'page-map.confirmed.json' ), replay: ( hash ) => path.join( dir, 'replay', `${ hash }.har` ) };
}

const secs = ( ms ) => `${ ( ms / 1000 ).toFixed( 1 ) }s`;
const readJson = ( file ) => JSON.parse( fs.readFileSync( file, 'utf8' ) );

// Echoes new whole lines of the worker's progress file to `log` every half second; returns stop().
function tail( file, log ) {
	let pos = 0;
	const tick = () => {
		let text;
		try {
			text = fs.readFileSync( file, 'utf8' );
		} catch {
			return;
		}
		const end = text.lastIndexOf( '\n' ) + 1;
		if ( end > pos ) {
			text.slice( pos, end ).split( '\n' ).filter( Boolean ).forEach( ( l ) => log( l ) );
			pos = end;
		}
	};
	const timer = setInterval( tick, 500 );
	return () => {
		clearInterval( timer );
		tick();
	};
}

// The intake record from the worker's result (Appendix C "Intake record"), review rows unmarked until carryOver.
export function buildRecord( { client, takenOn, manifest, result, sources = null } ) {
	const p = result.parts;
	const gaps = [ ...result.gaps ];
	const attempts = ( p.replay?.proxyAttempts ?? 0 ) + ( p.skeletons?.proxyAttempts ?? 0 );
	if ( attempts ) {
		gaps.push( { construct: 'sandbox', draftId: client, error: `the trap proxy saw ${ attempts } connection attempt(s): something tried the live network`, stage: 'replay' } );
	}
	const r = p.routing?.routing;
	const record = {
		schemaVersion: '1', client, takenOn, ...( sources ? { sources } : {} ),
		manifest: { schema_version: manifest.schemaVersion, files: Object.fromEntries( manifest.files.map( ( f ) => [ f.path, f.sha256 ] ) ) },
		tools: result.tools, harness: result.harness,
		census: p.census?.census?.rows ?? [],
		inventory: p.inventory?.inventory ?? { animations: null, surfaces: null, diff: [] },
		routing: r ? { adapter: r.adapter, routes: r.routes, links: r.links } : { adapter: null, routes: [], links: [] },
		breakpoints: p.breakpoints?.breakpoints ?? [],
		pageMap: p[ 'page map' ]?.pageMap ?? [],
		palette: p[ 'tokens and palette' ]?.palette ?? { tokens: [], rows: [], unused: [], oneOff: [] },
		siteInfo: p[ 'site info' ]?.siteInfo ?? { rows: [], refused: [] },
		flags: p.flags?.flags ?? [],
		draftDefects: p[ 'draft defects' ]?.draftDefects ?? [],
		notDefects: p[ 'draft defects' ]?.notDefects ?? [],
		missingFeatures: p[ 'missing features' ]?.missingFeatures ?? [],
		skeletons: p.skeletons?.skeletons ?? {},
		notices: { prose: p.notices?.prose ?? [], blockedHosts: mergeBlocked( result.blocked ?? Object.values( p ).flatMap( ( x ) => x?.blocked ?? [] ) ) },
		gaps,
		review: [],
	};
	return { record, attempts };
}

// Rows per review section: { rowType: n }.
export const sectionCounts = ( intake ) => Object.fromEntries( ROW_TYPES.map( ( t ) => [ t, reviewRows( intake ).filter( ( r ) => r.rowType === t ).length ] ) );

// Every problem that stops the record being written: the intake schema and the page-map rows.
export function recordProblems( record, ajv = loadAjv() ) {
	return [ ...schemaProblems( ajv, INTAKE_SCHEMA, record ).map( ( p ) => `intake.json ${ p }` ), ...pageMapProblems( record.pageMap, ajv ).map( ( p ) => `page map ${ p }` ) ];
}

// Stage 1. Returns the exit code; every line goes to `log`.
export async function runIntake( o, { log = ( l ) => process.stderr.write( `${ l }\n` ) } = {} ) {
	const t0 = Date.now();
	const at = pathsFor( o.repo, o.client );
	const say = ( l ) => log( `[intake] ${ l }` );
	let manifest;
	try {
		manifest = recheckManifest( at.folder );
	} catch ( e ) {
		say( `manifest re-check FAILED for ${ at.folder }: ${ e.message }` );
		return 1;
	}
	say( `manifest re-check: schema_version ${ manifest.schemaVersion }, ${ manifest.files.length } files, hash ${ manifest.manifestHash.slice( 0, 16 ) } (${ secs( Date.now() - t0 ) })` );
	const harPath = at.replay( manifest.manifestHash );
	if ( ! o.record && ! fs.existsSync( harPath ) ) {
		say( `no replay file ${ harPath } for this export: run again with --record to record it (fonts, stock images and the pinned runtime scripts)` );
		return 1;
	}
	const m = readJson( path.join( at.folder, 'MANIFEST.json' ) );
	// The inputs are hashed before the worker reads any of them, so a draft edited during the run leaves a stale record.
	const hashed = sourcesOf( at.folder );
	const work = fs.mkdtempSync( path.join( os.tmpdir(), 'sgs-intake-' ) );
	const job = { repo: o.repo, client: o.client, folder: at.folder, sources: hashed, entry: m.entry_drafts?.[ 0 ], harPath, record: o.record, widths: o.widths, surfaces: o.surfaces, inventoriesDir: at.inventories, factsFile: at.facts, runtimeSha: m.runtime_sha256 ?? 'none', progressFile: path.join( work, 'progress.log' ), outFile: path.join( work, 'result.json' ) };
	fs.mkdirSync( at.inventories, { recursive: true } );
	fs.writeFileSync( path.join( work, 'job.json' ), JSON.stringify( job ) );
	fs.writeFileSync( job.progressFile, '' );
	say( 'secret-free worker: starting (allowlisted environment; the worker refuses to start with a secret variable)' );
	const stop = tail( job.progressFile, say );
	let result;
	try {
		await runIsolated( WORKER, [ path.join( work, 'job.json' ) ], { cwd: work, timeout: 6 * 3600 * 1000 } );
		result = readJson( job.outFile );
	} catch ( e ) {
		stop();
		say( `the worker FAILED: ${ e.message }` );
		fs.rmSync( work, { recursive: true, force: true } );
		return 1;
	}
	stop();
	fs.rmSync( work, { recursive: true, force: true } );
	const built = buildRecord( { client: o.client, takenOn: new Date().toISOString(), manifest, result, sources: hashed } );
	const { attempts } = built;
	let { record } = built;
	// The skeleton rows proposed once more from the inventories this run saved, now the motion inventory is known (a
	// marquee is recognised by its recorded loop): the rows `--rerun-skeletons` gives, so both paths agree.
	const fw = openDb();
	try {
		record = refreshIntakeSkeletons( { intake: record, client: o.client, db: fw, repo: o.repo } ).intake;
	} catch ( e ) {
		const error = `the motion-aware skeleton pass failed (${ e.message.split( '\n' )[ 0 ] }); the run's own skeleton rows are kept, so motion-dependent rules (a marquee) did not apply`;
		say( error );
		record = { ...record, gaps: [ ...( record.gaps || [] ), { construct: 'skeleton-refresh', draftId: o.client, error, stage: 'skeletons' } ] };
	} finally {
		fw.close();
	}
	let previous = null;
	if ( fs.existsSync( at.intake ) ) {
		try {
			previous = readJson( at.intake );
		} catch ( e ) {
			say( `the previous intake.json does not parse (${ e.message }); no marks are carried` );
		}
	}
	if ( previous && fs.existsSync( at.review ) ) {
		const kept = withUnappliedMarks( previous, fs.readFileSync( at.review, 'utf8' ), { day: fs.statSync( at.review ).mtime.toISOString().slice( 0, 10 ) } );
		previous = kept.intake;
		if ( kept.carried.length ) {
			say( `review.md: ${ kept.carried.length } mark(s) not yet applied are carried (${ kept.carried.slice( 0, 5 ).join( ', ' ) }${ kept.carried.length > 5 ? ', …' : '' })` );
		}
		if ( kept.refused.length ) {
			say( `review.md: ${ kept.refused.length } mark(s) --apply-review would refuse are not carried: ${ kept.refused.join( '; ' ) }` );
		}
		if ( kept.acceptAll.length ) {
			say( `review.md: Accept all was ticked in ${ kept.acceptAll.join( ', ' ) }; a tick is not carried, so tick it again in the new review.md` );
		}
	}
	const carried = carryOver( previous, record );
	record.review = carried.review;
	carried.realigned.length && say( `review: ${ carried.realigned.length } mark(s) followed their element to a renumbered row: ${ carried.realigned.slice( 0, 5 ).join( '; ' ) }${ carried.realigned.length > 5 ? '; ...' : '' }` );
	carried.refused.length && say( `review: ${ carried.refused.length } mark(s) NOT carried (the element changed or is gone): ${ carried.refused.join( '; ' ) }` );
	const problems = recordProblems( record );
	if ( problems.length ) {
		say( `intake.json does NOT validate, nothing written:\n${ problems.map( ( p ) => `  - ${ p }` ).join( '\n' ) }` );
		return 1;
	}
	fs.mkdirSync( at.dir, { recursive: true } );
	previous && fs.copyFileSync( at.intake, at.prev );
	fs.writeFileSync( at.intake, `${ JSON.stringify( record, null, 1 ) }\n` );
	fs.writeFileSync( at.review, renderReview( record ) );
	const mapKept = ! writeProposedPageMap( at, `${ JSON.stringify( record.pageMap, null, 2 ) }\n` ).written;
	mapKept && say( `${ path.relative( o.repo, at.pageMap ) } is confirmed, so this run leaves it as it is (the new proposal is in intake.json; --apply-review replaces it)` );
	const counts = sectionCounts( record );
	const p = result.parts;
	const sk = p.skeletons?.collapse?.skeletons ?? [ 0, 0 ];
	say( `collapsed: skeleton rows ${ sk[ 0 ] } -> ${ p.skeletons?.collapse?.skeletonsWithinSurfaces ?? 0 } within surfaces -> ${ sk[ 1 ] } across surfaces, flag rows ${ ( p.flags?.collapse?.flags ?? [ 0, 0 ] ).join( ' -> ' ) }, missing-feature rows ${ ( p[ 'missing features' ]?.collapse?.missing ?? [ 0, 0 ] ).join( ' -> ' ) }` );
	say( `review rows: ${ Object.entries( counts ).map( ( [ t, n ] ) => `${ t } ${ n }` ).join( ', ' ) }; carried marks ${ carried.review.filter( ( r ) => r.mark ).length }, changed ${ carried.changed.length }` );
	say( `${ o.client }: wrote ${ path.relative( o.repo, at.intake ) }, review.md (${ Object.values( counts ).reduce( ( a, b ) => a + b, 0 ) } rows) and ${ path.relative( o.repo, at.pageMap ) } in ${ secs( Date.now() - t0 ) }; census ${ p.census?.census?.pass ? 'pass' : 'FAIL' }; ${ record.gaps.length } gap rows; ${ record.notices.blockedHosts.length } blocked requests; proxy attempts ${ attempts }` );
	return 0;
}

// The confirmed page map: `drop`ped rows removed, `edit:<field>=<value>` marks applied ("null" or empty clears parent
// and template).
export function confirmedPageMap( intake ) {
	const ids = reviewRows( intake ).filter( ( r ) => 'page-map' === r.rowType ).map( ( r ) => r.rowId );
	const marks = new Map( ( intake.review || [] ).map( ( r ) => [ r.rowId, r.mark ] ) );
	return intake.pageMap.flatMap( ( row, i ) => {
		const mark = marks.get( ids[ i ] ) ?? null;
		if ( 'drop' === mark ) {
			return [];
		}
		const e = /^edit:([A-Za-z]+)=(.*)$/.exec( mark || '' );
		if ( ! e ) {
			return [ row ];
		}
		const value = [ 'parent', 'template' ].includes( e[ 1 ] ) && [ '', 'null' ].includes( e[ 2 ] ) ? null : e[ 2 ];
		return [ { ...row, [ e[ 1 ] ]: value } ];
	} );
}

// --apply-review. Returns the exit code. Bean's confirmed skeleton choices (intake-run-finalise.mjs::reviewDecisions)
// go into sites/<client>/build/skeleton/decisions.json; `knownBlock` (default: the framework DB, read-only) must know
// every block they name, or nothing is written.
export function applyIntakeReview( o, { log = ( l ) => process.stderr.write( `${ l }\n` ), today = isoDay(), knownBlock = null } = {} ) {
	const at = pathsFor( o.repo, o.client );
	const say = ( l ) => log( `[intake --apply-review] ${ l }` );
	for ( const f of [ at.intake, at.review ] ) {
		if ( ! fs.existsSync( f ) ) {
			say( `${ f } is missing: run the intake first` );
			return 1;
		}
	}
	const res = applyReview( readJson( at.intake ), fs.readFileSync( at.review, 'utf8' ), { today } );
	if ( res.problems.length || res.missing.length ) {
		say( `review.md is not complete, nothing written:\n${ [ ...res.problems, ...res.missing.map( ( r ) => `row ${ r.rowId } (${ r.rowType }) needs a mark: ${ r.why }` ) ].map( ( p ) => `  - ${ p }` ).join( '\n' ) }` );
		return 1;
	}
	const pageMap = confirmedPageMap( res.intake );
	const ajv = loadAjv();
	const problems = [ ...recordProblems( res.intake, ajv ), ...pageMapProblems( pageMap, ajv ).map( ( p ) => `confirmed page map ${ p }` ) ];
	const decisions = reviewDecisions( res.intake, today );
	if ( decisions.length ) {
		const db = knownBlock ? null : dbKnownBlock();
		try {
			const known = knownBlock || db.known;
			decisions.filter( ( d ) => d.choice.block && ! known( d.choice.block ) ).forEach( ( d ) => problems.push( `skeleton ${ d.surface } ${ d.element.key }: ${ d.choice.block } is not a block in the framework database` ) );
		} finally {
			db?.close();
		}
	}
	if ( problems.length ) {
		say( `the marked record does not validate, nothing written:\n${ problems.map( ( p ) => `  - ${ p }` ).join( '\n' ) }` );
		return 1;
	}
	fs.writeFileSync( at.intake, `${ JSON.stringify( res.intake, null, 1 ) }\n` );
	const file = decisionsFile( o.repo, o.client );
	const saved = recordReviewDecisions( decisions, file );
	writeConfirmedPageMap( at, `${ JSON.stringify( pageMap, null, 2 ) }\n`, today );
	const dropped = res.intake.pageMap.length - pageMap.length;
	say( `${ o.client }: ${ res.intake.review.length } rows marked (dated ${ today }); page-map.json confirmed with ${ pageMap.length } rows${ dropped ? ` (${ dropped } dropped)` : '' }; ${ saved } skeleton choices saved to ${ path.relative( o.repo, file ) } (block:<slug> marks and accepted finaliser picks)` );
	return 0;
}
