/**
 * LayoutPanel — shared wrapper panel.
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
import { SelectControl, RangeControl, TextControl } from '@wordpress/components';
import {
	ColumnShapePicker,
	ResponsiveControl,
	ResponsiveOverride,
	SgsLengthControl,
	SpacingControl,
} from '../../../components';
import { ToggleGroupControl, ToggleGroupControlOption } from '../../../components/primitives';
import { isExtensionEnabled } from '../../extensions/hide-extensions';

const LAYOUT_OPTIONS = [
	{ label: __( 'Flex', 'sgs-blocks' ), value: 'flex' },
	{ label: __( 'Stack', 'sgs-blocks' ), value: 'stack' },
	{ label: __( 'Grid', 'sgs-blocks' ), value: 'grid' },
];

const ALIGN_OPTIONS = [
	{ label: __( 'Top', 'sgs-blocks' ), value: 'start' },
	{ label: __( 'Centre', 'sgs-blocks' ), value: 'center' },
	{ label: __( 'Bottom', 'sgs-blocks' ), value: 'end' },
	{ label: __( 'Stretch', 'sgs-blocks' ), value: 'stretch' },
];

const JUSTIFY_ITEMS_OPTIONS = [
	{ label: __( 'Stretch', 'sgs-blocks' ), value: 'stretch' },
	{ label: __( 'Start', 'sgs-blocks' ), value: 'start' },
	{ label: __( 'Centre', 'sgs-blocks' ), value: 'center' },
	{ label: __( 'End', 'sgs-blocks' ), value: 'end' },
];

const ALIGN_CONTENT_OPTIONS = [
	{ label: __( 'Stretch', 'sgs-blocks' ), value: 'stretch' },
	{ label: __( 'Start', 'sgs-blocks' ), value: 'start' },
	{ label: __( 'Centre', 'sgs-blocks' ), value: 'center' },
	{ label: __( 'End', 'sgs-blocks' ), value: 'end' },
	{ label: __( 'Space between', 'sgs-blocks' ), value: 'space-between' },
	{ label: __( 'Space around', 'sgs-blocks' ), value: 'space-around' },
	{ label: __( 'Space evenly', 'sgs-blocks' ), value: 'space-evenly' },
];

export function LayoutPanel( {
	attributes,
	setAttributes,
	showLayout = true,
	// P2-5: minColumnWidth/minColumnWidthUnit are declared ONLY on sgs/container's
	// own block.json today. LayoutPanel is shared by ~30 blocks (see file header);
	// rendering this control unconditionally would destructure an attribute most
	// callers' schemas don't declare, which WordPress silently discards on save
	// (caught live by check-undeclared-attrs.py flagging sgs/cta-section,
	// sgs/gallery, sgs/trust-bar). Opt-in, same shape as `showLayout` above — a
	// caller whose own block.json declares supports.sgs.intrinsicColumns passes
	// true.
	enableIntrinsicColumns = false,
	// ADDITIVE OPT-IN, DEFAULTING OFF — mirrors `showLayout` above. LayoutPanel
	// is shared by ~20 blocks via ContainerWrapperControls; shipping the
	// ColumnShapePicker unconditionally inside "Custom column template" would
	// hit every one of them. Bean's ruling (2026-08-27): only a caller that
	// explicitly opts in gets the picker, so today that is `sgs/container`'s
	// own edit.js alone. When true, the picker REPLACES the raw TextControl
	// for the SAME `gridTemplateColumns` tier (never both) — two controls
	// writing one attribute is the silent-data-loss trap `showLayout`'s own
	// docblock warns about two panels up.
	enableColumnShapePicker = false,
} ) {
	const {
		layout = 'flex',
		alignItems = 'start',
		justifyItems = 'stretch',
		alignContent = 'stretch',
		// columns, gridTemplateColumns, gridTemplateRows and minColumnWidth are
		// TIER OBJECTS (columns: pass 4; grid template props: pass 3a/3b;
		// minColumnWidth: P2-5) and are read via attributes.columns /
		// attributes.gridTemplateColumns / attributes.gridTemplateRows /
		// attributes.minColumnWidth at their controls below, not destructured
		// with a scalar default — which would mask the object.
		gridAutoRows = '',
	} = attributes;
	// minColumnWidthUnit is read inline (attributes.minColumnWidthUnit) inside the
	// enableIntrinsicColumns-gated block below, not destructured here — it is only
	// ever declared on a caller whose own block.json opts in (see the prop
	// docblock above), and destructuring it unconditionally at the top of a
	// shared component used by ~30 blocks is exactly what check-undeclared-attrs
	// flags (caught live on sgs/cta-section, sgs/gallery, sgs/trust-bar).

	return (
		<>
			{ showLayout && (
				<ToggleGroupControl
					label={ __( 'Layout type', 'sgs-blocks' ) }
					value={ layout }
					onChange={ ( val ) => setAttributes( { layout: val } ) }
					isBlock
					__nextHasNoMarginBottom
					__next40pxDefaultSize
				>
					{ LAYOUT_OPTIONS.map( ( opt ) => (
						<ToggleGroupControlOption
							key={ opt.value }
							value={ opt.value }
							label={ opt.label }
						/>
					) ) }
				</ToggleGroupControl>
			) }

			{ /*
				  Columns is a TIER OBJECT — ONE attr holding {desktop,tablet,mobile}
				  (Spec 35 pass 4, 2026-08-11). It must therefore use
				  ResponsiveOverride, which reads and writes the object, NOT
				  ResponsiveControl, which writes one flat attr per tier.

				  ⛔ Do NOT revert this to `ResponsiveControl` + an attrMap of
				  `{desktop:'columns', tablet:'columnsTablet', mobile:'columnsMobile'}`.
				  `columnsTablet`/`columnsMobile` are no longer declared by ANY
				  block.json, and WordPress SILENTLY DISCARDS an attribute a
				  block does not declare (D338) — so both tiers would save
				  nothing. The desktop branch is worse: it would write a NUMBER
				  into an attr declared `"type":"object"`, and a flat value on
				  an object-typed attr is coerced to the default, dropping the
				  whole setting (D563's gap regression, same bug class).
				  Mirrors the Gap control above.
			*/ }
			{ showLayout && layout === 'grid' && (
				<ResponsiveOverride
					label={ __( 'Columns', 'sgs-blocks' ) }
					value={ attributes.columns }
					onChange={ ( obj ) => setAttributes( { columns: obj } ) }
				>
					{ ( { tier, ownValue, effectiveValue, setOwnValue } ) => (
						<RangeControl
							value={
								ownValue !== ''
									? ownValue
									: ( effectiveValue !== ''
										? effectiveValue
										: ( tier === 'mobile' ? 1 : 2 ) )
							}
							onChange={ setOwnValue }
							min={ 1 }
							max={ tier === 'mobile' ? 3 : 6 }
							__nextHasNoMarginBottom
							__next40pxDefaultSize
						/>
					) }
				</ResponsiveOverride>
			) }

			{ /*
				  Gap is a TIER OBJECT — ONE attr holding {desktop,tablet,mobile}
				  (Spec 35 pass 1, 2026-08-10). It must therefore use
				  ResponsiveOverride, which reads and writes the object, NOT
				  ResponsiveControl, which writes one flat attr per tier.

				  ⛔ Do NOT revert this to `ResponsiveControl` + an attrMap of
				  `{desktop:'gap', tablet:'gapTablet', mobile:'gapMobile'}`.
				  `gapTablet`/`gapMobile` are no longer declared by ANY
				  block.json, and WordPress SILENTLY DISCARDS an attribute a
				  block does not declare (D338) — so both tiers saved nothing.
				  The desktop branch was worse: it wrote a STRING into an attr
				  declared `"type":"object"`, and a flat value on an
				  object-typed attr is coerced to the default, dropping the
				  whole setting. Mirrors site-header-row/edit.js:397.
			*/ }
			<ResponsiveOverride
				label={ __( 'Gap', 'sgs-blocks' ) }
				value={ attributes.gap }
				onChange={ ( obj ) => setAttributes( { gap: obj } ) }
			>
				{ ( { ownValue, effectiveValue, inherited, setOwnValue } ) => (
					<SpacingControl
						freeInput
						value={ ownValue }
						placeholder={ inherited ? effectiveValue : '' }
						onChange={ setOwnValue }
					/>
				) }
			</ResponsiveOverride>

			{ /*
				  Vertical alignment (`align-items`) and Justify content (`justify-content`)
				  are BOTH honoured by the shared PHP wrapper for flex AND stack — Stack fixes
				  the axis (always column) but still reads `verticalAlign`/`justifyContent`
				  (class-sgs-container-wrapper.php, Stack branch, ~line 1341). Flex direction
				  and Flex wrap are flex-only: Stack's wrapper never reads `flexDirection`
				  (the axis is fixed, not derived from it) and coerces `flex-wrap` to `nowrap`
				  outright, so offering either control under Stack would be a dead control
				  (`check-dead-controls.js`).
			*/ }
			{ ( layout === 'flex' || layout === 'stack' || layout === 'grid' ) && (
				<SelectControl
					label={ __( 'Align items', 'sgs-blocks' ) }
					value={ alignItems }
					options={ ALIGN_OPTIONS }
					onChange={ ( val ) => setAttributes( { alignItems: val } ) }
					__nextHasNoMarginBottom
					__next40pxDefaultSize
				/>
			) }

			{ layout === 'flex' && (
				<>
					<SelectControl
						label={ __( 'Flex direction', 'sgs-blocks' ) }
						value={ attributes.flexDirection || '' }
						options={ [
							{ label: __( 'Row', 'sgs-blocks' ), value: '' },
							{ label: __( 'Row reverse', 'sgs-blocks' ), value: 'row-reverse' },
							{ label: __( 'Column', 'sgs-blocks' ), value: 'column' },
							{ label: __( 'Column reverse', 'sgs-blocks' ), value: 'column-reverse' },
						] }
						onChange={ ( val ) => setAttributes( { flexDirection: val } ) }
						__nextHasNoMarginBottom
						__next40pxDefaultSize
					/>
					<SelectControl
						label={ __( 'Flex wrap', 'sgs-blocks' ) }
						value={ attributes.flexWrap || 'wrap' }
						options={ [
							{ label: __( 'Wrap', 'sgs-blocks' ), value: 'wrap' },
							{ label: __( 'No wrap', 'sgs-blocks' ), value: 'nowrap' },
						] }
						onChange={ ( val ) => setAttributes( { flexWrap: val } ) }
						__nextHasNoMarginBottom
						__next40pxDefaultSize
					/>
				</>
			) }

			{ ( layout === 'flex' || layout === 'stack' ) && (
				<SelectControl
					label={ __( 'Justify content', 'sgs-blocks' ) }
					value={ attributes.justifyContent || '' }
					options={ [
						{ label: __( '— default —', 'sgs-blocks' ), value: '' },
						{ label: __( 'Start', 'sgs-blocks' ), value: 'flex-start' },
						{ label: __( 'Centre', 'sgs-blocks' ), value: 'center' },
						{ label: __( 'End', 'sgs-blocks' ), value: 'flex-end' },
						{ label: __( 'Space between', 'sgs-blocks' ), value: 'space-between' },
						{ label: __( 'Space around', 'sgs-blocks' ), value: 'space-around' },
						{ label: __( 'Space evenly', 'sgs-blocks' ), value: 'space-evenly' },
					] }
					onChange={ ( val ) => setAttributes( { justifyContent: val } ) }
					__nextHasNoMarginBottom
					__next40pxDefaultSize
				/>
			) }

			{ layout === 'grid' && (
				<>
					<hr style={ { margin: '16px 0' } } />
					<p
						className="components-base-control__label"
						style={ { fontWeight: 600, marginBottom: '8px' } }
					>
						{ __( 'Advanced grid layout', 'sgs-blocks' ) }
					</p>

					{ /*
						  `gridTemplateColumns` is a TIER OBJECT (Spec 35 pass 3a) — ONE
						  attr holding {desktop,tablet,mobile}, so it uses
						  ResponsiveOverride. The `gridTemplateColumnsTablet` /
						  `…Mobile` siblings are no longer declared by any block.json;
						  writing them through ResponsiveControl would save nothing
						  (D338) while the desktop branch wrote a string into an
						  object-typed attr and destroyed the setting (D563).

						  `enableColumnShapePicker` gates which control writes this
						  SAME attr — the raw TextControl (default, every other
						  caller) OR the diagram picker (`sgs/container` only,
						  FR-37-42). Never both: two controls bound to one attribute
						  is the silent-data-loss shape `showLayout`'s docblock
						  already warns about, and site-footer-row's own mount
						  resolved it the same way — the picker replaces the raw
						  field entirely rather than sitting alongside it.
						*/ }
					<ResponsiveOverride
						label={ __( 'Custom column template', 'sgs-blocks' ) }
						value={ attributes.gridTemplateColumns }
						onChange={ ( obj ) => setAttributes( { gridTemplateColumns: obj } ) }
					>
						{ ( { ownValue, effectiveValue, inherited, setOwnValue, tier } ) =>
							enableColumnShapePicker ? (
								<ColumnShapePicker
									// The shape list depends on how many columns THIS
									// tier actually shows, so read the count for the
									// SAME tier rather than always the desktop one —
									// a 4-column desktop and a 2-column tablet offer
									// different shapes. Falls back to `2`, this
									// block's own declared `columns.desktop` default
									// (site-footer-row falls back to `3`, its own
									// default — the fallback always mirrors the
									// owning block's default, never a shared literal).
									count={
										( attributes.columns &&
											attributes.columns[ tier ] ) ||
										( attributes.columns &&
											attributes.columns.desktop ) ||
										2
									}
									value={
										( inherited
											? effectiveValue
											: ownValue ) || ''
									}
									onChange={ ( track ) =>
										setOwnValue( track || undefined )
									}
									// No `label` here on purpose: the wrapping
									// <ResponsiveOverride> already renders the
									// visible one, and two copies is a real defect
									// (inspector-scan rule 29) — same reasoning as
									// site-footer-row's mount.
								/>
							) : (
								<TextControl
									value={ ownValue || '' }
									placeholder={ inherited ? effectiveValue || '' : '' }
									onChange={ ( val ) => setOwnValue( val ) }
									help={ __(
										"CSS grid-template-columns e.g. '5fr 3fr' or 'repeat(3,minmax(0,1fr))'. Leave empty to use the column count above — on tablet or mobile, empty inherits the tier above.",
										'sgs-blocks'
									) }
									__nextHasNoMarginBottom
									__next40pxDefaultSize
								/>
							)
						}
					</ResponsiveOverride>

					{ /*
						  `gridTemplateRows` is a TIER OBJECT (Spec 35 pass 3b) — same
						  shape as `gridTemplateColumns` above, so it uses
						  ResponsiveOverride. The `gridTemplateRowsTablet` /
						  `…Mobile` siblings are no longer declared by any block.json
						  once a block is migrated — writing them through
						  ResponsiveControl would save nothing (D338) while the
						  desktop branch wrote a string into an object-typed attr
						  and destroyed the setting (same class as D563).
						*/ }
					<ResponsiveOverride
						label={ __( 'Row template', 'sgs-blocks' ) }
						value={ attributes.gridTemplateRows }
						onChange={ ( obj ) => setAttributes( { gridTemplateRows: obj } ) }
					>
						{ ( { ownValue, effectiveValue, inherited, setOwnValue } ) => (
							<TextControl
								value={ ownValue || '' }
								placeholder={ inherited ? effectiveValue || '' : '' }
								onChange={ ( val ) => setOwnValue( val ) }
								help={ __(
									"CSS grid-template-rows e.g. 'auto 1fr'. Leave empty to inherit the tier above, or for browser default on desktop.",
									'sgs-blocks'
								) }
								__nextHasNoMarginBottom
								__next40pxDefaultSize
							/>
						) }
					</ResponsiveOverride>

					{ enableIntrinsicColumns && (
						<>
							{ /*
								  `minColumnWidth` is a TIER OBJECT (P2-5) — same shape as
								  `gridTemplateColumns` above, so it uses ResponsiveOverride.
								  Unlike gridTemplateColumns it pairs with a single FLAT
								  `minColumnWidthUnit` attribute (not tiered) — mirroring
								  sgs/feature-grid's `minItemWidth`/`minItemWidthUnit` pair —
								  because the unit rarely needs to change per breakpoint while
								  the numeric floor does. Sets the BASIS a client-configured
								  auto-fit column may shrink to before one drops to the next
								  row (`sgs_intrinsic_columns_track()`, helpers-container.php).
								  Gated on `enableIntrinsicColumns` (see the prop docblock
								  above) rather than rendered unconditionally, because only
								  callers whose own block.json declares
								  `supports.sgs.intrinsicColumns` also declare the
								  `minColumnWidth`/`minColumnWidthUnit` attributes — currently
								  `sgs/container` alone.
								*/ }
							<ResponsiveOverride
								label={ __( 'Minimum column width', 'sgs-blocks' ) }
								value={ attributes.minColumnWidth }
								onChange={ ( obj ) => setAttributes( { minColumnWidth: obj } ) }
							>
								{ ( { ownValue, effectiveValue, inherited, setOwnValue } ) => {
									const minColumnWidthUnit = attributes.minColumnWidthUnit || 'px';
									return (
									<SgsLengthControl
										presets={ false }
										value={
											'' !== ownValue && null != ownValue
												? `${ ownValue }${ minColumnWidthUnit }`
												: ''
										}
										placeholder={
											inherited && '' !== effectiveValue && null != effectiveValue
												? `${ effectiveValue }${ minColumnWidthUnit }`
												: ''
										}
										units={ [
											{ value: 'px', label: 'px', default: 200 },
											{ value: 'em', label: 'em', default: 10 },
											{ value: 'rem', label: 'rem', default: 10 },
										] }
										onChange={ ( val ) => {
											if ( ! val ) {
												setOwnValue( undefined );
												return;
											}
											const unit = val.replace( /[\d.]+/, '' ) || 'px';
											const num = parseFloat( val );
											setOwnValue( Number.isNaN( num ) ? undefined : num );
											if ( unit !== minColumnWidthUnit ) {
												setAttributes( { minColumnWidthUnit: unit } );
											}
										} }
										help={ __(
											'The floor a grid column may shrink to before one drops to the next row. Leave empty to use the framework default (16rem).',
											'sgs-blocks'
										) }
									/>
									);
								} }
							</ResponsiveOverride>
						</>
					) }

					<TextControl
						label={ __( 'Auto rows', 'sgs-blocks' ) }
						value={ gridAutoRows }
						onChange={ ( val ) => setAttributes( { gridAutoRows: val } ) }
						help={ __(
							"Sets grid-auto-rows e.g. '1fr' for equal-height rows or 'minmax(100px,auto)'.",
							'sgs-blocks'
						) }
						__nextHasNoMarginBottom
						__next40pxDefaultSize
					/>

					<SelectControl
						label={ __( 'Justify items', 'sgs-blocks' ) }
						value={ justifyItems }
						options={ JUSTIFY_ITEMS_OPTIONS }
						onChange={ ( val ) => setAttributes( { justifyItems: val } ) }
						__nextHasNoMarginBottom
						__next40pxDefaultSize
					/>

					<SelectControl
						label={ __( 'Align content', 'sgs-blocks' ) }
						value={ alignContent }
						options={ ALIGN_CONTENT_OPTIONS }
						onChange={ ( val ) => setAttributes( { alignContent: val } ) }
						__nextHasNoMarginBottom
						__next40pxDefaultSize
					/>
				</>
			) }
		</>
	);
}

