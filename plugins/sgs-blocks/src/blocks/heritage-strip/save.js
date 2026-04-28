import { useBlockProps, RichText } from '@wordpress/block-editor';
import { colourVar, fontSizeVar } from '../../utils';

export default function Save( { attributes } ) {
	const {
		layout,
		headline,
		body,
		imageLeft,
		imageRight,
		headlineColour,
		headlineFontSize,
		headlineFontSizeTablet,
		headlineFontSizeMobile,
		bodyColour,
		bodyFontSize,
		bodyFontSizeTablet,
		bodyFontSizeMobile,
		hoverBackgroundColour,
		hoverTextColour,
		hoverBorderColour,
		hoverEffect,
		transitionDuration,
		transitionEasing,
		badge,
		bgPattern,
	} = attributes;

	const showLeftImage =
		layout === 'image-text-image' || layout === 'image-text';
	const showRightImage =
		layout === 'image-text-image' || layout === 'text-image';

	const className = [
		'sgs-heritage-strip',
		`sgs-heritage-strip--${ layout }`,
		hoverEffect && hoverEffect !== 'none' ? `sgs-heritage-strip--hover-${ hoverEffect }` : '',
		bgPattern && bgPattern !== 'none' ? `sgs-heritage-strip--pattern-${ bgPattern }` : '',
	].filter( Boolean ).join( ' ' );

	const wrapperStyle = {
		'--sgs-hover-bg': hoverBackgroundColour ? colourVar( hoverBackgroundColour ) : undefined,
		'--sgs-hover-text': hoverTextColour ? colourVar( hoverTextColour ) : undefined,
		'--sgs-hover-border': hoverBorderColour ? colourVar( hoverBorderColour ) : undefined,
		'--sgs-transition-duration': transitionDuration ? `${ transitionDuration }ms` : undefined,
		'--sgs-transition-easing': transitionEasing || undefined,
	};

	// Responsive font-size data-attributes for CSS media query selectors.
	const dataAttrs = {};
	if ( headlineFontSizeTablet ) {
		dataAttrs[ 'data-headline-fs-tablet' ] = headlineFontSizeTablet;
	}
	if ( headlineFontSizeMobile ) {
		dataAttrs[ 'data-headline-fs-mobile' ] = headlineFontSizeMobile;
	}
	if ( bodyFontSizeTablet ) {
		dataAttrs[ 'data-body-fs-tablet' ] = bodyFontSizeTablet;
	}
	if ( bodyFontSizeMobile ) {
		dataAttrs[ 'data-body-fs-mobile' ] = bodyFontSizeMobile;
	}

	const blockProps = useBlockProps.save( { className, style: wrapperStyle, ...dataAttrs } );

	const headlineStyle = {
		color: colourVar( headlineColour ) || undefined,
		fontSize: fontSizeVar( headlineFontSize ) || undefined,
	};

	const bodyStyle = {
		color: colourVar( bodyColour ) || undefined,
		fontSize: fontSizeVar( bodyFontSize ) || undefined,
	};

	return (
		<section { ...blockProps }>
			{ showLeftImage && imageLeft?.url && (
				<div className="sgs-heritage-strip__image sgs-heritage-strip__image--left">
					<img
						src={ imageLeft.url }
						alt={ imageLeft.alt || '' }
						className="sgs-heritage-strip__img"
						loading="lazy"
					/>
				</div>
			) }

			<div className="sgs-heritage-strip__content">
				{ badge && (
					<span className="sgs-heritage-strip__badge">
						{ badge }
					</span>
				) }
				<RichText.Content
					tagName="h2"
					className="sgs-heritage-strip__headline"
					value={ headline }
					style={ headlineStyle }
				/>
				<RichText.Content
					tagName="div"
					className="sgs-heritage-strip__body"
					value={ body }
					style={ bodyStyle }
				/>
			</div>

			{ showRightImage && imageRight?.url && (
				<div className="sgs-heritage-strip__image sgs-heritage-strip__image--right">
					<img
						src={ imageRight.url }
						alt={ imageRight.alt || '' }
						className="sgs-heritage-strip__img"
						loading="lazy"
					/>
				</div>
			) }
		</section>
	);
}
