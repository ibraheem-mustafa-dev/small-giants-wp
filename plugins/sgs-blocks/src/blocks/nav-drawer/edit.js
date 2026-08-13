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
} from '@wordpress/block-editor';
import {
	PanelBody,
	TextControl,
	SelectControl,
	Icon,
} from '@wordpress/components';
import { close } from '@wordpress/icons';
import { DesignTokenPicker, ResponsiveControl, ResponsiveBoxControl, resolveColorToken } from '../../components';
import { ToggleGroupControl, ToggleGroupControlOption, UnitControl } from '../../components/primitives';

/**
 * Content template: menu + (optional) logo + (optional) CTA. templateLock:false.
 *
 * The nav-menu seeded here is a SEPARATE block instance from the one in the
 * header — its own uid, its own scoped styles, its own inspector — so a client
 * can style the drawer's menu completely independently of the bar. That was
 * always true but entirely invisible: the seeded copy rendered with identical
 * defaults, giving no signal it was theirs to change (Bean 2026-07-28).
 *
 * Seeding drawer-appropriate values makes the capability discoverable AND
 * gives a sane vertical starting point (a tighter stacked gap). Colours stay
 * UNSET so the drawer's own background shows through until a client picks
 * one. NOTE: the item-divider seed that briefly lived here was removed the
 * same day it was added — the divider attributes were dropped from
 * sgs/nav-menu entirely (Bean ruling: border/divider work belongs at header
 * level), and WP silently DISCARDS attrs a block.json no longer declares
 * (D338), so leaving them here would have been dead weight that looked
 * meaningful.
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
		drawerAlign,
		drawerGap,
		drawerPadding,
		submenuModel,
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
	// (resolveColorToken() already returns undefined for '') so a
	// color-mix() string is never built around an undefined colour.
	// drawerBg's DesignTokenPicker is `linked`, but linked still stores raw
	// hex for a custom colour pick (only a palette-swatch pick stores the
	// slug) -- colourVar() (slug-only) was wrong for that half of its own
	// contract; resolveColorToken() handles both.
	const compactWidthFallback =
		anchorDesktop === 'centred' ? '480px' : '360px';
	const shellStyle = {
		backgroundColor:
			surfaceOpacity < 1 && drawerBg
				? `color-mix(in srgb, ${ resolveColorToken( drawerBg, palette ) } ${ Math.round( surfaceOpacity * 100 ) }%, transparent)`
				: resolveColorToken( drawerBg, palette ),
		backdropFilter: surfaceBlur ? `blur( ${ surfaceBlur } )` : undefined,
		maxWidth: isCompact ? panelSize?.desktop || compactWidthFallback : undefined,
		marginInline: isCompact ? 'auto' : undefined,
	};
	const bodyStyle = {
		alignItems: ALIGN_ITEMS[ drawerAlign ] || 'flex-start',
		gap: drawerGap?.desktop || undefined,
		padding: paddingFromBox( drawerPadding?.desktop ),
	};

	const blockProps = useBlockProps( {
		className: 'sgs-nav-drawer sgs-nav-drawer__editor',
		style: shellStyle,
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
			{ /* ── Settings tab ─────────────────────────────────────────── */ }
			<InspectorControls>
				<PanelBody title={ __( 'Drawer', 'sgs-blocks' ) }>
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

					{ ( anchor?.desktop === 'trigger' || anchor?.desktop === 'centred' ||
						anchor?.tablet === 'trigger' || anchor?.tablet === 'centred' ||
						anchor?.mobile === 'trigger' || anchor?.mobile === 'centred' ) && (
						<ResponsiveControl label={ __( 'Panel size', 'sgs-blocks' ) }>
							{ ( breakpoint ) => (
								<UnitControl
									label={ __( 'Panel size', 'sgs-blocks' ) }
									hideLabelFromVision
									help={ __( 'Maximum width of a corner or centred panel at this device.', 'sgs-blocks' ) }
									value={ panelSize?.[ breakpoint ] || '' }
									onChange={ ( value ) =>
										setAttributes( {
											panelSize: { ...panelSize, [ breakpoint ]: value || undefined },
										} )
									}
									__next40pxDefaultSize
									__nextHasNoMarginBottom
								/>
							) }
						</ResponsiveControl>
					) }

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
				</PanelBody>
			</InspectorControls>

			{ /* ── Styles tab ──────────────────────────────────────────── */ }
			<InspectorControls group="styles">
				<PanelBody title={ __( 'Drawer container', 'sgs-blocks' ) }>
					{ /* Fill. Deliberately preset-slug-only (no enableAlpha) — the
					     WCAG auto-contrast foreground (sgs_resolve_palette_hex) needs
					     a resolvable slug; a custom/alpha value would break the
					     zero-config contrast pairing. */ }
					<DesignTokenPicker
						label={ __( 'Background', 'sgs-blocks' ) }
						value={ drawerBg }
						onChange={ ( value ) => setAttributes( { drawerBg: value || '' } ) }
						linked
						clearable
					/>

					{ /* Surface — opacity + blur on the panel itself. No separate scrim:
					     the panel's own fill/blur IS the occlusion (8/8 reference sites
					     skip a dedicated backdrop div). Defaults (opaque, no blur) are
					     unchanged from before this control existed. */ }
					<UnitControl
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
						__next40pxDefaultSize
						__nextHasNoMarginBottom
					/>
					<UnitControl
						label={ __( 'Background blur', 'sgs-blocks' ) }
						help={ __( 'Blurs whatever sits behind the drawer. Leave empty for none (default).', 'sgs-blocks' ) }
						value={ surfaceBlur || '' }
						onChange={ ( value ) => setAttributes( { surfaceBlur: value || '' } ) }
						units={ [ { value: 'px', label: 'px' } ] }
						__next40pxDefaultSize
						__nextHasNoMarginBottom
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
							<UnitControl
								label={ __( 'Gap', 'sgs-blocks' ) }
								hideLabelFromVision
								value={ drawerGap?.[ breakpoint ] || '' }
								onChange={ ( value ) =>
									setAttributes( {
										drawerGap: { ...drawerGap, [ breakpoint ]: value || undefined },
									} )
								}
								__next40pxDefaultSize
								__nextHasNoMarginBottom
							/>
						) }
					</ResponsiveControl>

					<ResponsiveBoxControl
						label={ __( 'Popup padding', 'sgs-blocks' ) }
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

				<PanelBody title={ __( 'Close button', 'sgs-blocks' ) } initialOpen={ false }>
					<DesignTokenPicker
						label={ __( 'Close icon colour', 'sgs-blocks' ) }
						value={ toggleCloseColour }
						onChange={ ( value ) => setAttributes( { toggleCloseColour: value || '' } ) }
						linked
						enableAlpha
						clearable
					/>
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
				<span
					className="sgs-nav-drawer__close-preview"
					aria-hidden="true"
					style={ { color: toggleCloseColour ? resolveColorToken( toggleCloseColour, palette ) : undefined } }
				>
					<Icon icon={ close } />
				</span>
				<div { ...innerBlocksProps } />
			</div>
		</>
	);
}
