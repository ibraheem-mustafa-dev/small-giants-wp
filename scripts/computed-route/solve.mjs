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
import { resolve, resolveViaAncestor } from './lib/resolve.mjs';
import { readTree, writeTree, addRefs, nodeByRef, setAttr, assertWritable, assertQuiet } from './lib/tree.mjs';
import { writableGroups, draftValues, usedValueTarget, classify, openRows, rowDistance, intendedCount, regressedRows, groupKey, settingState, cssProp, knownPaths, resolveContent, handoverOf, HANDOVER_OWNERS } from './lib/solve-rows.mjs';
import { writeSolveReport } from './lib/solve-report.mjs';
import { guardRound, closeTrials } from './lib/guard.mjs';
import { detectReferences, referenceOf, BLOCKS_SRC } from './lib/references.mjs';
import { entranceStart, groupRects } from './lib/entrance.mjs';

const HERE = path.dirname( fileURLToPath( import.meta.url ) );
const REPO = path.resolve( HERE, '../..' );
const WIDTHS = '375,768,1440,1920';
// Computed values that are used sizes, never declared ones (getComputedStyle resolves auto to pixels).
// A positioned element's left/top computes to pixels too; only a declared length or percentage is written.
export const USED_VALUES = [ 'width', 'left', 'top' ];

// The calibration file for a block, or null (the resolver then returns `uncalibrated`).
export function calibrationFor( block ) {
	const f = path.join( HERE, 'cache', `${ block.replace( /^sgs\//, '' ) }.json` );
	return fs.existsSync( f ) ? withInnerRootAliases( JSON.parse( fs.readFileSync( f, 'utf8' ) ), block ) : null;
}

// A block that wraps its own root element only in some modes (icon-list adds a <div> or <nav> around its <ul> when it has
// a heading or a landmark; business-info wraps its value) is calibrated in one mode and measured on a page in another. A
// calibration that ran wrapped records the inner root as `.sgs-<slug>` directly under the wrapper and every path below it
// as `.sgs-<slug> > …`, while a page instance with no wrapper measures the same elements from that inner root. When the
// calibration holds the inner root as an element, every slot, reach and element path also answers to its form without
// the `.sgs-<slug>` step, so both page modes find the element calibration measured. A calibration without that element
// is returned unchanged.
export function withInnerRootAliases( cal, block ) {
	const root = `.sgs-${ block.replace( /^sgs\//, '' ) }`;
	if ( ! cal?.elements || ! Object.hasOwn( cal.elements, root ) ) {
		return cal;
	}
	const strip = ( p ) => {
		if ( p === root ) {
			return '';
		}
		if ( 'string' === typeof p && ( p.startsWith( `${ root } > ` ) || p.startsWith( `${ root }::` ) ) ) {
			return p.slice( root.length ).replace( /^ > /, '' );
		}
		return null;
	};
	const widen = ( list ) => [ ...new Set( [ ...list, ...list.map( strip ).filter( ( x ) => null !== x ) ] ) ];
	const settings = Object.fromEntries( Object.entries( cal.settings || {} ).map( ( [ name, s ] ) => [ name, ( s && 'object' === typeof s ) ? {
		...s,
		...( s.slots || undefined !== s.slot ? { slots: widen( s.slots || [ s.slot ] ) } : {} ),
		...( s.reaches ? { reaches: widen( s.reaches ) } : {} ),
	} : s ] ) );
	const elements = { ...cal.elements };
	for ( const [ p, v ] of Object.entries( cal.elements ) ) {
		const alias = strip( p );
		if ( null !== alias && ! Object.hasOwn( elements, alias ) ) {
			elements[ alias ] = v;
		}
	}
	return { ...cal, settings, elements };
}

