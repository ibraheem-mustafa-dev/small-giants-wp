/**
 * Hover Effects extension — MIXED gating model (D551, Phase 2.1).
 *
 * Adds hover colour, scale, shadow, image zoom, grayscale, stagger delay,
 * easing, duration, focus ring, block link and click-ripple controls.
 *
 * Default model: opted-in blocks start with EMPTY/FALSE defaults (no hover
 * lift). A block declaring `supports.sgs.hoverDefaults` gets those defaults.
 *
 * `hover` and `blockLink` are OPT-IN (D551): disconnected from every block by
 * default, attached only when a block declares
 * `supports.sgs.enabledExtensions: ["hover"]` / `["blockLink"]`. Ruled by
 * Bean 2026-08-10 after measuring ZERO stored hover/link attributes across
 * 194 canary pages — the panel painted the block ROOT rather than the
 * element and produced unpaired single-state colour pickers, and nothing
 * live depended on it.
 *
 * `clickEffects` is still OPT-OUT (legacy): a block may declare
 * `supports.sgs.hideExtensions: ["clickEffects"]` to suppress that panel.
 * Universal + declarative — see ../hide-extensions.js.
 *
 * Class injection is handled server-side by includes/hover-effects/ via
 * the render_block filter. A getSaveContent.extraProps filter here would
 * bake classes into save() output, causing block validation failures
 * whenever defaults change. PHP render-time injection is the correct path
 * for both static and dynamic blocks.
 *
 * This extension was split from a single hover-effects.js (585 lines) into
 * this folder: constants.js (option lists), resolve.js (default/exclusion
 * resolution, mirrors the PHP twin), attributes.js (the
 * blocks.registerBlockType filter callback), and panels/ (the three
 * inspector panels as components). This file wires them together — the HOC
 * plus both addFilter registrations, under the SAME filter names/priorities
 * the monolithic file used.
 *
 * @package SGS\Blocks
 */
import { addFilter } from '@wordpress/hooks';
import { createHigherOrderComponent } from '@wordpress/compose';
import { getBlockType } from '@wordpress/blocks';
import { InspectorControls } from '@wordpress/block-editor';
import { useShadowPresetOptions } from '../../../components/shadow-control/useShadowPresets';
import { isExtensionHidden, isExtensionEnabled } from '../hide-extensions';
import { resolveHoverExcludedControls } from './resolve';
import { addHoverAttributes } from './attributes';
import HoverPanel from './panels/HoverPanel';
import BlockLinkPanel from './panels/BlockLinkPanel';
import ClickPanel from './panels/ClickPanel';

addFilter(
	'blocks.registerBlockType',
	'sgs/hover-effects/attributes',
	addHoverAttributes
);

/**
 * Add hover controls to the inspector.
 */
