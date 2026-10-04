#!/usr/bin/env node
// Solve (FR-47-3): compare a built surface with its draft, turn each open style or hover difference into a setting
// write through the resolver, rebuild, and repeat (at most three write rounds), then classify what survives.
//   node scripts/computed-route/solve.mjs --client eye-care-ward-end --surface footer [--out <dir>] [--rounds 3]
// Reads only sites/<client>/build/surfaces.json for the surface. Writes the updated tree back to the surface's tree
// file, and solve-report.md / solve-report.json (plus every round's walker report) to --out.
import fs from 'fs';
import path from 'path';
import { spawn, spawnSync } from 'child_process';
import { fileURLToPath } from 'url';
import { openDb } from './lib/db.mjs';
import { loadSnapshot } from './lib/normalise.mjs';
import { resolve } from './lib/resolve.mjs';
import { readTree, writeTree, addRefs, nodeByRef, setAttr, assertWritable, assertQuiet } from './lib/tree.mjs';
import { writableGroups, draftValues, classify, openRows, rowDistance, intendedCount, regressedRows, groupKey, settingState, cssProp } from './lib/solve-rows.mjs';
import { writeSolveReport } from './lib/solve-report.mjs';
import { guardRound, closeTrials } from './lib/guard.mjs';
import { detectReferences, referenceOf } from './lib/references.mjs';
import { entranceStart } from './lib/entrance.mjs';

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

// walkStates: the walker states to run (passed as --states); null runs every state the config has. Every round walks
// lean (only the styles, boxes, hover end states and structure Solve reads), so the first and last walks compare like
// for like, and the draft side is read once per run and reused (--draft-cache): the draft does not change mid-run.
// The widths walk in parallel, one walker each (4 at once against the shared host measured 2.6x faster than one walker
// with no bot check, 2026-10-04, with the host's IP allowlist on); each keeps its own draft cache, and the reports merge.
// SGS_HEADED=1 walks headed: Hostinger's edge answers a headless browser with a 403 browser check under load.
export const WALK_FLAGS = [ ...( process.env.SGS_HEADED ? [] : [ '--headless' ] ), '--no-review', '--lean' ];
export const WIDTH_GROUPS = WIDTHS.split( ',' ).map( ( w ) => [ Number( w ) ] );

// One report from the per-width walks: their runs in width order and their errors by width.
export function mergeReports( parts ) {
	return { ...parts[ 0 ], runs: parts.flatMap( ( r ) => r.runs || [] ), errors: Object.assign( {}, ...parts.map( ( r ) => r.errors || {} ) ) };
}

async function walk( walker, outDir, walkStates = null ) {
	const dirOf = ( ws ) => path.join( outDir, `w${ ws.join( '-' ) }` );
	const one = ( ws ) => new Promise( ( done ) => {
		const args = [ 'scripts/parity/draft-live-walk.mjs', walker, ...WALK_FLAGS, '--widths', ws.join( ',' ), '--out', dirOf( ws ), '--draft-cache', path.join( path.dirname( outDir ), `draft-cache-${ ws.join( '-' ) }.json` ), ...( walkStates?.length ? [ '--states', walkStates.join( ',' ) ] : [] ) ];
		spawn( 'node', args, { cwd: REPO, stdio: 'inherit', timeout: 1800000 } ).on( 'close', done );
	} );
	await Promise.all( WIDTH_GROUPS.map( one ) );
	const parts = WIDTH_GROUPS.map( ( ws ) => {
		const f = path.join( dirOf( ws ), 'report.json' );
		if ( ! fs.existsSync( f ) ) {
			throw new Error( `the walker wrote no report in ${ dirOf( ws ) }` );
		}
		return JSON.parse( fs.readFileSync( f, 'utf8' ) );
	} );
	const report = mergeReports( parts );
	fs.writeFileSync( path.join( outDir, 'report.json' ), JSON.stringify( report ) );
	return report;
}

