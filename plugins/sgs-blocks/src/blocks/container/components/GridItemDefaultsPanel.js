/**
 * GridItemDefaultsPanel — shared wrapper panel.
 *
 * Split out of ContainerWrapperControls.js on 2026-08-17 (Bean-requested). That file held six
 * independently-mountable shared panels in one module, which repeatedly read as a "monolith" — an
 * audit in this repo measured the decomposition by its LINE COUNT, concluded no split had happened,
 * and had to retract it. One panel per file removes the ambiguity: the split is visible in `ls`.
 *
 * Blocks may import this directly, or via ContainerWrapperControls.js which re-exports it for the
 * existing ~30 call sites.
 */

import { __ } from '@wordpress/i18n';
import {
	PanelBody,
	SelectControl,
	TextControl,
	BoxControl,
} from '@wordpress/components';
import {
	ResponsiveOverride,
	DesignTokenPicker,
	GradientCapableColourControl,
	ShadowControl,
	ResponsiveBorderRadiusControl,
	normaliseResponsiveBox,
} from '../../../components';
import { UnitControl } from '../../../components/primitives';

const GRID_ITEM_BORDER_STYLES = [
	{ label: __( '— None —', 'sgs-blocks' ), value: '' },
	{ label: __( 'Solid', 'sgs-blocks' ), value: 'solid' },
	{ label: __( 'Dashed', 'sgs-blocks' ), value: 'dashed' },
	{ label: __( 'Dotted', 'sgs-blocks' ), value: 'dotted' },
	{ label: __( 'Double', 'sgs-blocks' ), value: 'double' },
];

// Every CSS border-style keyword, NOT the subset offered by
// GRID_ITEM_BORDER_STYLES above — this parses a border shorthand that may
// already carry any of them (`1px groove red`). Narrowing it to the picker's
// options would silently mis-parse those values as a colour.
const _GRID_BORDER_STYLE_WORDS = [ 'solid', 'dashed', 'dotted', 'double', 'groove', 'ridge', 'inset', 'outset', 'none' ];

function _gridBorderParts( value ) {
	const out = { width: '', style: '', colour: '' };
	const tokens = String( value || '' ).trim().split( /\s+/ ).filter( Boolean );
	for ( const token of tokens ) {
		if ( ! out.style && _GRID_BORDER_STYLE_WORDS.includes( token.toLowerCase() ) ) {
			out.style = token.toLowerCase();
		} else if ( ! out.width && /^[\d.]+(px|rem|em|%)?$/.test( token ) ) {
			out.width = token;
		} else if ( ! out.colour ) {
			out.colour = token;
		}
	}
	return out;
}

/**
 * Rebuild the shorthand from parts, dropping empties.
 *
 * Returns '' when nothing is set, so clearing every field clears the attribute
 * rather than leaving a stray "solid" that renders an invisible 0-width border.
 *
 * @param {{width: string, style: string, colour: string}} parts Parts.
 * @return {string} Shorthand.
 */
function _gridBorderJoin( parts ) {
	const ordered = [ parts.width, parts.style, parts.colour ].filter( Boolean );
	return ordered.length ? ordered.join( ' ' ) : '';
}

// ---------------------------------------------------------------------------
// Shared option arrays — kept identical to container/edit.js
// ---------------------------------------------------------------------------

// Units offered in the grid-item BoxControl side inputs — mirrors
// ResponsiveBoxControl.js's BOX_UNITS (no responsive tiers on these attrs,
// so the plain WP-native BoxControl/BorderRadiusControl are used directly).
const GRID_ITEM_BOX_UNITS = [
	{ value: 'px', label: 'px', default: 0 },
	{ value: 'rem', label: 'rem', default: 0 },
	{ value: 'em', label: 'em', default: 0 },
	{ value: '%', label: '%', default: 0 },
	{ value: 'vw', label: 'vw', default: 0 },
];

