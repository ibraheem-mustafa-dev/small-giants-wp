<?php
/**
 * Shared render helper functions for SGS block server-side rendering.
 *
 * This file is a thin loader. All function definitions have been split into
 * focused helper files for maintainability:
 *
 *   helpers-tokens.php              — sgs_attr_has_value, sgs_is_css_colour,
 *                                     sgs_colour_value, sgs_shadow_value,
 *                                     sgs_css_gradient_value, sgs_font_size_value,
 *                                     sgs_transition_vars
 *
 *   helpers-colour-wcag.php         — sgs_wcag_relative_luminance,
 *                                     sgs_wcag_text_colour_for_bg,
 *                                     sgs_resolve_palette_hex
 *
 *   helpers-media.php               — sgs_responsive_image, sgs_render_stars,
 *                                     sgs_render_media
 *
 *   helpers-configurator-pricing.php — sgs_configurator_format_minor,
 *                                      sgs_configurator_mode_price,
 *                                      sgs_configurator_mode_regular,
 *                                      sgs_configurator_per_unit_display
 *
 *   helpers-value-ladder.php        — sgs_saving_display, sgs_value_ladder
 *                                     (also requires helpers-configurator-pricing.php)
 *
 *   helpers-css-safety.php          — sgs_css_length_value (shared CSS-length
 *                                     safety primitive; required by
 *                                     helpers-container.php's
 *                                     sgs_container_gap_value())
 *
 *   helpers-container.php           — sgs_sanitize_grid_template,
 *                                     sgs_container_gap_value
 *
 *   helpers-box.php                 — sgs_css_length_sanitise,
 *                                     sgs_css_keyword_sanitise,
 *                                     sgs_box_object_shorthand,
 *                                     sgs_label_box_css_rule (shared label-style
 *                                     box renderer for sgs/label + product-card
 *                                     trial tag — one implementation, no
 *                                     per-block divergence)
 *
 *   helpers-svg-kses.php            — sgs_svg_kses_allowed_tags
 *
 *   helpers-button-style.php        — sgs_button_element_style_css (reusable
 *                                     colour/border/width styling for a
 *                                     built-in, non-sgs/button CTA element,
 *                                     reading a PREFIXED attribute set)
 *
 *   helpers-link.php                — sgs_link_attributes (turns the shared
 *                                     SgsLinkControl component's
 *                                     {url,opensInNewTab,rel} object attr
 *                                     into a safe href/target/rel string)
 *
 *   helpers-list-markers.php        — sgs_list_marker_types,
 *                                     sgs_list_marker_sanitise_type,
 *                                     sgs_list_marker_element_tag,
 *                                     sgs_list_marker_render (Spec 36
 *                                     FR-36-26c — the ONE shared list-marker
 *                                     renderer: icon/emoji/bullet/numbered/none)
 *
 *   helpers-responsive.php          — sgs_responsive_css_rule,
 *                                     sgs_responsive_box_shorthand_rule
 *                                     (Pattern A general responsive emitter —
 *                                     base+tablet+mobile on ONE selector,
 *                                     never inline. sgs_typography_css_rule
 *                                     is implemented on top of it.)
 *
 *   helpers-media-position.php      — sgs_media_position_css,
 *                                     sgs_media_position_focal_to_css (Spec 35
 *                                     capability-routing doctrine, mechanism
 *                                     (c) — explicitly-wired object-fit/
 *                                     object-position, caller owns selector)
 *
 *   helpers-svg-gradient.php        — sgs_svg_stroke_gradient,
 *                                     sgs_svg_inject_defs (D636/D644 icon/SVG
 *                                     gradient mechanism — converts a
 *                                     validated CSS gradient string into an
 *                                     SVG <linearGradient>/<radialGradient>
 *                                     def + the `stroke:url(#id)` CSS
 *                                     declaration that overrides a Lucide/
 *                                     wp-icon glyph's `stroke="currentColor"`
 *                                     presentation attribute)
 *
 * A single `require_once render-helpers.php` continues to resolve every
 * function that this file has always provided. All callers are unchanged.
 *
 * @package SGS\Blocks
 */

defined( 'ABSPATH' ) || exit;

require_once __DIR__ . '/helpers-tokens.php';
require_once __DIR__ . '/helpers-hover-state.php';
require_once __DIR__ . '/helpers-responsive.php';
require_once __DIR__ . '/helpers-typography.php';
require_once __DIR__ . '/helpers-media-position.php';
require_once __DIR__ . '/helpers-colour-wcag.php';
require_once __DIR__ . '/helpers-media.php';
require_once __DIR__ . '/helpers-tier-media.php';
require_once __DIR__ . '/helpers-media-element.php';
require_once __DIR__ . '/helpers-configurator-pricing.php';
require_once __DIR__ . '/helpers-value-ladder.php';
require_once __DIR__ . '/helpers-css-safety.php';
require_once __DIR__ . '/helpers-container.php';
require_once __DIR__ . '/helpers-svg-kses.php';
require_once __DIR__ . '/helpers-button-style.php';
require_once __DIR__ . '/helpers-box.php';
require_once __DIR__ . '/helpers-link.php';
require_once __DIR__ . '/helpers-cart-panel.php';
require_once __DIR__ . '/helpers-list-markers.php';
require_once __DIR__ . '/helpers-mega-render.php';
require_once __DIR__ . '/helpers-row-behaviour.php';
require_once __DIR__ . '/helpers-svg-gradient.php';
require_once __DIR__ . '/helpers-colour-variants.php';
require_once __DIR__ . '/media/atoms/media-type.php';
require_once __DIR__ . '/media/atoms/video-behaviour.php';
require_once __DIR__ . '/class-sgs-media-element.php';
require_once __DIR__ . '/media/atoms/source.php';
require_once __DIR__ . '/media/atoms/intrinsic.php';
require_once __DIR__ . '/media/atoms/meaning.php';
// ⛔ EVERY atom twin is required here, not just the ones a block happened to
// need. `sgs_media_element_style()` dispatches by naming convention and SKIPS a
// missing function silently by design, so an unloaded twin is not an error —
// it is an atom that quietly emits nothing. Five of the ten were unloaded when
// sgs/media was first wired, which is why its object-fit control stored the
// right value and painted nothing. `check-media-atom-purity.js` now fails the
// build if a twin exists on disk without a require here.
require_once __DIR__ . '/media/atoms/object-fit.php';
require_once __DIR__ . '/media/atoms/focal-point.php';
require_once __DIR__ . '/media/atoms/box-shape.php';
require_once __DIR__ . '/media/atoms/overlay.php';
require_once __DIR__ . '/media/atoms/svg-presentation.php';
require_once __DIR__ . '/media/atoms/motion.php';
require_once __DIR__ . '/media/atoms/opacity.php';
require_once __DIR__ . '/media/atoms/shadow.php';
require_once __DIR__ . '/media/atoms/media-padding.php';
require_once __DIR__ . '/media/atoms/caption.php';
require_once __DIR__ . '/media/atoms/link.php';
