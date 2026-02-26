/**
 * Accordion block — v1 deprecation.
 *
 * Blocks created via WP-CLI before save.js was active have empty innerHTML.
 * WordPress serialises <InnerBlocks.Content /> as the inner block HTML,
 * so stored empty-string content causes a validation mismatch.
 * save: () => null matches any stored innerHTML, including empty string.
 */

const v1 = {
	attributes: {
		allowMultiple:    { type: 'boolean', default: false },
		defaultOpen:      { type: 'number', default: -1 },
		iconPosition:     { type: 'string', default: 'right' },
		style:            { type: 'string', default: 'bordered' },
		faqSchema:        { type: 'boolean', default: false },
		headerColour:     { type: 'string', default: '' },
		headerBackground: { type: 'string', default: '' },
		iconColour:       { type: 'string', default: '' },
	},
	supports: {
		align: [ 'wide', 'full' ],
		anchor: true,
		html: false,
		color: { background: true, text: true },
		typography: { fontSize: true, lineHeight: true },
		spacing: { margin: true, padding: true },
		border: { color: true, radius: true, style: true, width: true },
	},
	save: () => null,
	migrate: ( attributes ) => attributes,
};

export default [ v1 ];
