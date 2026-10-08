import { __ } from '@wordpress/i18n';
import { useBlockProps, InspectorControls, useSettings } from '@wordpress/block-editor';
import {
	PanelBody,
	SelectControl,
	TextControl,
	ToggleControl,
	RangeControl,
} from '@wordpress/components';
import { SgsColourPanel, ResponsiveBoxControl, SgsBorderControl, TypographyControls, resolveColourToken, ResponsiveOverride, BOX_UNITS, normaliseResponsiveBox, SgsBoxControl, textRow } from '../../components';
import { textPaintPreview, backgroundPaintPreview, tierBoxLonghands, usePreviewTier, typographyPreviewStyle, sgsBorderPreview } from '../../utils';

const CARD_STYLES = [
	{ label: __( 'Flat', 'sgs-blocks' ), value: 'flat' },
	{ label: __( 'Bordered', 'sgs-blocks' ), value: 'bordered' },
	{ label: __( 'Elevated', 'sgs-blocks' ), value: 'elevated' },
	{ label: __( 'Filled', 'sgs-blocks' ), value: 'filled' },
];

const DIGIT_STYLES = [
	{ label: __( 'Simple', 'sgs-blocks' ), value: 'simple' },
	{ label: __( 'Flip', 'sgs-blocks' ), value: 'flip' },
];


/**
 * Per-element typography previews — the twins of render.php's three
 * sgs_typography_css_rule( $attributes, 'number' | 'label' | 'expired', … )
 * calls. Every attribute is named here so the canvas visibly reads each one.
 */
function buildElementTypography( attributes, previewTier = 'desktop' ) {
	const {
		numberFontSize,
		numberFontSizeUnit,
		numberFontWeight,
		numberFontStyle,
		numberFontFamily,
		numberTextTransform,
		numberTextDecoration,
		numberLineHeight,
		numberLineHeightUnit,
		numberLetterSpacing,
		numberLetterSpacingUnit,
		numberTextAlign,
		numberTextWrap,
		numberTextColumns,
		numberWritingMode,
		labelFontSize,
		labelFontSizeUnit,
		labelFontWeight,
		labelFontStyle,
		labelFontFamily,
		labelTextTransform,
		labelTextDecoration,
		labelLineHeight,
		labelLineHeightUnit,
		labelLetterSpacing,
		labelLetterSpacingUnit,
		labelTextAlign,
		labelTextWrap,
		labelTextColumns,
		labelWritingMode,
		expiredFontSize,
		expiredFontSizeUnit,
		expiredFontWeight,
		expiredFontStyle,
		expiredFontFamily,
		expiredTextTransform,
		expiredTextDecoration,
		expiredLineHeight,
		expiredLineHeightUnit,
		expiredLetterSpacing,
		expiredLetterSpacingUnit,
		expiredTextAlign,
		expiredTextWrap,
		expiredTextColumns,
		expiredWritingMode,
	} = attributes;

	return {
		number: typographyPreviewStyle( attributes, 'number', previewTier ),
		label: typographyPreviewStyle( attributes, 'label', previewTier ),
		expired: typographyPreviewStyle( attributes, 'expired', previewTier ),
	};
}

/**
 * Build the editor-canvas preview style object (base tier only — tablet/
 * mobile tiers are not simulated on the fixed-width canvas, matching quote/
 * media precedent).
 */
