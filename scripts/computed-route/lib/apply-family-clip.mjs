// Applier family: corners. A draft box with a radius that clips its children has an overflow the live box lacks, so a square
// child or a hover layer paints past its corners. The setting that holds overflow comes from the framework DB.
import { candidates } from './db.mjs';

const CORNERS = [ 'border-top-left-radius', 'border-top-right-radius', 'border-bottom-right-radius', 'border-bottom-left-radius' ];

export const hasRadius = ( styles ) => CORNERS.some( ( p ) => parseFloat( styles[ p ] ) > 0 );
export const clips = ( styles ) => [ 'hidden', 'clip' ].includes( styles[ 'overflow-x' ] ) && [ 'hidden', 'clip' ].includes( styles[ 'overflow-y' ] );

export const clip = {
	name: 'clip',
	props: [ ...CORNERS, 'overflow-x', 'overflow-y' ],
	decide( { target, draft, live, block, db } ) {
		const widths = Object.keys( draft ).filter( ( w ) => draft[ w ] && live[ w ] );
		const rounded = widths.filter( ( w ) => hasRadius( draft[ w ].styles ) && clips( draft[ w ].styles ) );
		if ( ! rounded.length ) {
			return [];
		}
		const open = rounded.filter( ( w ) => 'visible' === live[ w ].styles[ 'overflow-x' ] );
		if ( ! open.length ) {
			return [ { status: 'equal', prop: 'overflow', why: 'the live box already clips' } ];
		}
		const setting = candidates( db, block, 'overflow', null ).find( ( r ) => 'string' === r.attr_type || ! r.tier_shape );
		if ( ! setting ) {
			return [ { status: 'no-setting', prop: 'overflow', why: `${ block } has no overflow setting` } ];
		}
		if ( rounded.length !== widths.length ) {
			return [ { status: 'no-setting', prop: 'overflow', why: `clips at ${ rounded.join( ', ' ) } only; ${ setting.attr_name } holds one value for every width` } ];
		}
		const want = draft[ rounded[ 0 ] ].styles[ 'overflow-x' ];
		return [ {
			status: 'op',
			prop: 'overflow',
			why: `${ target.tpl } clips its rounded corners`,
			writes: [ { attr: setting.attr_name, value: want } ],
			checks: open.map( ( w ) => ( { width: Number( w ), prop: 'overflow-x', want } ) ),
		} ];
	},
};
