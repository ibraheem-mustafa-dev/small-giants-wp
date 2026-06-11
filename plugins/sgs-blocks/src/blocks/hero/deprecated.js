import { InnerBlocks } from '@wordpress/block-editor';

/**
 * Deprecated versions of the SGS Hero block.
 *
 * Newest first — WordPress walks this array stopping at the first version
 * whose save() output validates against the stored post_content.
 *
 * v7 (Step 6 / gridTemplateColumns migration, 2026-06-11) — splitColumnRatio*
 *      attrs retired. render.php now reads gridTemplateColumns* for the split
 *      grid. migrate() maps splitColumnRatio → gridTemplateColumns (and the
 *      Tablet/Mobile companions) when the new attr is empty, preserving all
 *      other attrs. contentBackground attr added (default ''). Save shape
 *      unchanged: <InnerBlocks.Content />.
 *
 * v6 (FR-22-6 migration, 2026-05-31) — Full content column now InnerBlocks.
 *      Previous shape: scalar attrs (label, headline, subHeadline) drove
 *      render.php; only the sgs/multi-button subtree was serialised as
 *      InnerBlocks. save() was <InnerBlocks.Content /> and post_content
 *      therefore contained only the sgs/multi-button subtree.
 *      migrate() converts scalar label/headline/subHeadline into child
 *      sgs/label + sgs/heading + sgs/text blocks, prepended to the existing
 *      innerBlocks (the sgs/multi-button subtree).
 *      R-22-14: no legacy scalar fallback in the new render.php.
 *
 * v5 — Schema before ctaGap* attributes were introduced (2026-05-06, H-8).
 *
 * v4 — Schema before splitMedia was introduced (2026-05-05). Migrates legacy
 *      splitImage objects into the new splitMedia unified slot.
 *
 * v3 — Added Phase 1 attribute surface (image controls, inner padding,
 *      sub-headline/label typography, layout grid). Additive attrs only,
 *      no migration needed.
 *
 * v2 — Save returned <InnerBlocks.Content /> but lacked 5 new typography
 *      attributes. Additive attrs, no migration needed.
 *
 * v1 — Fully dynamic block (save returned null). Migrates ctaPrimary* /
 *      ctaSecondary* scalar attrs to sgs/multi-button + sgs/button InnerBlocks.
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

// ---------------------------------------------------------------------------
// v6 — FR-22-6 migration (2026-05-31): full content column → InnerBlocks
// ---------------------------------------------------------------------------
// NOTE: v7 (the newest deprecation) is defined BELOW v6 in this file because
// V7_ATTRIBUTES spreads V6_ATTRIBUTES — a const, not hoisted; defining v7
// first throws a temporal-dead-zone ReferenceError at module evaluation,
// which silently unregisters the whole hero block in the editor (caught
// live 2026-06-11). The EXPORT array order (newest first) is unaffected.

/**
 * Full attribute snapshot immediately before the FR-22-6 migration.
 * This is v5's attrs + the ctaGap* attrs introduced in H-8.
 * Scalar content attrs (label, headline, subHeadline, ctaPrimary*, ctaSecondary*)
 * are retained here so WordPress can validate the stored post_content and
 * migrate() can read them to build the new InnerBlocks.
 */
