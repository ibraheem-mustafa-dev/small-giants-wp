// Chrome rule: the hover ground of icons a block draws as child blocks (a row of social icons inside the drawer). The skeleton
// names the row but not each icon, so no icon is a target of its own and the state family never reads its hover. The draft's
// records still name each icon's anchor: when a hover record gives no background, the icon keeps its resting ground (gradient or
// flat colour) on hover, and the live icon is written to match through its hover ground settings. The records' anchors and the
// live icons pair in document order and only when their counts agree.
import { settle } from './apply-chrome-records.mjs';
import { recordsFor, stateLook } from './apply-records.mjs';

const refNumber = ( ref ) => Number( /-(\d+)$/.exec( String( ref ) )?.[ 1 ] ?? NaN );
const GROUND = /^background(-color|-image)?$/;
const isNone = ( v ) => ! v || 'none' === v;

// The live icon blocks that follow a container's ref directly, in document order: [ { ref, attrs } ].
function iconsAfter( ref, blocks ) {
	const start = refNumber( ref );
	const prefix = String( ref ).replace( /-\d+$/, '-' );
	const out = [];
	for ( let n = start + 1; blocks[ `${ prefix }${ n }` ]?.block === 'sgs/icon'; n++ ) {
		out.push( { ref: `${ prefix }${ n }`, attrs: blocks[ `${ prefix }${ n }` ].attrs ?? {} } );
	}
	return out;
}

// The hover records of the draft's anchors inside a target's reach, grouped by template: [ [ record, ... ], ... ] in template order.
function anchorRecords( { target, recordsIndex } ) {
	const byTpl = new Map();
	for ( const id of target.reach ?? [] ) {
		for ( const r of recordsFor( recordsIndex, `Root/${ id }#0` ) ) {
			if ( 'hover' === r.trigger?.type && 'a' === r.element?.description && stateLook( r ) ) {
				byTpl.set( id, [ ...( byTpl.get( id ) ?? [] ), r ] );
			}
		}
	}
	return [ ...byTpl.entries() ].sort( ( a, b ) => a[ 0 ] - b[ 0 ] ).map( ( [ , list ] ) => list );
}

export function iconRule( ctx ) {
	const { target, all } = ctx;
	if ( target.slot || ! all?.blocks ) {
		return [];
	}
	const icons = iconsAfter( target.ref, all.blocks );
	if ( ! icons.length ) {
		return [];
	}
	const anchors = anchorRecords( ctx );
	if ( ! anchors.length ) {
		return [];
	}
	if ( anchors.length !== icons.length ) {
		return [ { status: 'no-setting', prop: 'icon hover ground', why: `${ target.tpl } has ${ anchors.length } hover anchors in the draft and ${ icons.length } icon blocks live; they do not pair one to one` } ];
	}
	const items = [];
	anchors.forEach( ( records, i ) => {
		const { ref, attrs } = icons[ i ];
		const names = records.flatMap( ( r ) => stateLook( r ).looks.map( ( l ) => l.property ) );
		if ( names.some( ( p ) => GROUND.test( p ) ) ) {
			return;
		}
		const gradient = ! isNone( attrs.backgroundColourGradient ) ? attrs.backgroundColourGradient : null;
		const flat = ! isNone( attrs.backgroundColour ) ? attrs.backgroundColour : null;
		const writes = gradient
			? [ { attr: 'backgroundColourHoverGradient', value: gradient } ]
			: ( flat ? [ { attr: 'backgroundColourHover', value: flat } ] : [] );
		if ( ! writes.length ) {
			return;
		}
		const item = settle( { prop: 'icon hover ground', why: `${ records[ 0 ].element.template_tpl_id } (${ ref }) keeps its ${ gradient ? 'gradient' : 'colour' } ground on hover: ${ records[ 0 ].id } names no background`, saved: attrs, writes, record: records[ 0 ].id, state: 'hover' } );
		items.push( { ...item, ref, block: 'sgs/icon' } );
	} );
	return items;
}
