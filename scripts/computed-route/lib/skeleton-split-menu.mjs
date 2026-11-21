// A header menu drawn in two halves in the skeleton (Spec 48 FR-48-30, decisions `rules.splitMenu`). Intake makes the
// navigation links on the logo's far side from the header's nav items of the nav's own menu, flagged `splitItem`, and the
// menu records where it splits (`splitAfter`, lib/intake-pagemap-split.mjs). The skeleton draws that menu twice: the nav as
// one `sgs/nav-bar-menu` and the far side's links as a second one bound to the same menu (`ref`), each with `splitSide` and
// the identifier of the item the split falls after (`splitAfterItemId`, carried from menu-map.json). The first far-side link
// in the draft is the second half's block; the others are absorbed into it. The second half has no element of its own:
// its links sit in a group beside other controls, so its outer element and its bar are read at that group (its gap and
// padding) and its items at its first link (their padding, type and colour), never the link's box on the outer element.
const squash = ( s ) => String( s || '' ).replace( /\s+/g, ' ' ).trim().toLowerCase();

// The header menu's split, from the draft's menus (lib/intake-pagemap.mjs::proposePageMap's `menuItems`): { menu, after
// (the label of the item the split falls after), labels (the far side's item labels, squashed), first ('nav' when the nav's
// items come first, else 'links') }, or null when the main header menu is not split.
export function splitMenuOf( menuItems ) {
	const menu = ( menuItems || [] ).find( ( m ) => 'header' === m.region && 'header' === m.menu );
	const labels = new Set( ( menu?.items || [] ).filter( ( it ) => it.splitItem && ! it.parentItem ).map( ( it ) => squash( it.label ) ).filter( Boolean ) );
	if ( ! menu?.splitAfter?.label || ! labels.size ) {
		return null;
	}
	return { menu: menu.menu, after: menu.splitAfter.label, labels, first: menu.items[ 0 ]?.splitItem ? 'links' : 'nav' };
}

// The far-side link a header element is, or null: a link or button outside every `nav` whose aria-label or words are a
// split item's label. Returns { key (the element's), first (the key of the far side's first link in document order, which
// is the block), group (the key of the element holding the first link) }. `els` are the inventory's elements in document
// order, `byKey` maps keys to them.
export function splitLinkOf( { e, els, byKey, split, surfaceKind } ) {
	const isLink = ( x ) => {
		if ( 'header' !== surfaceKind || ! split || ! [ 'a', 'button' ].includes( x.tag ) || ! split.labels.has( squash( x.attrs?.[ 'aria-label' ] || x.words ) ) ) {
			return false;
		}
		for ( let up = byKey[ x.parentKey ]; up; up = byKey[ up.parentKey ] ) {
			if ( 'nav' === up.tag ) {
				return false;
			}
		}
		return true;
	};
	if ( ! isLink( e ) ) {
		return null;
	}
	const first = els.find( isLink );
	return { key: e.key, first: first.key, group: first.parentKey };
}

// Where a half reads its look: `at` is the element its outer element and bar are read at (the nav itself, or the group
// holding the far side's links), `link` the far side's first link (null for the nav's half, whose item slot the drawing
// block's child slots give, lib/skeleton-child-slots.mjs::childSlots). `settings` is `rules.splitMenu.slots`: { bar: [
// settings read at the bar ], item: [ settings read at an item link ] }; `calibrated` the block's calibrated settings.
// Returns { slots: { <path>: finder }, notes }: each setting's calibrated slot read at its element.
export function splitSlots( { at, link = null, finder, settings = {}, calibrated = {} } ) {
	const out = { slots: {}, notes: [] };
	const put = ( names, el, what ) => ( names || [] ).forEach( ( s ) => {
		const slot = calibrated[ s ]?.slot;
		'string' === typeof slot && '' !== slot && ! slot.includes( '::' ) ? ( out.slots[ slot ] = finder( el ) ) : out.notes.push( `the calibration has no element slot for ${ s }, so the half's ${ what } is not read for it` );
	} );
	put( settings.bar, at, 'bar' );
	link && put( settings.item, link, 'items' );
	return out;
}

// The side each half takes: the nav's half and the far side's half, as `splitSide` values.
export const sidesOf = ( split ) => ( 'links' === split.first ? { nav: 'after', links: 'before' } : { nav: 'before', links: 'after' } );
