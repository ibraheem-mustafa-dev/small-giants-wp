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
 * per-file reuse record.
 *
 * `colourRows` STAYS HERE (owner ruling 3) — as a single literal
 * ArrayExpression whose entries are either row literals or `fillRow()`/
 * `textRow()` calls. `scripts/inspector-scan/rules/31-golden-colour-control.js`
 * resolves a row's state count only from a shape it can see in THIS file or in
 * `src/components/`, so the array and every `states` array inside it must never
 * move to a block-folder sibling. ⚠ Rebuilt onto the shared row helpers
 * 2026-09-11 (Spec 41 step 13): the detector resolves a `fillRow`/`textRow` CALL
 * natively via `describeRow()`, which is a different question from the corpus
 * limit above — the call site is what has to stay here, not the builder.
 *
 * @package SGS\Blocks
 */
import { __ } from '@wordpress/i18n';
import { useBlockProps } from '@wordpress/block-editor';
import ServerSideRender from '@wordpress/server-side-render';
import { SgsColourPanel, TypographyControls, fillRow, textRow } from '../../components';
import {
	ItemTextTreatment,
	ItemBgTreatment,
	ItemBorderTreatment,
	SubmenuTextTreatment,
	SubmenuLinkBgTreatment,
	BurgerIconTreatment,
	BurgerBgTreatment,
} from './ColourRowExtras';
import { InspectorControls } from '@wordpress/block-editor';
import useNavMenuSource from './useNavMenuSource';
import useDrawerNotice from './useDrawerNotice';
import NavMenuNotices from './NavMenuNotices';
import MenuSettingsPanel from './MenuSettingsPanel';
import BurgerPanel from './BurgerPanel';
import DropdownSettingsPanel from './DropdownSettingsPanel';
import BarPanel from './BarPanel';
import TypographyPanel from './TypographyPanel';
import ItemsPanel from './ItemsPanel';
import SubmenuItemsPanel from './SubmenuItemsPanel';
import DropdownStylePanel from './DropdownStylePanel';
import EffectsPanel from './EffectsPanel';
import FeaturedPanel from './FeaturedPanel';

