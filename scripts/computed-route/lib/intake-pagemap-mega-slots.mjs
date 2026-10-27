// The header menu slots of the mega-menu panels a draft draws as one panel element below its header (Spec 48 FR-48-30,
// lib/intake-pagemap-surfaces.mjs::codeSurfaces). Each panel is opened by one header control; that control is a header
// nav item, and the panel's row takes the item's slot (lib/site-build-menus.mjs: a page row on the same slot becomes the
// panel's section page, and a slot with no page is the panel's own item). An opener outside the header's menu (a
// control in another cluster of the header bar) joins the menu at its place in the document, so every item the header
// shows has a position; with no header menu at all, the openers make one.

// `menu` is the header's menu ({ menu, items }) or null; `openers` the elements that open each panel (null when a
// panel has no single opener); `anchorOf( item )` the element a top-level item was read from; `itemOf( opener )` a new
// top-level item for an opener the menu lacks; `newMenu()` an empty header menu for a header that has none. Items are
// renumbered 1..n in document order. Returns a Map from each opener to its { menu, position }.
export function megaSlots( { menu, openers, anchorOf, itemOf, newMenu } ) {
	const wanted = [ ...new Set( openers.filter( Boolean ) ) ];
	const slots = new Map();
	if ( ! wanted.length ) {
		return slots;
	}
	const target = menu || newMenu();
	for ( const o of wanted.filter( ( x ) => ! target.items.some( ( it ) => anchorOf( it ) === x ) ) ) {
		const at = target.items.findIndex( ( it ) => anchorOf( it )?.index > o.index );
		target.items.splice( -1 === at ? target.items.length : at, 0, itemOf( o ) );
	}
	target.items.forEach( ( it, i ) => { it.position = i + 1; } );
	for ( const o of wanted ) {
		const it = target.items.find( ( x ) => anchorOf( x ) === o );
		if ( it ) {
			slots.set( o, { menu: target.menu, position: it.position } );
		}
	}
	return slots;
}
