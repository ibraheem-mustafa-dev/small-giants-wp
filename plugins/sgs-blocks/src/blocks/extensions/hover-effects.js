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
 * Universal + declarative — see ./hide-extensions.js.
 *
 * Class injection is handled server-side by includes/hover-effects.php via
 * the render_block filter. A getSaveContent.extraProps filter here would
 * bake classes into save() output, causing block validation failures
 * whenever defaults change. PHP render-time injection is the correct path
 * for both static and dynamic blocks.
 *
 * @package SGS\Blocks
 */
import { addFilter } from '@wordpress/hooks';
import { createHigherOrderComponent } from '@wordpress/compose';
import { getBlockType } from '@wordpress/blocks';
import { InspectorControls } from '@wordpress/block-editor';
import {
	PanelBody,
	RangeControl,
	SelectControl,
	ToggleControl,
	TextControl,
} from '@wordpress/components';
import { LinkPopoverField } from '../../components';
import { __ } from '@wordpress/i18n';
import { isExtensionHidden, isExtensionEnabled } from './hide-extensions';

// Lazy-import DesignTokenPicker if available, fallback to nothing.
let DesignTokenPicker;
try {
	DesignTokenPicker = require( '../../components' ).DesignTokenPicker;
} catch {
	DesignTokenPicker = null;
}

/**
 * Resolve per-block hover defaults from the BLOCK'S OWN DECLARATION.
 *
 * Mirrors resolve_hover_defaults() in includes/hover-effects.php — both read
 * the same `supports.sgs.hoverDefaults` object, so there is ONE declaration
 * per block and no roster to keep in step.
 *
 * ⛔ REPLACED three hardcoded block-name Sets (D805) for the reason recorded in
 * the PHP twin: those Sets named 11 blocks, nothing gated the PHP half, and
 * eight of the 11 therefore received injected hover motion with the panel
 * switched off and no control to change it.
 *
 * The caller already gates on isExtensionEnabled( settings, 'hover' ), so a
 * declaration on a block with no hover panel is never reached here — the same
 * two-condition rule the PHP enforces explicitly.
 *
 * @param {Object} settings Block settings from blocks.registerBlockType.
 * @return {{ scalePreset: string, shadow: string, imageZoom: boolean, focusRing: boolean }} Defaults.
 */
function resolveBlockDefaults( settings ) {
	const declared = settings?.supports?.sgs?.hoverDefaults;

	if ( ! declared || 'object' !== typeof declared ) {
		return { scalePreset: '', shadow: '', imageZoom: false, focusRing: false };
	}

	return {
		scalePreset: 'string' === typeof declared.scalePreset ? declared.scalePreset : '',
		shadow:      'string' === typeof declared.shadow ? declared.shadow : '',
		imageZoom:   !! declared.imageZoom,
		focusRing:   !! declared.focusRing,
	};
}

/**
 * Resolve a block's declared hover-control exclusions.
 *
 * Gate A cleanup (D808 follow-up, 2026-08-27): mirrors
 * resolve_hover_excluded_controls() in includes/hover-effects.php — both read
 * the same `supports.sgs.hoverExcludeControls` array declared in the block's
 * own block.json, so there is ONE declaration and no named-block array in
 * either shared file (same discipline D805 already enforced for
 * hoverDefaults). pricing-table / google-reviews / whatsapp-cta declare
 * `["imageZoom", "grayscale"]` — they are root-hover blocks (D808) with no
 * image element for those two toggles to bind to; leaving them present but
 * inert is the D805 failure shape this suppresses.
 *
 * @param {Object} settings Block settings (registered type or registerBlockType settings).
 * @return {string[]} Excluded control keys, e.g. [ 'imageZoom', 'grayscale' ].
 */
function resolveHoverExcludedControls( settings ) {
	const excluded = settings?.supports?.sgs?.hoverExcludeControls;
	return Array.isArray( excluded ) ? excluded : [];
}

