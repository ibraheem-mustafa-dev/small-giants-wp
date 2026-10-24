// Keyboard focus beside a written hover look (Spec 48 FR-48-81, plan decisions 1 and 6 of 2026-10-24). Every SGS hover
// setting also paints :focus-visible (includes/helpers-hover-state.php::sgs_hover_state_rules). Where the draft keeps an
// element's resting look on focus, the block's sgsFocusRests switch (a yes/no setting every SGS block carries, a DB row with
// no css_property) keeps the resting look on keyboard focus for every hover look of that block, so Fill writes it once per
// node. Where the draft's focus look equals its hover look, the default already paints hover on focus and nothing is written.

import { longhands } from './calibrate-props.mjs';
import { attrRow } from './db.mjs';
import { setAttr } from './tree.mjs';
import { takesRing } from './fill-state-tokens.mjs';

export const FOCUS_RESTS = 'sgsFocusRests';

// A hover look written to a setting also paints keyboard focus. Where the draft has no focus look of that property on an
// element that takes focus, the draft keeps its resting look on focus while the block shows the hover look. Returns that
// row's reason, or null. attrs: the settings the hover look was written to.
export function focusSharesHover( { drafts, pseudo = '', prop, snap = {}, attrs = [] } ) {
	const focusLook = [ ...drafts.values() ].some( ( d ) => d.pseudo === pseudo && ( d.prop === prop || longhands( d.prop ).includes( prop ) ) && String( d.state ).split( '+' ).some( ( s ) => 'focus' === s || 'focus-visible' === s ) );
	if ( focusLook || ! takesRing( snap.tag, snap.role ) ) {
		return null;
	}
	return `focus-shares-hover: ${ attrs.join( ', ' ) } paints the draft's hover ${ prop } on :focus-visible too, and the draft keeps its resting ${ prop } on focus`;
}

// Settles each node's focus-shares-hover rows (collected per node by lib/fill-state.mjs::fillStates). rows: [{ node, ref,
// rec, row }], row the unmapped row the hover write raised; painted: Map ref → [prop] of focus looks the draft paints as
// its hover look on that node (the default hover-on-focus paints them, which sgsFocusRests would cancel). A node whose
// block carries sgsFocusRests and paints no focus as hover gets sgsFocusRests true and its rows are dropped; else every
// row stays, its reason naming why. Returns { writes, unmapped }.
export function settleFocusRests( { rows, painted, db } ) {
	const out = { writes: [], unmapped: [] };
	const byRef = new Map();
	rows.forEach( ( r ) => ( byRef.get( r.ref ) || byRef.set( r.ref, [] ).get( r.ref ) ).push( r ) );
	for ( const [ ref, list ] of byRef ) {
		const { node, rec } = list[ 0 ];
		const hasSwitch = !! attrRow( db, rec.name, FOCUS_RESTS );
		const asHover = painted.get( ref ) || [];
		if ( ! hasSwitch || asHover.length ) {
			const why = hasSwitch
				? `${ FOCUS_RESTS } would also cancel the draft's focus look that equals its hover ${ asHover.join( ', ' ) } on this block`
				: `${ rec.name } has no ${ FOCUS_RESTS } setting`;
			out.unmapped.push( ...list.map( ( { row } ) => ( { ...row, reason: `${ row.reason }; it is not separated: ${ why }` } ) ) );
			continue;
		}
		const { before, after } = setAttr( node, { attr: FOCUS_RESTS, value: true } );
		const props = [ ...new Set( list.map( ( { row } ) => row.property ) ) ];
		out.writes.push( { node: ref, index: rec.index, block: rec.name, slot: list[ 0 ].row.slot, prop: props.join( ', ' ), state: 'focus', attr: FOCUS_RESTS, before, after, widths: [], how: 'fill-state-focus-rests', rests: `the draft keeps its resting ${ props.join( ', ' ) } on keyboard focus where the hover look changes it` } );
	}
	return out;
}
