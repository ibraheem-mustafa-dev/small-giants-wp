import { useBlockProps, RichText } from '@wordpress/block-editor';
import { colourVar } from '../../utils';

/**
 * Build inline style for a single slot.
 * All values serialise into the block comment — no runtime JS needed.
 */
function buildSlotStyle( {
	colour,
	fontFamily,
	fontSize,
	fontSizeUnit,
	fontWeight,
	lineHeight,
	lineHeightUnit,
	letterSpacing,
	letterSpacingUnit,
	textTransform,
} ) {
	const style = {
		color: colourVar( colour ) || undefined,
		fontSize: fontSize ? `${ fontSize }${ fontSizeUnit }` : undefined,
		fontWeight: fontWeight || undefined,
		lineHeight: lineHeight ? `${ lineHeight }${ lineHeightUnit }` : undefined,
		letterSpacing: letterSpacing != null
			? `${ letterSpacing }${ letterSpacingUnit }`
			: undefined,
		textTransform: textTransform || undefined,
		fontFamily: fontFamily || undefined,
	};

	return Object.fromEntries(
		Object.entries( style ).filter( ( [ , v ] ) => v !== undefined )
	);
}

export default function Save( { attributes } ) {
	const {
		label,
		labelEnabled,
		labelTag,
		labelColour,
		labelFontFamily,
		labelFontSize,
		labelFontSizeUnit,
		labelFontWeight,
		labelLineHeight,
		labelLineHeightUnit,
		labelLetterSpacing,
		labelLetterSpacingUnit,
		labelTextTransform,

		headline,
		headlineLevel,
		headlineId,
		headlineColour,
		headlineFontFamily,
		headlineFontSize,
		headlineFontSizeUnit,
		headlineFontWeight,
		headlineLineHeight,
		headlineLineHeightUnit,
		headlineLetterSpacing,
		headlineLetterSpacingUnit,
		headlineTextTransform,

		sub,
		subEnabled,
		subTag,
		subColour,
		subFontFamily,
		subFontSize,
		subFontSizeUnit,
		subFontWeight,
		subLineHeight,
		subLineHeightUnit,
		subLetterSpacing,
		subLetterSpacingUnit,
		subTextTransform,

		icon,
		iconPosition,
		emoji,
	} = attributes;

	const labelStyle = buildSlotStyle( {
		colour: labelColour,
		fontFamily: labelFontFamily,
		fontSize: labelFontSize,
		fontSizeUnit: labelFontSizeUnit,
		fontWeight: labelFontWeight,
		lineHeight: labelLineHeight,
		lineHeightUnit: labelLineHeightUnit,
		letterSpacing: labelLetterSpacing,
		letterSpacingUnit: labelLetterSpacingUnit,
		textTransform: labelTextTransform,
	} );

	const headlineStyle = buildSlotStyle( {
		colour: headlineColour,
		fontFamily: headlineFontFamily,
		fontSize: headlineFontSize,
		fontSizeUnit: headlineFontSizeUnit,
		fontWeight: headlineFontWeight,
		lineHeight: headlineLineHeight,
		lineHeightUnit: headlineLineHeightUnit,
		letterSpacing: headlineLetterSpacing,
		letterSpacingUnit: headlineLetterSpacingUnit,
		textTransform: headlineTextTransform,
	} );

	const subStyle = buildSlotStyle( {
		colour: subColour,
		fontFamily: subFontFamily,
		fontSize: subFontSize,
		fontSizeUnit: subFontSizeUnit,
		fontWeight: subFontWeight,
		lineHeight: subLineHeight,
		lineHeightUnit: subLineHeightUnit,
		letterSpacing: subLetterSpacing,
		letterSpacingUnit: subLetterSpacingUnit,
		textTransform: subTextTransform,
	} );

	const blockProps = useBlockProps.save( {
		className: 'wp-block-sgs-heading',
	} );

	return (
		<div { ...blockProps }>
			{ /* Icon / emoji before label */ }
			{ iconPosition === 'before-label' && ( icon || emoji ) && (
				<span className="wp-block-sgs-heading__icon" aria-hidden="true">
					{ emoji || icon }
				</span>
			) }

			{ /* Label — only serialised when enabled */ }
			{ labelEnabled && (
				<RichText.Content
					tagName={ labelTag }
					className="wp-block-sgs-heading__label"
					value={ label }
					style={ labelStyle }
				/>
			) }

			{ /* Icon / emoji before headline */ }
			{ iconPosition === 'before-headline' && ( icon || emoji ) && (
				<span className="wp-block-sgs-heading__icon" aria-hidden="true">
					{ emoji || icon }
				</span>
			) }

			{ /* Headline — always present */ }
			<RichText.Content
				tagName={ headlineLevel }
				className="wp-block-sgs-heading__headline"
				id={ headlineId || undefined }
				value={ headline }
				style={ headlineStyle }
			/>

			{ /* Sub — only serialised when enabled */ }
			{ subEnabled && (
				<RichText.Content
					tagName={ subTag }
					className="wp-block-sgs-heading__sub"
					value={ sub }
					style={ subStyle }
				/>
			) }
		</div>
	);
}
