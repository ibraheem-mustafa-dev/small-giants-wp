// A draft wrapper its parent block absorbs (Spec 48 section 3.4, paint conservation; Bean, 2026-11-21): a wrapper the rules
// would dissolve whose look no reader takes, that is its parent's only content and paints only looks the parent block's own
// settings paint at one part of the block, is that part's draft element on the parent's node. Its values are read there and
// written on the parent's settings, and it makes no node of its own. A wrapper with a sibling, a look no setting of the parent
// paints at that part (a background, a border, a shadow, a radius), a position of its own, or a parent whose part is taken or
// whose own element paints the same look (other than padding, which adds) stays a node.
//   absorbSlot    the part of the block where its settings paint every look, from the block's calibration.
//   onlyContent   whether the wrapper is the only content of its parent element.
//   positioned    whether the wrapper places itself (a position other than static).
//   clash         the looks the parent's own element paints that the wrapper's values would overwrite.
// Pure functions over the inventory model and the calibration's slot map: no browser, no site, no database.
import { lookOfProperty } from './skeleton-paint-conservation.mjs';

// The looks the parent's own element and the wrapper both paint that add up: the wrapper's padding sits inside the parent's,
// so the part's padding is the two summed per side (lib/fill-absorbed.mjs::sumAbsorbedPadding).
export const ADDITIVE_LOOKS = [ 'padding' ];

// The depth of a slot path: how many element steps it takes from the block's root.
const depthOf = ( slot ) => String( slot ).split( /\s*>\s*|\s+/ ).filter( Boolean ).length;

// The part where the block's settings paint every look the wrapper paints: { slot, settings } or null. A setting counts at
// each of its calibrated slots (`slots`, else `slot`), in its resting state, for the look its property paints
// (lookOfProperty), and only a part that holds another calibrated element is a home for a wrapper of children. So the block's
// root (slot '', the parent's own element) and a pseudo layer never qualify: a calibrated path is written from inside the
// root, and no path continues past a pseudo layer with a step. Where several parts qualify, the outermost (the fewest steps
// from the root) is the one the wrapper stands for.
export function absorbSlot( { looks, settings } ) {
	if ( ! looks?.length || ! settings ) {
		return null;
	}
	const at = new Map();
	for ( const [ name, c ] of Object.entries( settings ) ) {
		const look = c && ! c.state ? lookOfProperty( c.property ) : null;
		if ( ! look || ! looks.includes( look ) ) {
			continue;
		}
		for ( const slot of [ ...new Set( c.slots || ( undefined !== c.slot ? [ c.slot ] : [] ) ) ] ) {
			if ( 'string' !== typeof slot ) {
				continue;
			}
			const row = at.get( slot ) ?? { looks: new Set(), settings: [] };
			row.looks.add( look );
			row.settings.push( name );
			at.set( slot, row );
		}
	}
	// The wrapper holds the block's children, so its part is one that holds another calibrated element (a path a setting paints
	// or reaches lies inside it): the content band, never a child the calibration's fixture puts inside it.
	const paths = Object.values( settings ).flatMap( ( c ) => [ ...( c?.slots || [] ), c?.slot, ...( c?.reaches || [] ) ] ).filter( ( p ) => 'string' === typeof p );
	const holds = ( slot ) => paths.some( ( p ) => p.startsWith( slot ) && /^(?:\s*>\s*|\s+)[^\s:]/.test( p.slice( slot.length ) ) );
	const fits = [ ...at.entries() ].filter( ( [ slot, r ] ) => holds( slot ) && looks.every( ( l ) => r.looks.has( l ) ) ).sort( ( a, b ) => depthOf( a[ 0 ] ) - depthOf( b[ 0 ] ) || a[ 0 ].localeCompare( b[ 0 ] ) );
	return fits.length ? { slot: fits[ 0 ][ 0 ], settings: [ ...fits[ 0 ][ 1 ].settings ].sort() } : null;
}

// Whether a child draws a box at some width it renders at: a part of its parent (an svg, an element never shown) or a box of
// no width or no height at every width (an empty anchor, a script mount point) is no content the parent's settings would pad,
// cap, align or lay out. A child shown only at some widths counts there.
const drawsBox = ( m, k ) => ! m.isPart( k ) && m.shownAt( k ).some( ( w ) => ( k.box?.[ w ]?.w ?? 0 ) > 0 && ( k.box?.[ w ]?.h ?? 0 ) > 0 );

// Whether the wrapper is its parent element's only content: no other child draws a box (drawsBox) and the parent prints no
// words of its own.
export function onlyContent( m, parent, e ) {
	return !! parent && e.parentKey === parent.key && ! m.words( parent ) && ! m.kids( parent ).some( ( k ) => k !== e && drawsBox( m, k ) );
}

// Whether the wrapper places itself: a declared position, or a rendered one (the inventory's `position`, or a computed read at
// a width), other than static.
export function positioned( e, declared = {} ) {
	const off = ( v ) => [ '', 'static', 'initial', 'unset' ].includes( String( v ?? '' ).trim().toLowerCase() );
	return ! off( declared.position ) || ! off( e.position ) || Object.values( e.resolved || {} ).some( ( r ) => ! off( r?.position ) );
}

// The looks the wrapper hands its parent that the parent's own element already paints and that do not add up: the wrapper's
// values would overwrite the parent's. `parentLooks` is what the parent's element paints (paintsBox), `parentLays` whether it
// lays its children out itself (a flex or grid display at a width it renders at), which its one child does not show as a look.
export function clash( { looks, parentLooks = [], parentLays = false } ) {
	return looks.filter( ( l ) => ! ADDITIVE_LOOKS.includes( l ) && ( parentLooks.includes( l ) || ( 'layout' === l && parentLays ) ) );
}
