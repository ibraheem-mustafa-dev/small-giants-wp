/**
 * ContainerWrapperControls
 *
 * Reusable InspectorControls component that exposes the canonical sgs/container
 * wrapper attributes as editor panels, scoped by `kind`.
 *
 * WS-4 (composite-mirror): drop this into any composite block's edit.js so its
 * wrapper controls stay in sync with sgs/container without duplicating logic.
 *
 * KIND GATING
 * -----------
 *  section  — full surface: outer maxWidth (literal), contentWidth (token or
 *             literal), gap (responsive), layout (grid/flex), background
 *             (image/video/overlay/svg/animation), shape dividers, min-height,
 *             grid-item defaults, shadow. Breakout (alignwide/alignfull) via
 *             WP-native align toolbar — no custom control needed.
 *  layout   — grid/flex + width (maxWidth/contentWidth) + gap only.
 *  content  — width (maxWidth/contentWidth) + padding/spacing only.
 *
 * IMPORT LINE (adjust relative depth as needed)
 * ---------------------------------------------
 *  import ContainerWrapperControls from '../container/components/ContainerWrapperControls';
 *
 * USAGE
 * -----
 *  <ContainerWrapperControls
 *    attributes={ attributes }
 *    setAttributes={ setAttributes }
 *    kind="section"           // 'section' | 'layout' | 'content'  (default: 'section')
 *  />
 *
 * The component renders inside any existing <>…</> fragment alongside the
 * block's own markup — it does NOT wrap children.
 */

/**
 * ─── SPLIT 2026-08-17 (Bean-requested) ──────────────────────────────────────
 * The shared panels that used to live in this file now have one file each,
 * alongside this one:
 *
 *   WidthPanel.js · LayoutPanel.js · BackgroundPanel.js
 *   ShapeDividersPanel.js · GridItemDefaultsPanel.js
 *
 * WHY: holding six independently-mountable panels in one module made the split
 * invisible to inspection. An audit in this repo measured the decomposition by
 * THIS FILE'S LINE COUNT, concluded no split had happened, and had to retract
 * it. One panel per file makes the architecture visible in `ls`.
 *
 * ⛔ Do NOT judge the wrapper's decomposition by any file's length. The split is
 *    at the EXPORT/MOUNT level: blocks compose the panels they need.
 *
 * This file remains the AGGREGATE for blocks that want the whole set by `kind`,
 * and RE-EXPORTS the panels so existing import sites keep working unchanged.
 * New code may import a panel directly from its own file.
 *
 * `WrapperColourPanel` was removed 2026-08-22: a fresh enumeration found zero
 * real consumers of the import/re-export (only comment-line mentions elsewhere),
 * so the earlier "~30 legacy import sites" estimate that kept it as a
 * neutralised no-op component was wrong. The file itself is deleted.
 */

import { __ } from '@wordpress/i18n';
import { Fragment } from '@wordpress/element';
import { InspectorControls } from '@wordpress/block-editor';
import { PanelBody, SelectControl } from '@wordpress/components';

import { WidthPanel } from './WidthPanel';
import { LayoutPanel } from './LayoutPanel';
import { BackgroundPanel } from './BackgroundPanel';
import { ShapeDividersPanel } from './ShapeDividersPanel';
import { GridItemDefaultsPanel } from './GridItemDefaultsPanel';

// Re-exported for the existing call sites (and for `import { X } from './ContainerWrapperControls'`).
export {
	WidthPanel,
	LayoutPanel,
	BackgroundPanel,
	ShapeDividersPanel,
	GridItemDefaultsPanel,
};
export { LENGTH_UNITS } from './_shared';

export const MIN_HEIGHT_OPTIONS = [
	{ label: __( 'Auto', 'sgs-blocks' ), value: '' },
	{ label: '50vh', value: '50vh' },
	{ label: '75vh', value: '75vh' },
	{ label: '100vh', value: '100vh' },
	{ label: '200px', value: '200px' },
	{ label: '400px', value: '400px' },
	{ label: '600px', value: '600px' },
];

