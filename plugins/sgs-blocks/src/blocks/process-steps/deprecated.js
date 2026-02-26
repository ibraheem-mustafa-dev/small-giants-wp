/**
 * V1 deprecation: block was inserted with empty innerHTML (save.js not yet active
 * when content was created). Also migrates old field names:
 *   - steps[].heading  → steps[].title
 *   - connectorLine (boolean) → connectorStyle ("line" | "none")
 */
const v1 = {
	attributes: {
		steps: {
			type:    'array',
			default: [],
		},
		connectorLine: {
			type:    'boolean',
			default: true,
		},
		connectorStyle: {
			type:    'string',
			default: 'line',
		},
		numberStyle: {
			type:    'string',
			default: 'circle',
		},
		numberColour:      { type: 'string' },
		numberBackground:  { type: 'string' },
		titleColour:       { type: 'string' },
		descriptionColour: { type: 'string' },
	},
	supports: {
		align:  [ 'wide', 'full' ],
		anchor: true,
		html:   false,
		color:  { background: true, text: true },
		typography: { fontSize: true, lineHeight: true },
		spacing: { margin: true, padding: true },
		__experimentalBorder: {
			radius: true,
			width:  true,
			color:  true,
			style:  true,
		},
	},
	save() {
		return null;
	},
	migrate( { steps = [], connectorLine, connectorStyle, ...rest } ) {
		// Normalise step field names: old shape used `heading`, current uses `title`.
		const normalisedSteps = steps.map( ( step ) => {
			const { heading, ...stepRest } = step;
			return {
				...stepRest,
				title: step.title || heading || '',
			};
		} );

		// Normalise connector field: old shape used boolean `connectorLine`.
		const normalisedConnectorStyle =
			connectorStyle ||
			( connectorLine === false ? 'none' : 'line' );

		return {
			...rest,
			steps:          normalisedSteps,
			connectorStyle: normalisedConnectorStyle,
		};
	},
};

export default [ v1 ];
