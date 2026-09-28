<?php
/**
 * Animation timing clamp helpers.
 *
 * Split out of animation-attributes.php (which sits close to the 300-line
 * PHP file limit) so the custom-duration/custom-distance validation added
 * for exact-reproduction entrance animations has its own small home rather
 * than pushing that file over budget.
 *
 * @package SGS\Blocks
 */

namespace SGS\Blocks;

defined( 'ABSPATH' ) || exit;

/**
 * Resolve sgsAnimationDuration to a safe value for output.
 *
 * Accepts the five theme.json duration tokens unchanged, or a custom
 * millisecond count (any numeric string) clamped to 0-5000. Anything else
 * — including a non-numeric custom value — falls back to 'medium' so it
 * never reaches the rendered markup raw.
 *
 * @param string $duration Raw sgsAnimationDuration attribute value.
 * @return string A known token, or a clamped integer-string of milliseconds.
 */
function sgs_clamp_animation_duration( string $duration ): string {
	$tokens = array( 'instant', 'fast', 'medium', 'slow', 'extra-slow' );
	if ( in_array( $duration, $tokens, true ) ) {
		return $duration;
	}
	if ( is_numeric( $duration ) ) {
		return (string) max( 0, min( 5000, (int) round( (float) $duration ) ) );
	}
	return 'medium';
}

/**
 * Resolve sgsAnimationDistance to a safe value for output.
 *
 * Accepts the empty string (the effect's own default) and the four preset
 * steps unchanged, or a custom pixel count (any numeric string) clamped to
 * 0-400. Anything else falls back to the empty string.
 *
 * @param string $distance Raw sgsAnimationDistance attribute value.
 * @return string Empty string, a preset step, or a clamped integer-string of pixels.
 */
function sgs_clamp_animation_distance( string $distance ): string {
	if ( in_array( $distance, array( '', '15', '30', '50', '100' ), true ) ) {
		return $distance;
	}
	if ( is_numeric( $distance ) ) {
		return (string) max( 0, min( 400, (int) round( (float) $distance ) ) );
	}
	return '';
}