const V6_ATTRIBUTES = {
	...SHARED_ATTRIBUTES_V3,
	// Phase 1 image / layout attrs.
	splitMedia: { type: 'object', default: null },
	imageObjectFit: { type: 'string', default: 'cover' },
	imageObjectPosition: { type: 'string', default: 'center center' },
	imageWidth: { type: 'number', default: null },
	imageWidthTablet: { type: 'number', default: null },
	imageWidthMobile: { type: 'number', default: null },
	imageWidthUnit: { type: 'string', default: '%' },
	imageHeight: { type: 'number', default: null },
	imageHeightTablet: { type: 'number', default: null },
	imageHeightMobile: { type: 'number', default: null },
	imageHeightUnit: { type: 'string', default: 'px' },
	imageBorderRadiusTL: { type: 'number', default: 0 },
	imageBorderRadiusTR: { type: 'number', default: 0 },
	imageBorderRadiusBR: { type: 'number', default: 0 },
	imageBorderRadiusBL: { type: 'number', default: 0 },
	imageBorderRadiusTabletTL: { type: 'number', default: null },
	imageBorderRadiusTabletTR: { type: 'number', default: null },
	imageBorderRadiusTabletBR: { type: 'number', default: null },
	imageBorderRadiusTabletBL: { type: 'number', default: null },
	imageBorderRadiusMobileTL: { type: 'number', default: null },
	imageBorderRadiusMobileTR: { type: 'number', default: null },
	imageBorderRadiusMobileBR: { type: 'number', default: null },
	imageBorderRadiusMobileBL: { type: 'number', default: null },
	imageBorderRadiusUnit: { type: 'string', default: 'px' },
	imageBorderStyle: { type: 'string', default: 'none' },
	imageBorderWidthTop: { type: 'number', default: 0 },
	imageBorderWidthRight: { type: 'number', default: 0 },
	imageBorderWidthBottom: { type: 'number', default: 0 },
	imageBorderWidthLeft: { type: 'number', default: 0 },
	imageBorderWidthUnit: { type: 'string', default: 'px' },
	imageBorderColour: { type: 'string', default: '' },
	imagePaddingTop: { type: 'number', default: 0 },
	imagePaddingRight: { type: 'number', default: 0 },
	imagePaddingBottom: { type: 'number', default: 0 },
	imagePaddingLeft: { type: 'number', default: 0 },
	imagePaddingTopTablet: { type: 'number', default: null },
	imagePaddingRightTablet: { type: 'number', default: null },
	imagePaddingBottomTablet: { type: 'number', default: null },
	imagePaddingLeftTablet: { type: 'number', default: null },
	imagePaddingTopMobile: { type: 'number', default: null },
	imagePaddingRightMobile: { type: 'number', default: null },
	imagePaddingBottomMobile: { type: 'number', default: null },
	imagePaddingLeftMobile: { type: 'number', default: null },
	imagePaddingUnit: { type: 'string', default: 'px' },
	mediaBackgroundColour: { type: 'string', default: '' },
	contentPaddingTop: { type: 'number', default: null },
	contentPaddingRight: { type: 'number', default: null },
	contentPaddingBottom: { type: 'number', default: null },
	contentPaddingLeft: { type: 'number', default: null },
	contentPaddingTopTablet: { type: 'number', default: null },
	contentPaddingRightTablet: { type: 'number', default: null },
	contentPaddingBottomTablet: { type: 'number', default: null },
	contentPaddingLeftTablet: { type: 'number', default: null },
	contentPaddingTopMobile: { type: 'number', default: null },
	contentPaddingRightMobile: { type: 'number', default: null },
	contentPaddingBottomMobile: { type: 'number', default: null },
	contentPaddingLeftMobile: { type: 'number', default: null },
	contentPaddingUnit: { type: 'string', default: 'px' },
	mediaPaddingTop: { type: 'number', default: null },
	mediaPaddingRight: { type: 'number', default: null },
	mediaPaddingBottom: { type: 'number', default: null },
	mediaPaddingLeft: { type: 'number', default: null },
	mediaPaddingTopTablet: { type: 'number', default: null },
	mediaPaddingRightTablet: { type: 'number', default: null },
	mediaPaddingBottomTablet: { type: 'number', default: null },
	mediaPaddingLeftTablet: { type: 'number', default: null },
	mediaPaddingTopMobile: { type: 'number', default: null },
	mediaPaddingRightMobile: { type: 'number', default: null },
	mediaPaddingBottomMobile: { type: 'number', default: null },
	mediaPaddingLeftMobile: { type: 'number', default: null },
	mediaPaddingUnit: { type: 'string', default: 'px' },
	subHeadlineFontFamily: { type: 'string', default: '' },
	subHeadlineFontWeight: { type: 'string', default: '' },
	subHeadlineLineHeight: { type: 'number', default: null },
	subHeadlineLineHeightUnit: { type: 'string', default: 'em' },
	subHeadlineLetterSpacing: { type: 'number', default: null },
	subHeadlineLetterSpacingUnit: { type: 'string', default: 'px' },
	subHeadlineTextTransform: { type: 'string', default: '' },
	subHeadlineTextDecoration: { type: 'string', default: '' },
	labelFontFamily: { type: 'string', default: '' },
	labelFontSize: { type: 'number', default: null },
	labelFontSizeTablet: { type: 'number', default: null },
	labelFontSizeMobile: { type: 'number', default: null },
	labelFontSizeUnit: { type: 'string', default: 'px' },
	labelFontWeight: { type: 'string', default: '600' },
	labelLineHeight: { type: 'number', default: 1.2 },
	labelLineHeightUnit: { type: 'string', default: 'em' },
	labelLetterSpacing: { type: 'number', default: null },
	labelLetterSpacingUnit: { type: 'string', default: 'em' },
	labelTextTransform: { type: 'string', default: 'uppercase' },
	labelTextDecoration: { type: 'string', default: '' },
	labelColour: { type: 'string', default: '' },
	labelMarginBottom: { type: 'number', default: 8 },
	labelMarginBottomUnit: { type: 'string', default: 'px' },
	splitColumnRatio: { type: 'string', default: '1fr 1fr' },
	splitColumnRatioTablet: { type: 'string', default: '' },
	splitColumnRatioMobile: { type: 'string', default: '' },
	splitGap: { type: 'number', default: 0 },
	splitGapTablet: { type: 'number', default: null },
	splitGapMobile: { type: 'number', default: null },
	splitGapUnit: { type: 'string', default: 'px' },
	splitContentOrderMobile: { type: 'string', default: 'media-first' },
	verticalAlignment: { type: 'string', default: 'center' },
	contentMaxWidth: { type: 'number', default: null },
	contentMaxWidthTablet: { type: 'number', default: null },
	contentMaxWidthMobile: { type: 'number', default: null },
	contentMaxWidthUnit: { type: 'string', default: 'px' },
	headlineMarginBottom: { type: 'number', default: null },
	headlineMarginBottomMobile: { type: 'number', default: null },
	subHeadlineMarginBottom: { type: 'number', default: null },
	subHeadlineMarginBottomMobile: { type: 'number', default: null },
	// H-8 ctaGap* attrs.
	ctaGap: { type: 'integer', default: 12 },
	ctaGapMobile: { type: 'integer', default: 10 },
	ctaGapTablet: { type: 'integer' },
	ctaGapUnit: { type: 'string', default: 'px' },
};