// One write round: resolves every writable group of the report against the tree. stateMap is the surface's walker
// state to setting state map; rows from an unmapped state are never written. Returns the writes and gaps.
export function writeRound( report, tree, { db, snapshot, round, log, blocked = new Map(), stateMap, calFor = calibrationFor, refs = detectReferences() } ) {
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
		// A linked placeholder renders another post's block and ignores its own settings: the write belongs to that
		// post's surface (lib/references.mjs).
		const ref = referenceOf( node, refs );
		if ( ref && 'linked' === ref.kind ) {
			gaps[ g.key ] = { gap: 'linked', detail: `${ node.name } renders ${ ref.key } "${ ref.value }" from its own post: solve that post's surface` };
			continue;
		}
		const { perWidth, fontPx } = draftValues( report, g.pair, g.prop, 'hover' === g.state, g.walkerStates );
		// The element's other draft properties, for a setting calibration found (a layout mode decided by several properties).
		const siblings = Object.fromEntries( groups.filter( ( o ) => o.ref === g.ref && o.path === g.path && ! o.state && o.prop !== g.prop ).map( ( o ) => [ o.prop, draftValues( report, o.pair, o.prop, false, o.walkerStates ).perWidth ] ) );
		// Resolves the group on one block: its own (exact paths), or an enclosing one (anyIndex: paths without their
		// :nth-of-type steps, since calibration's fixture places the child elsewhere).
		const attempt = ( on, onPath, anyIndex, tag = null ) => {
			const cal = calFor( on.name );
			const loose = ( p ) => ( anyIndex ? String( p ).replace( /:nth-of-type\(\d+\)/g, '' ) : p );
			const known = [ ...Object.keys( cal?.elements || {} ), ...Object.values( cal?.settings || {} ).flatMap( ( s ) => [ ...( s.slots || [ s.slot ] ), ...( s.reaches || [] ) ] ) ];
			if ( cal && ! known.map( loose ).includes( loose( onPath ) ) ) {
				return { gap: 'unmapped-element', detail: `${ on.name } path "${ onPath }" is not a calibrated element` };
			}
			return ( on === node && entranceStart( g, node, perWidth ) ) || resolve( { block: on.name, slot: onPath, anyIndex, tag, prop: cssProp( g.prop ), state: g.state, perWidth, fontPx, current: on.attributes || {}, siblings }, { db, snapshot, calibration: cal, log } );
		};
		let r = attempt( node, g.path, false );
		let target = { node, ref: g.ref, path: g.path };
		// A row whose own block has no setting for it resolves on the nearest enclosing block with one (a form's field
		// style painting each field's control).
		for ( const o of [ 'no-setting', 'unmapped-element' ].includes( r.gap ) ? g.owners || [] : [] ) {
			const on = nodeByRef( tree, o.ref );
			if ( ! on || 'linked' === referenceOf( on, refs )?.kind ) {
				continue;
			}
			const r2 = attempt( on, o.path, true, o.tag || null );
			if ( ! r2.gap ) {
				r = r2;
				target = { node: on, ref: o.ref, path: o.path };
				break;
			}
		}
		if ( r.gap ) {
			gaps[ g.key ] = r;
			continue;
		}
		for ( const w of r.writes ) {
			const same = JSON.stringify( setAttr( structuredClone( target.node ), w ).after ) === JSON.stringify( target.node.attributes?.[ w.attr ] );
			if ( same ) {
				continue;
			}
			const { before, after } = setAttr( target.node, w );
			writes.push( { round, group: g.key, ref: target.ref, block: target.node.name, path: target.path, prop: g.prop, state: g.state, attr: w.attr, before, after, rows: g.rows.map( ( x ) => ( { width: x.width, draft: x.draft, live: x.live } ) ) } );
		}
	}
	return { writes, gaps };
}

// The regression guard (R-47-9) lives in lib/guard.mjs. This wrapper keeps the single-call form: the writes undone this
// round (a calibration-named culprit, or the one suspect under trial).
export function revertRegressions( prev, report, tree, lastWrites, blocked, calFor = calibrationFor, trials = new Map() ) {
	return guardRound( prev, report, tree, lastWrites, blocked, calFor, trials ).filter( ( w ) => w.reverted || w.trial );
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
	// walkerFull (scripts/computed-route/pairs.mjs): the hand config plus one pair per block, when the surface has one.
	const walker = path.join( buildDir, s.walkerFull || s.walker );
	if ( ! /refPrefix\s*:/.test( fs.readFileSync( walker, 'utf8' ) ) ) {
		console.error( `${ s.walkerFull || s.walker } has no refPrefix: rows would carry no ref` );
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
	const trials = new Map();
	// R-47-9: at most maxRounds write rounds. Guard rounds (revert a named culprit, try one suspect, restore an
	// innocent one) are not write rounds; the walk cap leaves room for a few per write round.
	let writeRounds = 0;
	for ( let round = 1; round <= maxRounds * 4 + 1; round++ ) {
		assertQuiet();
		const b = build( s, treeFile );
		if ( ! b.ok ) {
			console.error( `[FAIL] build in round ${ round }: ${ b.err.slice( -800 ) }` );
			break;
		}
		report = await walk( walker, path.join( outDir, `round-${ round }` ), s.walkStates );
		// A round that made rows worse runs the guard against the walk the writes were computed from (prev stays that
		// walk until the guard is done); the next round measures what it changed.
		const changed = prev ? guardRound( prev, report, tree, lastWrites, blocked, calibrationFor, trials ) : [];
		if ( changed.length ) {
			changed.filter( ( w ) => w.reverted ).forEach( ( w ) => gaps[ w.group ] = blocked.get( w.group ) );
			changed.filter( ( w ) => w.restored ).forEach( ( w ) => delete gaps[ w.group ] );
			console.log( `round ${ round }: guard reverted ${ changed.filter( ( w ) => w.reverted ).length }, trying ${ changed.filter( ( w ) => w.trial ).length }, restored ${ changed.filter( ( w ) => w.restored && ! w.trial ).length }` );
			writeTree( treeFile, tree );
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
		prev = report;
		writeTree( treeFile, tree );
	}
	closeTrials( trials, blocked ).forEach( ( w ) => gaps[ w.group ] = blocked.get( w.group ) );
	const before = JSON.parse( fs.readFileSync( path.join( outDir, 'round-1', 'report.json' ), 'utf8' ) );
	const classes = classify( report, { writes: allWrites, gaps, stateMap: s.states } );
	const wrong = wrongWrites( allWrites, report, s.states );
	const unmappedState = writableGroups( report, s.states ).unmappedState.length;
	writeSolveReport( outDir, { surface, refsAdded: added, rounds, roundThreeWrote: rounds >= 3 && lastWrote, writes: allWrites, wrong, gaps, classes, snaps: ctx.log, intended: intendedCount( report ), unmappedState, before, after: report } );
	console.log( `solve ${ surface }: ${ allWrites.length } writes over ${ rounds } round(s); hardcode ${ classes.hardcode.length }, missing ${ classes.missing.length }, unresolved ${ classes.unresolved.length }, derived ${ classes.derived.length }, unmapped-state ${ unmappedState }; wrong writes ${ wrong.length }. Report: ${ path.join( outDir, 'solve-report.md' ) }` );
}
