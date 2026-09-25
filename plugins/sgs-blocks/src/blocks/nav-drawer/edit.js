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

import { __ } from '@wordpress/i18n';
import {
	useBlockProps,
	useInnerBlocksProps,
	InspectorControls,
	useSettings,
	MediaUpload,
	MediaUploadCheck,
	store as blockEditorStore,
} from '@wordpress/block-editor';
import {
	PanelBody,
	TextControl,
	SelectControl,
	ToggleControl,
	RangeControl,
	Button,
} from '@wordpress/components';
import { useState, useEffect } from '@wordpress/element';
import MotionPanel from './MotionPanel';
import { useSelect } from '@wordpress/data';

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
import { ResponsiveControl, ResponsiveOverride, ResponsiveBoxControl, resolveColourToken, SgsColourPanel, fillRow, textRow, SgsLengthControl,
	SgsBorderControl, IconPicker, IconPreview, TypographyControls, StarterLookPresetControl,
	ShadowControl, SurfaceGroundControls, ScrimControls, scrimColourRow,
} from '../../components';
import { ToggleGroupControl, ToggleGroupControlOption, ToolsPanel, ToolsPanelItem } from '../../components/primitives';
import { resolveTextColourPreviewStyle, typographyPreviewStyle, resolveShadowPreviewComposed, surfaceToneClass, resolveTier, flattenPresetSetting } from '../../utils';

/**
 * Content template: menu + (optional) logo + (optional) CTA. templateLock:false.
 * The nav-drawer-menu seeded here is a SEPARATE block instance from the
 * sgs/nav-bar-menu in the header — its own uid, its own scoped styles, its own
 * inspector — so a client can style the drawer's menu completely independently
 * of the bar.
 *
 * Seeding drawer-appropriate values makes the capability discoverable AND
 * gives a sane vertical starting point (a tighter stacked gap). Colours stay
 * UNSET so the drawer's own background shows through until a client picks
 * one.
 */
