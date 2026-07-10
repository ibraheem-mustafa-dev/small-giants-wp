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
 * R-22-14: discriminators are EXPLICIT attributes. NEVER branch on empty($content).
 *
 * Renders a grid of clickable tile cards backed by hidden radio/checkbox inputs.
 * selectedStyle controls the visual selected state: border | background | checkmark.
 *
 * @var array    $attributes Block attributes (sanitised by block.json defaults).
 * @var string   $content    Inner block content (unused — dynamic block).
 * @var \WP_Block $block     Block instance (passed to SGS_Container_Wrapper for uid derivation).
 *
 * NO-INLINE (contract §A, 2026-07-09): color + __experimentalBorder are declared
 * with __experimentalSkipSerialization in block.json. field_open() (shared helper,
 * off-limits to edit — used by every other form-field-* block) never calls
 * get_block_wrapper_attributes(), so these supports were never auto-inlined onto
 * its div in the first place; they were dead controls. This migration wires them:
 * the values are extracted from $attributes['style'] here and emitted into a
 * block-private scoped `<style>` (mirrors sgs/container), scoped to a uid CLASS
 * appended via field_open()'s existing `$extra_class` string parameter (no edit
 * to the shared helper file required).
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
$sgs_ft_css_keyword = static function ( $value ) {
	return preg_replace( '/[^a-zA-Z-]/', '', (string) $value );
};

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

if ( function_exists( 'wp_style_engine_get_styles' ) ) {
	$sgs_ft_style_engine_input = array();

	if ( ! empty( $sgs_ft_style_group['color'] ) && is_array( $sgs_ft_style_group['color'] ) ) {
		$sgs_ft_style_engine_input['color'] = $sgs_ft_style_group['color'];
	}
	if ( ! empty( $sgs_ft_style_group['border'] ) && is_array( $sgs_ft_style_group['border'] ) ) {
		$sgs_ft_border_raw = $sgs_ft_style_group['border'];
		$sgs_ft_border     = array();
		if ( isset( $sgs_ft_border_raw['color'] ) && '' !== $sgs_ft_border_raw['color'] ) {
			$sgs_ft_border['color'] = (string) $sgs_ft_border_raw['color'];
		}
		if ( isset( $sgs_ft_border_raw['style'] ) && '' !== $sgs_ft_border_raw['style'] ) {
			$sgs_ft_border['style'] = $sgs_ft_css_keyword( $sgs_ft_border_raw['style'] );
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

	if ( ! empty( $sgs_ft_style_engine_input ) ) {
		$sgs_ft_uid = 'sgs-ft-' . substr( md5( wp_json_encode( $attributes ) ), 0, 8 );
		$sgs_ft_sel = '.' . $sgs_ft_uid . '.sgs-form-field--tiles';

		$sgs_ft_engine_styles = wp_style_engine_get_styles(
			$sgs_ft_style_engine_input,
			array( 'selector' => $sgs_ft_sel )
		);
		if ( ! empty( $sgs_ft_engine_styles['css'] ) ) {
			$sgs_ft_supports_css       = $sgs_ft_engine_styles['css'];
			$sgs_ft_supports_classes[] = $sgs_ft_uid;
		}
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
$columns        = absint( $attributes['columns'] ?? 3 );
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
