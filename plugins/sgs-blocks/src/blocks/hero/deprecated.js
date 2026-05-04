import { InnerBlocks } from '@wordpress/block-editor';

/**
 * Deprecated versions of the SGS Hero block.
 *
 * v1 — Save returned null (fully dynamic, no InnerBlocks).
 *      Had hand-coded ctaPrimary* / ctaSecondary* attributes for CTA rendering.
 *      Migrates those attributes to sgs/multi-button + sgs/button InnerBlocks.
 *
 * v2 — Save returned <InnerBlocks.Content /> but lacked the 5 new typography
 *      attributes (headlineFontSizeDesktop, headlineFontSizeTablet,
 *      headlineFontSizeMobile, subHeadlineMaxWidth, splitImageMobileHeight).
 *      No migration needed — new attrs are additive with null defaults.
 */

const SHARED_ATTRIBUTES = {
	variant: { type: 'string', default: 'standard' },
	headline: { type: 'string', default: '' },
	subHeadline: { type: 'string', default: '' },
	alignment: { type: 'string', default: 'left' },
	backgroundImage: { type: 'object' },
	overlayColour: { type: 'string', default: 'text' },
	overlayOpacity: { type: 'number', default: 50 },
	splitImage: { type: 'object' },
	backgroundVideo: { type: 'object' },
	svgContent: { type: 'string' },
	minHeight: { type: 'string', default: '' },
	minHeightTablet: { type: 'string', default: '' },
	minHeightMobile: { type: 'string', default: '360px' },
	badges: { type: 'array', default: [] },
	backgroundColor: { type: 'string', default: 'primary-dark' },
	textColor: { type: 'string', default: 'text-inverse' },
	headlineColour: { type: 'string', default: 'text-inverse' },
	subHeadlineFontSize: { type: 'string' },
	subHeadlineFontSizeTablet: { type: 'string', default: '' },
	subHeadlineFontSizeMobile: { type: 'string', default: '' },
	subHeadlineColour: { type: 'string', default: 'text-inverse' },
	ctaPrimaryText: { type: 'string' },
	ctaPrimaryUrl: { type: 'string' },
	ctaPrimaryStyle: { type: 'string', default: 'accent' },
	ctaPrimaryColour: { type: 'string' },
	ctaPrimaryBackground: { type: 'string' },
	ctaSecondaryText: { type: 'string' },
	ctaSecondaryUrl: { type: 'string' },
	ctaSecondaryStyle: { type: 'string', default: 'outline' },
	ctaSecondaryColour: { type: 'string' },
	ctaSecondaryBackground: { type: 'string' },
	hoverBackgroundColour: { type: 'string', default: '' },
	hoverTextColour: { type: 'string', default: '' },
	hoverBorderColour: { type: 'string', default: '' },
	transitionDuration: { type: 'string', default: '300' },
	transitionEasing: { type: 'string', default: 'ease-in-out' },
	textAlignMobile: { type: 'string', default: '' },
	textAlignTablet: { type: 'string', default: '' },
	textAlignDesktop: { type: 'string', default: '' },
	bgParallax: { type: 'boolean', default: false },
	bgKenBurns: { type: 'boolean', default: false },
	bgVideo: { type: 'object' },
	bgVideoMobile: { type: 'object' },
	splitImageBleed: { type: 'boolean', default: false },
	ctaPrimaryHoverBackground: { type: 'string', default: '' },
	ctaPrimaryHoverColour: { type: 'string', default: '' },
	ctaSecondaryHoverBackground: { type: 'string', default: '' },
	ctaSecondaryHoverColour: { type: 'string', default: '' },
};

/**
 * Build the inner blocks structure from old CTA attributes.
 *
 * @param {Object} attributes Block attributes from the old version.
 * @return {Array} Array of [ blockName, blockAttrs, innerBlocks ] tuples.
 */
function buildInnerBlocksFromCtas( attributes ) {
	const buttons = [];

	if ( attributes.ctaPrimaryText || attributes.ctaPrimaryUrl ) {
		buttons.push( [
			'sgs/button',
			{
				inheritStyle: 'primary',
				label: attributes.ctaPrimaryText || 'Primary Action',
				url: attributes.ctaPrimaryUrl || '',
				linkTarget: '_self',
			},
			[],
		] );
	}

	if ( attributes.ctaSecondaryText || attributes.ctaSecondaryUrl ) {
		buttons.push( [
			'sgs/button',
			{
				inheritStyle: 'secondary',
				label: attributes.ctaSecondaryText || 'Secondary Action',
				url: attributes.ctaSecondaryUrl || '',
				linkTarget: '_self',
			},
			[],
		] );
	}

	if ( ! buttons.length ) {
		return [];
	}

	return [ [ 'sgs/multi-button', {}, buttons ] ];
}

/**
 * v2 — Save returned <InnerBlocks.Content /> but the block lacked the 5 new
 * typography attributes added in the current version. Attributes are additive
 * with null defaults so no migration function is required — returning the
 * attributes as-is is sufficient.
 */
const v2 = {
	attributes: SHARED_ATTRIBUTES,
	save() {
		return <InnerBlocks.Content />;
	},
	migrate( attributes ) {
		return [
			attributes,
			buildInnerBlocksFromCtas( attributes ),
		];
	},
};

/**
 * v1 — Fully dynamic block (save returned null). CTA rendering was handled
 * entirely by render.php using ctaPrimary* / ctaSecondary* attributes.
 * This migration converts those attributes to sgs/multi-button + sgs/button
 * InnerBlocks so the new render.php uses $content instead.
 */
const v1 = {
	attributes: SHARED_ATTRIBUTES,
	save() {
		return null;
	},
	migrate( attributes ) {
		const {
			ctaPrimaryText,
			ctaPrimaryUrl,
			ctaPrimaryStyle,
			ctaPrimaryColour,
			ctaPrimaryBackground,
			ctaSecondaryText,
			ctaSecondaryUrl,
			ctaSecondaryStyle,
			ctaSecondaryColour,
			ctaSecondaryBackground,
			ctaPrimaryHoverBackground,
			ctaPrimaryHoverColour,
			ctaSecondaryHoverBackground,
			ctaSecondaryHoverColour,
			...newAttributes
		} = attributes;

		return [
			newAttributes,
			buildInnerBlocksFromCtas( attributes ),
		];
	},
};

export default [ v2, v1 ];
