// Forms, field width. A field the draft puts in one column of a grid of two or more tracks, where the live field sits in a grid of
// a nested container (not the form's own six tracks), takes the width `auto`: the parent grid places it (form/style.css
// `.sgs-form-field--auto`). A field the draft spreads over its whole grid row keeps `full`. Fields pair by `name` where both sides name
// every field, else by position (lib/apply-probes.mjs: each field's `layout`, `name`, `shown` and `laterStep`): a conditional field
// either form hides at rest takes no place in the pairing, and a wizard's later-step live fields, hidden at rest, do.
import { attrRow } from './db.mjs';

// A cell narrower than this share of its grid's content width sits in a column.
const COLUMN_SHARE = 0.9;

export const inColumn = ( layout ) => Boolean( layout && layout.cols >= 2 && layout.cellW < layout.gridW * COLUMN_SHARE );

// The pairs of draft and live field. The draft side is the fields the draft shows (each wizard step's as read at that step,
// lib/apply-probes.mjs::formProbe; a conditional field hidden at rest takes no place). The live side is read at rest. Where every
// draft field has a name and the live form holds a field of that name, shown or not, each pairs with its namesake (a live field
// the draft shows may be hidden at rest by its own condition). Otherwise they pair by position against the fields the live form
// shows and those hidden only because their wizard step is not the current one (`laterStep`, read by
// lib/apply-probes.mjs::fieldsOf: inside a `.sgs-form-step--hidden` step and not hidden by a condition), so a wizard's later steps
// keep their place while a live field a condition hides takes none; position pairing needs equal counts (`pairs` is empty when
// the counts differ).
export function pairedFields( d, l ) {
	const ds = d.filter( ( f ) => ! f.honeypot && false !== f.shown );
	const all = l.filter( ( f ) => ! f.honeypot );
	const named = ds.length > 0 && ds.every( ( f ) => f.name && all.some( ( x ) => x.name === f.name ) );
	if ( named ) {
		return { drafts: ds, lives: ds.map( ( f ) => all.find( ( x ) => x.name === f.name ) ), pairs: ds.map( ( f ) => [ f, all.find( ( x ) => x.name === f.name ) ] ) };
	}
	const ls = all.filter( ( f ) => false !== f.shown || f.laterStep );
	return { drafts: ds, lives: ls, pairs: ds.length === ls.length ? ds.map( ( f, i ) => [ f, ls[ i ] ] ) : [] };
}

export function fieldWidths( { draft, live, block, all, db } ) {
	const d = draft[ 1440 ]?.probes?.fields;
	const l = live[ 1440 ]?.probes?.fields;
	if ( 'sgs/form' !== block || ! d || ! l || ! d.some( ( f ) => inColumn( f.layout ) ) ) {
		return [];
	}
	const { drafts, lives, pairs } = pairedFields( d, l );
	if ( drafts.length !== lives.length ) {
		return [ { status: 'no-setting', prop: 'field width', why: `the draft form shows ${ drafts.length } fields and the live form ${ lives.length }, so no field pairs` } ];
	}
	const items = [];
	pairs.forEach( ( [ field, pair ] ) => {
		const nested = pair.layout;
		const saved = nested?.ref ? all?.blocks?.[ nested.ref ] : null;
		if ( ! saved || nested.form || ! /^sgs\/form-field-/.test( saved.block ) || ! attrRow( db, saved.block, 'width' ) ) {
			return;
		}
		const want = inColumn( field.layout ) ? 'auto' : null;
		const have = saved.attrs.width ?? 'full';
		if ( ! want ) {
			return;
		}
		const where = `${ nested.ref } (${ saved.block }) sits in ${ Math.round( field.layout.cellW ) }px of the draft's ${ field.layout.cols } tracks over ${ Math.round( field.layout.gridW ) }px`;
		items.push( have === want
			? { status: 'equal', ref: nested.ref, block: saved.block, prop: 'field width', why: `${ where }: already ${ want }` }
			: { status: 'op', ref: nested.ref, block: saved.block, prop: 'field width', why: `${ where }: the parent grid places it`, writes: [ { attr: 'width', value: want } ] } );
	} );
	return items;
}
