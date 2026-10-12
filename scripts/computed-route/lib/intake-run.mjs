// The intake command (Spec 48 FR-48-17, FR-48-35, §9): stage 1 on sites/<client>/handoff/, closed by Bean's one
// batched review. This parent process reads and writes files only: it re-checks MANIFEST.json (a version other than
// "1.0" stops the run before any browser starts), checks the replay file, starts the secret-free worker
// (lib/intake-run-worker.mjs, through lib/intake-process.mjs::runIsolated) that runs every stage that renders or reads
// the draft, then assembles intake.json, validates it against data/intake.schema.json (an invalid record is never
// written), carries Bean's marks over from the previous intake.json (kept as intake.prev.json), and writes review.md
// and page-map.json. `--apply-review` reads review.md back and writes the marks, and the confirmed page map.
import fs from 'fs';
import os from 'os';
import path from 'path';
import { fileURLToPath } from 'url';
import { recheckManifest } from './intake-sandbox.mjs';
import { runIsolated } from './intake-process.mjs';
import { loadAjv, schemaProblems } from './handoff.mjs';
import { pageMapProblems } from './intake-pagemap.mjs';
import { renderReview, applyReview, carryOver, reviewRows, isoDay, ROW_TYPES } from './intake-review.mjs';

const HERE = path.dirname( fileURLToPath( import.meta.url ) );
export const REPO = path.resolve( HERE, '..', '..', '..' );
export const INTAKE_SCHEMA = path.join( HERE, '..', 'data', 'intake.schema.json' );
const WORKER = path.join( HERE, 'intake-run-worker.mjs' );
const WIDTHS = [ 375, 768, 1440 ];
export const USAGE = [
	'usage: node scripts/computed-route/intake.mjs <client> [--record] [--widths 375,768,1440] [--surfaces a,b] [--repo <path>]',
	'       node scripts/computed-route/intake.mjs --apply-review <client> [--repo <path>]',
].join( '\n' );

