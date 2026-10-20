// Fill's state pass (Spec 48 FR-48-81): writes each target's state looks (lib/fill-state-read.mjs::readStates, read
// into readDraft's `states`) into the block settings that hold them, a first pass from the draft's code beside Fill's
// resting pass. Solve keeps correcting the residue the walker measures, through the same resolver with the same state.
// A look is written only through a setting state the framework DB holds (block_attributes.css_state). Keyboard focus
// that paints like hover is already written by the hover setting (SGS paints hover on :hover and :focus-visible
// together); any other look no setting holds is reported as a gap, never dropped.
//
// Three looks go to the client's theme snapshot instead (lib/fill-state-tokens.mjs): a focus look unlike hover, a press look
// on a button, and a :link, :any-link or :visited look on a plain content link; Fill returns them as `patch` and never
// edits the snapshot itself.
//
// A surface's open look: a modal, nav drawer or mega panel that is not shown at rest (every read width finds nothing
// visible) has no resting look to keep, so the look its :modal, :popover-open, :target or open state paints is the
// surface's own look. Fill writes it through the resolver as the resting state (state null), into the settings the
// surface paints at rest. A surface shown at rest, and a surface block whose settings hold an open state, keep the
// state-setting path below.

import { setAttr, refOf, walk } from './tree.mjs';
import { resolveProperty, knownPaths } from './fill-prop.mjs';
import { LOOSE } from './resolve.mjs';
import { settingStates } from './db.mjs';
import { READ_WIDTHS } from './fill-read.mjs';
import { TIMING_PROPS, timingWrites } from './fill-timing.mjs';
import { createPatch, tokenRoute, pickValue, pressVariant, ownedBySetting, applyTokenLooks, conflictRow } from './fill-state-tokens.mjs';

// The blocks whose panel is hidden until a trigger opens it (their open look is their own look).
export const SURFACE_BLOCKS = [ 'sgs/modal', 'sgs/nav-drawer', 'sgs/mega-panel' ];

// Whether a target was read at every width and found nothing visible there (a closed dialog, drawer or panel).
export const hiddenAtRest = ( reads, id ) => READ_WIDTHS.every( ( w ) => true === reads.widths?.[ w ]?.[ id ]?.missing );

const same = ( a, b ) => JSON.stringify( a ) === JSON.stringify( b );

// One target's state looks grouped by state and property across the read widths: Map `${state}|${prop}` →
// { state, prop, perWidth, read ('code' when any width's value was read from the stylesheet) }. A combination of states (hover on the current item) keeps every word, joined by `+`.
// reads: readDraft's result; id: the target id.
export function stateDrafts( reads, id ) {
	const out = new Map();
	for ( const w of READ_WIDTHS ) {
		for ( const look of reads.states?.[ w ]?.looks?.[ id ] || [] ) {
			const state = [ ...look.states ].sort().join( '+' );
			// The rendered value is what Fill writes (code first, the render confirms): a property with no render read
			// (an unresolved var() or currentcolor in its declared text) is not written from its declaration.
			for ( const prop of Object.keys( look.declared ).filter( ( p ) => ! TIMING_PROPS.includes( p ) ) ) {
				// A look read from the stylesheet (read 'code': a state no browser can enter) has no rendered value; its declared
				// value is the value. An entered look's rendered value wins over a code look of the same state and property.
				const code = 'code' === look.read;
				const value = look.rendered?.[ prop ] ?? ( code ? look.declared[ prop ] : undefined );
				if ( ! value ) {
					continue;
				}
				const key = `${ state }|${ prop }`;
				const e = out.get( key ) || { state, prop, perWidth: {}, byCode: {}, read: 'entered' };
				if ( code && undefined !== e.perWidth[ w ] ) {
					continue;
				}
				e.perWidth[ w ] = value;
				e.byCode[ w ] = code;
				e.read = Object.values( e.byCode ).some( Boolean ) ? 'code' : 'entered';
				out.set( key, e );
			}
		}
	}
	return out;
}

// Why a look has no setting state to go to, or null when `state` is one the DB holds.
export function stateGap( state, held ) {
	if ( held.has( state ) ) {
		return null;
	}
	if ( state.includes( '+' ) ) {
		return `combined-state: the draft styles ${ state } together, and a setting holds one state`;
	}
	if ( 'focus' === state ) {
		return 'focus-differs: keyboard focus paints with the hover look and the theme focus ring (settings.custom.focus); a different per-element focus look has no setting';
	}
	if ( 'active' === state ) {
		return "press: a pressed look is sgs/button's buttonPresets active token (the theme snapshot), not a per-element setting";
	}
	return `no-state-setting: no block setting holds the ${ state } look`;
}

