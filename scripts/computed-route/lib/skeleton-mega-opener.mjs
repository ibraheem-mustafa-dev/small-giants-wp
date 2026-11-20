// The second header menu's openers in the skeleton (Spec 48 FR-48-30, decisions `rules.megaOpenerMenu`). The page map makes a
// header control outside the header's nav that opens a mega panel an item of a second header menu (lib/intake-pagemap-mega-slots.mjs,
// the item flagged `megaOpener`). The skeleton draws that control as a menu bar bound to that menu, not a button, so the
// item and its panel are one thing: `megaOpenerMenus` reads the draft's menus into the labels it names, and `menuOfOpener`
// names the menu a header element opens.
const squash = ( s ) => String( s || '' ).replace( /\s+/g, ' ' ).trim().toLowerCase();

// The menus a draft's header controls open: a Map from an opener's words to the name of its second header menu. Only a
// flagged item of a header menu other than the main one (named `header`) counts, and only a label held by one menu.
export function megaOpenerMenus( menuItems ) {
	const found = new Map();
	for ( const menu of menuItems || [] ) {
		if ( 'header' !== menu.region || 'header' === menu.menu ) {
			continue;
		}
		for ( const it of menu.items || [] ) {
			const label = squash( it.label );
			if ( it.megaOpener && label && ! it.parentItem ) {
				found.set( label, found.has( label ) && found.get( label ) !== menu.menu ? null : menu.menu );
			}
		}
	}
	return new Map( [ ...found ].filter( ( [ , menu ] ) => menu ) );
}

// The second header menu a header element opens, or null: a link or button outside every `nav` element, whose words or
// aria-label are a flagged item's label. `byKey` maps element keys to elements.
export function menuOfOpener( { e, byKey, openers, surfaceKind } ) {
	if ( 'header' !== surfaceKind || ! openers?.size || ! [ 'a', 'button' ].includes( e.tag ) ) {
		return null;
	}
	for ( let up = byKey[ e.parentKey ]; up; up = byKey[ up.parentKey ] ) {
		if ( 'nav' === up.tag ) {
			return null;
		}
	}
	return openers.get( squash( e.attrs?.[ 'aria-label' ] || e.words ) ) ?? null;
}
