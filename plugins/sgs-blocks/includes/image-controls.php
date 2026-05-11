<?php
/**
 * Universal Image Controls — server-side injection.
 *
 * Adds CSS custom properties and the sgs-has-image-controls utility class to
 * any block that declares `supports.sgs.imageControls: true` in its block.json
 * and has non-default image-control attributes set.
 *
 * Handles:
 * - sgsObjectPosition (string CSS value — e.g. "center 20%")
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

	$object_position = sanitize_text_field( $attrs['sgsObjectPosition'] ?? '' );
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
		'' === $max_width &&
		0 === $height_desktop &&
		0 === $height_tablet &&
		0 === $height_mobile
	) {
		return $block_content;
	}

	// Validate object-position: allow printable ASCII minus semicolons and angle brackets.
	// This covers all valid CSS position values (keywords, %, px, etc.) while preventing injection.
	if ( '' !== $object_position && ! preg_match( '/^[a-zA-Z0-9%\s.,\-]+$/', $object_position ) ) {
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

	// --- Inject class sgs-has-image-controls into the first element. ---
	$class_to_add = 'sgs-has-image-controls';

	// Append to existing class attribute.
	if ( preg_match( '/^(<\w+\b[^>]*\bclass=["\'])/', $block_content ) ) {
		$block_content = preg_replace(
			'/^(<\w+\b[^>]*\bclass=["\'])/',
			'$1' . $class_to_add . ' ',
			$block_content,
			1
		);
	} else {
		// No class attribute yet — add one.
		$block_content = preg_replace(
			'/^(<\w+)(\b)/',
			'$1 class="' . $class_to_add . '"$2',
			$block_content,
			1
		);
	}

	// --- Inject CSS custom properties into inline style. ---
	if ( ! empty( $css_vars ) ) {
		$css_str = implode( ';', $css_vars );

		if ( preg_match( '/^(<\w+\b[^>]*)\bstyle=["\']([^"\']*)["\']/', $block_content ) ) {
			$block_content = preg_replace(
				'/^(<\w+\b[^>]*)\bstyle=["\']([^"\']*)["\']/',
				'$1style="$2;' . esc_attr( $css_str ) . '"',
				$block_content,
				1
			);
		} else {
			$block_content = preg_replace(
				'/^(<\w+)(\b)/',
				'$1 style="' . esc_attr( $css_str ) . '"$2',
				$block_content,
				1
			);
		}
	}

	return $block_content;
}