function buildPreviewStyle( attributes, colourPalette, previewTier = 'desktop' ) {
	const {
		padding,
		margin,
		textAlign,
		fontSize,
		fontSizeUnit,
		fontWeight,
		fontStyle,
		lineHeight,
		lineHeightUnit,
		borderWidth,
		borderStyle,
		borderColour,
		borderRadius,
		textColour,
		textColourGradient,
		backgroundColour,
		backgroundColourGradient,
	} = attributes;

	const preview = {};

	Object.assign( preview, tierBoxLonghands( padding, previewTier, 'padding' ), tierBoxLonghands( margin, previewTier, 'margin' ) );

	// Border is the block's own borderWidth/borderStyle/borderColour/
	// borderRadius attrs (SgsBorderControl, below) — NOT WP-native
	// `style.border`, which no control in this file ever writes to; the
	// block.json `supports` block declares no `__experimentalBorder` at all.
	Object.assign( preview, sgsBorderPreview( { widthValues: borderWidth, styleValue: borderStyle, colourValue: borderColour, colourGradientValue: attributes.borderColourGradient, radiusValues: borderRadius }, previewTier, colourPalette ) );

	// Wrapper text/background colour — block-private, gradient-capable attrs
	// (WP-native `supports.color` is disabled; the old `style.color.*` path
	// was never populated — colour-conformance track fix, 2026-09-06).
	const wrapperTextPreview = textPaintPreview( textColour, textColourGradient, colourPalette );
	if ( wrapperTextPreview ) {
		Object.assign( preview, wrapperTextPreview );
	}
	const wrapperBgPreview = backgroundPaintPreview( backgroundColour, backgroundColourGradient, colourPalette );
	if ( wrapperBgPreview ) {
		Object.assign( preview, wrapperBgPreview );
	}
	// Typography: the twin of render.php's sgs_typography_css_rule( $attributes, '' ).
	Object.assign( preview, typographyPreviewStyle( attributes, '', previewTier ) );

	return preview;
}

