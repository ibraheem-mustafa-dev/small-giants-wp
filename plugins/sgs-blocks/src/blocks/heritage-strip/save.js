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
		bodyColour,
		bodyFontSize,
		hoverBackgroundColour,
		hoverTextColour,
		hoverBorderColour,
		hoverEffect,
	} = attributes;

	const showLeftImage =
		layout === 'image-text-image' || layout === 'image-text';
	const showRightImage =
		layout === 'image-text-image' || layout === 'text-image';

	const className = [
		'sgs-heritage-strip',
		`sgs-heritage-strip--${ layout }`,
		hoverEffect && hoverEffect !== 'none' ? `sgs-heritage-strip--hover-${ hoverEffect }` : '',
	].filter( Boolean ).join( ' ' );

	const wrapperStyle = {
		'--sgs-hover-bg': hoverBackgroundColour ? colourVar( hoverBackgroundColour ) : undefined,
		'--sgs-hover-text': hoverTextColour ? colourVar( hoverTextColour ) : undefined,
		'--sgs-hover-border': hoverBorderColour ? colourVar( hoverBorderColour ) : undefined,
	};

	const blockProps = useBlockProps.save( { className, style: wrapperStyle } );

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
