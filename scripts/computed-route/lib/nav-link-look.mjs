// The look that makes a text link outside a header's <nav> one of the navigation's items (Spec 48 §3.4 rule 3, decisions
// rules.navigationLink): the link and the navigation's own links declare the same value for every property of
// `properties` (size, case, tracking), each read as the draft sets it for the element, inherited from the nearest ancestor
// that declares it. One decision for the page map (lib/intake-pagemap-surfaces.mjs, which makes the link a menu item) and
// the skeleton (lib/skeleton-rules.mjs, which absorbs the link into the navigation block), so the two never disagree.
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const DECISIONS = path.join( path.dirname( fileURLToPath( import.meta.url ) ), '..', 'data', 'skeleton-decisions.json' );

// The properties the decisions entry compares.
export const NAV_LINK_PROPERTIES = JSON.parse( fs.readFileSync( DECISIONS, 'utf8' ) ).rules.navigationLink.properties;

// Parses an inline style declaration ("font-size: 13px; color: red") into { property: value } (lower-case names).
export function inlineStyle( text ) {
	const out = {};
	for ( const part of String( text || '' ).split( ';' ) ) {
		const at = part.indexOf( ':' );
		if ( at > 0 ) {
			out[ part.slice( 0, at ).trim().toLowerCase() ] = part.slice( at + 1 ).trim();
		}
	}
	return out;
}

// The value of `prop` an element is set to: its own declaration, else the nearest ancestor's. declaredOf( node ) is the node's
// own { property: value }; parentOf( node ) its parent or null.
export function inheritedDecl( node, prop, declaredOf, parentOf ) {
	for ( let x = node; x; x = parentOf( x ) ) {
		const value = declaredOf( x )[ prop ];
		if ( value ) {
			return value;
		}
	}
	return null;
}

// Whether two elements have the same look: every property declared for both, with equal values.
export function sameNavLook( a, b, declaredOf, parentOf, properties = NAV_LINK_PROPERTIES ) {
	return properties.every( ( p ) => {
		const mine = inheritedDecl( a, p, declaredOf, parentOf );
		return !! mine && mine === inheritedDecl( b, p, declaredOf, parentOf );
	} );
}
