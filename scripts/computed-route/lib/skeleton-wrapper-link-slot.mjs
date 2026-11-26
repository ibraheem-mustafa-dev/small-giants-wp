// The element a rule unwraps around a block that draws that element itself: a link round a logo is the logo block's own link
// part, so the link's look is read there (data/skeleton-decisions.json `rules.<rule>.linkSlots`) where the part reads it: the
// looks of the settings calibrated at the part's slot, and a look the part paints by default at the value the link declares.
// The draft sizes the logo by its link (`<a style="width:240px; max-width:100%">` round an image of `width:100%`); with the link
// dissolved and no slot, Fill read the image's `100%` (which no setting holds) and the logo filled its column.
// The slot path is one of the setting's own calibrated slots, never a path the calibration did not measure.
import { lookOfProperty, looksOfEntry } from './skeleton-paint-conservation.mjs';

const low = ( v ) => String( v ?? '' ).trim().toLowerCase();
// The one longhand a shorthand declared as a lone keyword sets (`text-decoration: none` draws no line), so such a shorthand is
// compared with the default paint's value of that longhand.
const KEYWORD_LONGHAND = { 'text-decoration': 'text-decoration-line' };

// The looks of an unwrapped wrapper that a block's part reads at `slot`: the look of each setting whose calibration reaches
// the slot (`settings`: the block's calibrated settings, each with its `property`), and each look the wrapper declares
// (`declared`: property -> value) only at values the part paints by default at every width the wrapper renders at (`paint`:
// the block's default paint, { slot: { width: { property: value } } }, lib/skeleton-context.mjs::calPartsFor; `widths`). A
// look the default paint records no value for, or declares a value the part does not paint, is not read.
export function linkSlotLooks( { slot, settings = {}, paint = null, declared = {}, widths = [] } ) {
	const looks = new Set( Object.values( settings || {} ).filter( ( x ) => [ x?.slot, ...( x?.slots || [] ) ].includes( slot ) ).flatMap( ( x ) => looksOfEntry( x ) ) );
	const at = paint?.[ slot ];
	if ( ! at || ! widths.length ) {
		return [ ...looks ];
	}
	const painted = ( p ) => widths.every( ( w ) => undefined !== at[ w ]?.[ p ] );
	const same = ( p, v ) => {
		const long = painted( p ) ? p : /^\S+$/.test( low( v ) ) && KEYWORD_LONGHAND[ p ] && painted( KEYWORD_LONGHAND[ p ] ) ? KEYWORD_LONGHAND[ p ] : null;
		return !! long && widths.every( ( w ) => low( at[ w ][ long ] ) === low( v ) );
	};
	const byLook = new Map();
	Object.entries( declared || {} ).forEach( ( [ p, v ] ) => {
		const look = lookOfProperty( p );
		look && byLook.set( look, [ ...( byLook.get( look ) || [] ), [ p, v ] ] );
	} );
	byLook.forEach( ( pairs, look ) => pairs.every( ( [ p, v ] ) => same( p, v ) ) && looks.add( look ) );
	return [ ...looks ];
}

// rule: the unwrapping rule's decisions ({ linkSlots: [ { block, setting, slot } ] }); e: the unwrapped element; built: the nodes
// the unwrapped element's children became; calSettings( block ): the block's calibrated settings; finder( e ): the walker finder;
// expected: the verdict's `link-slot` records (lib/skeleton-rules.mjs::ruleFor's unwrap guard dissolved the element on the
// prediction that a block of `rules.<rule>.linkSlots` built under it takes it at `slot`).
// Gives the one node of a listed block its `draftSlots` entry (and the row's) and returns { notes }: a note says when the
// prediction failed, so the looks the guard took as read there are read by nothing (the conservation check fails the record).
export function wrapperLinkSlot( { rule, e, built, calSettings, finder, expected = [] } ) {
	const out = { notes: [] };
	for ( const entry of rule?.linkSlots || [] ) {
		const nodes = ( built || [] ).filter( ( n ) => n?.name === entry.block );
		if ( ! nodes.length ) {
			expected.filter( ( x ) => x?.slot === entry.slot ).forEach( ( x ) => out.notes.push( `the link was dissolved for the ${ entry.block } link slot, but its children built no ${ entry.block } block: its ${ [].concat( x.looks || [] ).join( ', ' ) } is read by nothing` ) );
			continue;
		}
		const calibrated = calSettings( entry.block )?.[ entry.setting ];
		if ( 1 !== nodes.length ) {
			out.notes.push( `the link holds ${ nodes.length } ${ entry.block } blocks, so its look is read for none of them` );
		} else if ( ! [ calibrated?.slot, ...( calibrated?.slots || [] ) ].includes( entry.slot ) ) {
			out.notes.push( `the calibration has no ${ entry.slot } slot for ${ entry.setting }, so the unwrapped link's look is not read` );
		} else {
			nodes[ 0 ].draftSlots = { ...nodes[ 0 ].draftSlots, [ entry.slot ]: finder( e ) };
		}
	}
	return out;
}
