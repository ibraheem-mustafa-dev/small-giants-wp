// A property a setting of the block already owns, so a Custom CSS rule for it would cancel the setting (Spec 48 FR-48-109:
// a rule never fights a setting). The framework DB records no CSS property for these settings (`block_attributes.css_property`
// is null for `markerType`), so the pairing is read here: each entry names the CSS properties and the settings that
// draw them. A seeder column (`owns_css`) would replace this table (FP-1).
const OWNED_BY = [
	{ props: /^list-style(?:-type|-image|-position)?$/, settings: /^marker(?:Type|Image|Position)?$/ },
];

// The attribute of `attributes` (the node's settings) that owns `prop` and holds a value, or null.
export function ownedBySetting( prop, attributes ) {
	for ( const o of OWNED_BY.filter( ( x ) => x.props.test( prop ) ) ) {
		const attr = Object.keys( attributes || {} ).find( ( k ) => o.settings.test( k ) && null !== attributes[ k ] && undefined !== attributes[ k ] && '' !== attributes[ k ] );
		if ( attr ) {
			return attr;
		}
	}
	return null;
}