export function GridItemDefaultsPanel( { attributes, setAttributes } ) {
	const {
		layout = 'stack',
		gridItemPadding = {},
		gridItemBackground = '',
		gridItemBackgroundHover = '',
		gridItemBackgroundGradient = '',
		gridItemBackgroundHoverGradient = '',
		gridItemBorderRadius = {},
		gridItemBorder = '',
		gridItemBorderGradient = '',
		gridItemBorderGradientHover = '',
		gridItemShadow = '',
		gridItemShadowColour = '',
		gridItemTextColour = '',
		gridItemTextColourHover = '',
		gridItemTextColourGradient = '',
		gridItemTextColourHoverGradient = '',
	} = attributes;

	if ( layout !== 'grid' ) {
		return null;
	}

	return (
		<PanelBody title={ __( 'Grid item defaults', 'sgs-blocks' ) } initialOpen={ false }>
			<p className="components-base-control__help">
				{ __(
					'Values set here become CSS custom properties (--sgs-gi-*) inherited by direct child containers in the grid. Per-child overrides still win via specificity.',
					'sgs-blocks'
				) }
			</p>
			{ /* gridItemPadding is a TIER OBJECT — ONE attr holding
			     {desktop,tablet,mobile}, each tier itself a
			     {top,right,bottom,left} box (brought in line with
			     contentBandPadding's shape, 2026-08-13 — it was the one
			     tiered box-object property in this wrapper with no
			     tablet/mobile variant). It therefore uses ResponsiveOverride,
			     which reads and writes the object, NOT a plain BoxControl
			     writing one flat attr. Do NOT revert to a flat BoxControl —
			     WordPress SILENTLY DISCARDS an attribute a block does not
			     declare (D338), and the block.json default is now
			     {desktop:{}}, not {}. Mirrors container/edit.js's
			     contentBandPadding control exactly. */ }
			{ /* ⛔ NO `label` on the wrapper, and NO `hideLabelFromVision` on the
			     BoxControl — core's BoxControl ignores that prop and always renders
			     its own label, so both painted. Keep BoxControl's (BaseControl
			     associates it with the inputs). Full reasoning at
			     components/ResponsiveBoxControls.js. */ }
			<ResponsiveOverride
				value={ gridItemPadding }
				onChange={ ( obj ) => setAttributes( { gridItemPadding: obj } ) }
			>
				{ ( { ownValue, setOwnValue } ) => (
					<BoxControl
						label={ __( 'Padding', 'sgs-blocks' ) }
						values={ ownValue && typeof ownValue === 'object' ? ownValue : {} }
						splitOnAxis={ false }
						units={ GRID_ITEM_BOX_UNITS }
						onChange={ ( next ) => setOwnValue( normaliseResponsiveBox( next ) ) }
						__next40pxDefaultSize
					/>
				) }
			</ResponsiveOverride>
			<DesignTokenPicker
				label={ __( 'Background colour', 'sgs-blocks' ) }
				states={ [
					{
						key: 'normal',
						label: __( 'Normal', 'sgs-blocks' ),
						value: gridItemBackground,
						onChange: ( val ) => setAttributes( { gridItemBackground: val ?? '' } ),
						gradientValue: gridItemBackgroundGradient,
						onGradientChange: ( val ) =>
							setAttributes( { gridItemBackgroundGradient: val ?? '' } ),
					},
					{
						key: 'hover',
						label: __( 'Hover', 'sgs-blocks' ),
						value: gridItemBackgroundHover,
						onChange: ( val ) => setAttributes( { gridItemBackgroundHover: val ?? '' } ),
						gradientValue: gridItemBackgroundHoverGradient,
						onGradientChange: ( val ) =>
							setAttributes( { gridItemBackgroundHoverGradient: val ?? '' } ),
					},
				] }
			/>
			{ /* Canonical per contract §14.1: the wrapper, not the raw primitive.
			     Fixed 2026-08-11 (P-SPEC35-BORDER-RESIDUALS) — this mounted the
			     raw `BorderRadiusControl`, which the survey could not see at all
			     until it learned to search shared component files, so all four
			     blocks using this panel read as "declared + rendered + NO
			     CONTROL". `showResponsive={ false }` because gridItemBorderRadius
			     has no Tablet/Mobile siblings: same base-only shape §14 already
			     uses on heading/quote/text. */ }
			<ResponsiveBorderRadiusControl
				label={ __( 'Border radius', 'sgs-blocks' ) }
				showResponsive={ false }
				values={ { base: gridItemBorderRadius ?? {} } }
				onChange={ ( _tier, next ) => setAttributes( { gridItemBorderRadius: next } ) }
			/>
			{ /* ⛔ WAS a raw <TextControl __next40pxDefaultSize > taking a CSS border shorthand — the
			     exact banned lookalike in contract §14.3 ("a TextControl taking a
			     raw CSS `border` shorthand"). It accepted invalid CSS, offered no
			     unit affordance and no colour picker, and served FOUR blocks
			     through this one panel. Replaced 2026-08-11
			     (P-SPEC35-BORDER-RESIDUALS item 1) with a real builder giving
			     §14 field 2's required props: a width UnitControl with a units
			     array, a style dropdown, and a token-aware colour picker.

			     ⚠ It writes the SAME shorthand STRING to the SAME attribute, so
			     there is no value-domain change and no stored-content migration —
			     which is why this, rather than core's `__experimentalBorderBoxControl`,
			     is the right shape here: that component works in a
			     {color,style,width} OBJECT and adopting it would force a content
			     migration on every stored instance for no user-visible gain. */ }
			<div className="sgs-grid-item-border-builder">
				<UnitControl
					label={ __( 'Border width', 'sgs-blocks' ) }
					value={ _gridBorderParts( gridItemBorder ).width }
					units={ GRID_ITEM_BOX_UNITS }
					onChange={ ( val ) => setAttributes( {
						gridItemBorder: _gridBorderJoin( { ..._gridBorderParts( gridItemBorder ), width: val || '' } ),
					} ) }
					__next40pxDefaultSize
				/>
				<SelectControl
					label={ __( 'Border style', 'sgs-blocks' ) }
					value={ _gridBorderParts( gridItemBorder ).style }
					options={ GRID_ITEM_BORDER_STYLES }
					onChange={ ( val ) => setAttributes( {
						gridItemBorder: _gridBorderJoin( { ..._gridBorderParts( gridItemBorder ), style: val } ),
					} ) }
					__nextHasNoMarginBottom
					__next40pxDefaultSize
				/>
				{ /* ONE row, two states (Part O §1 fields 9a/9b — one control shape,
				     states live inside the popover, never sibling controls). Was
				     TWO SEPARATE DesignTokenPicker mounts (a below-min-states finding
				     each) until this consolidation. Hover has no resting-state solid
				     colour of its own (gridItemBorder has never had a hover twin) so
				     its "Solid" branch has nothing to write to and just clears the
				     hover gradient (DesignTokenPicker's existing rule — switching to
				     Solid always clears the stored gradient), which is the correct
				     "no hover override" state — unchanged behaviour, new shape. */ }
				<DesignTokenPicker
					label={ __( 'Border colour', 'sgs-blocks' ) }
					states={ [
						{
							key: 'normal',
							label: __( 'Normal', 'sgs-blocks' ),
							value: _gridBorderParts( gridItemBorder ).colour,
							onChange: ( val ) => setAttributes( {
								gridItemBorder: _gridBorderJoin( { ..._gridBorderParts( gridItemBorder ), colour: val || '' } ),
							} ),
							// D636 border-gradient rollout (residual scope, 2026-08-17) —
							// gridItemBorder stays a plain shorthand string (width/style);
							// the gradient is a SIBLING attribute painting only the colour,
							// same pattern as every other block in this rollout.
							gradientValue: gridItemBorderGradient,
							onGradientChange: ( val ) => setAttributes( { gridItemBorderGradient: val ?? '' } ),
						},
						{
							key: 'hover',
							label: __( 'Hover', 'sgs-blocks' ),
							value: '',
							onChange: () => {},
							gradientValue: gridItemBorderGradientHover,
							onGradientChange: ( val ) => setAttributes( { gridItemBorderGradientHover: val ?? '' } ),
						},
					] }
				/>
			</div>
			<ShadowControl
				label={ __( 'Shadow', 'sgs-blocks' ) }
				value={ gridItemShadow }
				onChange={ ( val ) => setAttributes( { gridItemShadow: val } ) }
				colour={ gridItemShadowColour }
				onColourChange={ ( val ) => setAttributes( { gridItemShadowColour: val } ) }
			/>
			{ /* GradientCapableColourControl, NOT DesignTokenPicker — text needs
			     background-clip:text, which DesignTokenPicker has no mechanism for
			     at all (its per-state gradientValue toggle paints a background
			     gradient BEHIND the text). SgsColourPanel switches between the two
			     via a row-level `gradientCapable` flag, but this panel mounts
			     controls directly (no SgsColourPanel), so that flag does nothing on
			     a bare DesignTokenPicker — the component itself must change. Same
			     trap this session's Step 3 negative control caught on sgs/container
			     and sgs/cta-section's OWN root text rows. */ }
			{ /* Contrast warning: text defaults are paired with background defaults
			     set in this same panel. When a grid item child uses both defaults
			     (no override), the text renders on the background. Warn if that
			     pairing lacks WCAG AA contrast. `contrastAgainst` only accepts a
			     FLAT colour/token — when `gridItemBackgroundGradient` is also set,
			     the gradient (not the flat colour) is what actually paints, so the
			     check is skipped in that case rather than comparing against a
			     surface that isn't rendered. */ }
			<GradientCapableColourControl
				label={ __( 'Text colour', 'sgs-blocks' ) }
				contrastAgainst={
					gridItemBackground && ! gridItemBackgroundGradient
						? gridItemBackground
						: ''
				}
				states={ [
					{
						key: 'normal',
						label: __( 'Normal', 'sgs-blocks' ),
						value: gridItemTextColour,
						onChange: ( val ) => setAttributes( { gridItemTextColour: val ?? '' } ),
						gradientValue: gridItemTextColourGradient,
						onGradientChange: ( val ) =>
							setAttributes( { gridItemTextColourGradient: val ?? '' } ),
					},
					{
						key: 'hover',
						label: __( 'Hover', 'sgs-blocks' ),
						value: gridItemTextColourHover,
						onChange: ( val ) => setAttributes( { gridItemTextColourHover: val ?? '' } ),
						gradientValue: gridItemTextColourHoverGradient,
						onGradientChange: ( val ) =>
							setAttributes( { gridItemTextColourHoverGradient: val ?? '' } ),
					},
				] }
			/>
		</PanelBody>
	);
}

