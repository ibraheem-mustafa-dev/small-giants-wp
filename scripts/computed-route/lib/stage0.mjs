// Stage 0 (Spec 48 FR-48-3, FR-48-16): the fixed block set, which slot maps are current, the calibration-debt baseline.
// Pure functions and an orchestrator whose effects (handoff check, deploy hashes, calibration run, clock) are injected, so
// the tests run with no browser and no site.
import fs from 'fs';
import path from 'path';
import { createRequire } from 'module';
import { fileURLToPath } from 'url';
import { readSlotMap } from './cache.mjs';
import { loadAjv, schemaProblems } from './handoff.mjs';

const HERE = path.dirname( fileURLToPath( import.meta.url ) );
export const BASELINE_SCHEMA = path.join( HERE, '..', 'data', 'calibration-baseline.schema.json' );

// FR-48-3: the layout and content blocks every surface uses, always in the set.
export const FIXED_BLOCKS = [ 'sgs/container', 'sgs/heading', 'sgs/text', 'sgs/button', 'sgs/media', 'sgs/icon-list' ];

// The distinct surface kinds of a handoff surfaces.json, sorted.
export function surfaceKinds( surfaces ) {
	return [ ...new Set( ( surfaces?.records || [] ).map( ( r ) => r.kind ).filter( Boolean ) ) ].sort();
}

