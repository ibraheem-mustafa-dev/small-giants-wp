import { __ } from '@wordpress/i18n';
import { useBlockProps, InspectorControls, URLInput, useSettings } from '@wordpress/block-editor';
import {
	PanelBody,
	TextControl,
	SelectControl,
	RangeControl,
	ToggleControl,
	__experimentalUnitControl as UnitControl,
} from '@wordpress/components';
import {
	IconPicker,
	TypographyControls,
	ResponsiveControl,
	ResponsiveBoxControl,
	ResponsiveBorderRadiusControl,
	DesignTokenPicker,
	StateToggleControl,
	resolveColorToken,
} from '../../components';

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

// Tablet/mobile add an explicit "inherit desktop" option ('') so a tier can opt
// out of overriding the base width.
const WIDTH_OPTIONS_TIER = [
	{ label: __( '— Same as desktop —', 'sgs-blocks' ), value: '' },
	...WIDTH_OPTIONS,
];

const UNDERLINE_HOVER_OPTIONS = [
	{ label: __( 'No', 'sgs-blocks' ), value: 'none' },
	{ label: __( 'Underline', 'sgs-blocks' ), value: 'underline' },
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

// Per-breakpoint attr names for width (type + custom value + custom unit). Each
// tier has its OWN widthType so a button can be e.g. fit on desktop, full on
// mobile (the draft's full-width-on-mobile pattern).
const WIDTH_BREAKPOINTS = {
	desktop: { type: 'widthType', value: 'customWidth', unit: 'customWidthUnit', options: WIDTH_OPTIONS },
	tablet:  { type: 'widthTypeTablet', value: 'customWidthTablet', unit: 'customWidthUnitTablet', options: WIDTH_OPTIONS_TIER },
	mobile:  { type: 'widthTypeMobile', value: 'customWidthMobile', unit: 'customWidthUnitMobile', options: WIDTH_OPTIONS_TIER },
};

export default function Edit( { attributes, setAttributes } ) {
	const {
		style,
		label,
		url,
		linkTarget,
		rel,
		download,
		isSubmit,
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
		labelCollapse,
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
		textDecorationHover,
		borderStyle,
		borderWidth,
		borderRadiusTablet,
		borderRadiusMobile,
		paddingTablet,
		paddingMobile,
		marginTablet,
		marginMobile,
		scaleHover,
		transitionDuration,
		transitionEasing,
		boxShadow,
		boxShadowHover,
	} = attributes;

	const hasIcon = !! icon;

	// Build editor preview inline styles. Every button is attribute-driven now
	// (no locked preset mode) — all colour/typography/border attrs preview
	// unconditionally, matching render.php.
	// D288: colours are stored as theme token SLUGS (e.g. 'primary') OR a custom
	// hex. A slug is invalid CSS, so the preview MUST resolve it to a real colour
	// (via resolveColorToken against the live palette) — otherwise the preview
	// shows nothing and applying a preset looks like a no-op (the "Apply does
	// nothing" bug). render.php resolves the same slugs via sgs_colour_value().
	const [ palette ] = useSettings( 'color.palette' );

	// Box-object interface contract §1: a 4-side/4-corner box is an object with
	// named keys, each an already-unit-bearing CSS length string or absent
	// (unset side/corner). Build an editor-preview shorthand from the object —
	// mirrors render.php's box-shorthand builder so the canvas preview matches
	// the frontend (contract §5).
	const boxShorthand = ( box, keys ) => {
		if ( ! box || 'object' !== typeof box ) return undefined;
		if ( ! keys.some( ( key ) => box[ key ] ) ) return undefined;
		return keys.map( ( key ) => box[ key ] || '0' ).join( ' ' );
	};

	const previewStyle = {};
	if ( colourText ) previewStyle.color = resolveColorToken( colourText, palette );
	if ( colourBackground ) previewStyle.backgroundColor = resolveColorToken( colourBackground, palette );
	if ( colourBorder ) previewStyle.borderColor = resolveColorToken( colourBorder, palette );
	if ( borderStyle ) previewStyle.borderStyle = borderStyle;
	const borderWidthPreview = boxShorthand( borderWidth, [ 'top', 'right', 'bottom', 'left' ] );
	if ( borderWidthPreview ) previewStyle.borderWidth = borderWidthPreview;
	// CSS border-radius shorthand order: top-left top-right bottom-right bottom-left.
	const borderRadiusPreview = boxShorthand( style?.border?.radius, [ 'topLeft', 'topRight', 'bottomRight', 'bottomLeft' ] );
	if ( borderRadiusPreview ) previewStyle.borderRadius = borderRadiusPreview;
	if ( fontSize ) previewStyle.fontSize = `${ fontSize }${ fontSizeUnit || 'px' }`;
	if ( fontWeight ) previewStyle.fontWeight = fontWeight;
	if ( fontStyle ) previewStyle.fontStyle = fontStyle;
	if ( textTransform ) previewStyle.textTransform = textTransform;
	if ( textDecoration ) previewStyle.textDecoration = textDecoration;
	const paddingPreview = boxShorthand( style?.spacing?.padding, [ 'top', 'right', 'bottom', 'left' ] );
	if ( paddingPreview ) previewStyle.padding = paddingPreview;
	const marginPreview = boxShorthand( style?.spacing?.margin, [ 'top', 'right', 'bottom', 'left' ] );
	if ( marginPreview ) previewStyle.margin = marginPreview;
	if ( widthType === 'custom' && customWidth ) previewStyle.width = `${ customWidth }${ customWidthUnit }`;
	if ( minHeight ) previewStyle.minHeight = `${ minHeight }px`;

	// No `.is-style-*` class any more — colour/border/typography are always
	// attribute-driven inline styles (preset-as-seed model).
	// Editor-frontend parity (D288): the button element IS the block root (no
	// wrapper div), matching render.php. Full-width is the `sgs-button--full`
	// modifier on the button itself, so a full-width button inside a flex row
	// (e.g. sgs/multi-button) previews with the identical flex/width CSS.
	const blockClasses = [ 'sgs-button' ];
	if ( widthType === 'full' ) blockClasses.push( 'sgs-button--full' );
	const blockProps = useBlockProps( {
		className: blockClasses.join( ' ' ),
		style: previewStyle,
		role: 'presentation',
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
							{ iconPosition !== 'only' && (
								<SelectControl
									label={ __( 'Collapse label to icon', 'sgs-blocks' ) }
									value={ labelCollapse || 'none' }
									options={ [
										{ label: __( 'Never — always show label', 'sgs-blocks' ), value: 'none' },
										{ label: __( 'On mobile (below 768px)', 'sgs-blocks' ), value: 'mobile' },
										{ label: __( 'On tablet & mobile (below 1024px)', 'sgs-blocks' ), value: 'tablet' },
										{ label: __( 'Always — icon only', 'sgs-blocks' ), value: 'all' },
									] }
									onChange={ ( val ) => setAttributes( { labelCollapse: val } ) }
									help={ __( 'Hide the text and show just the icon from the chosen breakpoint down (the button keeps its accessible name). Requires an icon.', 'sgs-blocks' ) }
									__nextHasNoMarginBottom
								/>
							) }
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
							{ /* Element-scoped colour states. Spec 35 keeps every control
							     for an element INSIDE that element's own panel — the
							     icon's hover colour is a STATE of the icon's colour, not
							     a separate hover concept, so it belongs here rather than
							     in a hover panel elsewhere in the sidebar. Swatches stay
							     visible in both states so a set hover colour is never
							     hidden (council mitigation 2026-07-18). */ }
							<StateToggleControl
								label={ __( 'Icon colours', 'sgs-blocks' ) }
								swatches={ [
									{ label: __( 'Normal', 'sgs-blocks' ), value: iconColour },
									{ label: __( 'Hover', 'sgs-blocks' ), value: iconColourHover },
								] }
							>
								{ ( state ) =>
									state === 'normal' ? (
										<DesignTokenPicker
											linked
											label={ __( 'Icon colour', 'sgs-blocks' ) }
											value={ iconColour }
											onChange={ ( val ) => setAttributes( { iconColour: val ?? '' } ) }
										/>
									) : (
										<DesignTokenPicker
											linked
											label={ __( 'Icon colour', 'sgs-blocks' ) }
											value={ iconColourHover }
											onChange={ ( val ) => setAttributes( { iconColourHover: val ?? '' } ) }
										/>
									)
								}
							</StateToggleControl>
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
					{ /* Width — ResponsiveControl device switcher. Each breakpoint has
					   its own widthType (fit/full/custom, plus "inherit" on the
					   tiers) and, for 'custom', its own value + unit attrs. */ }
					<ResponsiveControl label={ __( 'Width', 'sgs-blocks' ) }>
						{ ( breakpoint ) => {
							const bp = WIDTH_BREAKPOINTS[ breakpoint ];
							const typeVal = attributes[ bp.type ] ?? ( breakpoint === 'desktop' ? 'fit' : '' );
							const numVal = attributes[ bp.value ];
							const unitVal = attributes[ bp.unit ] || 'px';
							return (
								<>
									<SelectControl
										label={ __( 'Width', 'sgs-blocks' ) }
										hideLabelFromVision
										value={ typeVal }
										options={ bp.options }
										onChange={ ( val ) => setAttributes( { [ bp.type ]: val } ) }
										__nextHasNoMarginBottom
									/>
									{ 'custom' === typeVal && (
										<UnitControl
											label={ __( 'Custom width', 'sgs-blocks' ) }
											value={ composeUnit( numVal, unitVal ) }
											units={ CUSTOM_WIDTH_UNITS }
											onChange={ ( raw ) => {
												const { num, unit } = parseUnit( raw, unitVal );
												setAttributes( { [ bp.value ]: num, [ bp.unit ]: unit } );
											} }
											__nextHasNoMarginBottom
											style={ { marginTop: '8px' } }
										/>
									) }
								</>
							);
						} }
					</ResponsiveControl>

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

				{ /* Typography — always editable (preset-as-seed) */ }
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

				{ /* Colours — always editable (preset-as-seed). D288: DesignTokenPicker
				   in `linked` mode — pick a global-palette swatch (stores the token
				   slug so a brand/palette change recolours the button) OR a custom
				   colour (full picker: spectrum + hex + opacity). */ }
				<PanelBody title={ __( 'Colours', 'sgs-blocks' ) } initialOpen={ false }>
						<DesignTokenPicker
							linked
							label={ __( 'Text colour', 'sgs-blocks' ) }
							value={ colourText }
							onChange={ ( val ) => setAttributes( { colourText: val ?? '' } ) }
						/>
						<DesignTokenPicker
							linked
							label={ __( 'Text colour — hover', 'sgs-blocks' ) }
							value={ colourTextHover }
							onChange={ ( val ) => setAttributes( { colourTextHover: val ?? '' } ) }
						/>
						<DesignTokenPicker
							linked
							label={ __( 'Background colour', 'sgs-blocks' ) }
							value={ colourBackground }
							onChange={ ( val ) => setAttributes( { colourBackground: val ?? '' } ) }
						/>
						<DesignTokenPicker
							linked
							label={ __( 'Background colour — hover', 'sgs-blocks' ) }
							value={ colourBackgroundHover }
							onChange={ ( val ) => setAttributes( { colourBackgroundHover: val ?? '' } ) }
						/>
						<DesignTokenPicker
							linked
							label={ __( 'Border colour', 'sgs-blocks' ) }
							value={ colourBorder }
							onChange={ ( val ) => setAttributes( { colourBorder: val ?? '' } ) }
						/>
						<DesignTokenPicker
							linked
							label={ __( 'Border colour — hover', 'sgs-blocks' ) }
							value={ colourBorderHover }
							onChange={ ( val ) => setAttributes( { colourBorderHover: val ?? '' } ) }
						/>
						<SelectControl
							label={ __( 'Underline on hover', 'sgs-blocks' ) }
							value={ textDecorationHover || 'none' }
							options={ UNDERLINE_HOVER_OPTIONS }
							onChange={ ( val ) => setAttributes( { textDecorationHover: val } ) }
							__nextHasNoMarginBottom
						/>
					</PanelBody>

				{ /* Border — always editable (preset-as-seed). Box-object interface
				   contract §1/§5: borderWidth is an SGS custom object attr (base only,
				   no tiers); border-radius routes to WP-native style.border.radius
				   (base) + borderRadiusTablet/Mobile object attrs (tiers). The button
				   declares __experimentalBorder.__experimentalSkipSerialization itself
				   (block.json) so base radius serialises scoped, not inline — this is
				   the spacing skipSerialization pattern container proves, applied to
				   border here (container skip-serialises spacing, not border). */ }
				<PanelBody title={ __( 'Border', 'sgs-blocks' ) } initialOpen={ false }>
						<SelectControl
							label={ __( 'Border style', 'sgs-blocks' ) }
							value={ borderStyle }
							options={ BORDER_STYLE_OPTIONS }
							onChange={ ( val ) => setAttributes( { borderStyle: val } ) }
							__nextHasNoMarginBottom
						/>
						<ResponsiveBoxControl
							label={ __( 'Border width', 'sgs-blocks' ) }
							values={ { base: borderWidth ?? {} } }
							showResponsive={ false }
							onChange={ ( tier, next ) => setAttributes( { borderWidth: next } ) }
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

				{ /* Spacing — Box-object interface contract §1/§5: padding/margin base
				   routes to WP-native style.spacing (mirrors sgs/container); tiers are
				   paddingTablet/paddingMobile + marginTablet/marginMobile object attrs. */ }
				<PanelBody title={ __( 'Spacing', 'sgs-blocks' ) } initialOpen={ false }>
					<ResponsiveBoxControl
						label={ __( 'Padding', 'sgs-blocks' ) }
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
				</PanelBody>

				{ /* Effects */ }
				<PanelBody title={ __( 'Effects', 'sgs-blocks' ) } initialOpen={ false }>
					<RangeControl
						label={ __( 'Hover scale', 'sgs-blocks' ) }
						value={ scaleHover }
						onChange={ ( val ) => setAttributes( { scaleHover: val } ) }
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

				{ /* Box shadow — always editable (preset-as-seed) */ }
				<PanelBody title={ __( 'Shadow', 'sgs-blocks' ) } initialOpen={ false }>
						<p style={ { fontSize: '12px', color: '#555', marginTop: 0 } }>{ __( 'Normal state', 'sgs-blocks' ) }</p>
						<DesignTokenPicker linked label={ __( 'Shadow colour', 'sgs-blocks' ) } value={ boxShadow.colour } onChange={ ( val ) => setAttributes( { boxShadow: { ...boxShadow, colour: val ?? '' } } ) } />
						<RangeControl label={ __( 'Horizontal offset (px)', 'sgs-blocks' ) } value={ boxShadow.hOffset } onChange={ ( val ) => setAttributes( { boxShadow: { ...boxShadow, hOffset: val } } ) } min={ -50 } max={ 50 } __nextHasNoMarginBottom />
						<RangeControl label={ __( 'Vertical offset (px)', 'sgs-blocks' ) } value={ boxShadow.vOffset } onChange={ ( val ) => setAttributes( { boxShadow: { ...boxShadow, vOffset: val } } ) } min={ -50 } max={ 50 } __nextHasNoMarginBottom />
						<RangeControl label={ __( 'Blur (px)', 'sgs-blocks' ) } value={ boxShadow.blur } onChange={ ( val ) => setAttributes( { boxShadow: { ...boxShadow, blur: val } } ) } min={ 0 } max={ 100 } __nextHasNoMarginBottom />
						<RangeControl label={ __( 'Spread (px)', 'sgs-blocks' ) } value={ boxShadow.spread } onChange={ ( val ) => setAttributes( { boxShadow: { ...boxShadow, spread: val } } ) } min={ -50 } max={ 50 } __nextHasNoMarginBottom />
						<ToggleControl label={ __( 'Inset', 'sgs-blocks' ) } checked={ boxShadow.inset } onChange={ ( val ) => setAttributes( { boxShadow: { ...boxShadow, inset: val } } ) } __nextHasNoMarginBottom />
						<p style={ { fontSize: '12px', color: '#555', marginTop: '16px' } }>{ __( 'Hover state', 'sgs-blocks' ) }</p>
						<DesignTokenPicker linked label={ __( 'Shadow colour', 'sgs-blocks' ) } value={ boxShadowHover.colour } onChange={ ( val ) => setAttributes( { boxShadowHover: { ...boxShadowHover, colour: val ?? '' } } ) } />
						<RangeControl label={ __( 'Horizontal offset (px)', 'sgs-blocks' ) } value={ boxShadowHover.hOffset } onChange={ ( val ) => setAttributes( { boxShadowHover: { ...boxShadowHover, hOffset: val } } ) } min={ -50 } max={ 50 } __nextHasNoMarginBottom />
						<RangeControl label={ __( 'Vertical offset (px)', 'sgs-blocks' ) } value={ boxShadowHover.vOffset } onChange={ ( val ) => setAttributes( { boxShadowHover: { ...boxShadowHover, vOffset: val } } ) } min={ -50 } max={ 50 } __nextHasNoMarginBottom />
						<RangeControl label={ __( 'Blur (px)', 'sgs-blocks' ) } value={ boxShadowHover.blur } onChange={ ( val ) => setAttributes( { boxShadowHover: { ...boxShadowHover, blur: val } } ) } min={ 0 } max={ 100 } __nextHasNoMarginBottom />
						<RangeControl label={ __( 'Spread (px)', 'sgs-blocks' ) } value={ boxShadowHover.spread } onChange={ ( val ) => setAttributes( { boxShadowHover: { ...boxShadowHover, spread: val } } ) } min={ -50 } max={ 50 } __nextHasNoMarginBottom />
						<ToggleControl label={ __( 'Inset', 'sgs-blocks' ) } checked={ boxShadowHover.inset } onChange={ ( val ) => setAttributes( { boxShadowHover: { ...boxShadowHover, inset: val } } ) } __nextHasNoMarginBottom />
					</PanelBody>

			</InspectorControls>

			{ /* Editor preview — the button element IS the block root (D288, no wrapper div) */ }
			<span { ...blockProps }>
				{ hasIcon && iconPosition === 'before' && iconPlaceholder }
				{ iconPosition !== 'only' && (
					label || __( 'Click Here', 'sgs-blocks' )
				) }
				{ hasIcon && ( iconPosition === 'after' || iconPosition === 'only' ) && iconPlaceholder }
			</span>
		</>
	);
}
