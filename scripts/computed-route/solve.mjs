#!/usr/bin/env node
// Solve (FR-47-3): compare a built surface with its draft, turn each open style or hover difference into a setting
// write through the resolver, rebuild, and repeat (at most three write rounds), then classify what survives.
//   node scripts/computed-route/solve.mjs --client eye-care-ward-end --surface footer [--out <dir>] [--rounds 3] [--site <calibration target>] [--no-trial] [--no-states] [--fill-report <fill-report.json>]
// Each write round's settings are tried in the open live page before the rebuild (lib/trial-run.mjs); a rejected one
// is undone and blocked (lib/trial.mjs::applyVerdicts). --no-trial skips the trial. The state check (lib/state-live.mjs)
// reads every paired element's state looks on both pages after the last walk; --no-states skips it.
// Reads only sites/<client>/build/surfaces.json for the surface. Writes the updated tree back to the surface's tree
// file, and solve-report.md / solve-report.json (plus every round's walker report) to --out.
import fs from 'fs';
import path from 'path';
import { spawn, spawnSync } from 'child_process';
import { fileURLToPath, pathToFileURL } from 'url';
import { openDb, statesVocabulary } from './lib/db.mjs';
import { loadCalibration } from './lib/cache.mjs';
import { loadSnapshot } from './lib/normalise.mjs';
import { resolve, resolveViaAncestor } from './lib/resolve.mjs';
import { readTree, writeTree, addRefs, nodeByRef, setAttr, assertWritable, assertQuiet } from './lib/tree.mjs';
import { writableGroups, draftValues, usedValueTarget, classify, openRows, rowDistance, intendedCount, regressedRows, groupKey, settingState, cssProp, knownPaths, resolveContent, handoverOf, HANDOVER_OWNERS } from './lib/solve-rows.mjs';
import { writeSolveReport } from './lib/solve-report.mjs';
import { writeConfirmLive } from './lib/confirm-live.mjs';
import { readMediaMap } from './lib/fill-media.mjs';
import { guardRound, closeTrials } from './lib/guard.mjs';
import { readWinningRules } from './lib/winning-rule.mjs';
import { detectReferences, referenceOf, BLOCKS_SRC } from './lib/references.mjs';
import { entranceStart, groupRects } from './lib/entrance.mjs';
import { retargetLive } from '../parity/lib/helpers.mjs';
import { candidatesOf, applyVerdicts } from './lib/trial.mjs';
import { openTrial, draftBoxes } from './lib/trial-run.mjs';
import { surfaceStateCheck } from './lib/state-live.mjs';
import { loadReasons, refusalsFor } from './lib/state-map-io.mjs';
import { walkerLintFault } from './lib/walker-lint.mjs';
import { hopCanvasSettable } from './lib/cite-emission.mjs';
import { solveLoopBody } from './lib/solve-loop-body.mjs';
import { solveLoop } from './lib/solve-loop.mjs';
import { journalFile, readJournal, resumeFrom, writeJournal } from './lib/solve-journal.mjs';

const HERE = path.dirname( fileURLToPath( import.meta.url ) );
const REPO = path.resolve( HERE, '../..' );
const WIDTHS = '375,768,1440,1920';
// Computed values that are used sizes, never declared ones (getComputedStyle resolves auto to pixels).
// A positioned element's left/top computes to pixels too; only a declared length or percentage is written.
export const USED_VALUES = [ 'width', 'left', 'top' ];

// The calibration for a block on a site, or null (the resolver then returns `uncalibrated`): the library-wide slot map
// with the site's own default paint as `elements` (lib/cache.mjs::loadCalibration). A site with no paint file gets
// `paintMissing` and no elements, never another site's paint.
export function calibrationFor( block, site, dir = path.join( HERE, 'cache' ) ) {
	const cal = loadCalibration( dir, block, site );
	return cal ? withInnerRootAliases( cal, block ) : null;
}

// The block-to-calibration function for one site, the shape every reader takes as `calFor`.
export const calibrationForSite = ( site, dir = path.join( HERE, 'cache' ) ) => ( block ) => calibrationFor( block, site, dir );

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