// The blocks a surface kind calls for. block_composition holds no kind column, so a kind maps to the framework blocks whose
// slug is the kind or ends in "-<kind>" (header -> site-header, drawer -> nav-drawer, menu -> nav-bar-menu and
// nav-drawer-menu, panel -> mega-panel). A kind that matches no block is returned in `unmapped`, never guessed.
// `rows` are block_composition rows ({ block_slug }).
export function blocksForKinds( kinds, rows ) {
	const slugs = rows.map( ( r ) => r.block_slug ).filter( ( s ) => /^sgs\//.test( s ) );
	const byKind = {};
	const unmapped = [];
	for ( const k of kinds ) {
		const hit = slugs.filter( ( s ) => s === `sgs/${ k }` || s.endsWith( `-${ k }` ) ).sort();
		hit.length ? ( byKind[ k ] = hit ) : unmapped.push( k );
	}
	return { byKind, unmapped };
}

// The fixed set: the layout and content blocks, then the blocks the kinds call for, without repeats.
export function blockSetFor( kinds, rows ) {
	const { byKind, unmapped } = blocksForKinds( kinds, rows );
	const derived = [ ...new Set( Object.values( byKind ).flat() ) ].filter( ( b ) => ! FIXED_BLOCKS.includes( b ) ).sort();
	return { blocks: [ ...FIXED_BLOCKS, ...derived ], byKind, unmapped };
}

// How a block's slot map stands against the deployed build.
//   current: the cached slotKey is the deployed hash.   stale: it differs.   missing: no slot map.
//   undeployed: the local build differs from the deployed one, so calibrate.mjs would refuse (deploy or rebuild first).
//   no-fixture: calibration-fixtures.json has no entry, so calibrate.mjs cannot measure it.   no-build: no build to hash.
export function blockState( { cacheDir, block, hashes, fixtures } ) {
	const out = { block };
	if ( ! hashes || ! hashes.deployed ) {
		return { ...out, state: 'no-build', why: hashes?.error || 'no build to hash' };
	}
	out.deployHash = hashes.deployed;
	const have = readSlotMap( cacheDir, block );
	out.cachedKey = have?.slotKey || null;
	if ( ! fixtures[ block ] ) {
		return { ...out, state: 'no-fixture', why: 'no entry in calibration-fixtures.json' };
	}
	if ( hashes.local && hashes.local !== hashes.deployed ) {
		return { ...out, state: 'undeployed', why: `deployed build ${ hashes.deployed } differs from the local build ${ hashes.local }` };
	}
	if ( ! have ) {
		return { ...out, state: 'missing', why: 'no slot map' };
	}
	const current = have.slotKey === hashes.deployed;
	return { ...out, state: current ? 'current' : 'stale', why: current ? '' : `slot map keyed ${ have.slotKey }` };
}

// Snapshot of every default-paint file under the cache (path -> size and mtime), to prove a run wrote none.
export function paintSnapshot( cacheDir ) {
	const out = {};
	if ( ! fs.existsSync( cacheDir ) ) {
		return out;
	}
	const go = ( dir ) => fs.readdirSync( dir, { withFileTypes: true } ).forEach( ( f ) => {
		const p = path.join( dir, f.name );
		if ( f.isDirectory() ) {
			go( p );
		} else if ( f.name.endsWith( '.paint.json' ) ) {
			const s = fs.statSync( p );
			out[ path.relative( cacheDir, p ).split( path.sep ).join( '/' ) ] = `${ s.size }:${ s.mtimeMs }`;
		}
	} );
	go( cacheDir );
	return out;
}

// Paint files added or changed between two snapshots.
export const paintChanges = ( before, after ) => Object.keys( after ).filter( ( k ) => before[ k ] !== after[ k ] ).sort();

const count = ( v ) => ( Array.isArray( v ) ? v.length : Number.isInteger( v ) ? v : 0 );

// The Appendix C baseline: per block the deploy hash and the slot map's debt counts.
export function buildBaseline( { client, site, takenOn, playwright, cacheDir, blocks, hashes } ) {
	const maps = blocks.map( ( b ) => readSlotMap( cacheDir, b ) );
	// The browser that measured the set; when the maps disagree the most recent measurement names it.
	const newest = maps.filter( ( m ) => m?.browserVersion ).sort( ( a, b ) => String( b.measured ).localeCompare( String( a.measured ) ) )[ 0 ];
	return {
		client,
		site,
		takenOn,
		playwright,
		browser: newest?.browserVersion ?? '',
		blockSet: blocks,
		blocks: Object.fromEntries( blocks.map( ( b, i ) => [ b, {
			deployHash: hashes[ b ],
			dead: count( maps[ i ]?.dead ),
			noMarker: count( maps[ i ]?.noMarker ),
			oneWidth: count( maps[ i ]?.oneWidth ),
			untestedStates: count( maps[ i ]?.untestedStates ),
		} ] ) ),
	};
}

// Readable problems with a baseline (empty when it validates against data/calibration-baseline.schema.json and names a browser).
export function baselineProblems( baseline, ajv = loadAjv() ) {
	const problems = schemaProblems( ajv, BASELINE_SCHEMA, baseline );
	return problems.length || baseline.browser ? problems : [ '/browser no slot map records a browser version' ];
}

// The arguments for calibrate.mjs: slot maps only (no default paint is measured in stage 0).
export function calibrateArgs( { site, client, blocks, recalibrate } ) {
	return [ '--site', site, '--client', client, '--blocks', blocks.join( ',' ), '--slot-map-only', ...( recalibrate ? [ '--recalibrate' ] : [] ) ];
}

export const installedPlaywright = () => createRequire( import.meta.url )( 'playwright/package.json' ).version;

// Runs stage 0. Effects come in through `deps`:
//   checkHandoff(folder, log) -> exit code; compositionRows() -> block_composition rows; fixtures; hashesOf(block) ->
//   { deployed, local } | { error }; runCalibrate(args) -> exit code; now() -> ISO time; playwright; writeBaseline(file, text).
// `o` is { repo, client, site, cacheDir, plan, recalibrate }. Returns { code, lines, baseline }; `plan` reads and prints only.
export async function runStage0( o, deps ) {
	const lines = [];
	const log = ( l ) => lines.push( l );
	const fail = () => ( { code: 1, lines, baseline: null } );
	const handoff = path.join( o.repo, 'sites', o.client, 'handoff' );
	const hc = await deps.checkHandoff( handoff, log );
	if ( hc ) {
		log( `stage 0 stops: the handoff check failed (exit ${ hc })` );
		return fail();
	}
	const kinds = surfaceKinds( JSON.parse( fs.readFileSync( path.join( handoff, 'surfaces.json' ), 'utf8' ) ) );
	const { blocks, byKind, unmapped } = blockSetFor( kinds, deps.compositionRows() );
	log( `surface kinds: ${ kinds.join( ', ' ) }` );
	Object.entries( byKind ).forEach( ( [ k, bs ] ) => log( `  ${ k } -> ${ bs.join( ', ' ) }` ) );
	unmapped.length && log( `  unmapped kinds (no block_composition block is named for them): ${ unmapped.join( ', ' ) }` );
	log( `block set (${ blocks.length }): ${ blocks.join( ', ' ) }` );

	const states = () => blocks.map( ( block ) => blockState( { cacheDir: o.cacheDir, block, hashes: deps.hashesOf( block ), fixtures: deps.fixtures } ) );
	const show = ( list ) => list.forEach( ( s ) => log( `  ${ s.block }: ${ s.state }${ s.why ? ` (${ s.why })` : '' }` ) );
	let list = states();
	show( list );
	const due = list.filter( ( s ) => [ 'stale', 'missing' ].includes( s.state ) || ( o.recalibrate && 'current' === s.state ) );
	const blocked = list.filter( ( s ) => [ 'undeployed', 'no-fixture', 'no-build' ].includes( s.state ) );
	log( `to recalibrate (slot map only): ${ due.length ? due.map( ( s ) => s.block ).join( ', ' ) : 'none' }` );
	if ( o.plan ) {
		log( 'plan only: nothing was run or written' );
		return { code: blocked.length ? 1 : 0, lines, baseline: null };
	}
	if ( due.length && ! blocked.length ) {
		const before = paintSnapshot( o.cacheDir );
		// Every block in `due` is stale, missing or asked for, so the run replaces its slot map whichever site measured it.
		const code = await deps.runCalibrate( calibrateArgs( { site: o.site, client: o.client, blocks: due.map( ( s ) => s.block ), recalibrate: true } ) );
		code && log( `calibrate.mjs exited ${ code }` );
		const wrote = paintChanges( before, paintSnapshot( o.cacheDir ) );
		wrote.length && log( `FAIL stage 0 wrote default paint files: ${ wrote.join( ', ' ) }` );
		list = states();
		show( list );
		if ( wrote.length ) {
			return fail();
		}
	}
	// A block counts as calibrated only when its slot map's key is the deployed hash now.
	const notCurrent = list.filter( ( s ) => 'current' !== s.state );
	if ( notCurrent.length ) {
		log( `not calibrated: ${ notCurrent.map( ( s ) => `${ s.block } (${ s.state })` ).join( ', ' ) }` );
		return fail();
	}
	const hashes = Object.fromEntries( list.map( ( s ) => [ s.block, s.deployHash ] ) );
	const baseline = buildBaseline( { client: o.client, site: o.site, takenOn: deps.now(), playwright: deps.playwright, cacheDir: o.cacheDir, blocks, hashes } );
	const problems = baselineProblems( baseline );
	if ( problems.length ) {
		problems.forEach( ( p ) => log( `FAIL baseline ${ p }` ) );
		log( 'the baseline was not written' );
		return fail();
	}
	const file = path.join( o.repo, 'sites', o.client, 'build', 'intake', 'calibration-baseline.json' );
	deps.writeBaseline( file, `${ JSON.stringify( baseline, null, 2 ) }\n` );
	log( `baseline written: ${ path.relative( o.repo, file ).split( path.sep ).join( '/' ) }` );
	return { code: 0, lines, baseline };
}
