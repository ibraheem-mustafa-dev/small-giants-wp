/**
 * The value a side or corner takes from a wider tier when its own tier leaves it unset.
 *
 * The front end and the canvas cascade desktop to tablet to mobile, so an unset side at a narrower tier
 * paints the nearest wider tier that sets it. The inspector shows that value as placeholder text in the
 * empty box; nothing is written until the client types.
 */

// `base` and `desktop` name the same widest tier: the box controls call it `base`, the override control `desktop`.
const WIDER_TIERS = {
	base: [],
	desktop: [],
	tablet: [ 'base', 'desktop' ],
	mobile: [ 'tablet', 'base', 'desktop' ],
};

const isSet = ( value ) => value !== undefined && value !== null && value !== '';

/**
 * @param {{base?: Object, tablet?: Object, mobile?: Object}} tierValues Box object per tier.
 * @param {string}                                            tier        'base' | 'tablet' | 'mobile'.
 * @param {string}                                            key         A side ('top') or corner ('topLeft').
 * @return {string} The nearest wider tier's value for `key`, or '' when the tier itself sets it or none does.
 */
export function inheritedBoxValue( tierValues, tier, key ) {
	if ( isSet( tierValues?.[ tier ]?.[ key ] ) ) {
		return '';
	}
	for ( const wider of WIDER_TIERS[ tier ] ?? [] ) {
		const value = tierValues?.[ wider ]?.[ key ];
		if ( isSet( value ) ) {
			return String( value );
		}
	}
	return '';
}

/**
 * @param {Object}   tierValues Box object per tier.
 * @param {string}   tier       Active tier.
 * @param {string[]} keys       Sides or corners of the family.
 * @return {Object} `{ key: inheritedValue }` for the keys that inherit something.
 */
export function inheritedBox( tierValues, tier, keys ) {
	const out = {};
	keys.forEach( ( key ) => {
		const value = inheritedBoxValue( tierValues, tier, key );
		if ( value !== '' ) {
			out[ key ] = value;
		}
	} );
	return out;
}
