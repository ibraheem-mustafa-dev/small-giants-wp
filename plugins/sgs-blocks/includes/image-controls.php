<?php
/**
 * Universal Image Controls — server-side injection.
 *
 * Adds CSS custom properties and the sgs-has-image-controls utility class to
 * any block that declares `supports.sgs.imageControls: true` in its block.json
 * and has non-default image-control attributes set.
 *
 * Handles:
 * - sgsObjectPosition ({x,y} floats 0-1 — FocalPointPicker shape; resolved to
 *                      an object-position percentage pair server-side)
 * - sgsObjectFit      (string — cover/contain/fill/none/scale-down, '' = no override)
 * - sgsMaxWidth       (string CSS value — e.g. "640px" or "80%")
 * - sgsHeightDesktop  (integer, 0 = auto)
 * - sgsHeightTablet   (integer, 0 = inherit from desktop)
 * - sgsHeightMobile   (integer, 0 = inherit from desktop)
 * - sgsHeightUnit     (string — px / vh / em / %)
 *
 * Class and CSS variable injection mirrors the hover-effects.php pattern:
 * append to existing class="..." if present, otherwise add a new class
 * attribute; same for style="...".
 *
 * @package SGS\Blocks
 */

namespace SGS\Blocks;

defined( 'ABSPATH' ) || exit;

add_filter( 'render_block', __NAMESPACE__ . '\\inject_image_controls', 10, 2 );

/**
 * Inject image-control CSS custom properties and class into block output.
 *
 * @param string $block_content Rendered block HTML.
 * @param array  $block         Block data including attrs.
 * @return string Modified block HTML.
 */
