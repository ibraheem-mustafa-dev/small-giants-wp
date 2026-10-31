// The price a draft shows per unit of a pack size (Spec 27 FR-27-B3: `sgs/buybox` `perUnitDenomination`, "£1.19 each").
// It is found in the draft's data, never in its markup: a list of records each holding a pack count (an integer of 2 or
// more), the pack's price and a text that starts with a currency amount equal to the price divided by the count, for every
// record. The words after the amount are the unit word the draft uses ("each", "per cookie"). A text whose amount is not
// the price per count (a was-price, a saving, a delivery charge) is no per-unit line.
import { valueOf } from './catalogue-source.mjs';

const AMOUNT = /^[£$€¥₹]\s?(\d+(?:\.\d+)?)\s*(.*)$/;

// [ { field, word, count, price } ] for each text field of the draft's record lists that is a price per unit.
export function perUnitFields( ctx ) {
	const found = new Map();
	for ( const src of ctx.sources ) {
		for ( const node of src.idx.all.filter( ( n ) => 'ArrayExpression' === n.type ) ) {
			const rows = valueOf( ctx, src, node );
			if ( ! Array.isArray( rows ) || rows.length < 2 || ! rows.every( ( r ) => r && 'object' === typeof r && ! Array.isArray( r ) ) ) {
				continue;
			}
			for ( const field of Object.keys( rows[ 0 ] ).filter( ( k ) => 'string' === typeof rows[ 0 ][ k ] ) ) {
				const parsed = rows.map( ( r ) => AMOUNT.exec( String( r[ field ] ?? '' ) ) );
				if ( parsed.some( ( p ) => ! p || ! p[ 2 ] ) || new Set( parsed.map( ( p ) => p[ 2 ] ) ).size > 1 ) {
					continue;
				}
				for ( const count of Object.keys( rows[ 0 ] ).filter( ( k ) => rows.every( ( r ) => Number.isInteger( r[ k ] ) && r[ k ] >= 2 ) ) ) {
					const price = Object.keys( rows[ 0 ] ).find( ( k ) => k !== count && rows.every( ( r, i ) => 'number' === typeof r[ k ] && r[ k ] > 0 && Math.abs( Number( parsed[ i ][ 1 ] ) - r[ k ] / r[ count ] ) <= 0.0051 ) );
					price && ! found.has( field ) && found.set( field, { field, word: parsed[ 0 ][ 2 ], count, price } );
				}
			}
		}
	}
	return [ ...found.values() ];
}
