/**
 * The card's photo as a Source object (Spec 49 §8): one file for every device.
 *
 * @package
 */

/**
 * A Media Library attachment, or a WooCommerce REST product image, as the `image` slot's Source.
 *
 * @param {{id?:number,url?:string,src?:string,width?:number,height?:number}} media The chosen file.
 * @return {Object} `{ desktop: { kind, id, url, width, height } }`.
 */
export function sourceFromMedia( media ) {
	return {
		desktop: {
			kind: 'image',
			id: media?.id || 0,
			url: media?.url || media?.src || '',
			width: media?.width || media?.sizes?.full?.width || 0,
			height: media?.height || media?.sizes?.full?.height || 0,
		},
	};
}

/**
 * The address of the file a Source shows on desktop, or the first device that has one.
 *
 * @param {*} source A stored Source.
 * @return {string} The address, '' when none.
 */
export function firstUrl( source ) {
	if ( ! source || typeof source !== 'object' ) {
		return '';
	}
	for ( const device of [ 'desktop', 'tablet', 'mobile' ] ) {
		const url = source[ device ]?.url;
		if ( url ) {
			return url;
		}
	}
	return '';
}

/**
 * A device value of a responsive object at desktop.
 *
 * @param {*} value A responsive value.
 * @return {*} The desktop value, or the value itself when it is not a responsive object.
 */
export function desktopOf( value ) {
	if ( value && typeof value === 'object' && ( 'desktop' in value || 'tablet' in value || 'mobile' in value ) ) {
		return value.desktop;
	}
	return value;
}
