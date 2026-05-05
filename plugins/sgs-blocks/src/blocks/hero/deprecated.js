import { InnerBlocks } from '@wordpress/block-editor';

/**
 * Deprecated versions of the SGS Hero block.
 *
 * v4 (FRONT — newest first) — Schema before splitMedia was introduced
 *      (2026-05-05). The block accepted only an image via splitImage. v4
 *      migrates legacy splitImage objects into the new splitMedia unified
 *      slot so existing posts open without "unexpected content" warnings.
 *
 * v3 — Added Phase 1 attribute surface (image controls, inner padding,
 *      sub-headline/label typography, layout grid). No save() change — still
 *      <InnerBlocks.Content />. Attributes are purely additive with
 *      null/default values, so no migration function is required.
 *
 * v2 — Save returned <InnerBlocks.Content /> but lacked the 5 new typography
 *      attributes (headlineFontSizeDesktop, headlineFontSizeTablet,
 *      headlineFontSizeMobile, subHeadlineMaxWidth, splitImageMobileHeight).
 *      No migration needed — new attrs are additive with null defaults.
 *
 * v1 — Fully dynamic block (save returned null). CTA rendering was handled
 *      entirely by render.php using ctaPrimary* / ctaSecondary* attributes.
 *      This migration converts those attributes to sgs/multi-button + sgs/button
 *      InnerBlocks so the new render.php uses $content instead.
 */

/**
 * Attribute set shared across v1 and v2 (the schema as it existed BEFORE the
 * Phase 1 attribute surface was added in this session).
 */
const SHARED_ATTRIBUTES_V1_V2 = {
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
 * Attribute set for v3 — the schema immediately before the Phase 1 surface
 * was added (includes the 5 typography attrs added in the v2→v3 transition).
 */
const SHARED_ATTRIBUTES_V3 = {
	...SHARED_ATTRIBUTES_V1_V2,
	splitImageMobile: { type: 'object' },
	splitImageMobileObjectPosition: { type: 'string', default: 'center 20%' },
	label: { type: 'string', default: '' },
	headlineFontSizeDesktop: { type: 'number', default: null },
	headlineFontSizeTablet: { type: 'number', default: null },
	headlineFontSizeMobile: { type: 'number', default: null },
	subHeadlineMaxWidth: { type: 'number', default: null },
	splitImageMobileHeight: { type: 'number', default: null },
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
 * v4 — Schema before splitMedia was introduced (2026-05-05). The block
 * accepted only an image via splitImage. Migrate legacy splitImage objects
 * into the unified splitMedia slot so the new render path works on existing
 * posts. splitImage is preserved as a back-compat denormalised fallback.
 *
 * Attribute set is treated as a superset that does NOT yet include
 * splitMedia. WordPress will only invoke this deprecation on posts whose
 * stored attributes match (i.e. splitMedia missing).
 */
const v4 = {
	attributes: {
		...SHARED_ATTRIBUTES_V3,
		// Note: every Phase 1 attribute landed after v3 is additive with a
		// null/default — WordPress merges them against block.json defaults
		// when validating against this deprecation. Listing them here is
		// not required for deprecation match; the migrate() below is the
		// load-bearing piece.
	},
	save() {
		return <InnerBlocks.Content />;
	},
	isEligible( attributes ) {
		// Only run when a legacy splitImage exists and splitMedia has not
		// yet been populated — prevents re-running on already-migrated posts.
		return !! ( attributes && attributes.splitImage && attributes.splitImage.url && ! attributes.splitMedia );
	},
	migrate( attributes ) {
		const next = { ...attributes };
		if ( attributes.splitImage && attributes.splitImage.url && ! attributes.splitMedia ) {
			next.splitMedia = {
				url: attributes.splitImage.url,
				type: 'image',
				id: attributes.splitImage.id || 0,
				alt: attributes.splitImage.alt || '',
				mime: 'image/jpeg',
			};
		}
		return next;
	},
};

/**
 * v3 — Pre-Phase-1 schema. Save still returns <InnerBlocks.Content />.
 * All Phase 1 attributes are additive with null/default values — no migration
 * function is required; WordPress merges missing attrs against block.json defaults.
 */
const v3 = {
	attributes: SHARED_ATTRIBUTES_V3,
	save() {
		return <InnerBlocks.Content />;
	},
};

/**
 * v2 — Save returned <InnerBlocks.Content /> but the block lacked the 5 new
 * typography attributes added in the current version. Attributes are additive
 * with null defaults so no migration function is required — returning the
 * attributes as-is is sufficient.
 */
const v2 = {
	attributes: SHARED_ATTRIBUTES_V1_V2,
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
	attributes: SHARED_ATTRIBUTES_V1_V2,
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

export default [ v4, v3, v2, v1 ];
