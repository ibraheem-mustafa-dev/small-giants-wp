/**
 * Deprecated versions of the SGS Product Card block.
 *
 * v1 — Dynamic block (save returns null). CTA rendered server-side via
 *      render.php using ctaText + ctaUrl attributes. No InnerBlocks.
 *      Migrates those attributes to sgs/multi-button + sgs/button InnerBlocks.
 */

/**
 * Full attribute snapshot for v1 (ctaText/ctaUrl era).
 */
const V1_ATTRIBUTES = {
	image: { type: 'string', default: '' },
	imageAlt: { type: 'string', default: '' },
	productName: { type: 'string', default: '' },
	description: { type: 'string', default: '' },
	variantStyle: {
		type: 'string',
		default: 'standard',
		enum: [ 'standard', 'trial' ],
	},
	trialTag: { type: 'string', default: '' },
	packSizes: { type: 'array', default: [] },
	priceLarge: { type: 'string', default: '' },
	priceNote: { type: 'string', default: '' },
	ctaText: { type: 'string', default: '' },
	ctaUrl: { type: 'string', default: '' },
};

/**
 * v1 — save returns null (dynamic block). ctaText/ctaUrl rendered by
 * render.php as a plain <a> tag. Migrates to sgs/multi-button + sgs/button.
 */
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

export default [ v1 ];
