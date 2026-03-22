/**
 * WhatsApp CTA block — v1 deprecation.
 *
 * Blocks created via WP-CLI or recovered by the editor have empty innerHTML.
 * save: () => null matches any stored innerHTML, including empty string,
 * preventing "unexpected content" validation errors.
 */

const v1 = {
	attributes: {
		phoneNumber: { type: 'string' },
		message: { type: 'string', default: "Hi, I'd like to know more about your services." },
		variant: { type: 'string', default: 'floating' },
		label: { type: 'string', source: 'html', selector: '.sgs-whatsapp-cta__label' },
		showOnMobile: { type: 'boolean', default: true },
		showOnDesktop: { type: 'boolean', default: true },
		labelColour: { type: 'string' },
		labelFontSize: { type: 'string' },
		backgroundColour: { type: 'string' },
	},
	supports: {
		align: false,
		anchor: true,
		html: false,
		color: { background: false, text: false },
		spacing: { margin: true, padding: true },
		__experimentalBorder: { radius: true },
	},
	save: () => null,
	migrate: ( attributes ) => attributes,
};

export default [ v1 ];
