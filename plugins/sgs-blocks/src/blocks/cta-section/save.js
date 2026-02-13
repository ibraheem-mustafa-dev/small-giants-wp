import { useBlockProps, RichText } from '@wordpress/block-editor';
import { colourVar, fontSizeVar } from '../../utils';

export default function Save( { attributes } ) {
	const {
		headline,
		body,
		buttons,
		layout,
		headlineColour,
		bodyColour,
		bodyFontSize,
		buttonColour,
		buttonBackground,
	} = attributes;

	const className = [
		'sgs-cta-section',
		`sgs-cta-section--${ layout }`,
	].join( ' ' );

	const blockProps = useBlockProps.save( { className } );

	const headlineStyle = {
		color: colourVar( headlineColour ) || undefined,
	};

	const bodyStyle = {
		color: colourVar( bodyColour ) || undefined,
		fontSize: fontSizeVar( bodyFontSize ) || undefined,
	};

	const btnStyle = {
		color: colourVar( buttonColour ) || undefined,
		backgroundColor: colourVar( buttonBackground ) || undefined,
	};

	return (
		<section { ...blockProps }>
			<div className="sgs-cta-section__content">
				<RichText.Content
					tagName="h2"
					className="sgs-cta-section__headline"
					value={ headline }
					style={ headlineStyle }
				/>
				<RichText.Content
					tagName="p"
					className="sgs-cta-section__body"
					value={ body }
					style={ bodyStyle }
				/>
			</div>
			{ buttons.length > 0 && (
				<div className="sgs-cta-section__buttons">
					{ buttons.map( ( btn, index ) =>
						btn.text ? (
							<a
								key={ index }
								href={ btn.url || '#' }
								className={ `sgs-cta-section__btn sgs-cta-section__btn--${ btn.style || 'accent' }` }
								style={ btnStyle }
							>
								{ btn.text }
							</a>
						) : null
					) }
				</div>
			) }
		</section>
	);
}
