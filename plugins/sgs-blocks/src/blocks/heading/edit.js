import { __ } from '@wordpress/i18n';
import {
	useBlockProps,
	RichText,
	InspectorControls,
} from '@wordpress/block-editor';
import {
	PanelBody,
	SelectControl,
	RangeControl,
	ToggleControl,
	TextControl,
} from '@wordpress/components';
import { DesignTokenPicker } from '../../components';
import { colourVar } from '../../utils';

// ─── Shared option sets ───────────────────────────────────────────────────────

const TAG_OPTIONS_INLINE = [
	{ label: __( 'span (inline)', 'sgs-blocks' ), value: 'span' },
	{ label: __( 'p (paragraph)', 'sgs-blocks' ), value: 'p' },
	{ label: __( 'div (block)', 'sgs-blocks' ), value: 'div' },
];

const HEADING_LEVEL_OPTIONS = [
	{ label: __( 'H1', 'sgs-blocks' ), value: 'h1' },
	{ label: __( 'H2 (default)', 'sgs-blocks' ), value: 'h2' },
	{ label: __( 'H3', 'sgs-blocks' ), value: 'h3' },
	{ label: __( 'H4', 'sgs-blocks' ), value: 'h4' },
];

const SUB_TAG_OPTIONS = [
	{ label: __( 'p (paragraph)', 'sgs-blocks' ), value: 'p' },
	{ label: __( 'div (block)', 'sgs-blocks' ), value: 'div' },
];

const TEXT_TRANSFORM_OPTIONS = [
	{ label: __( 'None', 'sgs-blocks' ), value: 'none' },
	{ label: __( 'Uppercase', 'sgs-blocks' ), value: 'uppercase' },
	{ label: __( 'Lowercase', 'sgs-blocks' ), value: 'lowercase' },
	{ label: __( 'Capitalise', 'sgs-blocks' ), value: 'capitalize' },
];

const FONT_WEIGHT_OPTIONS = [
	{ label: __( 'Regular (400)', 'sgs-blocks' ), value: '400' },
	{ label: __( 'Medium (500)', 'sgs-blocks' ), value: '500' },
	{ label: __( 'Semi-bold (600)', 'sgs-blocks' ), value: '600' },
	{ label: __( 'Bold (700)', 'sgs-blocks' ), value: '700' },
	{ label: __( 'Extra-bold (800)', 'sgs-blocks' ), value: '800' },
];

const UNIT_OPTIONS_EM = [
	{ label: 'em', value: 'em' },
	{ label: 'rem', value: 'rem' },
	{ label: 'px', value: 'px' },
];

const UNIT_OPTIONS_PX = [
	{ label: 'px', value: 'px' },
	{ label: 'em', value: 'em' },
	{ label: 'rem', value: 'rem' },
];

const ICON_POSITION_OPTIONS = [
	{ label: __( 'None', 'sgs-blocks' ), value: 'none' },
	{ label: __( 'Before label', 'sgs-blocks' ), value: 'before-label' },
	{ label: __( 'Before headline', 'sgs-blocks' ), value: 'before-headline' },
];

// ─── Inline style builders ────────────────────────────────────────────────────

function buildLabelStyle( attributes ) {
	const {
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
	} = attributes;

	const style = {
		color: colourVar( labelColour ) || undefined,
		fontSize: labelFontSize
			? `${ labelFontSize }${ labelFontSizeUnit }`
			: undefined,
		fontWeight: labelFontWeight || undefined,
		lineHeight: labelLineHeight
			? `${ labelLineHeight }${ labelLineHeightUnit }`
			: undefined,
		letterSpacing: labelLetterSpacing != null
			? `${ labelLetterSpacing }${ labelLetterSpacingUnit }`
			: undefined,
		textTransform: labelTextTransform || undefined,
		fontFamily: labelFontFamily || undefined,
	};

	return Object.fromEntries(
		Object.entries( style ).filter( ( [ , v ] ) => v !== undefined )
	);
}

function buildHeadlineStyle( attributes ) {
	const {
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
	} = attributes;

	const style = {
		color: colourVar( headlineColour ) || undefined,
		fontSize: headlineFontSize
			? `${ headlineFontSize }${ headlineFontSizeUnit }`
			: undefined,
		fontWeight: headlineFontWeight || undefined,
		lineHeight: headlineLineHeight
			? `${ headlineLineHeight }${ headlineLineHeightUnit }`
			: undefined,
		letterSpacing: headlineLetterSpacing != null
			? `${ headlineLetterSpacing }${ headlineLetterSpacingUnit }`
			: undefined,
		textTransform: headlineTextTransform || undefined,
		fontFamily: headlineFontFamily || undefined,
	};

	return Object.fromEntries(
		Object.entries( style ).filter( ( [ , v ] ) => v !== undefined )
	);
}