/**
 * Background panel (image/video/overlay/svg/animation tabs).
 * Section kind only.
 */
/**
 * BackgroundPanel — gated via the existing allowlist opt-in mechanism
 * (D579 / `hide-extensions.js`), added 2026-08-16 (wrapper decomposition
 * step 6, D626/D633).
 *
 * `name` is an OPTIONAL prop: the block name (or a settings object), passed
 * through to `isExtensionEnabled()` exactly as the HOC-injected universal
 * extensions already do (`hover-effects.js`). It is deliberately NOT a new
 * required prop — every one of today's 6 call sites (`container`,
 * `cta-section`, `trust-bar`, `hero`, `site-footer`, `site-header`, all in
 * `src/blocks/*\/edit.js`, plus the `kind='section'` aggregator branch further
 * down this file) mounts `<BackgroundPanel attributes={…} setAttributes={…} />`
 * with no `name` — none of those 6 blocks declare `supports.sgs.enabledExtensions`
 * today (D633 calibration). When `name` is absent the panel renders
 * unconditionally, IDENTICAL to its pre-2026-08-16 behaviour — this is what
 * keeps the 6 shipped blocks byte-identical after this change. A block only
 * gets gated once a LATER commit (Phase B of the wrapper-decomposition plan,
 * `~/.claude/plans/go-read-the-track-encapsulated-hare.md`) both passes
 * `name={ name }` here AND declares `'background'` in its own
 * `supports.sgs.enabledExtensions` — that is how `physics-canvas` gains this
 * panel for the first time without touching this component again.
 */
