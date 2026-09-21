<?php
/**
 * Surface ground — the shared emitters for backdrop blur, saturate and fill
 * translucency (Wave 3C U-1).
 *
 * One mechanism for every surface that can be frosted: `SGS_Container_Wrapper`
 * calls sgs_surface_backdrop_decls() for the blocks that declare `surfaceBlur` /
 * `surfaceSaturate`, and the block-private surfaces (mega panel, drawer) call the
 * same functions from their own render.php. Nothing here emits anything for an
 * unset value, so a block that has never set them renders byte-identical CSS.
 *
 * `backdrop-filter` makes its element the containing block for `position:fixed`
 * descendants, which is why an empty value emits NOTHING (even `saturate(100%)`
 * would create that context while doing no visible work).
 *
 * @package SGS\Blocks
 */

defined( 'ABSPATH' ) || exit;

require_once __DIR__ . '/helpers-css-safety.php';

if ( ! function_exists( 'sgs_surface_saturate_value' ) ) {
	/**
	 * A whole-number saturate percentage, 0 to 500, or null when nothing is set.
	 *
	 * 0 is a legal value (fully desaturated), so this compares against null and
	 * the empty string, never with empty().
	 *
	 * @param mixed $raw Raw attribute value.
	 * @return int|null
	 */
	function sgs_surface_saturate_value( $raw ) {
		if ( null === $raw || '' === $raw || ! is_numeric( $raw ) ) {
			return null;
		}
		return max( 0, min( 500, (int) round( (float) $raw ) ) );
	}
}

if ( ! function_exists( 'sgs_surface_backdrop_decls' ) ) {
	/**
	 * Declarations (no trailing semicolons) for the backdrop filter.
	 *
	 * @param mixed $blur     A single CSS length (e.g. '24px'), or empty.
	 * @param mixed $saturate A whole-number percentage (e.g. 150), or empty.
	 * @return string[] Zero or two declarations: `backdrop-filter` and its `-webkit-` twin.
	 */
	function sgs_surface_backdrop_decls( $blur, $saturate = null ): array {
		$parts = array();
		$sat   = sgs_surface_saturate_value( $saturate );
		if ( null !== $sat ) {
			$parts[] = 'saturate(' . $sat . '%)';
		}
		$len = sgs_css_single_length_value( $blur );
		if ( '' !== $len ) {
			$parts[] = 'blur(' . $len . ')';
		}
		if ( empty( $parts ) ) {
			return array();
		}
		$value = implode( ' ', $parts );
		return array(
			'backdrop-filter:' . $value,
			'-webkit-backdrop-filter:' . $value,
		);
	}
}

if ( ! function_exists( 'sgs_surface_fill_alpha' ) ) {
	/**
	 * A fill colour mixed with transparency, or '' when it cannot be done.
	 *
	 * Only a plain colour can be mixed: a gradient or image is not a <color>, and
	 * an empty fill has nothing to make translucent. In both cases this returns ''
	 * and the caller keeps its own fill. An orphaned palette token
	 * (`var(--wp--preset--color--x, currentColor)`) falls back to transparent, not
	 * to the text colour, so a missing token never tints the surface.
	 *
	 * @param string $fill    The caller's resolved fill (from sgs_colour_value()).
	 * @param mixed  $opacity 0 to 1, or empty.
	 * @return string `color-mix(...)`, or ''.
	 */
	function sgs_surface_fill_alpha( $fill, $opacity ): string {
		if ( null === $opacity || '' === $opacity || ! is_numeric( $opacity ) ) {
			return '';
		}
		$alpha = (float) $opacity;
		if ( $alpha >= 1 ) {
			return '';
		}
		$alpha = max( 0.0, $alpha );
		$fill  = trim( (string) $fill );
		if ( '' === $fill || preg_match( '/(gradient|url)\s*\(/i', $fill ) ) {
			return '';
		}
		$fill    = preg_replace( '/,\s*currentColor\s*\)\s*$/i', ', transparent)', $fill );
		$percent = rtrim( rtrim( number_format( $alpha * 100, 2, '.', '' ), '0' ), '.' );
		if ( '' === $percent ) {
			$percent = '0';
		}
		return 'color-mix(in srgb, ' . $fill . ' ' . $percent . '%, transparent)';
	}
}