// argv (after the script) to { mode: 'run'|'apply', client, record, widths, surfaces, repo } or { error }.
export function parseArgs( argv ) {
	const o = { mode: 'run', client: null, record: false, widths: WIDTHS, surfaces: null, repo: REPO };
	for ( let i = 0; i < argv.length; i++ ) {
		const a = argv[ i ];
		const value = () => ( i + 1 < argv.length && ! argv[ i + 1 ].startsWith( '--' ) ? argv[ ++i ] : null );
		if ( '--record' === a ) {
			o.record = true;
		} else if ( '--apply-review' === a ) {
			o.mode = 'apply';
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
	if ( 'apply' === o.mode && ( o.record || o.surfaces ) ) {
		return { error: '--apply-review takes only the client (and --repo)' };
	}
	return o;
}

// Where a client's intake reads and writes.
export function pathsFor( repo, client ) {
	const build = path.join( repo, 'sites', client, 'build' );
	const dir = path.join( build, 'intake' );
	return { folder: path.join( repo, 'sites', client, 'handoff' ), dir, intake: path.join( dir, 'intake.json' ), prev: path.join( dir, 'intake.prev.json' ), review: path.join( dir, 'review.md' ), pageMap: path.join( build, 'page-map.json' ), replay: ( hash ) => path.join( dir, 'replay', `${ hash }.har` ) };
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

// Blocked requests from every sandbox, one row per URL, reason and draft ID.
const blockedHosts = ( lists ) => {
	const seen = new Map();
	for ( const b of lists.flat() ) {
		const row = { url: b.url, host: b.host || '(no host)', reason: b.reason, draftId: b.draftId ?? null };
		seen.set( [ row.url, row.reason, row.draftId ].join( '\u0000' ), row );
	}
	return [ ...seen.values() ].sort( ( a, b ) => ( a.host + a.url < b.host + b.url ? -1 : 1 ) );
};

// The intake record from the worker's result (Appendix C "Intake record"), review rows unmarked until carryOver.
export function buildRecord( { client, takenOn, manifest, result } ) {
	const p = result.parts;
	const gaps = [ ...result.gaps ];
	gaps.push( { construct: 'inventory', draftId: 'animations.json', error: 'the re-derived animation inventory (FR-48-25) is not built: inventory.animations is empty and Claude Design\'s animations.json is not used as a source', stage: 'inventory' } );
	const attempts = ( p.replay?.proxyAttempts ?? 0 ) + ( p.skeletons?.proxyAttempts ?? 0 );
	if ( attempts ) {
		gaps.push( { construct: 'sandbox', draftId: client, error: `the trap proxy saw ${ attempts } connection attempt(s): something tried the live network`, stage: 'replay' } );
	}
	const r = p.routing?.routing;
	const record = {
		schemaVersion: '1', client, takenOn,
		manifest: { schema_version: manifest.schemaVersion, files: Object.fromEntries( manifest.files.map( ( f ) => [ f.path, f.sha256 ] ) ) },
		tools: result.tools, harness: result.harness,
		census: p.census?.census?.rows ?? [],
		inventory: { animations: null, surfaces: p.skeletons?.surfaces ?? null, diff: [] },
		routing: r ? { adapter: r.adapter, routes: r.routes, links: r.links } : { adapter: null, routes: [], links: [] },
		breakpoints: p.breakpoints?.breakpoints ?? [],
		pageMap: p[ 'page map' ]?.pageMap ?? [],
		palette: p[ 'tokens and palette' ]?.palette ?? { tokens: [], rows: [], unused: [], oneOff: [] },
		siteInfo: p[ 'site info' ]?.siteInfo ?? { rows: [], refused: [] },
		flags: p.flags?.flags ?? [],
		draftDefects: p[ 'draft defects' ]?.draftDefects ?? [],
		missingFeatures: p[ 'missing features' ]?.missingFeatures ?? [],
		skeletons: p.skeletons?.skeletons ?? {},
		notices: { prose: p.notices?.prose ?? [], blockedHosts: blockedHosts( [ p.replay?.blocked ?? [], p.skeletons?.blocked ?? [] ] ) },
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
	const work = fs.mkdtempSync( path.join( os.tmpdir(), 'sgs-intake-' ) );
	const job = { repo: o.repo, client: o.client, folder: at.folder, entry: m.entry_drafts?.[ 0 ], harPath, record: o.record, widths: o.widths, surfaces: o.surfaces, runtimeSha: m.runtime_sha256 ?? 'none', progressFile: path.join( work, 'progress.log' ), outFile: path.join( work, 'result.json' ) };
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
	const { record, attempts } = buildRecord( { client: o.client, takenOn: new Date().toISOString(), manifest, result } );
	let previous = null;
	if ( fs.existsSync( at.intake ) ) {
		try {
			previous = readJson( at.intake );
		} catch ( e ) {
			say( `the previous intake.json does not parse (${ e.message }); no marks are carried` );
		}
	}
	const carried = carryOver( previous, record );
	record.review = carried.review;
	const problems = recordProblems( record );
	if ( problems.length ) {
		say( `intake.json does NOT validate, nothing written:\n${ problems.map( ( p ) => `  - ${ p }` ).join( '\n' ) }` );
		return 1;
	}
	fs.mkdirSync( at.dir, { recursive: true } );
	previous && fs.copyFileSync( at.intake, at.prev );
	fs.writeFileSync( at.intake, `${ JSON.stringify( record, null, 1 ) }\n` );
	fs.writeFileSync( at.review, renderReview( record ) );
	fs.writeFileSync( at.pageMap, `${ JSON.stringify( record.pageMap, null, 2 ) }\n` );
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

// --apply-review. Returns the exit code.
export function applyIntakeReview( o, { log = ( l ) => process.stderr.write( `${ l }\n` ), today = isoDay() } = {} ) {
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
	if ( problems.length ) {
		say( `the marked record does not validate, nothing written:\n${ problems.map( ( p ) => `  - ${ p }` ).join( '\n' ) }` );
		return 1;
	}
	fs.writeFileSync( at.intake, `${ JSON.stringify( res.intake, null, 1 ) }\n` );
	fs.writeFileSync( at.pageMap, `${ JSON.stringify( pageMap, null, 2 ) }\n` );
	const dropped = res.intake.pageMap.length - pageMap.length;
	say( `${ o.client }: ${ res.intake.review.length } rows marked (dated ${ today }); page-map.json confirmed with ${ pageMap.length } rows${ dropped ? ` (${ dropped } dropped)` : '' }` );
	return 0;
}
