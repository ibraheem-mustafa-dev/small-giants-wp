/**
 * V1 deprecation: save returned null for logos in the old {id, url, alt} shape
 * (pre-render.php era). Stored innerHTML is empty — this entry matches that state.
 * WordPress migrates attributes unchanged and writes the current render.php output
 * on the next editor save.
 */
const v1 = {
	attributes: {
		logos: { type: 'array', default: [] },
		scrolling: { type: 'boolean', default: false },
		scrollSpeed: { type: 'string', default: 'medium' },
		greyscale: { type: 'boolean', default: true },
		maxHeight: { type: 'number', default: 48 },
	},
	supports: {
		align: [ 'wide', 'full' ],
		anchor: true,
		html: false,
		color: { background: true, text: false },
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
