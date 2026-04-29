import { useBlockProps } from '@wordpress/block-editor';
import { colourVar } from '../../utils';

/**
 * V4 deprecation: save output before Wave 1 animation attributes and colour
 * defaults were added. Existing posts have:
 *   - NO data-sgs-animation* attributes on the wrapper
 *   - NO inline colour/background-colour styles on __number, __title, __description
 *     (colour attribute defaults were empty strings, so colourVar() returned falsy)
 *   - YES --sgs-transition-duration / --sgs-transition-easing CSS vars on the wrapper
 * Migrate supplies animation attribute defaults so current save.js emits them on
 * the next editor save.
 */
const v4 = {
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
		// Defaults intentionally empty — pre-Wave-1 posts had no colour defaults,
		// so colourVar() returned falsy and no inline styles were written.
		numberColour:          { type: 'string', default: '' },
		numberBackground:      { type: 'string', default: '' },
		titleColour:           { type: 'string', default: '' },
		descriptionColour:     { type: 'string', default: '' },
		hoverBackgroundColour: { type: 'string', default: '' },
		hoverTextColour:       { type: 'string', default: '' },
		hoverBorderColour:     { type: 'string', default: '' },
		hoverEffect:           { type: 'string', default: 'none' },
		transitionDuration:    { type: 'string', default: '300' },
		transitionEasing:      { type: 'string', default: 'ease-in-out' },
		// Animation attributes existed in schema but were NOT serialised to the
		// wrapper markup yet — declare here so WP can match the stored block comment.
		sgsAnimation:         { type: 'string', default: '' },
		sgsAnimationDuration: { type: 'string', default: 'medium' },
		sgsAnimationEasing:   { type: 'string', default: 'ease-out' },
		staggerDelay:         { type: 'number', default: 80 },
	},
	supports: {
		align:  [ 'wide', 'full' ],
		anchor: true,
		html:   false,
		color:  { background: true, text: true },
		typography: { fontSize: true, lineHeight: true },
		spacing: { margin: true, padding: true },
		shadow: true,
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
			hoverBackgroundColour,
			hoverTextColour,
			hoverBorderColour,
			hoverEffect,
			transitionDuration,
			transitionEasing,
		} = attributes;

		const className = [
			'sgs-process-steps',
			`sgs-process-steps--connector-${ connectorStyle }`,
			`sgs-process-steps--number-${ numberStyle }`,
			hoverEffect && hoverEffect !== 'none' ? `sgs-process-steps--hover-${ hoverEffect }` : '',
		].filter( Boolean ).join( ' ' );

		// No animation data-attributes — these were not yet written to the wrapper.
		const wrapperStyle = {
			'--sgs-hover-bg': hoverBackgroundColour ? colourVar( hoverBackgroundColour ) : undefined,
			'--sgs-hover-text': hoverTextColour ? colourVar( hoverTextColour ) : undefined,
			'--sgs-hover-border': hoverBorderColour ? colourVar( hoverBorderColour ) : undefined,
			'--sgs-transition-duration': transitionDuration ? `${ transitionDuration }ms` : undefined,
			'--sgs-transition-easing': transitionEasing || undefined,
		};

		const blockProps = useBlockProps.save( { className, style: wrapperStyle } );

		// Empty-string defaults → colourVar returns falsy → no inline style emitted.
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
			// Supply Wave 1 animation defaults so the current save.js emits
			// data-sgs-animation* on the next editor save.
			sgsAnimation:         'fade-up',
			sgsAnimationDuration: attributes.sgsAnimationDuration || 'medium',
			sgsAnimationEasing:   attributes.sgsAnimationEasing   || 'ease-out',
			staggerDelay:         attributes.staggerDelay          ?? 80,
			// Backfill colour defaults so the current save.js emits inline styles.
			numberColour:     attributes.numberColour     || 'text-inverse',
			numberBackground: attributes.numberBackground || 'primary',
			titleColour:      attributes.titleColour      || 'text',
			descriptionColour: attributes.descriptionColour || 'text-muted',
		};
	},
};

/**
 * V3 deprecation: save output before transitionDuration and transitionEasing
 * CSS variables were added to the wrapper style. Existing posts have no
 * --sgs-transition-duration / --sgs-transition-easing inline vars.
 * Migrate passes attributes unchanged — new attrs use block.json defaults.
 */
const v3 = {
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
		numberColour:          { type: 'string' },
		numberBackground:      { type: 'string' },
		titleColour:           { type: 'string' },
		descriptionColour:     { type: 'string' },
		hoverBackgroundColour: { type: 'string', default: '' },
		hoverTextColour:       { type: 'string', default: '' },
		hoverBorderColour:     { type: 'string', default: '' },
		hoverEffect:           { type: 'string', default: 'none' },
	},
	supports: {
		align:  [ 'wide', 'full' ],
		anchor: true,
		html:   false,
		color:  { background: true, text: true },
		typography: { fontSize: true, lineHeight: true },
		spacing: { margin: true, padding: true },
		shadow: true,
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
			hoverBackgroundColour,
			hoverTextColour,
			hoverBorderColour,
			hoverEffect,
		} = attributes;

		const className = [
			'sgs-process-steps',
			`sgs-process-steps--connector-${ connectorStyle }`,
			`sgs-process-steps--number-${ numberStyle }`,
			hoverEffect && hoverEffect !== 'none' ? `sgs-process-steps--hover-${ hoverEffect }` : '',
		].filter( Boolean ).join( ' ' );

		const wrapperStyle = {
			'--sgs-hover-bg': hoverBackgroundColour ? colourVar( hoverBackgroundColour ) : undefined,
			'--sgs-hover-text': hoverTextColour ? colourVar( hoverTextColour ) : undefined,
			'--sgs-hover-border': hoverBorderColour ? colourVar( hoverBorderColour ) : undefined,
		};

		const blockProps = useBlockProps.save( { className, style: wrapperStyle } );

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
			transitionDuration: '300',
			transitionEasing:   'ease-in-out',
		};
	},
};

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

export default [ v4, v3, v2, v1 ];
