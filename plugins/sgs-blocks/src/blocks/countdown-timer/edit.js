import { __ } from '@wordpress/i18n';
import { useBlockProps, InspectorControls, useSettings } from '@wordpress/block-editor';
import {
	PanelBody,
	SelectControl,
	TextControl,
	ToggleControl,
	RangeControl,
} from '@wordpress/components';
import { SgsColourPanel, ResponsiveBoxControl, ResponsiveBorderRadiusControl,
	SgsBorderControl,
	TypographyControls,
	resolveColourToken,
} from '../../components';
import { colourVar, textPaintPreview } from '../../utils';
import { ToggleGroupControl, ToggleGroupControlOption } from '../../components/primitives';

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
 * Editor-canvas box shorthand preview — mirrors render.php's scoped shorthand
 * output so the canvas matches the frontend (contract §E). Editor-only
 * convenience; the frontend never emits these as inline styles (contract §A).
 */
function boxShorthand( box, order = [ 'top', 'right', 'bottom', 'left' ] ) {
	if ( ! box || 'object' !== typeof box ) return undefined;
	const vals = order.map( ( key ) => box[ key ] );
	if ( vals.every( ( v ) => ! v ) ) return undefined;
	return vals.map( ( v ) => v || '0' ).join( ' ' );
}

/**
 * Build the editor-canvas preview style object (base tier only — tablet/
 * mobile tiers are not simulated on the fixed-width canvas, matching quote/
 * media precedent).
 */
function buildPreviewStyle( attributes ) {
	const { style, textAlign, fontSize, fontSizeUnit, fontWeight, fontStyle, lineHeight, lineHeightUnit } = attributes;

	const preview = {};

	const paddingPreview = boxShorthand( style?.spacing?.padding );
	if ( paddingPreview ) {
		preview.padding = paddingPreview;
	}
	const marginPreview = boxShorthand( style?.spacing?.margin );
	if ( marginPreview ) {
		preview.margin = marginPreview;
	}

	const border = style?.border ?? {};
	if ( border.style && border.style !== 'none' ) {
		const borderWidthPreview = boxShorthand( border.width, [ 'top', 'right', 'bottom', 'left' ] );
		if ( typeof border.width === 'string' ) {
			preview.borderWidth = border.width;
		} else if ( borderWidthPreview ) {
			preview.borderWidth = borderWidthPreview;
		}
		preview.borderStyle = border.style;
		if ( border.color ) {
			preview.borderColor = border.color;
		}
	}
	if ( border.radius ) {
		preview.borderRadius = typeof border.radius === 'string'
			? border.radius
			: boxShorthand( border.radius, [ 'topLeft', 'topRight', 'bottomRight', 'bottomLeft' ] );
	}

	if ( style?.color?.text ) {
		preview.color = style.color.text;
	}
	if ( style?.color?.background ) {
		preview.backgroundColor = style.color.background;
	}
	// Typography — migrated off WP-native style.typography.fontSize onto the
	// shared TypographyControls attribute shape (D971/D972). Base/desktop tier
	// only for the canvas preview, matching sgs/quote + sgs/media precedent
	// (tablet/mobile tiers are not simulated on the fixed-width canvas).
	const fontSizeDesktop = fontSize && 'object' === typeof fontSize ? fontSize.desktop : fontSize;
	if ( fontSizeDesktop ) {
		preview.fontSize = `${ fontSizeDesktop }${ fontSizeUnit || 'px' }`;
	}
	if ( fontWeight ) {
		preview.fontWeight = fontWeight;
	}
	if ( fontStyle ) {
		preview.fontStyle = fontStyle;
	}
	const lineHeightDesktop = lineHeight && 'object' === typeof lineHeight ? lineHeight.desktop : lineHeight;
	if ( lineHeightDesktop ) {
		preview.lineHeight = `${ lineHeightDesktop }${ lineHeightUnit || '' }`;
	}
	if ( textAlign ) {
		preview.textAlign = textAlign;
	}

	return preview;
}

