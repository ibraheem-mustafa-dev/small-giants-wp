// Chrome rule: an icon block's colour on hover (sgs/icon). A draft icon that takes its colour from a hover on itself or on its
// card (a parent-driven custom property) carries a hover record whose `color` is the colour the artwork shows. The icon block
// paints its svg from iconColourHover, so a value left at the cloner's rest colour keeps the artwork in the rest colour while the
// wrapper turns. The record's literal colour is written there, as a palette slug when the client has one.
import { colourValue } from './apply-probe-items.mjs';
import { recordsOf, settle } from './apply-chrome-records.mjs';
import { stateLook } from './apply-records.mjs';

const LITERAL = /^(#[0-9a-f]{3,8}|rgba?\([^)]*\))$/i;

export function iconHoverColour( ctx ) {
	const { saved, target, snapshot } = ctx;
	if ( ! ( 'iconColourHover' in saved ) ) {
		return [];
	}
	for ( const r of recordsOf( ctx ) ) {
		const look = 'hover' === r.trigger?.type ? stateLook( r )?.looks.find( ( l ) => 'color' === l.property && LITERAL.test( String( l.to ).trim() ) ) : null;
		const value = look && colourValue( look.to, snapshot );
		if ( value ) {
			return [ settle( { prop: 'iconColourHover', why: `${ target.tpl } the artwork turns ${ look.to } on hover (${ r.id })`, saved, writes: [ { attr: 'iconColourHover', value } ], record: r.id, state: 'hover' } ) ];
		}
	}
	return [];
}
