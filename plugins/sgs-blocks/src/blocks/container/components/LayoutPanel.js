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
import { ResponsiveControl, ResponsiveOverride, SpacingControl } from '../../../components';
import { isExtensionEnabled } from '../../extensions/hide-extensions';

const LAYOUT_OPTIONS = [
	{ label: __( 'Stack', 'sgs-blocks' ), value: 'stack' },
	{ label: __( 'Flex', 'sgs-blocks' ), value: 'flex' },
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

export function LayoutPanel( { attributes, setAttributes, showLayout = true } ) {
	const {
		layout = 'stack',
		alignItems = 'start',
		justifyItems = 'stretch',
		alignContent = 'stretch',
		// columns, gridTemplateColumns and gridTemplateRows are TIER OBJECTS
		// (columns: pass 4; grid template props: pass 3a/3b) and are read via
		// attributes.columns / attributes.gridTemplateColumns /
		// attributes.gridTemplateRows at their controls below, not destructured
		// with a scalar default — which would mask the object.
		gridAutoRows = '',
	} = attributes;

	return (
		<>
			{ showLayout && (
				<SelectControl
					label={ __( 'Layout type', 'sgs-blocks' ) }
					value={ layout }
					options={ LAYOUT_OPTIONS }
					onChange={ ( val ) => setAttributes( { layout: val } ) }
					__nextHasNoMarginBottom
					__next40pxDefaultSize
				/>
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

			{ ( layout === 'flex' || layout === 'grid' ) && (
				<SelectControl
					label={ __( 'Vertical alignment', 'sgs-blocks' ) }
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
							{ label: __( '— default (row) —', 'sgs-blocks' ), value: '' },
							{ label: __( 'Row', 'sgs-blocks' ), value: 'row' },
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
						value={ attributes.flexWrap || '' }
						options={ [
							{ label: __( '— default (wrap) —', 'sgs-blocks' ), value: '' },
							{ label: __( 'Wrap', 'sgs-blocks' ), value: 'wrap' },
							{ label: __( 'No wrap', 'sgs-blocks' ), value: 'nowrap' },
							{ label: __( 'Wrap reverse', 'sgs-blocks' ), value: 'wrap-reverse' },
						] }
						onChange={ ( val ) => setAttributes( { flexWrap: val } ) }
						__nextHasNoMarginBottom
						__next40pxDefaultSize
					/>
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
				</>
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
						*/ }
					<ResponsiveOverride
						label={ __( 'Custom column template', 'sgs-blocks' ) }
						value={ attributes.gridTemplateColumns }
						onChange={ ( obj ) => setAttributes( { gridTemplateColumns: obj } ) }
					>
						{ ( { ownValue, effectiveValue, inherited, setOwnValue } ) => (
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
						) }
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
