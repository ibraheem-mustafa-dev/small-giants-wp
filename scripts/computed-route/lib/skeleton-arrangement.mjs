// How a block that draws a list lays its items out, from how the draft lays them out (data/skeleton-decisions.json
// `rules.listArrangement`). A timeline block draws its entries down the page by default; a draft that sets the same entries
// side by side in one row (each a year, a title and a line of words under a connecting line) is the block's horizontal
// orientation. The block is the client's or a rule's choice; this only reads the draft's geometry for the block's own setting.

// Whether the items sit in one row: each has a box, each starts at or beyond the previous one's right edge, and each overlaps
// the first item's vertical extent. box( e ): the element's box { x, y, w, h } at the widest width it renders at, or null.
export function inOneRow( items, box ) {
	const boxes = items.map( box );
	return boxes.length >= 2 && boxes.every( Boolean ) && boxes.every( ( b, i ) => ( ! i || b.x >= boxes[ i - 1 ].x + boxes[ i - 1 ].w - 1 ) && b.y < boxes[ 0 ].y + boxes[ 0 ].h && boxes[ 0 ].y < b.y + b.h );
}

// The setting a listed block takes for its items' arrangement: { [setting]: value } when the draft sets them in one row, else {}.
// rule: `rules.listArrangement` ({ blocks: [ { block, setting, value } ] }); items: the draft's repeated units under the block's
// element; box: lib/skeleton-model.mjs::inventoryModel's `box`.
export function listArrangement( { rule, block, items, box } ) {
	const hit = ( rule?.blocks || [] ).find( ( b ) => b.block === block );
	return hit && inOneRow( items, box ) ? { [ hit.setting ]: hit.value } : {};
}
