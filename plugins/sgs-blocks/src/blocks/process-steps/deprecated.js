import { useBlockProps } from '@wordpress/block-editor';
import { colourVar } from '../../utils';

/**
 * V2 deprecation: save output before hover state attributes were added.
 * The className used Array.join without .filter(Boolean), and the wrapper
 * had no inline style prop from hover vars.
 * Migrate passes attributes unchanged — new hover attrs default to "".
 */
const v2 = {
	attributes: {
		steps: {
			type: 'array',
			default: [],
		},
		connectorStyle: {
			type: 'string',
			default: 'line',
		},
		numberStyle: {
			type: 'string',
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
	save( { attributes } ) {
		const {
			steps,
			connectorStyle,
			numberStyle,
			numberColour,
			numberBackground,
			titleColour,
			descriptionColour,
		} = attributes;

		const className = [
			'sgs-process-steps',
			`sgs-process-steps--connector-${ connectorStyle }`,
			`sgs-process-steps--number-${ numberStyle }`,
		].join( ' ' );

		const blockProps = useBlockProps.save( { className } );

		const numStyle = {
			color: colourVar( numberColour ) || undefined,
			backgroundColor: colourVar( numberBackground ) || undefined,
		};
		const titleStyle = {
			color: colourVar( titleColour ) || undefined,
		};
		const descStyle = {
			color: colourVar( descriptionColour ) || undefined,
		};

		return (
			<div { ...blockProps }>
				{ steps.map( ( step, index ) => (
					<div key={ index } className="sgs-process-steps__step">
						{ step.icon && (
							<span
								className="sgs-process-steps__icon"
								aria-hidden="true"
								data-icon={ step.icon }
							>
								{ step.icon }
							</span>
						) }
						{ numberStyle !== 'none' && (
							<span
								className="sgs-process-steps__number"
								style={ numStyle }
								aria-hidden="true"
							>
								{ step.number || index + 1 }
							</span>
						) }
						<h3 className="sgs-process-steps__title" style={ titleStyle }>
							{ step.title }
						</h3>
						{ step.description && (
							<p
								className="sgs-process-steps__description"
								style={ descStyle }
							>
								{ step.description }
							</p>
						) }
					</div>
				) ) }
			</div>
		);
	},
	migrate( attributes ) {
		return {
			...attributes,
			hoverBackgroundColour: '',
			hoverTextColour: '',
			hoverBorderColour: '',
			hoverEffect: 'none',
		};
	},
};

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

export default [ v2, v1 ];
