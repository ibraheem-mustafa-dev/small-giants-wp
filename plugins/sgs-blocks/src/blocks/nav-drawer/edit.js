/**
 * SGS Nav Drawer — block editor UI.
 *
 * The drawer is shown as an OPEN, styled preview shell so its InnerBlocks
 * content (menu / logo / CTA) stays editable in place. A native `<dialog>`
 * cannot host an editable InnerBlocks region while closed, and ServerSideRender
 * cannot host editable InnerBlocks at all, so the canvas uses a styled shell
 * (the standard InnerBlocks-container pattern — core/group, core/cover). The
 * shell's live styling reads the SAME attributes render.php reads, so SETTINGS
 * are reflected without the hand-built-preview drift the SSR rule warns about;
 * the interactive open/close animation is frontend-only.
 *
 * Inspector (Spec 35): two native tabs — Settings + Styles — via the `group`
 * prop; element-first panels grouped by PART (Drawer container / Close button /
 * Content). The WP-native Border panel (from the __experimentalBorder support)
 * appears in the Styles tab automatically and is not duplicated here.
 *
 * @package SGS\Blocks
 */

import { __, sprintf } from '@wordpress/i18n';
import {
	useBlockProps,
	useInnerBlocksProps,
	InspectorControls,
	useSettings,
	MediaUpload,
	MediaUploadCheck,
} from '@wordpress/block-editor';
import {
	PanelBody,
	TextControl,
	SelectControl,
	ToggleControl,
	Button,
	Icon,
} from '@wordpress/components';
import { useState } from '@wordpress/element';

/** backgroundSize control options — mirrors sgs/container's BackgroundPanel. */
const BG_SIZE_OPTIONS = [
	{ label: __( 'Cover', 'sgs-blocks' ), value: 'cover' },
	{ label: __( 'Contain', 'sgs-blocks' ), value: 'contain' },
	{ label: __( 'Auto', 'sgs-blocks' ), value: 'auto' },
];

/** backgroundPosition control options — mirrors sgs/container's BackgroundPanel. */
const BG_POSITION_OPTIONS = [
	{ label: __( 'Centre centre', 'sgs-blocks' ), value: 'center center' },
	{ label: __( 'Top centre', 'sgs-blocks' ), value: 'top center' },
	{ label: __( 'Bottom centre', 'sgs-blocks' ), value: 'bottom center' },
	{ label: __( 'Centre left', 'sgs-blocks' ), value: 'center left' },
	{ label: __( 'Centre right', 'sgs-blocks' ), value: 'center right' },
	{ label: __( 'Top left', 'sgs-blocks' ), value: 'top left' },
	{ label: __( 'Top right', 'sgs-blocks' ), value: 'top right' },
	{ label: __( 'Bottom left', 'sgs-blocks' ), value: 'bottom left' },
	{ label: __( 'Bottom right', 'sgs-blocks' ), value: 'bottom right' },
];

/** backgroundRepeat control options — mirrors sgs/container's BackgroundPanel. */
const BG_REPEAT_OPTIONS = [
	{ label: __( 'No repeat', 'sgs-blocks' ), value: 'no-repeat' },
	{ label: __( 'Repeat', 'sgs-blocks' ), value: 'repeat' },
	{ label: __( 'Repeat X', 'sgs-blocks' ), value: 'repeat-x' },
	{ label: __( 'Repeat Y', 'sgs-blocks' ), value: 'repeat-y' },
];

/** backgroundAttachment control options — mirrors sgs/container's BackgroundPanel. */
const BG_ATTACHMENT_OPTIONS = [
	{ label: __( 'Scroll', 'sgs-blocks' ), value: 'scroll' },
	{ label: __( 'Fixed', 'sgs-blocks' ), value: 'fixed' },
];
import { close } from '@wordpress/icons';
import { ResponsiveControl, ResponsiveBoxControl, resolveColourToken, SgsColourPanel, fillRow, textRow, SgsLengthControl,
	SgsBorderControl,
} from '../../components';
import { ToggleGroupControl, ToggleGroupControlOption, ToolsPanel, ToolsPanelItem } from '../../components/primitives';
import { resolveTextColourPreviewStyle } from '../../utils';

