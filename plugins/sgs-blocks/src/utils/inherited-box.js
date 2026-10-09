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

/** A `var()` call with an optional fallback: `var(--name)` or `var(--name, 2rem)`. */
const VAR_CALL_RE = /^var\(\s*(--[a-zA-Z0-9_-]+)\s*(?:,\s*(.+?)\s*)?\)$/;

/**
 * An unset side's declared or inherited default as the inspector words it, never a raw `var()`: a spacing preset
 * the theme offers gives its name (else its slug) and size; an unknown slug, or any other custom property, gives
 * its own fallback, else nothing; a plain length gives itself.
 *
 * @param {string}   value Declared or inherited value.
 * @param {Object[]} sizes The theme's spacing sizes, `{ slug, name, size }`.
 * @return {{label: string, size: string}} Option-label text and placeholder text ('' when there is none).
 */
export function inheritedDefault( value, sizes ) {
	if ( typeof value !== 'string' || ! value.trim() ) {
		return { label: '', size: '' };
	}
	const call = value.trim().match( VAR_CALL_RE );
	if ( ! call ) {
		return { label: value.trim(), size: value.trim() };
	}
	const slug = call[ 1 ].startsWith( '--wp--preset--spacing--' ) ? call[ 1 ].slice( '--wp--preset--spacing--'.length ) : null;
	const preset = slug ? ( sizes ?? [] ).find( ( s ) => s.slug === slug ) : undefined;
	if ( preset ) {
		return { label: preset.name || preset.slug, size: preset.size ?? '' };
	}
	return call[ 2 ] ? inheritedDefault( call[ 2 ], sizes ) : { label: '', size: '' };
}

const CORNER_KEYS = [ 'topLeft', 'topRight', 'bottomRight', 'bottomLeft' ];

/**
 * A radius tier stored as one length (`"8px"`, the uniform shape the canvas and the front end both read as four
 * corners) as the corner box the radius control edits; a corner box passes through, anything else is empty.
 *
 * @param {Object|string|undefined} value One tier of a radius.
 * @return {Object} Corner box.
 */
export function radiusAsCorners( value ) {
	if ( 'string' === typeof value && '' !== value ) {
		return Object.fromEntries( CORNER_KEYS.map( ( corner ) => [ corner, value ] ) );
	}
	return value && 'object' === typeof value ? value : {};
}
