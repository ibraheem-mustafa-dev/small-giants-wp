<?php
/**
 * Server-side render for Tiles Field block.
 *
 * WS-4: the tile grid container (previously a bare <div style="grid-template-columns">)
 * now delegates to SGS_Container_Wrapper (kind='layout') so it mirrors sgs/container's
 * grid/flex + align/maxWidth + gap controls.
 *
 * The outer form-field wrapper (field_open/field_close) is preserved — it carries
 * conditional-logic data-attrs and the sgs-form-field BEM classes essential to the
 * forms system.
 *
 * R-31-14: discriminators are EXPLICIT attributes. NEVER branch on empty($content).
 *
 * Renders a grid of clickable tile cards backed by hidden radio/checkbox inputs.
 * selectedStyle controls the visual selected state: border | background | checkmark.
 *
 * @var array    $attributes Block attributes (sanitised by block.json defaults).
 * @var string   $content    Inner block content (unused — dynamic block).
 * @var \WP_Block $block     Block instance (passed to SGS_Container_Wrapper for uid derivation).
 *
 * NO-INLINE: this block emits zero inline style property declarations. Contract + mechanism: Spec 32. Enforced by scripts/audit-inline-styling.js --check.
 * field_open() (shared helper, used by every other form-field-* block) now
 * DOES call get_block_wrapper_attributes() (2026-08-30 border-roundtrip fix,
 * commits 81036c832/ca1f14789), giving the outer div WordPress's own identity
 * class. That call still does not auto-inline this block's own border/spacing
 * supports as CSS — WP's block-supports serialiser only emits an inline
 * `style=` attr for supports this block does NOT declare via `supports.color`/
 * `supports.spacing`/`supports.border` in block.json, and per Spec 32 no SGS
 * block declares those. So these values are still wired the same way as
 * before this fix: extracted from $attributes['style'] here and emitted into
 * a block-private scoped `<style>` (mirrors sgs/container), scoped to a uid
 * CLASS appended via field_open()'s existing `$extra_class` string parameter.
 *
 * @package SGS\Blocks
 */

defined( 'ABSPATH' ) || exit;

use function SGS\Blocks\Forms\field_open;
use function SGS\Blocks\Forms\field_label;
use function SGS\Blocks\Forms\field_help;
use function SGS\Blocks\Forms\field_error;
use function SGS\Blocks\Forms\field_close;
use function SGS\Blocks\Forms\field_id;

require_once dirname( __DIR__, 3 ) . '/includes/class-sgs-container-wrapper.php';
require_once dirname( __DIR__, 3 ) . '/includes/render-helpers.php';

// CSS-keyword sanitiser — letters + hyphen only (border-style).
// ---------------------------------------------------------------------------
// Block-private scoped color/border supports (no-inline contract §A). Mirrors
// sgs/container's render.php pattern exactly: extract $attributes['style'],
// build a wp_style_engine_get_styles() rule scoped to a content-hash uid CLASS,
// re-add the has-*-color / has-*-background-color / has-*-gradient-background
// preset classes that skip-serialisation suppresses.
// ---------------------------------------------------------------------------
$sgs_ft_style_group = is_array( $attributes['style'] ?? null ) ? $attributes['style'] : array();

$sgs_ft_supports_css     = '';
$sgs_ft_supports_classes = array();

$sgs_ft_style_engine_input = array();

// SGS flat colour attrs (D635 pattern — native color.text/color.background
// supports are off; the SgsColourPanel writes here instead). Background
// (colour + gradient, resting + hover) is owned by the shared fill emitter
// below, NOT by the style engine and NOT by supports.color.gradients.
//
// D636 — sibling gradient attribute wins when set+valid. Text colour is kept
// OUT of $sgs_ft_style_engine_input (which stays border-only) because a
// gradient needs the background-clip:text mechanism (sgs_text_colour_decl()),
// not the native style engine's plain `color` declaration.
$sgs_ft_text_colour           = isset( $attributes['textColour'] ) ? (string) $attributes['textColour'] : '';
$sgs_ft_text_colour_gradient  = isset( $attributes['textColourGradient'] ) ? (string) $attributes['textColourGradient'] : '';
$sgs_ft_text_colour_effective = sgs_resolve_text_colour_or_gradient( $sgs_ft_text_colour, $sgs_ft_text_colour_gradient );
if ( ! empty( $sgs_ft_style_group['border'] ) && is_array( $sgs_ft_style_group['border'] ) ) {
	$sgs_ft_border_raw = $sgs_ft_style_group['border'];
	$sgs_ft_border     = array();
	if ( isset( $sgs_ft_border_raw['color'] ) && '' !== $sgs_ft_border_raw['color'] ) {
		$sgs_ft_border['color'] = (string) $sgs_ft_border_raw['color'];
	}
	// G5 (Bean, 2026-08-26): 'style set, no width' means no border by
	// default — never fall through to the browser's initial medium (~3px)
	// border-width.
	if ( isset( $sgs_ft_border_raw['style'] ) && '' !== $sgs_ft_border_raw['style'] && isset( $sgs_ft_border_raw['width'] ) && '' !== $sgs_ft_border_raw['width'] ) {
		$sgs_ft_border['style'] = sgs_css_keyword_sanitise( $sgs_ft_border_raw['style'] );
	}
	if ( isset( $sgs_ft_border_raw['width'] ) && '' !== $sgs_ft_border_raw['width'] ) {
		$sgs_ft_border['width'] = $sgs_ft_border_raw['width'];
	}
	if ( isset( $sgs_ft_border_raw['radius'] ) && '' !== $sgs_ft_border_raw['radius'] ) {
		$sgs_ft_border['radius'] = $sgs_ft_border_raw['radius'];
	}
	if ( ! empty( $sgs_ft_border ) ) {
		$sgs_ft_style_engine_input['border'] = $sgs_ft_border;
	}
}

