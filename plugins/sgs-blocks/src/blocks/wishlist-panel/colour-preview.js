/**
 * Editor-canvas colours for sgs/wishlist-panel: the same element-by-element
 * mapping `render.php` and `render-colours.php` emit as scoped rules
 * (`sgs_text_states_css` / `sgs_fill_states_css`), as editor-only React style
 * objects. The front end renders no inline style (Spec 32).
 *
 * @package SGS\Blocks
 */
import { backgroundPaintPreview, colourVar, gapVar, textPaintPreview, tierValueOf } from '../../utils';

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
 * A text colour or its gradient sibling: a gradient wins and paints through
 * background-clip:text, as sgs_text_colour_decl() does on the front end.
 *
 * @param {string} slugOrColour Stored flat colour.
 * @param {string} gradient     Stored gradient sibling.
 * @return {Object} Style object, {} when both are unset.
 */
function paintText( slugOrColour, gradient ) {
	return gradient ? textPaintPreview( '', gradient ) : paint( slugOrColour, 'color' );
}

/**
 * A fill colour or its gradient sibling: a gradient wins and paints through
 * background-image, as sgs_background_paint_decl() does on the front end.
 *
 * @param {string} slugOrColour Stored flat colour.
 * @param {string} gradient     Stored gradient sibling.
 * @return {Object} Style object, {} when both are unset.
 */
function paintFill( slugOrColour, gradient ) {
	return gradient ? backgroundPaintPreview( '', gradient ) : paint( slugOrColour, 'backgroundColor' );
}

/**
 * @param {Object} attributes Block attributes.
 * @return {Object} Style object per canvas element.
 */
export function wishlistColourStyles( attributes ) {
	return {
		heading: paintText( attributes.headingColour, attributes.headingColourGradient ),
		// Mirrors render.php: no itemNameColour means the palette's text token.
		itemName:
			attributes.itemNameColour || attributes.itemNameColourGradient
				? paintText( attributes.itemNameColour, attributes.itemNameColourGradient )
				: { color: 'var(--wp--preset--color--text)' },
		price: paintText( attributes.priceColour, attributes.priceColourGradient ),
		priceDrop: paint( attributes.priceDropColour, 'color' ),
		stockChip: {
			...paint( attributes.stockChipBackgroundColour, 'backgroundColor' ),
			...paint( attributes.stockChipTextColour, 'color' ),
		},
		button: {
			...paintFill( attributes.buttonBackgroundColour, attributes.buttonBackgroundColourGradient ),
			...paint( attributes.buttonTextColour, 'color' ),
		},
		link: paint( attributes.linkColour, 'color' ),
		bar: paintFill( attributes.barBackgroundColour, attributes.barBackgroundColourGradient ),
		shareField: {
			...paint( attributes.shareFieldBackgroundColour, 'backgroundColor' ),
			...paint( attributes.shareFieldTextColour, 'color' ),
		},
	};
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
	const columns = tierValueOf( attributes.columns, tier, ( raw ) => {
		const n = Math.abs( parseInt( raw, 10 ) );
		return Number.isFinite( n ) && n > 0 ? n : undefined;
	} );
	if ( undefined !== columns ) {
		style[ '--sgs-wishlist-panel-columns' ] = columns;
	}
	const gap = gapVar( tierValueOf( attributes.gap, tier ) );
	if ( undefined !== gap ) {
		style[ '--sgs-wishlist-panel-gap' ] = gap;
	}
	return style;
}
