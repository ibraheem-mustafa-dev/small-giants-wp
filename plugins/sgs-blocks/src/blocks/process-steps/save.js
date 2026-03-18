import { useBlockProps } from '@wordpress/block-editor';
import { colourVar } from '../../utils';

export default function Save( { attributes } ) {
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

	const wrapperStyle = {
		'--sgs-hover-bg': hoverBackgroundColour ? colourVar( hoverBackgroundColour ) : undefined,
		'--sgs-hover-text': hoverTextColour ? colourVar( hoverTextColour ) : undefined,
		'--sgs-hover-border': hoverBorderColour ? colourVar( hoverBorderColour ) : undefined,
		'--sgs-transition-duration': transitionDuration ? `${ transitionDuration }ms` : undefined,
		'--sgs-transition-easing': transitionEasing || undefined,
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
}