// uid/selector are computed UNCONDITIONALLY — the fill emitter below needs a
// scoped selector regardless of whether the style-engine branch has anything
// to emit (background is no longer part of $sgs_ft_style_engine_input).
//
// The uid class itself is pushed onto $sgs_ft_supports_classes HERE,
// unconditionally, mirroring sgs/counter's `$wrapper_classes = array(
// 'sgs-counter', $uid )` — the reference pattern for this migration wave.
// Before this fix it was only pushed inside the colour/fill branches below,
// so a border-only instance (no text/background colour set) rendered a
// scoped <style> rule targeting `.{uid}.sgs-form-field--tiles` on a DOM
// element that never carried the uid class — the border CSS existed but
// matched nothing. Root-caused live via check-border-roundtrip.js
// (2026-08-30): observed 0px none where 4px solid was expected.
$sgs_ft_uid                = 'sgs-ft-' . substr( md5( wp_json_encode( $attributes ) ), 0, 8 );
$sgs_ft_sel                = '.' . $sgs_ft_uid . '.sgs-form-field--tiles';
$sgs_ft_supports_classes[] = $sgs_ft_uid;

if ( ! empty( $sgs_ft_style_engine_input ) ) {
	$sgs_ft_engine_styles = wp_style_engine_get_styles(
		$sgs_ft_style_engine_input,
		array( 'selector' => $sgs_ft_sel )
	);
	if ( ! empty( $sgs_ft_engine_styles['css'] ) ) {
		$sgs_ft_supports_css       = $sgs_ft_engine_styles['css'];
		$sgs_ft_supports_classes[] = $sgs_ft_uid;
	}
}

// D636 — sibling gradient attribute wins when set+valid.
if ( '' !== $sgs_ft_text_colour_effective ) {
	$sgs_ft_text_colour_decl = sgs_text_colour_decl( $sgs_ft_text_colour_effective );
	if ( '' !== $sgs_ft_text_colour_decl ) {
		$sgs_ft_supports_css .= "{$sgs_ft_sel}{{$sgs_ft_text_colour_decl};}";
	}
	// MANDATORY companion, not optional: a gradient reaches the browser as
	// background-clip:text, and without this @supports fallback a browser
	// lacking that support gets a bare `color:` holding a gradient string,
	// which it drops silently. No-op for a flat colour.
	$sgs_ft_supports_css .= sgs_text_colour_gradient_fallback_rule( $sgs_ft_sel, $sgs_ft_text_colour_effective );
}

// Background (colour + gradient, resting + hover) is owned by the shared fill
// emitter, NOT by the style engine and NOT by supports.color.gradients.
//
// supports.color.gradients was `true` here, so CORE rendered its own gradient
// panel in the Styles tab, competing with the SGS colour panel — the client saw
// two and could not tell which won. Switching the flag off alone would have
// REMOVED the only gradient control this block had, because the sole gradient
// read was $sgs_ft_style_group['color']['gradient'] (core's own storage). The
// flag flip is therefore PAIRED with a block-private backgroundColourGradient
// exposed through fillRow(), so capability is moved rather than lost.
$sgs_ft_fill_css = sgs_fill_states_css(
	$sgs_ft_sel,
	$attributes,
	array(
		'base'           => 'backgroundColour',
		'hover'          => 'backgroundColourHover',
		'gradient'       => 'backgroundColourGradient',
		'hover_gradient' => 'backgroundColourHoverGradient',
	)
);
if ( '' !== $sgs_ft_fill_css ) {
	$sgs_ft_supports_css .= $sgs_ft_fill_css;
	if ( ! in_array( $sgs_ft_uid, $sgs_ft_supports_classes, true ) ) {
		$sgs_ft_supports_classes[] = $sgs_ft_uid;
	}
}

