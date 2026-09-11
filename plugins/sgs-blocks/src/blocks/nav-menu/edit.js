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
import { SelectControl } from '@wordpress/components';
import { useBlockProps, InspectorControls } from '@wordpress/block-editor';
import ServerSideRender from '@wordpress/server-side-render';
import { SgsColourPanel, fillRow, textRow } from '../../components';
// Read-only static import of this block's own manifest — the SAME thing
// `index.js` already does, and the ONE declared source for the Sweep-eligibility
// predicate (FR-41-26). It does not modify the frozen block.json.
import metadata from './block.json';
import {
	sweepEligible,
	TreatmentSelect,
	CrossRefNote,
	TREATMENT_NONE,
	TREATMENT_SWAP,
	TREATMENT_SWEEP,
	TREATMENT_HIGHLIGHT,
} from './ColourTreatment';
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
		itemBg,
		itemBgCurrent,
		itemBgCurrentGradient,
		itemBgGradient,
		itemBgHover,
		itemBgHoverGradient,
		itemBorderColour,
		itemBorderColourCurrent,
		itemBorderColourHover,
		submenuBorderColour,
		submenuBorderColourGradient,
		featuredRadius,
		featuredRadiusHover,
		featuredFontWeight,
		featuredFontWeightHover,
		burgerSize,
		itemColourHoverTreatment,
		itemBgHoverTreatment,
		itemBorderHoverTreatment,
		borderHoverAnimationDirection,
		submenuColourHoverTreatment,
		submenuLinkBgHoverTreatment,
		burgerColourHoverTreatment,
		burgerBgHoverTreatment,
		itemMagnetEnabled,
		submenuAlign,
		submenuCaret,
		submenuCloseGrace,
		submenuMinWidth,
		submenuPadding,
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
	const sweepRules = metadata?.supports?.sgs?.sweepEligibility;

	// The background actually rendered behind a menu item, for the border rows'
	// WCAG 1.4.11 check. Unset on both → no background is known, so no check.
	const itemSurface = itemBg || navBg || '';

	const smartContrastNote = __(
		'Automatic readable-text checking for these colours is switched on under General → Accessibility.',
		'sgs-blocks'
	);

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
				<>
					<TreatmentSelect
						label={ __( 'Text on hover', 'sgs-blocks' ) }
						value={ itemColourHoverTreatment }
						onChange={ ( val ) =>
							setAttributes( { itemColourHoverTreatment: val } )
						}
						options={ [
							TREATMENT_NONE,
							TREATMENT_SWAP,
							...( sweepEligible(
								sweepRules,
								'itemColourHoverTreatment',
								attributes
							)
								? [ TREATMENT_SWEEP ]
								: [] ),
						] }
						help={ __(
							'Sweep travels the Hover colour across the word instead of switching to it instantly.',
							'sgs-blocks'
						) }
					/>
					<CrossRefNote>{ smartContrastNote }</CrossRefNote>
				</>
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
				<>
					<TreatmentSelect
						label={ __( 'Background on hover', 'sgs-blocks' ) }
						value={ itemBgHoverTreatment }
						onChange={ ( val ) => setAttributes( { itemBgHoverTreatment: val } ) }
						options={ [ TREATMENT_NONE, TREATMENT_SWAP, TREATMENT_HIGHLIGHT ] }
						help={ __(
							'Highlight paints one shape that slides between items, using the Hover colour you picked above. It replaces each item’s own current-page background, so that swatch is hidden while it’s selected.',
							'sgs-blocks'
						) }
					/>
					<CrossRefNote>{ smartContrastNote }</CrossRefNote>
				</>
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
				<>
					<TreatmentSelect
						label={ __( 'Border on hover', 'sgs-blocks' ) }
						value={ itemBorderHoverTreatment }
						onChange={ ( val ) =>
							setAttributes( { itemBorderHoverTreatment: val } )
						}
						options={ [ TREATMENT_NONE, TREATMENT_SWAP, TREATMENT_SWEEP ] }
					/>
					{ 'sweep' === itemBorderHoverTreatment && (
						<SelectControl
							label={ __( 'Sweep direction', 'sgs-blocks' ) }
							value={ borderHoverAnimationDirection || 'left-to-right' }
							options={ [
								{
									label: __( 'Left to right', 'sgs-blocks' ),
									value: 'left-to-right',
								},
								{
									label: __( 'Right to left', 'sgs-blocks' ),
									value: 'right-to-left',
								},
							] }
							onChange={ ( val ) =>
								setAttributes( { borderHoverAnimationDirection: val } )
							}
							__nextHasNoMarginBottom
							__next40pxDefaultSize
						/>
					) }
					<CrossRefNote>
						{ __(
							'This changes the line around the item. To underline the menu word itself instead, use Decoration (hover) under Typography — they’re separate settings and don’t do the same thing.',
							'sgs-blocks'
						) }
					</CrossRefNote>
				</>
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
				<TreatmentSelect
					label={ __( 'Link text on hover', 'sgs-blocks' ) }
					value={ submenuColourHoverTreatment }
					onChange={ ( val ) =>
						setAttributes( { submenuColourHoverTreatment: val } )
					}
					options={ [
						TREATMENT_NONE,
						TREATMENT_SWAP,
						...( sweepEligible(
							sweepRules,
							'submenuColourHoverTreatment',
							attributes
						)
							? [ TREATMENT_SWEEP ]
							: [] ),
					] }
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
				<TreatmentSelect
					label={ __( 'Link background on hover', 'sgs-blocks' ) }
					value={ submenuLinkBgHoverTreatment }
					onChange={ ( val ) =>
						setAttributes( { submenuLinkBgHoverTreatment: val } )
					}
					options={ [ TREATMENT_NONE, TREATMENT_SWAP ] }
				/>
			),
		} ),
		// Normal-only by design (FR-41-30b): the marker is aria-hidden decoration
		// beside the sublink's own text, and an unset value inherits currentColor
		// from that text — so it already follows Hover and Current for free.
		textRow( {
			key: 'sublink-marker',
			label: __( 'Sublink marker colour', 'sgs-blocks' ),
			attrs: { base: 'sublinkMarkerColour' },
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
				<TreatmentSelect
					label={ __( 'Icon on hover', 'sgs-blocks' ) }
					value={ burgerColourHoverTreatment }
					onChange={ ( val ) =>
						setAttributes( { burgerColourHoverTreatment: val } )
					}
					options={ [
						TREATMENT_NONE,
						TREATMENT_SWAP,
						...( sweepEligible(
							sweepRules,
							'burgerColourHoverTreatment',
							attributes
						)
							? [ TREATMENT_SWEEP ]
							: [] ),
					] }
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
				<TreatmentSelect
					label={ __( 'Button background on hover', 'sgs-blocks' ) }
					value={ burgerBgHoverTreatment }
					onChange={ ( val ) =>
						setAttributes( { burgerBgHoverTreatment: val } )
					}
					options={ [ TREATMENT_NONE, TREATMENT_SWAP ] }
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
