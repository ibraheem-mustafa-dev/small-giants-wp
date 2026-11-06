// Applier family: forms. One value on the form block serves every field (fieldBackground, fieldTextColour, labelColour and the
// focus settings), so every field of every step is read (lib/apply-probes.mjs: the draft's steps through its component's
// setState) and each property goes through the resolver at the field's part. Where the draft's fields differ among themselves
// the item is a no-setting row naming the values. The first field is also read under keyboard focus.
import { FIELD_REST_PROPS, LABEL_PROPS } from './apply-probes.mjs';
import { partItems } from './apply-probe-items.mjs';
import { fieldWidths } from './apply-form-width.mjs';

const FOCUS = [ 'background-color', 'border-top-color', 'border-top-width', 'box-shadow' ];
const col = ( fields, key, prop ) => fields.map( ( f ) => f[ key ]?.[ prop ] );

export const form = {
	name: 'form',
	// grid-column: the span each field reads (the draft's cells are grid items whose placement the field width settings decide).
	props: [ 'grid-column' ],
	decide( ctx ) {
		const { draft, live, block } = ctx;
		const d = draft[ 1440 ]?.probes;
		const l = live[ 1440 ]?.probes;
		if ( 'sgs/form' !== block || ! d?.fields || ! l?.fields ) {
			return [];
		}
		const items = [];
		const why = d.steps > 1 ? ` (${ d.steps } steps read)` : '';
		for ( const prop of FIELD_REST_PROPS.filter( ( p ) => ! /^border-top-(color|width|style)$/.test( p ) ) ) {
			items.push( ...partItems( { ctx, element: 'field-input', prop, drafts: col( d.fields, 'field', prop ), lives: col( l.fields, 'field', prop ), check: { all: 'field' }, why } ) );
		}
		for ( const prop of LABEL_PROPS ) {
			items.push( ...partItems( { ctx, element: 'field-label', prop, drafts: col( d.fields, 'label', prop ), lives: col( l.fields, 'label', prop ), check: { all: 'label' }, why } ) );
		}
		for ( const prop of FOCUS.filter( () => d.focus && l.focus ) ) {
			items.push( ...partItems( { ctx, element: 'field-input', prop, state: 'focus', drafts: [ d.focus[ prop ] ], lives: [ l.focus[ prop ] ], check: { probe: [ 'focus' ] } } ) );
		}
		return [ ...items, ...fieldWidths( ctx ) ];
	},
};
