// The detector for draft looks a block already has a setting for and Fill left unwritten: from a saved Fill run's report
// (fill-report.json: `customCssGaps`, and `unmapped`, the rows nothing wrote), each row of one family, by node. Each family
// is one behaviour of Fill, recognised from the row and the block's calibration (never a block name):
//   picture-box  a background longhand (the picture's image, size, position or repeat) on a node whose block draws its
//                picture at a replaced-picture part a fit setting paints (lib/fill-picture-box.mjs::picturePart): the
//                draft paints a picture as a box's background and the block holds it as its picture's fit and focal.
// Returns [{ family, node, block, slot, property, value }].
import { picturePart } from './fill-picture-box.mjs';

const PICTURE_LOOK = new Set( [ 'background-size', 'background-position-x', 'background-position-y', 'background-repeat' ] );

// The rows of one report as { node, block, slot, property, value }: each Custom CSS gap's properties, then each unmapped row.
export function reportRows( report ) {
	const blockOf = {};
	( report.writes || [] ).forEach( ( w ) => ( blockOf[ w.node ] = w.block ) );
	const out = [];
	for ( const g of report.customCssGaps || [] ) {
		const decl = Object.fromEntries( [ ...String( g.css ?? '' ).matchAll( /([a-z-]+)\s*:\s*([^;{}]+);/g ) ].map( ( m ) => [ m[ 1 ], m[ 2 ].trim() ] ) );
		( g.properties || [] ).forEach( ( p ) => out.push( { node: g.node, block: g.block, slot: g.slot ?? '', property: p, value: decl[ p ] ?? null, via: 'custom-css' } ) );
	}
	for ( const r of report.unmapped || [] ) {
		out.push( { node: r.node, block: r.block ?? blockOf[ r.node ] ?? null, slot: r.slot ?? '', property: r.property, value: r.value ?? null, via: 'unmapped' } );
	}
	return out;
}

/**
 * @param {Object}   report A saved fill-report.json.
 * @param {Function} calFor ( block ) => the block's calibration with its default paint's `elements`, or null.
 * @return {Object[]} The rows of every family this detector knows.
 */
export function settingFamilyRows( report, calFor ) {
	const out = [];
	for ( const r of reportRows( report ) ) {
		if ( r.block && '' === r.slot && PICTURE_LOOK.has( r.property ) && null !== picturePart( calFor( r.block ) ) ) {
			out.push( { family: 'picture-box', ...r } );
		}
	}
	return out;
}