/**
 * v6 — FR-22-6 migration (2026-05-31).
 *
 * Previous save shape: <InnerBlocks.Content /> — but only the sgs/multi-button
 * subtree was stored in post_content. Scalar label / headline / subHeadline
 * were rendered server-side by render.php.
 *
 * After this migration: render.php echoes $content (full InnerBlocks output).
 * migrate() must build sgs/label + sgs/heading + sgs/text blocks from the
 * scalar attrs and prepend them to the existing innerBlocks (sgs/multi-button
 * subtree).
 *
 * R-22-14: no legacy fallback in the new render.php.
 */
const v6 = {
	attributes: V6_ATTRIBUTES,

	save() {
		// The pre-migration save was <InnerBlocks.Content /> — exactly the same
		// as the new shape. WordPress validates the stored post_content (which
		// only contained sgs/multi-button) against this save() output and passes.
		return <InnerBlocks.Content />;
	},

	/**
	 * Convert scalar content attrs to full InnerBlocks set.
	 *
	 * @param {Object} attributes  - Old scalar attributes.
	 * @param {Array}  innerBlocks - Existing serialised inner blocks
	 *                               (the sgs/multi-button subtree, may be empty).
	 * @return {[Object, Array]} Tuple of [newAttributes, newInnerBlocks].
	 */
	migrate( attributes, innerBlocks ) {
		const {
			label,
			headline,
			subHeadline,
			// Retain all other attrs — they are layout/styling and still used.
			...rest
		} = attributes;

		// 2026-06-09 — the legacy per-hero contentMaxWidth* family was removed in
		// favour of the universal `contentWidth` wrapper attribute. Carry a set
		// desktop contentMaxWidth value across so the content cap is not lost on
		// upgrade (e.g. 1200 + 'px' -> '1200px'). The per-breakpoint Tablet/Mobile
		// caps are dropped — the universal wrapper exposes width responsiveness via
		// widthMode*/customWidth and a single contentWidth, not a responsive
		// content cap; if an instance set Tablet/Mobile values they collapse to the
		// desktop cap (a deliberate, non-fatal simplification). Only fill
		// contentWidth when it is not already set, so a wrapper value always wins.
		const newContentWidth =
			rest.contentWidth ||
			( rest.contentMaxWidth != null
				? `${ rest.contentMaxWidth }${ rest.contentMaxWidthUnit || 'px' }`
				: rest.contentWidth );

		const contentBlocks = [];

		// 1. Eyebrow label → sgs/label.
		if ( label ) {
			contentBlocks.push( [
				'sgs/label',
				{
					className: 'sgs-hero__label',
					content:   label,
				},
				[],
			] );
		}

		// 2. Headline → sgs/heading (h1).
		if ( headline ) {
			contentBlocks.push( [
				'sgs/heading',
				{
					level:       1,
					className:   'sgs-hero__headline',
					content:     headline,
				},
				[],
			] );
		}

		// 3. Sub-headline → sgs/text.
		if ( subHeadline ) {
			contentBlocks.push( [
				'sgs/text',
				{
					className: 'sgs-hero__subheadline',
					text:      subHeadline,
				},
				[],
			] );
		}

		// 4. Append existing innerBlocks (sgs/multi-button subtree).
		const newInnerBlocks = [ ...contentBlocks, ...( innerBlocks || [] ) ];

		// Retain scalar content attrs on the migrated block for deprecation-chain
		// safety — they are no longer read by render.php (R-22-14) but must
		// survive subsequent round-trips through the deprecation chain.
		const newAttributes = {
			...rest,
			contentWidth: newContentWidth,
			label,
			headline,
			subHeadline,
		};

		return [ newAttributes, newInnerBlocks ];
	},
};

