<?php
/**
 * Shared media-position CSS emitter — mechanism (c) of the Spec 35
 * capability-routing doctrine (`.claude/plans/spec-35-capability-routing-
 * doctrine.md` Part 9): a pure function, no filter, no injection. Each block
 * calls this with ITS OWN selector and echoes the result into its own scoped
 * `<style>` tag — the same shape as `sgs_typography_css_rule()`.
 *
 * This is the ONE place the {x,y} FocalPointPicker shape -> CSS
 * `object-position` percentage-pair maths lives. It was previously
 * duplicated inline in includes/image-controls.php (the universal
 * render_block injector) — extracted so a block converting to the explicit
 * mechanism and the legacy auto-injection filter can never round differently
 * for the same stored value.
 *
 * @package SGS\Blocks
 */

defined( 'ABSPATH' ) || exit;

if ( ! function_exists( 'sgs_media_position_focal_to_css' ) ) {
	/**
	 * FocalPointPicker {x,y} (floats 0-1) -> CSS "X% Y%" object-position value.
	 * Clamped 0-1, rounded 2dp. Returns '' when unset or at the CSS default
	 * (centre/centre) — an unset/default value should emit nothing so the
	 * element's own CSS default (or `object-fit`'s implicit centring) wins.
	 *
	 * @param mixed $focal_point Raw attribute value — expected {x,y} array.
	 * @return string "X% Y%" or ''.
	 */
	function sgs_media_position_focal_to_css( $focal_point ) {
		if ( ! is_array( $focal_point ) || ! isset( $focal_point['x'], $focal_point['y'] ) ) {
			return '';
		}
		$x = max( 0.0, min( 1.0, (float) $focal_point['x'] ) );
		$y = max( 0.0, min( 1.0, (float) $focal_point['y'] ) );
		if ( 0.5 === $x && 0.5 === $y ) {
			return '';
		}
		return round( $x * 100, 2 ) . '% ' . round( $y * 100, 2 ) . '%';
	}
}

if ( ! function_exists( 'sgs_media_position_css' ) ) {
	/**
	 * Build a scoped object-fit/object-position CSS rule for one media
	 * element. The caller passes its OWN, already-safe selector — this
	 * function never guesses at DOM shape (Part 1/2 of the doctrine: this is
	 * mechanism (c), explicitly wired, never a render_block injector).
	 *
	 * @param array  $attributes Block attributes.
	 * @param string $prefix     Attribute prefix ('' | 'sgs' | …) — matches
	 *                           the block's own {prefix}ObjectPosition /
	 *                           {prefix}ObjectFit attribute names.
	 * @param string $selector   Fully-formed, already-safe CSS selector.
	 * @return string CSS text (no <style> wrapper); '' when nothing is set.
	 */
	function sgs_media_position_css( array $attributes, $prefix, $selector ) {
		$k_position = '' !== $prefix ? $prefix . 'ObjectPosition' : 'objectPosition';
		$k_fit      = '' !== $prefix ? $prefix . 'ObjectFit' : 'objectFit';

		$position = sgs_media_position_focal_to_css( $attributes[ $k_position ] ?? null );

		$allowed_fits = array( 'cover', 'contain', 'fill', 'none', 'scale-down' );
		$fit_raw      = $attributes[ $k_fit ] ?? '';
		$fit          = in_array( $fit_raw, $allowed_fits, true ) ? $fit_raw : '';

		if ( '' === $position && '' === $fit ) {
			return '';
		}

		$decls = array();
		if ( '' !== $fit ) {
			$decls[] = 'object-fit:' . $fit . ';';
		}
		if ( '' !== $position ) {
			$decls[] = 'object-position:' . $position . ';';
		}

		return $selector . '{' . implode( '', $decls ) . '}';
	}
}
