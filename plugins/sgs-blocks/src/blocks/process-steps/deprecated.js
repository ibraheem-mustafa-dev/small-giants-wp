/**
 * Process Steps block — deprecations.
 *
 * v2: Captures the static save output before the block was converted to
 *     server-side rendering via render.php.
 * v1: Pre-static-save era — empty innerHTML, migrates old field names
 *     (steps[].heading → steps[].title, connectorLine boolean → connectorStyle string).
 */
import { useBlockProps } from '@wordpress/block-editor';
import { colourVar } from '../../utils';

// v2 — static save function that existed before render.php conversion.
const v2 = {
	attributes: {
		steps:             { type: 'array', default: [] },
		connectorStyle:    { type: 'string', default: 'line' },
		numberStyle:       { type: 'string', default: 'circle' },
		numberColour:      { type: 'string' },
		numberBackground:  { type: 'string' },
		titleColour:       { type: 'string' },
		descriptionColour: { type: 'string' },
	},
	supports: {
		align:   [ 'wide', 'full' ],
		anchor:  true,
		html:    false,
		color:   { background: true, text: true },
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

		const numStyle   = {
			color:           colourVar( numberColour ) || undefined,
			backgroundColor: colourVar( numberBackground ) || undefined,
		};
		const titleStyle = { color: colourVar( titleColour ) || undefined };
		const descStyle  = { color: colourVar( descriptionColour ) || undefined };

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
							<p className="sgs-process-steps__description" style={ descStyle }>
								{ step.description }
							</p>
						) }
					</div>
				) ) }
			</div>
		);
	},
	migrate( attributes ) {
		return attributes;
	},
};

// v1 — block inserted with empty innerHTML before static save existed.
// Also migrates old field names (heading → title, connectorLine boolean → connectorStyle).
const v1 = {
	attributes: {
		steps:             { type: 'array', default: [] },
		connectorLine:     { type: 'boolean', default: true },
		connectorStyle:    { type: 'string', default: 'line' },
		numberStyle:       { type: 'string', default: 'circle' },
		numberColour:      { type: 'string' },
		numberBackground:  { type: 'string' },
		titleColour:       { type: 'string' },
		descriptionColour: { type: 'string' },
	},
	supports: {
		align:   [ 'wide', 'full' ],
		anchor:  true,
		html:    false,
		color:   { background: true, text: true },
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
		const normalisedSteps = steps.map( ( step ) => {
			const { heading, ...stepRest } = step;
			return { ...stepRest, title: step.title || heading || '' };
		} );
		const normalisedConnectorStyle =
			connectorStyle || ( connectorLine === false ? 'none' : 'line' );
		return { ...rest, steps: normalisedSteps, connectorStyle: normalisedConnectorStyle };
	},
};

export default [ v2, v1 ];
