// The browser-side stages of the intake command (Spec 48 FR-48-17, §9), run inside the secret-free worker
// (lib/intake-run-worker.mjs). Each stage is a function of the job and the results so far; a stage that throws becomes
// a gap row (R-48-3) and the run goes on. The draft-defect (lib/intake-run-defects.mjs, two passes, one review row
// per group) and missing-feature modules are imported inside their stages, so a module that does not load is that stage's gap row, not a failed run. Nothing here writes outside the
// replay file and the caller's result file.
import { openSandbox, classifyUrl } from './intake-sandbox.mjs';
import { recordExport, recordReplay } from './intake-record.mjs';
import { runCensus } from './intake-census.mjs';
import { readRouting } from './intake-routing.mjs';
import { readBreakpoints } from './intake-breakpoints.mjs';
import { proposePageMap } from './intake-pagemap.mjs';
import { readTokens } from './tokens.mjs';
import { proposePalette, loadPaletteSlugs } from './intake-palette.mjs';
import { readSurface } from './intake-reading.mjs';
import { mapPool, poolSize } from './intake-pool.mjs';
import { proposeSiteInfo } from './intake-siteinfo.mjs';
import { proposeFlags } from './intake-flags.mjs';
import { surfaceRoots, proposeSkeletons } from './intake-skeletons.mjs';
import { commandLikeLines } from './intake-prose.mjs';
import fs from 'fs';
import path from 'path';
import { loadFacts, decisionsProblems, REPO as CODE_REPO } from './skeleton-facts.mjs';
import { readDecisions, skeletonDir } from './skeleton-finalise.mjs';
import { openDb } from './db.mjs';
import { collapseSkeletons, collapseFlags, collapseMissing, paletteUsage, slimCensus } from './intake-run-collapse.mjs';

const gap = ( construct, draftId, error ) => ( { construct, draftId: String( draftId ?? '' ), error: String( error ?? '' ) } );

// The framework facts (block.json files and the framework DB, read-only) always come from the code repository; only
// the client's own data (its saved skeleton decisions, its Site Info placeholder map) comes from the job's repository.
// Returns { db, facts } or { db, error }; the caller closes db.
function frameworkFacts( job ) {
	const db = openDb();
	try {
		const file = path.join( skeletonDir( job.repo, job.client ), 'decisions.json' );
		const siteName = fs.existsSync( file ) ? readDecisions( file ).siteName || null : null;
		const facts = loadFacts( { db, client: job.client, repo: CODE_REPO, siteName } );
		const bad = decisionsProblems( facts );
		return bad.length ? { db, error: `the decisions data is not sound: ${ bad.join( '; ' ) }` } : { db, facts };
	} catch ( e ) {
		return { db, error: `the framework facts could not be loaded: ${ e.message }` };
	}
}

