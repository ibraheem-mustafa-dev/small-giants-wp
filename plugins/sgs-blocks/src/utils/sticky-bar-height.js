/**
 * Shared publisher for `--sgs-sticky-bar-h` on `:root`.
 *
 * Any bar pinned to the bottom of the screen reports its height here while it is showing; the property
 * holds the tallest one, so floating widgets (whatsapp-cta) and the page's bottom padding leave room for it.
 * Each view bundle gets its own copy of this module, so the registry lives on the document element and every
 * bundle contributes to the same map.
 *
 * @package
 */

const HEIGHT_PROPERTY = '--sgs-sticky-bar-h';
const REGISTRY_KEY = '__sgsStickyBarHeights';

/** @return {Map<Element, number>} Heights of the bars showing now, keyed by bar element. */
function registry() {
	const root = document.documentElement;
	if ( ! root[ REGISTRY_KEY ] ) {
		root[ REGISTRY_KEY ] = new Map();
	}
	return root[ REGISTRY_KEY ];
}

/**
 * Record (height > 0) or clear (height 0) one bar's contribution and republish the property.
 *
 * @param {Element} bar    The bar element.
 * @param {number}  height The bar's height in px while it is showing; 0 when it is not.
 */
export function setStickyBarHeight( bar, height ) {
	const heights = registry();
	// A bar removed from the page no longer contributes.
	heights.forEach( ( _value, key ) => {
		if ( ! key.isConnected ) {
			heights.delete( key );
		}
	} );
	if ( height > 0 && bar.isConnected ) {
		heights.set( bar, height );
	} else {
		heights.delete( bar );
	}
	const style = document.documentElement.style;
	if ( heights.size ) {
		style.setProperty(
			HEIGHT_PROPERTY,
			Math.max( ...heights.values() ) + 'px'
		);
	} else {
		style.removeProperty( HEIGHT_PROPERTY );
	}
}