function buildSubStyle( attributes ) {
	const {
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
	} = attributes;

	const style = {
		color: colourVar( subColour ) || undefined,
		fontSize: subFontSize
			? `${ subFontSize }${ subFontSizeUnit }`
			: undefined,
		fontWeight: subFontWeight || undefined,
		lineHeight: subLineHeight
			? `${ subLineHeight }${ subLineHeightUnit }`
			: undefined,
		letterSpacing: subLetterSpacing != null
			? `${ subLetterSpacing }${ subLetterSpacingUnit }`
			: undefined,
		textTransform: subTextTransform || undefined,
		fontFamily: subFontFamily || undefined,
	};

	return Object.fromEntries(
		Object.entries( style ).filter( ( [ , v ] ) => v !== undefined )
	);
}

// ─── Reusable typography panel ────────────────────────────────────────────────

function TypographyPanel( { prefix, attributes, setAttributes, unitOptionsSize, labelOverride } ) {
	const fontSizeKey        = `${ prefix }FontSize`;
	const fontSizeUnitKey    = `${ prefix }FontSizeUnit`;
	const fontSizeTabletKey  = `${ prefix }FontSizeTablet`;
	const fontSizeMobileKey  = `${ prefix }FontSizeMobile`;
	const fontWeightKey      = `${ prefix }FontWeight`;
	const lineHeightKey      = `${ prefix }LineHeight`;
	const lineHeightUnitKey  = `${ prefix }LineHeightUnit`;
	const letterSpacingKey   = `${ prefix }LetterSpacing`;
	const letterSpacingUnitKey = `${ prefix }LetterSpacingUnit`;
	const textTransformKey   = `${ prefix }TextTransform`;

	return (
		<PanelBody title={ labelOverride || __( 'Typography', 'sgs-blocks' ) } initialOpen={ false }>
			<div className="sgs-inspector-row">
				<RangeControl
					label={ __( 'Font size (desktop)', 'sgs-blocks' ) }
					value={ attributes[ fontSizeKey ] }
					onChange={ ( val ) => setAttributes( { [ fontSizeKey ]: val } ) }
					min={ 8 }
					max={ 96 }
					step={ 1 }
					__nextHasNoMarginBottom
				/>
				<SelectControl
					label={ __( 'Unit', 'sgs-blocks' ) }
					value={ attributes[ fontSizeUnitKey ] }
					options={ unitOptionsSize || UNIT_OPTIONS_PX }
					onChange={ ( val ) => setAttributes( { [ fontSizeUnitKey ]: val } ) }
					__nextHasNoMarginBottom
				/>
			</div>
			<div className="sgs-inspector-row">
				<RangeControl
					label={ __( 'Font size (tablet)', 'sgs-blocks' ) }
					value={ attributes[ fontSizeTabletKey ] || '' }
					onChange={ ( val ) => setAttributes( { [ fontSizeTabletKey ]: val } ) }
					min={ 8 }
					max={ 96 }
					step={ 1 }
					__nextHasNoMarginBottom
					allowReset
				/>
				<RangeControl
					label={ __( 'Font size (mobile)', 'sgs-blocks' ) }
					value={ attributes[ fontSizeMobileKey ] || '' }
					onChange={ ( val ) => setAttributes( { [ fontSizeMobileKey ]: val } ) }
					min={ 8 }
					max={ 96 }
					step={ 1 }
					__nextHasNoMarginBottom
					allowReset
				/>
			</div>
			<SelectControl
				label={ __( 'Font weight', 'sgs-blocks' ) }
				value={ attributes[ fontWeightKey ] }
				options={ FONT_WEIGHT_OPTIONS }
				onChange={ ( val ) => setAttributes( { [ fontWeightKey ]: val } ) }
				__nextHasNoMarginBottom
			/>
			<SelectControl
				label={ __( 'Text transform', 'sgs-blocks' ) }
				value={ attributes[ textTransformKey ] }
				options={ TEXT_TRANSFORM_OPTIONS }
				onChange={ ( val ) => setAttributes( { [ textTransformKey ]: val } ) }
				__nextHasNoMarginBottom
			/>
			<div className="sgs-inspector-row">
				<RangeControl
					label={ __( 'Line height', 'sgs-blocks' ) }
					value={ attributes[ lineHeightKey ] }
					onChange={ ( val ) => setAttributes( { [ lineHeightKey ]: val } ) }
					min={ 0.8 }
					max={ 3 }
					step={ 0.05 }
					__nextHasNoMarginBottom
				/>
				<SelectControl
					label={ __( 'Unit', 'sgs-blocks' ) }
					value={ attributes[ lineHeightUnitKey ] }
					options={ UNIT_OPTIONS_EM }
					onChange={ ( val ) => setAttributes( { [ lineHeightUnitKey ]: val } ) }
					__nextHasNoMarginBottom
				/>
			</div>
			<div className="sgs-inspector-row">
				<RangeControl
					label={ __( 'Letter spacing', 'sgs-blocks' ) }
					value={ attributes[ letterSpacingKey ] }
					onChange={ ( val ) => setAttributes( { [ letterSpacingKey ]: val } ) }
					min={ -0.1 }
					max={ 0.5 }
					step={ 0.01 }
					__nextHasNoMarginBottom
				/>
				<SelectControl
					label={ __( 'Unit', 'sgs-blocks' ) }
					value={ attributes[ letterSpacingUnitKey ] }
					options={ UNIT_OPTIONS_EM }
					onChange={ ( val ) => setAttributes( { [ letterSpacingUnitKey ]: val } ) }
					__nextHasNoMarginBottom
				/>
			</div>
		</PanelBody>
	);
}