const SHADOW_OPTIONS = [
	{ label: __( 'None', 'sgs-blocks' ), value: '' },
	{ label: __( 'Subtle', 'sgs-blocks' ), value: 'subtle' },
	{ label: __( 'Raised', 'sgs-blocks' ), value: 'raised' },
	{ label: __( 'Floating', 'sgs-blocks' ), value: 'floating' },
	{ label: __( 'Brand glow', 'sgs-blocks' ), value: 'glow' },
];

const SCALE_PRESET_OPTIONS = [
	{ label: __( 'None', 'sgs-blocks' ), value: '' },
	{ label: __( 'Subtle (1.02)', 'sgs-blocks' ), value: '1.02' },
	{ label: __( 'Medium (1.05)', 'sgs-blocks' ), value: '1.05' },
	{ label: __( 'Strong (1.1)', 'sgs-blocks' ), value: '1.1' },
];

/**
 * Duration options sourced from theme.json settings.custom.duration tokens.
 * CSS custom property: var(--wp--custom--duration--{slug})
 */
const DURATION_OPTIONS = [
	{ label: __( 'Instant (60ms)', 'sgs-blocks' ), value: 'instant' },
	{ label: __( 'Fast (150ms)', 'sgs-blocks' ), value: 'fast' },
	{ label: __( 'Medium (300ms)', 'sgs-blocks' ), value: 'medium' },
	{ label: __( 'Slow (500ms)', 'sgs-blocks' ), value: 'slow' },
	{ label: __( 'Extra slow (800ms)', 'sgs-blocks' ), value: 'extra-slow' },
];

/**
 * Easing options sourced from theme.json settings.custom.easing tokens.
 * CSS custom property: var(--wp--custom--easing--{slug})
 */
const EASING_OPTIONS = [
	{ label: __( 'Default (Material)', 'sgs-blocks' ), value: 'default' },
	{ label: __( 'Ease out', 'sgs-blocks' ), value: 'ease-out' },
	{ label: __( 'Ease in', 'sgs-blocks' ), value: 'ease-in' },
	{ label: __( 'Spring', 'sgs-blocks' ), value: 'spring' },
	{ label: __( 'Linear', 'sgs-blocks' ), value: 'linear' },
];

/**
 * Add hover attributes to all blocks.
 *
 * Per-block defaults come from each block's own `supports.sgs.hoverDefaults`
 * declaration via resolveBlockDefaults(); a block that declares nothing
 * starts fully off. There is no roster here and no roster in the PHP twin.
 * A block that hides an extension (supports.sgs.hideExtensions) does NOT get
 * that extension's attributes registered.
 */
