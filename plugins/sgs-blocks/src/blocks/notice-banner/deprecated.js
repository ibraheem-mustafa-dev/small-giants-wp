/**
 * Notice Banner block — v1 deprecation.
 *
 * Blocks created via WP-CLI or recovered by the editor have empty innerHTML.
 * save: () => null matches any stored innerHTML, including empty string,
 * preventing "unexpected content" validation errors.
 */

const v1 = {
	attributes: {
		icon: { type: 'string', default: 'info' },
		text: { type: 'string', source: 'html', selector: '.sgs-notice-banner__text' },
		variant: { type: 'string', default: 'info' },
		textColour: { type: 'string' },
		textFontSize: { type: 'string' },
	},
	supports: {
		align: [ 'wide', 'full' ],
		anchor: true,
		html: false,
		color: { background: false, text: false },
		typography: { fontSize: true, lineHeight: true, textAlign: true },
		spacing: { margin: true, padding: true },
		__experimentalBorder: { radius: true, width: true, color: true, style: true },
	},
	save: () => null,
	migrate: ( attributes ) => attributes,
};

export default [ v1 ];