// ---------------------------------------------------------------------------
// ResponsiveSpacingPanel — DELETED 2026-08-10 (Spec 35 Phase 1.4).
// ---------------------------------------------------------------------------
//
// It rendered 16 tablet/mobile spacing controls writing paddingTopTablet /
// marginLeftMobile / etc. NO block.json anywhere declares those attributes, and
// WordPress SILENTLY DISCARDS an undeclared attribute — so a client could set
// tablet padding, save, and watch it vanish with no error, no warning and no
// failing gate. Verified three ways before deletion: no declaration in any
// block.json, no consumption in any render.php or the shared wrapper, and only
// ONE live mount (sgs/gallery).
//
// Its desktop tier was also structurally hollow — both Padding and Margin
// returned a <p> reading "set in the Dimensions panel above" instead of a
// control, because desktop spacing came from WP native supports.spacing while
// the tiers came from SGS attrs. inspector-scan rule 26 flagged both.
//
// Replaced by ResponsiveBoxControls (Spec 37 FR-37-16), which owns padding,
// margin, max-width and content-width on ONE {desktop,tablet,mobile} object
// model with a real control on every tier. sgs/gallery was migrated onto it in
// the same commit; site-header-row / site-footer-row / nav-menu were already
// there. ⛔ Do not reintroduce a flat per-side tier panel.
// ---------------------------------------------------------------------------
// ContentBandPanel — DELETED 2026-08-12 (Spec 35, check-shared-panel-schema
// triage). EVERY ONE of its 13 controls was dead, on EVERY block that mounted
// it. Measured, not assumed:
//
//  1. Band padding (12 controls) wrote FLAT `contentBandPaddingTop` /
//     `…TopTablet` / `…TopMobile` etc. The D580 box-tier migration moved every
//     block to ONE object-typed `contentBandPadding`, so as of that commit
//     ZERO block.json anywhere declares a single flat key this panel wrote —
//     and WordPress SILENTLY DISCARDS a write to an undeclared attribute
//     (D338). `cta-section/edit.js:20` already carried a comment recording
//     exactly this ("ContentBandPanel sub-panels still write to LEGACY FLAT
//     attrs"), which is WHY that block refused to mount the aggregator. Known,
//     never fixed, invisible to every gate: `check-shared-panel-schema.js`
//     cannot see these keys because they are COMPUTED (`side[breakpoint]`),
//     not literals.
//
//  2. Band background wrote `contentBandBackground`, undeclared on all 12
//     blocks that mounted this panel (it reached the inspector only through
//     KIND_PANELS.layout). The capability itself is now RETIRED framework-wide
//     — Bean-ruled 2026-08-12: a background colour or media fills the max-width
//     of its CONTAINER and is never clipped to the inner content layer, so a
//     band-scoped background was a design error, not a missing declaration.
//     Zero stored instances existed on the canary (verified by DB query before
//     deletion), so nothing to migrate.
//
// The blocks that genuinely HAVE a content band (container, cta-section, hero,
// physics-canvas, site-header, site-footer, trust-bar) never mounted this panel
// — each controls its own `contentBandPadding` locally with the canonical
// <ResponsiveBoxControl> against the object-shaped attr. That is the working
// path and it is untouched.
//
// ⛔ Do not reintroduce a shared band panel writing flat per-side tier keys.
// If band padding is ever wanted on a layout-kind composite, the additive fix
// is a <ResponsiveBoxControl> against a declared object-typed
// `contentBandPadding` — same shape those seven blocks already use.
//
// Same defect class + same remedy as `sgs/gallery`'s mount (D586, `69d1a3d8`)
// and ResponsiveSpacingPanel's tombstone above.
// ---------------------------------------------------------------------------

