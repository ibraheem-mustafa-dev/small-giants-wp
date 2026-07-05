import { __ } from '@wordpress/i18n';
import { useBlockProps, InspectorControls, URLInput } from '@wordpress/block-editor';
import {
	PanelBody,
	TextControl,
	SelectControl,
	RangeControl,
	ToggleControl,
	Notice,
	__experimentalHStack as HStack,
	__experimentalUnitControl as UnitControl,
} from '@wordpress/components';
import { IconPicker, TypographyControls, ResponsiveControl } from '../../components';

const PRESET_OPTIONS = [
	{ label: __( 'Primary', 'sgs-blocks' ), value: 'primary' },
	{ label: __( 'Secondary', 'sgs-blocks' ), value: 'secondary' },
	{ label: __( 'Outline', 'sgs-blocks' ), value: 'outline' },
	{ label: __( 'Custom', 'sgs-blocks' ), value: 'custom' },
];

const TARGET_OPTIONS = [
	{ label: __( 'Same tab (_self)', 'sgs-blocks' ), value: '_self' },
	{ label: __( 'New tab (_blank)', 'sgs-blocks' ), value: '_blank' },
	{ label: __( 'Parent frame (_parent)', 'sgs-blocks' ), value: '_parent' },
	{ label: __( 'Full window (_top)', 'sgs-blocks' ), value: '_top' },
];

const ICON_POSITION_OPTIONS = [
	{ label: __( 'Before label', 'sgs-blocks' ), value: 'before' },
	{ label: __( 'After label', 'sgs-blocks' ), value: 'after' },
	{ label: __( 'Icon only', 'sgs-blocks' ), value: 'only' },
];

const WIDTH_OPTIONS = [
	{ label: __( 'Fit content', 'sgs-blocks' ), value: 'fit' },
	{ label: __( 'Full width', 'sgs-blocks' ), value: 'full' },
	{ label: __( 'Custom', 'sgs-blocks' ), value: 'custom' },
];

const TEXT_TRANSFORM_OPTIONS = [
	{ label: __( 'None', 'sgs-blocks' ), value: '' },
	{ label: __( 'Uppercase', 'sgs-blocks' ), value: 'uppercase' },
	{ label: __( 'Lowercase', 'sgs-blocks' ), value: 'lowercase' },
	{ label: __( 'Capitalise', 'sgs-blocks' ), value: 'capitalize' },
];

const TEXT_DECORATION_OPTIONS = [
	{ label: __( 'None', 'sgs-blocks' ), value: '' },
	{ label: __( 'Underline', 'sgs-blocks' ), value: 'underline' },
	{ label: __( 'Overline', 'sgs-blocks' ), value: 'overline' },
	{ label: __( 'Strike-through', 'sgs-blocks' ), value: 'line-through' },
];

const BORDER_STYLE_OPTIONS = [
	{ label: __( 'Solid', 'sgs-blocks' ), value: 'solid' },
	{ label: __( 'Dashed', 'sgs-blocks' ), value: 'dashed' },
	{ label: __( 'Dotted', 'sgs-blocks' ), value: 'dotted' },
	{ label: __( 'None', 'sgs-blocks' ), value: 'none' },
];

const EASING_OPTIONS = [
	{ label: 'ease', value: 'ease' },
	{ label: 'ease-in', value: 'ease-in' },
	{ label: 'ease-out', value: 'ease-out' },
	{ label: 'ease-in-out', value: 'ease-in-out' },
	{ label: 'linear', value: 'linear' },
];

// UnitControl unit sets.
const CUSTOM_WIDTH_UNITS = [
	{ value: 'px', label: 'px', default: 200 },
	{ value: '%', label: '%', default: 50 },
];

const MIN_HEIGHT_UNITS = [
	{ value: 'px', label: 'px', default: 48 },
	{ value: 'em', label: 'em', default: 3 },
	{ value: 'rem', label: 'rem', default: 3 },
];

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function composeUnit( num, unit ) {
	if ( num === undefined || num === null || num === '' ) {
		return '';
	}
	return `${ num }${ unit || '' }`;
}

