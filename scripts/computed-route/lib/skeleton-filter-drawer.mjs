// The shop filter's narrow-width open state (Spec 48 FR-48-61): a surface of kind drawer whose root holds the filter groups of
// the draft catalogue's facets is the shop filter's own overlay, never a second drawer. The desktop rail is
// `woocommerce/product-filters` (lib/skeleton-filter-rail.mjs); this reads the same block's overlay settings from the drawer's
// open state: the block's overlay mode (`overlayMode`: `mobile` when the root shows as a rail at the widest width and as the
// drawer at a narrower one, `always` when it shows only as the drawer) and the side the panel opens from (`overlayPosition`,
// only when the open panel is anchored to one side of the viewport; a panel covering the whole viewport names no side). What
// the block's settings cannot carry (a full-viewport sheet, a fade, a locked page scroll, a sticky footer) is listed in
// `notes`, so it reads as a missing feature rather than a second static drawer. Found by structure from the catalogue's
// facets (lib/catalogue-facets.mjs), never by a name. Pure: the inventory model and the catalogue's filter data in.

const squash = ( s ) => String( s ?? '' ).replace( /\s+/g, ' ' ).trim();
const WIDTHS = [ 375, 768, 1440 ];

// o: { m (lib/skeleton-model.mjs), filters ({ facets }), rule (rules.filterDrawer), placeable (lib/skeleton-filter-rail.mjs::
// placeableFacets) }. Returns { attributes, notes, reason, facets (the labels found) } or null when the surface is no filter drawer.
export function filterDrawer( { m, filters, rule, placeable } ) {
	const root = m.root;
	const facets = placeable( filters?.facets );
	if ( ! rule || ! root ) {
		return null;
	}
	const under = ( e ) => {
		for ( let p = e; p; p = m.byKey[ p.parentKey ] ) {
			if ( p === root ) {
				return true;
			}
		}
		return false;
	};
	const labels = new Set( facets.map( ( f ) => squash( f.label ) ) );
	const found = [ ...new Set( m.els.filter( ( e ) => under( e ) && Object.values( e.visible || {} ).some( Boolean ) && labels.has( squash( m.words( e ) ) ) ).map( ( e ) => squash( m.words( e ) ) ) ) ];
	if ( found.length < rule.minFacets ) {
		return null;
	}
	const shown = ( w ) => !! root.visible?.[ w ];
	const narrow = WIDTHS.filter( ( w ) => w < 1440 && shown( w ) );
	const wide = shown( 1440 );
	const mode = wide && narrow.length ? rule.modes.rail : narrow.length ? rule.modes.drawer : null;
	if ( ! mode ) {
		return null;
	}
	const attributes = { [ rule.modeAttribute ]: mode };
	const notes = [];
	const box = root.box?.[ Math.min( ...narrow ) ];
	const view = Math.min( ...narrow );
	if ( box && box.w >= view * rule.fullShare && box.h > 0 ) {
		notes.push( `the open drawer covers the viewport at ${ view }px (${ box.w } wide), which ${ rule.block }'s overlay (a panel from one side) does not draw; its full-viewport sheet, fade, locked page scroll and sticky footer are a missing feature (FR-48-61)` );
	} else if ( box && box.w > 0 ) {
		attributes[ rule.positionAttribute ] = box.x <= 1 ? rule.sides.left : rule.sides.right;
	}
	return { attributes, notes, facets: found, reason: `${ rule.reason } (${ found.length } facet label(s) found: ${ found.join( ', ' ) }; ${ rule.modeAttribute } ${ mode })` };
}
