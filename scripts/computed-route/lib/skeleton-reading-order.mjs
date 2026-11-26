// A skeleton's reading order against the draft's (Spec 48 FR-48-6, section 3.4): the blocks a row holds, each standing for a
// draft element, follow the order the draft draws those elements in at every width they show at. A block that lands after one
// the draft draws below or beside it, at a width both show at, reads wrong there (Mama's header put the navigation after the
// icons at 1440 when a merge of two width alternatives dropped the moved block to the tail). Pure: the inventory model and the
// skeleton tree only, no browser, no site.
const WIDTHS = [ 375, 768, 1440 ];
const TOLERANCE = 1;

// Whether the box `a` comes before the box `b` in the draft's reading: wholly above it, or, when the two share a row (their
// vertical extents overlap), wholly to its left. null when neither is true (the boxes overlap: no order is claimed).
export function before( a, b ) {
	if ( a.y + a.h <= b.y + TOLERANCE ) {
		return true;
	}
	if ( b.y + b.h <= a.y + TOLERANCE ) {
		return false;
	}
	if ( a.x + a.w <= b.x + TOLERANCE ) {
		return true;
	}
	return b.x + b.w <= a.x + TOLERANCE ? false : null;
}

const usable = ( box ) => !! box && [ box.x, box.y, box.w, box.h ].every( Number.isFinite ) && box.w > 0 && box.h > 0;

// The nodes of one list (a node's innerBlocks, or the top level) that stand for a draft element, with the element.
const standing = ( list, m ) => ( list || [] ).map( ( node ) => ( { node, el: m.byKey[ node.draftRef?.tpl ] } ) ).filter( ( x ) => x.el );

/**
 * @param {Object}   o
 * @param {Object[]} o.skeleton The skeleton tree (a list of nodes; a node holds `innerBlocks`, `draftRef.tpl`).
 * @param {Object}   o.m        lib/skeleton-model.mjs::inventoryModel.
 * @param {string[]} o.rows     The block names whose children are checked (rules.headerSlots.rowBlock: the header's rows, which a
 *                              merge of width alternatives orders; a grid of columns is not a reading order of its own).
 * @return {string[]} One line per list and width where a block follows one the draft draws after it.
 */
export function readingOrderProblems( { skeleton, m, rows = [] } ) {
	const out = [];
	const check = ( list, where, row ) => {
		const items = row ? standing( list, m ) : [];
		for ( const w of WIDTHS ) {
			const shown = items.filter( ( x ) => x.el.visible?.[ w ] && usable( x.el.box?.[ w ] ) );
			const misplaced = [];
			for ( let i = 1; i < shown.length; i++ ) {
				const earlier = shown.slice( 0, i ).find( ( x ) => false === before( x.el.box[ w ], shown[ i ].el.box[ w ] ) );
				earlier && misplaced.push( `${ shown[ i ].el.key } follows ${ earlier.el.key }` );
			}
			misplaced.length && out.push( `reading order at ${ w }px in ${ where }: ${ misplaced.join( '; ' ) } (the draft draws the second before the first)` );
		}
		( list || [] ).forEach( ( node ) => node.innerBlocks?.length && check( node.innerBlocks, node.draftRef?.tpl ?? node.name, rows.includes( node.name ) ) );
	};
	check( Array.isArray( skeleton ) ? skeleton : skeleton?.skeleton, 'the top level', false );
	return out;
}