$sgs_ft_preset_text = isset( $attributes['textColor'] ) ? sanitize_html_class( $attributes['textColor'] ) : '';
$sgs_ft_preset_bg   = isset( $attributes['backgroundColor'] ) ? sanitize_html_class( $attributes['backgroundColor'] ) : '';
if ( '' !== $sgs_ft_preset_text ) {
	$sgs_ft_supports_classes[] = 'has-text-color';
	$sgs_ft_supports_classes[] = 'has-' . $sgs_ft_preset_text . '-color';
}
if ( '' !== $sgs_ft_preset_bg ) {
	$sgs_ft_supports_classes[] = 'has-background';
	$sgs_ft_supports_classes[] = 'has-' . $sgs_ft_preset_bg . '-background-color';
}

$fid            = field_id( $attributes['fieldName'] ?? 'unnamed' );
$tiles          = $attributes['tiles'] ?? array();
$multi          = $attributes['multiSelect'] ?? false;
// columns is read directly by SGS_Container_Wrapper::render() from
// $attributes['columns'] — no local variable needed here (dead-assignment
// cleanup).
$name           = esc_attr( $attributes['fieldName'] ?? '' );
$required       = ! empty( $attributes['required'] );
$help_text      = $attributes['helpText'] ?? '';
$selected_style = $attributes['selectedStyle'] ?? 'checkmark'; // border | background | checkmark.
$input_type     = $multi ? 'checkbox' : 'radio';
$input_name     = $multi ? $name . '[]' : $name;

// Sanitise selectedStyle to avoid unexpected CSS classes.
$allowed_styles = array( 'border', 'background', 'checkmark' );
$selected_style = in_array( $selected_style, $allowed_styles, true ) ? $selected_style : 'checkmark';

// Build aria-describedby: always reference the error span; add help ID when present.
$described_by = array( $fid . '-error' );
if ( ! empty( $help_text ) ) {
	$described_by[] = $fid . '-help';
}
$described_by_attr = 'aria-describedby="' . esc_attr( implode( ' ', $described_by ) ) . '"';

// No-inline contract (§A): the color/border scoped <style> is prepended before
// the field wrapper; the uid + preset classes ride into field_open()'s existing
// $extra_class string param (space-joined — a single array entry containing
// multiple whitespace-separated class tokens renders identically to separate
// tokens in the final class="" attribute).

// ── Block-private border: width / style / colour (Shape B). ──
// Migrated from WP-native supports by scripts/migrate-border-shape-b.js.
// Oracle: sgs/accordion, live-verified with scripts/qa/check-border-roundtrip.js.
$border_width_obj    = is_array( $attributes['borderWidth'] ?? null ) ? $attributes['borderWidth'] : array();
$border_width_top    = sgs_css_length_value( $border_width_obj['top'] ?? '' );
$border_width_right  = sgs_css_length_value( $border_width_obj['right'] ?? '' );
$border_width_bottom = sgs_css_length_value( $border_width_obj['bottom'] ?? '' );
$border_width_left   = sgs_css_length_value( $border_width_obj['left'] ?? '' );
$has_border_width    = ( '' !== $border_width_top || '' !== $border_width_right || '' !== $border_width_bottom || '' !== $border_width_left );

$border_style_raw      = $attributes['borderStyle'] ?? 'none';
$allowed_border_styles = array( 'none', 'solid', 'dashed', 'dotted', 'double', 'groove', 'ridge', 'inset', 'outset' );
$border_style          = in_array( $border_style_raw, $allowed_border_styles, true ) ? $border_style_raw : 'none';

