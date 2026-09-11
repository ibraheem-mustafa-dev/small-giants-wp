/**
 * SGS Nav Menu (sgs/nav-menu) — editor.
 *
 * The bar is fully server-rendered by render.php (menu source resolved via
 * SGS_Nav_Menu_Source). The editor uses ServerSideRender for the canvas
 * preview (the ssr-fixes-hand-built-preview-drift lesson — a hand-built
 * preview drifts from render.php) and exposes Settings + Styles as WP's
 * native inspector tabs (`InspectorControls` default group = Settings,
 * `group="styles"` = Styles; Advanced/className/anchor is WP's own
 * automatic panel — no bespoke third tab).
 *
 * Split into sub-modules (Spec 41 step 7, pure refactor, 2026-09-11) to keep
 * this file under the project's 250-line JS budget — see the sibling files
 * in this directory (utils.js, useNavMenuSource.js, useDrawerNotice.js,
 * NavMenuNotices.js, SettingsPanels.js, BarPanel.js, DropdownStylePanel.js,
 * ItemsPanel.js, FeaturedPanel.js, BurgerPanel.js) and
 * `.claude/verify/spec-41-reuse-ledger.md` for the
 * per-file reuse record. `colourRows` stays here as a single literal
 * ArrayExpression, deliberately NOT extracted or rebuilt via a helper —
 * owner ruling 3 (the golden-colour-control detector, `scripts/
 * inspector-scan/rules/31-golden-colour-control.js`, resolves a row's state
 * count only from a literal it can see in THIS file or `src/components/`).
 *
 * @package SGS\Blocks
 */
import { __ } from '@wordpress/i18n';
import { useBlockProps, InspectorControls } from '@wordpress/block-editor';
import ServerSideRender from '@wordpress/server-side-render';
import { SgsColourPanel } from '../../components';
import useNavMenuSource from './useNavMenuSource';
import useDrawerNotice from './useDrawerNotice';
import NavMenuNotices from './NavMenuNotices';
import MenuSettingsPanel from './MenuSettingsPanel';
import DropdownSettingsPanel from './DropdownSettingsPanel';
import BarPanel from './BarPanel';
import DropdownStylePanel from './DropdownStylePanel';
import ItemsPanel from './ItemsPanel';
import FeaturedPanel from './FeaturedPanel';
import BurgerPanel from './BurgerPanel';