// ---------------------------------------------------------------------------
// v7 — Step 6 / gridTemplateColumns migration (2026-06-11)
// ---------------------------------------------------------------------------

/**
 * Full attribute snapshot immediately before splitColumnRatio* was retired.
 * This is v6's attrs + splitColumnRatio/Tablet/Mobile (the attrs being removed)
 * and WITHOUT the new contentBackground / mediaBackground attrs.
 * WordPress matches this deprecation for any post whose serialised attributes
 * include splitColumnRatio (or lack contentBackground/mediaBackground).
 */
const V7_ATTRIBUTES = {
	...V6_ATTRIBUTES,
	// splitColumnRatio* — the attrs being retired. Included so WP can read
	// them from stored post_content during migrate().
	splitColumnRatio: { type: 'string', default: '1fr 1fr' },
	splitColumnRatioTablet: { type: 'string', default: '' },
	splitColumnRatioMobile: { type: 'string', default: '' },
};

/**
 * v7 — splitColumnRatio* → gridTemplateColumns* migration.
 *
 * Save shape unchanged: <InnerBlocks.Content /> (dynamic block).
 * migrate() maps splitColumnRatio → gridTemplateColumns (and Tablet/Mobile)
 * only when the destination attr is empty, so already-migrated posts are safe.
 * R-22-14: no legacy read-time fallback in render.php.
 */
const v7 = {
	attributes: V7_ATTRIBUTES,

	save() {
		return <InnerBlocks.Content />;
	},

	isEligible( attributes ) {
		// Match posts that still carry splitColumnRatio or lack contentBackground.
		return (
			attributes.splitColumnRatio !== undefined ||
			attributes.contentBackground === undefined
		);
	},

	/**
	 * @param {Object} attributes  Old block attributes.
	 * @param {Array}  innerBlocks Serialised inner blocks (passed through).
	 * @return {[Object, Array]} [newAttributes, innerBlocks].
	 */
	migrate( attributes, innerBlocks ) {
		const {
			splitColumnRatio,
			splitColumnRatioTablet,
			splitColumnRatioMobile,
			...rest
		} = attributes;

		// Map splitColumnRatio → gridTemplateColumns only when the new attr is
		// absent or empty (preserves any value set before migration ran).
		// Do NOT bake in the '1fr 1fr' default — render.php owns the default,
		// and a standard-variant hero must not gain a stored grid template.
		const newGTC = rest.gridTemplateColumns || splitColumnRatio || '';
		const newGTCTablet = rest.gridTemplateColumnsTablet || splitColumnRatioTablet || '';
		const newGTCMobile = rest.gridTemplateColumnsMobile || splitColumnRatioMobile || '';

		const newAttributes = {
			...rest,
			gridTemplateColumns: newGTC,
			gridTemplateColumnsTablet: newGTCTablet,
			gridTemplateColumnsMobile: newGTCMobile,
			// Ensure new per-area attrs exist with their defaults; the legacy
			// mediaBackgroundColour value (its bespoke control was removed —
			// one control per setting) seeds the new mediaBackground when unset.
			contentBackground: rest.contentBackground || '',
			mediaBackground: rest.mediaBackground || rest.mediaBackgroundColour || '',
		};

		return [ newAttributes, innerBlocks ];
	},
};