if ( 'none' !== $border_style ) {
	// G5 (Bean, 2026-08-26): a style with no width means NO border -- never fall
	// through to the browser's initial `medium` (~3px).
	if ( $has_border_width ) {
		$bwt = '' !== $border_width_top ? $border_width_top : '0';
		$bwr = '' !== $border_width_right ? $border_width_right : '0';
		$bwb = '' !== $border_width_bottom ? $border_width_bottom : '0';
		$bwl = '' !== $border_width_left ? $border_width_left : '0';
		$sgs_ft_supports_css .= $sgs_ft_sel . '{border-style:' . $border_style . ';border-width:' . "{$bwt} {$bwr} {$bwb} {$bwl}" . ';}';
	}

	// A FLAT colour emits `border-color` DIRECTLY; only a GRADIENT uses the
	// masked ::before ring. NOT sgs_border_states_css(): that helper always
	// routes through sgs_border_gradient_css(), which sets
	// border-color:transparent -- measured live, both of its callers
	// (sgs/product-card, sgs/container) report border-color = rgba(0,0,0,0).
	$border_colour          = (string) ( $attributes['borderColour'] ?? '' );
	$border_colour_gradient = sgs_css_gradient_value( $attributes['borderColourGradient'] ?? '' );
	if ( '' !== $border_colour_gradient ) {
		$sgs_ft_supports_css .= sgs_border_gradient_css( $sgs_ft_sel, $border_colour_gradient, null, '' !== $border_width_top ? $border_width_top : '1px' );
	} elseif ( '' !== $border_colour ) {
		// sgs_colour_value() resolves a palette SLUG; a bare slug is invalid CSS
		// the browser drops (D881 defect 3).
		$sgs_ft_supports_css .= $sgs_ft_sel . '{border-color:' . sgs_colour_value( $border_colour ) . ';}';
	}
} else {
	// G5 corollary: "none" must be an explicit override too, not a
	// no-op -- a variant's own hardcoded CSS border (e.g. a card-style
	// class default) would otherwise keep painting even though the
	// operator picked "no border". Cause-agnostic: harmless when no
	// such default exists, a real fix when one does.
	$sgs_ft_supports_css .= $sgs_ft_sel . '{border-style:none;border-width:0;}';
}

// ── Block-private border-radius (radius is no longer native -- Shape B now
// covers all four legs). Same wp_style_engine_get_styles() route already
// proven live by sgs/media + sgs/before-after's borderRadiusTablet/Mobile
// tiers; base now goes through the identical call instead of WP's native
// serialisation. The style-engine result is an intermediate PHP value ($out
// array), never appended raw -- only its ['css'] string goes through the
// detected sink (`.=` for a string accumulator, `[] =` for an array one). ──
$radius_tiers = sgs_border_radius_tiers( $attributes );
$border_radius_obj = is_array( $radius_tiers['base'] ) ? $radius_tiers['base'] : array();
if ( ! empty( $border_radius_obj ) ) {
	$border_radius_out = wp_style_engine_get_styles(
		array( 'border' => array( 'radius' => $border_radius_obj ) ),
		array( 'selector' => $sgs_ft_sel )
	);
	if ( ! empty( $border_radius_out['css'] ) ) {
		$sgs_ft_supports_css .= $border_radius_out['css'];
	}
}
$border_radius_tablet_obj = $radius_tiers['tablet'];
if ( ! empty( $border_radius_tablet_obj ) ) {
	$border_radius_tab_out = wp_style_engine_get_styles(
		array( 'border' => array( 'radius' => $border_radius_tablet_obj ) ),
		array( 'selector' => $sgs_ft_sel )
	);
	if ( ! empty( $border_radius_tab_out['css'] ) ) {
		$sgs_ft_supports_css .= '@media(max-width:1023px){' . $border_radius_tab_out['css'] . '}';
	}
}
$border_radius_mobile_obj = $radius_tiers['mobile'];
if ( ! empty( $border_radius_mobile_obj ) ) {
	$border_radius_mob_out = wp_style_engine_get_styles(
		array( 'border' => array( 'radius' => $border_radius_mobile_obj ) ),
		array( 'selector' => $sgs_ft_sel )
	);
	if ( ! empty( $border_radius_mob_out['css'] ) ) {
		$sgs_ft_supports_css .= '@media(max-width:767px){' . $border_radius_mob_out['css'] . '}';
	}
}

if ( '' !== $sgs_ft_supports_css ) {
	// wp_strip_all_tags (NOT esc_html) blocks a </style> breakout while leaving
	// CSS combinators intact — $sgs_ft_supports_css is entirely style-engine-
	// generated, so nothing un-sanitised survives here.
	echo '<style>' . wp_strip_all_tags( $sgs_ft_supports_css ) . '</style>'; // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped
}

$sgs_ft_extra_class = trim( 'sgs-form-field--tiles-style-' . esc_attr( $selected_style ) . ' ' . implode( ' ', $sgs_ft_supports_classes ) );

// ── Outer form-field wrapper (field_open/field_close — preserved for forms system) ──
echo field_open( $attributes, 'tiles', $sgs_ft_extra_class ); // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped — field_open() returns safe markup.

// Tile groups use fieldset + legend for correct accessibility grouping.
echo '<fieldset class="sgs-form-field__group">';

