/**
 * V1 deprecation: block was inserted with empty innerHTML (before static save was
 * implemented). Stored innerHTML is empty — this entry matches that state.
 * WordPress migrates attributes unchanged and writes the current save.js HTML
 * on the next editor save.
 */
const v1 = {
	attributes: {
		items: {
			type: 'array',
			default: [
				{ value: '5,000', suffix: '+', label: 'Businesses Served', animated: true },
				{ value: '60', suffix: '+', label: 'Years Experience', animated: true },
				{ value: 'Next-Day', suffix: '', label: 'Delivery Available', animated: false },
			],
		},
		animated: { type: 'boolean', default: true },
		valueColour: { type: 'string' },
		labelColour: { type: 'string' },
		labelFontSize: { type: 'string' },
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
