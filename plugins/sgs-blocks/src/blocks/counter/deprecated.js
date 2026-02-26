/**
 * Counter block — v1 deprecation.
 *
 * Blocks created via WP-CLI before save.js was active have empty innerHTML.
 * The static save.js output doesn't match empty string — validation fails.
 * save: () => null matches any stored innerHTML including empty string.
 */

const v1 = {
	attributes: {
		number:        { type: 'number', default: 0 },
		prefix:        { type: 'string', default: '' },
		suffix:        { type: 'string', default: '' },
		label:         { type: 'string', source: 'html', selector: '.sgs-counter__label', default: '' },
		duration:      { type: 'number', default: 2000 },
		separator:     { type: 'boolean', default: true },
		numberColour:  { type: 'string', default: '' },
		labelColour:   { type: 'string', default: '' },
		labelFontSize: { type: 'string', default: '' },
	},
	supports: {
		align: false,
		anchor: true,
		html: false,
		color: { background: true, text: true, link: true },
		typography: { fontSize: true, lineHeight: true, textAlign: true },
		spacing: { margin: true, padding: true },
		border: { color: true, radius: true, style: true, width: true },
	},
	save: () => null,
	migrate: ( attributes ) => attributes,
};

export default [ v1 ];
