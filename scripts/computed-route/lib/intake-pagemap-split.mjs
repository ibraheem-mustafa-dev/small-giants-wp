// A header menu drawn in two halves, either side of the logo (Spec 48 FR-48-30). A draft that puts navigation on both
// sides of its logo (a nav on one side; on the other, plain links of the same kind beside a phone number, an account
// icon and a basket) holds ONE header menu: the nav's items, then the links on the logo's far side, in draft order. The
// skeleton draws it as two `sgs/nav-bar-menu` blocks sharing the menu, split after the last item of the first half
// (lib/skeleton-split-menu.mjs).
//
// The header bar is the nav's nearest ancestor that holds a link to a page of the site outside the nav; the logo is that
// ancestor's first such link holding a picture, else its first such link (the link lib/intake-pagemap-templates.mjs::
// frontRoute names the front page by). A split item is an element of that bar, outside the nav, outside every mega panel
// and on the logo's far side from the nav, that `isNavigation` accepts (lib/intake-pagemap-surfaces.mjs::codeSurfaces:
// a link or a mega-panel opener, with static words of its own and no bound value inside it, that reaches a page of the
// site holding no password field or opens a mega panel). A control the nav's own side holds, and anything outside the
// bar (another row of the header), is no split item.
import { ancestors, descendants } from './intake-pagemap-surfaces.mjs';

const PICTURE = new Set( [ 'img', 'picture' ] );

// `nav` is the element the header menu was read from, `header` the header element, `routed( el )` whether a link
// element reaches a page of the site, `isNavigation( el )` the navigation test above, `panels` the mega panel elements.
// Returns { bar, logo, first ('nav' | 'links': which half comes first in the draft), links: [ element ] } or null when
// the header has no bar, no logo or no split item.
export function splitLinks( { nav, header, routed, isNavigation, panels = [] } ) {
	if ( ! nav ) {
		return null;
	}
	const inNav = ( x ) => x === nav || ancestors( x ).includes( nav );
	const ups = ancestors( nav );
	const top = ups.indexOf( header );
	for ( const bar of -1 === top ? [] : ups.slice( 0, top + 1 ) ) {
		const linked = descendants( bar ).filter( ( x ) => 'a' === x.name && ! inNav( x ) && routed( x ) );
		if ( ! linked.length ) {
			continue;
		}
		const logo = linked.find( ( x ) => descendants( x ).some( ( k ) => PICTURE.has( k.name ) ) ) || linked[ 0 ];
		const navFirst = nav.index < logo.index;
		const far = ( x ) => ( navFirst ? x.index > logo.index : x.index < logo.index );
		const inLogo = ( x ) => ancestors( x ).includes( logo );
		const inPanel = ( x ) => panels.some( ( p ) => x === p || ancestors( x ).includes( p ) );
		const links = descendants( bar ).filter( ( x ) => x !== logo && ! inLogo( x ) && ! inNav( x ) && ! inPanel( x ) && far( x ) && isNavigation( x ) )
			.filter( ( x, i, all ) => ! all.some( ( y ) => y !== x && ancestors( x ).includes( y ) ) );
		return links.length ? { bar, logo, first: navFirst ? 'nav' : 'links', links } : null;
	}
	return null;
}

// The header menu with its split items placed: `items` (the nav's numbered items) gain `made` (one new item per split
// link, flagged `splitItem`) after them when the nav comes first, else before them; every item is renumbered 1..n.
export function placeSplit( menu, made, first ) {
	menu.items = 'nav' === first ? [ ...menu.items, ...made ] : [ ...made, ...menu.items ];
	menu.items.forEach( ( it, i ) => { it.position = i + 1; } );
	return menu;
}

// Where a menu drawn in two halves splits, read from its final items (a mega opener the nav's items lacked is placed
// later, lib/intake-pagemap-mega-slots.mjs::megaSlots): { position, label } of the last item of the first half (the item
// before the first split item when the nav's items come first, else the last of the leading split items), or null for a
// menu with no split item or one whose split items are not all on one side.
export function splitPoint( items = [] ) {
	const at = items.findIndex( ( it ) => it.splitItem );
	if ( -1 === at ) {
		return null;
	}
	const run = items.slice( at ).findIndex( ( it ) => ! it.splitItem );
	const end = -1 === run ? items.length : at + run;
	if ( ( 0 === at && end === items.length ) || items.slice( end ).some( ( it ) => it.splitItem ) || ( at > 0 && end < items.length ) ) {
		return null;
	}
	const last = 0 === at ? items[ end - 1 ] : items[ at - 1 ];
	return { position: last.position, label: last.label };
}
