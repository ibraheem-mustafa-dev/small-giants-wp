// A setting that belongs to one variant of a block (Spec 48 FR-48-8, R-47-4; plan RF1): the nav menus' `featured*` settings
// style the item the author marks featured, and their stored selector says so with an element modifier on an ancestor of the
// part (`.sgs-nav-bar-menu__item--featured .sgs-nav-bar-menu__link`). The setting's own `css_element` names the variant
// (`featured`), so the setting is variant-only when every selector that paints it carries `--<css_element>` on a compound above
// the part, on an element other than the part's own (`sgs-post-grid__card--card` is a block style variant of the card, not an
// item the author singles out). `current` is a condition the route reads as a state (lib/fill-current-item.mjs,
// lib/fill-current-attr.mjs), never a variant a node is drawn in.

const CONDITION_ELEMENTS = new Set( [ 'current' ] );
const FUNCTIONAL = /:(?:not|is|where|has)\((?:[^()]|\((?:[^()]|\([^()]*\))*\))*\)/g;
const classesOf = ( text ) => [ ...String( text ).replace( FUNCTIONAL, '' ).matchAll( /\.([A-Za-z0-9_-]+)/g ) ].map( ( m ) => m[ 1 ] );

// Whether one row's selector (comps: setting-record.mjs::compounds of it) holds the variant modifier above its part.
export function rowHoldsVariant( comps, part, element ) {
	if ( ! element || CONDITION_ELEMENTS.has( element ) || ! comps?.length ) {
		return false;
	}
	const own = String( part ?? '' ).split( '::' )[ 0 ].trim();
	if ( ! own || /\s/.test( own ) || 'ROOT' === own ) {
		return false;
	}
	const at = comps.map( ( c ) => classesOf( c.text ).includes( own ) ).lastIndexOf( true );
	return comps.slice( 0, Math.max( at, 0 ) ).some( ( c ) => classesOf( c.text ).some( ( k ) => {
		const [ base, mod ] = k.split( '--' );
		return mod === element && base.includes( '__' ) && base.split( '__' ).pop() !== element;
	} ) );
}

// The variant a setting is limited to (its `css_element`), or null: every row that paints it must hold the modifier.
export function variantOnlyOf( rows, element, compoundsOf ) {
	return rows.length > 0 && rows.every( ( r ) => rowHoldsVariant( compoundsOf( r.selector ), r.part, element ) ) ? element : null;
}

// Whether a node drawn in `variants` (the css_elements it is drawn in: `featured`) may take a setting; the entry is a
// setting-record entry.
export const variantHeld = ( entry, variants ) => ! entry?.variantOnly || ( variants || [] ).includes( entry.variantOnly );
