// Forms, field width. A field the draft puts in one column of a grid of two or more tracks, where the live field sits in a grid of
// a nested container (not the form's own six tracks), takes the width `auto`: the parent grid places it (form/style.css
// `.sgs-form-field--auto`). A field the draft spreads over its whole grid row keeps `full`. Fields pair by position among the form's
// fields, as lib/apply-family-form.mjs reads them (lib/apply-probes.mjs: each field's `layout`).
import { attrRow } from './db.mjs';

// A cell narrower than this share of its grid's content width sits in a column.
const COLUMN_SHARE = 0.9;

export const inColumn = ( layout ) => Boolean( layout && layout.cols >= 2 && layout.cellW < layout.gridW * COLUMN_SHARE );

export function fieldWidths( { draft, live, block, all, db } ) {
	const d = draft[ 1440 ]?.probes?.fields;
	// The live form's honeypot input is no field of the draft.
	const l = live[ 1440 ]?.probes?.fields?.filter( ( f ) => ! f.honeypot );
	if ( 'sgs/form' !== block || ! d || ! l || ! d.some( ( f ) => inColumn( f.layout ) ) ) {
		return [];
	}
	if ( d.length !== l.length ) {
		return [ { status: 'no-setting', prop: 'field width', why: `the draft form has ${ d.length } fields and the live form ${ l.length }, so no field pairs by position` } ];
	}
	const items = [];
	d.forEach( ( field, i ) => {
		const nested = l[ i ].layout;
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
