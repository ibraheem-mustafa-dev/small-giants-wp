/**
 * Editor-canvas colours for sgs/wishlist-panel: the same element-by-element
 * mapping `render.php` and `render-colours.php` emit as scoped rules
 * (`sgs_text_states_css` / `sgs_fill_states_css`), as editor-only React style
 * objects. The front end renders no inline style (Spec 32).
 *
 * @package SGS\Blocks
 */
import { colourVar } from '../../utils';

/**
 * @param {string} slugOrColour Stored colour (palette slug or CSS colour).
 * @param {string} property     'color' or 'backgroundColor'.
 * @return {Object} One-property style object, {} when unset.
 */
function paint( slugOrColour, property ) {
	const value = colourVar( slugOrColour );
	return value ? { [ property ]: value } : {};
}

/**
 * @param {Object} attributes Block attributes.
 * @return {Object} Style object per canvas element.
 */
export function wishlistColourStyles( attributes ) {
	return {
		heading: paint( attributes.headingColour, 'color' ),
		// Mirrors render.php: no itemNameColour means the palette's text token.
		itemName: attributes.itemNameColour
			? paint( attributes.itemNameColour, 'color' )
			: { color: 'var(--wp--preset--color--text)' },
		price: paint( attributes.priceColour, 'color' ),
		priceDrop: paint( attributes.priceDropColour, 'color' ),
		stockChip: {
			...paint( attributes.stockChipBackgroundColour, 'backgroundColor' ),
			...paint( attributes.stockChipTextColour, 'color' ),
		},
		button: {
			...paint( attributes.buttonBackgroundColour, 'backgroundColor' ),
			...paint( attributes.buttonTextColour, 'color' ),
		},
		link: paint( attributes.linkColour, 'color' ),
		bar: paint( attributes.barBackgroundColour, 'backgroundColor' ),
		shareField: {
			...paint( attributes.shareFieldBackgroundColour, 'backgroundColor' ),
			...paint( attributes.shareFieldTextColour, 'color' ),
		},
	};
}

/** Narrower tiers fall back to the wider one, as render.php's media queries do. */
const TIER_FALLBACK = {
	desktop: [ 'desktop' ],
	tablet: [ 'tablet', 'desktop' ],
	mobile: [ 'mobile', 'tablet', 'desktop' ],
};

/**
 * @param {Object} tiers {desktop,tablet,mobile}.
 * @param {string} tier  The previewed device.
 * @param {Function} read Maps a stored value to a usable value or undefined.
 * @return {*} First usable value from the previewed tier outwards.
 */
function valueAtTier( tiers, tier, read ) {
	if ( ! tiers || 'object' !== typeof tiers ) {
		return undefined;
	}
	for ( const key of TIER_FALLBACK[ tier ] || TIER_FALLBACK.desktop ) {
		const value = read( tiers[ key ] );
		if ( undefined !== value ) {
			return value;
		}
	}
	return undefined;
}

/**
 * The grid's custom properties at the previewed tier: the same two
 * `render.php` sets, read by `style.css::.sgs-wishlist-panel__items`.
 *
 * @param {Object} attributes Block attributes.
 * @param {string} tier       'desktop' | 'tablet' | 'mobile'.
 * @return {Object} Custom properties for the wrapper, {} when none is set.
 */
export function wishlistGridStyle( attributes, tier = 'desktop' ) {
	const style = {};
	const columns = valueAtTier( attributes.columns, tier, ( raw ) => {
		const n = '' === raw || null === raw || undefined === raw ? NaN : Math.abs( parseInt( raw, 10 ) );
		return Number.isFinite( n ) && n > 0 ? n : undefined;
	} );
	if ( undefined !== columns ) {
		style[ '--sgs-wishlist-panel-columns' ] = columns;
	}
	const gap = valueAtTier( attributes.gap, tier, ( raw ) => {
		if ( '' === raw || null === raw || undefined === raw ) {
			return undefined;
		}
		return 'number' === typeof raw || /^\d+(\.\d+)?$/.test( String( raw ) ) ? `${ raw }px` : String( raw );
	} );
	if ( undefined !== gap ) {
		style[ '--sgs-wishlist-panel-gap' ] = gap;
	}
	return style;
}