// ─── Main edit component ──────────────────────────────────────────────────────

export default function Edit( { attributes, setAttributes } ) {
	const {
		label,
		labelEnabled,
		labelTag,
		labelColour,
		headline,
		headlineLevel,
		headlineId,
		headlineColour,
		sub,
		subEnabled,
		subTag,
		subColour,
		icon,
		iconPosition,
		emoji,
	} = attributes;

	const blockProps = useBlockProps( {
		className: 'wp-block-sgs-heading',
	} );

	return (
		<>
			<InspectorControls>
				{ /* ── Label panel ── */ }
				<PanelBody title={ __( 'Label (eyebrow)', 'sgs-blocks' ) }>
					<ToggleControl
						label={ __( 'Show label', 'sgs-blocks' ) }
						checked={ labelEnabled }
						onChange={ ( val ) => setAttributes( { labelEnabled: val } ) }
						__nextHasNoMarginBottom
					/>
					{ labelEnabled && (
						<SelectControl
							label={ __( 'HTML tag', 'sgs-blocks' ) }
							value={ labelTag }
							options={ TAG_OPTIONS_INLINE }
							onChange={ ( val ) => setAttributes( { labelTag: val } ) }
							__nextHasNoMarginBottom
						/>
					) }
				</PanelBody>

				{ labelEnabled && (
					<>
						<PanelBody title={ __( 'Label — Colour', 'sgs-blocks' ) } initialOpen={ false }>
							<DesignTokenPicker
								label={ __( 'Text colour', 'sgs-blocks' ) }
								value={ labelColour }
								onChange={ ( val ) => setAttributes( { labelColour: val } ) }
							/>
						</PanelBody>
						<TypographyPanel
							prefix="label"
							attributes={ attributes }
							setAttributes={ setAttributes }
							unitOptionsSize={ UNIT_OPTIONS_PX }
							labelOverride={ __( 'Label — Typography', 'sgs-blocks' ) }
						/>
					</>
				) }

				{ /* ── Headline panel ── */ }
				<PanelBody title={ __( 'Headline', 'sgs-blocks' ) }>
					<SelectControl
						label={ __( 'Heading level', 'sgs-blocks' ) }
						value={ headlineLevel }
						options={ HEADING_LEVEL_OPTIONS }
						onChange={ ( val ) => setAttributes( { headlineLevel: val } ) }
						__nextHasNoMarginBottom
					/>
					<TextControl
						label={ __( 'ID (anchor / jump link)', 'sgs-blocks' ) }
						value={ headlineId }
						onChange={ ( val ) => setAttributes( { headlineId: val } ) }
						placeholder={ __( 'e.g. our-services', 'sgs-blocks' ) }
						__nextHasNoMarginBottom
					/>
				</PanelBody>

				<PanelBody title={ __( 'Headline — Colour', 'sgs-blocks' ) } initialOpen={ false }>
					<DesignTokenPicker
						label={ __( 'Text colour', 'sgs-blocks' ) }
						value={ headlineColour }
						onChange={ ( val ) => setAttributes( { headlineColour: val } ) }
					/>
				</PanelBody>

				<TypographyPanel
					prefix="headline"
					attributes={ attributes }
					setAttributes={ setAttributes }
					unitOptionsSize={ UNIT_OPTIONS_PX }
					labelOverride={ __( 'Headline — Typography', 'sgs-blocks' ) }
				/>

				{ /* ── Sub panel ── */ }
				<PanelBody title={ __( 'Sub (intro)', 'sgs-blocks' ) }>
					<ToggleControl
						label={ __( 'Show subheading', 'sgs-blocks' ) }
						checked={ subEnabled }
						onChange={ ( val ) => setAttributes( { subEnabled: val } ) }
						__nextHasNoMarginBottom
					/>
					{ subEnabled && (
						<SelectControl
							label={ __( 'HTML tag', 'sgs-blocks' ) }
							value={ subTag }
							options={ SUB_TAG_OPTIONS }
							onChange={ ( val ) => setAttributes( { subTag: val } ) }
							__nextHasNoMarginBottom
						/>
					) }
				</PanelBody>

				{ subEnabled && (
					<>
						<PanelBody title={ __( 'Sub — Colour', 'sgs-blocks' ) } initialOpen={ false }>
							<DesignTokenPicker
								label={ __( 'Text colour', 'sgs-blocks' ) }
								value={ subColour }
								onChange={ ( val ) => setAttributes( { subColour: val } ) }
							/>
						</PanelBody>
						<TypographyPanel
							prefix="sub"
							attributes={ attributes }
							setAttributes={ setAttributes }
							unitOptionsSize={ UNIT_OPTIONS_PX }
							labelOverride={ __( 'Sub — Typography', 'sgs-blocks' ) }
						/>
					</>
				) }

				{ /* ── Icon / emoji panel ── */ }
				<PanelBody title={ __( 'Icon / Emoji', 'sgs-blocks' ) } initialOpen={ false }>
					<SelectControl
						label={ __( 'Icon position', 'sgs-blocks' ) }
						value={ iconPosition }
						options={ ICON_POSITION_OPTIONS }
						onChange={ ( val ) => setAttributes( { iconPosition: val } ) }
						__nextHasNoMarginBottom
					/>
					<TextControl
						label={ __( 'Icon slug (Dashicons / custom)', 'sgs-blocks' ) }
						value={ icon }
						onChange={ ( val ) => setAttributes( { icon: val } ) }
						placeholder={ __( 'e.g. star-filled', 'sgs-blocks' ) }
						__nextHasNoMarginBottom
					/>
					<TextControl
						label={ __( 'Emoji (overrides icon if set)', 'sgs-blocks' ) }
						value={ emoji }
						onChange={ ( val ) => setAttributes( { emoji: val } ) }
						placeholder={ __( 'e.g. ✨', 'sgs-blocks' ) }
						__nextHasNoMarginBottom
					/>
				</PanelBody>
			</InspectorControls>

			{ /* ── Canvas ── */ }
			<div { ...blockProps }>
				{ /* Icon / emoji before label */ }
				{ iconPosition === 'before-label' && ( icon || emoji ) && (
					<span className="wp-block-sgs-heading__icon" aria-hidden="true">
						{ emoji || icon }
					</span>
				) }

				{ /* Label */ }
				{ labelEnabled && (
					<RichText
						tagName={ labelTag }
						className="wp-block-sgs-heading__label"
						value={ label }
						onChange={ ( val ) => setAttributes( { label: val } ) }
						placeholder={ __( 'Eyebrow label…', 'sgs-blocks' ) }
						allowedFormats={ [] }
						style={ buildLabelStyle( attributes ) }
					/>
				) }

				{ /* Icon / emoji before headline */ }
				{ iconPosition === 'before-headline' && ( icon || emoji ) && (
					<span className="wp-block-sgs-heading__icon" aria-hidden="true">
						{ emoji || icon }
					</span>
				) }

				{ /* Headline — always rendered */ }
				<RichText
					tagName={ headlineLevel }
					className="wp-block-sgs-heading__headline"
					id={ headlineId || undefined }
					value={ headline }
					onChange={ ( val ) => setAttributes( { headline: val } ) }
					placeholder={ __( 'Section headline…', 'sgs-blocks' ) }
					allowedFormats={ [ 'core/bold', 'core/italic', 'core/link' ] }
					style={ buildHeadlineStyle( attributes ) }
				/>

				{ /* Sub */ }
				{ subEnabled && (
					<RichText
						tagName={ subTag }
						className="wp-block-sgs-heading__sub"
						value={ sub }
						onChange={ ( val ) => setAttributes( { sub: val } ) }
						placeholder={ __( 'Supporting intro copy…', 'sgs-blocks' ) }
						allowedFormats={ [ 'core/bold', 'core/italic', 'core/link' ] }
						style={ buildSubStyle( attributes ) }
					/>
				) }
			</div>
		</>
	);
}