function inject_image_controls( string $block_content, array $block ): string {
	$block_name = $block['blockName'] ?? '';

	if ( '' === $block_name ) {
		return $block_content;
	}

	// Check the block type's supports for sgs.imageControls.
	$block_type = \WP_Block_Type_Registry::get_instance()->get_registered( $block_name );

	if ( null === $block_type ) {
		return $block_content;
	}

	$supports = $block_type->supports ?? array();

	if ( empty( $supports['sgs']['imageControls'] ) ) {
		return $block_content;
	}

	$attrs = $block['attrs'] ?? array();

	// Allowed CSS units — validated strictly to prevent injection.
	$allowed_units = array( 'px', 'vh', 'em', '%' );

	// sgsObjectPosition is a FocalPointPicker {x,y} object (floats 0-1). Resolve
	// to an "X% Y%" object-position pair server-side. A legacy free-text string
	// (pre-T3.5 shape) is not round-tripped here — CLEAN RESHAPE policy — but is
	// handled gracefully (treated as absent) rather than fatally, since WP
	// silently coerces a shape mismatch against the block.json `type: 'object'`
	// default back to `{}` on save/load, so a stored legacy string cannot
	// actually reach this filter once a block re-saves under the new schema.
	$object_position_raw = $attrs['sgsObjectPosition'] ?? array();
	$object_position     = '';
	if ( is_array( $object_position_raw ) && isset( $object_position_raw['x'], $object_position_raw['y'] ) ) {
		$focal_x = max( 0.0, min( 1.0, (float) $object_position_raw['x'] ) );
		$focal_y = max( 0.0, min( 1.0, (float) $object_position_raw['y'] ) );
		// Only emit when it differs from the CSS default (center center / 50% 50%).
		if ( 0.5 !== $focal_x || 0.5 !== $focal_y ) {
			$object_position = round( $focal_x * 100, 2 ) . '% ' . round( $focal_y * 100, 2 ) . '%';
		}
	}

	$allowed_object_fits = array( 'cover', 'contain', 'fill', 'none', 'scale-down' );
	$object_fit_raw      = $attrs['sgsObjectFit'] ?? '';
	$object_fit          = in_array( $object_fit_raw, $allowed_object_fits, true ) ? $object_fit_raw : '';

	$max_width       = sanitize_text_field( $attrs['sgsMaxWidth'] ?? '' );
	$height_desktop  = absint( $attrs['sgsHeightDesktop'] ?? 0 );
	$height_tablet   = absint( $attrs['sgsHeightTablet'] ?? 0 );
	$height_mobile   = absint( $attrs['sgsHeightMobile'] ?? 0 );
	$height_unit_raw = $attrs['sgsHeightUnit'] ?? 'px';
	$height_unit     = in_array( $height_unit_raw, $allowed_units, true )
		? $height_unit_raw
		: 'px';

	// Bail early — nothing to do.
	if (
		'' === $object_position &&
		'' === $object_fit &&
		'' === $max_width &&
		0 === $height_desktop &&
		0 === $height_tablet &&
		0 === $height_mobile
	) {
		return $block_content;
	}

	// Validate object-position (defence in depth — already numeric-derived above).
	if ( '' !== $object_position && ! preg_match( '/^[0-9.]+% [0-9.]+%$/', $object_position ) ) {
		$object_position = '';
	}

	// Validate max-width: valid CSS dimension or percentage string.
	if ( '' !== $max_width && ! preg_match( '/^\d+(\.\d+)?(px|em|rem|vh|vw|ch|%|svh|svw)$/', $max_width ) ) {
		$max_width = '';
	}

	// --- Build CSS custom properties. ---
	$css_vars = array();

	if ( '' !== $object_position ) {
		$css_vars[] = '--sgs-object-position:' . $object_position;
	}

	if ( '' !== $object_fit ) {
		$css_vars[] = '--sgs-object-fit:' . $object_fit;
	}

	if ( '' !== $max_width ) {
		$css_vars[] = '--sgs-max-width:' . $max_width;
	}

	if ( $height_desktop > 0 ) {
		$css_vars[] = '--sgs-height-desktop:' . $height_desktop . $height_unit;
	}

	if ( $height_tablet > 0 ) {
		$css_vars[] = '--sgs-height-tablet:' . $height_tablet . $height_unit;
	}

	if ( $height_mobile > 0 ) {
		$css_vars[] = '--sgs-height-mobile:' . $height_mobile . $height_unit;
	}

	// --- Locate the block's actual ROOT element. ---
	// The no-inline styling contract (Spec 32, D293-D296) has every composite
	// using SGS_Container_Wrapper — and several blocks directly — PREPEND a
	// scoped `<style id="…">…</style>` tag before their real wrapper element.
	// The regexes below used to be anchored at `^` against the RAW
	// $block_content, assuming the first tag is the block's root — which broke
	// the moment a leading <style> tag existed: the class landed on the
	// <style> tag (invisible), and the CSS-var injection wrote a nonsense
	// style="" attribute onto the <style> element, both then stripped by the
	// p99 CSS-lift filter (sgs_lift_block_css, class-sgs-css-registry.php).
	// Same root cause + fix shape as hover-effects.php / device-visibility.php
	// / animation-attributes.php / parallax.php — skip every leading
	// <style>/<script> block to find the real wrapper tag.
	$sgs_root_offset = 0;
	while ( preg_match( '/^\s*<(style|script)\b[^>]*>/i', substr( $block_content, $sgs_root_offset ), $sgs_lead_match ) ) {
		$sgs_close_tag = '</' . strtolower( $sgs_lead_match[1] ) . '>';
		$sgs_close_pos = stripos( $block_content, $sgs_close_tag, $sgs_root_offset );
		if ( false === $sgs_close_pos ) {
			break; // Malformed markup — bail out, treat the whole string as-is.
		}
		$sgs_root_offset = $sgs_close_pos + strlen( $sgs_close_tag );
	}

	// --- Inject class sgs-has-image-controls into the ROOT tag. ---
	$class_to_add = 'sgs-has-image-controls';

	$sgs_head = substr( $block_content, 0, $sgs_root_offset );
	$sgs_root = substr( $block_content, $sgs_root_offset );

	// Append to existing class attribute.
	if ( preg_match( '/^(<\w+\b[^>]*\bclass=["\'])/', $sgs_root ) ) {
		$sgs_root = preg_replace(
			'/^(<\w+\b[^>]*\bclass=["\'])/',
			'$1' . $class_to_add . ' ',
			$sgs_root,
			1
		);
	} else {
		// No class attribute yet — add one.
		$sgs_root = preg_replace(
			'/^(<\w+)(\b)/',
			'$1 class="' . $class_to_add . '"$2',
			$sgs_root,
			1
		);
	}
	$block_content = $sgs_head . $sgs_root;

	// --- Inject CSS custom properties into inline style (ROOT tag only). ---
	if ( ! empty( $css_vars ) ) {
		$css_str = implode( ';', $css_vars );

		$sgs_head = substr( $block_content, 0, $sgs_root_offset );
		$sgs_root = substr( $block_content, $sgs_root_offset );

		if ( preg_match( '/^(<\w+\b[^>]*)\bstyle=["\']([^"\']*)["\']/', $sgs_root ) ) {
			$sgs_root = preg_replace(
				'/^(<\w+\b[^>]*)\bstyle=["\']([^"\']*)["\']/',
				'$1style="$2;' . esc_attr( $css_str ) . '"',
				$sgs_root,
				1
			);
		} else {
			$sgs_root = preg_replace(
				'/^(<\w+)(\b)/',
				'$1 style="' . esc_attr( $css_str ) . '"$2',
				$sgs_root,
				1
			);
		}
		$block_content = $sgs_head . $sgs_root;
	}

	return $block_content;
}
