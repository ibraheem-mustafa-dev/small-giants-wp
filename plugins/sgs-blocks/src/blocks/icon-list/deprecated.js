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
				{ icon: 'check', text: 'First list item' },
				{ icon: 'check', text: 'Second list item' },
				{ icon: 'check', text: 'Third list item' },
			],
		},
		icon: { type: 'string', default: 'check' },
		iconColour: { type: 'string' },
		iconSize: { type: 'string', default: 'medium' },
		textColour: { type: 'string' },
		gap: { type: 'string', default: '20' },
	},
	supports: {
		align: false,
		anchor: true,
		html: false,
		color: { background: true, text: true, link: true },
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
