/**
 * Hover Effects extension — attribute registration.
 *
 * Split out of the former hover-effects.js (D551, Phase 2.1 header docs live
 * in ./index.js). Registered against `blocks.registerBlockType` by index.js
 * under the SAME filter name/priority the monolithic file used
 * ('sgs/hover-effects/attributes', priority 10 — addFilter's default).
 *
 * @package SGS\Blocks
 */
import { getBlockType } from '@wordpress/blocks';
import { isExtensionHidden, isExtensionEnabled } from '../hide-extensions';
import { resolveBlockDefaults } from './resolve';

/**
 * Add hover attributes to all blocks.
 *
 * Per-block defaults come from each block's own `supports.sgs.hoverDefaults`
 * declaration via resolveBlockDefaults(); a block that declares nothing
 * starts fully off. There is no roster here and no roster in the PHP twin.
 * A block that hides an extension (supports.sgs.hideExtensions) does NOT get
 * that extension's attributes registered.
 *
 * @param {Object} settings Block settings from blocks.registerBlockType.
 * @return {Object} Settings with hover/link/click attributes merged in.
 */
export function addHoverAttributes( settings ) {
	const type = getBlockType( settings.name );
	// Skip blocks that do not support className.
	if ( type?.supports?.className === false ) {
		return settings;
	}

	const defaults = resolveBlockDefaults( settings );

	// Declarative per-block opt-IN (D551, Phase 2.1 — see ./index.js).
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
			// Lift in px (0 = off) — combines with scale in one transform.
			sgsHoverLift:         { type: 'number',  default: defaults.lift },
			// Named scale preset — from the block's own hoverDefaults.
			sgsHoverScalePreset:  { type: 'string',  default: defaults.scalePreset },
			// Shadow elevation preset — from the block's own hoverDefaults.
			sgsHoverShadow:       { type: 'string',  default: defaults.shadow },
			// Duration slug — maps to var(--wp--custom--duration--{slug}).
			sgsHoverDuration:     { type: 'string',  default: 'medium' },
			// Exact duration in ms (0 = use the duration token above).
			sgsHoverDurationMs:   { type: 'number',  default: 0 },
			// Easing slug — maps to var(--wp--custom--easing--{slug}).
			sgsHoverEasing:       { type: 'string',  default: 'default' },
			// Image zoom on hover — from the block's own hoverDefaults.
			sgsHoverImageZoom:    { type: 'boolean', default: defaults.imageZoom },
			// Photo zoom amount in % (0 = the block's own default, 110%).
			sgsHoverZoom:         { type: 'number',  default: defaults.zoom },
			// Photo zoom duration in ms (0 = the block's own default).
			sgsHoverZoomDuration: { type: 'number',  default: defaults.zoomDuration },
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
			// effects/hover-effects.php). Never wraps the block — that would
			// produce invalid nested <a> whenever the block has its own links.
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