addFilter(
	'blocks.registerBlockType',
	'sgs/hover-effects/attributes',
	( settings ) => {
		const type = getBlockType( settings.name );
		// Skip blocks that do not support className.
		if ( type?.supports?.className === false ) {
			return settings;
		}

		const defaults = resolveBlockDefaults( settings );

		// Declarative per-block opt-IN (D551, Phase 2.1 — see ./hide-extensions.js).
		// 'hover' and 'blockLink' are DISCONNECTED by default: a block must list
		// the slug in supports.sgs.enabledExtensions to receive that panel's
		// attrs at all. Measured 2026-08-10: zero stored hover attributes across
		// 194 canary pages, so this ships with no live-content migration.
		// 'clickEffects' is unaffected — still governed by the legacy
		// hideExtensions DENYLIST until its own usage derivation lands.
		const hoverAttributes = isExtensionEnabled( settings, 'hover' )
			? {
				// Scale transform — fine-grained slider (0 = off).
				sgsHoverScale:        { type: 'number',  default: 0 },
				// Named scale preset — from the block's own hoverDefaults.
				sgsHoverScalePreset:  { type: 'string',  default: defaults.scalePreset },
				// Shadow elevation preset — from the block's own hoverDefaults.
				sgsHoverShadow:       { type: 'string',  default: defaults.shadow },
				// Duration slug — maps to var(--wp--custom--duration--{slug}).
				sgsHoverDuration:     { type: 'string',  default: 'medium' },
				// Easing slug — maps to var(--wp--custom--easing--{slug}).
				sgsHoverEasing:       { type: 'string',  default: 'default' },
				// Image zoom on hover — from the block's own hoverDefaults.
				sgsHoverImageZoom:    { type: 'boolean', default: defaults.imageZoom },
				// Stagger animation delay in ms (applied to direct children).
				sgsStaggerDelay:      { type: 'number',  default: 0 },
				// Grayscale-to-colour effect on images.
				sgsHoverGrayscale:    { type: 'boolean', default: false },
				// Border accent line on hover.
				sgsHoverBorderAccent: { type: 'boolean', default: false },
				// 3D tilt effect.
				sgsHoverTilt3D:       { type: 'boolean', default: false },
				// Focus ring for keyboard navigation — enabled on opt-in blocks.
				sgsFocusRing:         { type: 'boolean', default: defaults.focusRing },
			}
			: {};

		const linkAttributes = isExtensionEnabled( settings, 'blockLink' )
			? {
				// Block link — injects an empty stretched-link overlay <a> as
				// the block root's last child (server-side, includes/hover-
				// effects.php). Never wraps the block — that would produce
				// invalid nested <a> whenever the block has its own links.
				sgsBlockLink:         { type: 'string',  default: '' },
				sgsBlockLinkTarget:   { type: 'boolean', default: false },
				// Accessible name for the overlay anchor — required because
				// an empty anchor has no text content for screen readers.
				sgsBlockLinkLabel:    { type: 'string',  default: '' },
			}
			: {};

		const clickAttributes = isExtensionHidden( settings, 'clickEffects' )
			? {}
			: {
				// Click ripple — radial scale animation from click coordinates.
				sgsClickEffect:       { type: 'string',  default: 'none' },
				sgsClickRippleColour: { type: 'string',  default: '' },
				sgsClickRippleDuration: { type: 'number', default: 600 },
			};

		return {
			...settings,
			attributes: {
				...settings.attributes,
				...hoverAttributes,
				...linkAttributes,
				...clickAttributes,
			},
		};
	}
);

/**
 * Add hover controls to the inspector.
 */
