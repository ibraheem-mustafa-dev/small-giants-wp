// Applier family: tiles. The first tile of an sgs/form-field-tiles block read at rest, hovered and selected (a click;
// lib/apply-probes.mjs) in the draft and the live block: the selected look (ground, border, label colour), the check mark (colour,
// ground, size, inset, corner or inline position) and the resting look go through the resolver at the tile's parts. A hover look
// no tile setting holds is a no-setting row.
import { partItems } from './apply-probe-items.mjs';

const SELECTED = [ 'background-color', 'border-top-color', 'border-top-width', 'box-shadow', 'color' ];
const CHECK = [ 'color', 'background-color', 'width', 'top' ];
const REST = [ 'background-color', 'border-top-color', 'border-top-width' ];
const HOVERED = [ 'border-top-color', 'background-color', 'box-shadow' ];

export const tiles = {
	name: 'tiles',
	props: [],
	decide( ctx ) {
		const { draft, live, block } = ctx;
		const d = draft[ 1440 ]?.probes;
		const l = live[ 1440 ]?.probes;
		if ( 'sgs/form-field-tiles' !== block || ! d?.selected || ! l?.selected ) {
			return [];
		}
		const items = [];
		const of = ( element, state, key, part, props ) => props.forEach( ( prop ) => items.push( ...partItems( { ctx, element, prop, state, drafts: [ d[ key ]?.[ part ]?.[ prop ] ], lives: [ l[ key ]?.[ part ]?.[ prop ] ], check: { probe: [ key, part ] } } ) ) );
		of( 'tile', null, 'rest', 'tile', REST );
		of( 'tile-selected', null, 'selected', 'tile', SELECTED );
		if ( d.selected.check && l.selected.check ) {
			of( 'tile-check', null, 'selected', 'check', CHECK );
			const want = 'absolute' === d.selected.check.position ? 'corner' : 'inline-start';
			const have = 'absolute' === l.selected.check.position ? 'corner' : 'inline-start';
			if ( want !== have ) {
				items.push( { status: 'op', prop: 'selectedCheckPosition', why: `the draft's check is ${ d.selected.check.position }`, writes: [ { attr: 'selectedCheckPosition', value: want } ], checks: [ { width: 1440, prop: 'position', want: 'corner' === want ? 'absolute' : 'static', probe: [ 'selected', 'check' ] } ] } );
			}
		}
		if ( d.hover && l.hover ) {
			of( 'tile', 'hover', 'hover', 'tile', HOVERED );
		}
		return items;
	},
};