const withHoverControls = createHigherOrderComponent( ( BlockEdit ) => {
	return ( props ) => {
		const { attributes, setAttributes, name } = props;
		const type = getBlockType( name );
		// The theme's own shadow presets: no second list of names to keep in step.
		const shadowOptions = useShadowPresetOptions();

		if ( type?.supports?.className === false ) {
			return <BlockEdit { ...props } />;
		}

		// 'hover' / 'blockLink' — opt-IN (D551, Phase 2.1): a panel renders only
		// when its slug is listed in supports.sgs.enabledExtensions. Disconnected
		// from every block by default (0 stored usage measured 2026-08-10).
		// 'clickEffects' stays on the legacy hideExtensions DENYLIST — renders
		// everywhere unless a block opts out, e.g. a logo wall hiding
		// ['clickEffects'] to avoid irrelevant-panel clutter (sgs/brand-strip,
		// 2026-07-18).
		const hideHover = ! isExtensionEnabled( name, 'hover' );
		const hideBlockLink = ! isExtensionEnabled( name, 'blockLink' );
		const hideClick = isExtensionHidden( name, 'clickEffects' );

		// Gate A cleanup (D808 follow-up): suppress ONLY the two toggles a
		// block has declared as excluded (no image element to bind to) —
		// every other Hover Effects control (scale, shadow, duration,
		// easing, stagger, focus ring) still applies. See
		// resolveHoverExcludedControls() above + the PHP twin.
		const excludedHoverControls = resolveHoverExcludedControls( type );
		const hideImageZoom = excludedHoverControls.includes( 'imageZoom' );
		const hideGrayscale = excludedHoverControls.includes( 'grayscale' );

		// ONE control (Bean's ruling, 2026-09-24, `.claude/reports/2026-09-23-shadow-hover-lift-design.md`):
		// a block that declares `shadowLiftOnHover` (the Shadow panel's automatic-lift switch)
		// now offers its OWN "Hover shadow" select in that SAME panel (ShadowControl.js), writing
		// the SAME `sgsHoverShadow` attribute this universal panel would otherwise offer here —
		// two controls for one setting (the duplicate-controls gate finding this fixes). Hiding
		// it here is DYNAMIC (reads the block's own declared attributes), not a per-block
		// hoverExcludeControls entry — every block gaining shadowLiftOnHover in future is
		// covered with no second declaration.
		const hasShadowLift = Boolean( type?.attributes ) &&
			Object.prototype.hasOwnProperty.call( type.attributes, 'shadowLiftOnHover' );
		const hideShadowPicker = hasShadowLift;

		const {
			sgsHoverScale,
			sgsHoverLift,
			sgsHoverZoom,
			sgsHoverZoomDuration,
			sgsHoverShadow,
			sgsHoverDuration,
			sgsHoverDurationMs,
			sgsHoverEasing,
			sgsHoverScalePreset,
			sgsHoverImageZoom,
			sgsStaggerDelay,
			sgsHoverGrayscale,
			sgsHoverBorderAccent,
			sgsFocusRing,
			sgsBlockLink,
			sgsBlockLinkTarget,
			sgsBlockLinkLabel,
			sgsClickEffect,
			sgsClickRippleColour,
			sgsClickRippleDuration,
		} = attributes;

		return (
			<>
				<BlockEdit { ...props } />
				{ /*
				 * These controls are injected at runtime by a
				 * registerBlockType filter, so they belong to NO declared
				 * element in any block's supports.sgs.elements. Per THE
				 * PLACEMENT RULE (TWO TIERS, D537 2026-08-09) they resolve to
				 * their TIER 2 property-families — not a single catch-all
				 * block-level panel. This panel is MIXED-FAMILY; do not label
				 * it with one family. Per scripts/consistency/
				 * cluster-member-sets.json:
				 *   FILL      — hover background / colour
				 *   LAYOUT    — hover shadow (css:box-shadow)
				 *   MOTION    — transition duration / easing
				 *               (css:transition-duration / -timing-function)
				 *   ANIMATION — stagger delay (anim:stagger)
				 *   (none)    — scale, image zoom, grayscale, tilt and border
				 *               accent are members of NO cluster. That is
				 *               deliberate, not an omission: the cluster
				 *               file's own states _note calls out
				 *               imageZoomHover / grayscaleHover as "booleans/
				 *               preset selectors, not state-variant style
				 *               properties". Verify by reading the members
				 *               arrays — the words appear in that prose note,
				 *               so a raw substring search FALSELY reports them
				 *               as present.
				 * Block Link styles nothing (no CSS property behind it — it is
				 * a URL string that wraps the block in an <a>), so it belongs
				 * in the pinned-first Settings panel. The routing below (native
				 * group="styles" for effects, Settings for Block Link) is kept
				 * as the interim WP-native-group home until those family panels
				 * are built (all unbuilt as of D537).
				 * ⛔ NOT justified by "behaviour → Settings; appearance →
				 * Styles" — RETIRED 2026-08-08. Routing unchanged, reason
				 * only.
				 * ⛔ This whole extension is SCHEDULED FOR REMOVAL (design
				 * §4, Bean 2026-08-08): hover belongs to the element, not to
				 * a universal filter. CORRECTED 2026-08-19 — "48 blocks rely
				 * on it SOLELY" was true only under the PRE-D551 universal/
				 * opt-out gating this note was written against. D551
				 * (2026-08-10) flipped `hover` to opt-in via
				 * `supports.sgs.enabledExtensions`, and MEASURED live reach
				 * is now **0** — no block.json opts in (verified by scanning
				 * every block's `enabledExtensions` array, 2026-08-19). The
				 * element-hover capability this note calls a precondition for
				 * deletion is therefore no longer blocked on migrating 48
				 * blocks off this filter; re-check before removal whether
				 * that precondition still applies at all.
				 */ }
				<InspectorControls group="styles">
					{ ! hideHover && (
						<HoverPanel
							hideShadowPicker={ hideShadowPicker }
							hideImageZoom={ hideImageZoom }
							hideGrayscale={ hideGrayscale }
							shadowOptions={ shadowOptions }
							sgsHoverScalePreset={ sgsHoverScalePreset }
							sgsHoverScale={ sgsHoverScale }
							sgsHoverLift={ sgsHoverLift }
							sgsHoverZoom={ sgsHoverZoom }
							sgsHoverZoomDuration={ sgsHoverZoomDuration }
							sgsHoverShadow={ sgsHoverShadow }
							sgsHoverImageZoom={ sgsHoverImageZoom }
							sgsHoverGrayscale={ sgsHoverGrayscale }
							sgsHoverBorderAccent={ sgsHoverBorderAccent }
							sgsHoverDuration={ sgsHoverDuration }
							sgsHoverDurationMs={ sgsHoverDurationMs }
							sgsHoverEasing={ sgsHoverEasing }
							sgsStaggerDelay={ sgsStaggerDelay }
							sgsFocusRing={ sgsFocusRing }
							setAttributes={ setAttributes }
						/>
					) }
				</InspectorControls>
				{ /*
				 * Block Link is BEHAVIOUR (turns the block into a link) —
				 * it belongs in the default (Settings) tab, not Styles.
				 * Rendered as its own bare InspectorControls so it does
				 * not inherit the group="styles" placement above.
				 */ }
				<InspectorControls>
					{ ! hideBlockLink && (
						<BlockLinkPanel
							sgsBlockLink={ sgsBlockLink }
							sgsBlockLinkTarget={ sgsBlockLinkTarget }
							sgsBlockLinkLabel={ sgsBlockLinkLabel }
							setAttributes={ setAttributes }
						/>
					) }
				</InspectorControls>
				{ /*
				 * Click Effects (ripple) is appearance/feedback on
				 * interaction — back in the Styles tab alongside Hover
				 * Effects above.
				 */ }
				<InspectorControls group="styles">
					{ ! hideClick && (
						<ClickPanel
							sgsClickEffect={ sgsClickEffect }
							sgsClickRippleColour={ sgsClickRippleColour }
							sgsClickRippleDuration={ sgsClickRippleDuration }
							setAttributes={ setAttributes }
						/>
					) }
				</InspectorControls>
			</>
		);
	};
}, 'withHoverControls' );

addFilter(
	'editor.BlockEdit',
	'sgs/hover-effects/controls',
	withHoverControls
);

// Class injection is handled server-side by includes/hover-effects/ via
// the render_block filter. A getSaveContent.extraProps filter here would
// bake classes into save() output, causing block validation failures
// whenever defaults change. PHP render-time injection is the correct path
// for both static and dynamic blocks.
