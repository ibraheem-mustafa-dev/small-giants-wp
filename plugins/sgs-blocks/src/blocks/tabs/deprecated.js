/**
 * Tabs block — v1 deprecation.
 *
 * Same root cause as accordion: empty innerHTML from WP-CLI creation
 * before save.js existed. save: () => null matches any stored content.
 */

const v1 = {
	attributes: {
		orientation:              { type: 'string', default: 'horizontal' },
		tabAlignment:             { type: 'string', default: 'left' },
		tabStyle:                 { type: 'string', default: 'underline' },
		tabTextColour:            { type: 'string', default: '' },
		tabActiveTextColour:      { type: 'string', default: '' },
		tabActiveBgColour:        { type: 'string', default: '' },
		tabActiveIndicatorColour: { type: 'string', default: '' },
		tabHoverBgColour:         { type: 'string', default: '' },
		panelBgColour:            { type: 'string', default: '' },
		panelBorderColour:        { type: 'string', default: '' },
		transitionDuration:       { type: 'number', default: 200 },
	},
	supports: {
		align: [ 'wide', 'full' ],
		anchor: true,
		html: false,
		color: { background: true, text: true },
		spacing: { margin: true, padding: true },
		border: { color: true, radius: true, style: true, width: true },
	},
	save: () => null,
	migrate: ( attributes ) => attributes,
};

export default [ v1 ];
