// Fill's state pass (Spec 48 FR-48-81): writes each target's state looks (lib/fill-state-read.mjs::readStates, read
// into readDraft's `states`) into the block settings that hold them, a first pass from the draft's code beside Fill's
// resting pass. Solve keeps correcting the residue the walker measures, through the same resolver with the same state.
// A look is written only through a setting state the framework DB holds (block_attributes.css_state). Keyboard focus
// that paints like hover is already written by the hover setting (SGS paints hover on :hover and :focus-visible
// together); any other look no setting holds is reported as a gap, never dropped.

import { setAttr, refOf, walk } from './tree.mjs';
import { resolveProperty, knownPaths } from './fill-prop.mjs';
import { LOOSE } from './resolve.mjs';
import { settingStates } from './db.mjs';
import { READ_WIDTHS } from './fill-read.mjs';
import { TIMING_PROPS, timingWrites } from './fill-timing.mjs';

const same = ( a, b ) => JSON.stringify( a ) === JSON.stringify( b );

// One target's state looks grouped by state and property across the read widths: Map `${state}|${prop}` →
// { state, prop, perWidth }. A combination of states (hover on the current item) keeps every word, joined by `+`.
// reads: readDraft's result; id: the target id.
export function stateDrafts( reads, id ) {
	const out = new Map();
	for ( const w of READ_WIDTHS ) {
		for ( const look of reads.states?.[ w ]?.looks?.[ id ] || [] ) {
			const state = [ ...look.states ].sort().join( '+' );
			// The rendered value is what Fill writes (code first, the render confirms): a property with no render read
			// (an unresolved var() or currentcolor in its declared text) is not written from its declaration.
			for ( const prop of Object.keys( look.declared ).filter( ( p ) => ! TIMING_PROPS.includes( p ) ) ) {
				const value = look.rendered?.[ prop ];
				if ( ! value ) {
					continue;
				}
				const key = `${ state }|${ prop }`;
				const e = out.get( key ) || { state, prop, perWidth: {} };
				e.perWidth[ w ] = value;
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
// db, snapshot }. Returns { writes, unmapped, held }: held lists the looks another setting already gives (focus as
// hover).
export function fillStates( { tree, nodes, reads, calFor, db, snapshot } ) {
	const flat = [];
	walk( tree, ( n, i ) => {
		flat[ i ] = n;
	} );
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
			for ( const { state, prop, perWidth } of drafts.values() ) {
				if ( 'focus' === state && same( drafts.get( `hover|${ prop }` )?.perWidth, perWidth ) ) {
					out.held.push( { node: ref, slot: target.slot, prop, state, reason: 'focus paints with hover: the hover setting writes it' } );
					continue;
				}
				const gap = stateGap( state, held );
				const res = gap ? { status: 'gap', gap } : resolveProperty( { node, block: rec.name, prop, draft: perWidth, baseline: () => undefined, slots: [ target.slot ], calibration: cal, db, snapshot, log: [], state } );
				if ( 'written' === res.status ) {
					for ( const w of res.writes ) {
						const { before, after } = setAttr( node, w );
						out.writes.push( { node: ref, index: rec.index, block: rec.name, slot: target.slot, prop, state, attr: w.attr, before, after, widths: Object.keys( res.included || {} ).map( Number ), how: 'fill-state' } );
					}
				} else if ( 'gap' === res.status ) {
					out.unmapped.push( { node: ref, block: rec.name, slot: target.slot, property: prop, state, value: JSON.stringify( perWidth ), reason: res.detail ? `${ res.gap }: ${ res.detail }` : res.gap } );
				}
			}
		}
	}
	return out;
}
