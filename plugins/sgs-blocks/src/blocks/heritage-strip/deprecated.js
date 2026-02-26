/**
 * V1 deprecation: block was inserted with empty innerHTML (before static save was
 * implemented). Stored innerHTML is empty — this entry matches that state.
 * WordPress migrates attributes unchanged and writes the current save.js HTML
 * on the next editor save.
 */
const v1 = {
	attributes: {
		layout: { type: 'string', default: 'image-text-image' },
		headline: {
			type: 'string',
			source: 'html',
			selector: '.sgs-heritage-strip__headline',
		},
		body: {
			type: 'string',
			source: 'html',
			selector: '.sgs-heritage-strip__body',
		},
		imageLeft: { type: 'object' },
		imageRight: { type: 'object' },
		headlineColour: { type: 'string' },
		headlineFontSize: { type: 'string' },
		bodyColour: { type: 'string' },
		bodyFontSize: { type: 'string' },
		backgroundColour: { type: 'string' },
	},
	supports: {
		align: [ 'wide', 'full' ],
		anchor: true,
		html: false,
		color: { background: true, text: true, gradients: true },
		typography: { fontSize: true, lineHeight: true, textAlign: true },
		spacing: { margin: true, padding: true },
		__experimentalBorder: {
			radius: true,
			width: true,
			color: true,
			style: true,
		},
	},
	save() {
		return null;
	},
	migrate( attributes ) {
		return attributes;
	},
};

export default [ v1 ];