/**
 * Content template: menu + (optional) logo + (optional) CTA. templateLock:false.
 *
 * The nav-menu seeded here is a SEPARATE block instance from the one in the
 * header — its own uid, its own scoped styles, its own inspector — so a client
 * can style the drawer's menu completely independently of the bar.
 *
 * Seeding drawer-appropriate values makes the capability discoverable AND
 * gives a sane vertical starting point (a tighter stacked gap). Colours stay
 * UNSET so the drawer's own background shows through until a client picks
 * one.
 */
const TEMPLATE = [
	[ 'sgs/nav-menu', { gap: '4px' } ],
	[ 'sgs/responsive-logo' ],
	[ 'sgs/button' ],
];

/** drawerAlign → align-items (mirrors render.php). */
const ALIGN_ITEMS = {
	left: 'flex-start',
	center: 'center',
	right: 'flex-end',
};

/**
 * Build a CSS padding shorthand from a { top, right, bottom, left } box object,
 * or undefined when nothing is set (editor preview only).
 *
 * @param {Object} box Box object.
 * @return {string|undefined} CSS padding value or undefined.
 */
function paddingFromBox( box ) {
	if ( ! box || typeof box !== 'object' ) {
		return undefined;
	}
	const { top, right, bottom, left } = box;
	if ( ! top && ! right && ! bottom && ! left ) {
		return undefined;
	}
	return `${ top || '0' } ${ right || '0' } ${ bottom || '0' } ${ left || '0' }`;
}

/** Anchor → per-anchor default animation label shown at Automatic. */
const ANCHOR_ANIM_LABEL = {
	'full-screen': __( 'fade + drop', 'sgs-blocks' ),
	header: __( 'expand down', 'sgs-blocks' ),
	trigger: __( 'scale from corner', 'sgs-blocks' ),
	centred: __( 'scale up (modal)', 'sgs-blocks' ),
};

