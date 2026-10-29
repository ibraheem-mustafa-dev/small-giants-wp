// The header's scroll behaviours as block settings (Spec 48 FR-48-77, Spec 37 §4, register row C3): whether the draft's header
// pins at each device tier (`headerSticky`), shrinks once the page has scrolled (`headerShrink`, with the scroll distance
// `scrolledOffset`) and blurs what is behind it (`surfaceBlur`). Every value is the draft's rendered one: the computed position
// at each read width (lib/fill-read.mjs::readDraft), the header's height and backdrop blur at rest and after the window has
// scrolled (lib/fill-read-scrolled.mjs). The scrolled background is a state setting the state pass and Solve write
// (`backgroundColourScrolled`); a block that declares none of these settings gets none and nothing is raised for it.
import { setAttr } from './tree.mjs';
import { READ_WIDTHS } from './fill-read.mjs';

// The device tiers, widest first, and the read width each is read at.
const TIERS = [ [ 'desktop', 1440 ], [ 'tablet', 768 ], [ 'mobile', 375 ] ];
// The smallest drop in height (px) that counts as a shrink: rounding in the box reads is not one.
const SHRINK_MIN_PX = 1;

// Whether a block is a header: it declares the pin and the shrink settings (a framework DB query through `hasAttr`).
export const isHeaderBlock = ( block, hasAttr ) => !! hasAttr?.( block, 'headerSticky' ) && !! hasAttr?.( block, 'headerShrink' );

// The ids of the targets that are a header block's root, across the skeleton's nodes: the ones the scrolled read covers.
export const headerRootIds = ( nodes, hasAttr ) => nodes.filter( ( n ) => isHeaderBlock( n.name, hasAttr ) ).flatMap( ( n ) => n.targets.filter( ( t ) => '' === ( t.slot ?? '' ) ).map( ( t ) => t.id ) );

// A per-tier on/off object from the state at each read width ({ 1440: true|false, ... }; a width with no entry was not read):
// `off` on every read tier where it does not hold, `on` at desktop where it holds, and a narrower tier that holds written `on`
// only beneath a tier that does not (a tier inherits the wider one). null when no tier holds it.
export function tierStates( held ) {
	if ( ! TIERS.some( ( [ , w ] ) => held[ w ] ) ) {
		return null;
	}
	const out = {};
	let inherited = 'off';
	for ( const [ tier, w ] of TIERS ) {
		if ( undefined === held[ w ] ) {
			continue;
		}
		const want = held[ w ] ? 'on' : 'off';
		if ( 'off' === want || 'desktop' === tier || inherited !== want ) {
			out[ tier ] = want;
		}
		inherited = want;
	}
	return out;
}

const PINS = /^(?:sticky|fixed)$/;

// The blur radius a backdrop-filter value holds, as a CSS length ('16px'), or null: none, or no blur() in it.
export function blurOf( value ) {
	const m = /\bblur\(\s*(\d*\.?\d+)px\s*\)/.exec( String( value ?? '' ) );
	return m && Number( m[ 1 ] ) > 0 ? `${ Number( m[ 1 ] ) }px` : null;
}

// Writes the header's settings for one target (the header's root) of a node. n: the skeleton node; t: its target; reads:
// lib/fill-read.mjs::readDraft's result; flat: the tree nodes by index; out: the Fill result sink; where: { node, block, slot };
// hasAttr: the framework DB's attribute check.
export function applyHeaderBehaviour( { n, t, reads, flat, out, where, hasAttr } ) {
	if ( ! reads || '' !== ( t.slot ?? '' ) || ! isHeaderBlock( n.name, hasAttr ) ) {
		return;
	}
	const node = flat[ n.index ];
	const put = ( attr, value, text ) => {
		if ( JSON.stringify( node.attributes?.[ attr ] ) === JSON.stringify( value ) ) {
			return;
		}
		const { before, after } = setAttr( node, { attr, value } );
		out.writes.push( { ...where, prop: attr, attr, before, after, widths: [], how: 'motion' } );
		out.notes.push( { ...where, text } );
	};
	const snap = ( w ) => reads.widths?.[ w ]?.[ t.id ];
	const drawn = READ_WIDTHS.filter( ( w ) => snap( w ) && ! snap( w ).missing );

	// Pinned: the computed position at each width the header is drawn at.
	const pinned = tierStates( Object.fromEntries( drawn.filter( ( w ) => snap( w ).position ).map( ( w ) => [ w, PINS.test( String( snap( w ).position ) ) ] ) ) );
	pinned && put( 'headerSticky', pinned, `the draft's header is position ${ drawn.map( ( w ) => `${ snap( w ).position } at ${ w }` ).join( ', ' ) }: pinned per tier` );

	// Shrinks: the header is shorter once the window has scrolled, at each width where it was read both ways.
	const scrolled = ( w ) => reads.scrolled?.[ w ]?.[ t.id ];
	const read = READ_WIDTHS.filter( ( w ) => scrolled( w ) );
	const shrunk = tierStates( Object.fromEntries( read.map( ( w ) => [ w, scrolled( w ).rest.height - scrolled( w ).scrolled.height >= SHRINK_MIN_PX ] ) ) );
	if ( shrunk ) {
		const heights = read.map( ( w ) => `${ scrolled( w ).rest.height }px to ${ scrolled( w ).scrolled.height }px at ${ w }` ).join( ', ' );
		put( 'headerShrink', shrunk, `the draft's header is shorter once the window has scrolled (${ heights }): shrinks on scroll` );
		const at = read.map( ( w ) => scrolled( w ).at ).find( ( v ) => null !== v && undefined !== v );
		null !== at && undefined !== at && undefined === node.attributes?.scrolledOffset && hasAttr( n.name, 'scrolledOffset' ) && put( 'scrolledOffset', at, `the draft's header changes once the window has scrolled past ${ at }px` );
	}

	// Blurs: the backdrop blur at rest, one length for every tier (surfaceBlur is a single setting).
	if ( hasAttr( n.name, 'surfaceBlur' ) ) {
		const rest = Object.fromEntries( drawn.filter( ( w ) => undefined !== snap( w ).styles?.[ 'backdrop-filter' ] ).map( ( w ) => [ w, blurOf( snap( w ).styles[ 'backdrop-filter' ] ) ] ) );
		const widest = [ ...drawn ].reverse().find( ( w ) => rest[ w ] );
		const gap = ( text, value ) => out.unmapped.push( { ...where, property: 'backdrop-filter', value, reason: text } );
		if ( widest ) {
			put( 'surfaceBlur', rest[ widest ], `the draft's header blurs what is behind it by ${ rest[ widest ] } at ${ widest }px` );
			const others = Object.entries( rest ).filter( ( [ , v ] ) => v !== rest[ widest ] );
			others.length && gap( `${ n.name } holds one blur for every width: ${ others.map( ( [ w, v ] ) => `${ v ?? 'none' } at ${ w }` ).join( ', ' ) } differs from ${ rest[ widest ] } at ${ widest }`, JSON.stringify( rest ) );
		} else {
			const only = read.find( ( w ) => blurOf( scrolled( w ).scrolled.backdropFilter ) );
			only && gap( `the draft's header blurs what is behind it (${ blurOf( scrolled( only ).scrolled.backdropFilter ) } at ${ only }px) only once the window has scrolled; surfaceBlur is a setting of the resting header, so no setting holds a blur that appears on scroll`, JSON.stringify( { rest: scrolled( only ).rest.backdropFilter, scrolled: scrolled( only ).scrolled.backdropFilter } ) );
		}
	}
}
