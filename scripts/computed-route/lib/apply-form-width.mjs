// Forms, field width. A field the draft puts in one column of a grid of two or more tracks, where the live field sits in a grid of
// a nested container (not the form's own six tracks), takes the width `auto`: the parent grid places it (form/style.css
// `.sgs-form-field--auto`). A field the draft spreads over its whole grid row keeps `full`. Fields pair by `name` where both sides name
// every field, else by position among the fields each form shows (lib/apply-probes.mjs: each field's `layout`, `name` and `shown`):
// a conditional field a form hides at rest takes no place in the pairing.
import { attrRow } from './db.mjs';

// A cell narrower than this share of its grid's content width sits in a column.
const COLUMN_SHARE = 0.9;

export const inColumn = ( layout ) => Boolean( layout && layout.cols >= 2 && layout.cellW < layout.gridW * COLUMN_SHARE );

// The pairs of draft and live field: both forms' fields as each shows them at rest. Where every draft field has a name and the
// live form holds a field of that name, each pairs with its namesake (a live field the draft hides, a conditional one, pairs with
// nothing); otherwise they pair by position, which needs equal counts (`pairs` is empty when the counts differ).
export function pairedFields( d, l ) {
	const rest = ( list ) => list.filter( ( f ) => ! f.honeypot && false !== f.shown );
	const ds = rest( d );
	const ls = rest( l );
	const named = ds.length > 0 && ds.every( ( f ) => f.name && ls.some( ( x ) => x.name === f.name ) );
	if ( named ) {
		return { drafts: ds, lives: ds.map( ( f ) => ls.find( ( x ) => x.name === f.name ) ), pairs: ds.map( ( f ) => [ f, ls.find( ( x ) => x.name === f.name ) ] ) };
	}
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