const withHoverControls = createHigherOrderComponent( ( BlockEdit ) => {
	return ( props ) => {
		const { attributes, setAttributes, name } = props;
		const type = getBlockType( name );

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

		const {
			sgsHoverScale,
			sgsHoverShadow,
			sgsHoverDuration,
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
					<PanelBody
						title={ __( 'Hover Effects', 'sgs-blocks' ) }
						initialOpen={ false }
					>
						<SelectControl
							label={ __( 'Hover scale', 'sgs-blocks' ) }
							help={ __( 'Scale the block up on hover using a preset value.', 'sgs-blocks' ) }
							value={ sgsHoverScalePreset }
							options={ SCALE_PRESET_OPTIONS }
							onChange={ ( val ) => setAttributes( { sgsHoverScalePreset: val } ) }
							__nextHasNoMarginBottom
							__next40pxDefaultSize
						/>
						<RangeControl
							label={ __( 'Hover scale (fine, %)', 'sgs-blocks' ) }
							help={ __( '0 = no scale. 105 = 5% larger. Overrides preset above.', 'sgs-blocks' ) }
							value={ sgsHoverScale }
							onChange={ ( val ) => setAttributes( { sgsHoverScale: val } ) }
							min={ 0 }
							max={ 120 }
							step={ 1 }
							__nextHasNoMarginBottom
							__next40pxDefaultSize
						/>
						<SelectControl
							label={ __( 'Hover shadow', 'sgs-blocks' ) }
							value={ sgsHoverShadow }
							options={ SHADOW_OPTIONS }
							onChange={ ( val ) => setAttributes( { sgsHoverShadow: val } ) }
							__nextHasNoMarginBottom
							__next40pxDefaultSize
						/>
						{ ! hideImageZoom && (
						<ToggleControl
							label={ __( 'Zoom image on hover', 'sgs-blocks' ) }
							help={ __( 'Gently scales any image inside the block when hovered.', 'sgs-blocks' ) }
							checked={ sgsHoverImageZoom }
							onChange={ ( val ) => setAttributes( { sgsHoverImageZoom: val } ) }
						/>
						) }
						{ ! hideGrayscale && (
						<ToggleControl
							label={ __( 'Grayscale to colour', 'sgs-blocks' ) }
							help={ __( 'Desaturates images at rest; restores colour on hover.', 'sgs-blocks' ) }
							checked={ sgsHoverGrayscale }
							onChange={ ( val ) => setAttributes( { sgsHoverGrayscale: val } ) }
						/>
						) }
						<ToggleControl
							label={ __( 'Border accent line on hover', 'sgs-blocks' ) }
							help={ __( 'Adds a coloured line at the bottom that scales in on hover.', 'sgs-blocks' ) }
							checked={ sgsHoverBorderAccent }
							onChange={ ( val ) => setAttributes( { sgsHoverBorderAccent: val } ) }
						/>
						<SelectControl
							label={ __( 'Transition duration', 'sgs-blocks' ) }
							help={ __( 'Speed of hover transitions. Sourced from brand motion tokens.', 'sgs-blocks' ) }
							value={ sgsHoverDuration }
							options={ DURATION_OPTIONS }
							onChange={ ( val ) => setAttributes( { sgsHoverDuration: val } ) }
							__nextHasNoMarginBottom
							__next40pxDefaultSize
						/>
						<SelectControl
							label={ __( 'Transition easing', 'sgs-blocks' ) }
							help={ __( 'Curve applied to hover transitions. Sourced from brand motion tokens.', 'sgs-blocks' ) }
							value={ sgsHoverEasing }
							options={ EASING_OPTIONS }
							onChange={ ( val ) => setAttributes( { sgsHoverEasing: val } ) }
							__nextHasNoMarginBottom
							__next40pxDefaultSize
						/>
						<RangeControl
							label={ __( 'Child stagger delay (ms)', 'sgs-blocks' ) }
							help={ __( 'Each direct child is delayed by a multiple of this value.', 'sgs-blocks' ) }
							value={ sgsStaggerDelay }
							onChange={ ( val ) => setAttributes( { sgsStaggerDelay: val } ) }
							min={ 0 }
							max={ 500 }
							step={ 25 }
							__nextHasNoMarginBottom
							__next40pxDefaultSize
						/>
						<ToggleControl
							label={ __( 'Show focus ring on keyboard focus', 'sgs-blocks' ) }
							help={ __( 'Adds a visible focus ring (3px primary glow at 0.4 alpha) when keyboard-tabbed to. Recommended on for any clickable block.', 'sgs-blocks' ) }
							checked={ sgsFocusRing }
							onChange={ ( val ) => setAttributes( { sgsFocusRing: val } ) }
						/>
					</PanelBody>
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
					<PanelBody
						title={ __( 'Block Link', 'sgs-blocks' ) }
						initialOpen={ false }
					>
						{ /* Spec 35 §2 LINK standard (promoted from `sgs/button`'s
						   Bean-approved popover 2026-08-13) — replaces the raw
						   TextControl (type url) this panel used to render.
						   ⚠ CORRECTED 2026-08-19 — "67-block reach via this ONE
						   extension" described the PRE-D551 legacy state, when
						   `blockLink` was still denylist/universal (attached to
						   every block unless opted out). D551 (2026-08-10) flipped
						   it to opt-in via `supports.sgs.enabledExtensions`;
						   MEASURED current reach is **3 blocks** (scan of every
						   block.json's `enabledExtensions`, 2026-08-19) — this fix
						   was the highest-leverage single fix in the LINK rollout
						   at the time it shipped, not a description of today's
						   reach. `showRel` stays off + `enableInternalResolution`
						   stays off:
						   `sgsBlockLink` has no rel attribute and no ID-resolution
						   consumer in `includes/hover-effects.php` — only
						   `url`/`linkTarget` exist on the wire. The accessible-
						   label field is this extension's OWN bespoke field (no
						   other consumer has one), passed via `renderExtraFields`
						   rather than forcing a new field onto the shared
						   component's contract. */ }
						<LinkPopoverField
							label={ __( 'Link URL', 'sgs-blocks' ) }
							help={ __( 'Makes the whole card clickable. Any link/button already inside the block stays clickable too. Leave empty to disable.', 'sgs-blocks' ) }
							value={ {
								url: sgsBlockLink,
								linkTarget: sgsBlockLinkTarget ? '_blank' : '_self',
							} }
							targetMode="boolean"
							showRel={ false }
							onChange={ ( next ) => {
								const patch = {};
								if ( undefined !== next.url ) {
									patch.sgsBlockLink = next.url;
								}
								if ( undefined !== next.linkTarget ) {
									patch.sgsBlockLinkTarget = '_blank' === next.linkTarget;
								}
								setAttributes( patch );
							} }
							renderExtraFields={ () => (
								<TextControl
									label={ __( 'Accessible label for the card link', 'sgs-blocks' ) }
									help={ __( 'Read by screen readers — the card link has no visible text of its own. Leave empty to fall back to the link’s domain.', 'sgs-blocks' ) }
									value={ sgsBlockLinkLabel }
									onChange={ ( val ) => setAttributes( { sgsBlockLinkLabel: val || '' } ) }
									__nextHasNoMarginBottom
									__next40pxDefaultSize
								/>
							) }
						/>
					</PanelBody>
					) }
					</InspectorControls>
					{ /*
					 * Click Effects (ripple) is appearance/feedback on
					 * interaction — back in the Styles tab alongside Hover
					 * Effects above.
					 */ }
					<InspectorControls group="styles">
					{ ! hideClick && (
					<PanelBody
						title={ __( 'Click Effects', 'sgs-blocks' ) }
						initialOpen={ false }
					>
						<SelectControl
							label={ __( 'Click effect', 'sgs-blocks' ) }
							help={ __( 'Ripple: a radial wave radiates from the click point.', 'sgs-blocks' ) }
							value={ sgsClickEffect }
							options={ [
								{ label: __( 'None', 'sgs-blocks' ), value: 'none' },
								{ label: __( 'Ripple', 'sgs-blocks' ), value: 'ripple' },
							] }
							onChange={ ( val ) => setAttributes( { sgsClickEffect: val } ) }
							__nextHasNoMarginBottom
							__next40pxDefaultSize
						/>
						{ sgsClickEffect === 'ripple' && (
							<>
								{ DesignTokenPicker ? (
									<DesignTokenPicker
										label={ __( 'Ripple colour', 'sgs-blocks' ) }
										help={ __( 'Leave empty to use currentColour at 30% opacity.', 'sgs-blocks' ) }
										value={ sgsClickRippleColour }
										onChange={ ( val ) => setAttributes( { sgsClickRippleColour: val || '' } ) }
									/>
								) : null }
								<RangeControl
									label={ __( 'Ripple duration (ms)', 'sgs-blocks' ) }
									value={ sgsClickRippleDuration }
									onChange={ ( val ) => setAttributes( { sgsClickRippleDuration: val } ) }
									min={ 200 }
									max={ 1200 }
									step={ 50 }
									__nextHasNoMarginBottom
									__next40pxDefaultSize
								/>
							</>
						) }
					</PanelBody>
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

// Class injection is handled server-side by includes/hover-effects.php via
// the render_block filter. A getSaveContent.extraProps filter here would
// bake classes into save() output, causing block validation failures
// whenever defaults change. PHP render-time injection is the correct path
// for both static and dynamic blocks.