export default function Edit( { attributes, setAttributes } ) {
	const {
		drawerRef,
		anchor,
		panelSize,
		surfaceOpacity,
		surfaceBlur,
		closeStyle,
		animateFrom,
		drawerBg,
		toggleCloseColour,
		toggleCloseColourGradient,
		drawerAlign,
		drawerGap,
		drawerPadding,
		submenuModel,
		ariaLabel,
		backgroundImage,
		backgroundImageDecorative,
		backgroundSize,
		backgroundPosition,
		backgroundRepeat,
		backgroundAttachment,
	} = attributes;

	// Desktop-tier anchor drives BOTH the editor preview shell shape and the
	// "Automatic" animation hint below — the same resolution render.php's
	// sgs_resolve_tier() performs server-side, kept in sync here so what an
	// operator sees while editing matches what ships.
	const anchorDesktop = anchor?.desktop || 'full-screen';
	const isCompact = anchorDesktop === 'trigger' || anchorDesktop === 'centred';
	const [ palette ] = useSettings( 'color.palette' );

	// Editor-only preview styling (reflects the same attrs render.php reads;
	// inline style here is editor canvas only — the no-inline contract governs
	// the FRONTEND render.php output, not the editor). Fix 4 (multi-rater
	// pre-commit review): NEVER set element `opacity` — that would fade the
	// InnerBlocks content too, unlike render.php's color-mix() which only
	// affects the panel's own fill. Mirror render.php's color-mix() approach
	// instead so the preview matches what ships; guard for an empty drawerBg
	// (resolveColourToken() already returns undefined for '') so a
	// color-mix() string is never built around an undefined colour.
	// drawerBg's DesignTokenPicker is `linked`, but linked still stores raw
	// hex for a custom colour pick (only a palette-swatch pick stores the
	// slug) -- colourVar() (slug-only) was wrong for that half of its own
	// contract; resolveColourToken() handles both.
	const compactWidthFallback =
		anchorDesktop === 'centred' ? '480px' : '360px';

	// Editor-only preview state. Deliberately component state and NOT a block
	// attribute: it must never serialise into saved content. Deliberately NOT
	// derived from isSelected either — core/navigation avoids that for its
	// overlay so the canvas does not reflow as the operator moves between blocks.
	const [ previewOpen, setPreviewOpen ] = useState( false );
	const shellStyle = {
		backgroundColor:
			surfaceOpacity < 1 && drawerBg
				? `color-mix(in srgb, ${ resolveColourToken( drawerBg, palette ) } ${ Math.round( surfaceOpacity * 100 ) }%, transparent)`
				: resolveColourToken( drawerBg, palette ),
		backdropFilter: surfaceBlur ? `blur( ${ surfaceBlur } )` : undefined,
		maxWidth: isCompact ? panelSize?.desktop || compactWidthFallback : undefined,
		marginInline: isCompact ? 'auto' : undefined,
		// Editor-only preview of the background image (render.php paints the same
		// picture onto a `.{uid}::before` layer, never the root itself — see that
		// file's comment). Layered UNDER the shellStyle backgroundColor above via
		// backgroundBlendMode so a translucent panel colour still shows through,
		// matching the frontend's colour-then-image paint order.
		backgroundImage: backgroundImage?.url ? `url(${ backgroundImage.url })` : undefined,
		backgroundSize: backgroundImage?.url ? backgroundSize : undefined,
		backgroundPosition: backgroundImage?.url ? backgroundPosition : undefined,
		backgroundRepeat: backgroundImage?.url ? backgroundRepeat : undefined,
		backgroundAttachment: backgroundImage?.url && backgroundAttachment === 'fixed' ? 'fixed' : undefined,
	};
	const bodyStyle = {
		alignItems: ALIGN_ITEMS[ drawerAlign ] || 'flex-start',
		gap: drawerGap?.desktop || undefined,
		padding: paddingFromBox( drawerPadding?.desktop ),
	};

	// Spec 35 item 18 — mirrors render.php's aria-describedby logic so the
	// editor canvas reflects the same accessible-description decision the
	// frontend makes (canvas/frontend parity, check-simple-surface-cap CHECK A).
	const bgImageA11yProps =
		backgroundImage?.url && ! ( backgroundImageDecorative ?? true ) && backgroundImage.alt
			? { 'aria-describedby': `${ drawerRef || 'sgs-nav-drawer' }-bg-note` }
			: {};

	const blockProps = useBlockProps( {
		// sgs-nav-drawer--close-{style} mirrors render.php:456 -- without it,
		// the text-swap/burger-morph CSS (style.css:314-345, scoped under that
		// modifier class) never applies, and the canvas always shows the
		// separate-x icon regardless of the closeStyle control.
		className: `sgs-nav-drawer sgs-nav-drawer__editor sgs-nav-drawer--close-${ closeStyle || 'separate-x' }${ previewOpen ? '' : ' sgs-nav-drawer__editor--collapsed' }`,
		style: shellStyle,
		...bgImageA11yProps,
	} );

	const innerBlocksProps = useInnerBlocksProps(
		{ className: 'sgs-nav-drawer__body', style: bodyStyle },
		{
			template: TEMPLATE,
			templateLock: false,
		}
	);

	return (
		<>
			{ /* D618/D609 — grouped, SGS-owned colour panel, rendered FIRST so it
			   sits at the top of the inspector (Styles tab). Replaces the two
			   scattered DesignTokenPicker rows that used to live in "Drawer
			   container" (Background) and "Close button" (Close icon colour)
			   below. Neither attr has a hover counterpart, so each is a
			   single-state row. */ }
			<SgsColourPanel
				rows={ [
					fillRow( {
						key: 'drawerBg',
						label: __( 'Drawer background', 'sgs-blocks' ),
						attrs: {
							base: 'drawerBg',
							gradient: 'drawerBgGradient',
						},
						attributes,
						setAttributes,
					} ),
					textRow( {
						key: 'drawerTextColour',
						label: __( 'Drawer text colour', 'sgs-blocks' ),
						attrs: {
							base: 'drawerTextColour',
							gradient: 'drawerTextColourGradient',
						},
						attributes,
						setAttributes,
					} ),
					textRow( {
						key: 'toggleCloseColour',
						label: __( 'Close icon colour', 'sgs-blocks' ),
						attrs: {
							base: 'toggleCloseColour',
							hover: 'toggleCloseColourHover',
							gradient: 'toggleCloseColourGradient',
						},
						attributes,
						setAttributes,
					} ),
				] }
			/>
			{ /* ── Settings tab ─────────────────────────────────────────── */ }
			<InspectorControls>
				{ /* Preview drawer open — editor-only state (never serialised), stays
				   outside ToolsPanel since it doesn't reset with the block's saved attrs. */ }
				<PanelBody title={ __( 'Drawer', 'sgs-blocks' ) }>
					<ToggleControl
						label={ __( 'Preview drawer open', 'sgs-blocks' ) }
						help={ __( 'Expands the drawer in the editor so you can edit its contents. Affects this editing session only — it is not saved and does not change the site.', 'sgs-blocks' ) }
						checked={ previewOpen }
						onChange={ setPreviewOpen }
						__nextHasNoMarginBottom
					/>
				</PanelBody>

				{ /* S7 pilot (2026-09-02, uniformity sweep): converted from a plain PanelBody
				   to a ToolsPanel — ariaLabel, drawerRef, and anchor (panel position) are
				   core block settings and stay always-visible (isShownByDefault); panelSize,
				   animateFrom, closeStyle, and submenuModel are genuinely optional
				   style/behaviour embellishments and are hideable/resettable per WP's native
				   ToolsPanel pattern. */ }
				<ToolsPanel
					label={ __( 'Drawer Settings', 'sgs-blocks' ) }
					resetAll={ () =>
						setAttributes( {
							ariaLabel: '',
							drawerRef: 'sgs-nav-drawer',
							anchor: {},
							panelSize: {},
							animateFrom: 'auto',
							closeStyle: 'separate-x',
							submenuModel: 'accordion',
						} )
					}
				>
					{ /* The dialog's accessible name. A site may run MORE THAN ONE drawer
					   (that is what Drawer ID is for), and two dialogs both announced as
					   "Navigation menu" cannot be told apart by a screen reader. */ }
					<ToolsPanelItem
						label={ __( 'Accessible name', 'sgs-blocks' ) }
						hasValue={ () => !! ariaLabel }
						onDeselect={ () => setAttributes( { ariaLabel: '' } ) }
						isShownByDefault
					>
						<TextControl
							label={ __( 'Accessible name', 'sgs-blocks' ) }
							help={ __( 'How screen readers announce this drawer. Leave blank for “Navigation menu”; give each drawer its own name when a site has more than one.', 'sgs-blocks' ) }
							value={ ariaLabel }
							onChange={ ( value ) => setAttributes( { ariaLabel: value } ) }
							__nextHasNoMarginBottom
							__next40pxDefaultSize
						/>
					</ToolsPanelItem>

					<ToolsPanelItem
						label={ __( 'Drawer ID', 'sgs-blocks' ) }
						hasValue={ () => ( drawerRef || 'sgs-nav-drawer' ) !== 'sgs-nav-drawer' }
						onDeselect={ () => setAttributes( { drawerRef: 'sgs-nav-drawer' } ) }
						isShownByDefault
					>
						<TextControl
							label={ __( 'Drawer ID', 'sgs-blocks' ) }
							help={ __(
								'The ID the burger opens (its “Drawer ref”). Leave as the default for a single drawer; give each drawer a unique ID when a site has more than one.',
								'sgs-blocks'
							) }
							value={ drawerRef || '' }
							onChange={ ( value ) => setAttributes( { drawerRef: value } ) }
							__nextHasNoMarginBottom
							__next40pxDefaultSize
						/>
					</ToolsPanelItem>

					<ToolsPanelItem
						label={ __( 'Panel position', 'sgs-blocks' ) }
						hasValue={ () => !! anchor && Object.keys( anchor ).length > 0 }
						onDeselect={ () => setAttributes( { anchor: {} } ) }
						isShownByDefault
					>
						<ResponsiveControl label={ __( 'Panel position', 'sgs-blocks' ) }>
							{ ( breakpoint ) => (
								<ToggleGroupControl
									hideLabelFromVision
									label={ __( 'Panel position', 'sgs-blocks' ) }
									help={ __(
										'Full screen is the default everywhere. Header, corner and centred are desktop-style variants — set a different position per device, e.g. a corner panel on desktop that becomes full screen on mobile.',
										'sgs-blocks'
									) }
									value={ anchor?.[ breakpoint ] || 'full-screen' }
									onChange={ ( value ) =>
										setAttributes( {
											anchor: { ...anchor, [ breakpoint ]: value || 'full-screen' },
										} )
									}
									isBlock
									__nextHasNoMarginBottom
									__next40pxDefaultSize
								>
									<ToggleGroupControlOption value="full-screen" label={ __( 'Full screen', 'sgs-blocks' ) } />
									<ToggleGroupControlOption value="header" label={ __( 'Below header', 'sgs-blocks' ) } />
									<ToggleGroupControlOption value="trigger" label={ __( 'Corner panel', 'sgs-blocks' ) } />
									<ToggleGroupControlOption value="centred" label={ __( 'Centred card', 'sgs-blocks' ) } />
								</ToggleGroupControl>
							) }
						</ResponsiveControl>
					</ToolsPanelItem>

					{ ( anchor?.desktop === 'trigger' || anchor?.desktop === 'centred' ||
						anchor?.tablet === 'trigger' || anchor?.tablet === 'centred' ||
						anchor?.mobile === 'trigger' || anchor?.mobile === 'centred' ) && (
						<ToolsPanelItem
							label={ __( 'Panel size', 'sgs-blocks' ) }
							hasValue={ () => !! panelSize && Object.keys( panelSize ).length > 0 }
							onDeselect={ () => setAttributes( { panelSize: {} } ) }
						>
							<ResponsiveControl label={ __( 'Panel size', 'sgs-blocks' ) }>
								{ ( breakpoint ) => (
									<SgsLengthControl
										label={ __( 'Panel size', 'sgs-blocks' ) }
										hideLabelFromVision
										help={ __( 'Maximum width of a corner or centred panel at this device.', 'sgs-blocks' ) }
										value={ panelSize?.[ breakpoint ] || '' }
										onChange={ ( value ) =>
											setAttributes( {
												panelSize: { ...panelSize, [ breakpoint ]: value || undefined },
											} )
										}
										presets={ false }
									/>
								) }
							</ResponsiveControl>
						</ToolsPanelItem>
					) }

					<ToolsPanelItem
						label={ __( 'Open animation', 'sgs-blocks' ) }
						hasValue={ () => animateFrom !== 'auto' }
						onDeselect={ () => setAttributes( { animateFrom: 'auto' } ) }
					>
						<SelectControl
							label={ __( 'Open animation', 'sgs-blocks' ) }
							help={ sprintf(
								/* translators: %s: the automatic animation for the current desktop panel position. */
								__(
									'Automatic matches the panel position (currently: %s). Visitors who ask their device to reduce motion never see any movement, whichever you choose.',
									'sgs-blocks'
								),
								ANCHOR_ANIM_LABEL[ anchorDesktop ] || ANCHOR_ANIM_LABEL[ 'full-screen' ]
							) }
							value={ animateFrom }
							options={ [
								{ label: __( 'Automatic', 'sgs-blocks' ), value: 'auto' },
								{ label: __( 'Fade only (no movement)', 'sgs-blocks' ), value: 'fade' },
							] }
							onChange={ ( value ) => setAttributes( { animateFrom: value } ) }
							__nextHasNoMarginBottom
							__next40pxDefaultSize
						/>
					</ToolsPanelItem>

					<ToolsPanelItem
						label={ __( 'Close button style', 'sgs-blocks' ) }
						hasValue={ () => closeStyle !== 'separate-x' }
						onDeselect={ () => setAttributes( { closeStyle: 'separate-x' } ) }
					>
						<ToggleGroupControl
							label={ __( 'Close button style', 'sgs-blocks' ) }
							help={ __(
								'How the always-present close control is drawn. The close button itself can never be deleted.',
								'sgs-blocks'
							) }
							value={ closeStyle }
							onChange={ ( value ) => setAttributes( { closeStyle: value || 'separate-x' } ) }
							isBlock
							__nextHasNoMarginBottom
							__next40pxDefaultSize
						>
							<ToggleGroupControlOption value="separate-x" label={ __( '× icon', 'sgs-blocks' ) } />
							<ToggleGroupControlOption value="text-swap" label={ __( '“Close” text', 'sgs-blocks' ) } />
							<ToggleGroupControlOption value="burger-morph" label={ __( 'Morphed icon', 'sgs-blocks' ) } />
						</ToggleGroupControl>
					</ToolsPanelItem>

					<ToolsPanelItem
						label={ __( 'Submenu behaviour', 'sgs-blocks' ) }
						hasValue={ () => submenuModel !== 'accordion' }
						onDeselect={ () => setAttributes( { submenuModel: 'accordion' } ) }
					>
						<ToggleGroupControl
							label={ __( 'Submenu behaviour', 'sgs-blocks' ) }
							help={ __(
								'How nested menu items expand. Accordion opens items in place; drill-down slides to a sub-panel.',
								'sgs-blocks'
							) }
							value={ submenuModel }
							onChange={ ( value ) => setAttributes( { submenuModel: value || 'accordion' } ) }
							isBlock
							__nextHasNoMarginBottom
							__next40pxDefaultSize
						>
							<ToggleGroupControlOption value="accordion" label={ __( 'Accordion', 'sgs-blocks' ) } />
							<ToggleGroupControlOption value="drill-down" label={ __( 'Drill-down', 'sgs-blocks' ) } />
						</ToggleGroupControl>
					</ToolsPanelItem>
				</ToolsPanel>
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

			{ /* ── Styles tab ──────────────────────────────────────────── */ }
			<InspectorControls group="styles">
				<PanelBody title={ __( 'Drawer container', 'sgs-blocks' ) }>
					{ /* Background moved to the top-level SgsColourPanel (D618/D621).
					   NOTE: that shared control does not expose an alpha/clearable
					   override per row (SgsColourPanel forwards no such props),
					   so the previous "preset-slug-only, no enableAlpha" WCAG
					   guard rail here is superseded by the shared panel's
					   default (enableAlpha=true) — consistent with how every
					   other consumer of SgsColourPanel already behaves. */ }

					{ /* Surface — opacity + blur on the panel itself. No separate scrim:
					     the panel's own fill/blur IS the occlusion (8/8 reference sites
					     skip a dedicated backdrop div). Defaults (opaque, no blur) are
					     unchanged from before this control existed. */ }
					<SgsLengthControl
						label={ __( 'Panel opacity', 'sgs-blocks' ) }
						help={ __( '100 = solid (default). Lower it to let the page show through. Needs a background colour set.', 'sgs-blocks' ) }
						value={ `${ Math.round( ( surfaceOpacity ?? 1 ) * 100 ) }%` }
						onChange={ ( value ) => {
							const num = parseFloat( value );
							setAttributes( {
								surfaceOpacity: Number.isFinite( num ) ? Math.max( 0, Math.min( 100, num ) ) / 100 : 1,
							} );
						} }
						units={ [ { value: '%', label: '%' } ] }
						presets={ false }
					/>
					<SgsLengthControl
						label={ __( 'Background blur', 'sgs-blocks' ) }
						help={ __( 'Blurs whatever sits behind the drawer. Leave empty for none (default).', 'sgs-blocks' ) }
						value={ surfaceBlur || '' }
						onChange={ ( value ) => setAttributes( { surfaceBlur: value || '' } ) }
						units={ [ { value: 'px', label: 'px' } ] }
						presets={ false }
					/>

					{ /* Layout */ }
					<ToggleGroupControl
						label={ __( 'Content alignment', 'sgs-blocks' ) }
						value={ drawerAlign }
						onChange={ ( value ) => setAttributes( { drawerAlign: value || 'left' } ) }
						isBlock
						__nextHasNoMarginBottom
						__next40pxDefaultSize
					>
						<ToggleGroupControlOption value="left" label={ __( 'Left', 'sgs-blocks' ) } />
						<ToggleGroupControlOption value="center" label={ __( 'Centre', 'sgs-blocks' ) } />
						<ToggleGroupControlOption value="right" label={ __( 'Right', 'sgs-blocks' ) } />
					</ToggleGroupControl>

					<ResponsiveControl label={ __( 'Inner element spacing', 'sgs-blocks' ) }>
						{ ( breakpoint ) => (
							<SgsLengthControl
								label={ __( 'Gap', 'sgs-blocks' ) }
								hideLabelFromVision
								value={ drawerGap?.[ breakpoint ] || '' }
								onChange={ ( value ) =>
									setAttributes( {
										drawerGap: { ...drawerGap, [ breakpoint ]: value || undefined },
									} )
								}
								presets={ false }
							/>
						) }
					</ResponsiveControl>

					<ResponsiveBoxControl
						label={ __( 'Popup padding', 'sgs-blocks' ) }
						presets
						values={ {
							base: drawerPadding?.desktop ?? {},
							tablet: drawerPadding?.tablet ?? {},
							mobile: drawerPadding?.mobile ?? {},
						} }
						onChange={ ( tier, next ) => {
							const key = tier === 'base' ? 'desktop' : tier;
							setAttributes( {
								drawerPadding: { ...drawerPadding, [ key ]: next },
							} );
						} }
					/>
				</PanelBody>

				{ /* Its OWN panel rather than folded into "Drawer container": that panel
				   already carries ~10 controls, and inspector-scan rule 03 flags a PanelBody
				   that dense with no ToolsPanel. Separate is also the clearer grouping. */ }
				<PanelBody title={ __( 'Drawer background image', 'sgs-blocks' ) } initialOpen={ false }>
					{ /* Background image — a SCOPED control (not <BackgroundPanel>, which is
					     all-or-nothing and writes 17 attrs including video/SVG/parallax/
					     Ken-burns/overlay-blend, none of which apply to a full-screen dialog).
					     Painted on a `.{uid}::before` media layer by render.php, same
					     pattern as sgs/container's own background image. */ }
					<p className="components-base-control__label" style={ { fontWeight: 600, marginBottom: '4px' } }>
						{ __( 'Background image', 'sgs-blocks' ) }
					</p>
					<MediaUploadCheck>
						<MediaUpload
							onSelect={ ( media ) =>
								setAttributes( { backgroundImage: { id: media.id, url: media.url, alt: media.alt } } )
							}
							allowedTypes={ [ 'image' ] }
							value={ backgroundImage?.id }
							render={ ( { open } ) => (
								<div style={ { marginBottom: '8px' } }>
									{ backgroundImage?.url ? (
										<>
											<img src={ backgroundImage.url } alt="" style={ { maxWidth: '100%', marginBottom: '8px' } } />
											<Button variant="secondary" onClick={ () => setAttributes( { backgroundImage: undefined } ) } isDestructive>
												{ __( 'Remove image', 'sgs-blocks' ) }
											</Button>
										</>
									) : (
										<Button variant="secondary" onClick={ open }>
											{ __( 'Select image', 'sgs-blocks' ) }
										</Button>
									) }
								</div>
							) }
						/>
					</MediaUploadCheck>
					{ backgroundImage?.url && (
						<>
							<SelectControl
								label={ __( 'Size', 'sgs-blocks' ) }
								value={ backgroundSize }
								options={ BG_SIZE_OPTIONS }
								onChange={ ( val ) => setAttributes( { backgroundSize: val } ) }
								__nextHasNoMarginBottom
								__next40pxDefaultSize
							/>
							<SelectControl
								label={ __( 'Position', 'sgs-blocks' ) }
								value={ backgroundPosition }
								options={ BG_POSITION_OPTIONS }
								onChange={ ( val ) => setAttributes( { backgroundPosition: val } ) }
								__nextHasNoMarginBottom
								__next40pxDefaultSize
							/>
							<SelectControl
								label={ __( 'Repeat', 'sgs-blocks' ) }
								value={ backgroundRepeat }
								options={ BG_REPEAT_OPTIONS }
								onChange={ ( val ) => setAttributes( { backgroundRepeat: val } ) }
								__nextHasNoMarginBottom
								__next40pxDefaultSize
							/>
							<SelectControl
								label={ __( 'Attachment', 'sgs-blocks' ) }
								value={ backgroundAttachment }
								options={ BG_ATTACHMENT_OPTIONS }
								onChange={ ( val ) => setAttributes( { backgroundAttachment: val } ) }
								__nextHasNoMarginBottom
								__next40pxDefaultSize
							/>
							{ /* Spec 35 item 18 — see block.json's own comment on
							     backgroundImageDecorative. Default true matches this
							     image's existing behaviour (it paints as a CSS
							     background, never announced to assistive tech). */ }
							<ToggleControl
								label={ __( 'Decorative image', 'sgs-blocks' ) }
								help={ __(
									'On (recommended): purely visual, adds no information. Turn off only if this image genuinely needs a description for screen-reader users.',
									'sgs-blocks'
								) }
								checked={ backgroundImageDecorative ?? true }
								onChange={ ( val ) => setAttributes( { backgroundImageDecorative: val } ) }
								__nextHasNoMarginBottom
							/>
							{ ! ( backgroundImageDecorative ?? true ) && (
								<TextControl
									label={ __( 'Image description', 'sgs-blocks' ) }
									value={ backgroundImage?.alt || '' }
									onChange={ ( val ) =>
										setAttributes( {
											backgroundImage: { ...backgroundImage, alt: val },
										} )
									}
									__nextHasNoMarginBottom
									__next40pxDefaultSize
								/>
							) }
						</>
					) }
				</PanelBody>

				<PanelBody title={ __( 'Close button', 'sgs-blocks' ) } initialOpen={ false }>
					{ /* Close icon colour moved to the top-level SgsColourPanel (D618/D621). */ }
					<p style={ { fontSize: '12px', color: '#757575', margin: '4px 0 0' } }>
						{ __(
							'Leave empty to match the drawer’s text colour automatically. The × is always present — it cannot be deleted.',
							'sgs-blocks'
						) }
					</p>
				</PanelBody>

				<PanelBody title={ __( 'Content', 'sgs-blocks' ) } initialOpen={ false }>
					<p style={ { fontSize: '12px', color: '#757575', margin: 0 } }>
						{ __(
							'Edit the drawer’s menu, logo and call-to-action directly on the canvas. Each is an optional block you can remove or reorder.',
							'sgs-blocks'
						) }
					</p>
				</PanelBody>
			</InspectorControls>

			<div { ...blockProps }>
				{ /* closeStyle preview (2026-08-13) -- mirrors render.php:487-493's
					three real, visually distinct markups. Previously this always
					rendered the × icon regardless of closeStyle, so the "Close
					button style" control had zero editor-canvas effect. */ }
				<span
					className="sgs-nav-drawer__close-preview sgs-nav-drawer__close"
					aria-hidden="true"
					style={ resolveTextColourPreviewStyle( toggleCloseColour, toggleCloseColourGradient, ( v ) => resolveColourToken( v, palette ) ) }
				>
					{ closeStyle === 'text-swap' && (
						<span className="sgs-nav-drawer__close-text">
							{ __( 'Close', 'sgs-blocks' ) }
						</span>
					) }
					{ closeStyle === 'burger-morph' && (
						<span className="sgs-nav-drawer__close-bars">
							<span></span>
							<span></span>
						</span>
					) }
					{ ( ! closeStyle || closeStyle === 'separate-x' ) && (
						<Icon icon={ close } />
					) }
				</span>
				<div { ...innerBlocksProps } />
			</div>
		</>
	);
}
