<?php
/**
 * Server-side render for sgs/mega-aside — the optional side panel of a mega.
 *
 * GROUND-TRUTH: verified against .claude/plans/archive/2026-07-24-mega-menu-BUILD-SPEC.md
 * §8 (aside formats) + the live mega-panel/render.php pattern (uid, sgs_colour_value,
 * sgs_css_length_sanitise, sgs_emit_responsive_css) this file mirrors.
 *
 * Renders the `.sgs-mega-aside` element carrying its InnerBlocks (media + tag +
 * heading + text + button — always all five children present; `asideFormat`
 * only changes which are VISIBLE and how they're arranged, never the template).
 *
 * OWNERSHIP SPLIT (CF-10, parent-paints-child): the parent sgs/mega-panel paints
 * this element's GRID POSITION — width + divider — via its own scoped CSS keyed
 * on `.sgs-mega-aside`. This block owns its own FILL (background/padding/radius/
 * border) and its content ARRANGEMENT (asideFormat), resolved against the
 * panel's inherited --sgs-mm-* custom properties as safe fallbacks.
 *
 * NO-INLINE: this block emits zero inline style property declarations.
 * Contract + mechanism: Spec 32. Enforced by scripts/audit-inline-styling.js --check.
 * Every attribute value is emitted into this instance's own scoped `<style>`
 * tag, keyed to a content-addressed uid selector.
 *
 * SECURITY (CF-2, binding): every colour/token attr resolves via
 * `sgs_colour_value()`; every free dimensional attr resolves via the shared
 * `sgs_css_length_value()` regex sanitiser; `asideFormat` is a PHP-validated
 * enum (block.json deliberately declares NO JSON `enum` — an out-of-enum JSON
 * enum silently coerces the stored value to the block.json default,
 * `blockjson-enum-coerces-invalid-to-default`); nothing raw is ever
 * concatenated into the scoped `<style>`. `wp_strip_all_tags()` guards the one
 * remaining `</style>`-breakout vector as a defence-in-depth backstop.
 *
 * @var array    $attributes Block attributes.
 * @var string   $content Rendered InnerBlocks (media + label + heading + text + button).
 * @var \WP_Block $block   Block instance.
 *
 * @package SGS\Blocks
 */

defined( 'ABSPATH' ) || exit;

require_once dirname( __DIR__, 3 ) . '/includes/render-helpers.php';

// ---------------------------------------------------------------------------
// 0. Sanitise every attribute.
// ---------------------------------------------------------------------------

$allowed_formats = array( 'feature', 'preview', 'cta' );
$aside_format    = isset( $attributes['asideFormat'] ) && in_array( $attributes['asideFormat'], $allowed_formats, true )
	? (string) $attributes['asideFormat']
	: 'feature';

$aside_bg_raw                = isset( $attributes['asideBg'] ) ? (string) $attributes['asideBg'] : '';
$aside_bg_gradient_raw       = isset( $attributes['asideBgGradient'] ) ? (string) $attributes['asideBgGradient'] : '';
$aside_bg_hover_raw          = isset( $attributes['asideBgHover'] ) ? (string) $attributes['asideBgHover'] : '';
$aside_bg_hover_gradient_raw = isset( $attributes['asideBgHoverGradient'] ) ? (string) $attributes['asideBgHoverGradient'] : '';
$aside_border_colour_raw     = isset( $attributes['asideBorderColour'] ) ? (string) $attributes['asideBorderColour'] : '';
// D636 border-colour gradient — sibling attribute, wins over $aside_border_colour_raw when set.
$aside_border_colour_gradient = sgs_css_gradient_value( isset( $attributes['asideBorderColourGradient'] ) ? $attributes['asideBorderColourGradient'] : '' );
$aside_radius                 = function_exists( 'sgs_css_length_value' ) ? sgs_css_length_value( $attributes['asideRadius'] ?? '' ) : '';
// Box-object interface contract §1/§2: asideBorderWidth is an SGS custom
// OBJECT attr { top, right, bottom, left } — no tiers (mirrors sgs/button's
// base-only borderWidth). box_family = 'asideBorderWidth' (a per-area family,
// like hero's imageBorderWidth / product-card's ctaBorderWidth — not the
// generic root 'borderWidth' family, since this is a per-element scoped box).
$aside_border_width_obj       = is_array( $attributes['asideBorderWidth'] ?? null ) ? $attributes['asideBorderWidth'] : array();
$aside_border_width_shorthand = function_exists( 'sgs_box_object_shorthand' ) ? sgs_box_object_shorthand( $aside_border_width_obj ) : null;
$aside_padding_obj            = is_array( $attributes['asidePadding'] ?? null ) ? $attributes['asidePadding'] : array();

// ---------------------------------------------------------------------------
// 1. Content-addressed uid + selectors (STOP-NO-KSORT: $attributes hashed
// verbatim, never reordered).
// ---------------------------------------------------------------------------

$uid      = 'sgs-mega-aside-' . substr( md5( wp_json_encode( $attributes ) ), 0, 8 );
$root_sel = '.' . $uid . '.wp-block-sgs-mega-aside';

$css = '';

// ---------------------------------------------------------------------------
// 2. Fill: background / border / radius. Every colour resolves against the
// panel's inherited custom properties as a safe fallback so an unset value
// still looks correct inside any panel scheme (light-only today, dark-ready
// once the panel's dark value set ships — the var() fallback chain needs no
// change when that lands).
// ---------------------------------------------------------------------------

