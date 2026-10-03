#!/usr/bin/env node
// Solve (FR-47-3): compare a built surface with its draft, turn each open style or hover difference into a setting
// write through the resolver, rebuild, and repeat (at most three write rounds), then classify what survives.
//   node scripts/computed-route/solve.mjs --client eye-care-ward-end --surface footer [--out <dir>] [--rounds 3]
// Reads only sites/<client>/build/surfaces.json for the surface. Writes the updated tree back to the surface's tree
// file, and solve-report.md / solve-report.json (plus every round's walker report) to --out.
import fs from 'fs';
import path from 'path';
import { spawnSync } from 'child_process';
import { fileURLToPath } from 'url';
import { openDb } from './lib/db.mjs';
import { loadSnapshot } from './lib/normalise.mjs';
import { resolve } from './lib/resolve.mjs';
import { readTree, writeTree, addRefs, nodeByRef, setAttr, assertWritable, assertQuiet, refAncestors } from './lib/tree.mjs';
import { writableGroups, draftValues, classify, openRows, rowDistance, intendedCount, regressedRows, groupKey, settingState } from './lib/solve-rows.mjs';
import { writeSolveReport } from './lib/solve-report.mjs';

const HERE = path.dirname( fileURLToPath( import.meta.url ) );
const REPO = path.resolve( HERE, '../..' );
const WIDTHS = '375,768,1440,1920';
// Computed values that are used sizes, never declared ones (getComputedStyle resolves auto to pixels).
export const USED_VALUES = [ 'width' ];

// The calibration file for a block, or null (the resolver then returns `uncalibrated`).
export function calibrationFor( block ) {
	const f = path.join( HERE, 'cache', `${ block.replace( /^sgs\//, '' ) }.json` );
	return fs.existsSync( f ) ? JSON.parse( fs.readFileSync( f, 'utf8' ) ) : null;
}

function targetArgs( t ) {
	if ( t.postId ) {
		return [ '--post-id', String( t.postId ) ];
	}
	return t.templatePart ? [ '--template-part', t.templatePart ] : [ '--template', t.template ];
}

function build( s, treeFile ) {
	for ( const dry of [ true, false ] ) {
		const r = spawnSync( 'node', [ 'scripts/wp-build-page.js', '--env-file', s.envFile, '--env-key', s.envKey, '--tree', treeFile, ...targetArgs( s.target ), ...( dry ? [ '--dry-run' ] : [] ) ], { cwd: REPO, encoding: 'utf8', timeout: 600000 } );
		if ( 0 !== r.status ) {
			return { ok: false, err: ( r.stderr || '' ) + ( r.stdout || '' ) };
		}
	}
	return { ok: true };
}

// walkStates: the walker states to run (passed as --states); null runs every state the config has.
function walk( walker, outDir, walkStates = null ) {
	spawnSync( 'node', [ 'scripts/parity/draft-live-walk.mjs', walker, '--headless', '--widths', WIDTHS, '--no-review', '--out', outDir, ...( walkStates?.length ? [ '--states', walkStates.join( ',' ) ] : [] ) ], { cwd: REPO, encoding: 'utf8', timeout: 1800000, stdio: 'inherit' } );
	const f = path.join( outDir, 'report.json' );
	if ( ! fs.existsSync( f ) ) {
		throw new Error( `the walker wrote no report in ${ outDir }` );
	}
	return JSON.parse( fs.readFileSync( f, 'utf8' ) );
}

// One write round: resolves every writable group of the report against the tree. stateMap is the surface's walker
// state to setting state map; rows from an unmapped state are never written. Returns the writes and gaps.
export function writeRound( report, tree, { db, snapshot, round, log, blocked = new Map(), stateMap, calFor = calibrationFor } ) {
	const { groups } = writableGroups( report, stateMap );
	const writes = [];
	const gaps = {};
	for ( const g of groups ) {
		if ( blocked.has( g.key ) ) {
			gaps[ g.key ] = blocked.get( g.key );
			continue;
		}
		// A computed width is the used size (an auto or grid-sized box reads as pixels): writing it would freeze a fluid
		// layout. Width rows are reported; widths change only through the settings that size the box.
		if ( USED_VALUES.includes( g.prop ) ) {
			gaps[ g.key ] = { gap: 'used-value', detail: `${ g.prop } is the box's used size, not a declared value` };
			continue;
		}
		const node = nodeByRef( tree, g.ref );
		if ( ! node ) {
			gaps[ g.key ] = { gap: 'unmapped', detail: `ref ${ g.ref } is not in the tree` };
			continue;
		}
		const cal = calFor( node.name );
		if ( cal && ! ( g.path in ( cal.elements || {} ) ) && ! Object.values( cal.settings || {} ).some( ( s ) => ( s.slots || [ s.slot ] ).includes( g.path ) ) ) {
			gaps[ g.key ] = { gap: 'unmapped-element', detail: `${ node.name } path "${ g.path }" is not a calibrated element` };
			continue;
		}
		const { perWidth, fontPx } = draftValues( report, g.pair, g.prop, 'hover' === g.state, g.walkerStates );
		// The element's other draft properties, for a setting calibration found (a layout mode decided by several properties).
		const siblings = Object.fromEntries( groups.filter( ( o ) => o.ref === g.ref && o.path === g.path && ! o.state && o.prop !== g.prop ).map( ( o ) => [ o.prop, draftValues( report, o.pair, o.prop, false, o.walkerStates ).perWidth ] ) );
		const r = resolve( { block: node.name, slot: g.path, prop: g.prop, state: g.state, perWidth, fontPx, current: node.attributes || {}, siblings }, { db, snapshot, calibration: cal, log } );
		if ( r.gap ) {
			gaps[ g.key ] = r;
			continue;
		}
		for ( const w of r.writes ) {
			const same = JSON.stringify( setAttr( structuredClone( node ), w ).after ) === JSON.stringify( node.attributes?.[ w.attr ] );
			if ( same ) {
				continue;
			}
			const { before, after } = setAttr( node, w );
			writes.push( { round, group: g.key, ref: g.ref, block: node.name, path: g.path, prop: g.prop, state: g.state, attr: w.attr, before, after, rows: g.rows.map( ( x ) => ( { width: x.width, draft: x.draft, live: x.live } ) ) } );
		}
	}
	return { writes, gaps };
}