export default function Edit( { attributes, setAttributes, clientId } ) {
	const {
		ref,
		collapsePoint,
		drawerRef,
		navLabel,
		featuredItemIds,
		gap,
		listColumns,
		navBg,
		navColour,
		navColourGradient,
		navBgHover,
		itemColour,
		itemColourGradient,
		itemBg,
		itemBgGradient,
		itemColourHover,
		itemBgHover,
		featuredColour,
		featuredColourGradient,
		featuredBg,
		featuredColourHover,
		featuredBgHover,
		featuredRadius,
		featuredRadiusHover,
		featuredFontWeight,
		featuredFontWeightHover,
		burgerColour,
		burgerColourGradient,
		burgerBg,
		burgerHoverColour,
		burgerSize,
		itemColourHoverTreatment,
		itemBgHoverTreatment,
		itemBorderHoverTreatment,
		borderHoverAnimationDirection,
		itemMagnetEnabled,
		submenuAlign,
		submenuCaret,
		submenuCloseGrace,
		submenuBg,
		submenuBgGradient,
		submenuColour,
		submenuColourGradient,
		submenuMinWidth,
		submenuPadding,
		navColourHover,
		burgerColourHover,
		submenuColourHover,
	} = attributes;

	const { menuOptions, isResolving, resolvedItems, toggleFeatured } =
		useNavMenuSource( { ref, featuredItemIds, setAttributes } );

	const {
		effectiveDrawerRef,
		drawerState,
		addDrawer,
		activeDrawer,
		showActiveDrawerNotice,
		showDrawerNotice,
	} = useDrawerNotice( { clientId, ref, drawerRef } );

	const blockProps = useBlockProps();

	// D618/D609 — ONE grouped, SGS-OWNED colour panel (own PanelBody, mounted
	// FIRST so it sits at the top of the Styles tab). Every state below carries
	// `linked: true` (D619).
	//
	// itemColourHover/itemBgHover: GROUND-TRUTH checked against
	// render.php (2026-08-15 rebuild) — `$hover_targets` (line ~953) is now
	// `:hover,:focus-visible` ONLY. The current-page indicator was deliberately
	// SEPARATED from hover (Bean, 2026-07-31 — see render.php's "CURRENT-PAGE
	// IS NO LONGER IN THIS LIST" comment) and now gets its own font-weight/
	// border-left treatment with no colour attribute of its own. The
	// block.json element manifest's `item.states.selected` entry (which still
	// shows the same attrMap as `hover`) is STALE documentation left over from
	// before that fix — do not wire a "Selected" state from it.
	//
	// submenuBg/submenuColour: `css=None` in the DB, but render.php confirms a
	// real property each — submenuBg feeds `--sgs-nm-submenu-bg` into
	// `.sgs-nav-menu__submenu`'s `background` (~line 1347); submenuColour feeds
	// `--sgs-nm-submenu-colour` into `.sgs-nav-menu__sublink`'s `color`
	// (~line 1383). Neither has a hover sibling attribute, so each is a
	// single-state row.
	//
	// navBg/submenuBg: checked against nav-drawer/render.php (own `drawerBg`
	// attribute, styles the `<dialog>` root) and site-header (inserts
	// sgs/nav-menu as a plain child, no shared background attribute) — neither
	// competes with this block's own navBg/submenuBg. The drawer holds its OWN
	// sgs/nav-menu instance (own uid), so setting navBg/submenuBg there styles
	// only that copy. Single source of truth confirmed; wired directly.
	const colourRows = [
		{
			key: 'nav-bg',
			label: __( 'Nav background', 'sgs-blocks' ),
			states: [
				{
					key: 'normal',
					label: __( 'Normal', 'sgs-blocks' ),
					value: navBg,
					onChange: ( val ) => setAttributes( { navBg: val ?? '' } ),
					gradientValue: attributes.navBgGradient,
					onGradientChange: ( val ) => setAttributes( { navBgGradient: val ?? '' } ),
					linked: true,
				},
				{
					key: 'hover',
					label: __( 'Hover', 'sgs-blocks' ),
					value: navBgHover,
					onChange: ( val ) => setAttributes( { navBgHover: val ?? '' } ),
					linked: true,
				},
			],
		},
		{
			key: 'nav-text',
			label: __( 'Nav text colour', 'sgs-blocks' ),
			gradientCapable: true,
			states: [
				{
					key: 'normal',
					label: __( 'Normal', 'sgs-blocks' ),
					value: navColour,
					onChange: ( val ) => setAttributes( { navColour: val ?? '' } ),
					linked: true,
					gradientValue: navColourGradient,
					onGradientChange: ( val ) => setAttributes( { navColourGradient: val ?? '' } ),
				},
				{
					key: 'hover',
					label: __( 'Hover', 'sgs-blocks' ),
					value: navColourHover,
					onChange: ( val ) => setAttributes( { navColourHover: val ?? '' } ),
					linked: true,
					},
			],
		},
		{
			key: 'item-text',
			label: __( 'Item text colour', 'sgs-blocks' ),
			gradientCapable: true,
			states: [
				{
					key: 'normal',
					label: __( 'Normal', 'sgs-blocks' ),
					value: itemColour,
					onChange: ( val ) => setAttributes( { itemColour: val ?? '' } ),
					linked: true,
					gradientValue: itemColourGradient,
					onGradientChange: ( val ) => setAttributes( { itemColourGradient: val ?? '' } ),
				},
				{
					key: 'hover',
					label: __( 'Hover', 'sgs-blocks' ),
					value: itemColourHover,
					onChange: ( val ) => setAttributes( { itemColourHover: val ?? '' } ),
					linked: true,
				},
			],
		},
		{
			key: 'item-bg',
			label: __( 'Item background', 'sgs-blocks' ),
			gradientCapable: true,
			states: [
				{
					key: 'normal',
					label: __( 'Normal', 'sgs-blocks' ),
					value: itemBg,
					onChange: ( val ) => setAttributes( { itemBg: val ?? '' } ),
					linked: true,
					gradientValue: itemBgGradient,
					onGradientChange: ( val ) => setAttributes( { itemBgGradient: val ?? '' } ),
				},
				{
					key: 'hover',
					label: __( 'Hover', 'sgs-blocks' ),
					value: itemBgHover,
					onChange: ( val ) => setAttributes( { itemBgHover: val ?? '' } ),
					linked: true,
				},
			],
		},
		{
			key: 'featured-text',
			label: __( 'Featured text colour', 'sgs-blocks' ),
			gradientCapable: true,
			states: [
				{
					key: 'normal',
					label: __( 'Normal', 'sgs-blocks' ),
					value: featuredColour,
					onChange: ( val ) => setAttributes( { featuredColour: val ?? '' } ),
					gradientValue: featuredColourGradient,
					onGradientChange: ( val ) => setAttributes( { featuredColourGradient: val ?? '' } ),
					linked: true,
				},
				{
					key: 'hover',
					label: __( 'Hover', 'sgs-blocks' ),
					value: featuredColourHover,
					onChange: ( val ) => setAttributes( { featuredColourHover: val ?? '' } ),
					linked: true,
				},
			],
		},
		{
			key: 'featured-bg',
			label: __( 'Featured background', 'sgs-blocks' ),
			states: [
				{
					key: 'normal',
					label: __( 'Normal', 'sgs-blocks' ),
					value: featuredBg,
					onChange: ( val ) => setAttributes( { featuredBg: val ?? '' } ),
					gradientValue: attributes.featuredBgGradient,
					onGradientChange: ( val ) => setAttributes( { featuredBgGradient: val ?? '' } ),
					linked: true,
				},
				{
					key: 'hover',
					label: __( 'Hover', 'sgs-blocks' ),
					value: featuredBgHover,
					onChange: ( val ) => setAttributes( { featuredBgHover: val ?? '' } ),
					gradientValue: attributes.featuredBgHoverGradient,
					onGradientChange: ( val ) => setAttributes( { featuredBgHoverGradient: val ?? '' } ),
					linked: true,
				},
			],
		},
		{
			key: 'burger-icon',
			label: __( 'Burger icon colour', 'sgs-blocks' ),
			gradientCapable: true,
			states: [
				{
					key: 'normal',
					label: __( 'Normal', 'sgs-blocks' ),
					value: burgerColour,
					onChange: ( val ) => setAttributes( { burgerColour: val ?? '' } ),
					gradientValue: burgerColourGradient,
					onGradientChange: ( val ) => setAttributes( { burgerColourGradient: val ?? '' } ),
					linked: true,
				},
				{
					key: 'hover',
					label: __( 'Hover', 'sgs-blocks' ),
					value: burgerColourHover,
					onChange: ( val ) => setAttributes( { burgerColourHover: val ?? '' } ),
					linked: true,
				},
			],
		},
		{
			key: 'burger-bg',
			label: __( 'Burger background', 'sgs-blocks' ),
			states: [
				{
					key: 'normal',
					label: __( 'Normal', 'sgs-blocks' ),
					value: burgerBg,
					onChange: ( val ) => setAttributes( { burgerBg: val ?? '' } ),
					gradientValue: attributes.burgerBgGradient,
					onGradientChange: ( val ) => setAttributes( { burgerBgGradient: val ?? '' } ),
					linked: true,
				},
				{
					key: 'hover',
					label: __( 'Hover', 'sgs-blocks' ),
					value: burgerHoverColour,
					onChange: ( val ) => setAttributes( { burgerHoverColour: val ?? '' } ),
					linked: true,
				},
			],
		},
		{
			key: 'submenu-bg',
			label: __( 'Dropdown background', 'sgs-blocks' ),
			states: [
				{
					key: 'normal',
					label: __( 'Normal', 'sgs-blocks' ),
					value: submenuBg,
					onChange: ( val ) => setAttributes( { submenuBg: val ?? '' } ),
					gradientValue: submenuBgGradient,
					onGradientChange: ( val ) => setAttributes( { submenuBgGradient: val ?? '' } ),
					linked: true,
				},
			],
		},
		{
			key: 'submenu-text',
			label: __( 'Dropdown link colour', 'sgs-blocks' ),
			gradientCapable: true,
			states: [
				{
					key: 'normal',
					label: __( 'Normal', 'sgs-blocks' ),
					value: submenuColour,
					onChange: ( val ) => setAttributes( { submenuColour: val ?? '' } ),
					gradientValue: submenuColourGradient,
					onGradientChange: ( val ) => setAttributes( { submenuColourGradient: val ?? '' } ),
					linked: true,
				},
				{
					key: 'hover',
					label: __( 'Hover', 'sgs-blocks' ),
					value: submenuColourHover,
					onChange: ( val ) => setAttributes( { submenuColourHover: val ?? '' } ),
					linked: true,
				},
			],
		},
	];

	return (
		<>
			<SgsColourPanel rows={ colourRows } />
			{ /* ── Settings tab (default InspectorControls group) ──────────── */ }
			<InspectorControls>
				<NavMenuNotices
					showDrawerNotice={ showDrawerNotice }
					drawerState={ drawerState }
					effectiveDrawerRef={ effectiveDrawerRef }
					addDrawer={ addDrawer }
					setAttributes={ setAttributes }
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

				<DropdownSettingsPanel
					navLabel={ navLabel }
					setAttributes={ setAttributes }
					drawerRef={ drawerRef }
					submenuAlign={ submenuAlign }
					submenuCaret={ submenuCaret }
					submenuCloseGrace={ submenuCloseGrace }
				/>
			</InspectorControls>

			{ /* ── Styles tab ─────────────────────────────────────────────── */ }
			<InspectorControls group="styles">
				<BarPanel
					gap={ gap }
					listColumns={ listColumns }
					padding={ attributes.padding }
					setAttributes={ setAttributes }
				/>

				{ /*
				   Dropdown appearance. Every control is unset by default, so a
				   menu with no nested items — and any existing nav — renders
				   exactly as before. Unset writes NO custom property at all, so
				   the stylesheet's own fallback applies rather than a value
				   silently overriding the theme.
				*/ }
				<DropdownStylePanel
					submenuMinWidth={ submenuMinWidth }
					submenuPadding={ submenuPadding }
					setAttributes={ setAttributes }
				/>

				{ /*
				   Nav CONTAINER appearance — colours moved to the top-level
				   SgsColourPanel (D618/D609, 2026-08-15). This panel used to
				   hold ONLY navBg/navBgHover/navColour, so nothing is left
				   here; it is intentionally removed rather than left as an
				   empty shell. The drawer styling note still applies: the
				   drawer holds its own sgs/nav-menu instance, so setting the
				   colour panel's Nav background/text on the nav INSIDE the
				   drawer styles the drawer only.
				*/ }

				<ItemsPanel
					itemColourHoverTreatment={ itemColourHoverTreatment }
					itemBgHoverTreatment={ itemBgHoverTreatment }
					itemBorderHoverTreatment={ itemBorderHoverTreatment }
					borderHoverAnimationDirection={ borderHoverAnimationDirection }
					setAttributes={ setAttributes }
					attributes={ attributes }
					itemMagnetEnabled={ itemMagnetEnabled }
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

				<BurgerPanel burgerSize={ burgerSize } setAttributes={ setAttributes } />
			</InspectorControls>

			<div { ...blockProps }>
				<ServerSideRender block="sgs/nav-menu" attributes={ attributes } />
			</div>
		</>
	);
}