const TEMPLATE = [
	[ 'sgs/nav-drawer-menu', { gap: '4px' } ],
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

/**
 * Whether the drawer's `anchor` tier object uses any of the given values at any tier.
 *
 * @param {Object}   anchor The `anchor` attribute.
 * @param {string[]} values Anchor values to look for.
 * @return {boolean} True when some tier is set to one of them.
 */
function anchorUses( anchor, values ) {
	return [ 'desktop', 'tablet', 'mobile' ].some( ( tier ) => values.includes( anchor?.[ tier ] ) );
}

export default function Edit( { attributes, setAttributes, clientId } ) {
	const {
		drawerRef,
		anchor,
		panelSize,
		surfaceOpacity,
		surfaceBlur,
		surfaceSaturate,
		shadow,
		shadowColour,
		closeStyle,
		closePlacement,
		closeOffset,
		closeOnScrollDistance,
		closeRadius,
		accordionExclusive,
		closeLabel,
		closeIcon,
		closeSize,
		modality,
		drawerBg,
		drawerBgGradient,
		drawerTextColour,
		drawerTextColourGradient,
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
		anchorOffset,
	} = attributes;

	// Desktop-tier anchor drives BOTH the editor preview shell shape and the
	// "Automatic" animation hint below — the same resolution render.php's
	// sgs_resolve_tier() performs server-side, kept in sync here so what an
	// operator sees while editing matches what ships.
	const anchorDesktop = anchor?.desktop || 'full-screen';
	const isCompact = [ 'trigger', 'centred', 'container', 'side-start', 'side-end' ].includes( anchorDesktop );
	const [ palette ] = useSettings( 'color.palette' );
	// The theme's gradient presets, normalised by flattenPresetSetting() —
	// useSettings() returns a flat array or an origin-keyed object depending on
	// the feature — so surfaceToneClass() can resolve drawerBgGradient's preset
	// SLUG to its CSS stops.
	const [ rawGradientPresets ] = useSettings( 'color.gradients' );
	const gradientPresets = flattenPresetSetting( rawGradientPresets );

	// ── Wave 3C U-9/U-11 (§4.9) — the canvas × preview follows the ACTIVE
	// EDITOR DEVICE's closeStyle, so switching the global device toggle shows
	// what that tier actually ships. Same source ResponsiveControl.js reads
	// (WP core's getDeviceType()) — kept local rather than exported from that
	// file, since it is a one-line map used in exactly one place here.
	const nativeDeviceType = useSelect( ( select ) => {
		const ed = select( 'core/editor' );
		return ed && typeof ed.getDeviceType === 'function'
			? ed.getDeviceType()
			: null;
	}, [] );
	const activeDeviceTier =
		{ Desktop: 'desktop', Tablet: 'tablet', Mobile: 'mobile' }[
			nativeDeviceType
		] || 'desktop';

	/**
	 * The tier cascade for a `{desktop,tablet,mobile}` object: desktop is
	 * concrete, tablet inherits desktop, mobile inherits tablet — mirrors
	 * render.php's sgs_resolve_tier() (a client-side re-implementation of the
	 * SAME cascade semantics, not a call into PHP).
	 *
	 * ⛔ This used to be a locally-defined `resolveCloseTier()` — a byte-for-byte
	 * duplicate of the shared `resolveTier()` cascade (`src/utils/responsive.js`,
	 * also the resolver `<ResponsiveOverride>` itself uses). Spec 35 §12 audit
	 * item 3 (2026-09-24): call the shared resolver instead of maintaining a
	 * second copy of the same cascade. `resolveTier()` returns `{ value,
	 * inherited }`; every call site here only needs `.value`.
	 *
	 * @param {Object|undefined} tierObj  The tier object.
	 * @param {string}           tier     'desktop' | 'tablet' | 'mobile'.
	 * @param {*}                fallback Value when every tier is unset.
	 * @return {*} The resolved value.
	 */
	const resolveCloseTier = ( tierObj, tier, fallback ) =>
		resolveTier( tierObj, tier, fallback ).value;

	const closeStyleActive = resolveCloseTier( closeStyle, activeDeviceTier, 'separate-x' );
	const closeStyleAnyTierIs = ( values ) =>
		[ 'desktop', 'tablet', 'mobile' ].some( ( tier ) =>
			values.includes( resolveCloseTier( closeStyle, tier, 'separate-x' ) )
		);
	// §4.10 — closeRadius editor-canvas mirror, keyed to the ACTIVE EDITOR
	// DEVICE like every other closeStyle-family preview above. Default '4px'
	// matches style.css::.sgs-nav-drawer__close's un-migrated value (today's
	// behaviour when the tier object is empty).
	const closeRadiusActive = resolveCloseTier( closeRadius, activeDeviceTier, '4px' );
	// §4.9/§4.10 canvas-mirror additions (Spec 35 audit SHOULD 10) —
	// closePlacement and closeOffset, keyed the same way as
	// closeStyle/closeRadius above. `resolveCloseTier`'s cascade also applies
	// to the {x,y} offset object itself (a tier with no own offset inherits
	// the tier above's), mirroring render.php's sgs_resolve_tier() call for
	// closeOffset (not just closePlacement).
	const closePlacementActive = resolveCloseTier( closePlacement, activeDeviceTier, 'top-row-end' );
	const closeOffsetActive = resolveCloseTier( closeOffset, activeDeviceTier, {} ) || {};

	// ── Auto-rename on detected collision. ──
	//
	// block.json's shared literal default 'sgs-nav-drawer' is deliberate and
	// stays untouched. A SECOND, genuinely independent drawer resolving to the
	// same id as another drawer would make a burger open the wrong dialog, so
	// the later one is renamed silently rather than warning and blocking.
	//
	// Two collision sources, checked in the same effect:
	//  (a) within-post — another sgs/nav-drawer block in THIS post already
	//      resolves to the same effective ref (mirrors useDrawerNotice.js's
	//      getBlocksByName/getBlockIndex pattern). Only the LATER block (higher
	//      index) is renamed, so the original zero-config drawer a header
	//      pattern seeds is never rewritten out from under an operator.
	//  (b) cross-post — window.sgsBlocksData.activeDrawer (published by
	//      Sgs_Drawer_Render::editor_data()) names the
	//      site's real Active header drawer by post id + ref. If this block's
	//      ref matches but its OWN post is a different post, this is a second,
	//      different drawer colliding with the real one — not the Active
	//      drawer editing itself.
	const effectiveDrawerRef = ( drawerRef || '' ).trim() || 'sgs-nav-drawer';
	const collisionState = useSelect(
		( select ) => {
			const be = select( blockEditorStore );
			const drawerIds = be.getBlocksByName
				? be.getBlocksByName( 'sgs/nav-drawer' )
				: [];
			const withinPostCollision = drawerIds.some( ( id ) => {
				if ( id === clientId ) {
					return false;
				}
				const otherAttrs = be.getBlockAttributes( id ) || {};
				const otherRef =
					( otherAttrs.drawerRef || '' ).trim() || 'sgs-nav-drawer';
				if ( otherRef !== effectiveDrawerRef ) {
					return false;
				}
				return be.getBlockIndex( id ) < be.getBlockIndex( clientId );
			} );

			const editor = select( 'core/editor' );
			return {
				withinPostCollision,
				postId: editor && editor.getCurrentPostId ? editor.getCurrentPostId() : null,
			};
		},
		[ clientId, effectiveDrawerRef ]
	);

	useEffect( () => {
		if ( collisionState.withinPostCollision ) {
			setAttributes( {
				drawerRef: `sgs-nav-drawer-${ clientId.substr( 0, 8 ) }`,
			} );
			return;
		}

		const active =
			typeof window !== 'undefined' && window.sgsBlocksData
				? window.sgsBlocksData.activeDrawer
				: null;
		if (
			active &&
			active.ref === effectiveDrawerRef &&
			collisionState.postId &&
			active.id !== collisionState.postId
		) {
			setAttributes( {
				drawerRef: `sgs-nav-drawer-${ clientId.substr( 0, 8 ) }`,
			} );
		}
	}, [
		collisionState.withinPostCollision,
		collisionState.postId,
		effectiveDrawerRef,
		clientId,
		setAttributes,
	] );

	// Editor-only preview styling (reflects the same attrs render.php reads;
	// inline style here is editor canvas only — the no-inline contract governs
	// the FRONTEND render.php output, not the editor). Fix 4 (multi-rater
	// NEVER set element `opacity` — that would fade the
	// InnerBlocks content too, unlike render.php's color-mix() which only
	// affects the panel's own fill. Mirror render.php's color-mix() approach
	// instead so the preview matches what ships; guard for an empty drawerBg
	// (resolveColourToken() already returns undefined for '') so a
	// color-mix() string is never built around an undefined colour.
	// drawerBg's DesignTokenPicker is `linked`, but linked still stores raw
	// hex for a custom colour pick (only a palette-swatch pick stores the
	// slug) -- colourVar() (slug-only) cannot handle that half;
	// resolveColourToken() handles both.
	const compactWidthFallback = {
		centred: '480px',
		'side-start': '400px',
		'side-end': '400px',
		container: '100%',
	}[ anchorDesktop ] || '360px';

	// Editor-only preview state. Deliberately component state and NOT a block
	// attribute: it must never serialise into saved content. Deliberately NOT
	// derived from isSelected either — core/navigation avoids that for its
	// overlay so the canvas does not reflow as the operator moves between blocks.
	const [ previewOpen, setPreviewOpen ] = useState( false );
	const shellStyle = {
		backgroundColor:
			typeof surfaceOpacity === 'number' && surfaceOpacity < 1 && drawerBg
				? `color-mix(in srgb, ${ resolveColourToken( drawerBg, palette ) } ${ Math.round( Math.max( 0, surfaceOpacity ) * 100 ) }%, transparent)`
				: resolveColourToken( drawerBg, palette ),
		// Same order as render.php's sgs_surface_backdrop_decls(): saturate, then blur.
		backdropFilter: ( () => {
			const parts = [];
			if ( typeof surfaceSaturate === 'number' ) {
				parts.push( `saturate(${ surfaceSaturate }%)` );
			}
			if ( surfaceBlur ) {
				parts.push( `blur(${ surfaceBlur })` );
			}
			return parts.length ? parts.join( ' ' ) : undefined;
		} )(),
		boxShadow: shadow
			? resolveShadowPreviewComposed( shadow, shadowColour )
			: undefined,
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
		// CHECK A finding: drawerTextColour/drawerTextColourGradient are written
		// by the "Drawer container" panel's GradientCapableColourControl below
		// and consumed by render.php on `.sgs-nav-drawer__body` (the SAME
		// element `innerBlocksProps` renders this style onto — see
		// `$body_sel`/`sgs_text_colour_decl( $drawer_text_effective )`), but
		// nothing applied them to the canvas. Same resolver already used for
		// the close-icon preview two lines below.
		...resolveTextColourPreviewStyle( drawerTextColour, drawerTextColourGradient, ( v ) => resolveColourToken( v, palette ) ),
	};

	// Spec 35 item 18 — mirrors render.php's aria-describedby logic so the
	// editor canvas reflects the same accessible-description decision the
	// frontend makes (canvas/frontend parity, check-simple-surface-cap CHECK A).
	const bgImageA11yProps =
		backgroundImage?.url && ! ( backgroundImageDecorative ?? true ) && backgroundImage.alt
			? { 'aria-describedby': `${ drawerRef || 'sgs-nav-drawer' }-bg-note` }
			: {};

	// Close-LABEL typography canvas mirror. The close-text span
	// below is hand-authored JSX, not a render.php-rendered node (this block
	// hosts editable InnerBlocks so cannot use <ServerSideRender> for its whole
	// canvas — see the module docstring), so render.php's scoped closeFontSize/
	// closeFontFamily/closeFontWeight/closeTextTransform/closeLetterSpacing
	// <style> never reaches it; the canvas showed the browser default
	// regardless of what the Typography panel had set.
	//
	// closeTextTransform's untouched DEFAULT differs by closeStyle
	// (text-swap: uppercase; icon-and-text: none) — resolved here exactly as
	// render.php resolves it, so an untouched instance's canvas
	// matches the untouched instance's frontend, not just an edited one.
	// ⚠ Keyed to the DESKTOP tier deliberately (not closeStyleActive): the
	// close-LABEL typography stays a desktop-scoped resolution in render.php
	// too (a documented, deliberate simplification — §4.1 is explicit about
	// per-tier WIDTH/PADDING/TEXT-TRANSFORM sizing, not the full typography
	// set), so matching render.php exactly here is the honest canvas mirror.
	const closeStyleDesktop = resolveCloseTier( closeStyle, 'desktop', 'separate-x' );
	const closeTypographyAttrs = attributes.closeTextTransform
		? attributes
		: {
				...attributes,
				closeTextTransform: 'text-swap' === closeStyleDesktop ? 'uppercase' : '',
		  };
	const closeLabelStyle = typographyPreviewStyle( closeTypographyAttrs, 'close' );

	// D3/D6 (`.claude/reports/2026-09-23-shadow-tone-design.md`) — the SAME
	// one-fill-layer tone the real render.php marks itself with
	// (sgs_surface_tone_class(), fed the resolved drawerBg at surfaceOpacity —
	// unset means fully opaque), so a shadow on a descendant (a menu item, a
	// CTA button) follows this drawer's own tone in the editor canvas too.
	// drawerBgGradient is its own top-down layer, ahead of the flat colour — a
	// gradient always wins over the flat colour, mirroring
	// backgroundPaintPreview()'s precedence rule.
	const toneLayers = [];
	if ( drawerBgGradient ) {
		toneLayers.push( {
			gradient: drawerBgGradient,
			opacity: 'number' === typeof surfaceOpacity ? surfaceOpacity : 1,
		} );
	}
	toneLayers.push( {
		colour: drawerBg || '',
		opacity: 'number' === typeof surfaceOpacity ? surfaceOpacity : 1,
	} );
	const toneClass = surfaceToneClass( toneLayers, palette, gradientPresets );

	// `trigger` renders identically to `separate-x` in the canvas too (§4.2 —
	// the predicate that hides it entirely is a frontend-only runtime check).
	const closeStyleRenderActive =
		'trigger' === closeStyleActive ? 'separate-x' : closeStyleActive;

	// Spec 35 audit SHOULD 10 — closePlacement/closeOffset canvas mirror.
	// Mirrors render.php's `$sgs_nd_placement_decls_for()` (this file's own
	// hand-authored preview span cannot reach that scoped <style>, same
	// reasoning as the closeSize/closeRadius mirrors above). `same-slot`'s
	// real position is measured at runtime by store.js on the frontend — the
	// editor has no such measurement, so it shows the SAME fallback centre
	// render.php's var() falls back to, derived from the resolved close size
	// (matches SHOULD-2's render.php fix, not the old hardcoded 34px).
	const closeSizeNumPreview = parseFloat( closeSize ) || 44;
	const sameSlotFallbackCentre = 12 + closeSizeNumPreview / 2;
	const closePlacementPreviewStyle = ( () => {
		const x = closeOffsetActive?.x ?? 0;
		const y = closeOffsetActive?.y ?? 0;
		if ( 'same-slot' === closePlacementActive ) {
			return {
				top: `${ sameSlotFallbackCentre }px`,
				left: `calc(100% - ${ sameSlotFallbackCentre }px)`,
				right: 'auto',
				insetInlineEnd: 'auto',
				transform: `translate(calc(-50% + ${ x }px), calc(-50% + ${ y }px))`,
			};
		}
		if ( 'top-row-start' === closePlacementActive ) {
			return {
				insetInlineEnd: 'auto',
				insetInlineStart: '12px',
				top: '12px',
				transform: `translate(${ x }px, ${ y }px)`,
			};
		}
		// top-row-end (default).
		return {
			transform: `translate(${ x }px, ${ y }px)`,
		};
	} )();

	const blockProps = useBlockProps( {
		// sgs-nav-drawer--close-{style} mirrors render.php's own modifier class --
		// without it, the text-swap/burger-morph CSS (style.css, scoped under that
		// modifier class) never applies. Keyed to the ACTIVE EDITOR DEVICE's
		// resolved style (§4.9) so switching the device toggle shows what that
		// tier actually ships, not just the desktop value.
		className: `sgs-nav-drawer sgs-nav-drawer__editor sgs-nav-drawer--close-${ closeStyleRenderActive }${ previewOpen ? '' : ' sgs-nav-drawer__editor--collapsed' }${ toneClass ? ` ${ toneClass }` : '' }`,
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
			{ /* Grouped, SGS-owned colour panel, rendered FIRST so it sits at the
			   top of the inspector (Styles tab). Holds every drawer colour
			   (Background, Text, Close icon colour) so none is scattered across
			   the panels below. */ }
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
					/* Drawer text colour — alongside its sibling drawerBg/
					   toggleCloseColour rows; this block groups all its colours in the
					   top-level shared panel, per the comment above. */
					textRow( {
						key: 'drawerText',
						label: __( 'Drawer text colour', 'sgs-blocks' ),
						attrs: {
							base: 'drawerTextColour',
							hover: 'drawerTextColourHover',
							gradient: 'drawerTextColourGradient',
							hoverGradient: 'drawerTextColourHoverGradient',
						},
						attributes,
						setAttributes,
					} ),
					fillRow( {
						key: 'curtainColour',
						label: __( 'Curtain animation colour', 'sgs-blocks' ),
						attrs: { base: 'curtainColour', gradient: 'curtainColourGradient' },
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
							// toggleCloseColourHoverGradient -- the Hover gradient sibling of
							// toggleCloseColourGradient; wired unconditionally since no
							// smart-contrast swap applies here (unlike the bar's
							// itemColourHover).
							hoverGradient: 'toggleCloseColourHoverGradient',
						},
						attributes,
						setAttributes,
					} ),
					/* The scrim behind the open drawer (Wave 3C U-2, family M-14) —
					   shared row descriptor, includes/helpers-scrim.php is its render twin. */
					scrimColourRow( { attributes, setAttributes } ),
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

				{ /* A ToolsPanel rather than a plain PanelBody — ariaLabel, drawerRef, and anchor (panel position) are
				   core block settings and stay always-visible (isShownByDefault); panelSize,
				   closeStyle, and submenuModel are genuinely optional
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
							submenuModel: 'accordion',
							modality: 'modal',
							closeOnScrollDistance: 0,
							accordionExclusive: true,
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

					{ /* Spec 35 §12 audit item 3 (2026-09-24) — `anchor` is a `"type":
					   "object"` tier attr with NO Tablet/Mobile sibling attrs (same
					   storage shape as closeStyle/closePlacement/closeOffset/closeRadius
					   below), so THE PAIRING IS BINDING routes it to `ResponsiveOverride`,
					   not the flat-sibling `ResponsiveControl` it used to mount — that
					   pairing carried no inherit indicator and no per-tier reset. */ }
					<ToolsPanelItem
						label={ __( 'Panel position', 'sgs-blocks' ) }
						hasValue={ () => !! anchor && Object.keys( anchor ).length > 0 }
						onDeselect={ () => setAttributes( { anchor: {} } ) }
						isShownByDefault
					>
						<ResponsiveOverride
							label={ __( 'Panel position', 'sgs-blocks' ) }
							value={ anchor }
							onChange={ ( obj ) => setAttributes( { anchor: obj } ) }
						>
							{ ( { ownValue, effectiveValue, setOwnValue } ) => (
								<SelectControl
									hideLabelFromVision
									label={ __( 'Panel position', 'sgs-blocks' ) }
									help={ __(
										'Full screen is the default everywhere. Set a different position per device, e.g. a side panel on tablet and full screen on mobile.',
										'sgs-blocks'
									) }
									value={ ownValue || effectiveValue || 'full-screen' }
									options={ [
										{ value: 'full-screen', label: __( 'Full screen', 'sgs-blocks' ) },
										{ value: 'header', label: __( 'Below the header', 'sgs-blocks' ) },
										{ value: 'side-start', label: __( 'Side panel from the start edge', 'sgs-blocks' ) },
										{ value: 'side-end', label: __( 'Side panel from the end edge', 'sgs-blocks' ) },
										{ value: 'container', label: __( "Lined up with the header's content", 'sgs-blocks' ) },
										{ value: 'trigger', label: __( 'Corner panel under the menu button', 'sgs-blocks' ) },
										{ value: 'centred', label: __( 'Centred card', 'sgs-blocks' ) },
									] }
									onChange={ ( value ) => setOwnValue( value || undefined ) }
									__nextHasNoMarginBottom
									__next40pxDefaultSize
								/>
							) }
						</ResponsiveOverride>
					</ToolsPanelItem>

					{ anchorUses( anchor, [ 'trigger', 'centred', 'side-start', 'side-end' ] ) && (
						<ToolsPanelItem
							label={ __( 'Panel size', 'sgs-blocks' ) }
							hasValue={ () => !! panelSize && Object.keys( panelSize ).length > 0 }
							onDeselect={ () => setAttributes( { panelSize: {} } ) }
						>
							<ResponsiveOverride
								label={ __( 'Panel size', 'sgs-blocks' ) }
								value={ panelSize }
								onChange={ ( obj ) => setAttributes( { panelSize: obj } ) }
							>
								{ ( { ownValue, effectiveValue, inherited, setOwnValue } ) => (
									<SgsLengthControl
										label={ __( 'Panel size', 'sgs-blocks' ) }
										hideLabelFromVision
										help={ __( 'Maximum width of a side, corner or centred panel at this device.', 'sgs-blocks' ) }
										value={ ownValue || '' }
										placeholder={ inherited ? effectiveValue : '' }
										onChange={ ( value ) => setOwnValue( value || undefined ) }
										presets={ false }
									/>
								) }
							</ResponsiveOverride>
						</ToolsPanelItem>
					) }

					{ anchorUses( anchor, [ 'trigger', 'container' ] ) && (
						<ToolsPanelItem
							label={ __( 'Gap above the panel', 'sgs-blocks' ) }
							hasValue={ () => !! anchorOffset && Object.keys( anchorOffset ).length > 0 }
							onDeselect={ () => setAttributes( { anchorOffset: {} } ) }
						>
							<ResponsiveOverride
								label={ __( 'Gap above the panel', 'sgs-blocks' ) }
								value={ anchorOffset }
								onChange={ ( obj ) => setAttributes( { anchorOffset: obj } ) }
							>
								{ ( { ownValue, effectiveValue, inherited, setOwnValue } ) => (
									<SgsLengthControl
										label={ __( 'Gap above the panel', 'sgs-blocks' ) }
										hideLabelFromVision
										help={ __( 'Space between the panel and what it hangs from: the menu button for a corner panel (default 8px), the header for a panel lined up with its content (default 0).', 'sgs-blocks' ) }
										value={ ownValue || '' }
										placeholder={ inherited ? effectiveValue : '' }
										onChange={ ( value ) => setOwnValue( value || undefined ) }
										presets={ false }
									/>
								) }
							</ResponsiveOverride>
						</ToolsPanelItem>
					) }

					<ToolsPanelItem
						label={ __( 'Header stays live', 'sgs-blocks' ) }
						hasValue={ () => modality === 'non-modal' }
						onDeselect={ () => setAttributes( { modality: 'modal' } ) }
					>
						<ToggleGroupControl
							label={ __( 'Header stays live', 'sgs-blocks' ) }
							help={ __(
								'Modal (default) dims and disables the rest of the page while the drawer is open. Non-modal keeps the header row — including the burger button — visible and usable, matching the pattern most reference sites use.',
								'sgs-blocks'
							) }
							value={ modality || 'modal' }
							onChange={ ( value ) => setAttributes( { modality: value || 'modal' } ) }
							isBlock
							__nextHasNoMarginBottom
							__next40pxDefaultSize
						>
							<ToggleGroupControlOption value="modal" label={ __( 'Modal', 'sgs-blocks' ) } />
							<ToggleGroupControlOption value="non-modal" label={ __( 'Non-modal', 'sgs-blocks' ) } />
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

					{ /* Spec 35 THE PLACEMENT RULE (2026-09-24 audit item 4) — a control
					   that styles NOTHING (no CSS property behind it) takes the pinned-first
					   Settings ToolsPanel, never the `close` element's Styles-tab panel.
					   `accordionExclusive` sits right beside `submenuModel` (its own
					   condition), since it only means anything under the accordion model. */ }
					{ 'accordion' === submenuModel && (
						<ToolsPanelItem
							label={ __( 'Multiple sections open', 'sgs-blocks' ) }
							hasValue={ () => accordionExclusive === false }
							onDeselect={ () => setAttributes( { accordionExclusive: true } ) }
						>
							<ToggleControl
								label={ __( 'Allow multiple sections open at once', 'sgs-blocks' ) }
								help={ __(
									'Off (default): opening one submenu closes any other that was open. On: submenus open independently, so more than one can stay open together.',
									'sgs-blocks'
								) }
								checked={ accordionExclusive === false }
								onChange={ ( value ) => setAttributes( { accordionExclusive: ! value } ) }
								__nextHasNoMarginBottom
							/>
						</ToolsPanelItem>
					) }

					<ToolsPanelItem
						label={ __( 'Close on scroll', 'sgs-blocks' ) }
						hasValue={ () => ( closeOnScrollDistance || 0 ) > 0 }
						onDeselect={ () => setAttributes( { closeOnScrollDistance: 0 } ) }
					>
						<RangeControl
							label={ __( 'Close on scroll', 'sgs-blocks' ) }
							help={ __(
								'Closes the drawer once the visitor scrolls the page this many pixels (mouse or trackpad only — a touch swipe never triggers it, so swiping to read the menu still works). 0 turns this off; the page keeps scrolling normally instead of being locked while the drawer is open.',
								'sgs-blocks'
							) }
							min={ 0 }
							max={ 200 }
							value={ closeOnScrollDistance || 0 }
							onChange={ ( value ) => setAttributes( { closeOnScrollDistance: value ?? 0 } ) }
							__nextHasNoMarginBottom
							__next40pxDefaultSize
						/>
					</ToolsPanelItem>
				</ToolsPanel>

				<MotionPanel
					attributes={ attributes }
					setAttributes={ setAttributes }
					anchorDesktop={ anchorDesktop }
				/>
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

			{ /* FR-37-47 — starter-look preset, same mechanism as
			     sgs/site-header's (site-header/edit.js). This root has no
			     `rowSlot` children — the control's wholesale-InnerBlocks
			     fallback path applies here. */ }
			<InspectorControls group="styles">
				<StarterLookPresetControl
					clientId={ clientId }
					rootBlockName="sgs/nav-drawer"
				/>
			</InspectorControls>

			{ /* ── Styles tab ──────────────────────────────────────────── */ }
			<InspectorControls group="styles">
				<PanelBody title={ __( 'Drawer container', 'sgs-blocks' ) }>
					{ /* Drawer text colour moved to the top-level SgsColourPanel above,
					   alongside Background/Close icon colour. */ }
					{ /* Background lives in the top-level SgsColourPanel.
					   NOTE: that shared control does not expose an alpha/clearable
					   override per row (SgsColourPanel forwards no such props), so
					   it uses the shared panel's default (enableAlpha=true),
					   consistent with every other consumer of SgsColourPanel. */ }

					{ /* Surface: fill opacity, blur, saturate and shadow on the panel itself,
					     plus the scrim behind it (Wave 3C U-2, family M-14) — the see-through
					     layer dimming the page behind the open drawer, painted by the shared
					     includes/helpers-scrim.php::sgs_scrim_render(). Defaults (opaque, no
					     blur, no shadow, scrim black at 0.55) render the drawer's existing
					     look unchanged. The controls are the shared SurfaceGroundControls,
					     ShadowControl and ScrimControls, the same ones sgs/mega-panel and
					     sgs/site-header mount (Scrim colour lives in the top-level
					     SgsColourPanel above), written to the attributes the shared render
					     helpers read. */ }
					<ToolsPanel
						label={ __( 'Surface', 'sgs-blocks' ) }
						resetAll={ () =>
							setAttributes( {
								surfaceBlur: '',
								surfaceSaturate: undefined,
								surfaceOpacity: undefined,
								shadow: '',
								shadowColour: '',
								scrimColour: '#000000',
								scrimColourGradient: '',
								scrimOpacity: { desktop: 0.55 },
								scrimBlur: {},
							} )
						}
					>
						<SurfaceGroundControls
							attributes={ attributes }
							setAttributes={ setAttributes }
						/>
						<ToolsPanelItem
							label={ __( 'Shadow', 'sgs-blocks' ) }
							hasValue={ () => !! shadow || !! shadowColour }
							onDeselect={ () => setAttributes( { shadow: '', shadowColour: '' } ) }
						>
							<ShadowControl
								label={ __( 'Shadow', 'sgs-blocks' ) }
								attributes={ attributes }
								setAttributes={ setAttributes }
								attrNames={ { base: 'shadow', colour: 'shadowColour' } }
							/>
						</ToolsPanelItem>
						<ScrimControls
							attributes={ attributes }
							setAttributes={ setAttributes }
						/>
					</ToolsPanel>

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

				{ /* Spec 41 FR-41-12 — the close button offers the same three things
				   the OPEN side does: a chosen icon, a chosen word, and both
				   together. A ToolsPanel, so the `closeStyle` row keeps the
				   hasValue/onDeselect idiom, with the trio sitting together in
				   §9.3's order.
				   ⛔ Close icon COLOUR is not here: it is a row in the top-level
				   SgsColourPanel. */ }
				<ToolsPanel
					label={ __( 'Close button', 'sgs-blocks' ) }
					resetAll={ () =>
						setAttributes( {
							closeStyle: {},
							closePlacement: {},
							closeOffset: {},
							closeRadius: {},
							closeLabel: 'Close',
							closeIcon: { source: 'lucide', name: 'x' },
						} )
					}
				>
					{ /* ⛔ OMIT, never disable. Under `text-swap` there is
					   no icon and under `burger-morph` the glyph is a CSS-drawn two-bar
					   span, not an icon at all — so the picker is ABSENT in both, never
					   greyed out. Shown if ANY tier resolves to an icon-bearing style
					   (§4.9) — over-inclusive on purpose so a tablet/mobile-only icon
					   pick is never hidden just because desktop happens to be text-only. */ }
					{ closeStyleAnyTierIs( [ 'separate-x', 'icon-and-text', 'trigger' ] ) && (
						<ToolsPanelItem
							label={ __( 'Icon', 'sgs-blocks' ) }
							hasValue={ () =>
								!! closeIcon &&
								( closeIcon.source !== 'lucide' || closeIcon.name !== 'x' )
							}
							onDeselect={ () =>
								setAttributes( { closeIcon: { source: 'lucide', name: 'x' } } )
							}
						>
							<IconPicker
								label={ __( 'Icon', 'sgs-blocks' ) }
								value={ closeIcon || { source: 'lucide', name: 'x' } }
								onChange={ ( next ) => setAttributes( { closeIcon: next } ) }
							/>
						</ToolsPanelItem>
					) }

					{ /* Wave 3C U-9/U-11 (§4.9) — closeStyle is a `"type":"object"`
					   TIER attr with no Tablet/Mobile siblings, so THE PAIRING IS
					   BINDING (Spec 35 §12) routes it to `ResponsiveOverride` (inherit
					   indicator + per-tier reset), not the flat-sibling
					   `ResponsiveControl` it used to mount. */ }
					<ToolsPanelItem
						label={ __( 'Show as', 'sgs-blocks' ) }
						hasValue={ () => !! closeStyle && Object.keys( closeStyle ).length > 0 }
						onDeselect={ () => setAttributes( { closeStyle: {} } ) }
					>
						{ /* ⚠ FIVE values now (Spec 41 FR-41-12's four plus NEW `trigger`,
						   §4.2 — "the menu button closes it"). `burger-morph` is NOT a
						   display mode — it is a GLYPH choice (a CSS-drawn two-bar span, no
						   icon and no text). That is why this enum was EXTENDED rather than
						   re-valued onto sgs/nav-bar-menu's three-value triggerMode: a naive
						   one-to-one rename would silently delete a shipped look.
						   ⚠ The fourth LABEL is "Both", not "Icon and text". Measured:
						   "Icon and text" is 13 characters, over Spec 35 Part O's
						   12-character bound for a 2-4 option ToggleGroupControl (a bound
						   derived from `burger-morph` on this very attribute). Part O's
						   remedy is to shorten the LABEL — ⛔ never the stored VALUE, which
						   stays `icon-and-text` to match the open side's triggerMode. */ }
						<ResponsiveOverride
							label={ __( 'Show as', 'sgs-blocks' ) }
							value={ closeStyle }
							onChange={ ( obj ) => setAttributes( { closeStyle: obj } ) }
						>
							{ ( { ownValue, effectiveValue, setOwnValue } ) => (
								<ToggleGroupControl
									hideLabelFromVision
									label={ __( 'Show as', 'sgs-blocks' ) }
									help={ __(
										'How the always-present close control is drawn. The close button itself can never be deleted. “Menu button closes it” hides the × entirely while the menu button stays visible and live — it reappears the moment that stops being true.',
										'sgs-blocks'
									) }
									value={ ownValue || effectiveValue || 'separate-x' }
									onChange={ ( value ) => setOwnValue( value || undefined ) }
									isBlock
									__nextHasNoMarginBottom
									__next40pxDefaultSize
								>
									<ToggleGroupControlOption value="separate-x" label={ __( '× icon', 'sgs-blocks' ) } />
									<ToggleGroupControlOption value="text-swap" label={ __( '“Close” text', 'sgs-blocks' ) } />
									<ToggleGroupControlOption value="burger-morph" label={ __( 'Morphed icon', 'sgs-blocks' ) } />
									<ToggleGroupControlOption value="icon-and-text" label={ __( 'Both', 'sgs-blocks' ) } />
									<ToggleGroupControlOption value="trigger" label={ __( 'Menu button', 'sgs-blocks' ) } />
								</ToggleGroupControl>
							) }
						</ResponsiveOverride>
					</ToolsPanelItem>

					{ /* Spec 35 §3 threshold table — 3 options, longest rendered label
					   MUST be ≤12 chars for a ToggleGroupControl. "Over the menu
					   button" was 20 chars; shortened to "On button" (9 chars). The
					   help text always names the modal-drawer precondition (not only
					   in the fallback branch), since the label itself no longer says
					   "menu button" and a client choosing it needs to know why it can
					   silently fall back. */ }
					<ToolsPanelItem
						label={ __( 'Position', 'sgs-blocks' ) }
						hasValue={ () => !! closePlacement && Object.keys( closePlacement ).length > 0 }
						onDeselect={ () => setAttributes( { closePlacement: {} } ) }
					>
						<ResponsiveOverride
							label={ __( 'Position', 'sgs-blocks' ) }
							value={ closePlacement }
							onChange={ ( obj ) => setAttributes( { closePlacement: obj } ) }
						>
							{ ( { ownValue, effectiveValue, setOwnValue } ) => {
								const resolvedPlacement = ownValue || effectiveValue || 'top-row-end';
								return (
									<ToggleGroupControl
										hideLabelFromVision
										label={ __( 'Position', 'sgs-blocks' ) }
										help={
											'same-slot' === resolvedPlacement && 'non-modal' === modality
												? __( '“On button” needs a modal drawer — this falls back to the top row while “Header stays live” is on.', 'sgs-blocks' )
												: __( 'Where the close control sits in the drawer. “On button” overlays the close control on the menu button and needs a modal drawer (“Header stays live” off).', 'sgs-blocks' )
										}
										value={ resolvedPlacement }
										onChange={ ( value ) => setOwnValue( value || undefined ) }
										isBlock
										__nextHasNoMarginBottom
										__next40pxDefaultSize
									>
										<ToggleGroupControlOption value="top-row-end" label={ __( 'End', 'sgs-blocks' ) } />
										<ToggleGroupControlOption value="top-row-start" label={ __( 'Start', 'sgs-blocks' ) } />
										<ToggleGroupControlOption value="same-slot" label={ __( 'On button', 'sgs-blocks' ) } />
									</ToggleGroupControl>
								);
							} }
						</ResponsiveOverride>
					</ToolsPanelItem>

					<ToolsPanelItem
						label={ __( 'Position offset', 'sgs-blocks' ) }
						hasValue={ () => !! closeOffset && Object.keys( closeOffset ).length > 0 }
						onDeselect={ () => setAttributes( { closeOffset: {} } ) }
					>
						<ResponsiveOverride
							label={ __( 'Position offset', 'sgs-blocks' ) }
							value={ closeOffset }
							onChange={ ( obj ) => setAttributes( { closeOffset: obj } ) }
						>
							{ ( { ownValue, setOwnValue } ) => (
								<>
									<RangeControl
										label={ __( 'Nudge sideways', 'sgs-blocks' ) }
										help={ __( 'Pixels — positive moves right, negative moves left.', 'sgs-blocks' ) }
										min={ -40 }
										max={ 40 }
										value={ ownValue?.x ?? 0 }
										onChange={ ( value ) =>
											setOwnValue( { ...( ownValue || {} ), x: value ?? 0 } )
										}
										__nextHasNoMarginBottom
										__next40pxDefaultSize
									/>
									<RangeControl
										label={ __( 'Nudge up/down', 'sgs-blocks' ) }
										help={ __( 'Pixels — positive moves down, negative moves up.', 'sgs-blocks' ) }
										min={ -40 }
										max={ 40 }
										value={ ownValue?.y ?? 0 }
										onChange={ ( value ) =>
											setOwnValue( { ...( ownValue || {} ), y: value ?? 0 } )
										}
										__nextHasNoMarginBottom
										__next40pxDefaultSize
									/>
								</>
							) }
						</ResponsiveOverride>
					</ToolsPanelItem>

					<ToolsPanelItem
						label={ __( 'Corner radius', 'sgs-blocks' ) }
						hasValue={ () => !! closeRadius && Object.keys( closeRadius ).length > 0 }
						onDeselect={ () => setAttributes( { closeRadius: {} } ) }
					>
						<ResponsiveOverride
							label={ __( 'Corner radius', 'sgs-blocks' ) }
							value={ closeRadius }
							onChange={ ( obj ) => setAttributes( { closeRadius: obj } ) }
						>
							{ ( { ownValue, effectiveValue, inherited, setOwnValue } ) => (
								<SgsLengthControl
									label={ __( 'Corner radius', 'sgs-blocks' ) }
									hideLabelFromVision
									value={ ownValue || '' }
									placeholder={ inherited ? effectiveValue : '' }
									onChange={ ( value ) => setOwnValue( value || undefined ) }
									presets={ false }
								/>
							) }
						</ResponsiveOverride>
					</ToolsPanelItem>

					{ closeStyleAnyTierIs( [ 'text-swap', 'icon-and-text' ] ) && (
						<ToolsPanelItem
							label={ __( 'Label', 'sgs-blocks' ) }
							hasValue={ () => 'Close' !== ( closeLabel ?? 'Close' ) }
							onDeselect={ () => setAttributes( { closeLabel: 'Close' } ) }
						>
							{ /* ⛔ A native TextControl, not SgsFreeTextField — matching the
							   open side's Label field. ⚠ Clearing this does NOT leave the
							   button nameless: render.php keeps the generic "Close menu"
							   accessible name when the word is empty, because an
							   aria-label="" is an EMPTY accessible name, which is strictly
							   worse than a mismatched one. */ }
							<TextControl
								label={ __( 'Label', 'sgs-blocks' ) }
								value={ closeLabel ?? 'Close' }
								onChange={ ( value ) => setAttributes( { closeLabel: value } ) }
								help={ __(
									'The word shown on the button. It is also what a screen reader announces — leave it empty and the button falls back to “Close menu”.',
									'sgs-blocks'
								) }
								__nextHasNoMarginBottom
								__next40pxDefaultSize
							/>
						</ToolsPanelItem>
					) }

					{ /* closeSize — mirrors sgs/nav-bar-menu's BurgerPanel `Size` field
					   (same SgsLengthControl shape, same 44px WCAG-floor help text).
					   Not gated on closeStyle: it governs the button box in every
					   style, matching burgerSize's own unconditional presence. */ }
					<ToolsPanelItem
						label={ __( 'Size', 'sgs-blocks' ) }
						hasValue={ () => '44px' !== ( closeSize || '44px' ) }
						onDeselect={ () => setAttributes( { closeSize: '44px' } ) }
					>
						<SgsLengthControl
							label={ __( 'Size', 'sgs-blocks' ) }
							value={ closeSize }
							units={ [ { value: 'px', label: 'px', default: 44 } ] }
							onChange={ ( val ) => setAttributes( { closeSize: val || '44px' } ) }
							help={ __(
								'44px minimum for a comfortable touch target (WCAG 2.2 AA).',
								'sgs-blocks'
							) }
							presets={ false }
						/>
					</ToolsPanelItem>

					{ /* ⛔ OMIT, never disable — matching sgs/nav-bar-menu's own
					   burger-typography OMIT-while-icon gate (edit.js's `triggerMode !==
					   'icon'` target). The close LABEL only renders under text-swap /
					   icon-and-text (render.php's $sgs_nd_close_inner branch), so font
					   size/family/weight/transform/letter-spacing are equally meaningless
					   under separate-x / burger-morph. The uppercase(text-swap)/none
					   (icon-and-text) text-transform defaults still apply while hidden
					   (render.php resolves the per-style default). */ }
					{ closeStyleAnyTierIs( [ 'text-swap', 'icon-and-text' ] ) && (
						<TypographyControls
							attributes={ attributes }
							setAttributes={ setAttributes }
							targets={ [
								{
									key: 'close',
									label: __( 'Close label', 'sgs-blocks' ),
									prefix: 'close',
									showFontFamily: true,
									showTransform: true,
									showLetterSpacing: true,
								},
							] }
						/>
					) }

					<p style={ { fontSize: '12px', color: '#757575', margin: '4px 0 0' } }>
						{ __(
							'Its colour is in the Colour panel above — leave that empty to match the drawer’s text colour automatically. The close button is always present; it cannot be deleted.',
							'sgs-blocks'
						) }
					</p>
				</ToolsPanel>

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
				{ /* closeStyle preview -- mirrors render.php's three real, visually
					distinct close-button markups, so the "Close button style"
					control has a visible editor-canvas effect. */ }
				<span
					className="sgs-nav-drawer__close-preview sgs-nav-drawer__close"
					aria-hidden="true"
					style={ {
						...resolveTextColourPreviewStyle( toggleCloseColour, toggleCloseColourGradient, ( v ) => resolveColourToken( v, palette ) ),
						/* closeSize editor-canvas mirror — this preview span
						   is hand-authored JSX, not a render.php-rendered node (the drawer
						   cannot use ServerSideRender while it hosts editable InnerBlocks —
						   see the module docstring), so render.php's scoped closeSize <style>
						   never reaches it. Width is only forced when the style shows text
						   (matches render.php's own text-bearing width:auto branch). Keyed
						   to the ACTIVE EDITOR DEVICE's resolved style (§4.9). */
						width: ( 'text-swap' === closeStyleRenderActive || 'icon-and-text' === closeStyleRenderActive ) ? 'auto' : ( closeSize || '44px' ),
						height: closeSize || '44px',
						minWidth: closeSize || '44px',
						minHeight: closeSize || '44px',
						/* closeRadius editor-canvas mirror (§4.10) — same reasoning
						   as the closeSize width/height above: this preview span is
						   hand-authored JSX, so render.php's scoped closeRadius
						   <style> never reaches it. Keyed to the ACTIVE EDITOR
						   DEVICE's resolved value, falling back to the un-migrated
						   4px default (style.css::.sgs-nav-drawer__close). */
						borderRadius: closeRadiusActive,
						// closePlacement/closeOffset editor-canvas mirror (SHOULD 10).
						...closePlacementPreviewStyle,
					} }
				>
					{ closeStyleRenderActive === 'text-swap' && (
						<span className="sgs-nav-drawer__close-text" style={ closeLabelStyle }>
							{ closeLabel ?? __( 'Close', 'sgs-blocks' ) }
						</span>
					) }
					{ closeStyleRenderActive === 'burger-morph' && (
						<span className="sgs-nav-drawer__close-bars">
							<span></span>
							<span></span>
						</span>
					) }
					{ closeStyleRenderActive === 'icon-and-text' && (
						<>
							<span className="sgs-nav-drawer__close-glyph">
								{ /* closeIcon editor-canvas mirror — same shared IconPreview
								   sgs/icon's canvas uses (src/components/IconPicker/
								   IconPreview.js), so a glyph choice other than the
								   declared default { lucide, x } actually shows here,
								   mirroring render.php's sgs_nav_shared_icon_markup()
								   resolver. */ }
								<IconPreview
									source={ closeIcon?.source || 'lucide' }
									name={ closeIcon?.name || 'x' }
								/>
							</span>
							<span className="sgs-nav-drawer__close-text" style={ closeLabelStyle }>
								{ closeLabel ?? __( 'Close', 'sgs-blocks' ) }
							</span>
						</>
					) }
					{ ( ! closeStyleRenderActive || closeStyleRenderActive === 'separate-x' ) && (
						<IconPreview
							source={ closeIcon?.source || 'lucide' }
							name={ closeIcon?.name || 'x' }
						/>
					) }
				</span>
				<div { ...innerBlocksProps } />
			</div>
		</>
	);
}
