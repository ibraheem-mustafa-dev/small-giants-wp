/**
 * SGS Nav Drawer Menu (sgs/nav-drawer-menu) — editor.
 * DRAWER LIST ONLY. This block only ever renders inside `sgs/nav-drawer`
 * (block.json `"ancestor": ["sgs/nav-drawer"]`), so there is no bar/drawer
 * fork to detect: the whole file is drawer-only content, and every "bar
 * only" control (item separator, burger, dropdown-specific settings) is
 * absent from this block's own panels (see each panel file's own docblock).
 *
 * The list is fully server-rendered by render.php (menu source resolved via
 * SGS_Nav_Menu_Source). The editor uses ServerSideRender for the canvas
 * preview and exposes Settings + Styles as WP's native inspector tabs.
 * Sub-modules: NavMenuNotices.js, MenuSettingsPanel.js,
 * DropdownSettingsPanel.js and SplitPanel.js live in this directory; the
 * panels shared with the bar block (utils, useNavMenuSource,
 * useItemHoverContrast, TypographyPanel, ItemsPanel, SubmenuItemsPanel,
 * DropdownStylePanel, EffectsPanel, FeaturedPanel, MegaDrawerPanel,
 * ColourRowExtras, ColourTreatment, ListLayoutPanel) live in
 * `src/shared/nav-menu-panels/`.
 *
 * `colourRows` STAYS HERE — as a single literal
 * ArrayExpression whose entries are either row literals or `fillRow()`/
 * `textRow()` calls, so `scripts/inspector-scan/rules/31-golden-colour-
 * control.js` can resolve every row's state count.
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
} from '../../components';
import {
	ItemTextTreatment,
	ItemBgTreatment,
	ItemBorderTreatment,
	SubmenuTextTreatment,
	SubmenuLinkBgTreatment,
} from '../../shared/nav-menu-panels/ColourRowExtras';
import useNavMenuSource from '../../shared/nav-menu-panels/useNavMenuSource';
import useItemHoverContrast from '../../shared/nav-menu-panels/useItemHoverContrast';
import NavMenuNotices from './NavMenuNotices';
import MenuSettingsPanel from './MenuSettingsPanel';
import SplitPanel from './SplitPanel';
import DropdownSettingsPanel from './DropdownSettingsPanel';
import ListLayoutPanel from '../../shared/nav-menu-panels/ListLayoutPanel';
import TypographyPanel from '../../shared/nav-menu-panels/TypographyPanel';
import ItemsPanel from '../../shared/nav-menu-panels/ItemsPanel';
import SubmenuItemsPanel from '../../shared/nav-menu-panels/SubmenuItemsPanel';
import DropdownStylePanel from '../../shared/nav-menu-panels/DropdownStylePanel';
import EffectsPanel from '../../shared/nav-menu-panels/EffectsPanel';
import FeaturedPanel from '../../shared/nav-menu-panels/FeaturedPanel';
import MegaDrawerPanel from '../../shared/nav-menu-panels/MegaDrawerPanel';
// This block's OWN declared Sweep-eligibility source (FR-41-26) — read here
// rather than inside the shared ColourRowExtras/ColourTreatment modules,
// which do not statically import either block's manifest (see
// shared/nav-menu-panels/ColourRowExtras.js docblock).
import blockMetadata from './block.json';

const SWEEP_ELIGIBILITY = blockMetadata?.supports?.sgs?.sweepEligibility;

export default function Edit( { attributes, setAttributes } ) {
	const {
		ref,
		navLabel,
		itemSmartContrast,
		itemColourHover,
		featuredItemIds,
		gap,
		listColumns,
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
		itemBorderColour,
		itemBorderColourCurrent,
		itemBorderColourHover,
		itemBorderWidth,
		itemBorderStyle,
		itemBorderRadius,
		itemFontWeightCurrent,
		itemMagnetEnabled,
		submenuBorderColour,
		submenuBorderColourGradient,
		submenuLinkBorderWidth,
		submenuLinkBorderStyle,
		submenuLinkBorderColour,
		submenuLinkBorderColourHover,
		sublinkMarkerIcon,
		submenuPadding,
		submenuBorderWidth,
		submenuBorderStyle,
		featuredRadius,
		featuredRadiusHover,
		featuredFontWeight,
		featuredFontWeightHover,
		megaDrawerFallbackIds,
		splitAfterItemId,
		splitSide,
	} = attributes;

	const { menuOptions, isResolving, resolvedItems, toggleFeatured } =
		useNavMenuSource( { ref, featuredItemIds, setAttributes } );

	// Reference element for resolving `var(--wp--preset--color--x)` stops via
	// getComputedStyle, mirroring GradientCapableColourControl's own probe
	// pattern. Merged onto blockProps so the wrapper around ServerSideRender
	// doubles as the probe — no extra DOM node.
	const contrastRefEl = useRef( null );
	const blockProps = useBlockProps( { ref: contrastRefEl } );
	const [ colourPalette ] = useSettings( 'color.palette' );

	const itemSurface = itemBg || navBg || '';
	const itemHoverSurface = itemBgHover || itemSurface || '';

	// ── Item hover-text readability check (FR-41-5) ─────────────────────────
	const itemHoverContrastNotice = useItemHoverContrast( {
		itemColourHover,
		itemHoverSurface,
		colourPalette,
		contrastRefEl,
	} );

	// FR-41-30(b) — the sublink-marker colour row is revealed only once the
	// operator picks a DIFFERENT icon than the declared default (chevron-right).
	const SGS_NM_SUBLINK_MARKER_ICON_DEFAULT = { source: 'lucide', name: 'chevron-right' };
	const sublinkMarkerIconIsCustom =
		( sublinkMarkerIcon?.source ?? SGS_NM_SUBLINK_MARKER_ICON_DEFAULT.source ) !==
			SGS_NM_SUBLINK_MARKER_ICON_DEFAULT.source ||
		( sublinkMarkerIcon?.name ?? SGS_NM_SUBLINK_MARKER_ICON_DEFAULT.name ) !==
			SGS_NM_SUBLINK_MARKER_ICON_DEFAULT.name;

	// ── The Colour panel (Spec 41 §9.6) ──────────────────────────────────────
	//
	// Unlike the bar block's `colourRows`, this has no "Item separator colour
	// (bar)" row (the itemSeparatorWidth/Colour family is BAR-only) and no
	// "Menu button" rows (burger-icon / burger-bg — the whole burger family is
	// BAR-only). The "item-border" row's label is unconditionally "Row
	// separator colour" — this block IS always the drawer (the bar's identical
	// attribute family paints its own item UNDERLINE instead — see
	// itemBorderWidth's own block.json description on both blocks).
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
		// ⛔ HAND-WRITTEN LITERAL, deliberately, same reason as the bar block's
		// own identical row — FR-41-14 requires Current to be omitted per-STATE
		// while Highlight is active, and `describeRow()` can only count states
		// statically from a literal `states` array with a spread-of-ternary.
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
		{
			key: 'item-border',
			// Unconditional — this block is always the drawer's own list, so the
			// shared itemBorderWidth/Colour family always reads as a row
			// separator here (the bar's identical attribute family paints an
			// item UNDERLINE instead).
			label: __( 'Row separator colour', 'sgs-blocks' ),
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
		fillRow( {
			key: 'submenu-bg',
			heading: __( 'Submenu', 'sgs-blocks' ),
			label: __( 'Panel background', 'sgs-blocks' ),
			attrs: { base: 'submenuBg', gradient: 'submenuBgGradient' },
			attributes,
			setAttributes,
		} ),
		// Normal-only, per FR-41-9 — no hover moment on the panel itself.
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
		// OMITTED (not disabled) unless `sublinkMarkerIcon` differs from its
		// declared chevron-right default.
		sublinkMarkerIconIsCustom &&
			textRow( {
				key: 'sublink-marker',
				label: __( 'Sublink marker colour', 'sgs-blocks' ),
				attrs: {
					base: 'sublinkMarkerColour',
					hover: 'sublinkMarkerColourHover',
					current: 'sublinkMarkerColourCurrent',
					gradient: 'sublinkMarkerColourGradient',
					hoverGradient: 'sublinkMarkerColourHoverGradient',
					currentGradient: 'sublinkMarkerColourCurrentGradient',
				},
				attributes,
				setAttributes,
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
	];

	return (
		<>
			{ /* ⛔ FIRST among same-group Fills — see the bar block's identical note. */ }
			<SgsColourPanel rows={ colourRows } />

			{ /* ── General tab (default InspectorControls group) ───────────── */ }
			<InspectorControls>
				<NavMenuNotices resolvedItemsLength={ resolvedItems.length } />

				<MenuSettingsPanel
					menuRef={ ref }
					menuOptions={ menuOptions }
					isResolving={ isResolving }
					setAttributes={ setAttributes }
				/>

				<DropdownSettingsPanel
					navLabel={ navLabel }
					itemSmartContrast={ itemSmartContrast }
					setAttributes={ setAttributes }
				/>

				<SplitPanel
					splitAfterItemId={ splitAfterItemId }
					splitSide={ splitSide }
					resolvedItems={ resolvedItems }
					setAttributes={ setAttributes }
				/>
			</InspectorControls>

			{ /* ── Styles tab. ⛔ Every panel mounted HERE directly, not behind a
			   wrapper component — see the bar block's own note on why an extra
			   hop makes a detector's control corpus blind. ─────────────────── */ }
			<InspectorControls group="styles">
				<ListLayoutPanel
					gap={ gap }
					showColumnsControl
					listColumns={ listColumns }
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
							// No 'burger' target — the whole burger family is BAR-only;
							// this block has no trigger button.
						] }
					/>
				</TypographyPanel>

				<ItemsPanel
					itemBorderWidth={ itemBorderWidth }
					itemBorderStyle={ itemBorderStyle }
					itemBorderRadius={ itemBorderRadius }
					setAttributes={ setAttributes }
				/>

				{ /* No ItemSeparatorPanel — itemSeparator* is BAR-only (measured);
				   a vertical list has no "next item to the right" to divide. */ }

				<SubmenuItemsPanel
					sublinkMarkerIcon={ sublinkMarkerIcon }
					setAttributes={ setAttributes }
				/>

				<DropdownStylePanel
					showSizingControls={ false }
					submenuPadding={ submenuPadding }
					submenuBorderWidth={ submenuBorderWidth }
					submenuBorderStyle={ submenuBorderStyle }
					submenuLinkBorderWidth={ submenuLinkBorderWidth }
					submenuLinkBorderStyle={ submenuLinkBorderStyle }
					setAttributes={ setAttributes }
				/>

				<EffectsPanel
					itemMagnetEnabled={ itemMagnetEnabled }
					setAttributes={ setAttributes }
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

				<MegaDrawerPanel
					menuRef={ ref }
					resolvedItems={ resolvedItems }
					megaDrawerFallbackIds={ megaDrawerFallbackIds }
					setAttributes={ setAttributes }
				/>
			</InspectorControls>

			<div { ...blockProps }>
				<SsrPreviewGuard>
					<ServerSideRender block="sgs/nav-drawer-menu" attributes={ attributes } />
				</SsrPreviewGuard>
			</div>
		</>
	);
}
