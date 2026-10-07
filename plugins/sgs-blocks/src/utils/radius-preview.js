/**
 * borderRadiusLonghands — the editor-canvas twin of includes/helpers-box.php's
 * sgs_corner_object_longhands(): the border radius at the previewed device tier,
 * as one longhand per set corner.
 *
 * The attribute is a tier object `{ desktop, tablet, mobile }`, each tier a
 * corner box `{ topLeft, topRight, bottomRight, bottomLeft }`. The desktop tier
 * may also be a single CSS length string (the uniform radius shape), and an
 * attribute with no tier key at all is the legacy flat shape whose whole value
 * is the desktop tier. A narrower tier overrides only the corners it declares;
 * the rest keep the wider tier's value, and a corner set at no tier keeps the
 * stylesheet's radius (the front-end rules are ordinary max-width media queries
 * that print only the set corners).
 *
 * @package SGS\Blocks
 */

const CORNERS = [ 'topLeft', 'topRight', 'bottomRight', 'bottomLeft' ];
const TIER_KEYS = [ 'desktop', 'tablet', 'mobile' ];

const LONGHAND_KEYS = {
	topLeft: 'borderTopLeftRadius',
	topRight: 'borderTopRightRadius',
	bottomRight: 'borderBottomRightRadius',
	bottomLeft: 'borderBottomLeftRadius',
};

/**
 * borderRadiusLonghands — the editor-canvas twin of the front end's per-corner
 * longhand output: only the corners the client set are returned, so an unset
 * corner keeps the stylesheet's own radius instead of being painted `0`.
 *
 * Accepts a tier object
 * `{ desktop, tablet, mobile }` of corner boxes, a desktop-only single CSS
 * length string (the uniform radius, all four corners), or the legacy flat
 * corner box whose whole value is the desktop tier. A narrower tier overrides
 * only the corners it declares. An explicit `0` counts as set; only undefined,
 * null and the empty string are unset.
 *
 * @param {Object|string|undefined} borderRadius The block's borderRadius attribute.
 * @param {string}                  [tier='desktop'] 'desktop' | 'tablet' | 'mobile'.
 * @return {Object} React style fragment of border*Radius longhands; {} when nothing is set.
 */
export function borderRadiusLonghands( borderRadius, tier = 'desktop' ) {
	const isObject = borderRadius && 'object' === typeof borderRadius && ! Array.isArray( borderRadius );
	const hasTierKey = isObject && TIER_KEYS.some( ( key ) => key in borderRadius );
	const desktop = hasTierKey ? borderRadius.desktop : borderRadius;
	const isSet = ( value ) => undefined !== value && null !== value && '' !== value;

	const merged = {};
	const apply = ( box ) => {
		if ( ! box || 'object' !== typeof box ) return;
		CORNERS.forEach( ( corner ) => {
			if ( isSet( box[ corner ] ) ) merged[ corner ] = box[ corner ];
		} );
	};
	if ( 'string' === typeof desktop && '' !== desktop ) {
		CORNERS.forEach( ( corner ) => {
			merged[ corner ] = desktop;
		} );
	} else {
		apply( desktop );
	}
	if ( hasTierKey && ( 'tablet' === tier || 'mobile' === tier ) ) apply( borderRadius.tablet );
	if ( hasTierKey && 'mobile' === tier ) apply( borderRadius.mobile );

	const style = {};
	CORNERS.forEach( ( corner ) => {
		if ( corner in merged ) style[ LONGHAND_KEYS[ corner ] ] = merged[ corner ];
	} );
	return style;
}