// --site <name>: run a surface against another copy of its site, a calibration-targets.json entry (a local mirror of
// the test site, a database copy, so its post ids and templates are the surface's own). The build logs in with that
// target's credentials, a mirror (one with a local pluginDir) has no remote host to check before a build, and the
// walker measures the target's origin (WP_URL_<envKey>, read by readUrl). No site: the surface as it is.
// Returns { surface, sshArgs, liveOrigin }; sshArgs undefined keeps assertQuiet's remote default.
export function siteOverride( s, site, targets, readUrl ) {
	if ( ! site ) {
		return { surface: s, sshArgs: undefined, liveOrigin: null };
	}
	const t = targets[ site ];
	if ( ! t ) {
		throw new Error( `--site ${ site } is not in calibration-targets.json` );
	}
	return {
		surface: { ...s, envFile: t.envFile, envKey: t.envKey, site },
		sshArgs: t.pluginDir ? null : undefined,
		liveOrigin: String( readUrl( t.envFile, t.envKey ) || '' ).replace( /\/+$/, '' ) || null,
	};
}

// WP_URL_<key> from a secrets env file, or null.
export function envUrl( file, key ) {
	const f = path.join( REPO, file );
	const line = fs.existsSync( f ) ? fs.readFileSync( f, 'utf8' ).split( /\r?\n/ ).find( ( l ) => l.startsWith( `WP_URL_${ key }=` ) ) : null;
	return line ? line.slice( line.indexOf( '=' ) + 1 ).trim().replace( /^["']|["']$/g, '' ) : null;
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

async function walk( walker, outDir, walkStates = null, liveOrigin = null ) {
	const dirOf = ( ws ) => path.join( outDir, `w${ ws.join( '-' ) }` );
	const one = ( ws ) => new Promise( ( done ) => {
		const args = [ 'scripts/parity/draft-live-walk.mjs', walker, ...WALK_FLAGS, '--widths', ws.join( ',' ), '--out', dirOf( ws ), '--draft-cache', path.join( path.dirname( outDir ), `draft-cache-${ ws.join( '-' ) }.json` ), ...( walkStates?.length ? [ '--states', walkStates.join( ',' ) ] : [] ) ];
		spawn( 'node', args, { cwd: REPO, stdio: 'inherit', timeout: 1800000, env: { ...process.env, ...( liveOrigin ? { SGS_LIVE_ORIGIN: liveOrigin } : {} ) } } ).on( 'close', done );
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

// A resolve result's I-calibration note (lib/resolve.mjs::resolve, FR-48-74), carried on each write record it produced.
const debtOf = ( r ) => ( r.instrumentDebt ? { instrumentDebt: r.instrumentDebt } : {} );

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
	// A hover row is judged on the hover state's width where the walker read one (a border drawn only on hover paints).
	const rest = draftValues( report, g.pair, `border-${ m[ 1 ] }-width`, false, g.walkerStates, g.pseudo ).perWidth;
	const hoverWidths = 'hover' === g.state ? draftValues( report, g.pair, `border-${ m[ 1 ] }-width`, true, g.walkerStates, g.pseudo ).perWidth : {};
	const widths = { ...rest, ...hoverWidths };
	const styles = Object.fromEntries( Object.entries( draftValues( report, g.pair, `border-${ m[ 1 ] }-style`, false, g.walkerStates, g.pseudo ).perWidth ).filter( ( [ w ] ) => undefined === hoverWidths[ w ] ) );
	const measured = Object.keys( widths );
	if ( ! measured.length || measured.some( ( w ) => parseFloat( widths[ w ] ) > 0 && ! [ 'none', 'hidden' ].includes( styles[ w ] ) ) ) {
		return null;
	}
	return { gap: 'not-painted', detail: `the draft has no ${ m[ 1 ] } border (${ measured.map( ( w ) => `${ widths[ w ] } ${ styles[ w ] || '' }`.trim() + '@' + w ).join( ', ' ) }): its ${ g.prop } is currentColor and paints nothing` };
}

export function writeRound( report, tree, { db, snapshot, round, log, blocked = new Map(), stateMap, calFor, refs = detectReferences(), canvas = false, ancestorHop = resolveViaAncestor, ownerOf = () => null, refused = [], loopBody = null } ) {
	const { groups, stateConflict, content } = writableGroups( report, stateMap, refused );
	const writes = [];
	const gaps = {};
	// Groups whose setting already holds the draft value, so nothing is written: holds[ groupKey ] = [ { ref, block, attr, value } ].
	const holds = {};
	for ( const c of stateConflict ) {
		gaps[ c.key ] = blocked.get( c.key ) || { gap: 'state-conflict', detail: c.conflict.detail };
	}
	const claimed = new Map();
	const start = structuredClone( tree );
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
				// Which measured group (descendant) each measured path came from: a loop body's identity is the descendant's draft element.
				const measuredRefs = Object.fromEntries( groups.filter( sameRow ).flatMap( ( o2 ) => o2.rows.flatMap( ( x ) => ( x.owners || [] ).filter( ( oo ) => oo.ref === o.ref ).map( ( oo ) => [ oo.path, o2.ref ] ) ) ) );
				return { ref: o.ref, block: n2.name, path: o.path, tag: o.tag || null, attributes: n2.attributes || {}, calibration: calFor( n2.name ), measured: measured.length ? measured : [ o.path ], measuredRefs };
			} ).filter( Boolean );
			const hop = ancestorHop( { block: node.name, slot: g.path, prop, state: g.state, perWidth, fontPx, current: node.attributes || {}, siblings },
				{ db, snapshot, log, canvas: !! canvas, ancestors, measuredSlots: ancestors.flatMap( ( a ) => a.measured ), ...( loopBody ? { loopBody } : {} ) } );
			const hopNode = hop?.writes ? nodeByRef( tree, hop.on.ref ) : null;
			if ( hopNode ) {
				r = { writes: hop.writes, ...debtOf( hop ) };
				target = { node: hopNode, ref: hop.on.ref, path: hop.on.path };
			} else if ( hop?.cite ) {
				r = { ...r, cite: hop.cite, canvasSettable: hopCanvasSettable( hop, ancestors, prop ) };
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
				// Held only when the tree held the value before this round's first write: a value an earlier group wrote
				// this round (two rows resolving to one setting) is a write, not a hold.
				const atStart = nodeByRef( start, target.ref );
				if ( ! atStart || JSON.stringify( setAttr( structuredClone( atStart ), w ).after ) === JSON.stringify( atStart.attributes?.[ w.attr ] ) ) {
					( holds[ g.key ] ||= [] ).push( { ref: target.ref, block: target.node.name, attr: w.attr, value: w.value } );
					continue;
				}
				writes.push( { round, group: g.key, ref: target.ref, block: target.node.name, path: target.path, prop: g.prop, state: g.state, attr: w.attr, before: setAttr( structuredClone( atStart ), w ).before, after: target.node.attributes?.[ w.attr ], rows: g.rows.map( ( x ) => ( { width: x.width, draft: x.draft, live: x.live } ) ), ...debtOf( r ) } );
				continue;
			}
			leafChanges( target.node.attributes?.[ w.attr ], setAttr( structuredClone( target.node ), w ).after ).forEach( ( [ k, v ] ) => claimed.set( `${ target.ref }|${ w.attr }|${ k }`, v ) );
			const { before, after } = setAttr( target.node, w );
			writes.push( { round, group: g.key, ref: target.ref, block: target.node.name, path: target.path, prop: g.prop, state: g.state, attr: w.attr, before, after, rows: g.rows.map( ( x ) => ( { width: x.width, draft: x.draft, live: x.live } ) ), ...debtOf( r ) } );
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
	return { writes, gaps, held: holds };
}

// The groups whose setting already holds the draft value, read against the final walk on a copy of the tree: nothing is
// written, and the token-snap log the caller passes is left as it was (the copy's resolve calls would repeat its entries).
export function heldGroups( report, tree, opts ) {
	return writeRound( report, structuredClone( tree ), { ...opts, round: 'held', log: [] } );
}

// The regression guard (R-47-9) lives in lib/guard.mjs. This wrapper keeps the single-call form: the writes undone this
// round (a calibration-named culprit, or the one suspect under trial).
export function revertRegressions( prev, report, tree, lastWrites, blocked, calFor, trials = new Map() ) {
	return guardRound( prev, report, tree, lastWrites, blocked, calFor, trials ).filter( ( w ) => w.reverted || w.trial );
}

// Wrong writes (§3.3, R-47-9 "any write a later read shows moving away from the draft"): a write a later round reverted,
// or after which one of its rows reads further from the draft on any later read, the guard reverting it or not. reads:
// every walk in order, [ { round, report, trialOpen } ]; the reads after the walk a write was computed from (its round) are
// its later reads, except a walk taken with a guard suspect undone (trialOpen), which measures a tree without that
// suspect, and reportAfter, the run's last walk, is always one.
export function wrongWrites( writes, reportAfter, stateMap, reads = [] ) {
	const rowsOf = new Map();
	const open = ( rep ) => rowsOf.get( rep ) || rowsOf.set( rep, openRows( rep ) ).get( rep );
	return writes.filter( ( w ) => {
		if ( w.reverted ) {
			return true;
		}
		const reverted = writes.some( ( x ) => x.round > w.round && x.ref === w.ref && x.attr === w.attr && JSON.stringify( x.after ) === JSON.stringify( w.before ) );
		const from = reads.findIndex( ( x ) => x.round === w.round );
		const later = [ ...( from < 0 ? [] : reads.slice( from + 1 ).filter( ( x ) => ! x.trialOpen ).map( ( x ) => x.report ) ), reportAfter ];
		const worse = w.rows.some( ( r0 ) => later.some( ( rep ) => {
			const r1 = open( rep ).find( ( r ) => undefined !== settingState( r, stateMap ) && groupKey( r, settingState( r, stateMap ) ) === w.group && r.width === r0.width );
			return r1 && rowDistance( r1 ) > rowDistance( { draft: r0.draft, live: r0.live } );
		} ) );
		return reverted || worse;
	} );
}

// Spec 48 §3.3's ratio: wrong settings (one attribute on one node, however many writes chained it) over every setting written.
export function settingRatio( wrong, writes ) {
	const key = ( w ) => `${ w.ref }|${ w.attr }`;
	return { wrong: new Set( wrong.map( key ) ).size, total: new Set( writes.map( key ) ).size };
}

// The build, walk and write rounds live in lib/solve-loop.mjs (with the crash journal, Spec 48 FR-48-5).
export { solveLoop };

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
	const site = siteOverride( surfaces[ surface ], surfaces[ surface ] ? flag( '--site' ) : null, JSON.parse( fs.readFileSync( path.join( HERE, 'calibration-targets.json' ), 'utf8' ) ), envUrl );
	const s = site.surface;
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
	// FR-48-12: a walker config that fails its lint stops the run before anything is built or walked.
	const lintFault = await walkerLintFault( surface, walker, s.walkStates );
	if ( lintFault ) {
		console.error( lintFault );
		process.exit( 1 );
	}
	if ( ! /refPrefix\s*:/.test( fs.readFileSync( walker, 'utf8' ) ) ) {
		console.error( `${ s.walkerFull || s.walker } has no refPrefix: rows would carry no ref` );
		process.exit( 2 );
	}
	const outDir = path.resolve( flag( '--out' ) || path.join( buildDir, 'qa', 'solve', surface, new Date().toISOString().replace( /[:.]/g, '-' ).slice( 0, 19 ) ) );
	fs.mkdirSync( outDir, { recursive: true } );
	const calibrationTargets = JSON.parse( fs.readFileSync( path.join( HERE, 'calibration-targets.json' ), 'utf8' ) );
	assertWritable( s.target, { calibrationTargets, surfaces } );
	const refs = detectReferences();
	// The default paint is read from the site this surface is built on (--site, else the surface's own `site`).
	if ( ! s.site ) {
		console.error( `surface "${ surface }" names no site in surfaces.json and no --site was given, so there is no default paint to read` );
		process.exit( 2 );
	}
	const calFor = calibrationForSite( s.site );
	// FR-48-14: the fact record and origin map the ancestor hop's loop-body check reads (lib/solve-loop-body.mjs).
	const { loopBody, note: loopNote } = solveLoopBody( { repo: REPO, client, surface, draftIndex: s.draftIndex } );
	console.log( `solve ${ surface }: ${ loopNote }` );
	const ctx = { db: openDb(), snapshot: loadSnapshot( path.join( REPO, 'sites', client, 'theme-snapshot.json' ) ), log: [], calFor, loopBody };
	const tree = readTree( treeFile );
	const added = addRefs( tree, surface );
	writeTree( treeFile, tree );
	const refused = refusalsFor( loadReasons(), surface );
	const blocked = new Map();
	const trials = new Map();
	// Try before write (R6): each write round's settings are tried in the open live page before the rebuild, and a
	// rejected one never reaches the tree (lib/trial.mjs::applyVerdicts). --no-trial skips it.
	const trialOn = ! argv.includes( '--no-trial' );
	const walkerCfg = trialOn ? retargetLive( ( await import( pathToFileURL( walker ).href ) ).default, site.liveOrigin ) : null;
	const trialWidths = WIDTHS.split( ',' ).map( Number );
	const trialVerdicts = [];
	const trialRejected = [];
	let trialRun = null;
	const writeStep = async ( rep, round ) => {
		const start = structuredClone( tree );
		const r = writeRound( rep, tree, { ...ctx, round, blocked, stateMap: s.states, refused, canvas: !! s.canvas, refs, ownerOf: ( node ) => outsideOwner( node, { refs } ) } );
		if ( ! trialOn || ! r.writes.length ) {
			return r;
		}
		trialRun ||= await openTrial( { envFile: s.envFile, envKey: s.envKey, walkerCfg, target: s.target } );
		const results = await trialRun.round( candidatesOf( r.writes, round ), draftBoxes( outDir, trialWidths ), trialWidths );
		trialVerdicts.push( ...results.map( ( x ) => ( { round, ...x } ) ) );
		const v = applyVerdicts( { tree, start, writes: r.writes, gaps: r.gaps, blocked, results } );
		trialRejected.push( ...v.rejected );
		console.log( `round ${ round } trial: ${ results.length } settings tried, ${ new Set( v.rejected.map( ( w ) => `${ w.ref }|${ w.attr }` ) ).size } rejected before writing` );
		return { ...r, writes: v.writes, gaps: v.gaps };
	};
	// FR-48-5: the crash journal. A record left by a stopped run is judged by this run's first walk before any write.
	const jFile = journalFile( buildDir, surface );
	const standing = readJournal( jFile );
	const resumed = resumeFrom( standing );
	resumed && console.log( `solve ${ surface }: ${ resumed.note } (${ path.relative( REPO, jFile ) })` );
	const baseFile = ( baseRound ) => ( 'resumed' === baseRound ? standing?.base ?? null : ( null == baseRound ? null : path.join( outDir, `round-${ baseRound }`, 'report.json' ) ) );
	// Every walk in order, so a wrong write is judged on every later read, not only the last (FR-48-5).
	const reads = [];
	let loopOut;
	try {
		loopOut = await solveLoop( {
			maxRounds,
			blocked,
			build: () => {
				assertQuiet( site.sshArgs );
				return build( s, treeFile );
			},
			walk: async ( round ) => {
				const rep = await walk( walker, path.join( outDir, `round-${ round }` ), s.walkStates, site.liveOrigin );
				reads.push( { round, report: rep, trialOpen: [ ...trials.values() ].some( ( t ) => t.setting ) } );
				return rep;
			},
			guard: ( prev, rep, lastWrites ) => guardRound( prev, rep, tree, lastWrites, blocked, calFor, trials ),
			// The settling walk only judges open trials: with no last writes the guard opens no new one.
			settle: ( prev, rep ) => guardRound( prev, rep, tree, [], blocked, calFor, trials ),
			pending: () => [ ...trials.values() ].some( ( t ) => t.setting ),
			write: writeStep,
			save: () => writeTree( treeFile, tree ),
			journal: ( list, { round, baseRound, stopped = null } ) => writeJournal( jFile, { surface, runDir: outDir, round, base: baseFile( baseRound ), writes: list, stopped } ),
			resume: resumed?.prev ? resumed : null,
		} );
	} finally {
		await trialRun?.close();
	}
	const { report, writes: allWrites, gaps, rounds, lastWrote, buildFailed } = loopOut;
	// A build that failed before any walk leaves nothing to classify or compare: say so and stop.
	if ( ! report ) {
		console.error( `solve ${ surface }: no walk to report, the build failed in round ${ buildFailed?.round ?? '?' } (see [FAIL] above). Run folder: ${ outDir }` );
		process.exit( 1 );
	}
	closeTrials( trials, blocked ).forEach( ( w ) => gaps[ w.group ] = blocked.get( w.group ) );
	const before = JSON.parse( fs.readFileSync( path.join( outDir, 'round-1', 'report.json' ), 'utf8' ) );
	// What the tree already holds for each still-open group, read against the final walk on a copy (nothing is written):
	// a setting holding the draft value while the paint differs is a Hardcode, however many rounds ran.
	const { held } = heldGroups( report, tree, { ...ctx, blocked, stateMap: s.states, canvas: !! s.canvas, refs, ownerOf: ( node ) => outsideOwner( node, { refs } ) } );
	const classes = classify( report, { writes: allWrites, gaps, held, stateMap: s.states } );
	// The rule that wins on the live page for each Hardcode row (read-only; --no-rules skips it).
	const heldRows = classes.hardcode;
	if ( heldRows.length && ! argv.includes( '--no-rules' ) ) {
		try {
			const liveUrl = retargetLive( ( await import( pathToFileURL( walker ).href ) ).default, site.liveOrigin )?.live?.url;
			for ( const [ row, found ] of await readWinningRules( heldRows, { liveUrl } ) ) {
				row.winningRule = found.text || found.note || null;
			}
		} catch ( e ) {
			heldRows.forEach( ( row ) => ( row.winningRule = `winning rule not read: ${ String( e.message || e ).slice( 0, 120 ) }` ) );
		}
	}
	// FR-48-81: every paired element's state looks on the draft against the built page (--no-states skips it).
	const states = argv.includes( '--no-states' ) ? { json: { off: '--no-states' }, markdown: '## States (FR-48-81)\n\nNot checked: --no-states.' } : await surfaceStateCheck( { cfg: retargetLive( ( await import( pathToFileURL( walker ).href ) ).default, site.liveOrigin ), vocab: statesVocabulary( ctx.db ), surfaces, surface, buildDir, headless: ! process.env.SGS_HEADED, log: console.log } );
	const wrong = wrongWrites( allWrites, report, s.states, reads );
	const unmappedState = writableGroups( report, s.states, refused ).unmappedState.length;
	const handover = handoverOf( classes );
	const trial = { verdicts: trialVerdicts, rejected: trialRejected, ...( trialOn ? {} : { off: '--no-trial' } ) };
	writeSolveReport( outDir, { trial, handover, surface, refsAdded: added, rounds, roundThreeWrote: rounds >= 3 && lastWrote, writes: allWrites, wrong, wrongSettings: settingRatio( wrong, allWrites ), gaps, classes, snaps: ctx.log, intended: intendedCount( report ), unmappedState, states: states.json, statesMarkdown: states.markdown, before, after: report } );
	// FR-48-36: with --fill-report <fill-report.json>, the confirm records get their rendered-live half from the final walk
	// (confirm-live.json beside the report).
	if ( flag( '--fill-report' ) ) {
		const cl = writeConfirmLive( outDir, path.resolve( flag( '--fill-report' ) ), report, { stateMap: s.states, media: { map: readMediaMap( path.join( buildDir, 'media-map.json' ) ), site: s.site } } );
		console.log( `confirm-live: ${ JSON.stringify( cl.counts ) } -> ${ cl.file }` );
	}
	console.log( `solve ${ surface }: ${ allWrites.length } writes over ${ rounds } round(s); hardcode ${ classes.hardcode.length }, missing ${ classes.missing.length }, unresolved ${ classes.unresolved.length }, derived ${ classes.derived.length }, unmapped-state ${ unmappedState }, handover ${ handover.length }; wrong writes ${ wrong.length } (settings ${ settingRatio( wrong, allWrites ).wrong } of ${ settingRatio( wrong, allWrites ).total }). Report: ${ path.join( outDir, 'solve-report.md' ) }` );
}
