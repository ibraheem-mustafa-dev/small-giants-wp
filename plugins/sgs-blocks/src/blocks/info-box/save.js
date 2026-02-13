import { useBlockProps, RichText } from '@wordpress/block-editor';
import { colourVar, fontSizeVar } from '../../utils';

export default function Save( { attributes } ) {
	const {
		icon,
		heading,
		description,
		link,
		linkOpensNewTab,
		iconColour,
		iconBackgroundColour,
		iconSize,
		headingColour,
		headingFontSize,
		descriptionColour,
		cardStyle,
		hoverEffect,
	} = attributes;

	const className = [
		'sgs-info-box',
		`sgs-info-box--${ cardStyle }`,
		`sgs-info-box--hover-${ hoverEffect }`,
	].join( ' ' );

	const blockProps = useBlockProps.save( { className } );

	const iconStyle = {
		color: colourVar( iconColour ),
		backgroundColor: colourVar( iconBackgroundColour ),
	};

	const headingStyle = {
		color: colourVar( headingColour ) || undefined,
		fontSize: fontSizeVar( headingFontSize ) || undefined,
	};

	const descriptionStyle = {
		color: colourVar( descriptionColour ) || undefined,
	};

	const cardContent = (
		<>
			<span
				className={ `sgs-info-box__icon sgs-info-box__icon--${ iconSize }` }
				style={ iconStyle }
				data-icon={ icon }
				aria-hidden="true"
			/>
			<RichText.Content
				tagName="h3"
				className="sgs-info-box__heading"
				value={ heading }
				style={ headingStyle }
			/>
			<RichText.Content
				tagName="p"
				className="sgs-info-box__description"
				value={ description }
				style={ descriptionStyle }
			/>
		</>
	);

	if ( link ) {
		return (
			<div { ...blockProps }>
				<a
					href={ link }
					className="sgs-info-box__link"
					{ ...( linkOpensNewTab
						? { target: '_blank', rel: 'noopener noreferrer' }
						: {} ) }
				>
					{ cardContent }
				</a>
			</div>
		);
	}

	return <div { ...blockProps }>{ cardContent }</div>;
}