export default function Edit( { attributes, setAttributes } ) {
	const previewTier = usePreviewTier();
	const {
		targetDate,
		evergreenMode,
		evergreenHours,
		evergreenMinutes,
		expiredMessage,
		showDays,
		showHours,
		showMinutes,
		showSeconds,
		cardStyle,
		digitStyle,
		numberColour,
		numberColourGradient,
		labelColour,
		labelColourGradient,
		backgroundColour,
		backgroundColourGradient,
	} = attributes;

	// Expired state — the twin of render.php's $is_expired: only a fixed target
	// date that is not in the future (evergreen mode never expires server-side).
	// render.php hides the grid and shows the message when expired, and the
	// reverse otherwise.
	const targetTime = targetDate ? new Date( targetDate ).getTime() : NaN;
	const isExpired = ! evergreenMode && ! Number.isNaN( targetTime ) && targetTime <= Date.now();

	const className = [
		'sgs-countdown',
		`sgs-countdown--${ cardStyle }`,
		`sgs-countdown--digit-${ 'flip' === digitStyle ? 'flip' : 'simple' }`,
		isExpired ? 'sgs-countdown--ended' : '',
	].filter( Boolean ).join( ' ' );

	// numberColour/numberColourGradient + labelColour/labelColourGradient real
	// mechanism (render.php): a flat colour is a `--sgs-countdown-*-colour`
	// custom property consumed by `.sgs-countdown__number`/`__label{color:var(...)}`
	// in style.css; a gradient wins over the flat value via a direct scoped
	// `background-image + background-clip:text` rule on the same selector —
	// exactly the textPaintPreview() technique already shared with
	// sgs/container's own text-colour mirror.
	const [ colourPalette ] = useSettings( 'color.palette' );

	const blockProps = useBlockProps( {
		className,
		style: buildPreviewStyle( attributes, colourPalette, previewTier ),
	} );

	const elementTypography = buildElementTypography( attributes, previewTier );
	const numberPreview = {
		...textPaintPreview( numberColour, numberColourGradient, colourPalette ),
		...elementTypography.number,
	};
	const labelPreview = {
		...textPaintPreview( labelColour, labelColourGradient, colourPalette ),
		...elementTypography.label,
	};
	const expiredPreview = elementTypography.expired;

	const units = [];
	if ( showDays ) units.push( { value: '00', label: __( 'Days', 'sgs-blocks' ) } );
	if ( showHours ) units.push( { value: '00', label: __( 'Hours', 'sgs-blocks' ) } );
	if ( showMinutes ) units.push( { value: '00', label: __( 'Minutes', 'sgs-blocks' ) } );
	if ( showSeconds ) units.push( { value: '00', label: __( 'Seconds', 'sgs-blocks' ) } );

	// Contrast check for border colour — warn if border fails WCAG 3:1 contrast
	// against the block's own background. When the background is a gradient,
	// the flat backgroundColour is not rendered, so skip the check in that case.
	const countdownTimerContrastAgainst =
		attributes.backgroundColour && ! attributes.backgroundColourGradient
			? attributes.backgroundColour
			: '';

	return (
		<>
			{ /* D618/D609 — ONE grouped, SGS-OWNED colour panel (own PanelBody,
			   default InspectorControls group), rendered FIRST so it sits at
			   the top of the inspector. Replaces the two DesignTokenPicker
			   rows that used to sit inline inside "Styling" below;
			   `supports.color` sub-flags are now false so WordPress generates
			   no native colour UI to overlap with this panel. */ }
			<SgsColourPanel
				rows={ [
					textRow( {
						key: 'wrapperText',
						label: __( 'Text colour', 'sgs-blocks' ),
						attrs: {
							base: 'textColour',
							hover: 'textColourHover',
							gradient: 'textColourGradient',
							hoverGradient: 'textColourHoverGradient',
						},
						attributes,
						setAttributes,
					} ),
					{
						key: 'wrapperBackground',
						label: __( 'Background colour', 'sgs-blocks' ),
						gradientCapable: true,
						states: [
							{
								key: 'normal',
								label: __( 'Normal', 'sgs-blocks' ),
								value: backgroundColour,
								onChange: ( val ) => setAttributes( { backgroundColour: val ?? '' } ),
								gradientValue: backgroundColourGradient,
								onGradientChange: ( val ) => setAttributes( { backgroundColourGradient: val ?? '' } ),
							},
						],
					},
					{
						key: 'number',
						label: __( 'Number colour', 'sgs-blocks' ),
						gradientCapable: true,
						states: [
							{
								key: 'normal',
								label: __( 'Normal', 'sgs-blocks' ),
								value: numberColour,
								onChange: ( val ) => setAttributes( { numberColour: val } ),
								gradientValue: numberColourGradient,
								onGradientChange: ( val ) => setAttributes( { numberColourGradient: val ?? '' } ),
							},
						],
					},
					{
						key: 'label',
						label: __( 'Label colour', 'sgs-blocks' ),
						gradientCapable: true,
						states: [
							{
								key: 'normal',
								label: __( 'Normal', 'sgs-blocks' ),
								value: labelColour,
								onChange: ( val ) => setAttributes( { labelColour: val } ),
								gradientValue: labelColourGradient,
								onGradientChange: ( val ) => setAttributes( { labelColourGradient: val ?? '' } ),
							},
						],
					},
				] }
			/>
			<InspectorControls>
				<PanelBody title={ __( 'Timer Settings', 'sgs-blocks' ) }>
					<ToggleControl
						label={ __( 'Evergreen mode', 'sgs-blocks' ) }
						help={ __( 'Starts fresh for each visitor', 'sgs-blocks' ) }
						checked={ evergreenMode }
						onChange={ ( val ) => setAttributes( { evergreenMode: val } ) }
						__nextHasNoMarginBottom
					/>
					{ ! evergreenMode && (
						<TextControl
							label={ __( 'Target date/time', 'sgs-blocks' ) }
							help={ __( 'Format: YYYY-MM-DDTHH:MM', 'sgs-blocks' ) }
							value={ targetDate }
							onChange={ ( val ) => setAttributes( { targetDate: val } ) }
							type="datetime-local"
							__nextHasNoMarginBottom
							__next40pxDefaultSize
						/>
					) }
					{ evergreenMode && (
						<>
							<RangeControl
								label={ __( 'Hours', 'sgs-blocks' ) }
								value={ evergreenHours }
								onChange={ ( val ) => setAttributes( { evergreenHours: val } ) }
								min={ 0 }
								max={ 720 }
								__nextHasNoMarginBottom
								__next40pxDefaultSize
							/>
							<RangeControl
								label={ __( 'Minutes', 'sgs-blocks' ) }
								value={ evergreenMinutes }
								onChange={ ( val ) => setAttributes( { evergreenMinutes: val } ) }
								min={ 0 }
								max={ 59 }
								__nextHasNoMarginBottom
								__next40pxDefaultSize
							/>
						</>
					) }
					<TextControl
						label={ __( 'Expired message', 'sgs-blocks' ) }
						value={ expiredMessage }
						onChange={ ( val ) => setAttributes( { expiredMessage: val } ) }
						__nextHasNoMarginBottom
						__next40pxDefaultSize
					/>
				</PanelBody>

				<PanelBody title={ __( 'Display', 'sgs-blocks' ) } initialOpen={ false }>
					<ToggleControl
						label={ __( 'Show days', 'sgs-blocks' ) }
						checked={ showDays }
						onChange={ ( val ) => setAttributes( { showDays: val } ) }
						__nextHasNoMarginBottom
					/>
					<ToggleControl
						label={ __( 'Show hours', 'sgs-blocks' ) }
						checked={ showHours }
						onChange={ ( val ) => setAttributes( { showHours: val } ) }
						__nextHasNoMarginBottom
					/>
					<ToggleControl
						label={ __( 'Show minutes', 'sgs-blocks' ) }
						checked={ showMinutes }
						onChange={ ( val ) => setAttributes( { showMinutes: val } ) }
						__nextHasNoMarginBottom
					/>
					<ToggleControl
						label={ __( 'Show seconds', 'sgs-blocks' ) }
						checked={ showSeconds }
						onChange={ ( val ) => setAttributes( { showSeconds: val } ) }
						__nextHasNoMarginBottom
					/>
				</PanelBody>

				<PanelBody title={ __( 'Styling', 'sgs-blocks' ) } initialOpen={ false }>
					<SelectControl
						label={ __( 'Card style', 'sgs-blocks' ) }
						value={ cardStyle }
						options={ CARD_STYLES }
						onChange={ ( val ) => setAttributes( { cardStyle: val } ) }
						__nextHasNoMarginBottom
						__next40pxDefaultSize
					/>
					<SelectControl
						label={ __( 'Digit style', 'sgs-blocks' ) }
						help={ __( 'Flip animates each digit when it changes. Disabled when "Reduce motion" is on.', 'sgs-blocks' ) }
						value={ digitStyle }
						options={ DIGIT_STYLES }
						onChange={ ( val ) => setAttributes( { digitStyle: val } ) }
						__nextHasNoMarginBottom
						__next40pxDefaultSize
					/>
				</PanelBody>

				{ /*
				 * Box families: base padding/margin/border-radius are WP-native
				 * style.spacing.* / style.border.radius objects (already responsive-
				 * capable at the base tier via the block's native Styles panel);
				 * these controls add the SGS Tablet/Mobile tier overrides
				 * (contract §B, mirrors sgs/quote + sgs/media).
				 */ }
			</InspectorControls>

			{ /* ── Styles tab ─────────────────────────────────────────────── */ }
			<InspectorControls group="styles">
				{ /* Typography — the shared TypographyControls component +
				    sgs_typography_css_rule() render.php helper (D971/D972
				    full-replacement track). A 4-target switcher: "All text" is the
				    wrapper (root prefix "", inherited by anything the three element
				    surfaces do not style), then the number, label and expired-message
				    elements each own their own surface. TypographyControls offers the
				    text-align field itself, so there is no block-private one. */ }
				<PanelBody title={ __( 'Typography', 'sgs-blocks' ) } initialOpen={ false }>
					<TypographyControls
						attributes={ attributes }
						setAttributes={ setAttributes }
						targets={ [
							{
								key: 'root',
								label: __( 'All text', 'sgs-blocks' ),
								prefix: '',
								fontSizePresets: true,
								showFontFamily: true,
								showDecoration: true,
								showTransform: true,
								showLetterSpacing: true,
								showTextAlign: true,
								showTextWrap: true,
								showTextColumns: true,
								showWritingMode: true,
							},
							{
								key: 'number',
								label: __( 'Number', 'sgs-blocks' ),
								prefix: 'number',
								fontSizePresets: true,
								showFontFamily: true,
								showDecoration: true,
								showTransform: true,
								showLetterSpacing: true,
								showTextAlign: true,
								showTextWrap: true,
								showTextColumns: true,
								showWritingMode: true,
							},
							{
								key: 'label',
								label: __( 'Label', 'sgs-blocks' ),
								prefix: 'label',
								fontSizePresets: true,
								showFontFamily: true,
								showDecoration: true,
								showTransform: true,
								showLetterSpacing: true,
								showTextAlign: true,
								showTextWrap: true,
								showTextColumns: true,
								showWritingMode: true,
							},
							{
								key: 'expired',
								label: __( 'Expired message', 'sgs-blocks' ),
								prefix: 'expired',
								fontSizePresets: true,
								showFontFamily: true,
								showDecoration: true,
								showTransform: true,
								showLetterSpacing: true,
								showTextAlign: true,
								showTextWrap: true,
								showTextColumns: true,
								showWritingMode: true,
							},
						] }
					/>
				</PanelBody>
				<PanelBody title={ __( 'Responsive spacing', 'sgs-blocks' ) } initialOpen={ false }>
					<ResponsiveOverride
						value={ attributes.padding }
						onChange={ ( obj ) => setAttributes( { padding: obj } ) }
					>
						{ ( { ownValue, setOwnValue } ) => (
							<SgsBoxControl
								label={ __( 'Padding', 'sgs-blocks' ) }
								values={ ownValue && typeof ownValue === 'object' ? ownValue : {} }
								units={ BOX_UNITS }
								presets
								onChange={ ( next ) => setOwnValue( normaliseResponsiveBox( next ) ) }
							/>
						) }
					</ResponsiveOverride>
					<ResponsiveOverride
						value={ attributes.margin }
						onChange={ ( obj ) => setAttributes( { margin: obj } ) }
					>
						{ ( { ownValue, setOwnValue } ) => (
							<SgsBoxControl
								label={ __( 'Margin', 'sgs-blocks' ) }
								values={ ownValue && typeof ownValue === 'object' ? ownValue : {} }
								units={ BOX_UNITS }
								presets
								onChange={ ( next ) => setOwnValue( normaliseResponsiveBox( next ) ) }
							/>
						) }
					</ResponsiveOverride>
				</PanelBody>
				<PanelBody title={ __( 'Border', 'sgs-blocks' ) } initialOpen={ false }>
					<SgsBorderControl
						widthValues={ attributes.borderWidth ?? {} }
						onWidthChange={ ( next ) => setAttributes( { borderWidth: next } ) }
						widthPresets={ [ '10', '20', '30' ] }
						styleValue={ attributes.borderStyle }
						onStyleChange={ ( val ) => setAttributes( { borderStyle: val } ) }
						colourLabel={ __( 'Border colour', 'sgs-blocks' ) }
						colourValue={ attributes.borderColour }
						onColourChange={ ( val ) => setAttributes( { borderColour: val ?? '' } ) }
						colourGradientValue={ attributes.borderColourGradient }
						onColourGradientChange={ ( val ) => setAttributes( { borderColourGradient: val ?? '' } ) }
						colourLinked={ true }
						contrastAgainst={ countdownTimerContrastAgainst }
						radiusValues={ {
								base: attributes.borderRadius?.desktop ?? {},
								tablet: attributes.borderRadius?.tablet ?? {},
								mobile: attributes.borderRadius?.mobile ?? {},
							} }
						onRadiusChange={ ( tier, next ) => {
							const key = tier === 'base' ? 'desktop' : tier;
							setAttributes( { borderRadius: { ...attributes.borderRadius, [ key ]: next } } );
						} }
					/>
				</PanelBody>
			</InspectorControls>

			<div { ...blockProps }>
				{ /* The canvas is an authoring surface, so BOTH states stay visible: a
				     client styling the "Expired message" typography target must be able
				     to see it. render.php alone owns the live visibility swap, via the
				     `hidden` attribute on whichever of these two the timer state hides.
				     `isExpired` still drives the wrapper's --ended class, so the expired
				     message shows its real ended-state colour once a past date is set. */ }
				<div className="sgs-countdown__grid">
					{ units.map( ( unit, i ) => (
						<div key={ i } className="sgs-countdown__unit">
							<span className="sgs-countdown__number" style={ numberPreview }>{ unit.value }</span>
							<span className="sgs-countdown__label" style={ labelPreview }>{ unit.label }</span>
						</div>
					) ) }
				</div>
				<div className="sgs-countdown__expired" style={ expiredPreview }>{ expiredMessage }</div>
			</div>
		</>
	);
}