export default function Edit( { attributes, setAttributes } ) {
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
		style,
		paddingTablet,
		paddingMobile,
		marginTablet,
		marginMobile,
		borderRadiusTablet,
		borderRadiusMobile,
		numberColour,
		numberColourGradient,
		labelColour,
		labelColourGradient,
	} = attributes;

	const className = [
		'sgs-countdown',
		`sgs-countdown--${ cardStyle }`,
	].join( ' ' );

	const blockProps = useBlockProps( {
		className,
		style: buildPreviewStyle( attributes ),
	} );

	// numberColour/numberColourGradient + labelColour/labelColourGradient real
	// mechanism (render.php): a flat colour is a `--sgs-countdown-*-colour`
	// custom property consumed by `.sgs-countdown__number`/`__label{color:var(...)}`
	// in style.css; a gradient wins over the flat value via a direct scoped
	// `background-image + background-clip:text` rule on the same selector —
	// exactly the textPaintPreview() technique already shared with
	// sgs/container's own text-colour mirror.
	const [ colourPalette ] = useSettings( 'color.palette' );
	const numberPreview = textPaintPreview( numberColour, numberColourGradient, colourPalette );
	const labelPreview = textPaintPreview( labelColour, labelColourGradient, colourPalette );

	const units = [];
	if ( showDays ) units.push( { value: '00', label: __( 'Days', 'sgs-blocks' ) } );
	if ( showHours ) units.push( { value: '00', label: __( 'Hours', 'sgs-blocks' ) } );
	if ( showMinutes ) units.push( { value: '00', label: __( 'Minutes', 'sgs-blocks' ) } );
	if ( showSeconds ) units.push( { value: '00', label: __( 'Seconds', 'sgs-blocks' ) } );

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
				{ /* Typography — replaces the old WP-native supports.typography
				    (fontSize + textAlign only) with the shared TypographyControls
				    component + sgs_typography_css_rule() render.php helper
				    (D971/D972 full-replacement track). Root prefix "" — the wrapper
				    is the only element this block-level typography targets (the
				    number/label elements keep their own colour-only controls).
				    TypographyControls has no text-align field, so that control
				    stays block-private. D812 (2026-08-26): a 5-option enum with
				    longest rendered label <=12 chars ("— inherit —", 11 chars)
				    renders as ToggleGroupControl, not SelectControl. */ }
				<PanelBody title={ __( 'Typography', 'sgs-blocks' ) } initialOpen={ false }>
					<TypographyControls
						attributes={ attributes }
						setAttributes={ setAttributes }
						prefix=""
					/>
					<ToggleGroupControl
						label={ __( 'Text align', 'sgs-blocks' ) }
						value={ attributes.textAlign || '' }
						onChange={ ( val ) => setAttributes( { textAlign: val } ) }
						isBlock
						__nextHasNoMarginBottom
						__next40pxDefaultSize
					>
						<ToggleGroupControlOption value="" label={ __( '— inherit —', 'sgs-blocks' ) } />
						<ToggleGroupControlOption value="left" label={ __( 'Left', 'sgs-blocks' ) } />
						<ToggleGroupControlOption value="center" label={ __( 'Centre', 'sgs-blocks' ) } />
						<ToggleGroupControlOption value="right" label={ __( 'Right', 'sgs-blocks' ) } />
						<ToggleGroupControlOption value="justify" label={ __( 'Justify', 'sgs-blocks' ) } />
					</ToggleGroupControl>
				</PanelBody>
				<PanelBody title={ __( 'Responsive spacing', 'sgs-blocks' ) } initialOpen={ false }>
					<ResponsiveBoxControl
						label={ __( 'Padding', 'sgs-blocks' ) }
						presets
						values={ {
							base: style?.spacing?.padding ?? {},
							tablet: paddingTablet ?? {},
							mobile: paddingMobile ?? {},
						} }
						onChange={ ( tier, next ) => {
							if ( 'base' === tier ) {
								setAttributes( { style: { ...style, spacing: { ...style?.spacing, padding: next } } } );
							} else {
								setAttributes( { [ `padding${ 'tablet' === tier ? 'Tablet' : 'Mobile' }` ]: next } );
							}
						} }
					/>
					<ResponsiveBoxControl
						label={ __( 'Margin', 'sgs-blocks' ) }
						presets
						values={ {
							base: style?.spacing?.margin ?? {},
							tablet: marginTablet ?? {},
							mobile: marginMobile ?? {},
						} }
						onChange={ ( tier, next ) => {
							if ( 'base' === tier ) {
								setAttributes( { style: { ...style, spacing: { ...style?.spacing, margin: next } } } );
							} else {
								setAttributes( { [ `margin${ 'tablet' === tier ? 'Tablet' : 'Mobile' }` ]: next } );
							}
						} }
					/>
					<ResponsiveBorderRadiusControl
						label={ __( 'Border radius', 'sgs-blocks' ) }
						values={ {
							base: style?.border?.radius ?? {},
							tablet: borderRadiusTablet ?? {},
							mobile: borderRadiusMobile ?? {},
						} }
						onChange={ ( tier, next ) => {
							if ( 'base' === tier ) {
								setAttributes( { style: { ...style, border: { ...style?.border, radius: next } } } );
							} else {
								setAttributes( { [ `borderRadius${ 'tablet' === tier ? 'Tablet' : 'Mobile' }` ]: next } );
							}
						} }
					/>
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
						radiusValues={ {
							base: attributes.borderRadius ?? {},
							tablet: attributes.borderRadiusTablet ?? {},
							mobile: attributes.borderRadiusMobile ?? {},
						} }
						onRadiusChange={ ( tier, next ) => {
							const radiusKey = tier === 'base' ? 'borderRadius' : tier === 'tablet' ? 'borderRadiusTablet' : 'borderRadiusMobile';
							setAttributes( { [ radiusKey ]: next } );
						} }
					/>
				</PanelBody>
			</InspectorControls>

			<div { ...blockProps }>
				<div className="sgs-countdown__grid">
					{ units.map( ( unit, i ) => (
						<div key={ i } className="sgs-countdown__unit">
							<span className="sgs-countdown__number" style={ numberPreview }>{ unit.value }</span>
							<span className="sgs-countdown__label" style={ labelPreview }>{ unit.label }</span>
						</div>
					) ) }
				</div>
			</div>
		</>
	);
}
