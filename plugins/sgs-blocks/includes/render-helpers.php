<?php
/**
 * Shared render helper functions for SGS block server-side rendering.
 *
 * This file is a thin loader. All function definitions have been split into
 * focused helper files for maintainability:
 *
 *   helpers-tokens.php              — sgs_attr_has_value, sgs_is_css_colour,
 *                                     sgs_colour_value, sgs_shadow_value,
 *                                     sgs_font_size_value, sgs_transition_vars
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
 *   helpers-container.php           — sgs_sanitize_grid_template,
 *                                     sgs_container_gap_value
 *
 *   helpers-svg-kses.php            — sgs_svg_kses_allowed_tags
 *
 * A single `require_once render-helpers.php` continues to resolve every
 * function that this file has always provided. All callers are unchanged.
 *
 * @package SGS\Blocks
 */

defined( 'ABSPATH' ) || exit;

require_once __DIR__ . '/helpers-tokens.php';
require_once __DIR__ . '/helpers-typography.php';
require_once __DIR__ . '/helpers-colour-wcag.php';
require_once __DIR__ . '/helpers-media.php';
require_once __DIR__ . '/helpers-configurator-pricing.php';
require_once __DIR__ . '/helpers-value-ladder.php';
require_once __DIR__ . '/helpers-container.php';
require_once __DIR__ . '/helpers-svg-kses.php';
