/**
 * SGS Nav Bar Menu (sgs/nav-bar-menu) — editor.
 *
 * This block renders ONLY the bar — the in-drawer accordion/drill-down list
 * is the separate `sgs/nav-drawer-menu` block. This block declares no
 * `usesContext` and never needs to detect what it is — it IS the bar.
 *
 * Panels with NO bar/drawer conflict (TypographyPanel, ItemsPanel, EffectsPanel,
 * FeaturedPanel, ColourRowExtras' BOTH-classified treatments,
 * useNavMenuSource, useItemHoverContrast, utils, ColourTreatment) moved to
 * `src/shared/nav-menu-panels/` and are imported from there by both blocks —
 * do not fork these; edit the shared copy (and re-check the sibling block
 * still needs the unchanged parts). Panels that are genuinely BAR-only
 * (BurgerPanel, ItemSeparatorPanel, MenuSettingsPanel, DropdownSettingsPanel,
 * NavMenuNotices, useDrawerNotice, and the bar-only treatments in
 * `./BarColourRowExtras.js`) live in THIS directory, not shared.
 * `ListLayoutPanel` and `DropdownStylePanel` are shared components that take
 * a prop (`showColumnsControl` / `showSizingControls`) to omit the controls
 * that don't apply here — see each shared file's own docblock.
 *
 * NOT mounted here — both are DRAWER-only:
 *  - `SubmenuItemsPanel` (sublink marker icon/colour) — the marker CSS is
 *    scoped `.sgs-nav-drawer …`; the bar dropdown never paints it.
 *    `sublinkMarkerIcon`/`sublinkMarkerColour*` are not declared on this
 *    block's attributes.
 *  - `MegaDrawerPanel` (megaDrawerFallbackIds) — its own help text says
 *    "The desktop bar always shows the full mega panel either way — this
 *    only affects the drawer." `megaDrawerFallbackIds` is DRAWER-only.
 *
 * `useDrawerNotice` IS mounted: it pairs THIS block's burger with an
 * `sgs/nav-drawer` CONTAINER block (the dialog wrapper, a different concept
 * from `sgs/nav-drawer-menu`, the content list) — only the bar ever has a
 * burger, so the "your burger opens nothing" warning belongs to this block.
 *
 * The bar is fully server-rendered by render.php (menu source resolved via
 * SGS_Nav_Menu_Source). The editor uses ServerSideRender for the canvas
 * preview (the ssr-fixes-hand-built-preview-drift lesson — a hand-built
 * preview drifts from render.php) and exposes Settings + Styles as WP's
 * native inspector tabs.
 *
 * `colourRows` STAYS HERE
 * — as a single literal ArrayExpression whose entries are either row literals
 * or `fillRow()`/`textRow()` calls. `scripts/inspector-scan/rules/31-golden-colour-control.js`
 * resolves a row's state count only from a shape it can see in THIS file or in
 * `src/components/`, so the array and every `states` array inside it must never
 * move to a block-folder sibling.
 *
 * @package SGS\Blocks
 */
import { __ } from '@wordpress/i18n';
import { useRef } from 'react';
import { useBlockProps, useSettings, InspectorControls } from '@wordpress/block-editor';
import { Notice } from '@wordpress/components';
import ServerSideRender from '@wordpress/server-side-render';
import {
	SgsColourPanel,
	SsrPreviewGuard,
	TypographyControls,
	fillRow,
	textRow,
	ScrimControls,
	scrimColourRow,
} from '../../components';
import { ToolsPanel } from '../../components/primitives';
import { resolveTier } from '../../utils';
import {
	ItemTextTreatment,
	ItemBgTreatment,
	ItemBorderTreatment,
	SubmenuTextTreatment,
	SubmenuLinkBgTreatment,
} from '../../shared/nav-menu-panels/ColourRowExtras';
import {
	ItemSeparatorTreatment,
	BurgerIconTreatment,
	BurgerBgTreatment,
} from './BarColourRowExtras';
import useNavMenuSource from '../../shared/nav-menu-panels/useNavMenuSource';
import useDrawerNotice from './useDrawerNotice';
import useItemHoverContrast from '../../shared/nav-menu-panels/useItemHoverContrast';
import NavMenuNotices from './NavMenuNotices';
import MenuSettingsPanel from './MenuSettingsPanel';
import DisabledItemsPanel from './DisabledItemsPanel';
import BurgerPanel from './BurgerPanel';
import DropdownSettingsPanel from './DropdownSettingsPanel';
import SplitPanel from './SplitPanel';
import ListLayoutPanel from '../../shared/nav-menu-panels/ListLayoutPanel';
import TypographyPanel from '../../shared/nav-menu-panels/TypographyPanel';
import ItemsPanel from '../../shared/nav-menu-panels/ItemsPanel';
import ItemSeparatorPanel from './ItemSeparatorPanel';
import DropdownStylePanel from '../../shared/nav-menu-panels/DropdownStylePanel';
import PanelMotionPanel from './PanelMotionPanel';
import EffectsPanel from '../../shared/nav-menu-panels/EffectsPanel';
import FeaturedPanel from '../../shared/nav-menu-panels/FeaturedPanel';
import ItemEffectsPanel from '../../shared/nav-menu-panels/ItemEffectsPanel';
// This block's OWN declared Sweep-eligibility source (FR-41-26) — read here
// rather than inside the shared ColourRowExtras/ColourTreatment modules,
// which do not statically import either block's manifest (see
// shared/nav-menu-panels/ColourRowExtras.js docblock) — this block's own
// manifest is the correct declared source per FR-41-26.
import blockMetadata from './block.json';

