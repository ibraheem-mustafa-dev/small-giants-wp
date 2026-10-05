/**
 * Editor-canvas mirror of the card-level settings render.php scopes onto the
 * grid: the `--sgs-card-*` custom properties on `.sgs-card-grid__item`, the
 * body / overlay padding, the image-area padding and height, the title margin
 * and the typography of the title, subtitle and no-image label.
 *
 * @package SGS\Blocks
 */

import {
	borderPaintPreview,
	boxShorthand,
	colourVar,
	resolveBackgroundPaintPreviewStyle,
	resolveShadowPreviewComposed,
	tierLengthPreview,
	tierBoxShorthand,
	typographyPreviewStyle,
} from '../../utils';

/**
 * @param {Object} attributes Block attributes.
 * @param {string} tier       Previewed device tier from usePreviewTier().
 * @param {Array}  palette    Theme colour palette.
 * @return {Object} Style objects keyed by the element each one paints.
 */
export function cardGridPreview( attributes, tier, palette ) {
	const itemStyle = {};
	if ( attributes.cardBackground || attributes.cardBackgroundGradient ) {
		const paint = resolveBackgroundPaintPreviewStyle( attributes.cardBackground, attributes.cardBackgroundGradient );
		if ( paint.backgroundImage ) {
			itemStyle.backgroundImage = paint.backgroundImage;
		} else if ( attributes.cardBackground ) {
			itemStyle[ '--sgs-card-background' ] = colourVar( attributes.cardBackground );
		}
	}
	if ( attributes.cardBorderColour ) {
		itemStyle[ '--sgs-card-border-color' ] = colourVar( attributes.cardBorderColour );
	}
	Object.assign( itemStyle, borderPaintPreview( '', attributes.cardBorderColourGradient, palette ) );
	const borderWidth = boxShorthand( attributes.cardBorderWidth );
	if ( borderWidth ) {
		itemStyle[ '--sgs-card-border-width' ] = borderWidth;
	}
	const radius = tierLengthPreview( attributes.cardRadius );
	if ( radius ) {
		itemStyle[ '--sgs-card-radius' ] = radius;
	}
	const shadow = resolveShadowPreviewComposed( attributes.cardShadow, attributes.cardShadowColour );
	if ( shadow ) {
		itemStyle[ '--sgs-card-shadow' ] = shadow;
	}

	const bodyPadding = tierBoxShorthand( attributes.cardPadding, tier );
	const imageWrapStyle = {};
	const imagePadding = tierBoxShorthand( attributes.imagePadding, tier );
	if ( imagePadding ) {
		imageWrapStyle.padding = imagePadding;
	}
	const imageHeight = tierLengthPreview( attributes.imageHeight, tier );
	if ( imageHeight ) {
		imageWrapStyle.height = imageHeight;
		imageWrapStyle.aspectRatio = 'auto';
	}

	return {
		itemStyle,
		bodyStyle: bodyPadding ? { padding: bodyPadding } : {},
		imageWrapStyle,
		titleMarginBottom: tierLengthPreview( attributes.titleMarginBottom ),
		titleTypography: typographyPreviewStyle( attributes, 'title', tier ),
		subtitleTypography: typographyPreviewStyle( attributes, 'subtitle', tier ),
		noImageLabelTypography: typographyPreviewStyle( attributes, 'noImageLabel', tier ),
	};
}