// Every route as a visit: { key, file, hash } plus the three spellings the libraries take (census `file#hash`,
// sandbox `file?#hash`). A hash route opens with the href the draft's own links use for it (`#/about`), else `#/<key>`;
// a page-file route opens its file; a state-page draft has only its entry, which is a gap row.
export function routeVisits( routing, entry ) {
	const gaps = [];
	let list;
	if ( ! routing || routing.error ) {
		list = [ { key: 'entry', file: entry, hash: '' } ];
		gaps.push( gap( 'visits', entry, `no routes (${ routing?.error ?? 'routing not read' }): only the entry draft at its default route is visited` ) );
	} else if ( 'hash' === routing.adapter ) {
		list = routing.routes.map( ( r ) => {
			const href = routing.links.find( ( l ) => l.route === r.key && /^#/.test( l.href || '' ) )?.href;
			return { key: r.key, file: entry, hash: ( href || `#/${ r.key }` ).replace( /^#/, '' ) };
		} );
	} else if ( 'files' === routing.adapter ) {
		list = routing.routes.map( ( r ) => ( { key: r.key, file: r.key, hash: '' } ) );
	} else {
		list = [ { key: routing.routes[ 0 ]?.key ?? 'entry', file: entry, hash: '' } ];
		gaps.push( gap( 'visits', entry, `the ${ routing.adapter } adapter reaches routes by state, which a URL cannot open: only the entry route is visited by the census, readings and defects` ) );
	}
	return {
		list,
		census: list.map( ( v ) => ( v.hash ? `${ v.file }#${ v.hash }` : v.file ) ),
		sandbox: list.map( ( v ) => ( v.hash ? `${ v.file }?#${ v.hash }` : v.file ) ),
		gaps,
	};
}

// The stages in FR-48-17's order. Each takes ( job, ctx ) and returns its part of the record; ctx carries the parts
// already made, `gaps` (every gap row, each with its stage) and `blocked` (every sandbox's aborted requests so far, which
// the worker gathers from each stage's `blocked`).
export const STAGES = [
	[ 'routing', ( job ) => {
		const r = readRouting( { folder: job.folder } );
		return { routing: r, note: `${ r.adapter }, ${ r.routes.length } routes, ${ r.links.length } links`, gaps: r.gaps };
	} ],
	[ 'replay', async ( job, ctx ) => {
		const visits = routeVisits( ctx.routing, job.entry );
		ctx.visits = visits;
		const out = { gaps: [ ...visits.gaps ] };
		if ( job.record ) {
			const rec = await recordExport( { folder: job.folder, index: job.entry, harPath: job.harPath, widths: job.widths, visits: visits.sandbox } );
			out.recorded = { urls: rec.urls.length, rounds: rec.rounds };
			out.blocked = rec.blocked;
		}
		const sb = await openSandbox( { folder: job.folder, index: job.entry, harPath: job.harPath, mode: 'replay', widths: job.widths } );
		try {
			out.browser = `chromium ${ sb.browser.version() }`;
			const probe = await sb.newPage();
			ctx.userAgent = await probe.evaluate( () => navigator.userAgent );
			await probe.close();
			for ( const width of job.widths ) {
				for ( const v of visits.sandbox ) {
					try {
						await ( await sb.visit( v, { width } ) ).close();
					} catch ( e ) {
						out.gaps.push( gap( 'replay-visit', v, `${ width }px: ${ e.message.split( '\n' )[ 0 ] }` ) );
					}
				}
			}
			out.blocked = [ ...( out.blocked || [] ), ...sb.blocked ];
			out.proxyAttempts = sb.proxyAttempts.length;
			out.requests = sb.requests.length;
		} finally {
			await sb.close();
		}
		const misses = out.blocked.filter( ( b ) => 'replay-miss' === b.reason ).length;
		out.note = `${ visits.list.length } routes x ${ job.widths.length } widths, ${ out.requests } requests, ${ misses } replay misses, ${ out.proxyAttempts } proxy attempts${ out.recorded ? `; recorded ${ out.recorded.urls } URLs in ${ out.recorded.rounds } round(s)` : '' }`;
		return out;
	} ],
	[ 'census', async ( job, ctx ) => {
		const c = await runCensus( { folder: job.folder, entry: job.entry, harPath: job.harPath, runtime: { visits: ctx.visits.census, widths: job.widths, harPath: job.harPath } } );
		ctx.censusFull = c;
		const unreached = c.rows.filter( ( r ) => true === r.unreached ).length;
		return {
			census: { rows: slimCensus( c.rows, c.problems ), pass: c.pass, problems: c.problems, counts: c.counts },
			blocked: [ ...( c.blocked ?? [] ), ...( c.runtime?.blocked ?? [] ) ],
			gaps: [ ...c.gaps, ...c.problems.map( ( p ) => gap( 'census', job.entry, p ) ) ],
			note: `${ c.rows.length } constructs, ${ c.pass ? 'pass' : `FAIL (${ c.problems.length } problems)` }, ${ unreached } unreached`,
		};
	} ],
	[ 'breakpoints', ( job ) => {
		const per = readBreakpoints( { folder: job.folder } );
		return { breakpoints: per.map( ( { gaps, ...b } ) => b ), gaps: per.flatMap( ( b ) => b.gaps ), note: per.map( ( b ) => `${ b.draft }: ${ b.basis ?? 'no basis' } ${ b.thresholds.map( ( t ) => t.value ).join( '/' ) }` ).join( '; ' ) };
	} ],
	[ 'page map', ( job, ctx ) => {
		const p = proposePageMap( { folder: job.folder, routing: ctx.routing, census: ctx.censusFull } );
		return { pageMap: p.rows, linkMap: p.linkMap, gaps: p.gaps, note: `${ p.rows.length } rows` };
	} ],
	[ 'tokens and palette', async ( job, ctx ) => {
		const t = readTokens( job.folder );
		const records = [];
		const gaps = [];
		const blocked = [];
		// One read per route, side by side in the pool (each its own sandbox and harness run), kept in route order.
		const reads = await mapPool( ctx.visits.list, poolSize(), async ( v ) => {
			try {
				return { read: await readSurface( { folder: job.folder, index: job.entry, harPath: job.harPath, file: v.file, hash: v.hash, width: 1440, mode: 'rest', surface: v.key } ) };
			} catch ( e ) {
				return { error: e };
			}
		} );
		reads.forEach( ( { read, error }, i ) => {
			const v = ctx.visits.list[ i ];
			if ( read ) {
				records.push( ...read.records );
				blocked.push( ...read.blocked );
			} else {
				gaps.push( gap( 'palette-usage', `${ v.file }${ v.hash ? `#${ v.hash }` : '' }`, `the 1440 rest reading failed: ${ error.message.split( '\n' )[ 0 ] }` ) );
			}
		} );
		const usage = paletteUsage( records );
		const p = proposePalette( { tokens: t.tokens, usage, slugs: loadPaletteSlugs(), problems: t.problems } );
		gaps.push( ...p.problems.map( ( x ) => gap( `palette:${ x.kind ?? 'token' }`, x.draftId ?? x.name ?? x.token ?? 'tokens', x.error ?? x.message ?? JSON.stringify( x ) ) ) );
		return {
			palette: { tokens: p.tokens, rows: p.rows, unused: p.unused, oneOff: p.oneOff, merges: p.merges, usageFrom: `computed colour properties of ${ records.length } rest-mode reading records, one 1440 read per route` },
			blocked, gaps, note: `${ t.tokens.length } tokens, ${ p.rows.length } roles, ${ p.unused.length } unused, ${ p.oneOff.length } one-off; usage from ${ records.length } records (${ usage.length } colour uses)`,
		};
	} ],
	[ 'site info', ( job, ctx ) => {
		const s = proposeSiteInfo( { folder: job.folder, routing: ctx.routing, census: ctx.censusFull } );
		ctx.siteInfoFull = s;
		return { siteInfo: { rows: s.rows, refused: s.refused }, gaps: s.gaps, note: `${ s.rows.length } rows, ${ s.refused.length } refused (sync-business-info.py print included)` };
	} ],
	[ 'flags', ( job, ctx ) => {
		const f = proposeFlags( { folder: job.folder, census: ctx.censusFull, siteInfo: ctx.siteInfoFull } );
		ctx.flagRows = f.rows;
		const c = collapseFlags( f.rows );
		return { flags: c.rows, collapse: { flags: [ c.before, c.after ] }, gaps: f.gaps, note: `${ c.before } flags, ${ c.after } after collapsing` };
	} ],
	[ 'draft defects', async ( job, ctx, log ) => {
		const { twoPassDefects, defectReviewRows } = await import( './intake-run-defects.mjs' );
		const c = ctx.censusFull;
		const d = await twoPassDefects( { folder: job.folder, entry: job.entry, harPath: job.harPath, census: { rows: c.rows, sources: c.sources }, visits: ctx.visits.census, widths: job.widths, flags: ctx.flagRows ?? null, log } );
		ctx.notDefects = d.notDefects;
		return {
			draftDefects: defectReviewRows( d ), notDefects: d.notDefects, passes: d.passes, gaps: d.gaps, blocked: d.blocked,
			note: `${ d.rows.length } defects in ${ d.groups.length } groups, ${ d.notDefects.length } not defects; pass A ${ ( d.passes.a.ms / 1000 ).toFixed( 1 ) }s, pass B ${ ( d.passes.b.ms / 1000 ).toFixed( 1 ) }s`,
		};
	} ],
	// FR-48-25 and FR-48-29: the inventory re-derived from the census, its timer and frame writers sampled per width, a
	// dead-code verdict of the draft defects marking its record, and Claude Design's copies diffed (lib/intake-inventory.mjs).
	[ 'inventory', async ( job, ctx ) => {
		const { inventoryStage } = await import( './intake-inventory.mjs' );
		return inventoryStage( job, ctx );
	} ],
	[ 'skeletons', async ( job, ctx, log ) => {
		const roots = surfaceRoots( { folder: job.folder, census: ctx.censusFull } );
		const want = job.surfaces;
		const surfaces = want ? roots.surfaces.filter( ( s ) => want.includes( s.slug ) || want.includes( s.id ) ) : roots.surfaces;
		const fw = frameworkFacts( job );
		let r;
		try {
			r = await proposeSkeletons( { folder: job.folder, harPath: job.harPath, surfaces, client: job.client, entry: job.entry, routing: ctx.routing, repo: job.repo, census: ctx.censusFull, db: fw.db, facts: fw.facts ?? null, log: ( l ) => log( `  ${ l }` ) } );
		} finally {
			fw.db.close();
		}
		const c = collapseSkeletons( r.skeletons );
		ctx.skeletonRows = Object.values( c.skeletons ).flatMap( ( s ) => s.rows );
		const opened = r.skeletons.filter( ( s ) => s.opened ).map( ( s ) => `${ s.surface } via ${ s.opened.via }` );
		return {
			skeletons: c.skeletons, surfaces: { surfaces: roots.surfaces.map( ( { states, ...s } ) => ( void states, s ) ), parts: roots.parts },
			runs: r.runs.map( ( x ) => ( { file: x.file, hash: x.hash, surfaces: x.surfaces, requests: x.requests, proxyAttempts: x.proxyAttempts.length, ms: x.ms } ) ),
			blocked: r.runs.flatMap( ( x ) => x.blocked ), proxyAttempts: r.runs.reduce( ( n, x ) => n + x.proxyAttempts.length, 0 ),
			collapse: { skeletons: [ c.before, c.after ], skeletonsWithinSurfaces: c.withinSurfaces }, gaps: [ ...roots.gaps, ...r.gaps ],
			note: `${ surfaces.length } surfaces, ${ r.gaps.length } gaps, ${ c.before } rows, ${ c.withinSurfaces } after collapsing within surfaces, ${ c.after } across surfaces; opened ${ opened.join( ', ' ) || 'none' }`,
		};
	} ],
	[ 'missing features', async ( job, ctx ) => {
		const { proposeMissingFeatures } = await import( './intake-missing.mjs' );
		const fw = frameworkFacts( job );
		const gaps = fw.error ? [ gap( 'missing-features', 'framework DB', `${ fw.error }; held features are not checked` ) ] : [];
		try {
			const m = proposeMissingFeatures( { skeletonRows: ctx.skeletonRows || [], census: { rows: ctx.censusFull.rows, sources: ctx.censusFull.sources }, facts: fw.facts ?? null } );
			const c = collapseMissing( m.rows );
			return { missingFeatures: c.rows, held: m.held.length, collapse: { missing: [ c.before, c.after ] }, gaps, note: `${ c.before } missing, ${ c.after } after collapsing, ${ m.held.length } held by SGS` };
		} finally {
			fw.db.close();
		}
	} ],
	// Recording only: the recording visits every route at rest, so an image a state-opened surface shows (a mega-menu
	// card, a drawer tile) is first asked for by the skeleton step and missed. Each such URL on a recordable host is
	// fetched by Node into the replay file (no draft code runs), so the next run replays it; this run lists the misses.
	[ 'replay top-up', async ( job, ctx ) => {
		if ( ! job.record ) {
			return { note: 'not recording' };
		}
		const urls = [ ...new Set( ( ctx.blocked || [] ).filter( ( b ) => 'replay-miss' === b.reason && 'recordable' === classifyUrl( b.url, { origin: 'http://127.0.0.1:1' } ) ).map( ( b ) => b.url.split( '#' )[ 0 ] ) ) ].sort();
		if ( ! urls.length ) {
			return { note: 'no replay miss on a recordable host' };
		}
		const r = await recordReplay( { urls, harPath: job.harPath, userAgent: ctx.userAgent, stockHosts: [] } );
		return { toppedUp: urls, note: `recorded ${ r.added.length } URL(s) that state-opened surfaces asked for; the next run replays them` };
	} ],
	[ 'notices', ( job ) => {
		const prose = commandLikeLines( { folder: job.folder } );
		return { prose, note: `${ prose.length } command-like prose lines (listed, never run)` };
	} ],
];

// What each stage must wait for before it starts when stages run side by side (lib/intake-run-worker.mjs): the
// earlier stages whose context fields it reads (routing: routing; visits and userAgent: replay; censusFull: census;
// siteInfoFull: site info; flagRows: flags; notDefects: draft defects; skeletonRows: skeletons), or '*' for every earlier
// stage applied (the replay top-up reads `blocked`, which the worker gathers as each stage is applied).
// tests/intake-run-schedule.test.mjs checks each stage's own reads (and the inventory stage's inventoryStage) against
// this list.
export const STAGE_NEEDS = Object.freeze( {
	routing: [],
	replay: [ 'routing' ],
	census: [ 'replay' ],
	breakpoints: [],
	'page map': [ 'routing', 'census' ],
	'tokens and palette': [ 'replay' ],
	'site info': [ 'routing', 'census' ],
	flags: [ 'census', 'site info' ],
	'draft defects': [ 'replay', 'census', 'flags' ],
	inventory: [ 'routing', 'census', 'draft defects' ],
	skeletons: [ 'routing', 'census' ],
	'missing features': [ 'census', 'skeletons' ],
	'replay top-up': [ '*' ],
	notices: [],
} );

// The stages that open a browser outside the browser-unit pool: run side by side, each holds one pool slot.
export const SLOT_STAGES = Object.freeze( [ 'replay', 'inventory', 'replay top-up' ] );
