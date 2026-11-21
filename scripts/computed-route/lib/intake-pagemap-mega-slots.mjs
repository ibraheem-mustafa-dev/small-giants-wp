// The header menu slots of the mega-menu panels a draft draws as one panel element below its header (Spec 48 FR-48-30,
// lib/intake-pagemap-surfaces.mjs::codeSurfaces). Each panel is opened by one header control; that control is a header
// nav item, and the panel's row takes the item's slot (lib/site-build-menus.mjs: a page row on the same slot becomes the
// panel's section page, and a slot with no page is the panel's own item). An opener the header's menu lacks but that
// sits inside the menu's own element (a control the item reader skipped) joins the menu at its place in the document. An
// opener on the logo's far side of the nav's bar is already an item of the menu's second half (lib/intake-pagemap-split.mjs),
// so it keeps that slot. An opener outside the menu's element and outside its bar (a control in another row of the header)
// is a different menu: those openers make a second header menu, in document order, which that row draws
// (lib/skeleton-mega-opener.mjs). With no header menu at all, the openers make one.

// `menu` is the header's menu ({ menu, items }) or null; `openers` the elements that open each panel (null when a
// panel has no single opener); `anchorOf( item )` the element a top-level item was read from; `inside( opener )` whether
// an opener sits inside the menu's own element; `itemOf( opener )` a new top-level item for an opener; `newMenu()` an
// empty header menu (for a header with none, and for the openers outside the menu). Items are renumbered 1..n in
// document order. Returns a Map from each opener to its { menu, position }.
export function megaSlots( { menu, openers, anchorOf, inside = () => true, itemOf, newMenu } ) {
	const wanted = [ ...new Set( openers.filter( Boolean ) ) ];
	const slots = new Map();
	if ( ! wanted.length ) {
		return slots;
	}
	const main = menu || newMenu();
	const lacking = wanted.filter( ( x ) => ! main.items.some( ( it ) => anchorOf( it ) === x ) );
	const outside = menu ? lacking.filter( ( x ) => ! inside( x ) ) : [];
	const second = outside.length ? newMenu() : null;
	const place = ( target, openersFor ) => {
		for ( const o of openersFor ) {
			const at = target.items.findIndex( ( it ) => anchorOf( it )?.index > o.index );
			target.items.splice( -1 === at ? target.items.length : at, 0, itemOf( o ) );
		}
		target.items.forEach( ( it, i ) => { it.position = i + 1; } );
	};
	place( main, lacking.filter( ( x ) => ! outside.includes( x ) ) );
	second && place( second, outside );
	for ( const o of wanted ) {
		const target = outside.includes( o ) ? second : main;
		const it = target.items.find( ( x ) => anchorOf( x ) === o );
		if ( it ) {
			slots.set( o, { menu: target.menu, position: it.position } );
		}
	}
	return slots;
}
