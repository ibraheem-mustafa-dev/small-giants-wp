/**
 * Editor-canvas preview styles for sgs/team-member, mirroring render.php's
 * scoped CSS at the device tier the editor is previewing. The block's supports
 * are skip-serialised, so WordPress paints none of this on the canvas itself.
 * The editor canvas may use inline style; the front end never does (render.php
 * is the only front-end surface).
 *
 * @package SGS\Blocks
 */

import {
	colourVar,
	resolveShadowPreviewComposed,
	resolveTextColourPreviewStyle,
	backgroundPaintPreview,
	sgsBorderPreview,
	tierBoxShorthand,
	typographyPreviewStyle,
	isCssGradient,
} from '../../utils';

/**
 * The card root's canvas style at the previewed tier.
 *
 * @param {Object} attributes Block attributes.
 * @param {string} tier       'desktop' | 'tablet' | 'mobile'.
 * @param {Array}  palette    Theme colour palette.
 * @return {Object} React style object.
 */
export function buildWrapperStyle( attributes, tier, palette ) {
	const style = {};

	// Card shadow is a custom-property VALUE (`--sgs-card-shadow`) read by
	// style.css's static shadow rule, exactly as render.php emits it.
	if ( attributes.cardShadow ) {
		style[ '--sgs-card-shadow' ] = resolveShadowPreviewComposed( attributes.cardShadow, attributes.cardShadowColour );
	}

	Object.assign(
		style,
		resolveTextColourPreviewStyle( attributes.textColour, attributes.textColourGradient, colourVar )
	);
	const backgroundGradient = isCssGradient( attributes.backgroundColourGradient ) ? attributes.backgroundColourGradient : '';
	Object.assign( style, backgroundPaintPreview( attributes.backgroundColour, backgroundGradient, palette ) );

	// Root typography (the "Card" target): font size, line height, weight, style.
	Object.assign( style, typographyPreviewStyle( attributes, '', tier ) );

	// The bordered card's stylesheet already paints a border, which a chosen
	// colour, style or width overrides part by part (render.php emits each alone).
	Object.assign( style, sgsBorderPreview( { widthValues: attributes.borderWidth, styleValue: attributes.borderStyle, colourValue: attributes.borderColour, colourGradientValue: attributes.borderColourGradient, radiusValues: attributes.borderRadius }, tier, palette, { defaultBorder: 'bordered' === attributes.cardStyle } ) );

	const padding = tierBoxShorthand( attributes.padding, tier );
	if ( padding ) {
		style.padding = padding;
	}
	const margin = tierBoxShorthand( attributes.margin, tier );
	if ( margin ) {
		style.margin = margin;
	}

	if ( attributes.maxWidth ) {
		style.maxWidth = attributes.maxWidth;
		style.marginInline = 'auto';
	}

	return style;
}

/**
 * Canvas style for one text surface (name / role / bio): its typography at
 * the previewed tier plus its own colour where it has one.
 *
 * @param {Object} attributes Block attributes.
 * @param {string} prefix     'name' | 'role' | 'bio'.
 * @param {string} tier       'desktop' | 'tablet' | 'mobile'.
 * @return {Object} React style object.
 */
export function textSurfaceStyle( attributes, prefix, tier ) {
	const style = typographyPreviewStyle( attributes, prefix, tier );
	if ( 'name' === prefix ) {
		Object.assign( style, resolveTextColourPreviewStyle( attributes.nameColour, attributes.nameColourGradient, colourVar ) );
	} else if ( 'role' === prefix ) {
		Object.assign( style, resolveTextColourPreviewStyle( attributes.roleColour, attributes.roleColourGradient, colourVar ) );
	}
	return style;
}