// The regression guard (R-47-9). A row the last round made worse is pinned on a write to its own node: one whose
// calibrated side effects include that element and property, or that wrote the property itself. With no such write,
// every last-round write on that node is suspect. Rows are taken top-down: a row below a node that already has a
// pinned write follows from it and pins nothing more.
// Pinned writes are reverted and blocked; `blocked` maps their groups to a breaks-layout gap. Returns the reverted writes.
export function revertRegressions( prev, report, tree, lastWrites, blocked, calFor = calibrationFor ) {
	const anc = refAncestors( tree );
	// Top-down, and on each node style rows before box rows: a box size is a consequence, never first evidence.
	const rank = ( r ) => ( anc.get( r.ref )?.length ?? 0 ) * 2 + ( 'box' === r.kind ? 1 : 0 );
	const bad = regressedRows( prev, report ).sort( ( a, b ) => rank( a ) - rank( b ) );
	const culprits = new Set();
	const pinnedRefs = new Set();
	const unexplained = [];
	for ( const r of bad ) {
		if ( pinnedRefs.has( r.ref ) || ( anc.get( r.ref ) || [] ).some( ( a ) => pinnedRefs.has( a ) ) ) {
			continue;
		}
		const own = lastWrites.filter( ( w ) => w.ref === r.ref );
		if ( ! own.length ) {
			continue;
		}
		const pinned = own.filter( ( w ) => w.prop === r.key || ( calFor( w.block )?.settings?.[ w.attr ]?.effects || [] ).includes( `${ r.path }|${ r.key }` ) );
		( pinned.length ? pinned : own ).forEach( ( w ) => culprits.add( w ) );
		pinnedRefs.add( r.ref );
		if ( ! pinned.length ) {
			unexplained.push( r );
		}
	}
	const list = lastWrites.filter( ( w ) => culprits.has( w ) );
	for ( const w of [ ...list ].reverse() ) {
		const node = nodeByRef( tree, w.ref );
		if ( null === w.before ) {
			delete node.attributes[ w.attr ];
		} else {
			node.attributes[ w.attr ] = w.before;
		}
		w.reverted = true;
		const hit = bad.filter( ( r ) => r.ref === w.ref );
		w.revertReason = `${ hit.length } rows on its node regressed, e.g. ${ hit.slice( 0, 3 ).map( ( r ) => `${ r.key }@${ r.width } ${ r.draft }→${ r.live }` ).join( '; ' ) }${ unexplained.some( ( r ) => r.ref === w.ref ) ? ' (no side effect matched: every write on the node reverted)' : '' }`;
		blocked.set( w.group, { gap: 'breaks-layout', detail: `${ w.block } ${ w.attr } holds the draft value but writing it breaks the layout: ${ w.revertReason }` } );
	}
	return list;
}

// Wrong writes (§3.3): a write a later round reverted, or after which its rows read further from the draft.
export function wrongWrites( writes, reportAfter, stateMap ) {
	const rowsAfter = openRows( reportAfter );
	return writes.filter( ( w ) => {
		if ( w.reverted ) {
			return true;
		}
		const reverted = writes.some( ( x ) => x.round > w.round && x.ref === w.ref && x.attr === w.attr && JSON.stringify( x.after ) === JSON.stringify( w.before ) );
		const worse = w.rows.some( ( r0 ) => {
			const r1 = rowsAfter.find( ( r ) => undefined !== settingState( r, stateMap ) && groupKey( r, settingState( r, stateMap ) ) === w.group && r.width === r0.width );
			return r1 && rowDistance( r1 ) > rowDistance( { draft: r0.draft, live: r0.live } );
		} );
		return reverted || worse;
	} );
}