export const SHADOW_OPTIONS = [
	{ label: __( 'None', 'sgs-blocks' ), value: '' },
	{ label: __( 'Subtle', 'sgs-blocks' ), value: 'subtle' },
	{ label: __( 'Raised', 'sgs-blocks' ), value: 'raised' },
	{ label: __( 'Floating', 'sgs-blocks' ), value: 'floating' },
	{ label: __( 'Brand glow', 'sgs-blocks' ), value: 'glow' },
];

// ---------------------------------------------------------------------------
// Sub-panels (named functions for reuse across kinds)
// ---------------------------------------------------------------------------

/**
 * Units list for UnitControl inputs (maxWidth / contentWidth custom literal).
 */

const KIND_PANELS = {
	section: [
		// 1. Section (outer) — layout type, columns, gap, width, contentWidth.
		//
		// ⛔ The three flat min-height SelectControls that sat here were DELETED
		// 2026-08-10 as UNREACHABLE DEAD UI. Measured, not assumed: all 16 live
		// <ContainerWrapperControls> mounts pass `kind` explicitly — 'layout' ×10,
		// 'content' ×6 — and NOT ONE passes 'section'. This array is reached only
		// via the unknown-kind fallback (`KIND_PANELS[kind] ?? KIND_PANELS.section`),
		// so no block ever rendered these three controls.
		//
		// An earlier count of "24 mounts, 19 omitting kind" was WRONG: it counted
		// COMMENT lines in six files whose only mention of this component is prose
		// recording that they STOPPED using it, and it missed that the real mounts
		// declare `kind` a few lines below the opening tag. That error made this
		// panel look like a live UX defect and put it at the top of Phase 1.4.
		// (`a-grep-for-a-class-name-is-not-a-usage-census`.)
		//
		// The `section` entry itself is KEPT as the unknown-kind safety net — only
		// the dead controls are gone. MIN_HEIGHT_OPTIONS stays exported: three
		// blocks that DO show it import it (container/edit.js:19,
		// physics-canvas/edit.js:20, trust-bar/edit.js:30), and removing the export
		// would hand all three `options={undefined}` and a crashed inspector panel
		// with NO build error — lint:js is not in prebuild and webpack does not
		// fail on a missing named export.
		( props ) => (
			<PanelBody title={ __( 'Section (outer)', 'sgs-blocks' ) }>
				<WidthPanel { ...props } />
			</PanelBody>
		),
		// 2. Inner band (content band) — REMOVED 2026-08-12 with ContentBandPanel
		//    itself (see its tombstone above): all 13 of its controls wrote
		//    attributes no block.json declares, so every value a client set was
		//    silently discarded. Band WIDTH survives — it is `contentWidth`,
		//    owned by WidthPanel at entry 1 above, and genuinely declared +
		//    consumed. Only the dead background/padding controls are gone.
		// 3. Responsive spacing — REMOVED 2026-08-11. ResponsiveSpacingPanel was
		//    deleted on 2026-08-10 (see its tombstone above) but these registry
		//    entries still called it, so EVERY section/layout/content-kind block
		//    threw `ReferenceError: ResponsiveSpacingPanel is not defined` and
		//    showed "This block has encountered an error and cannot be
		//    previewed." Found on the LIVE canary editor, not by any gate — the
		//    build, inspector-scan, check-dead-controls and the whole prebuild
		//    chain were all green with this in place.
		// 4. Layout.
		( props ) => (
			<PanelBody title={ __( 'Layout', 'sgs-blocks' ) } initialOpen={ false }>
				<LayoutPanel { ...props } />
			</PanelBody>
		),
		// 5. Grid items — uniform defaults only. The per-area `gridAreas` map that
		//    used to sit here went with GridAreaPanel (D639, see its tombstone
		//    above): the panel was never reachable, wrote a storage shape D580
		//    retired, and the capability is already delivered elsewhere.
		( props ) => <GridItemDefaultsPanel { ...props } />,
		// 6. Background.
		( props ) => <BackgroundPanel { ...props } />,
		// 7. Shadow.
		( props ) => (
			<PanelBody title={ __( 'Shadow', 'sgs-blocks' ) } initialOpen={ false }>
				<SelectControl
					label={ __( 'Shadow', 'sgs-blocks' ) }
					value={ props.attributes.shadow || '' }
					options={ SHADOW_OPTIONS }
					onChange={ ( val ) => props.setAttributes( { shadow: val } ) }
					__nextHasNoMarginBottom
					__next40pxDefaultSize
				/>
			</PanelBody>
		),
		// 8. Shape dividers.
		( props ) => <ShapeDividersPanel { ...props } />,
	],

	layout: [
		( props ) => (
			<PanelBody title={ __( 'Container / Wrapper', 'sgs-blocks' ) }>
				<LayoutPanel { ...props } />
				<hr style={ { margin: '16px 0' } } />
				<WidthPanel { ...props } />
			</PanelBody>
		),
		// ContentBandPanel mount REMOVED 2026-08-12 — this registry entry was
		// the ONLY route by which the panel reached an inspector, and all 12
		// blocks reaching it through this `layout` kind (accordion, card-grid,
		// feature-grid, form, form-field-tiles, google-reviews, post-grid,
		// pricing-table, site-footer-row, tabs, testimonial-slider,
		// trustpilot-reviews) declared NONE of the attributes it wrote. See the
		// ContentBandPanel tombstone above for the measurement.
	],

	content: [
		( props ) => (
			<PanelBody title={ __( 'Container / Wrapper', 'sgs-blocks' ) }>
				<WidthPanel { ...props } />
			</PanelBody>
		),
		// Base (desktop) padding/margin are handled by WP-native supports.spacing
		// (the Dimensions panel). The deleted ResponsiveSpacingPanel used to add
		// tablet/mobile overrides here; its call was removed 2026-08-11 with the
		// other two (see note above).
	],
};