const SWEEP_ELIGIBILITY = blockMetadata?.supports?.sgs?.sweepEligibility;

export default function Edit( { attributes, setAttributes, clientId } ) {
	const {
		ref,
		collapsePoint,
		drawerRef,
		navLabel,
		itemSmartContrast,
		itemColourHover,
		itemSeparatorWidth,
		itemSeparatorStyle,
		itemSeparatorColour,
		itemSeparatorColourHover,
		itemSeparatorHoverTreatment,
		itemSeparatorSweepAngle,
		featuredItemIds,
		disabledItemIds,
		gap,
		navBg,
		itemBg,
		itemBgCurrent,
		itemBgCurrentGradient,
		itemBgGradient,
		itemBgHover,
		itemBgHoverGradient,
		itemBgHoverTreatment,
		itemColourHoverTreatment,
		itemBorderHoverTreatment,
		sweepAngle,
		submenuColourHoverTreatment,
		submenuLinkBgHoverTreatment,
		burgerColourHoverTreatment,
		burgerBgHoverTreatment,
		itemBorderColour,
		itemBorderColourCurrent,
		itemBorderColourHover,
		itemBorderWidth,
		itemBorderStyle,
		itemBorderRadius,
		itemOpacity,
		itemOpacityHover,
		itemPaddingShiftHover,
		submenuOpacity,
		submenuOpacityHover,
		itemFontWeightCurrent,
		itemMagnetEnabled,
		itemMagnetStrength,
		submenuBorderColour,
		submenuBorderColourGradient,
		submenuLinkBorderWidth,
		submenuLinkBorderStyle,
		submenuLinkBorderColour,
		submenuLinkBorderColourHover,
		burgerSize,
		triggerMode,
		triggerLabel,
		triggerHoverLabel,
		triggerOpenLabel,
		labelRoll,
		itemMotionDuration,
		itemMotionEasing,
		itemMotionEasingCustom,
		triggerIconPosition,
		triggerIcon,
		triggerMagnetEnabled,
		triggerMagnetRadius,
		triggerMagnetStrength,
		burgerMorph,
		burgerMorphDuration,
		burgerMorphEasing,
		burgerMorphEasingCustom,
		submenuAlign,
		megaAlign,
		submenuCaret,
		submenuCloseGrace,
		submenuIntentDelay,
		submenuOpenOn,
		submenuAnimation,
		submenuTopOffset,
		submenuMinWidth,
		submenuPadding,
		submenuBorderWidth,
		submenuBorderStyle,
		submenuBorderRadius,
		submenuShadow,
		submenuShadowColour,
		featuredRadius,
		featuredRadiusHover,
		featuredFontWeight,
		featuredFontWeightHover,
		justifyContent,
		splitAfterItemId,
		splitSide,
		showBurger,
	} = attributes;

	// listColumns is intentionally NOT destructured/read here — it is
	// DRAWER-only and is not declared on this block's attributes. The shared
	// `ListLayoutPanel` (`src/shared/nav-menu-panels/ListLayoutPanel.js`) takes
	// a `showColumnsControl` prop and this block passes `false`, so the
	// "Columns" control is OMITTED here rather than rendered-and-inert.

	const { menuOptions, isResolving, resolvedItems, toggleFeatured } =
		useNavMenuSource( { ref, featuredItemIds, setAttributes } );

	// Wave B — same add/remove-from-array shape as useNavMenuSource's own
	// toggleFeatured (that hook is shared with nav-drawer-menu and is not
	// touched here; disabledItemIds is bar-only for this pass, so the
	// toggler lives locally instead).
	const toggleDisabled = ( identifier, checked ) => {
		const next = checked
			? [ ...( disabledItemIds || [] ), identifier ]
			: ( disabledItemIds || [] ).filter( ( id ) => id !== identifier );
		setAttributes( { disabledItemIds: next } );
	};

	// KEPT (see file docblock) — reports whether THIS block's burger has a
	// drawer to open. Only the bar has a burger. Report-only: creating one is
	// CreateDrawerControl, inside DropdownSettingsPanel.
	const {
		drawerState,
		activeDrawer,
		showActiveDrawerNotice,
		showDrawerNotice,
	} = useDrawerNotice( { clientId, drawerRef } );

	// `triggerMode` is a TIER OBJECT; "any tier shows the word"
	// (not just the desktop tier) is what gates a control that applies
	// uniformly across every tier's markup (the burger LABEL typography below
	// — the text span exists in the DOM the moment ANY tier is text-bearing,
	// mirrors render.php's own $sgs_nm_trigger_any_text).
	const triggerAnyTextBearing = [ 'desktop', 'tablet', 'mobile' ].some( ( tier ) =>
		[ 'text', 'icon-and-text' ].includes( resolveTier( triggerMode, tier, 'icon' ).value )
	);

	// Reference element for resolving `var(--wp--preset--color--x)` stops via
	// getComputedStyle, mirroring GradientCapableColourControl's own probe
	// pattern (see that file's StateContent). Merged onto blockProps so the
	// wrapper around ServerSideRender doubles as the probe — no extra DOM node.
	const contrastRefEl = useRef( null );
	const blockProps = useBlockProps( { ref: contrastRefEl } );
	const [ colourPalette ] = useSettings( 'color.palette' );

	// ── The Colour panel (Spec 41 §9.6) ──────────────────────────────────
	//
	// ONE grouped, SGS-OWNED colour panel (own PanelBody, mounted
	// FIRST so it sits at the top of the Styles tab; WordPress concatenates
	// same-group Fills in mount order). Sub-groupings come from FR-41-16's
	// optional per-row `heading`, so this stays ONE panel.
	//
	// ⛔ THIS ARRAY, AND EVERY `states` ARRAY INSIDE IT, STAYS IN THIS FILE
	// See the file docblock.
	const itemSurface = itemBg || navBg || '';

	// This instance is ALWAYS the bar (no drawer-context detection any
	// more) — the underline/separator label is unconditionally the bar's own
	// terminology.
	const itemHoverSurface = itemBgHover || itemSurface || '';

	// ── Item hover-text readability check (FR-41-5) ──────────────────────
	const itemHoverContrastNotice = useItemHoverContrast( {
		itemColourHover,
		itemHoverSurface,
		colourPalette,
		contrastRefEl,
	} );

	const colourRows = [
		fillRow( {
			key: 'nav-bg',
			heading: __( 'Menu', 'sgs-blocks' ),
			label: __( 'Nav background', 'sgs-blocks' ),
			attrs: { base: 'navBg', hover: 'navBgHover', gradient: 'navBgGradient' },
			attributes,
			setAttributes,
		} ),
		textRow( {
			key: 'nav-text',
			label: __( 'Nav text', 'sgs-blocks' ),
			attrs: {
				base: 'navColour',
				hover: 'navColourHover',
				gradient: 'navColourGradient',
			},
			attributes,
			setAttributes,
		} ),
		textRow( {
			key: 'item-text',
			label: __( 'Item text', 'sgs-blocks' ),
			attrs: {
				base: 'itemColour',
				hover: 'itemColourHover',
				current: 'itemColourCurrent',
				gradient: 'itemColourGradient',
				hoverGradient: itemSmartContrast ? undefined : 'itemColourHoverGradient',
			},
			attributes,
			setAttributes,
			after: (
				<>
					{ itemHoverContrastNotice && (
						<Notice
							status="warning"
							isDismissible={ false }
							className="sgs-contrast-notice"
						>
							{ itemHoverContrastNotice }
						</Notice>
					) }
					<ItemTextTreatment
						value={ itemColourHoverTreatment }
						onChange={ ( val ) => setAttributes( { itemColourHoverTreatment: val } ) }
						attributes={ attributes }
						sweepEligibility={ SWEEP_ELIGIBILITY }
					/>
				</>
			),
		} ),
		// ⛔ HAND-WRITTEN LITERAL, DELIBERATELY — FR-41-14 requires the 'current'
		// entry to be omitted per-STATE while Highlight is active; a conditional
		// attribute NAME here would desync
		// `scripts/inspector-scan/rules/31-golden-colour-control.js`'s static
		// state-count detector, which can only resolve a literal `states` array.
		{
			key: 'item-bg',
			label: __( 'Item background', 'sgs-blocks' ),
			states: [
				{
					key: 'normal',
					label: __( 'Normal', 'sgs-blocks' ),
					value: itemBg,
					onChange: ( val ) => setAttributes( { itemBg: val ?? '' } ),
					gradientValue: itemBgGradient,
					onGradientChange: ( val ) =>
						setAttributes( { itemBgGradient: val ?? '' } ),
					linked: true,
				},
				{
					key: 'hover',
					label: __( 'Hover', 'sgs-blocks' ),
					value: itemBgHover,
					onChange: ( val ) => setAttributes( { itemBgHover: val ?? '' } ),
					gradientValue: itemBgHoverGradient,
					onGradientChange: ( val ) =>
						setAttributes( { itemBgHoverGradient: val ?? '' } ),
					linked: true,
				},
				...( 'highlight' !== itemBgHoverTreatment
					? [
							{
								key: 'current',
								label: __( 'Current', 'sgs-blocks' ),
								value: itemBgCurrent,
								onChange: ( val ) =>
									setAttributes( { itemBgCurrent: val ?? '' } ),
								gradientValue: itemBgCurrentGradient,
								onGradientChange: ( val ) =>
									setAttributes( {
										itemBgCurrentGradient: val ?? '',
									} ),
								linked: true,
							},
					  ]
					: [] ),
			],
			after: (
				<ItemBgTreatment
					value={ itemBgHoverTreatment }
					onChange={ ( val ) => setAttributes( { itemBgHoverTreatment: val } ) }
				/>
			),
		},
		// ⛔ HAND-WRITTEN LITERAL, second and last — this row has no gradient
		// variant (border colour only), so it cannot use `textRow()`/`fillRow()`;
		// same rule-31 static-resolution reasoning as the item-bg row above.
		{
			key: 'item-border',
			// Bar-only — the drawer's own row-separator label lives on
			// `sgs/nav-drawer-menu`'s own edit.js copy of this row (a distinct
			// attribute NAMESPACE: the block name is the namespace).
			label: __( 'Item underline colour', 'sgs-blocks' ),
			...( itemSurface
				? { contrastAgainst: itemSurface, contrastLargeText: true }
				: {} ),
			states: [
				{
					key: 'normal',
					label: __( 'Normal', 'sgs-blocks' ),
					value: itemBorderColour,
					onChange: ( val ) => setAttributes( { itemBorderColour: val ?? '' } ),
					linked: true,
				},
				{
					key: 'hover',
					label: __( 'Hover', 'sgs-blocks' ),
					value: itemBorderColourHover,
					onChange: ( val ) =>
						setAttributes( { itemBorderColourHover: val ?? '' } ),
					linked: true,
				},
				{
					key: 'current',
					label: __( 'Current', 'sgs-blocks' ),
					value: itemBorderColourCurrent,
					onChange: ( val ) =>
						setAttributes( { itemBorderColourCurrent: val ?? '' } ),
					linked: true,
				},
			],
			after: (
				<ItemBorderTreatment
					value={ itemBorderHoverTreatment }
					onChange={ ( val ) => setAttributes( { itemBorderHoverTreatment: val } ) }
					angle={ sweepAngle }
					onAngleChange={ ( val ) => setAttributes( { sweepAngle: val } ) }
				/>
			),
		},
		// FR-41-37 — the independent vertical divider between adjacent
		// TOP-LEVEL BAR items. Unconditional (bar-only block — a vertical
		// list has no "next item to the right", so that concept never
		// reaches this block's edit.js).
		{
			key: 'item-separator',
			label: __( 'Item separator colour', 'sgs-blocks' ),
			states: [
				{
					key: 'normal',
					label: __( 'Normal', 'sgs-blocks' ),
					value: itemSeparatorColour,
					onChange: ( val ) =>
						setAttributes( { itemSeparatorColour: val ?? '' } ),
					linked: true,
				},
				{
					key: 'hover',
					label: __( 'Hover', 'sgs-blocks' ),
					value: itemSeparatorColourHover,
					onChange: ( val ) =>
						setAttributes( { itemSeparatorColourHover: val ?? '' } ),
					linked: true,
				},
			],
			after: (
				<ItemSeparatorTreatment
					value={ itemSeparatorHoverTreatment }
					onChange={ ( val ) =>
						setAttributes( { itemSeparatorHoverTreatment: val } )
					}
					angle={ itemSeparatorSweepAngle }
					onAngleChange={ ( val ) =>
						setAttributes( { itemSeparatorSweepAngle: val } )
					}
				/>
			),
		},
		fillRow( {
			key: 'submenu-bg',
			heading: __( 'Submenu', 'sgs-blocks' ),
			label: __( 'Panel background', 'sgs-blocks' ),
			attrs: { base: 'submenuBg', gradient: 'submenuBgGradient' },
			attributes,
			setAttributes,
		} ),
		{
			key: 'submenu-border',
			label: __( 'Panel border colour', 'sgs-blocks' ),
			gradientCapable: true,
			...( itemSurface
				? { contrastAgainst: itemSurface, contrastLargeText: true }
				: {} ),
			states: [
				{
					key: 'normal',
					label: __( 'Normal', 'sgs-blocks' ),
					value: submenuBorderColour,
					onChange: ( val ) =>
						setAttributes( { submenuBorderColour: val ?? '' } ),
					gradientValue: submenuBorderColourGradient,
					onGradientChange: ( val ) =>
						setAttributes( { submenuBorderColourGradient: val ?? '' } ),
					linked: true,
				},
			],
		},
		textRow( {
			key: 'submenu-text',
			label: __( 'Link text', 'sgs-blocks' ),
			attrs: {
				base: 'submenuColour',
				hover: 'submenuColourHover',
				current: 'submenuColourCurrent',
				gradient: 'submenuColourGradient',
			},
			attributes,
			setAttributes,
			after: (
				<SubmenuTextTreatment
					value={ submenuColourHoverTreatment }
					onChange={ ( val ) => setAttributes( { submenuColourHoverTreatment: val } ) }
					attributes={ attributes }
					sweepEligibility={ SWEEP_ELIGIBILITY }
				/>
			),
		} ),
		fillRow( {
			key: 'submenu-link-bg',
			label: __( 'Link background', 'sgs-blocks' ),
			attrs: {
				base: 'submenuLinkBg',
				hover: 'submenuLinkBgHover',
				current: 'submenuLinkBgCurrent',
				gradient: 'submenuLinkBgGradient',
			},
			attributes,
			setAttributes,
			after: (
				<SubmenuLinkBgTreatment
					value={ submenuLinkBgHoverTreatment }
					onChange={ ( val ) => setAttributes( { submenuLinkBgHoverTreatment: val } ) }
				/>
			),
		} ),
		// The SUBLINK's own border colour — distinct from "Panel border colour"
		// above (that row is `submenuBorderColour`, the `submenu-panel`
		// element; this one is `submenuLinkBorderColour`, the `sublink`
		// element). Normal + Hover only — no Current, per block.json's
		// `sublink.attrMap` (no `submenuLinkBorderColourCurrent` declared).
		// Shape (width/style) is `DropdownStylePanel`'s new "Link border"
		// control, matching the panel-border split above. render.php consumes
		// both attrs (`includes/nav-menu-submenu-link-css.php`).
		{
			key: 'submenu-link-border',
			label: __( 'Link border colour', 'sgs-blocks' ),
			...( itemSurface
				? { contrastAgainst: itemSurface, contrastLargeText: true }
				: {} ),
			states: [
				{
					key: 'normal',
					label: __( 'Normal', 'sgs-blocks' ),
					value: submenuLinkBorderColour,
					onChange: ( val ) =>
						setAttributes( { submenuLinkBorderColour: val ?? '' } ),
					linked: true,
				},
				{
					key: 'hover',
					label: __( 'Hover', 'sgs-blocks' ),
					value: submenuLinkBorderColourHover,
					onChange: ( val ) =>
						setAttributes( { submenuLinkBorderColourHover: val ?? '' } ),
					linked: true,
				},
			],
		},
		// There is no sublink-marker colour row here (DRAWER-only — its CSS is
		// scoped `.sgs-nav-drawer …`, so it never paints the bar's own
		// dropdown). `sublinkMarkerIcon` and its colour family are not declared
		// on this block.
		textRow( {
			key: 'burger-icon',
			heading: __( 'Menu button', 'sgs-blocks' ),
			label: __( 'Icon colour', 'sgs-blocks' ),
			attrs: {
				base: 'burgerColour',
				hover: 'burgerColourHover',
				gradient: 'burgerColourGradient',
			},
			attributes,
			setAttributes,
			after: (
				<BurgerIconTreatment
					value={ burgerColourHoverTreatment }
					onChange={ ( val ) => setAttributes( { burgerColourHoverTreatment: val } ) }
					attributes={ attributes }
					sweepEligibility={ SWEEP_ELIGIBILITY }
				/>
			),
		} ),
		fillRow( {
			key: 'burger-bg',
			label: __( 'Button background', 'sgs-blocks' ),
			attrs: {
				base: 'burgerBg',
				hover: 'burgerHoverColour',
				gradient: 'burgerBgGradient',
			},
			attributes,
			setAttributes,
			after: (
				<BurgerBgTreatment
					value={ burgerBgHoverTreatment }
					onChange={ ( val ) => setAttributes( { burgerBgHoverTreatment: val } ) }
				/>
			),
		} ),
		textRow( {
			key: 'featured-text',
			heading: __( 'Featured', 'sgs-blocks' ),
			label: __( 'Featured text colour', 'sgs-blocks' ),
			attrs: {
				base: 'featuredColour',
				hover: 'featuredColourHover',
				gradient: 'featuredColourGradient',
			},
			attributes,
			setAttributes,
		} ),
		fillRow( {
			key: 'featured-bg',
			label: __( 'Featured background', 'sgs-blocks' ),
			attrs: {
				base: 'featuredBg',
				hover: 'featuredBgHover',
				gradient: 'featuredBgGradient',
				hoverGradient: 'featuredBgHoverGradient',
			},
			attributes,
			setAttributes,
		} ),
		/* Wave B — the optional per-item badge chip ("SOON", "NEW"). Copy is
		   per-item (the operator's own WordPress menu-item Description
		   field); colour is block-level — one row applies to every badge
		   this bar renders. No hover state: a badge is never itself
		   interactive. */
		textRow( {
			key: 'item-badge-text',
			heading: __( 'Item badge', 'sgs-blocks' ),
			label: __( 'Badge text colour', 'sgs-blocks' ),
			attrs: { base: 'itemBadgeTextColour' },
			attributes,
			setAttributes,
		} ),
		fillRow( {
			key: 'item-badge-bg',
			label: __( 'Badge background', 'sgs-blocks' ),
			attrs: { base: 'itemBadgeColour' },
			attributes,
			setAttributes,
		} ),
		/* Wave B — disabled item/sublink text colour (the items chosen in
		   the Settings tab's "Disabled items" panel). No hover state: a
		   disabled item is not interactive. */
		textRow( {
			key: 'item-disabled-text',
			heading: __( 'Disabled item', 'sgs-blocks' ),
			label: __( 'Text colour', 'sgs-blocks' ),
			attrs: { base: 'itemDisabledColour' },
			attributes,
			setAttributes,
		} ),
		/* The scrim behind an open dropdown or mega panel (Wave 3C U-2, family
		   M-14) — off by default, shared row descriptor from
		   src/components/ScrimControls.js (label "Backdrop colour", reads
		   correctly here); includes/helpers-scrim.php is its render twin. */
		scrimColourRow( { attributes, setAttributes } ),
	];

	return (
		<>
			{ /* ⛔ FIRST among same-group Fills — WordPress concatenates
			   same-group Fills in MOUNT order, so this must render before
			   `<InspectorControls>` below to sit at the top of the Styles tab. */ }
			<SgsColourPanel rows={ colourRows } />

			{ /* ── General tab (default InspectorControls group) ───────────── */ }
			<InspectorControls>
				<NavMenuNotices
					showDrawerNotice={ showDrawerNotice }
					drawerState={ drawerState }
					showActiveDrawerNotice={ showActiveDrawerNotice }
					activeDrawer={ activeDrawer }
					resolvedItemsLength={ resolvedItems.length }
				/>

				<MenuSettingsPanel
					menuRef={ ref }
					menuOptions={ menuOptions }
					isResolving={ isResolving }
					setAttributes={ setAttributes }
					collapsePoint={ collapsePoint }
				/>

				{ /* Wave B — data-source pick (which items render as
				   non-interactive text), so it lives here in Settings,
				   never in Styles (Spec 35 Part O placement rule).
				   Colour is a Styles-tab row in the top-level
				   SgsColourPanel above (itemDisabledColour). */ }
				<DisabledItemsPanel
					menuRef={ ref }
					resolvedItems={ resolvedItems }
					toggleDisabled={ toggleDisabled }
					disabledItemIds={ disabledItemIds }
				/>

				<BurgerPanel
					burgerSize={ burgerSize }
					triggerMode={ triggerMode }
					triggerLabel={ triggerLabel }
					triggerHoverLabel={ triggerHoverLabel }
					triggerOpenLabel={ triggerOpenLabel }
					triggerIconPosition={ triggerIconPosition }
					triggerIcon={ triggerIcon }
					triggerMagnetEnabled={ triggerMagnetEnabled }
					triggerMagnetRadius={ triggerMagnetRadius }
					triggerMagnetStrength={ triggerMagnetStrength }
					burgerMorph={ burgerMorph }
					burgerMorphDuration={ burgerMorphDuration }
					burgerMorphEasing={ burgerMorphEasing }
					burgerMorphEasingCustom={ burgerMorphEasingCustom }
					setAttributes={ setAttributes }
				/>

				<DropdownSettingsPanel
					navLabel={ navLabel }
					itemSmartContrast={ itemSmartContrast }
					setAttributes={ setAttributes }
					drawerRef={ drawerRef }
					drawerNeedsAttention={ showDrawerNotice }
					submenuAlign={ submenuAlign }
					megaAlign={ megaAlign }
					submenuCaret={ submenuCaret }
					submenuCloseGrace={ submenuCloseGrace }
					submenuIntentDelay={ submenuIntentDelay }
					submenuOpenOn={ submenuOpenOn }
				/>

				<SplitPanel
					justifyContent={ justifyContent }
					splitAfterItemId={ splitAfterItemId }
					splitSide={ splitSide }
					showBurger={ showBurger }
					resolvedItems={ resolvedItems }
					setAttributes={ setAttributes }
				/>
			</InspectorControls>

			{ /* ── Styles tab — every panel mounted directly, no wrapper hop.
			   Routing panels through a second wrapper component would blind
			   inspector-scan rule 21's control corpus. ─────────────────────────── */ }
			<InspectorControls group="styles">
				<ListLayoutPanel
					gap={ gap }
					showColumnsControl={ false }
					padding={ attributes.padding }
					setAttributes={ setAttributes }
				/>

				<TypographyPanel
					itemFontWeightCurrent={ itemFontWeightCurrent }
					setAttributes={ setAttributes }
				>
					<TypographyControls
						attributes={ attributes }
						setAttributes={ setAttributes }
						targets={ [
							{
								key: 'item',
								label: __( 'Menu', 'sgs-blocks' ),
								prefix: 'item',
								fontSizePresets: true,
								showFontFamily: true,
								showDecoration: true,
								showTransform: true,
								showLetterSpacing: true,
								showTextAlign: true,
								showTextWrap: true,
								showTextColumns: true,
								showTextIndent: false, // never emitted for nav links; attr kept
								showWritingMode: true,
								showHover: true,
							},
							{
								key: 'submenu',
								label: __( 'Submenu', 'sgs-blocks' ),
								prefix: 'submenu',
								fontSizePresets: true,
								showFontFamily: true,
								showDecoration: true,
								showTransform: true,
								showLetterSpacing: true,
								showTextAlign: true,
								showTextWrap: true,
								showTextColumns: true,
								showTextIndent: false, // never emitted for nav links; attr kept
								showWritingMode: true,
								showHover: true,
							},
							...( triggerAnyTextBearing ? [ {
								key: 'burger',
								label: __( 'Menu button', 'sgs-blocks' ),
								prefix: 'burger',
								showFontFamily: true,
								showTransform: true,
								showLetterSpacing: true,
							} ] : [] ),
						] }
					/>
				</TypographyPanel>

				<ItemsPanel
					itemBorderWidth={ itemBorderWidth }
					itemBorderStyle={ itemBorderStyle }
					itemBorderRadius={ itemBorderRadius }
					itemOpacity={ itemOpacity }
					itemOpacityHover={ itemOpacityHover }
					itemPaddingShiftHover={ itemPaddingShiftHover }
					submenuOpacity={ submenuOpacity }
					submenuOpacityHover={ submenuOpacityHover }
					setAttributes={ setAttributes }
				/>

				{ /* FR-41-37 — always mounted (bar-only block). */ }
				<ItemSeparatorPanel
					itemSeparatorWidth={ itemSeparatorWidth }
					itemSeparatorStyle={ itemSeparatorStyle }
					setAttributes={ setAttributes }
				/>

				{ /* SubmenuItemsPanel (sublink marker icon) is NOT mounted —
				   DRAWER-only, see file docblock. */ }

				<DropdownStylePanel
					showSizingControls={ true }
					submenuAnimation={ submenuAnimation }
					submenuTopOffset={ submenuTopOffset }
					submenuMinWidth={ submenuMinWidth }
					submenuPadding={ submenuPadding }
					submenuBorderWidth={ submenuBorderWidth }
					submenuBorderStyle={ submenuBorderStyle }
					submenuBorderRadius={ submenuBorderRadius }
					submenuLinkBorderWidth={ submenuLinkBorderWidth }
					submenuLinkBorderStyle={ submenuLinkBorderStyle }
					submenuShadow={ submenuShadow }
					submenuShadowColour={ submenuShadowColour }
					attributes={ attributes }
					setAttributes={ setAttributes }
				/>

				<PanelMotionPanel attributes={ attributes } setAttributes={ setAttributes } />

				{ /* The scrim behind an open dropdown or mega panel (Wave 3C U-2,
				   family M-14) — off by default; a bar that never touches it ships
				   nothing extra. Colour lives in the top-level SgsColourPanel above
				   (colourRows); this panel holds the per-device strength + blur.
				   No existing dropdown/panel ToolsPanel to fold into — DropdownStylePanel
				   is a shared component (src/shared/nav-menu-panels/) outside this
				   block's own file, so a new panel is the correct home. */ }
				<ToolsPanel
					label={ __( 'Dropdown backdrop', 'sgs-blocks' ) }
					resetAll={ () =>
						setAttributes( {
							scrimOpacity: {},
							scrimBlur: {},
						} )
					}
				>
					<ScrimControls
						attributes={ attributes }
						setAttributes={ setAttributes }
					/>
				</ToolsPanel>

				{ /* Wave 3C U-10 (§4.8) — `itemMagnetStrength`. Spec 35 audit item
				   7 (2026-09-24) folded this back into the shared `EffectsPanel`
				   via its new optional `magnetStrength`/`onMagnetStrengthChange`
				   prop pair — the previous standalone mount (`ItemMagnetStrengthControl.js`,
				   now deleted) split one logical "Effects" cluster across two
				   mount points, the banned lookalike 35A CO-2 clause 2 names.
				   `sgs/nav-drawer-menu`'s own `edit.js` supplies neither prop, so
				   it is unaffected. */ }
				<ItemEffectsPanel
					showDim={ false }
					labelRoll={ labelRoll }
					itemMotionDuration={ itemMotionDuration }
					itemMotionEasing={ itemMotionEasing }
					itemMotionEasingCustom={ itemMotionEasingCustom }
					setAttributes={ setAttributes }
				/>

				<EffectsPanel
					itemMagnetEnabled={ itemMagnetEnabled }
					setAttributes={ setAttributes }
					magnetStrength={ itemMagnetStrength }
					onMagnetStrengthChange={ ( val ) =>
						setAttributes( { itemMagnetStrength: val } )
					}
				/>

				<FeaturedPanel
					menuRef={ ref }
					resolvedItems={ resolvedItems }
					toggleFeatured={ toggleFeatured }
					featuredItemIds={ featuredItemIds }
					setAttributes={ setAttributes }
					featuredRadius={ featuredRadius }
					featuredRadiusHover={ featuredRadiusHover }
					featuredFontWeight={ featuredFontWeight }
					featuredFontWeightHover={ featuredFontWeightHover }
				/>

				{ /* MegaDrawerPanel (megaDrawerFallbackIds) is NOT mounted —
				   DRAWER-only, see file docblock: "The desktop bar always
				   shows the full mega panel either way — this only affects
				   the drawer." */ }
			</InspectorControls>

			<div { ...blockProps }>
				<SsrPreviewGuard>
					<ServerSideRender block="sgs/nav-bar-menu" attributes={ attributes } />
				</SsrPreviewGuard>
			</div>
		</>
	);
}
