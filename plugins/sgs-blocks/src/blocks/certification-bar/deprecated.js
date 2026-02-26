/**
 * V1 deprecation: originally stored certifications as a flat string array
 * under the `certifications` attribute key. Stored innerHTML is empty.
 * The migrate() function converts the old string array to the current
 * `items` object array format expected by save.js.
 */
const v1 = {
	attributes: {
		// Old attribute — flat string array.
		certifications: { type: 'array', default: [] },
		// Current attributes (also present so WordPress can round-trip them).
		title: {
			type: 'string',
			source: 'html',
			selector: '.sgs-certification-bar__title',
		},
		items: { type: 'array', default: [] },
		badgeStyle: { type: 'string', default: 'text-only' },
		badgeSize: { type: 'string', default: 'medium' },
		titleColour: { type: 'string' },
		titleFontSize: { type: 'string' },
		labelColour: { type: 'string' },
		labelFontSize: { type: 'string' },
	},
	supports: {
		align: [ 'wide', 'full' ],
		anchor: true,
		html: false,
		color: { background: true, text: true },
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
	migrate( { certifications, ...rest } ) {
		const items = ( certifications || [] ).map( ( cert ) => ( {
			label: cert,
			url: '',
			image: null,
		} ) );
		return { ...rest, items };
	},
};

export default [ v1 ];
