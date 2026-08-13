import { __ } from '@wordpress/i18n';
import { useBlockProps, InspectorControls, useSettings } from '@wordpress/block-editor';
import { useSelect } from '@wordpress/data';
import {
	PanelBody,
	TextControl,
	SelectControl,
	RangeControl,
	ToggleControl,
} from '@wordpress/components';
import {
	IconPicker,
	TypographyControls,
	ResponsiveControl,
	ResponsiveOverride,
	ResponsiveBoxControl,
	ResponsiveBorderRadiusControl,
	DesignTokenPicker,
	StateToggleControl,
	resolveColorToken,
	SgsLinkControl,
} from '../../components';
import { ToolsPanel, ToolsPanelItem, UnitControl } from '../../components/primitives';

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

// Matches block.json boxShadow/boxShadowHover default object (D328 — resets
// must restore the DECLARED default, not undefined).
const DEFAULT_BOX_SHADOW = {
	colour: '',
	hOffset: 0,
	vOffset: 0,
	blur: 0,
	spread: 0,
	inset: false,
};

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

// '' = unitless (matches TypographyControls.js's LINE_HEIGHT_UNITS + the PHP
// helper's empty-string → unitless semantic). Re-declared locally because this
// block's lineHeight is now a tier OBJECT and can no longer go through
// TypographyControls' own (flat-scalar) line-height control.
const LINE_HEIGHT_UNITS = [
	{ value: '', label: '—', default: 1.5 },
	{ value: 'em', label: 'em', default: 1.5 },
	{ value: 'rem', label: 'rem', default: 1.5 },
	{ value: 'px', label: 'px', default: 24 },
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


// widthType / customWidth / customWidthUnit are now TIER OBJECTS (Spec 35
// migration, 2026-08-11) — one attr each holding {desktop,tablet,mobile} — so
// the per-breakpoint attr-name map that used to live here is gone; the Width
// panel below reads/writes the three objects directly via the tier a shared
// <ResponsiveOverride> exposes.

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
		inheritStyle,
		widthType,
		customWidth,
		customWidthUnit,
		// minHeight is a TIER OBJECT (Spec 35 migration, 2026-08-11) — read via
		// `attributes.minHeight` at its control below, not destructured with a
		// bare default, matching the widthType/customWidth objects above.
		minHeightUnit,
		minHeightTabletUnit,
		minHeightMobileUnit,
		icon,
		iconPosition,
		labelCollapse,
		iconSize,
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

	// minHeight's VALUE is a tier object (ResponsiveOverride-driven), but its
	// UNIT stays a separate flat-per-tier family (minHeightUnit/Tablet/Mobile) —
	// not part of this migration. Need the active tier locally to read/write the
	// matching unit attr alongside ResponsiveOverride's value. Same device-type
	// resolution ResponsiveOverride.js itself uses internally.
	const DEVICE_TO_TIER = { Desktop: 'desktop', Tablet: 'tablet', Mobile: 'mobile' };
	const activeMinHeightTier = useSelect( ( select ) => {
		const ed = select( 'core/editor' );
		const device = ed && typeof ed.getDeviceType === 'function' ? ed.getDeviceType() : null;
		return DEVICE_TO_TIER[ device ] || 'desktop';
	}, [] );
	const minHeightUnitAttr = {
		desktop: 'minHeightUnit',
		tablet: 'minHeightTabletUnit',
		mobile: 'minHeightMobileUnit',
	}[ activeMinHeightTier ];
	const activeMinHeightUnit = attributes[ minHeightUnitAttr ] || 'px';

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
	// lineHeight / letterSpacing are TIER OBJECTS (Spec 35 migration) — the
	// editor preview always shows the DESKTOP tier, mirroring render.php's
	// sgs_responsive_css_rule() base-rule output (line-height/letter-spacing on
	// `.{uid}.sgs-button`). Units: lineHeightUnit ('' = unitless, matching the
	// PHP helper's 'unitless' sentinel decode), letterSpacingUnit defaults 'px'.
	if ( lineHeight?.desktop !== undefined && lineHeight?.desktop !== null && lineHeight?.desktop !== '' ) {
		const lhUnit = attributes.lineHeightUnit !== undefined ? attributes.lineHeightUnit : 'em';
		previewStyle.lineHeight = `${ lineHeight.desktop }${ 'unitless' === lhUnit ? '' : lhUnit }`;
	}
	if ( letterSpacing?.desktop !== undefined && letterSpacing?.desktop !== null && letterSpacing?.desktop !== '' ) {
		const lsUnit = attributes.letterSpacingUnit !== undefined ? attributes.letterSpacingUnit : 'px';
		previewStyle.letterSpacing = `${ letterSpacing.desktop }${ lsUnit }`;
	}
	// Box shadow — mirrors render.php step 3's base-state shadow declaration
	// (`box-shadow:{inset}{h}px {v}px {blur}px {spread}px {colour}`). Only the
	// NORMAL state previews (hover can't be shown on a static canvas element).
	// Colour is a design-token slug or custom hex (D288), so it must resolve via
	// the live palette exactly like the other colour previews above — otherwise
	// a token slug renders as invalid CSS and the shadow silently disappears.
	if ( boxShadow?.colour ) {
		const bsColour = resolveColorToken( boxShadow.colour, palette );
		const bsInset = boxShadow.inset ? 'inset ' : '';
		previewStyle.boxShadow = `${ bsInset }${ boxShadow.hOffset || 0 }px ${ boxShadow.vOffset || 0 }px ${ boxShadow.blur || 0 }px ${ boxShadow.spread || 0 }px ${ bsColour }`;
	}
	const paddingPreview = boxShorthand( style?.spacing?.padding, [ 'top', 'right', 'bottom', 'left' ] );
	if ( paddingPreview ) previewStyle.padding = paddingPreview;
	const marginPreview = boxShorthand( style?.spacing?.margin, [ 'top', 'right', 'bottom', 'left' ] );
	if ( marginPreview ) previewStyle.margin = marginPreview;
	// widthType / customWidth / customWidthUnit are TIER OBJECTS (Spec 35
	// migration, 2026-08-11) — the editor preview always shows the DESKTOP tier.
	if ( widthType?.desktop === 'custom' && customWidth?.desktop ) {
		previewStyle.width = `${ customWidth.desktop }${ customWidthUnit?.desktop || 'px' }`;
	}
	if ( attributes.minHeight?.desktop ) {
		previewStyle.minHeight = `${ attributes.minHeight.desktop }${ minHeightUnit || 'px' }`;
	}

	// Editor-frontend parity (D288): the button element IS the block root (no
	// wrapper div), matching render.php. Full-width is the `sgs-button--full`
	// modifier on the button itself, so a full-width button inside a flex row
	// (e.g. sgs/multi-button) previews with the identical flex/width CSS.
	//
	// The style preset renders via the SAME semantic BEM modifier the server
	// emits (render.php step 5, `.sgs-button--{inheritStyle}`), which SETS the
	// six `--sgs-btn-*` custom properties from that client's
	// `--wp--custom--button-presets--{preset}--*` tokens (style.css). Emitting
	// it here is what makes WordPress's native "Transform to variation" control
	// (the primary/secondary/outline block variations declared in block.json)
	// visibly apply in the editor: the variation writes `inheritStyle`, and this
	// class is how that attribute paints. Without it the editor preview silently
	// ignored every preset while the frontend honoured it. A 'custom'/unknown
	// value emits NO modifier, exactly as render.php does.
	const blockClasses = [ 'sgs-button' ];
	if ( [ 'primary', 'secondary', 'outline' ].includes( inheritStyle ) ) {
		blockClasses.push( `sgs-button--${ inheritStyle }` );
	}
	if ( widthType?.desktop === 'full' ) blockClasses.push( 'sgs-button--full' );
	const blockProps = useBlockProps( {
		className: blockClasses.join( ' ' ),
		style: previewStyle,
		role: 'presentation',
	} );

	// Icon placeholder SVG for editor preview.
	const iconPlaceholder = (
		<span
			className="sgs-button__icon"
			style={ { display: 'inline-flex', alignItems: 'center', width: iconSize?.desktop ? iconSize.desktop + 'px' : '1em', height: iconSize?.desktop ? iconSize.desktop + 'px' : '1em', color: iconColour || 'currentColor' } }
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
			{ /* ── Settings tab (default InspectorControls group) ──────────── */ }
			<InspectorControls>

				{ /* Content */ }
				<PanelBody title={ __( 'Content', 'sgs-blocks' ) } initialOpen={ true }>
					<TextControl
						label={ __( 'Label', 'sgs-blocks' ) }
						value={ label }
						onChange={ ( val ) => setAttributes( { label: val } ) }
						__nextHasNoMarginBottom
						__next40pxDefaultSize
					/>
					<SgsLinkControl
						label={ __( 'URL', 'sgs-blocks' ) }
						value={ { url: url || '' } }
						onChange={ ( val ) => setAttributes( { url: val } ) }
						searchOnly
					/>
					<SelectControl
						label={ __( 'Open in', 'sgs-blocks' ) }
						value={ linkTarget }
						options={ TARGET_OPTIONS }
						onChange={ ( val ) => setAttributes( { linkTarget: val } ) }
						__nextHasNoMarginBottom
						__next40pxDefaultSize
					/>
					<TextControl
						label={ __( 'Rel attribute', 'sgs-blocks' ) }
						value={ rel }
						onChange={ ( val ) => setAttributes( { rel: val } ) }
						help={ __( 'e.g. noopener noreferrer nofollow', 'sgs-blocks' ) }
						__nextHasNoMarginBottom
						__next40pxDefaultSize
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
						__next40pxDefaultSize
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
							<ToolsPanel
								label={ __( 'Icon settings', 'sgs-blocks' ) }
								resetAll={ () =>
									setAttributes( {
										iconPosition: 'after',
										labelCollapse: 'none',
										iconTitle: '',
									} )
								}
							>
								<ToolsPanelItem
									label={ __( 'Icon position', 'sgs-blocks' ) }
									hasValue={ () => iconPosition !== 'after' }
									onDeselect={ () => setAttributes( { iconPosition: 'after' } ) }
									isShownByDefault
								>
									<SelectControl
										label={ __( 'Icon position', 'sgs-blocks' ) }
										value={ iconPosition }
										options={ ICON_POSITION_OPTIONS }
										onChange={ ( val ) => setAttributes( { iconPosition: val } ) }
										__nextHasNoMarginBottom
										__next40pxDefaultSize
									/>
								</ToolsPanelItem>
								{ iconPosition !== 'only' && (
									<ToolsPanelItem
										label={ __( 'Collapse label to icon', 'sgs-blocks' ) }
										hasValue={ () => ( labelCollapse || 'none' ) !== 'none' }
										onDeselect={ () => setAttributes( { labelCollapse: 'none' } ) }
									>
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
											__next40pxDefaultSize
										/>
									</ToolsPanelItem>
								) }
								<ToolsPanelItem
									label={ __( 'Icon title', 'sgs-blocks' ) }
									hasValue={ () => !! iconTitle }
									onDeselect={ () => setAttributes( { iconTitle: '' } ) }
								>
									<TextControl
										label={ __( 'Icon title (SVG accessible title)', 'sgs-blocks' ) }
										value={ iconTitle }
										onChange={ ( val ) => setAttributes( { iconTitle: val } ) }
										help={ __( 'Used as the SVG <title> for screen readers when icon-only.', 'sgs-blocks' ) }
										__nextHasNoMarginBottom
										__next40pxDefaultSize
									/>
								</ToolsPanelItem>
							</ToolsPanel>
							{ /* Icon appearance — size/gap/colour. Merged into this same
							   element panel 2026-08-13 (Spec 35 A4: one element = one
							   panel, holding content + style clusters + states together).
							   Previously a second "Icon" PanelBody lived in the Styles
							   tab — a client browsing tabs met "Icon" twice with no way
							   to tell which held what. The icon's hover colour is a
							   STATE of the icon's colour, not a separate hover concept,
							   so it stays grouped here rather than in a generic Colours
							   panel. Kept as its own ToolsPanel (distinct reset group —
							   resets appearance without touching position/collapse/title). */ }
							<ToolsPanel
								label={ __( 'Icon appearance', 'sgs-blocks' ) }
								resetAll={ () =>
									setAttributes( {
										iconSize: {},
										iconColour: '',
										iconColourHover: '',
									} )
								}
							>
								{ /* iconSize is a TIER OBJECT (Spec 35 migration, 2026-08-11) —
								   one attr holding {desktop,tablet,mobile}. */ }
								<ToolsPanelItem
									label={ __( 'Icon size', 'sgs-blocks' ) }
									hasValue={ () => !! iconSize?.desktop && iconSize.desktop !== 16 }
									onDeselect={ () => setAttributes( { iconSize: {} } ) }
									isShownByDefault
								>
									<ResponsiveOverride
										label={ __( 'Icon size (px)', 'sgs-blocks' ) }
										value={ iconSize }
										onChange={ ( obj ) => setAttributes( { iconSize: obj } ) }
									>
										{ ( { ownValue, effectiveValue, inherited, setOwnValue } ) => (
											<RangeControl
												label={ __( 'Icon size (px)', 'sgs-blocks' ) }
												value={ ownValue || ( inherited ? effectiveValue : 16 ) || 16 }
												onChange={ ( val ) => setOwnValue( val ) }
												min={ 8 }
												max={ 100 }
												step={ 1 }
												__nextHasNoMarginBottom
												__next40pxDefaultSize
											/>
										) }
									</ResponsiveOverride>
								</ToolsPanelItem>
								{ /* Element-scoped colour states. Spec 35 keeps every control
								     for an element INSIDE that element's own panel — the
								     icon's hover colour is a STATE of the icon's colour, not
								     a separate hover concept, so it belongs here rather than
								     in a hover panel elsewhere in the sidebar. Swatches stay
								     visible in both states so a set hover colour is never
								     hidden (council mitigation 2026-07-18). */ }
								<ToolsPanelItem
									label={ __( 'Icon colours', 'sgs-blocks' ) }
									hasValue={ () => !! iconColour || !! iconColourHover }
									onDeselect={ () =>
										setAttributes( { iconColour: '', iconColourHover: '' } )
									}
									isShownByDefault
								>
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
								</ToolsPanelItem>
							</ToolsPanel>
						</>
					) }
				</PanelBody>

			</InspectorControls>

			{ /* ── Styles tab ─────────────────────────────────────────────── */ }
			<InspectorControls group="styles">

				{ /* Layout */ }
				<PanelBody title={ __( 'Layout', 'sgs-blocks' ) } initialOpen={ false }>
					{ /* Width — widthType / customWidth / customWidthUnit are TIER
					   OBJECTS (Spec 35 migration, 2026-08-11), each ONE attr
					   holding {desktop,tablet,mobile}. ResponsiveOverride drives
					   the shared device tier; widthType is the object it manages
					   directly, and customWidth/customWidthUnit are written for
					   the SAME tier (via the render-prop's exposed `tier`) so all
					   three stay in lockstep per breakpoint. Tablet/mobile keep
					   the explicit "— Same as desktop —" sentinel ('' = inherit,
					   matching the pre-migration behaviour) rather than showing
					   the resolved inherited value in the dropdown. */ }
					<ResponsiveOverride
						label={ __( 'Width', 'sgs-blocks' ) }
						value={ widthType }
						onChange={ ( obj ) => setAttributes( { widthType: obj } ) }
					>
						{ ( { tier, ownValue, setOwnValue } ) => {
							const typeVal = ownValue || ( 'desktop' === tier ? 'fit' : '' );
							const options = 'desktop' === tier ? WIDTH_OPTIONS : WIDTH_OPTIONS_TIER;
							const widthObj = customWidth || {};
							const unitObj = customWidthUnit || {};
							const numVal = widthObj[ tier ];
							const unitVal = unitObj[ tier ] || 'px';
							return (
								<>
									<SelectControl
										label={ __( 'Width', 'sgs-blocks' ) }
										hideLabelFromVision
										value={ typeVal }
										options={ options }
										onChange={ ( val ) => setOwnValue( val ) }
										__nextHasNoMarginBottom
										__next40pxDefaultSize
									/>
									{ 'custom' === typeVal && (
										<UnitControl
											label={ __( 'Custom width', 'sgs-blocks' ) }
											value={ composeUnit( numVal, unitVal ) }
											units={ CUSTOM_WIDTH_UNITS }
											onChange={ ( raw ) => {
												const { num, unit } = parseUnit( raw, unitVal );
												setAttributes( {
													customWidth: { ...widthObj, [ tier ]: num },
													customWidthUnit: { ...unitObj, [ tier ]: unit },
												} );
											} }
											__nextHasNoMarginBottom
											style={ { marginTop: '8px' } }
											__next40pxDefaultSize
										/>
									) }
								</>
							);
						} }
					</ResponsiveOverride>

					{ /* `minHeight`'s VALUE is a TIER OBJECT (Spec 35 migration, 2026-08-11)
					   — {desktop,tablet,mobile} — so it uses ResponsiveOverride. Its UNIT
					   stays the separate flat-per-tier family declared above
					   (minHeightUnit/minHeightTabletUnit/minHeightMobileUnit), read/written
					   alongside via `activeMinHeightTier`/`activeMinHeightUnit`. */ }
					<ResponsiveOverride
						label={ __( 'Min height', 'sgs-blocks' ) }
						value={ attributes.minHeight }
						onChange={ ( obj ) => setAttributes( { minHeight: obj } ) }
					>
						{ ( { ownValue, effectiveValue, inherited, setOwnValue } ) => (
							<UnitControl
								label={ __( 'Min height', 'sgs-blocks' ) }
								hideLabelFromVision
								value={ composeUnit(
									inherited ? ownValue : ( ownValue ?? effectiveValue ),
									activeMinHeightUnit
								) }
								placeholder={ inherited ? composeUnit( effectiveValue, activeMinHeightUnit ) : undefined }
								units={ MIN_HEIGHT_UNITS }
								onChange={ ( raw ) => {
									const { num, unit } = parseUnit( raw, activeMinHeightUnit );
									setOwnValue( num );
									if ( unit !== activeMinHeightUnit ) {
										setAttributes( { [ minHeightUnitAttr ]: unit } );
									}
								} }
								__nextHasNoMarginBottom
								__next40pxDefaultSize
							/>
						) }
					</ResponsiveOverride>
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
							showLineHeight={ false }
							showResponsive={ true }
						/>
						{ /* Line height — lineHeight is now a TIER OBJECT (Spec 35
						   migration, 2026-08-11), so it can no longer go through
						   TypographyControls' showLineHeight (that prop still
						   assumes the old flat lineHeight/lineHeightTablet/
						   lineHeightMobile trio). Wired by hand here with the
						   same UnitControl UX, driven by <ResponsiveOverride>.
						   lineHeightUnit is unchanged — a single flat string
						   shared across tiers ('' = unitless). */ }
						<ResponsiveOverride
							label={ __( 'Line height', 'sgs-blocks' ) }
							value={ lineHeight }
							onChange={ ( obj ) => setAttributes( { lineHeight: obj } ) }
						>
							{ ( { ownValue, setOwnValue } ) => {
								const lineHeightUnit = attributes.lineHeightUnit !== undefined ? attributes.lineHeightUnit : '';
								return (
									<UnitControl
										label={ __( 'Line height', 'sgs-blocks' ) }
										value={ composeUnit( ownValue, lineHeightUnit ) }
										units={ LINE_HEIGHT_UNITS }
										onChange={ ( raw ) => {
											const { num, unit } = parseUnit( raw, lineHeightUnit );
											setOwnValue( num );
											setAttributes( { lineHeightUnit: unit } );
										} }
										__nextHasNoMarginBottom
										__next40pxDefaultSize
									/>
								);
							} }
						</ResponsiveOverride>
						<SelectControl
							label={ __( 'Text transform', 'sgs-blocks' ) }
							value={ textTransform }
							options={ TEXT_TRANSFORM_OPTIONS }
							onChange={ ( val ) => setAttributes( { textTransform: val } ) }
							__nextHasNoMarginBottom
							__next40pxDefaultSize
						/>
						<SelectControl
							label={ __( 'Text decoration', 'sgs-blocks' ) }
							value={ textDecoration }
							options={ TEXT_DECORATION_OPTIONS }
							onChange={ ( val ) => setAttributes( { textDecoration: val } ) }
							__nextHasNoMarginBottom
							__next40pxDefaultSize
						/>
						{ /* Letter spacing is now a TIER OBJECT (Spec 35 migration,
						   2026-08-11) — same RangeControl UX as before, wrapped in
						   <ResponsiveOverride> so tablet/mobile become editable
						   (render.php already reads all three tiers). */ }
						<ResponsiveOverride
							label={ __( 'Letter spacing (px)', 'sgs-blocks' ) }
							value={ letterSpacing }
							onChange={ ( obj ) => setAttributes( { letterSpacing: obj } ) }
						>
							{ ( { ownValue, setOwnValue } ) => (
								<RangeControl
									label={ __( 'Letter spacing (px)', 'sgs-blocks' ) }
									value={ ownValue || 0 }
									onChange={ ( val ) => setOwnValue( val ) }
									min={ -5 }
									max={ 20 }
									step={ 0.5 }
									__nextHasNoMarginBottom
									__next40pxDefaultSize
								/>
							) }
						</ResponsiveOverride>
					</PanelBody>

				{ /* Colours — always editable (preset-as-seed). D288: DesignTokenPicker
				   in `linked` mode — pick a global-palette swatch (stores the token
				   slug so a brand/palette change recolours the button) OR a custom
				   colour (full picker: spectrum + hex + opacity). */ }
				<PanelBody title={ __( 'Colours', 'sgs-blocks' ) } initialOpen={ true }>
					<ToolsPanel
						label={ __( 'Colours', 'sgs-blocks' ) }
						resetAll={ () =>
							setAttributes( {
								colourText: '',
								colourTextHover: '',
								colourBackground: '',
								colourBackgroundHover: '',
								colourBorder: '',
								colourBorderHover: '',
								textDecorationHover: 'none',
							} )
						}
					>
						<ToolsPanelItem
							label={ __( 'Text colour', 'sgs-blocks' ) }
							hasValue={ () => !! colourText }
							onDeselect={ () => setAttributes( { colourText: '' } ) }
							isShownByDefault
						>
							<DesignTokenPicker
								linked
								label={ __( 'Text colour', 'sgs-blocks' ) }
								value={ colourText }
								onChange={ ( val ) => setAttributes( { colourText: val ?? '' } ) }
							/>
						</ToolsPanelItem>
						<ToolsPanelItem
							label={ __( 'Text colour — hover', 'sgs-blocks' ) }
							hasValue={ () => !! colourTextHover }
							onDeselect={ () => setAttributes( { colourTextHover: '' } ) }
						>
							<DesignTokenPicker
								linked
								label={ __( 'Text colour — hover', 'sgs-blocks' ) }
								value={ colourTextHover }
								onChange={ ( val ) => setAttributes( { colourTextHover: val ?? '' } ) }
							/>
						</ToolsPanelItem>
						<ToolsPanelItem
							label={ __( 'Background colour', 'sgs-blocks' ) }
							hasValue={ () => !! colourBackground }
							onDeselect={ () => setAttributes( { colourBackground: '' } ) }
							isShownByDefault
						>
							<DesignTokenPicker
								linked
								label={ __( 'Background colour', 'sgs-blocks' ) }
								value={ colourBackground }
								onChange={ ( val ) => setAttributes( { colourBackground: val ?? '' } ) }
							/>
						</ToolsPanelItem>
						<ToolsPanelItem
							label={ __( 'Background colour — hover', 'sgs-blocks' ) }
							hasValue={ () => !! colourBackgroundHover }
							onDeselect={ () => setAttributes( { colourBackgroundHover: '' } ) }
						>
							<DesignTokenPicker
								linked
								label={ __( 'Background colour — hover', 'sgs-blocks' ) }
								value={ colourBackgroundHover }
								onChange={ ( val ) => setAttributes( { colourBackgroundHover: val ?? '' } ) }
							/>
						</ToolsPanelItem>
						<ToolsPanelItem
							label={ __( 'Border colour', 'sgs-blocks' ) }
							hasValue={ () => !! colourBorder }
							onDeselect={ () => setAttributes( { colourBorder: '' } ) }
						>
							<DesignTokenPicker
								linked
								label={ __( 'Border colour', 'sgs-blocks' ) }
								value={ colourBorder }
								onChange={ ( val ) => setAttributes( { colourBorder: val ?? '' } ) }
							/>
						</ToolsPanelItem>
						<ToolsPanelItem
							label={ __( 'Border colour — hover', 'sgs-blocks' ) }
							hasValue={ () => !! colourBorderHover }
							onDeselect={ () => setAttributes( { colourBorderHover: '' } ) }
						>
							<DesignTokenPicker
								linked
								label={ __( 'Border colour — hover', 'sgs-blocks' ) }
								value={ colourBorderHover }
								onChange={ ( val ) => setAttributes( { colourBorderHover: val ?? '' } ) }
							/>
						</ToolsPanelItem>
						<ToolsPanelItem
							label={ __( 'Underline on hover', 'sgs-blocks' ) }
							hasValue={ () => ( textDecorationHover || 'none' ) !== 'none' }
							onDeselect={ () => setAttributes( { textDecorationHover: 'none' } ) }
						>
							<SelectControl
								label={ __( 'Underline on hover', 'sgs-blocks' ) }
								value={ textDecorationHover || 'none' }
								options={ UNDERLINE_HOVER_OPTIONS }
								onChange={ ( val ) => setAttributes( { textDecorationHover: val } ) }
								__nextHasNoMarginBottom
								__next40pxDefaultSize
							/>
						</ToolsPanelItem>
					</ToolsPanel>
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
							__next40pxDefaultSize
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
						__next40pxDefaultSize
					/>
					<RangeControl
						label={ __( 'Transition duration (ms)', 'sgs-blocks' ) }
						value={ transitionDuration }
						onChange={ ( val ) => setAttributes( { transitionDuration: val } ) }
						min={ 0 }
						max={ 1000 }
						step={ 50 }
						__nextHasNoMarginBottom
						__next40pxDefaultSize
					/>
					<SelectControl
						label={ __( 'Transition easing', 'sgs-blocks' ) }
						value={ transitionEasing }
						options={ EASING_OPTIONS }
						onChange={ ( val ) => setAttributes( { transitionEasing: val } ) }
						__nextHasNoMarginBottom
						__next40pxDefaultSize
					/>
				</PanelBody>

				{ /* Box shadow — always editable (preset-as-seed) */ }
				<PanelBody title={ __( 'Shadow', 'sgs-blocks' ) } initialOpen={ false }>
					<ToolsPanel
						label={ __( 'Shadow', 'sgs-blocks' ) }
						resetAll={ () =>
							setAttributes( {
								boxShadow: DEFAULT_BOX_SHADOW,
								boxShadowHover: DEFAULT_BOX_SHADOW,
							} )
						}
					>
						<ToolsPanelItem
							label={ __( 'Shadow — normal state', 'sgs-blocks' ) }
							hasValue={ () =>
								!! boxShadow.colour ||
								boxShadow.hOffset !== 0 ||
								boxShadow.vOffset !== 0 ||
								boxShadow.blur !== 0 ||
								boxShadow.spread !== 0 ||
								!! boxShadow.inset
							}
							onDeselect={ () => setAttributes( { boxShadow: DEFAULT_BOX_SHADOW } ) }
							isShownByDefault
						>
							<p style={ { fontSize: '12px', color: '#555', marginTop: 0 } }>{ __( 'Normal state', 'sgs-blocks' ) }</p>
							<DesignTokenPicker linked label={ __( 'Shadow colour', 'sgs-blocks' ) } value={ boxShadow.colour } onChange={ ( val ) => setAttributes( { boxShadow: { ...boxShadow, colour: val ?? '' } } ) } />
							<RangeControl label={ __( 'Horizontal offset (px)', 'sgs-blocks' ) } value={ boxShadow.hOffset } onChange={ ( val ) => setAttributes( { boxShadow: { ...boxShadow, hOffset: val } } ) } min={ -50 } max={ 50 } __nextHasNoMarginBottom __next40pxDefaultSize />
							<RangeControl label={ __( 'Vertical offset (px)', 'sgs-blocks' ) } value={ boxShadow.vOffset } onChange={ ( val ) => setAttributes( { boxShadow: { ...boxShadow, vOffset: val } } ) } min={ -50 } max={ 50 } __nextHasNoMarginBottom __next40pxDefaultSize />
							<RangeControl label={ __( 'Blur (px)', 'sgs-blocks' ) } value={ boxShadow.blur } onChange={ ( val ) => setAttributes( { boxShadow: { ...boxShadow, blur: val } } ) } min={ 0 } max={ 100 } __nextHasNoMarginBottom __next40pxDefaultSize />
							<RangeControl label={ __( 'Spread (px)', 'sgs-blocks' ) } value={ boxShadow.spread } onChange={ ( val ) => setAttributes( { boxShadow: { ...boxShadow, spread: val } } ) } min={ -50 } max={ 50 } __nextHasNoMarginBottom __next40pxDefaultSize />
							<ToggleControl label={ __( 'Inset', 'sgs-blocks' ) } checked={ boxShadow.inset } onChange={ ( val ) => setAttributes( { boxShadow: { ...boxShadow, inset: val } } ) } __nextHasNoMarginBottom />
						</ToolsPanelItem>
						<ToolsPanelItem
							label={ __( 'Shadow — hover state', 'sgs-blocks' ) }
							hasValue={ () =>
								!! boxShadowHover.colour ||
								boxShadowHover.hOffset !== 0 ||
								boxShadowHover.vOffset !== 0 ||
								boxShadowHover.blur !== 0 ||
								boxShadowHover.spread !== 0 ||
								!! boxShadowHover.inset
							}
							onDeselect={ () => setAttributes( { boxShadowHover: DEFAULT_BOX_SHADOW } ) }
						>
							<p style={ { fontSize: '12px', color: '#555', marginTop: 0 } }>{ __( 'Hover state', 'sgs-blocks' ) }</p>
							<DesignTokenPicker linked label={ __( 'Shadow colour', 'sgs-blocks' ) } value={ boxShadowHover.colour } onChange={ ( val ) => setAttributes( { boxShadowHover: { ...boxShadowHover, colour: val ?? '' } } ) } />
							<RangeControl label={ __( 'Horizontal offset (px)', 'sgs-blocks' ) } value={ boxShadowHover.hOffset } onChange={ ( val ) => setAttributes( { boxShadowHover: { ...boxShadowHover, hOffset: val } } ) } min={ -50 } max={ 50 } __nextHasNoMarginBottom __next40pxDefaultSize />
							<RangeControl label={ __( 'Vertical offset (px)', 'sgs-blocks' ) } value={ boxShadowHover.vOffset } onChange={ ( val ) => setAttributes( { boxShadowHover: { ...boxShadowHover, vOffset: val } } ) } min={ -50 } max={ 50 } __nextHasNoMarginBottom __next40pxDefaultSize />
							<RangeControl label={ __( 'Blur (px)', 'sgs-blocks' ) } value={ boxShadowHover.blur } onChange={ ( val ) => setAttributes( { boxShadowHover: { ...boxShadowHover, blur: val } } ) } min={ 0 } max={ 100 } __nextHasNoMarginBottom __next40pxDefaultSize />
							<RangeControl label={ __( 'Spread (px)', 'sgs-blocks' ) } value={ boxShadowHover.spread } onChange={ ( val ) => setAttributes( { boxShadowHover: { ...boxShadowHover, spread: val } } ) } min={ -50 } max={ 50 } __nextHasNoMarginBottom __next40pxDefaultSize />
							<ToggleControl label={ __( 'Inset', 'sgs-blocks' ) } checked={ boxShadowHover.inset } onChange={ ( val ) => setAttributes( { boxShadowHover: { ...boxShadowHover, inset: val } } ) } __nextHasNoMarginBottom />
						</ToolsPanelItem>
					</ToolsPanel>
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
