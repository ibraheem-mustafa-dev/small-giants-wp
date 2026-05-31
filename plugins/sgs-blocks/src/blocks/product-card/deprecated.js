/**
 * Deprecated versions of the SGS Product Card block.
 *
 * Newest first (WordPress walks this array in order, stopping at the first
 * version whose save() output matches the stored post_content).
 *
 * v2 — FR-22-6 migration (2026-05-30). Previous shape: scalar attrs for
 *      image/productName/description/priceLarge drove render.php; only the
 *      CTA was an InnerBlocks slot (save: <InnerBlocks.Content />). The
 *      stored post_content therefore contains only the serialised
 *      sgs/multi-button subtree inside the parent block comment.
 *      migrate() converts the scalar attrs into the full InnerBlocks set.
 *
 * v1 — ctaText/ctaUrl era. save: null (fully dynamic, no InnerBlocks slot).
 *      Migrates ctaText/ctaUrl to sgs/multi-button + sgs/button.
 */

import { InnerBlocks } from '@wordpress/block-editor';

// ---------------------------------------------------------------------------
// v2 — scalar-attr + CTA-only InnerBlocks shape (pre-FR-22-6)
// ---------------------------------------------------------------------------

/**
 * Attribute snapshot for v2.
 * Matches what was in block.json immediately before this migration.
 */
const V2_ATTRIBUTES = {
	image:        { type: 'string', default: '' },
	imageAlt:     { type: 'string', default: '', role: 'content' },
	productName:  { type: 'string', default: '' },
	description:  { type: 'string', default: '', role: 'content' },
	variantStyle: {
		type: 'string',
		default: 'standard',
		enum: [ 'standard', 'trial', 'gift', 'featured' ],
	},
	trialTag:    { type: 'string', default: '' },
	featuredTag: { type: 'string', default: '' },
	packSizes:   { type: 'array',  default: [] },
	priceLarge:  { type: 'string', default: '' },
	priceNote:   { type: 'string', default: '' },
	ctaText:     { type: 'string', default: '' },
	ctaUrl:      { type: 'string', default: '' },
};

/**
 * v2 save — the CTA-only InnerBlocks slot.
 * This is what WordPress stored in post_content for the scalar-attr era
 * (only sgs/multi-button was an InnerBlock; everything else was scalar).
 */
const v2 = {
	attributes: V2_ATTRIBUTES,

	save() {
		return <InnerBlocks.Content />;
	},

	/**
	 * Migrate scalar attrs → full InnerBlocks set.
	 *
	 * The stored post_content carries the existing sgs/multi-button subtree
	 * as the `innerBlocks` argument (second element of the tuple). We prepend
	 * the content blocks derived from the scalar attrs and return the merged
	 * innerBlocks array.
	 *
	 * @param {Object}   attributes   - Old scalar attributes.
	 * @param {Array}    innerBlocks  - Existing serialised inner blocks
	 *                                  (the CTA sgs/multi-button subtree).
	 * @return {[Object, Array]} Tuple of [newAttributes, newInnerBlocks].
	 */
	migrate( attributes, innerBlocks ) {
		const {
			image,
			imageAlt,
			productName,
			description,
			priceLarge,
			priceNote,
			variantStyle,
			trialTag,
			featuredTag,
			packSizes,
			// ctaText / ctaUrl already migrated to InnerBlocks by v1.
			// They may still be present if a post skipped v1 — ignore here.
			ctaText,  // eslint-disable-line no-unused-vars
			ctaUrl,   // eslint-disable-line no-unused-vars
			...rest
		} = attributes;

		const contentBlocks = [];

		// 1. Image → sgs/media
		if ( image ) {
			contentBlocks.push( [
				'sgs/media',
				{
					mediaType: 'image',
					imageUrl: image,
					imageAlt: imageAlt || '',
				},
				[],
			] );
		}

		// 2. Product name → core/heading (h3)
		if ( productName ) {
			contentBlocks.push( [
				'core/heading',
				{ level: 3, content: productName },
				[],
			] );
		}

		// 3. Description → sgs/text
		if ( description ) {
			contentBlocks.push( [
				'sgs/text',
				{ text: description },
				[],
			] );
		}

		// 4. Price → sgs/text (combines priceLarge + priceNote into one line)
		const priceContent = [
			priceLarge,
			priceNote,
		].filter( Boolean ).join( ' · ' );

		if ( priceContent ) {
			contentBlocks.push( [
				'sgs/text',
				{ text: priceContent },
				[],
			] );
		}

		// 5. Badge (trialTag / featuredTag) → sgs/label
		const badgeText = ( 'trial' === variantStyle && trialTag )
			? trialTag
			: ( 'featured' === variantStyle && featuredTag )
				? featuredTag
				: '';

		if ( badgeText ) {
			contentBlocks.push( [
				'sgs/label',
				{ text: badgeText },
				[],
			] );
		}

		// 6. Append the existing CTA innerBlocks (sgs/multi-button subtree).
		// If empty (post had no CTA), seed a default button.
		const ctaBlocks = ( innerBlocks && innerBlocks.length > 0 )
			? innerBlocks
			: [
				[
					'sgs/multi-button',
					{},
					[
						[
							'sgs/button',
							{
								inheritStyle: 'trial' === variantStyle ? 'secondary' : 'primary',
								label: 'Shop Now',
							},
							[],
						],
					],
				],
			];

		const newInnerBlocks = [ ...contentBlocks, ...ctaBlocks ];

		const newAttributes = {
			...rest,
			variantStyle,
			// Retain scalar attrs in new attributes for deprecation-chain safety
			// (they are no longer read by render.php but must survive round-trips).
			trialTag,
			featuredTag,
			packSizes,
		};

		return [ newAttributes, newInnerBlocks ];
	},
};

// ---------------------------------------------------------------------------
// v1 — ctaText/ctaUrl era (save: null, no InnerBlocks slot at all)
// ---------------------------------------------------------------------------

const V1_ATTRIBUTES = {
	image:        { type: 'string', default: '' },
	imageAlt:     { type: 'string', default: '' },
	productName:  { type: 'string', default: '' },
	description:  { type: 'string', default: '' },
	variantStyle: {
		type: 'string',
		default: 'standard',
		enum: [ 'standard', 'trial' ],
	},
	trialTag:   { type: 'string', default: '' },
	packSizes:  { type: 'array',  default: [] },
	priceLarge: { type: 'string', default: '' },
	priceNote:  { type: 'string', default: '' },
	ctaText:    { type: 'string', default: '' },
	ctaUrl:     { type: 'string', default: '' },
};

const v1 = {
	attributes: V1_ATTRIBUTES,

	save() {
		return null;
	},

	migrate( attributes ) {
		const {
			ctaText,
			ctaUrl,
			variantStyle,
			...newAttributes
		} = attributes;

		const innerBlocks = [];

		if ( ctaText ) {
			const inheritStyle = 'trial' === variantStyle ? 'secondary' : 'primary';
			innerBlocks.push( [
				'sgs/multi-button',
				{},
				[
					[
						'sgs/button',
						{
							inheritStyle,
							label: ctaText,
							url: ctaUrl || '',
							linkTarget: '_self',
						},
						[],
					],
				],
			] );
		}

		return [
			{ ...newAttributes, variantStyle },
			innerBlocks,
		];
	},
};

// Newest first.
export default [ v2, v1 ];