// ---------------------------------------------------------------------------
// GridAreaPanel — DELETED 2026-08-16 (D639). Tombstone, do not resurrect.
//
// Built 2026-06-11 (65a3536a) as the shared home for per-area padding/background
// on a block declaring `supports.sgs.gridAreas`. It was NEVER mounted, and by
// the time anyone looked it was wrong in three independent ways:
//
//  1. UNREACHABLE, twice over. Its only JSX mount was KIND_PANELS.section entry
//     5, and an AST census of all 17 <ContainerWrapperControls> mounts found 12
//     'layout' + 5 'content' and ZERO 'section'. The section array is only the
//     unknown-kind fallback. It also needed a `gridAreas` prop no consumer passes.
//  2. STALE STORAGE. It wrote the flat per-side schema (`contentPaddingTop`/
//     `…Tablet`/`…Mobile`) — 13 of 14 attrs per area — which stopped existing when
//     D580 migrated that storage to box OBJECTS on 2026-08-11. Mounting it would
//     have shipped a client control that silently DELETED the value on every use.
//  3. SUPERSEDED. `sgs/hero` re-grew its own object-shaped controls for exactly
//     these attributes — "Content padding" (hero/edit.js) and "Media padding".
//
// `supports.sgs.gridAreas` went with it: it had no consumer and needs none. The
// LIVE per-area route is `assembly.py` step 3d, which walks the section root's
// children and derives each area name from the DRAFT's own BEM ELEMENT TOKEN
// (`db_lookup.parse_sgs_bem( cls ).element` — `sgs-hero__content` -> area
// `content`), then routes that node's box CSS via `route_area_css_to_block_attrs`
// -> `db.attr_for_area_property( block, area, prop )`. The destination gate is the
// block declaring `<area>+<Suffix>` attrs; no flag is consulted at any hop.
// `assembly.py:250` states it directly: "no gridAreas lookup is needed". The
// declaration was redundant by construction — "hero has areas content and media"
// is already fully derivable from hero declaring `contentPadding`/`mediaPadding`.
//
// ⚠ MECHANISM CORRECTED 2026-08-16 by the closing /qc-council. This tombstone
// first credited `resolvers/grid_area.py` + `fold_helpers.grid_item_areas()`
// (reading `grid-template-areas` CSS). BOTH ARE DEAD IN PRODUCTION:
// `grid_item_areas()` has ZERO callers, and `grid_area.py`'s layer is gated on
// `ctx.area_name`, which no production `Ctx(...)` ever sets (only three test
// files do). The conclusion was right and is stronger under the real mechanism —
// but the citation was repeated from a docstring instead of re-derived, which is
// the SAME error D637 made and this session twice caught. See D639's council
// close-out; the dead-code cleanup is tracked separately, not done here.
//
// ⛔ `check-wrapper-capability-preconditions.js` rule 2 now FAILS the build on any
// `supports.sgs.gridAreas` declaration, so this cannot quietly come back.
// ---------------------------------------------------------------------------


// ---------------------------------------------------------------------------
// KIND → CONTROLS map
// ---------------------------------------------------------------------------
//
// Defines which sub-panels render for each kind value.
// Entries are render functions that receive ({ attributes, setAttributes }).
//