function parseUnit( raw, currentUnit ) {
	if ( ! raw && raw !== 0 ) {
		return { num: undefined, unit: currentUnit || 'px' };
	}
	const str = String( raw ).trim();
	if ( '' === str ) {
		return { num: undefined, unit: currentUnit || 'px' };
	}
	const match = str.match( /^([\d.]+)\s*([a-z%]*)$/i );
	if ( match ) {
		const num = parseFloat( match[ 1 ] );
		const unit = match[ 2 ] || currentUnit || 'px';
		return { num: isNaN( num ) ? undefined : num, unit };
	}
	return { num: undefined, unit: currentUnit || 'px' };
}

// Per-breakpoint attr names for minHeight (value + unit are separate attrs).
const MIN_HEIGHT_BREAKPOINTS = {
	desktop: { value: 'minHeight', unit: 'minHeightUnit' },
	tablet:  { value: 'minHeightTablet', unit: 'minHeightTabletUnit' },
	mobile:  { value: 'minHeightMobile', unit: 'minHeightMobileUnit' },
};

export default function Edit( { attributes, setAttributes } ) {
	const {
		label,
		url,
		linkTarget,
		rel,
		download,
		isSubmit,
		inheritStyle,
		ariaLabel,
		widthType,
		customWidth,
		customWidthUnit,
		minHeight,
		minHeightUnit,
		minHeightTablet,
		minHeightTabletUnit,
		minHeightMobile,
		minHeightMobileUnit,
		icon,
		iconPosition,
		iconSize,
		iconGap,
		iconColour,
		iconColourHover,
		iconTitle,
		fontWeight,
		fontStyle,
		textTransform,
		textDecoration,
		fontSize,
		fontSizeUnit,
		lineHeight,
		letterSpacing,
		colourText,
		colourTextHover,
		colourBackground,
		colourBackgroundHover,
		colourBorder,
		colourBorderHover,
		borderStyle,
		borderWidthTop,
		borderWidthRight,
		borderWidthBottom,
		borderWidthLeft,
		borderRadiusTL,
		borderRadiusTR,
		borderRadiusBR,
		borderRadiusBL,
		paddingTop,
		paddingRight,
		paddingBottom,
		paddingLeft,
		marginTop,
		marginRight,
		marginBottom,
		marginLeft,
		hoverScale,
		transitionDuration,
		transitionEasing,
		boxShadow,
		boxShadowHover,
	} = attributes;

	const isCustom = 'custom' === inheritStyle;
	const hasIcon = !! icon;

	// Build editor preview inline styles.
	const previewStyle = {};
	if ( isCustom ) {
		if ( colourText ) previewStyle.color = colourText;
		if ( colourBackground ) previewStyle.backgroundColor = colourBackground;
		if ( colourBorder ) previewStyle.borderColor = colourBorder;
		if ( borderStyle ) previewStyle.borderStyle = borderStyle;
		if ( borderRadiusTL || borderRadiusTR || borderRadiusBR || borderRadiusBL ) {
			previewStyle.borderRadius = `${ borderRadiusTL || 0 }px ${ borderRadiusTR || 0 }px ${ borderRadiusBR || 0 }px ${ borderRadiusBL || 0 }px`;
		}
		if ( fontSize ) previewStyle.fontSize = `${ fontSize }${ fontSizeUnit || 'px' }`;
		if ( fontWeight ) previewStyle.fontWeight = fontWeight;
		if ( fontStyle ) previewStyle.fontStyle = fontStyle;
		if ( textTransform ) previewStyle.textTransform = textTransform;
		if ( textDecoration ) previewStyle.textDecoration = textDecoration;
		if ( paddingTop || paddingRight || paddingBottom || paddingLeft ) {
			previewStyle.padding = `${ paddingTop || 0 }px ${ paddingRight || 0 }px ${ paddingBottom || 0 }px ${ paddingLeft || 0 }px`;
		}
	}
	if ( widthType === 'full' ) previewStyle.width = '100%';
	if ( widthType === 'custom' && customWidth ) previewStyle.width = `${ customWidth }${ customWidthUnit }`;
	if ( minHeight ) previewStyle.minHeight = `${ minHeight }px`;

	const blockClasses = [ 'sgs-button' ];
	if ( ! isCustom ) blockClasses.push( `is-style-${ inheritStyle }` );
	if ( widthType === 'full' ) blockClasses.push( 'sgs-button--full' );

	const blockProps = useBlockProps( {
		className: 'sgs-button-wrapper',
	} );

	// Icon placeholder SVG for editor preview.
	const iconPlaceholder = (
		<span
			className="sgs-button__icon"
			style={ { display: 'inline-flex', alignItems: 'center', width: iconSize ? iconSize + 'px' : '1em', height: iconSize ? iconSize + 'px' : '1em', color: iconColour || 'currentColor' } }
			aria-hidden="true"
		>
			<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="100%" height="100%">
				<circle cx="12" cy="12" r="10" />
				<line x1="12" y1="8" x2="12" y2="16" />
				<line x1="8" y1="12" x2="16" y2="12" />
			</svg>
		</span>
	);

	return (
		<>
			<InspectorControls>

				{ /* Style Preset */ }
				<PanelBody title={ __( 'Style Preset', 'sgs-blocks' ) } initialOpen={ true }>
					<SelectControl
						label={ __( 'Button style', 'sgs-blocks' ) }
						value={ inheritStyle }
						options={ PRESET_OPTIONS }
						onChange={ ( val ) => setAttributes( { inheritStyle: val } ) }
						__nextHasNoMarginBottom
					/>
					{ ! isCustom && (
						<Notice status="info" isDismissible={ false } style={ { marginTop: '8px' } }>
							{ __( 'Colours and typography are controlled by Button Presets settings. Switch to "Custom" for per-instance overrides.', 'sgs-blocks' ) }
						</Notice>
					) }
				</PanelBody>

				{ /* Content */ }
				<PanelBody title={ __( 'Content', 'sgs-blocks' ) } initialOpen={ true }>
					<TextControl
						label={ __( 'Label', 'sgs-blocks' ) }
						value={ label }
						onChange={ ( val ) => setAttributes( { label: val } ) }
						__nextHasNoMarginBottom
					/>
					<div style={ { marginTop: '8px', marginBottom: '8px' } }>
						<label className="components-base-control__label" style={ { display: 'block', marginBottom: '4px', fontSize: '11px', fontWeight: 500, textTransform: 'uppercase', color: '#1e1e1e' } }>
							{ __( 'URL', 'sgs-blocks' ) }
						</label>
						<URLInput
							value={ url }
							onChange={ ( val ) => setAttributes( { url: val } ) }
						/>
					</div>
					<SelectControl
						label={ __( 'Open in', 'sgs-blocks' ) }
						value={ linkTarget }
						options={ TARGET_OPTIONS }
						onChange={ ( val ) => setAttributes( { linkTarget: val } ) }
						__nextHasNoMarginBottom
					/>
					<TextControl
						label={ __( 'Rel attribute', 'sgs-blocks' ) }
						value={ rel }
						onChange={ ( val ) => setAttributes( { rel: val } ) }
						help={ __( 'e.g. noopener noreferrer nofollow', 'sgs-blocks' ) }
						__nextHasNoMarginBottom
					/>
					<ToggleControl
						label={ __( 'Download link', 'sgs-blocks' ) }
						checked={ download }
						onChange={ ( val ) => setAttributes( { download: val } ) }
						__nextHasNoMarginBottom
					/>
					{ ! url && (
						<ToggleControl
							label={ __( 'Submit button (type="submit")', 'sgs-blocks' ) }
							checked={ isSubmit }
							onChange={ ( val ) => setAttributes( { isSubmit: val } ) }
							__nextHasNoMarginBottom
							help={ __( 'No URL set — this renders as a <button>. Enable for form-submit buttons.', 'sgs-blocks' ) }
						/>
					) }
					<TextControl
						label={ __( 'Aria label', 'sgs-blocks' ) }
						value={ ariaLabel }
						onChange={ ( val ) => setAttributes( { ariaLabel: val } ) }
						help={ __( 'Overrides the visible label for screen readers. Required for icon-only buttons.', 'sgs-blocks' ) }
						__nextHasNoMarginBottom
					/>
				</PanelBody>

				{ /* Icon */ }
				<PanelBody title={ __( 'Icon', 'sgs-blocks' ) } initialOpen={ false }>
					<IconPicker
						label={ __( 'Icon', 'sgs-blocks' ) }
						value={ icon ? { source: 'lucide', name: icon } : null }
						onChange={ ( val ) => setAttributes( { icon: val ? val.name : '' } ) }
					/>
					{ hasIcon && (
						<>
							<SelectControl
								label={ __( 'Icon position', 'sgs-blocks' ) }
								value={ iconPosition }
								options={ ICON_POSITION_OPTIONS }
								onChange={ ( val ) => setAttributes( { iconPosition: val } ) }
								__nextHasNoMarginBottom
							/>
							<RangeControl
								label={ __( 'Icon size (px)', 'sgs-blocks' ) }
								value={ iconSize || 16 }
								onChange={ ( val ) => setAttributes( { iconSize: val } ) }
								min={ 8 }
								max={ 100 }
								step={ 1 }
								__nextHasNoMarginBottom
							/>
							<RangeControl
								label={ __( 'Gap between icon and label (px)', 'sgs-blocks' ) }
								value={ iconGap }
								onChange={ ( val ) => setAttributes( { iconGap: val } ) }
								min={ 0 }
								max={ 40 }
								step={ 1 }
								__nextHasNoMarginBottom
							/>
							<TextControl
								label={ __( 'Icon colour (CSS or token)', 'sgs-blocks' ) }
								value={ iconColour }
								onChange={ ( val ) => setAttributes( { iconColour: val } ) }
								help={ __( 'e.g. #ffffff or primary', 'sgs-blocks' ) }
								__nextHasNoMarginBottom
							/>
							<TextControl
								label={ __( 'Icon colour on hover', 'sgs-blocks' ) }
								value={ iconColourHover }
								onChange={ ( val ) => setAttributes( { iconColourHover: val } ) }
								__nextHasNoMarginBottom
							/>
							<TextControl
								label={ __( 'Icon title (SVG accessible title)', 'sgs-blocks' ) }
								value={ iconTitle }
								onChange={ ( val ) => setAttributes( { iconTitle: val } ) }
								help={ __( 'Used as the SVG <title> for screen readers when icon-only.', 'sgs-blocks' ) }
								__nextHasNoMarginBottom
							/>
						</>
					) }
				</PanelBody>

				{ /* Layout */ }
				<PanelBody title={ __( 'Layout', 'sgs-blocks' ) } initialOpen={ false }>
					<SelectControl
						label={ __( 'Width', 'sgs-blocks' ) }
						value={ widthType }
						options={ WIDTH_OPTIONS }
						onChange={ ( val ) => setAttributes( { widthType: val } ) }
						__nextHasNoMarginBottom
					/>
					{ 'custom' === widthType && (
						<UnitControl
							label={ __( 'Custom width', 'sgs-blocks' ) }
							value={ composeUnit( customWidth, customWidthUnit ) }
							units={ CUSTOM_WIDTH_UNITS }
							onChange={ ( raw ) => {
								const { num, unit } = parseUnit( raw, customWidthUnit || 'px' );
								setAttributes( { customWidth: num, customWidthUnit: unit } );
							} }
							__nextHasNoMarginBottom
							style={ { marginTop: '8px' } }
						/>
					) }

					{ /* Min height — ResponsiveControl with one UnitControl per breakpoint.
					   Each breakpoint has its own number attr AND its own unit attr. */ }
					<ResponsiveControl label={ __( 'Min height', 'sgs-blocks' ) }>
						{ ( breakpoint ) => {
							const bp = MIN_HEIGHT_BREAKPOINTS[ breakpoint ];
							const numVal = attributes[ bp.value ];
							const unitVal = attributes[ bp.unit ] || 'px';
							return (
								<UnitControl
									label={ __( 'Min height', 'sgs-blocks' ) }
									hideLabelFromVision
									value={ composeUnit( numVal, unitVal ) }
									units={ MIN_HEIGHT_UNITS }
									onChange={ ( raw ) => {
										const { num, unit } = parseUnit( raw, unitVal );
										setAttributes( {
											[ bp.value ]: num,
											[ bp.unit ]: unit,
										} );
									} }
									__nextHasNoMarginBottom
								/>
							);
						} }
					</ResponsiveControl>
				</PanelBody>

				{ /* Typography — custom mode only */ }
				{ isCustom && (
					<PanelBody title={ __( 'Typography', 'sgs-blocks' ) } initialOpen={ false }>
						{ /*
						 * Font size (responsive) + line height + font weight + font style
						 * via shared TypographyControls.
						 * Handles: fontSize/fontSizeUnit/fontSizeTablet/fontSizeMobile
						 *           lineHeight/lineHeightUnit
						 *           fontWeight / fontStyle
						 */ }
						<TypographyControls
							attributes={ attributes }
							setAttributes={ setAttributes }
							prefix=""
							showSize={ true }
							showWeight={ true }
							showStyle={ true }
							showLineHeight={ true }
							showResponsive={ true }
						/>
						<SelectControl
							label={ __( 'Text transform', 'sgs-blocks' ) }
							value={ textTransform }
							options={ TEXT_TRANSFORM_OPTIONS }
							onChange={ ( val ) => setAttributes( { textTransform: val } ) }
							__nextHasNoMarginBottom
						/>
						<SelectControl
							label={ __( 'Text decoration', 'sgs-blocks' ) }
							value={ textDecoration }
							options={ TEXT_DECORATION_OPTIONS }
							onChange={ ( val ) => setAttributes( { textDecoration: val } ) }
							__nextHasNoMarginBottom
						/>
						<RangeControl
							label={ __( 'Letter spacing (px)', 'sgs-blocks' ) }
							value={ letterSpacing || '' }
							onChange={ ( val ) => setAttributes( { letterSpacing: val } ) }
							min={ -5 }
							max={ 20 }
							step={ 0.5 }
							__nextHasNoMarginBottom
						/>
					</PanelBody>
				) }

				{ /* Colours — custom mode only */ }
				{ isCustom && (
					<PanelBody title={ __( 'Colours', 'sgs-blocks' ) } initialOpen={ false }>
						<TextControl
							label={ __( 'Text colour', 'sgs-blocks' ) }
							value={ colourText }
							onChange={ ( val ) => setAttributes( { colourText: val } ) }
							help={ __( 'CSS value or token slug (e.g. #fff or primary)', 'sgs-blocks' ) }
							__nextHasNoMarginBottom
						/>
						<TextControl
							label={ __( 'Text colour — hover', 'sgs-blocks' ) }
							value={ colourTextHover }
							onChange={ ( val ) => setAttributes( { colourTextHover: val } ) }
							__nextHasNoMarginBottom
						/>
						<TextControl
							label={ __( 'Background colour', 'sgs-blocks' ) }
							value={ colourBackground }
							onChange={ ( val ) => setAttributes( { colourBackground: val } ) }
							__nextHasNoMarginBottom
						/>
						<TextControl
							label={ __( 'Background colour — hover', 'sgs-blocks' ) }
							value={ colourBackgroundHover }
							onChange={ ( val ) => setAttributes( { colourBackgroundHover: val } ) }
							__nextHasNoMarginBottom
						/>
						<TextControl
							label={ __( 'Border colour', 'sgs-blocks' ) }
							value={ colourBorder }
							onChange={ ( val ) => setAttributes( { colourBorder: val } ) }
							__nextHasNoMarginBottom
						/>
						<TextControl
							label={ __( 'Border colour — hover', 'sgs-blocks' ) }
							value={ colourBorderHover }
							onChange={ ( val ) => setAttributes( { colourBorderHover: val } ) }
							__nextHasNoMarginBottom
						/>
					</PanelBody>
				) }

				{ /* Border — custom mode only */ }
				{ isCustom && (
					<PanelBody title={ __( 'Border', 'sgs-blocks' ) } initialOpen={ false }>
						<SelectControl
							label={ __( 'Border style', 'sgs-blocks' ) }
							value={ borderStyle }
							options={ BORDER_STYLE_OPTIONS }
							onChange={ ( val ) => setAttributes( { borderStyle: val } ) }
							__nextHasNoMarginBottom
						/>
						<RangeControl label={ __( 'Border top width (px)', 'sgs-blocks' ) } value={ borderWidthTop || 0 } onChange={ ( val ) => setAttributes( { borderWidthTop: val } ) } min={ 0 } max={ 20 } __nextHasNoMarginBottom />
						<RangeControl label={ __( 'Border right width (px)', 'sgs-blocks' ) } value={ borderWidthRight || 0 } onChange={ ( val ) => setAttributes( { borderWidthRight: val } ) } min={ 0 } max={ 20 } __nextHasNoMarginBottom />
						<RangeControl label={ __( 'Border bottom width (px)', 'sgs-blocks' ) } value={ borderWidthBottom || 0 } onChange={ ( val ) => setAttributes( { borderWidthBottom: val } ) } min={ 0 } max={ 20 } __nextHasNoMarginBottom />
						<RangeControl label={ __( 'Border left width (px)', 'sgs-blocks' ) } value={ borderWidthLeft || 0 } onChange={ ( val ) => setAttributes( { borderWidthLeft: val } ) } min={ 0 } max={ 20 } __nextHasNoMarginBottom />
						<RangeControl label={ __( 'Radius — top left (px)', 'sgs-blocks' ) } value={ borderRadiusTL || 0 } onChange={ ( val ) => setAttributes( { borderRadiusTL: val } ) } min={ 0 } max={ 100 } __nextHasNoMarginBottom />
						<RangeControl label={ __( 'Radius — top right (px)', 'sgs-blocks' ) } value={ borderRadiusTR || 0 } onChange={ ( val ) => setAttributes( { borderRadiusTR: val } ) } min={ 0 } max={ 100 } __nextHasNoMarginBottom />
						<RangeControl label={ __( 'Radius — bottom right (px)', 'sgs-blocks' ) } value={ borderRadiusBR || 0 } onChange={ ( val ) => setAttributes( { borderRadiusBR: val } ) } min={ 0 } max={ 100 } __nextHasNoMarginBottom />
						<RangeControl label={ __( 'Radius — bottom left (px)', 'sgs-blocks' ) } value={ borderRadiusBL || 0 } onChange={ ( val ) => setAttributes( { borderRadiusBL: val } ) } min={ 0 } max={ 100 } __nextHasNoMarginBottom />
					</PanelBody>
				) }

				{ /* Spacing */ }
				<PanelBody title={ __( 'Spacing', 'sgs-blocks' ) } initialOpen={ false }>
					<p style={ { fontSize: '11px', fontWeight: 600, textTransform: 'uppercase', margin: '0 0 8px' } }>{ __( 'Padding', 'sgs-blocks' ) }</p>
					<RangeControl label={ __( 'Top', 'sgs-blocks' ) } value={ paddingTop || 0 } onChange={ ( val ) => setAttributes( { paddingTop: val } ) } min={ 0 } max={ 100 } __nextHasNoMarginBottom />
					<RangeControl label={ __( 'Right', 'sgs-blocks' ) } value={ paddingRight || 0 } onChange={ ( val ) => setAttributes( { paddingRight: val } ) } min={ 0 } max={ 100 } __nextHasNoMarginBottom />
					<RangeControl label={ __( 'Bottom', 'sgs-blocks' ) } value={ paddingBottom || 0 } onChange={ ( val ) => setAttributes( { paddingBottom: val } ) } min={ 0 } max={ 100 } __nextHasNoMarginBottom />
					<RangeControl label={ __( 'Left', 'sgs-blocks' ) } value={ paddingLeft || 0 } onChange={ ( val ) => setAttributes( { paddingLeft: val } ) } min={ 0 } max={ 100 } __nextHasNoMarginBottom />
					<p style={ { fontSize: '11px', fontWeight: 600, textTransform: 'uppercase', margin: '16px 0 8px' } }>{ __( 'Margin', 'sgs-blocks' ) }</p>
					<RangeControl label={ __( 'Top', 'sgs-blocks' ) } value={ marginTop || 0 } onChange={ ( val ) => setAttributes( { marginTop: val } ) } min={ -100 } max={ 100 } __nextHasNoMarginBottom />
					<RangeControl label={ __( 'Right', 'sgs-blocks' ) } value={ marginRight || 0 } onChange={ ( val ) => setAttributes( { marginRight: val } ) } min={ -100 } max={ 100 } __nextHasNoMarginBottom />
					<RangeControl label={ __( 'Bottom', 'sgs-blocks' ) } value={ marginBottom || 0 } onChange={ ( val ) => setAttributes( { marginBottom: val } ) } min={ -100 } max={ 100 } __nextHasNoMarginBottom />
					<RangeControl label={ __( 'Left', 'sgs-blocks' ) } value={ marginLeft || 0 } onChange={ ( val ) => setAttributes( { marginLeft: val } ) } min={ -100 } max={ 100 } __nextHasNoMarginBottom />
				</PanelBody>

				{ /* Effects */ }
				<PanelBody title={ __( 'Effects', 'sgs-blocks' ) } initialOpen={ false }>
					<RangeControl
						label={ __( 'Hover scale', 'sgs-blocks' ) }
						value={ hoverScale }
						onChange={ ( val ) => setAttributes( { hoverScale: val } ) }
						min={ 0.9 }
						max={ 1.2 }
						step={ 0.01 }
						__nextHasNoMarginBottom
					/>
					<RangeControl
						label={ __( 'Transition duration (ms)', 'sgs-blocks' ) }
						value={ transitionDuration }
						onChange={ ( val ) => setAttributes( { transitionDuration: val } ) }
						min={ 0 }
						max={ 1000 }
						step={ 50 }
						__nextHasNoMarginBottom
					/>
					<SelectControl
						label={ __( 'Transition easing', 'sgs-blocks' ) }
						value={ transitionEasing }
						options={ EASING_OPTIONS }
						onChange={ ( val ) => setAttributes( { transitionEasing: val } ) }
						__nextHasNoMarginBottom
					/>
				</PanelBody>

				{ /* Box shadow — custom mode only */ }
				{ isCustom && (
					<PanelBody title={ __( 'Shadow', 'sgs-blocks' ) } initialOpen={ false }>
						<p style={ { fontSize: '12px', color: '#555', marginTop: 0 } }>{ __( 'Normal state', 'sgs-blocks' ) }</p>
						<TextControl label={ __( 'Colour', 'sgs-blocks' ) } value={ boxShadow.colour } onChange={ ( val ) => setAttributes( { boxShadow: { ...boxShadow, colour: val } } ) } __nextHasNoMarginBottom />
						<RangeControl label={ __( 'Horizontal offset (px)', 'sgs-blocks' ) } value={ boxShadow.hOffset } onChange={ ( val ) => setAttributes( { boxShadow: { ...boxShadow, hOffset: val } } ) } min={ -50 } max={ 50 } __nextHasNoMarginBottom />
						<RangeControl label={ __( 'Vertical offset (px)', 'sgs-blocks' ) } value={ boxShadow.vOffset } onChange={ ( val ) => setAttributes( { boxShadow: { ...boxShadow, vOffset: val } } ) } min={ -50 } max={ 50 } __nextHasNoMarginBottom />
						<RangeControl label={ __( 'Blur (px)', 'sgs-blocks' ) } value={ boxShadow.blur } onChange={ ( val ) => setAttributes( { boxShadow: { ...boxShadow, blur: val } } ) } min={ 0 } max={ 100 } __nextHasNoMarginBottom />
						<RangeControl label={ __( 'Spread (px)', 'sgs-blocks' ) } value={ boxShadow.spread } onChange={ ( val ) => setAttributes( { boxShadow: { ...boxShadow, spread: val } } ) } min={ -50 } max={ 50 } __nextHasNoMarginBottom />
						<ToggleControl label={ __( 'Inset', 'sgs-blocks' ) } checked={ boxShadow.inset } onChange={ ( val ) => setAttributes( { boxShadow: { ...boxShadow, inset: val } } ) } __nextHasNoMarginBottom />
						<p style={ { fontSize: '12px', color: '#555', marginTop: '16px' } }>{ __( 'Hover state', 'sgs-blocks' ) }</p>
						<TextControl label={ __( 'Colour', 'sgs-blocks' ) } value={ boxShadowHover.colour } onChange={ ( val ) => setAttributes( { boxShadowHover: { ...boxShadowHover, colour: val } } ) } __nextHasNoMarginBottom />
						<RangeControl label={ __( 'Horizontal offset (px)', 'sgs-blocks' ) } value={ boxShadowHover.hOffset } onChange={ ( val ) => setAttributes( { boxShadowHover: { ...boxShadowHover, hOffset: val } } ) } min={ -50 } max={ 50 } __nextHasNoMarginBottom />
						<RangeControl label={ __( 'Vertical offset (px)', 'sgs-blocks' ) } value={ boxShadowHover.vOffset } onChange={ ( val ) => setAttributes( { boxShadowHover: { ...boxShadowHover, vOffset: val } } ) } min={ -50 } max={ 50 } __nextHasNoMarginBottom />
						<RangeControl label={ __( 'Blur (px)', 'sgs-blocks' ) } value={ boxShadowHover.blur } onChange={ ( val ) => setAttributes( { boxShadowHover: { ...boxShadowHover, blur: val } } ) } min={ 0 } max={ 100 } __nextHasNoMarginBottom />
						<RangeControl label={ __( 'Spread (px)', 'sgs-blocks' ) } value={ boxShadowHover.spread } onChange={ ( val ) => setAttributes( { boxShadowHover: { ...boxShadowHover, spread: val } } ) } min={ -50 } max={ 50 } __nextHasNoMarginBottom />
						<ToggleControl label={ __( 'Inset', 'sgs-blocks' ) } checked={ boxShadowHover.inset } onChange={ ( val ) => setAttributes( { boxShadowHover: { ...boxShadowHover, inset: val } } ) } __nextHasNoMarginBottom />
					</PanelBody>
				) }

			</InspectorControls>

			{ /* Editor preview */ }
			<div { ...blockProps }>
				<span
					className={ blockClasses.join( ' ' ) }
					style={ previewStyle }
					role="presentation"
				>
					{ hasIcon && iconPosition === 'before' && iconPlaceholder }
					{ iconPosition !== 'only' && (
						<span className="sgs-button__label">{ label || __( 'Click Here', 'sgs-blocks' ) }</span>
					) }
					{ hasIcon && ( iconPosition === 'after' || iconPosition === 'only' ) && iconPlaceholder }
				</span>
			</div>
		</>
	);
}
