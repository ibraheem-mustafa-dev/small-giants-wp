// The header links outside a header's <nav> that are laid out as the navigation's own links (Spec 48 §3.4 rule 3, decisions
// rules.navigationLink; lib/nav-link-look.mjs holds the look test shared with the skeleton): each is an item of the header
// menu, so the menu block draws it and the skeleton does not build a button for it. A link qualifies when it is a text-only
// anchor outside every <nav> and every sc-for list, and its look (size, case, tracking, inherited from its ancestors) is the
// look of the navigation's first link.
import { sameNavLook, inlineStyle } from './nav-link-look.mjs';

// header, nav: tree nodes (lib/intake-pagemap-surfaces.mjs::elementTree); attrOf, ancestors, descendants: that module's tree
// helpers, passed in. Returns the qualifying anchors in document order; a nav with no anchor has none to be like.
export function looseNavAnchors( { header, nav, attrOf, ancestors, descendants } ) {
	const model = descendants( nav ).find( ( x ) => 'a' === x.name );
	const declaredOf = ( n ) => inlineStyle( attrOf( n, 'style' ) );
	const parentOf = ( n ) => ( n.parent && '#root' !== n.parent.name ? n.parent : null );
	return descendants( header ).filter( ( a ) => 'a' === a.name
		&& ! ancestors( a ).some( ( up ) => 'nav' === up.name || 'sc-for' === up.name )
		&& ! descendants( a ).some( ( k ) => [ 'svg', 'img' ].includes( k.name ) )
		&& sameNavLook( a, model, declaredOf, parentOf ) );
}