if ( process.argv[ 1 ] && path.resolve( process.argv[ 1 ] ) === fileURLToPath( import.meta.url ) ) {
	const argv = process.argv.slice( 2 );
	const flag = ( n ) => {
		const i = argv.indexOf( n );
		return -1 === i ? null : argv[ i + 1 ];
	};
	const client = flag( '--client' );
	const surface = flag( '--surface' );
	const maxRounds = Number( flag( '--rounds' ) || 3 );
	const buildDir = path.join( REPO, 'sites', client, 'build' );
	const surfaces = JSON.parse( fs.readFileSync( path.join( buildDir, 'surfaces.json' ), 'utf8' ) );
	const s = surfaces[ surface ];
	if ( ! s ) {
		console.error( `no surface "${ surface }" in surfaces.json` );
		process.exit( 2 );
	}
	// Every surface names which walker states hold which setting state; without it every row would read as rest.
	if ( ! s.states || 'object' !== typeof s.states ) {
		console.error( `surface "${ surface }" has no "states" map in surfaces.json` );
		process.exit( 2 );
	}
	const treeFile = path.join( buildDir, s.tree );
	const walker = path.join( buildDir, s.walker );
	if ( ! /refPrefix\s*:/.test( fs.readFileSync( walker, 'utf8' ) ) ) {
		console.error( `${ s.walker } has no refPrefix: rows would carry no ref` );
		process.exit( 2 );
	}
	const outDir = path.resolve( flag( '--out' ) || path.join( buildDir, 'qa', 'solve', surface, new Date().toISOString().replace( /[:.]/g, '-' ).slice( 0, 19 ) ) );
	fs.mkdirSync( outDir, { recursive: true } );
	const calibrationTargets = JSON.parse( fs.readFileSync( path.join( HERE, 'calibration-targets.json' ), 'utf8' ) );
	assertWritable( s.target, { calibrationTargets, surfaces } );
	const ctx = { db: openDb(), snapshot: loadSnapshot( path.join( REPO, 'sites', client, 'theme-snapshot.json' ) ), log: [] };
	const tree = readTree( treeFile );
	const added = addRefs( tree, surface );
	writeTree( treeFile, tree );
	const allWrites = [];
	let gaps = {};
	let report;
	let rounds = 0;
	let lastWrote = false;
	let prev = null;
	let lastWrites = [];
	const blocked = new Map();
	// R-47-9: at most maxRounds write rounds. A round that only reverts regressions is not a write round, so the cap on
	// walks is the write rounds, one revert per write round, and the final walk.
	let writeRounds = 0;
	for ( let round = 1; round <= maxRounds * 2 + 1; round++ ) {
		assertQuiet();
		const b = build( s, treeFile );
		if ( ! b.ok ) {
			console.error( `[FAIL] build in round ${ round }: ${ b.err.slice( -800 ) }` );
			break;
		}
		report = walk( walker, path.join( outDir, `round-${ round }` ), s.walkStates );
		// A round that made rows worse reverts the culprit writes first; the next round measures the revert.
		const reverted = prev ? revertRegressions( prev, report, tree, lastWrites, blocked ) : [];
		prev = report;
		if ( reverted.length ) {
			reverted.forEach( ( w ) => gaps[ w.group ] = blocked.get( w.group ) );
			console.log( `round ${ round }: reverted ${ reverted.length } writes that broke the layout` );
			writeTree( treeFile, tree );
			lastWrites = [];
			continue;
		}
		if ( writeRounds >= maxRounds ) {
			break;
		}
		const r = writeRound( report, tree, { ...ctx, round, blocked, stateMap: s.states } );
		gaps = { ...gaps, ...r.gaps };
		writeRounds++;
		rounds = writeRounds;
		lastWrote = r.writes.length > 0;
		console.log( `round ${ round } (write round ${ writeRounds }): ${ r.writes.length } writes, ${ Object.keys( r.gaps ).length } gaps` );
		if ( ! r.writes.length ) {
			break;
		}
		allWrites.push( ...r.writes );
		lastWrites = r.writes;
		writeTree( treeFile, tree );
	}
	const before = JSON.parse( fs.readFileSync( path.join( outDir, 'round-1', 'report.json' ), 'utf8' ) );
	const classes = classify( report, { writes: allWrites, gaps, stateMap: s.states } );
	const wrong = wrongWrites( allWrites, report, s.states );
	const unmappedState = writableGroups( report, s.states ).unmappedState.length;
	writeSolveReport( outDir, { surface, refsAdded: added, rounds, roundThreeWrote: rounds >= 3 && lastWrote, writes: allWrites, wrong, gaps, classes, snaps: ctx.log, intended: intendedCount( report ), unmappedState, before, after: report } );
	console.log( `solve ${ surface }: ${ allWrites.length } writes over ${ rounds } round(s); hardcode ${ classes.hardcode.length }, missing ${ classes.missing.length }, unresolved ${ classes.unresolved.length }, derived ${ classes.derived.length }, unmapped-state ${ unmappedState }; wrong writes ${ wrong.length }. Report: ${ path.join( outDir, 'solve-report.md' ) }` );
}