// Writes every state look of every node into the tree in place. opts: { tree, nodes (skeletonNodes), reads, calFor,
// db, snapshot }. Returns { writes, unmapped, held, patch, patchEntries }: held lists the looks another setting already
// gives (focus as hover); patch is the theme-snapshot.json patch (settings.custom.focus, settings.custom.buttonPresets,
// styles.elements.link) with patchEntries listing each key it set.
export function fillStates( { tree, nodes, reads, calFor, db, snapshot } ) {
	const flat = [];
	walk( tree, ( n, i ) => {
		flat[ i ] = n;
	} );
	const sink = createPatch();
	const out = { writes: [], unmapped: [], held: [] };
	for ( const rec of nodes ) {
		const cal = rec.targets.length ? calFor( rec.name ) : null;
		if ( ! cal ) {
			continue;
		}
		// The setting states this block holds: a state another block holds is still a gap here.
		const held = settingStates( db, rec.name );
		const node = flat[ rec.index ];
		const ref = refOf( node );
		for ( const target of rec.targets ) {
			if ( ! knownPaths( cal ).map( LOOSE ).includes( LOOSE( target.slot ) ) ) {
				continue;
			}
			// Transition timings follow CSS direction semantics (lib/fill-timing.mjs), not the one-look-one-state rule below.
			const timing = timingWrites( { node, ref, rec, target, cal, db, snapshot, reads, held } );
			out.writes.push( ...timing.writes );
			out.unmapped.push( ...timing.unmapped );
			const drafts = stateDrafts( reads, target.id );
			const hidden = SURFACE_BLOCKS.includes( rec.name ) && hiddenAtRest( reads, target.id );
			const tokenLooks = {};
			for ( const { state, prop, perWidth, read } of drafts.values() ) {
				if ( 'focus' === state && same( drafts.get( `hover|${ prop }` )?.perWidth, perWidth ) ) {
					out.held.push( { node: ref, slot: target.slot, prop, state, reason: 'focus paints with hover: the hover setting writes it' } );
					continue;
				}
				if ( tokenRoute( { state, prop, held, block: rec.name, node } ) ) {
					( tokenLooks[ state ] ??= {} )[ prop ] = pickValue( perWidth );
					continue;
				}
				const atRest = 'open' === state && hidden && ! held.has( state );
				const gap = atRest ? null : stateGap( state, held );
				const res = gap ? { status: 'gap', gap } : resolveProperty( { node, block: rec.name, prop, draft: perWidth, baseline: () => undefined, slots: [ target.slot ], calibration: cal, db, snapshot, log: [], state: atRest ? null : state } );
				if ( 'written' === res.status ) {
					for ( const w of res.writes ) {
						const { before, after } = setAttr( node, w );
						out.writes.push( { node: ref, index: rec.index, block: rec.name, slot: target.slot, prop, state, attr: w.attr, before, after, widths: Object.keys( res.included || {} ).map( Number ), how: 'fill-state', ...( 'code' === read ? { read } : {} ), ...( atRest ? { surface: 'open look written as the resting look' } : {} ) } );
					}
				} else if ( 'gap' === res.status ) {
					out.unmapped.push( { node: ref, block: rec.name, slot: target.slot, property: prop, state, value: JSON.stringify( perWidth ), reason: res.detail ? `${ res.gap }: ${ res.detail }` : res.gap } );
				}
			}
			if ( Object.keys( tokenLooks ).length ) {
				const snap = reads.widths?.[ READ_WIDTHS[ READ_WIDTHS.length - 1 ] ]?.[ target.id ] || {};
				const from = { node: ref, block: rec.name, slot: target.slot, index: rec.index };
				out.unmapped.push( ...applyTokenLooks( { looks: tokenLooks, sink, from, target: { tag: snap.tag, href: snap.href }, variant: pressVariant( rec.name, node ), owned: ownedBySetting( cal, target.slot ) } ) );
			}
		}
	}
	out.unmapped.push( ...sink.conflicts.map( conflictRow ) );
	return { ...out, patch: sink.patch, patchEntries: sink.entries };
}