export default function Edit( { attributes, setAttributes, clientId } ) {
	const {
		ref,
		collapsePoint,
		drawerRef,
		navLabel,
		itemSmartContrast,
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
		borderHoverAnimationDirection,
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
		itemFontWeightCurrent,
		itemMagnetEnabled,
		submenuBorderColour,
		submenuBorderColourGradient,
		sublinkMarkerIcon,
		burgerSize,
		triggerMode,
		triggerLabel,
		triggerIcon,
		triggerMagnetEnabled,
		triggerMagnetRadius,
		triggerMagnetStrength,
		submenuAlign,
		submenuCaret,
		submenuCloseGrace,
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

	// ── The Colour panel (Spec 41 §9.6) ──────────────────────────────────
	//
	// D618/D609 — ONE grouped, SGS-OWNED colour panel (own PanelBody, mounted
	// FIRST so it sits at the top of the Styles tab; WordPress concatenates
	// same-group Fills in mount order). Sub-groupings come from FR-41-16's
	// optional per-row `heading`, so this stays ONE panel.
	//
	// ⛔ THIS ARRAY, AND EVERY `states` ARRAY INSIDE IT, STAYS IN THIS FILE
	// (owner ruling 3). `scripts/inspector-scan/rules/31-golden-colour-control.js`
	// resolves a row's state count only from a literal ArrayExpression — or a
	// `fillRow()`/`textRow()` call — it can see in THIS block's own edit.js or in
	// `src/components/`. A row moved to a block-folder sibling resolves to zero
	// states while the editor renders perfectly (D738). Never `.map()`-ed, never
	// `.filter()`-ed, never spread from a variable. Conditionality happens at
	// ARRAY level, as a spread of a TERNARY — never of a boolean-`&&`, which
	// throws (`false is not iterable`).
	//
	// ⛔ `linked: true` on every state, unconditionally — it makes
	// `DesignTokenPicker` store the palette SLUG rather than a baked hex, so a
	// client's brand token survives a re-skin (D717/D740). The row helpers set it
	// on every state they build; the two hand-written rows below set it inline.
	//
	// ⚠ `burgerColourHover` and `burgerHoverColour` are DIFFERENT attributes
	// (§8.1). The first is the button's icon/text COLOUR on hover; the second is
	// its BACKGROUND on hover. They are anagram-close and are kept apart here.
	// The background actually rendered behind a menu item, for the border rows'
	// WCAG 1.4.11 check. Unset on both → no background is known, so no check.
	const itemSurface = itemBg || navBg || '';

	// FR-41-30(b) RESOLVED 2026-09-11 — the sublink-marker colour row is
	// revealed only once the operator picks a DIFFERENT icon than the
	// declared default (chevron-right). Keyed on the ICON CHOICE, never on
	// whether a colour has been set — an unset `sublinkMarkerColour` is
	// indistinguishable from "never touched" under this block's own
	// `""`-means-unset convention, so gating on it would never reveal the
	// row for a client who cleared a colour back to blank.
	const SGS_NM_SUBLINK_MARKER_ICON_DEFAULT = { source: 'lucide', name: 'chevron-right' };
	const sublinkMarkerIconIsCustom =
		( sublinkMarkerIcon?.source ?? SGS_NM_SUBLINK_MARKER_ICON_DEFAULT.source ) !==
			SGS_NM_SUBLINK_MARKER_ICON_DEFAULT.source ||
		( sublinkMarkerIcon?.name ?? SGS_NM_SUBLINK_MARKER_ICON_DEFAULT.name ) !==
			SGS_NM_SUBLINK_MARKER_ICON_DEFAULT.name;

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
			},
			attributes,
			setAttributes,
			after: (
				<ItemTextTreatment
					value={ itemColourHoverTreatment }
					onChange={ ( val ) => setAttributes( { itemColourHoverTreatment: val } ) }
					attributes={ attributes }
				/>
			),
		} ),
		// ⛔ HAND-WRITTEN LITERAL, DELIBERATELY — the one fill row that does not
		// adopt `fillRow()`. FR-41-14 requires the CURRENT state to be omitted
		// per-STATE (never per-ROW) while the Highlight treatment is active, and a
		// conditional attribute name passed to the helper (`current: cond ? 'x' :
		// undefined`) is not a string literal, so `describeRow()` would resolve
		// this row as 2 states rather than 3 — the gate going blind while the code
		// renders correctly (D738). A spread-of-ternary inside a literal `states`
		// array stays statically countable in BOTH branches, which is why FR-41-14
		// writes it exactly this way.
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
		// ⛔ HAND-WRITTEN LITERAL, second and last. The item border declares NO
		// gradient attribute at all (FR-41-7 / §1.2 — the masked ring would collide
		// with the item background layer that already owns `{link}::before`), so
		// this row cannot legitimately be `gradientCapable`: that flag renders a
		// per-state Solid/Gradient toggle whose gradient has nowhere to be stored
		// and is discarded on save. ⚠ CONSEQUENCE, STATED NOT HIDDEN: a row that is
		// not `gradientCapable` renders `DesignTokenPicker`, which carries no
		// contrast check — so the `contrastAgainst`/`contrastLargeText` pair below
		// is DECLARED per §9.6 and is currently INERT on this row. The submenu
		// border row beneath is gradient-capable and its check does run.
		{
			key: 'item-border',
			label: __( 'Item border colour', 'sgs-blocks' ),
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
					direction={ borderHoverAnimationDirection }
					onDirectionChange={ ( val ) =>
						setAttributes( { borderHoverAnimationDirection: val } )
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
		// Normal-only, per FR-41-9 — the panel's visibility is a binary open/closed
		// disclosure, so there is no hover moment on the panel itself. Declared as
		// such in block.json::supports.sgs.colourExemptions["submenu-border"].
		// `gradientCapable` here is real: the block declares
		// submenuBorderColourGradient, so the ring path and the contrast check both
		// have somewhere to live.
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
		// FR-41-30(b) RESOLVED 2026-09-11: OMITTED (not disabled, D609 9c) unless
		// `sublinkMarkerIcon` differs from its declared chevron-right default —
		// an untouched marker keeps inheriting currentColor from the sublink's
		// own text with no row shown at all. Once revealed it gets the full
		// Normal/Hover/Current + gradient treatment like every other icon-colour
		// row (`sgs_icon_gradient_css()` render-side — see render.php).
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
	];

	return (
		<>
			{ /* ⛔ FIRST among same-group Fills — WordPress concatenates them in mount
			   order, so the Colour panel must render ahead of the `group="styles"`
			   tree below to sit at the top of the Styles tab. */ }
			<SgsColourPanel rows={ colourRows } />

			{ /* ── General tab (default InspectorControls group) ───────────── */ }
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

				<BurgerPanel
					burgerSize={ burgerSize }
					triggerMode={ triggerMode }
					triggerLabel={ triggerLabel }
					triggerIcon={ triggerIcon }
					triggerMagnetEnabled={ triggerMagnetEnabled }
					triggerMagnetRadius={ triggerMagnetRadius }
					triggerMagnetStrength={ triggerMagnetStrength }
					setAttributes={ setAttributes }
				/>

				<DropdownSettingsPanel
					navLabel={ navLabel }
					itemSmartContrast={ itemSmartContrast }
					setAttributes={ setAttributes }
					drawerRef={ drawerRef }
					submenuAlign={ submenuAlign }
					submenuCaret={ submenuCaret }
					submenuCloseGrace={ submenuCloseGrace }
				/>
			</InspectorControls>

			{ /* ── Styles tab, in §9's order: Colour (above), Typography, Menu item,
			   Submenu — Items, Submenu — Container, Effects, Featured.
			   ⛔ Every panel is mounted HERE, directly, and not behind a wrapper
			   component. Measured 2026-09-11: routing them through one extra
			   `<NavMenuPanels>` hop took inspector-scan rule 21 from 21 findings to
			   48 — its control corpus is this file plus the components this file's
			   OWN JSX renders, so a second hop makes every panel's controls
			   structurally invisible while the editor renders perfectly. That is the
			   D738 "the code improved and the gate went blind" shape, and it outranks
			   this file's line budget. ─────────────────────────────────────────── */ }
			<InspectorControls group="styles">
				<BarPanel
					gap={ gap }
					listColumns={ listColumns }
					padding={ attributes.padding }
					setAttributes={ setAttributes }
				/>

				{ /* ⛔ FR-41-22's VERBATIM `targets` mount, and it lives HERE rather
				   than inside TypographyPanel.js for a measured reason — see that
				   file's docblock. Every per-field flag, all nine `show*` plus
				   `showHover`, is on EACH TARGET ENTRY: in `targets` mode
				   TypographyControls discards `singleProps` entirely, so a flag left
				   on the outer element silently deletes nine working controls with
				   every gate green. */ }
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
								showTextIndent: true,
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
								showTextIndent: true,
								showWritingMode: true,
								showHover: true,
							},
						] }
					/>
				</TypographyPanel>

				<ItemsPanel
					itemBorderWidth={ itemBorderWidth }
					itemBorderStyle={ itemBorderStyle }
					itemBorderRadius={ itemBorderRadius }
					setAttributes={ setAttributes }
				/>

				<SubmenuItemsPanel
					sublinkMarkerIcon={ sublinkMarkerIcon }
					setAttributes={ setAttributes }
				/>

				<DropdownStylePanel
					submenuAnimation={ submenuAnimation }
					submenuTopOffset={ submenuTopOffset }
					submenuMinWidth={ submenuMinWidth }
					submenuPadding={ submenuPadding }
					submenuBorderWidth={ submenuBorderWidth }
					submenuBorderStyle={ submenuBorderStyle }
					submenuBorderRadius={ submenuBorderRadius }
					submenuShadow={ submenuShadow }
					submenuShadowColour={ submenuShadowColour }
					attributes={ attributes }
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
			</InspectorControls>

			<div { ...blockProps }>
				<ServerSideRender block="sgs/nav-menu" attributes={ attributes } />
			</div>
		</>
	);
}