// ---------------------------------------------------------------------------
// Public component
// ---------------------------------------------------------------------------

/**
 * ContainerWrapperControls
 *
 * @param {Object}   props
 * @param {Object}   props.attributes    Block attributes object.
 * @param {Function} props.setAttributes Block setAttributes function.
 * @param {string}   [props.kind]        'section' | 'layout' | 'content'. Default 'section'.
 * ⛔ `props.gridAreas` was REMOVED 2026-08-16 (D639) along with GridAreaPanel — see that
 * tombstone above. No consumer ever passed it, and the capability it gated is delivered by
 * the block's own controls (editor) and `resolvers/grid_area.py` (converter).
 * @param {boolean}  [props.showLayout]  Forwarded to LayoutPanel. Pass false when the block owns its OWN
 *                                       layout control — rendering both is silent DATA LOSS, because this
 *                                       panel writes stack/flex/grid into a `layout` attr whose block.json
 *                                       enum may not contain them and WordPress coerces the write back to
 *                                       the default. Previously only reachable via a DIRECT <LayoutPanel>
 *                                       mount (sgs/gallery's fix), so aggregator consumers had no way to
 *                                       opt out; threaded here 2026-08-12 for sgs/post-grid
 *                                       (enum grid|list|masonry|carousel) and sgs/testimonial-slider
 *                                       (enum full|split), both of which own their control and were
 *                                       silently losing writes.
 * @param {boolean}  [props.showContentBand] Forwarded to WidthPanel. Pass false for a block that cannot
 *                                       render a content band (see WidthPanel's docblock).
 */
export default function ContainerWrapperControls( {
	attributes,
	setAttributes,
	kind = 'section',
	showLayout,
	showContentBand,
} ) {
	// Guard: fall back gracefully for unknown kind values.
	const panels = KIND_PANELS[ kind ] ?? KIND_PANELS.section;

	return (
		<InspectorControls>
			{ panels.map( ( renderPanel, index ) => (
				// Key the list child on a Fragment rather than passing `key`
				// into the panel render function (which ignores it, leaving the
				// array children unkeyed → React duplicate-key warnings).
				// eslint-disable-next-line react/no-array-index-key
				<Fragment key={ index }>
					{ renderPanel( {
						attributes,
						setAttributes,
						// Undefined stays undefined so each panel's own default
						// (both true) applies — passing `false` explicitly is the
						// only way to suppress a control.
						showLayout,
						showContentBand,
					} ) }
				</Fragment>
			) ) }
		</InspectorControls>
	);
}
