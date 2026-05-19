import { useBlockProps, RichText } from '@wordpress/block-editor';
import { colourVar } from '../../utils';

/**
 * Heading block deprecations.
 *
 * v1 — Static save shape from before the dynamic conversion (2026-05-21).
 *      save.js used to produce real HTML driven by RichText.Content.
 *      After the dynamic conversion, save() returns null and rendering
 *      is delegated entirely to render.php.
 *
 *      This entry covers all posts saved while the block was static,
 *      regardless of the specific attribute subset stored at the time
 *      (the attribute snapshot below matches block.json v0.3.0).
 *
 *      migrate() is an identity pass-through — attributes did not change
 *      shape during the static→dynamic conversion.
 */

/**
 * Build inline style for a single slot.
 * Reproduced verbatim from the pre-conversion save.js so WordPress can
 * re-serialise stored posts to verify the block content matches.
 *
 * @param {Object} args Style property arguments.
 * @return {Object}     React-compatible style object.
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
		letterSpacing: ( letterSpacing !== null && letterSpacing !== undefined )
			? `${ letterSpacing }${ letterSpacingUnit }`
			: undefined,
		textTransform: textTransform || undefined,
		fontFamily: fontFamily || undefined,
	};

	return Object.fromEntries(
		Object.entries( style ).filter( ( [ , v ] ) => v !== undefined )
	);
}

const v1 = {
	attributes: {
		label:                    { type: 'string', default: '' },
		labelEnabled:             { type: 'boolean', default: true },
		labelTag:                 { type: 'string', enum: [ 'span', 'p', 'div' ], default: 'span' },
		labelFontFamily:          { type: 'string', default: '' },
		labelFontSize:            { type: 'number', default: 12 },
		labelFontSizeUnit:        { type: 'string', default: 'px' },
		labelFontSizeTablet:      { type: 'number' },
		labelFontSizeMobile:      { type: 'number' },
		labelFontWeight:          { type: 'string', default: '600' },
		labelLineHeight:          { type: 'number', default: 1.2 },
		labelLineHeightUnit:      { type: 'string', default: 'em' },
		labelLetterSpacing:       { type: 'number', default: 0.08 },
		labelLetterSpacingUnit:   { type: 'string', default: 'em' },
		labelTextTransform:       { type: 'string', default: 'uppercase' },
		labelColour:              { type: 'string', default: 'primary' },

		headline:                    { type: 'string', default: '' },
		headlineLevel:               { type: 'string', enum: [ 'h1', 'h2', 'h3', 'h4' ], default: 'h2' },
		headlineId:                  { type: 'string', default: '' },
		headlineFontFamily:          { type: 'string', default: '' },
		headlineFontSize:            { type: 'number', default: 28 },
		headlineFontSizeUnit:        { type: 'string', default: 'px' },
		headlineFontSizeTablet:      { type: 'number' },
		headlineFontSizeMobile:      { type: 'number' },
		headlineFontWeight:          { type: 'string', default: '700' },
		headlineLineHeight:          { type: 'number' },
		headlineLineHeightUnit:      { type: 'string', default: 'em' },
		headlineLetterSpacing:       { type: 'number' },
		headlineLetterSpacingUnit:   { type: 'string', default: 'em' },
		headlineTextTransform:       { type: 'string', default: '' },
		headlineColour:              { type: 'string', default: 'text' },

		sub:                  { type: 'string', default: '' },
		subEnabled:           { type: 'boolean', default: true },
		subTag:               { type: 'string', enum: [ 'p', 'div' ], default: 'p' },
		subFontFamily:        { type: 'string', default: '' },
		subFontSize:          { type: 'number', default: 16 },
		subFontSizeUnit:      { type: 'string', default: 'px' },
		subFontSizeTablet:    { type: 'number' },
		subFontSizeMobile:    { type: 'number' },
		subFontWeight:        { type: 'string', default: '400' },
		subLineHeight:        { type: 'number' },
		subLineHeightUnit:    { type: 'string', default: 'em' },
		subLetterSpacing:     { type: 'number' },
		subLetterSpacingUnit: { type: 'string', default: 'em' },
		subTextTransform:     { type: 'string', default: '' },
		subColour:            { type: 'string', default: 'text-muted' },

		icon:         { type: 'string', default: '' },
		iconPosition: { type: 'string', enum: [ 'before-label', 'before-headline', 'none' ], default: 'none' },
		emoji:        { type: 'string', default: '' },
	},
	supports: {
		align: true,
		html: false,
		color: { text: true, background: true, link: false },
		spacing: { margin: true, padding: true },
	},
	save( { attributes } ) {
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
	},
	migrate( attributes ) {
		// Attributes did not change shape — pass through unchanged.
		return attributes;
	},
};

export default [ v1 ];