// A block's render.php source, or null.
export function blockRenderSource( name ) {
	const f = path.join( BLOCKS_SRC, name.replace( /^sgs\//, '' ), 'render.php' );
	return fs.existsSync( f ) ? fs.readFileSync( f, 'utf8' ) : null;
}

// Who owns the content of a block whose words, elements or links come from outside the layout tree, or null: a block that
// prints another post (a reference block) holds a page's content (`content-page`); one whose render.php reads Site Info
// (`site-info`), WooCommerce's own strings or templates (`woocommerce-text`), or product data (`product-data`). Read from
// the block's source, so a block built later is covered without a list. This is evidence about the block, never a verdict
// on a row: writeRound hands a row over only when the block also holds no setting for it.
export function outsideOwner( node, { refs = {}, source = blockRenderSource } = {} ) {
	const ref = referenceOf( node, refs );
	if ( ref && [ 'core', 'frame' ].includes( ref.kind ) ) {
		return 'content-page';
	}
	const src = source( node.name );
	if ( ! src ) {
		return null;
	}
	if ( /Sgs_Site_Info|sgs_site_info/.test( src ) ) {
		return 'site-info';
	}
	if ( /['"]woocommerce['"]\s*\)|wc_get_template|woocommerce_/.test( src ) ) {
		return 'woocommerce-text';
	}
	return /wc_get_product|get_post_meta|WC_Product/.test( src ) ? 'product-data' : null;
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

// The leaves a write changes: [[dotted path, JSON value]] where after differs from before.
function leafChanges( before, after, at = '' ) {
	if ( after && 'object' === typeof after && ! Array.isArray( after ) ) {
		return Object.entries( after ).flatMap( ( [ k, v ] ) => leafChanges( before && 'object' === typeof before ? before[ k ] : undefined, v, at ? `${ at }.${ k }` : k ) );
	}
	return JSON.stringify( before ) === JSON.stringify( after ) ? [] : [ [ at, JSON.stringify( after ) ] ];
}

// One write round: resolves every writable group of the report against the tree. stateMap is the surface's walker
// state to setting state map; rows from an unmapped state are never written. Returns the writes and gaps.
// A border colour row on an element the draft gives no border on that side (0px wide, or style none, at every measured
// width): the draft's value is its text colour carried along by currentColor, so a written colour would paint nothing
// (D-65, D-66, D-88 to D-91). Returns a not-painted gap, or null when the draft paints that side somewhere.
export function unpaintedBorder( report, g ) {
	const m = /^border-(top|right|bottom|left)-color$/.exec( g.prop );
	if ( ! m ) {
		return null;
	}
	const widths = draftValues( report, g.pair, `border-${ m[ 1 ] }-width`, false, g.walkerStates, g.pseudo ).perWidth;
	const styles = draftValues( report, g.pair, `border-${ m[ 1 ] }-style`, false, g.walkerStates, g.pseudo ).perWidth;
	const measured = Object.keys( widths );
	if ( ! measured.length || measured.some( ( w ) => parseFloat( widths[ w ] ) > 0 && ! [ 'none', 'hidden' ].includes( styles[ w ] ) ) ) {
		return null;
	}
	return { gap: 'not-painted', detail: `the draft has no ${ m[ 1 ] } border (${ measured.map( ( w ) => `${ widths[ w ] } ${ styles[ w ] || '' }`.trim() + '@' + w ).join( ', ' ) }): its ${ g.prop } is currentColor and paints nothing` };
}

export function writeRound( report, tree, { db, snapshot, round, log, blocked = new Map(), stateMap, calFor = calibrationFor, refs = detectReferences(), canvas = false, ancestorHop = resolveViaAncestor, ownerOf = () => null } ) {
	const { groups, stateConflict, content } = writableGroups( report, stateMap );
	const writes = [];
	const gaps = {};
	for ( const c of stateConflict ) {
		gaps[ c.key ] = blocked.get( c.key ) || { gap: 'state-conflict', detail: c.conflict.detail };
	}
	const claimed = new Map();
	for ( const g of groups ) {
		if ( blocked.has( g.key ) ) {
			gaps[ g.key ] = blocked.get( g.key );
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
		const { perWidth, fontPx, declared, held } = draftValues( report, g.pair, g.prop, 'hover' === g.state, g.walkerStates, g.pseudo );
		const unpainted = unpaintedBorder( report, g );
		if ( unpainted ) {
			gaps[ g.key ] = unpainted;
			continue;
		}
		// A computed width is the used size (an auto or grid-sized box reads as pixels): writing it would freeze a fluid
		// layout. It is written only as the draft declares it (a plain length or percentage at every measured width a
		// ledger entry does not hold); otherwise widths change only through the settings that size the box.
		if ( USED_VALUES.includes( g.prop ) ) {
			const t = usedValueTarget( g.prop, { perWidth, declared, held } );
			if ( t.gap ) {
				gaps[ g.key ] = t;
				continue;
			}
			Object.assign( perWidth, t.perWidth );
		}
		// The element's other draft properties, for a setting calibration found (a layout mode decided by several properties).
		const siblings = Object.fromEntries( groups.filter( ( o ) => o.ref === g.ref && o.path === g.path && ! o.state && o.prop !== g.prop ).map( ( o ) => [ o.prop, draftValues( report, o.pair, o.prop, false, o.walkerStates, o.pseudo ).perWidth ] ) );
		// Resolves the group on one block: its own (exact paths), or an enclosing one (anyIndex: paths without their
		// :nth-of-type steps, since calibration's fixture places the child elsewhere).
		const attempt = ( on, onPath, anyIndex, tag = null ) => {
			const cal = calFor( on.name );
			const loose = ( p ) => ( anyIndex ? String( p ).replace( /:nth-of-type\(\d+\)/g, '' ) : p );
			if ( cal && ! knownPaths( cal ).map( loose ).includes( loose( onPath ) ) ) {
				return { gap: 'unmapped-element', detail: `${ on.name } path "${ onPath }" is not a calibrated element` };
			}
			return ( on === node && entranceStart( g, node, perWidth, groupRects( report, g ) ) ) || resolve( { block: on.name, slot: onPath, anyIndex, tag, prop: cssProp( g.prop ), state: g.state, perWidth, fontPx, current: on.attributes || {}, siblings }, { db, snapshot, calibration: cal, log } );
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
		// FR-47-8 / R-47-12, the ancestor hop, strictly last: only once the row's own block and its enclosing blocks have both
		// failed. It writes a parent setting only where that setting's paint reaches exactly one measured descendant
		// (lib/resolve.mjs::resolveViaAncestor); otherwise the gap stays, with the hop's citation added.
		if ( r.gap ) {
			const prop = cssProp( g.prop );
			const sameRow = ( o2 ) => cssProp( o2.prop ) === prop && o2.state === g.state;
			const ancestors = ( g.owners || [] ).map( ( o ) => {
				const n2 = nodeByRef( tree, o.ref );
				if ( ! n2 || 'linked' === referenceOf( n2, refs )?.kind ) {
					return null;
				}
				// The measured descendants of this ancestor: the owner path of every open row of the same property and state
				// that names it as an owner (measured, never guessed).
				const measured = [ ...new Set( groups.filter( sameRow ).flatMap( ( o2 ) => o2.rows.flatMap( ( x ) => ( x.owners || [] ).filter( ( oo ) => oo.ref === o.ref ).map( ( oo ) => oo.path ) ) ) ) ];
				return { ref: o.ref, block: n2.name, path: o.path, tag: o.tag || null, attributes: n2.attributes || {}, calibration: calFor( n2.name ), measured: measured.length ? measured : [ o.path ] };
			} ).filter( Boolean );
			const hop = ancestorHop( { block: node.name, slot: g.path, prop, state: g.state, perWidth, fontPx, current: node.attributes || {}, siblings },
				{ db, snapshot, log, canvas: !! canvas, ancestors, measuredSlots: ancestors.flatMap( ( a ) => a.measured ) } );
			const hopNode = hop?.writes ? nodeByRef( tree, hop.on.ref ) : null;
			if ( hopNode ) {
				r = { writes: hop.writes };
				target = { node: hopNode, ref: hop.on.ref, path: hop.on.path };
			} else if ( hop?.cite ) {
				r = { ...r, cite: hop.cite, canvasSettable: !! hop.gap };
			}
		}
		if ( r.gap ) {
			gaps[ g.key ] = r;
			continue;
		}
		// A group wanting a part of a setting (a side, a device) that another group already wrote this round with another
		// value is not written and is reported as a conflict: one shared setting cannot hold both elements' draft values.
		const clash = r.writes.map( ( w ) => [ w, leafChanges( target.node.attributes?.[ w.attr ], setAttr( structuredClone( target.node ), w ).after ) ] )
			.flatMap( ( [ w, leaves ] ) => leaves.filter( ( [ k, v ] ) => { const had = claimed.get( `${ target.ref }|${ w.attr }|${ k }` ); return undefined !== had && had !== v; } ).map( ( [ k ] ) => `${ w.attr }.${ k }` ) );
		if ( clash.length ) {
			gaps[ g.key ] = { gap: 'conflict', detail: `${ clash.join( ', ' ) } already written with another value this round (one setting, two elements' draft values)` };
			continue;
		}
		for ( const w of r.writes ) {
			const same = JSON.stringify( setAttr( structuredClone( target.node ), w ).after ) === JSON.stringify( target.node.attributes?.[ w.attr ] );
			if ( same ) {
				continue;
			}
			leafChanges( target.node.attributes?.[ w.attr ], setAttr( structuredClone( target.node ), w ).after ).forEach( ( [ k, v ] ) => claimed.set( `${ target.ref }|${ w.attr }|${ k }`, v ) );
			const { before, after } = setAttr( target.node, w );
			writes.push( { round, group: g.key, ref: target.ref, block: target.node.name, path: target.path, prop: g.prop, state: g.state, attr: w.attr, before, after, rows: g.rows.map( ( x ) => ( { width: x.width, draft: x.draft, live: x.live } ) ) } );
		}
	}
	// Content rows: the draft's words, an element's presence, a link. Each resolves through the block's calibrated `text`,
	// `presence` or `link` entry (lib/solve-rows.mjs::resolveContent); with none, the row is a gap, or a handover where
	// ownerOf( node ) names the outside-the-tree owner of the block's content. Never a style value (R-47-4).
	for ( const g of content ) {
		const node = nodeByRef( tree, g.ref );
		if ( blocked.has( g.key ) ) {
			gaps[ g.key ] = blocked.get( g.key );
			continue;
		}
		if ( ! node ) {
			gaps[ g.key ] = { gap: 'unmapped', detail: `ref ${ g.ref } is not in the tree` };
			continue;
		}
		const ref = referenceOf( node, refs );
		if ( ref && 'linked' === ref.kind ) {
			gaps[ g.key ] = { gap: 'linked', detail: `${ node.name } renders ${ ref.key } "${ ref.value }" from its own post: solve that post's surface` };
			continue;
		}
		const res = resolveContent( g, { calibration: calFor( node.name ), report } );
		if ( res.gap ) {
			const owner = 'no-setting' === res.gap ? ownerOf( node, g ) : null;
			gaps[ g.key ] = HANDOVER_OWNERS.includes( owner ) ? { gap: 'handover', owner, detail: `${ node.name } holds no setting for this ${ g.type }; its content is not in the tree` } : res;
			continue;
		}
		for ( const w of res.writes ) {
			if ( JSON.stringify( setAttr( structuredClone( node ), w ).after ) === JSON.stringify( node.attributes?.[ w.attr ] ) ) {
				continue;
			}
			const { before, after } = setAttr( node, w );
			writes.push( { round, group: g.key, ref: g.ref, block: node.name, path: g.path, prop: g.rows[ 0 ].key, kind: g.type, state: null, attr: w.attr, before, after, rows: g.rows.map( ( x ) => ( { width: x.width, draft: x.draft, live: x.live } ) ) } );
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

// Spec 47 §3.3's ratio: wrong settings (one attribute on one node, however many writes chained it) over every setting written.
export function settingRatio( wrong, writes ) {
	const key = ( w ) => `${ w.ref }|${ w.attr }`;
	return { wrong: new Set( wrong.map( key ) ).size, total: new Set( writes.map( key ) ).size };
}

// The build, walk and write rounds (R-47-9): at most maxRounds write rounds. Guard rounds (revert a named culprit, try
// one suspect, restore an innocent one) are not write rounds; the walk cap leaves room for a few per write round.
// maxRounds 0 is measure-only: one build and one walk, never a write. Every step is passed in: build() → { ok, err },
// walk( round ) → report, guard( prev, report, lastWrites ) → changed writes, write( report, round ) → { writes, gaps },
// save() persists the tree. pending() says a guard trial is still open when the walk cap is reached; settle( prev, report,
// lastWrites ) then judges it on one more walk, so no trial ends unconfirmed. Returns { report, writes, gaps, rounds, lastWrote }.
export async function solveLoop( { maxRounds, build, walk, guard, write, save, settle = null, pending = () => false, blocked = new Map(), log = console.log } ) {
	const allWrites = [];
	let gaps = {};
	let report;
	let rounds = 0;
	let lastWrote = false;
	let prev = null;
	let lastWrites = [];
	let writeRounds = 0;
	for ( let round = 1; round <= maxRounds * 4 + 1; round++ ) {
		const b = build( round );
		if ( ! b.ok ) {
			console.error( `[FAIL] build in round ${ round }: ${ b.err.slice( -800 ) }` );
			break;
		}
		report = await walk( round );
		// A round that made rows worse runs the guard against the walk the writes were computed from (prev stays that
		// walk until the guard is done); the next round measures what it changed.
		const changed = prev ? guard( prev, report, lastWrites ) : [];
		if ( changed.length ) {
			changed.filter( ( w ) => w.reverted ).forEach( ( w ) => gaps[ w.group ] = blocked.get( w.group ) );
			changed.filter( ( w ) => w.restored ).forEach( ( w ) => delete gaps[ w.group ] );
			log( `round ${ round }: guard reverted ${ changed.filter( ( w ) => w.reverted ).length }, trying ${ changed.filter( ( w ) => w.trial ).length }, restored ${ changed.filter( ( w ) => w.restored && ! w.trial ).length }` );
			save();
			continue;
		}
		if ( writeRounds >= maxRounds ) {
			break;
		}
		const r = write( report, round );
		gaps = { ...gaps, ...r.gaps };
		writeRounds++;
		rounds = writeRounds;
		lastWrote = r.writes.length > 0;
		log( `round ${ round } (write round ${ writeRounds }): ${ r.writes.length } writes, ${ Object.keys( r.gaps ).length } gaps` );
		if ( ! r.writes.length ) {
			break;
		}
		allWrites.push( ...r.writes );
		lastWrites = r.writes;
		prev = report;
		save();
	}
	if ( settle && prev && pending() && build( 'settle' ).ok ) {
		report = await walk( 'settle' );
		const changed = settle( prev, report, lastWrites );
		changed.filter( ( w ) => w.reverted ).forEach( ( w ) => gaps[ w.group ] = blocked.get( w.group ) );
		changed.filter( ( w ) => w.restored ).forEach( ( w ) => delete gaps[ w.group ] );
		log( `settling walk: guard reverted ${ changed.filter( ( w ) => w.reverted ).length }, restored ${ changed.filter( ( w ) => w.restored ).length }` );
		save();
	}
	return { report, writes: allWrites, gaps, rounds, lastWrote };
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
	const refs = detectReferences();
	const ctx = { db: openDb(), snapshot: loadSnapshot( path.join( REPO, 'sites', client, 'theme-snapshot.json' ) ), log: [] };
	const tree = readTree( treeFile );
	const added = addRefs( tree, surface );
	writeTree( treeFile, tree );
	const blocked = new Map();
	const trials = new Map();
	const { report, writes: allWrites, gaps, rounds, lastWrote } = await solveLoop( {
		maxRounds,
		blocked,
		build: () => {
			assertQuiet();
			return build( s, treeFile );
		},
		walk: ( round ) => walk( walker, path.join( outDir, `round-${ round }` ), s.walkStates ),
		guard: ( prev, rep, lastWrites ) => guardRound( prev, rep, tree, lastWrites, blocked, calibrationFor, trials ),
		// The settling walk only judges open trials: with no last writes the guard opens no new one.
		settle: ( prev, rep ) => guardRound( prev, rep, tree, [], blocked, calibrationFor, trials ),
		pending: () => [ ...trials.values() ].some( ( t ) => t.setting ),
		write: ( rep, round ) => writeRound( rep, tree, { ...ctx, round, blocked, stateMap: s.states, canvas: !! s.canvas, refs, ownerOf: ( node ) => outsideOwner( node, { refs } ) } ),
		save: () => writeTree( treeFile, tree ),
	} );
	closeTrials( trials, blocked ).forEach( ( w ) => gaps[ w.group ] = blocked.get( w.group ) );
	const before = JSON.parse( fs.readFileSync( path.join( outDir, 'round-1', 'report.json' ), 'utf8' ) );
	const classes = classify( report, { writes: allWrites, gaps, stateMap: s.states } );
	const wrong = wrongWrites( allWrites, report, s.states );
	const unmappedState = writableGroups( report, s.states ).unmappedState.length;
	const handover = handoverOf( classes );
	writeSolveReport( outDir, { handover, surface, refsAdded: added, rounds, roundThreeWrote: rounds >= 3 && lastWrote, writes: allWrites, wrong, wrongSettings: settingRatio( wrong, allWrites ), gaps, classes, snaps: ctx.log, intended: intendedCount( report ), unmappedState, before, after: report } );
	console.log( `solve ${ surface }: ${ allWrites.length } writes over ${ rounds } round(s); hardcode ${ classes.hardcode.length }, missing ${ classes.missing.length }, unresolved ${ classes.unresolved.length }, derived ${ classes.derived.length }, unmapped-state ${ unmappedState }, handover ${ handover.length }; wrong writes ${ wrong.length } (settings ${ settingRatio( wrong, allWrites ).wrong } of ${ settingRatio( wrong, allWrites ).total }). Report: ${ path.join( outDir, 'solve-report.md' ) }` );
}