// Background colour + gradient (with hover sibling, 2026-09-06 FILL closeout).
// sgs_custom_property_gradient_decls() emits --sgs-mega-aside-bg,
// --sgs-mega-aside-bg-gradient for resting state, plus -hover/-hover-gradient
// variants. style.css reads these via var() with fallback chains so an unset
// attribute renders byte-identically to before this change.
if ( function_exists( 'sgs_custom_property_gradient_decls' ) && '' !== $aside_bg_raw ) {
	$bg_var_decls = sgs_custom_property_gradient_decls(
		'sgs-mega-aside-bg',
		$aside_bg_raw,
		$aside_bg_gradient_raw,
		$aside_bg_hover_raw,
		$aside_bg_hover_gradient_raw
	);
	foreach ( $bg_var_decls as $var_decl ) {
		$css .= $root_sel . '{' . $var_decl . ';}';
	}
}

if ( '' !== $aside_radius ) {
	$css .= $root_sel . '{border-radius:' . $aside_radius . ';}';
}

// Border only paints when at least one side has a non-zero width (an empty/
// all-zero box means "no border", matching the block's honest-absence
// contract). Per-side widths need border-width/-style/-color as separate
// declarations (a shorthand `border:` can't carry 4 distinct widths).
$aside_border_has_width = false;
foreach ( array( 'top', 'right', 'bottom', 'left' ) as $aside_border_side ) {
	if ( (float) sgs_css_length_value( $aside_border_width_obj[ $aside_border_side ] ?? '' ) > 0 ) {
		$aside_border_has_width = true;
		break;
	}
}
if ( $aside_border_has_width && null !== $aside_border_width_shorthand ) {
	$aside_border_colour_value = '' !== $aside_border_colour_raw
		? sgs_colour_value( $aside_border_colour_raw )
		: 'var(--sgs-mm-panel-border, rgba(0,0,0,.12))';
	$css                      .= $root_sel . '{border-width:' . $aside_border_width_shorthand . ';border-style:solid;border-color:' . $aside_border_colour_value . ';}';

	// D636 border builder — masked ::before, wins over the flat border-color
	// decl above (emitted after it so the cascade favours the mask).
	if ( '' !== $aside_border_colour_gradient ) {
		$aside_border_gradient_width = sgs_css_length_value( $aside_border_width_obj['top'] ?? '' );
		$css                        .= sgs_border_gradient_css(
			$root_sel,
			$aside_border_colour_gradient,
			null,
			'' !== $aside_border_gradient_width ? $aside_border_gradient_width : '1px'
		);
	}
}

if ( function_exists( 'sgs_emit_responsive_css' ) && ! empty( $aside_padding_obj ) ) {
	$css .= sgs_emit_responsive_css(
		$root_sel,
		array(
			array(
				'value'        => $aside_padding_obj,
				'css'          => 'padding',
				'box'          => true,
				'unit_default' => 'px',
			),
		),
		array( 'container' => true )
	);
}

// ---------------------------------------------------------------------------
// 3. Format arrangement (structural — depends only on the enum, not on a
// resolved instance VALUE, so this mirrors the same rule shape declared
// statically in style.css/editor.css; emitted here too for guaranteed
// frontend delivery, matching mega-panel's own dual-delivery pattern).
// ---------------------------------------------------------------------------

if ( 'cta' === $aside_format ) {
	// Compact "brands" style: pill + description + CTA. Media + heading hidden.
	$css .= $root_sel . ' > .wp-block-sgs-media,' . $root_sel . ' > .wp-block-sgs-heading{display:none;}';
} elseif ( 'preview' === $aside_format ) {
	// Hover-reactive: only the heading (title) + text (description) are
	// visible; view.js swaps their content on hover/focus of a sibling link
	// and restores the authored default (the "sensible resting state") when
	// nothing is hovered.
	$css .= $root_sel . ' > .wp-block-sgs-media,' . $root_sel . ' > .wp-block-sgs-label,' . $root_sel . ' > .wp-block-sgs-button{display:none;}';
}
// 'feature' (default) shows all five children — no hide rule needed.

// ---------------------------------------------------------------------------
// 4. Wrapper attributes + output. wp_strip_all_tags (NOT esc_html) blocks a
// </style> breakout while leaving CSS combinators intact; every value
// reaching $css is pre-sanitised (sgs_colour_value / sgs_css_length_sanitise /
// sgs_emit_responsive_css / the enum whitelist above already rejects anything
// outside its allowed value set).
// ---------------------------------------------------------------------------

$wrapper_args       = array(
	'class'             => 'sgs-mega-aside ' . $uid,
	'data-aside-format' => $aside_format,
);
$wrapper_attributes = get_block_wrapper_attributes( $wrapper_args );

// phpcs:disable WordPress.Security.EscapeOutput.OutputNotEscaped -- $css pre-sanitised (sgs_colour_value / sgs_css_length_sanitise / sgs_emit_responsive_css / enum whitelist), wp_strip_all_tags guards </style>; $wrapper_attributes from get_block_wrapper_attributes(); $content is trusted WP InnerBlocks output.
if ( '' !== $css ) {
	printf( '<style>%s</style>', wp_strip_all_tags( $css ) );
}

printf(
	'<div %1$s>%2$s</div>',
	$wrapper_attributes,
	$content
);
// phpcs:enable WordPress.Security.EscapeOutput.OutputNotEscaped
