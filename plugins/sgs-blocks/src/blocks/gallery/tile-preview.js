/**
 * Editor-canvas mirror for the gallery's item tile and the colour row that edits its fill.
 *
 * render-tile.php prints the tile's fill, border, radius, height and padding into a scoped
 * stylesheet; the canvas has no server render, so this builds the same values for the previewed
 * device tier. Editor-only: the front end carries no inline style.
 *
 * @package SGS\Blocks
 */
import { __ } from '@wordpress/i18n';
import {
	colourVar,
	resolveResponsiveTier,
	resolveTextColourPreviewStyle,
	sgsBorderPreview,
	tierBoxLonghands,
} from '../../utils';

const TIERS = [ 'desktop', 'tablet', 'mobile' ];

/**
 * Whether the tile takes its own height (tile height set on any device), as render-tile.php::sgs_gallery_tile_mode.
 *
 * @param {Object} attributes Block attributes.
 * @return {boolean} True when tile mode is on.
 */
export function isTileMode( attributes ) {
	const tiers = attributes.tileMinHeight;
	if ( ! tiers || 'object' !== typeof tiers ) {
		return false;
	}
	return TIERS.some( ( tier ) => '' !== String( tiers[ tier ] ?? '' ).trim() );
}

/**
 * The tile's paint and box for the previewed device tier.
 *
 * A gradient wins over the flat fill, as render.php's sgs_background_paint_decl() does.
 *
 * @param {Object} attributes Block attributes.
 * @param {string} tier       Previewed device tier.
 * @param {Array}  palette    Theme colour palette.
 * @return {Object} React style fragment for the item figure.
 */
export function tilePreviewStyle( attributes, tier, palette ) {
	const style = {};
	const gradient = resolveTextColourPreviewStyle( '', attributes.tileColourGradient ).backgroundImage;
	if ( gradient ) {
		style.backgroundImage = gradient;
	} else if ( attributes.tileColour ) {
		style.backgroundColor = colourVar( attributes.tileColour );
	}
	Object.assign(
		style,
		sgsBorderPreview(
			{
				widthValues: attributes.tileBorderWidth,
				styleValue: attributes.tileBorderStyle,
				colourValue: attributes.tileBorderColour,
				colourGradientValue: attributes.tileBorderColourGradient,
				radiusValues: attributes.tileBorderRadius,
			},
			tier,
			palette
		)
	);
	const minHeight = resolveResponsiveTier( attributes.tileMinHeight, tier )?.value;
	const padding = tierBoxLonghands( attributes.tilePadding || {}, tier, 'padding' );
	if ( minHeight ) {
		style.minHeight = /^\d+(\.\d+)?$/.test( String( minHeight ) ) ? minHeight + 'px' : minHeight;
	}
	Object.assign( style, padding );
	if ( minHeight || Object.keys( padding ).length ) {
		style.boxSizing = 'border-box';
	}
	return style;
}

/**
 * The colour-panel row for the tile fill (resting and hover, each flat or gradient).
 *
 * @param {Object}   args
 * @param {Object}   args.attributes    Block attributes.
 * @param {Function} args.setAttributes Block setAttributes.
 * @return {Object} A SgsColourPanel row.
 */
export function tileColourRow( { attributes, setAttributes } ) {
	return {
		key: 'tile',
		label: __( 'Tile fill', 'sgs-blocks' ),
		states: [
			{
				key: 'normal',
				label: __( 'Normal', 'sgs-blocks' ),
				value: attributes.tileColour,
				onChange: ( val ) => setAttributes( { tileColour: val ?? '' } ),
				gradientValue: attributes.tileColourGradient,
				onGradientChange: ( val ) => setAttributes( { tileColourGradient: val ?? '' } ),
			},
			{
				key: 'hover',
				label: __( 'Hover', 'sgs-blocks' ),
				value: attributes.tileColourHover,
				onChange: ( val ) => setAttributes( { tileColourHover: val ?? '' } ),
				gradientValue: attributes.tileColourHoverGradient,
				onGradientChange: ( val ) => setAttributes( { tileColourHoverGradient: val ?? '' } ),
			},
		],
	};
}