if ( ! empty( $attributes['label'] ?? '' ) ) {
	echo '<legend class="sgs-form-field__label">';
	echo esc_html( $attributes['label'] );
	if ( $required ) {
		echo ' <span class="sgs-form-field__required" aria-hidden="true">*</span>';
	}
	echo '</legend>';
}

// ── Build per-tile labels HTML ────────────────────────────────────────────────
ob_start();
foreach ( $tiles as $i => $tile ) {
	$tile_id = $fid . '-tile-' . $i;

	echo '<label class="sgs-form-tile" for="' . esc_attr( $tile_id ) . '" data-wp-on--click="actions.toggleTile">';
	// Use value if set; fall back to label (slugified) so the input always has a meaningful value.
	$tile_value = ! empty( $tile['value'] ) ? $tile['value'] : sanitize_title( $tile['label'] ?? '' );
	echo '<input type="' . esc_attr( $input_type ) . '" id="' . esc_attr( $tile_id ) . '" name="' . esc_attr( $input_name ) . '" value="' . esc_attr( $tile_value ) . '" class="sgs-form-tile__input"';
	if ( $required ) {
		echo ' required aria-required="true"';
	}
	// First tile carries aria-describedby for the whole group.
	if ( 0 === $i ) {
		echo ' ' . $described_by_attr; // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped — $described_by_attr built with esc_attr above.
	}
	echo ' />';

	if ( ! empty( $tile['icon'] ) ) {
		$tile_icon_source = $tile['iconSource'] ?? '';
		require_once dirname( __DIR__, 3 ) . '/includes/lucide-icons.php';
		if ( 'lucide' === $tile_icon_source ) {
			// Explicit lucide source — resolve to SVG.
			$tile_svg = sgs_get_lucide_icon( $tile['icon'] );
			if ( '' !== $tile_svg ) {
				echo '<span class="sgs-form-tile__icon" aria-hidden="true">';
				echo $tile_svg; // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- sgs_get_lucide_icon() returns pre-sanitised SVG markup.
				echo '</span>';
			} else {
				// Unknown slug — fall back to raw value.
				echo '<span class="sgs-form-tile__icon" aria-hidden="true">' . esc_html( $tile['icon'] ) . '</span>';
			}
		} elseif ( '' === $tile_icon_source ) {
			// Legacy value: no source stored. Try lucide first (pre-migration bare
			// slugs), then fall back to echoing the raw string (emoji/text).
			$tile_svg = sgs_get_lucide_icon( $tile['icon'] );
			if ( '' !== $tile_svg ) {
				echo '<span class="sgs-form-tile__icon" aria-hidden="true">';
				echo $tile_svg; // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- sgs_get_lucide_icon() returns pre-sanitised SVG markup.
				echo '</span>';
			} else {
				echo '<span class="sgs-form-tile__icon" aria-hidden="true">' . esc_html( $tile['icon'] ) . '</span>';
			}
		} else {
			// Explicit non-lucide source (emoji, dashicon, wp-icon) — echo raw.
			echo '<span class="sgs-form-tile__icon" aria-hidden="true">' . esc_html( $tile['icon'] ) . '</span>';
		}
	}

	if ( ! empty( $tile['image'] ) ) {
		echo '<img class="sgs-form-tile__image" src="' . esc_url( $tile['image'] ) . '" alt="" aria-hidden="true" loading="lazy" />';
	}

	echo '<span class="sgs-form-tile__label">' . esc_html( $tile['label'] ?? '' ) . '</span>';
	echo '<span class="sgs-form-tile__check" aria-hidden="true"></span>';
	echo '</label>';
}
$tiles_inner_html = ob_get_clean();

// ── WS-4: tile grid via shared wrapper helper (kind='layout') ─────────────────
// extra_classes carries 'sgs-form-tiles' so existing CSS selectors are unchanged.
// The helper provides grid-template-columns / align/maxWidth / gap controls.
// No extra_attrs needed — data-* are on the individual tile <label> elements above.
// phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped — SGS_Container_Wrapper::render() output is pre-sanitised.
echo SGS_Container_Wrapper::render(
	$attributes,
	$block,
	$tiles_inner_html,
	'layout',
	array(
		'tag'           => 'div',
		'extra_classes' => array( 'sgs-form-tiles' ),
		'extra_styles'  => array(),
		'extra_attrs'   => array(),
	)
);

echo '</fieldset>';

echo field_error( $fid ); // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped — field_error() returns safe markup.
echo field_help( $fid, $attributes ); // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped — field_help() returns safe markup.
echo field_close(); // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped — field_close() returns safe markup.