// ---------------------------------------------------------------------------

/**
 * v5 — Schema before ctaGap* attributes were introduced (2026-05-06, H-8).
 * New attributes (ctaGap, ctaGapMobile, ctaGapTablet, ctaGapUnit) all have
 * defaults matching the mockup values, so existing posts render correctly
 * without a migrate() function — WordPress merges missing attrs against
 * block.json defaults automatically.
 *
 * No save() change — still <InnerBlocks.Content />.
 */
const v5 = {
	attributes: {
		...SHARED_ATTRIBUTES_V3,
		// Phase 1 attributes present before H-8 (additive with null/defaults).
		splitMedia: { type: 'object', default: null },
		imageObjectFit: { type: 'string', default: 'cover' },
		imageObjectPosition: { type: 'string', default: 'center center' },
		imageWidth: { type: 'number', default: null },
		imageWidthTablet: { type: 'number', default: null },
		imageWidthMobile: { type: 'number', default: null },
		imageWidthUnit: { type: 'string', default: '%' },
		imageHeight: { type: 'number', default: null },
		imageHeightTablet: { type: 'number', default: null },
		imageHeightMobile: { type: 'number', default: null },
		imageHeightUnit: { type: 'string', default: 'px' },
		imageBorderRadiusTL: { type: 'number', default: 0 },
		imageBorderRadiusTR: { type: 'number', default: 0 },
		imageBorderRadiusBR: { type: 'number', default: 0 },
		imageBorderRadiusBL: { type: 'number', default: 0 },
		imageBorderRadiusTabletTL: { type: 'number', default: null },
		imageBorderRadiusTabletTR: { type: 'number', default: null },
		imageBorderRadiusTabletBR: { type: 'number', default: null },
		imageBorderRadiusTabletBL: { type: 'number', default: null },
		imageBorderRadiusMobileTL: { type: 'number', default: null },
		imageBorderRadiusMobileTR: { type: 'number', default: null },
		imageBorderRadiusMobileBR: { type: 'number', default: null },
		imageBorderRadiusMobileBL: { type: 'number', default: null },
		imageBorderRadiusUnit: { type: 'string', default: 'px' },
		imageBorderStyle: { type: 'string', default: 'none' },
		imageBorderWidthTop: { type: 'number', default: 0 },
		imageBorderWidthRight: { type: 'number', default: 0 },
		imageBorderWidthBottom: { type: 'number', default: 0 },
		imageBorderWidthLeft: { type: 'number', default: 0 },
		imageBorderWidthUnit: { type: 'string', default: 'px' },
		imageBorderColour: { type: 'string', default: '' },
		imagePaddingTop: { type: 'number', default: 0 },
		imagePaddingRight: { type: 'number', default: 0 },
		imagePaddingBottom: { type: 'number', default: 0 },
		imagePaddingLeft: { type: 'number', default: 0 },
		imagePaddingTopTablet: { type: 'number', default: null },
		imagePaddingRightTablet: { type: 'number', default: null },
		imagePaddingBottomTablet: { type: 'number', default: null },
		imagePaddingLeftTablet: { type: 'number', default: null },
		imagePaddingTopMobile: { type: 'number', default: null },
		imagePaddingRightMobile: { type: 'number', default: null },
		imagePaddingBottomMobile: { type: 'number', default: null },
		imagePaddingLeftMobile: { type: 'number', default: null },
		imagePaddingUnit: { type: 'string', default: 'px' },
		mediaBackgroundColour: { type: 'string', default: '' },
		contentPaddingTop: { type: 'number', default: null },
		contentPaddingRight: { type: 'number', default: null },
		contentPaddingBottom: { type: 'number', default: null },
		contentPaddingLeft: { type: 'number', default: null },
		contentPaddingTopTablet: { type: 'number', default: null },
		contentPaddingRightTablet: { type: 'number', default: null },
		contentPaddingBottomTablet: { type: 'number', default: null },
		contentPaddingLeftTablet: { type: 'number', default: null },
		contentPaddingTopMobile: { type: 'number', default: null },
		contentPaddingRightMobile: { type: 'number', default: null },
		contentPaddingBottomMobile: { type: 'number', default: null },
		contentPaddingLeftMobile: { type: 'number', default: null },
		contentPaddingUnit: { type: 'string', default: 'px' },
		mediaPaddingTop: { type: 'number', default: null },
		mediaPaddingRight: { type: 'number', default: null },
		mediaPaddingBottom: { type: 'number', default: null },
		mediaPaddingLeft: { type: 'number', default: null },
		mediaPaddingTopTablet: { type: 'number', default: null },
		mediaPaddingRightTablet: { type: 'number', default: null },
		mediaPaddingBottomTablet: { type: 'number', default: null },
		mediaPaddingLeftTablet: { type: 'number', default: null },
		mediaPaddingTopMobile: { type: 'number', default: null },
		mediaPaddingRightMobile: { type: 'number', default: null },
		mediaPaddingBottomMobile: { type: 'number', default: null },
		mediaPaddingLeftMobile: { type: 'number', default: null },
		mediaPaddingUnit: { type: 'string', default: 'px' },
		subHeadlineFontFamily: { type: 'string', default: '' },
		subHeadlineFontWeight: { type: 'string', default: '' },
		subHeadlineLineHeight: { type: 'number', default: null },
		subHeadlineLineHeightUnit: { type: 'string', default: 'em' },
		subHeadlineLetterSpacing: { type: 'number', default: null },
		subHeadlineLetterSpacingUnit: { type: 'string', default: 'px' },
		subHeadlineTextTransform: { type: 'string', default: '' },
		subHeadlineTextDecoration: { type: 'string', default: '' },
		labelFontFamily: { type: 'string', default: '' },
		labelFontSize: { type: 'number', default: null },
		labelFontSizeTablet: { type: 'number', default: null },
		labelFontSizeMobile: { type: 'number', default: null },
		labelFontSizeUnit: { type: 'string', default: 'px' },
		labelFontWeight: { type: 'string', default: '600' },
		labelLineHeight: { type: 'number', default: 1.2 },
		labelLineHeightUnit: { type: 'string', default: 'em' },
		labelLetterSpacing: { type: 'number', default: null },
		labelLetterSpacingUnit: { type: 'string', default: 'em' },
		labelTextTransform: { type: 'string', default: 'uppercase' },
		labelTextDecoration: { type: 'string', default: '' },
		labelColour: { type: 'string', default: '' },
		labelMarginBottom: { type: 'number', default: 8 },
		labelMarginBottomUnit: { type: 'string', default: 'px' },
		splitColumnRatio: { type: 'string', default: '1fr 1fr' },
		splitColumnRatioTablet: { type: 'string', default: '' },
		splitColumnRatioMobile: { type: 'string', default: '' },
		splitGap: { type: 'number', default: 0 },
		splitGapTablet: { type: 'number', default: null },
		splitGapMobile: { type: 'number', default: null },
		splitGapUnit: { type: 'string', default: 'px' },
		splitContentOrderMobile: { type: 'string', default: 'media-first' },
		verticalAlignment: { type: 'string', default: 'center' },
		contentMaxWidth: { type: 'number', default: null },
		contentMaxWidthTablet: { type: 'number', default: null },
		contentMaxWidthMobile: { type: 'number', default: null },
		contentMaxWidthUnit: { type: 'string', default: 'px' },
		headlineMarginBottom: { type: 'number', default: null },
		headlineMarginBottomMobile: { type: 'number', default: null },
		subHeadlineMarginBottom: { type: 'number', default: null },
		subHeadlineMarginBottomMobile: { type: 'number', default: null },
		// Note: ctaGap* attrs deliberately absent — their absence is what
		// triggers a match against this deprecation for pre-H-8 posts.
	},
	save() {
		return <InnerBlocks.Content />;
	},
};

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

export default [ v7, v6, v5, v4, v3, v2, v1 ];
