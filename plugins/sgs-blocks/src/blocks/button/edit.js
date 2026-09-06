import { __ } from '@wordpress/i18n';
import { useState, useRef } from '@wordpress/element';
import {
	useBlockProps,
	InspectorControls,
	BlockControls,
	RichText,
	useSettings,
} from '@wordpress/block-editor';
import { useSelect } from '@wordpress/data';
import { link as linkIcon } from '@wordpress/icons';
import {
	PanelBody,
	BaseControl,
	Button,
	TextControl,
	SelectControl,
	RangeControl,
	ToggleControl,
	ToolbarGroup,
	ToolbarButton,
} from '@wordpress/components';
import { IconPicker, TypographyControls, ResponsiveControl, ResponsiveOverride, ResponsiveBoxControl, SgsColourPanel, ShadowControl, resolveColourToken, SgsLengthControl, SgsBorderControl, BOX_UNITS, normaliseResponsiveBox, SgsBoxControl } from '../../components';
import { ToolsPanel, ToolsPanelItem } from '../../components/primitives';
import { LinkPopoverContent } from '../../components';
import { resolveShadowPreviewComposed } from '../../utils/tokens';
import { backgroundPaintPreview, textPaintPreview } from '../../utils';

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
	const { padding, margin,
		label,
		url,
		linkId,
		linkKind,
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
		iconColourGradient,
		iconColourHover,
		iconColourHoverGradient,
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
		colourTextGradient,
		colourTextHover,
		colourTextHoverGradient,
		colourBackground,
		colourBackgroundGradient,
		colourBackgroundHover,
		colourBackgroundHoverGradient,
		borderColour,
		borderColourGradient,
		borderColourHover,
		borderColourHoverGradient,
		textDecorationHover,
		borderStyle,
		borderWidth,
		scaleHover,
		transitionDuration,
		transitionEasing,
		boxShadow,
		boxShadowColour,
		boxShadowHover,
		boxShadowHoverColour,
	} = attributes;

	const hasIcon = !! icon;

	// LINK contract popover (Spec 35 §2 / D609 row-opens-popover shape) — ONE
	// popover (`LinkPopoverContent`, `../../components/LinkPopoverControl.js`),
	// its anchor swapped between the toolbar link button and the sidebar's
	// compact link row so both triggers open the SAME surface. Button needs
	// its OWN dual-trigger orchestration (this state) rather than the
	// self-contained `LinkPopoverField` wrapper, because it has TWO
	// independently-styled triggers (toolbar icon button + sidebar row) that
	// must share one popover instance — `LinkPopoverField` only owns a single
	// trigger. `linkTarget` needs 4 values (_self/_blank/_parent/_top) →
	// `targetMode="enum"`; `linkId`/`linkKind` internal-resolution is enabled
	// here (`enableInternalResolution`) because `render.php` resolves them via
	// `get_permalink()`/`get_term_link()` — the only consumer that does so
	// today (see Return §3 for why the other targets don't get it yet).
	const [ isLinkPopoverOpen, setIsLinkPopoverOpen ] = useState( false );
	const [ linkPopoverAnchor, setLinkPopoverAnchor ] = useState( null );
	const toolbarLinkRef = useRef();
	const sidebarLinkRef = useRef();
	const openLinkPopover = ( triggerRef ) => {
		setLinkPopoverAnchor( triggerRef.current );
		setIsLinkPopoverOpen( true );
	};

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
	// (via resolveColourToken against the live palette) — otherwise the preview
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

	// colourTextGradient/colourBackgroundGradient real mechanism (render.php,
	// D636 + the button-specific "Real text gradient" precondition,
	// CLAUDE.md): a gradient BACKGROUND is a `--sgs-btn-bg-image` custom-
	// property value consumed by style.css — the same technique
	// `backgroundPaintPreview()` already mirrors. A gradient TEXT colour needs
	// `background-clip:text` (`textPaintPreview()`), but `.sgs-button` paints
	// its OWN background on the exact same selector a text colour targets —
	// clipping would erase the button's fill. The frontend solves this by
	// moving the background onto a `::after` layer ONLY when a text gradient
	// is actually set; this mirrors that with a real sibling DOM layer (React
	// has no way to target `::after` via inline style) rather than the
	// generic backgroundPaintPreview merge.
	const hasValidTextGradient = !! ( colourTextGradient && /^(repeating-)?(linear|radial|conic)-gradient\(/i.test( colourTextGradient ) );
	const bgPaintPreview = backgroundPaintPreview( colourBackground, colourBackgroundGradient, palette );
	let backgroundLayerStyle = null;

	if ( hasValidTextGradient ) {
		// Neutralise the element's own background (moves to a sibling layer)
		// and establish the stacking context the layer needs — mirrors
		// render.php's `position:relative;isolation:isolate;background-color:
		// transparent;background-image:none` on the strengthened selector.
		previewStyle.position = 'relative';
		previewStyle.isolation = 'isolate';
		previewStyle.backgroundColor = 'transparent';
		previewStyle.backgroundImage = 'none';
		if ( bgPaintPreview.backgroundColor || bgPaintPreview.backgroundImage ) {
			backgroundLayerStyle = {
				position: 'absolute',
				inset: 0,
				zIndex: -1,
				borderRadius: 'inherit',
				pointerEvents: 'none',
				...bgPaintPreview,
			};
		}
		Object.assign( previewStyle, textPaintPreview( colourText, colourTextGradient, palette ) );
	} else {
		Object.assign( previewStyle, bgPaintPreview );
		if ( colourText ) previewStyle.color = resolveColourToken( colourText, palette );
	}

	if ( borderColour ) previewStyle.borderColor = resolveColourToken( borderColour, palette );
	// A gradient border renders frontend as a masked ::before ring, which cannot
	// be reproduced in a plain inline style — approximate it with the gradient as
	// a border-image so the canvas at least shows that a gradient is applied.
	if ( borderColourGradient && /^(repeating-)?(linear|radial|conic)-gradient\(/i.test( borderColourGradient ) ) {
		previewStyle.borderImage = `${ borderColourGradient } 1`;
	}
	if ( borderStyle ) previewStyle.borderStyle = borderStyle;
	const borderWidthPreview = boxShorthand( borderWidth, [ 'top', 'right', 'bottom', 'left' ] );
	if ( borderWidthPreview ) previewStyle.borderWidth = borderWidthPreview;
	// CSS border-radius shorthand order: top-left top-right bottom-right bottom-left.
	const borderRadiusPreview = boxShorthand( attributes.borderRadius?.desktop, [ 'topLeft', 'topRight', 'bottomRight', 'bottomLeft' ] );
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
	// (composed via sgs_shadow_value_composed()). Only the NORMAL state
	// previews (hover can't be shown on a static canvas element). Colour is a
	// design-token slug or custom hex (D288), so it must resolve via the live
	// palette exactly like the other colour previews above — otherwise a
	// token slug renders as invalid CSS and the shadow silently disappears.
	const boxShadowPreview = resolveShadowPreviewComposed( boxShadow, resolveColourToken( boxShadowColour, palette ) );
	if ( boxShadowPreview ) {
		previewStyle.boxShadow = boxShadowPreview;
	}
	const paddingPreview = boxShorthand( padding?.desktop, [ 'top', 'right', 'bottom', 'left' ] );
	if ( paddingPreview ) previewStyle.padding = paddingPreview;
	const marginPreview = boxShorthand( margin?.desktop, [ 'top', 'right', 'bottom', 'left' ] );
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
			{ /* D618/D609 — ONE grouped, SGS-OWNED colour panel (own PanelBody,
			   default InspectorControls group), rendered FIRST so it sits at
			   the top of the inspector. Replaces the icon-colour StateToggle
			   row that used to sit in the "Icon" panel below, and the whole
			   "Colours" ToolsPanel that used to sit in the Styles tab.
			   `supports.color` sub-flags are now false so WordPress generates
			   no native colour UI to overlap with this panel. */ }
			<SgsColourPanel
				rows={ [
					{
						key: 'text',
						label: __( 'Text colour', 'sgs-blocks' ),
						states: [
							{
								key: 'normal',
								label: __( 'Normal', 'sgs-blocks' ),
								value: colourText,
								onChange: ( val ) => setAttributes( { colourText: val ?? '' } ),
								gradientValue: colourTextGradient,
								onGradientChange: ( val ) =>
									setAttributes( { colourTextGradient: val ?? '' } ),
							},
							{
								key: 'hover',
								label: __( 'Hover', 'sgs-blocks' ),
								value: colourTextHover,
								onChange: ( val ) => setAttributes( { colourTextHover: val ?? '' } ),
								gradientValue: colourTextHoverGradient,
								onGradientChange: ( val ) =>
									setAttributes( { colourTextHoverGradient: val ?? '' } ),
							},
						],
					},
					{
						key: 'background',
						label: __( 'Background colour', 'sgs-blocks' ),
						states: [
							{
								key: 'normal',
								label: __( 'Normal', 'sgs-blocks' ),
								value: colourBackground,
								onChange: ( val ) => setAttributes( { colourBackground: val ?? '' } ),
								gradientValue: colourBackgroundGradient,
								onGradientChange: ( val ) =>
									setAttributes( { colourBackgroundGradient: val ?? '' } ),
							},
							{
								key: 'hover',
								label: __( 'Hover', 'sgs-blocks' ),
								value: colourBackgroundHover,
								onChange: ( val ) => setAttributes( { colourBackgroundHover: val ?? '' } ),
								gradientValue: colourBackgroundHoverGradient,
								onGradientChange: ( val ) =>
									setAttributes( { colourBackgroundHoverGradient: val ?? '' } ),
							},
						],
					},
					{
						key: 'icon',
						label: __( 'Icon colour', 'sgs-blocks' ),
						states: [
							{
								key: 'normal',
								label: __( 'Normal', 'sgs-blocks' ),
								value: iconColour,
								onChange: ( val ) => setAttributes( { iconColour: val ?? '' } ),
								gradientValue: iconColourGradient,
								onGradientChange: ( val ) =>
									setAttributes( { iconColourGradient: val ?? '' } ),
							},
							{
								key: 'hover',
								label: __( 'Hover', 'sgs-blocks' ),
								value: iconColourHover,
								onChange: ( val ) => setAttributes( { iconColourHover: val ?? '' } ),
								gradientValue: iconColourHoverGradient,
								onGradientChange: ( val ) =>
									setAttributes( { iconColourHoverGradient: val ?? '' } ),
							},
						],
					},
					{
						key: 'shadow',
						label: __( 'Shadow colour', 'sgs-blocks' ),
						states: [
							{
								key: 'normal',
								label: __( 'Normal', 'sgs-blocks' ),
								value: boxShadowColour,
								onChange: ( val ) => setAttributes( { boxShadowColour: val ?? '' } ),
							},
							{
								key: 'hover',
								label: __( 'Hover', 'sgs-blocks' ),
								value: boxShadowHoverColour,
								onChange: ( val ) => setAttributes( { boxShadowHoverColour: val ?? '' } ),
							},
						],
					},
				] }
			/>
			{ /* ── Settings tab (default InspectorControls group) ──────────── */ }
			<InspectorControls>

				{ /* Content */ }
				<PanelBody title={ __( 'Content', 'sgs-blocks' ) } initialOpen={ true }>
					{ /* Text is now edited on-canvas via RichText below, matching
					   core/button — no sidebar duplicate. Link is the D609
					   row-opens-popover shape: this compact row and the toolbar
					   link button (BlockControls below) open the SAME popover
					   (`../../components/LinkPopoverControl.js`), never an
					   inline LinkControl here. */ }
					<BaseControl label={ __( 'Link', 'sgs-blocks' ) } __nextHasNoMarginBottom>
						{ /* Root cause of the row overflowing the panel (measured
						   2026-08-13): the URL rendered as one unbroken nowrap
						   string with nothing to shrink or truncate it — NOT
						   core LinkControl's 350px floor (that component isn't
						   mounted here). Fix: the label is a flex child allowed
						   to shrink (`min-width:0`, `LinkPopoverControl.css`) and
						   ellipsis-truncated; the full URL stays reachable via
						   `title` for a mouse/AT tooltip. */ }
						<Button
							ref={ sidebarLinkRef }
							variant="tertiary"
							className="sgs-link-popover__row"
							icon={ linkIcon }
							title={ url || undefined }
							onClick={ () => openLinkPopover( sidebarLinkRef ) }
						>
							<span className="sgs-link-popover__row-label">
								{ url ? url : __( 'Add link', 'sgs-blocks' ) }
							</span>
						</Button>
					</BaseControl>
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
												hideLabelFromVision
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
										<SgsLengthControl
											presets={ false }
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
											style={ { marginTop: '8px' } }
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
							<SgsLengthControl
								presets={ false }
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
							showFontFamily={ true }
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
									<SgsLengthControl
										presets={ false }
										label={ __( 'Line height', 'sgs-blocks' ) }
										hideLabelFromVision
										value={ composeUnit( ownValue, lineHeightUnit ) }
										units={ LINE_HEIGHT_UNITS }
										onChange={ ( raw ) => {
											const { num, unit } = parseUnit( raw, lineHeightUnit );
											setOwnValue( num );
											setAttributes( { lineHeightUnit: unit } );
										} }
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
									hideLabelFromVision
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

				{ /* Hover effects — D609/D618: colours moved to the top-level
				   SgsColourPanel (Normal/Hover tabs per swatch). This
				   ToolsPanel now holds only the one hover behaviour with no
				   colour of its own. */ }
				<ToolsPanel
						label={ __( 'Hover effects', 'sgs-blocks' ) }
						resetAll={ () =>
							setAttributes( { textDecorationHover: 'none' } )
						}
					>
						<ToolsPanelItem
							label={ __( 'Underline on hover', 'sgs-blocks' ) }
							hasValue={ () => ( textDecorationHover || 'none' ) !== 'none' }
							onDeselect={ () => setAttributes( { textDecorationHover: 'none' } ) }
							isShownByDefault
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

				{ /* Border — always editable (preset-as-seed). Box-object interface
				   contract §1/§5: borderWidth is an SGS custom object attr (base only,
				   no tiers); borderRadius is a single block-owned tier-object attr
				   { desktop, tablet, mobile }, read directly by render.php. */ }
				<PanelBody title={ __( 'Border', 'sgs-blocks' ) } initialOpen={ false }>
												{ /* Task 0 codemod (migrate-border-control.js) -- one composite row
						   (width/style/colour) mirroring native's BorderBoxControl layout,
						   matching sgs/product-card + sgs/quote. Border-radius is unchanged
						   (stays WP-native). */ }
						<SgsBorderControl
							widthValues={ borderWidth ?? {} }
							onWidthChange={ ( next ) => setAttributes( { borderWidth: next } ) }
							widthPresets={ [ '10', '20', '30' ] }
							styleValue={ borderStyle }
							onStyleChange={ ( val ) => setAttributes( { borderStyle: val } ) }
							colourLabel={ __( 'Border colour', 'sgs-blocks' ) }
							colourStates={ [
								{
									key: 'normal',
									label: __( 'Normal', 'sgs-blocks' ),
									value: borderColour,
									onChange: ( val ) => setAttributes( { borderColour: val ?? '' } ),
									gradientValue: borderColourGradient,
									onGradientChange: ( val ) =>
									setAttributes( { borderColourGradient: val ?? '' } ),
								},
								{
									key: 'hover',
									label: __( 'Hover', 'sgs-blocks' ),
									value: borderColourHover,
									onChange: ( val ) => setAttributes( { borderColourHover: val ?? '' } ),
									gradientValue: borderColourHoverGradient,
									onGradientChange: ( val ) =>
									setAttributes( { borderColourHoverGradient: val ?? '' } ),
								},
							] }
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

				{ /* Spacing — padding/margin are each a single block-owned tier-object
				   attr { desktop, tablet, mobile }, written via ResponsiveOverride +
				   SgsBoxControl; read directly by this block's render.php. */ }
				<PanelBody title={ __( 'Spacing', 'sgs-blocks' ) } initialOpen={ false }>
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

				{ /* Box shadow — always editable (preset-as-seed). Shape only —
				   colour is externally managed via the top-level SgsColourPanel
				   'shadow' row (D621/D622 colour-architecture redesign),
				   matching every other migrated block (e.g. card-grid). */ }
				<PanelBody title={ __( 'Shadow', 'sgs-blocks' ) } initialOpen={ false }>
					<ShadowControl
						label={ __( 'Shadow', 'sgs-blocks' ) }
						attributes={ attributes }
						setAttributes={ setAttributes }
						attrNames={ {
							base: 'boxShadow',
							colour: 'boxShadowColour',
						} }
					/>
					<ShadowControl
						label={ __( 'Shadow (hover)', 'sgs-blocks' ) }
						attributes={ attributes }
						setAttributes={ setAttributes }
						attrNames={ {
							base: 'boxShadowHover',
							colour: 'boxShadowHoverColour',
						} }
					/>
				</PanelBody>

			</InspectorControls>

			{ /* Toolbar link button — the other trigger for the SAME popover as the
			   sidebar's link row (D609 row-opens-popover shape). Matches
			   core/button's toolbar placement (Spec 35 A1: on-canvas → Block
			   Toolbar → Inspector). */ }
			<BlockControls>
				<ToolbarGroup>
					<ToolbarButton
						ref={ toolbarLinkRef }
						icon={ linkIcon }
						label={ url ? __( 'Edit link', 'sgs-blocks' ) : __( 'Insert link', 'sgs-blocks' ) }
						isPressed={ isLinkPopoverOpen }
						onClick={ () => openLinkPopover( toolbarLinkRef ) }
					/>
				</ToolbarGroup>
			</BlockControls>

			{ /* Editor preview — the button element IS the block root (D288, no wrapper div).
			   The label is now RichText on-canvas (matching core/button) instead of a
			   sidebar TextControl. */ }
			<span { ...blockProps }>
				{ backgroundLayerStyle && (
					<span aria-hidden="true" style={ backgroundLayerStyle } />
				) }
				{ hasIcon && iconPosition === 'before' && iconPlaceholder }
				{ iconPosition !== 'only' && (
					<RichText
						tagName="span"
						className="sgs-button__label"
						value={ label }
						onChange={ ( val ) => setAttributes( { label: val } ) }
						placeholder={ __( 'Click Here', 'sgs-blocks' ) }
						allowedFormats={ [ 'core/bold', 'core/italic' ] }
						withoutInteractiveFormatting
					/>
				) }
				{ hasIcon && ( iconPosition === 'after' || iconPosition === 'only' ) && iconPlaceholder }
			</span>

			{ isLinkPopoverOpen && (
				<LinkPopoverContent
					anchor={ linkPopoverAnchor }
					onClose={ () => setIsLinkPopoverOpen( false ) }
					url={ url }
					linkId={ linkId }
					linkKind={ linkKind }
					linkTarget={ linkTarget }
					rel={ rel }
					download={ download }
					targetMode="enum"
					enableInternalResolution
					onChangeLink={ ( next ) => setAttributes( next ) }
					onChangeTarget={ ( val ) => setAttributes( { linkTarget: val } ) }
					onChangeRel={ ( val ) => setAttributes( { rel: val } ) }
					onChangeDownload={ ( val ) => setAttributes( { download: val } ) }
				/>
			) }
		</>
	);
}
