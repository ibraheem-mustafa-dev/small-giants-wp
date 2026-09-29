<?php
/**
 * Background image zoom on hover — the Background panel's "Zoom background on hover".
 *
 * For every block that renders through SGS_Container_Wrapper and mounts the Background
 * panel (container, hero, cta-section, site-header, site-footer, trust-bar, multi-button,
 * physics-canvas). Hovering the block, or focusing into it, scales its background image
 * inside the block's own frame: the root already clips a background image
 * (`.sgs-container--has-bg-image{overflow:hidden}` in container/style.css), so the image
 * never grows past the block. Whole-image spill is deliberately not offered here: a
 * background has no frame of its own to grow past.
 *
 * Attributes (declared in each of those blocks' block.json; controls in
 * src/blocks/container/components/BackgroundPanel.js):
 *   bgHoverZoom             on/off
 *   bgHoverZoomScale        zoom in % (101-150, default 105)
 *   bgHoverZoomDuration     ms (0-3000, default 600)
 *   bgHoverZoomEasing       named easing (sgs_motion_easing_css(), default 'ease')
 *   bgHoverZoomEasingCustom cubic-bezier() for the 'custom' easing
 *
 * Off while Ken Burns or parallax is on: both already move the same image.
 *
 * The wrapper reads the attributes and calls sgs_container_bg_hover_zoom_css() with the
 * instance's uid; the rules come back as scoped CSS text (Spec 32: never inline).
 *
 * @package SGS\Blocks
 */

defined( 'ABSPATH' ) || exit;

require_once __DIR__ . '/helpers-hover-state.php';
require_once __DIR__ . '/helpers-motion-easing.php';

if ( ! function_exists( 'sgs_container_bg_hover_zoom_css' ) ) {
	/**
	 * Scoped rules that zoom a block's background image on hover and focus.
	 *
	 * @param string $uid           The instance's uid class (no dot).
	 * @param bool   $img_path      True when the image is the real <img class="sgs-container__image-bg">,
	 *                              false when it paints on the root's ::before (tiled or sized backgrounds).
	 * @param mixed  $scale_pct     Zoom in %.
	 * @param mixed  $duration_ms   Duration in ms.
	 * @param string $easing        Named easing.
	 * @param string $easing_custom Custom cubic-bezier() for the 'custom' easing.
	 * @return string CSS text, or '' when there is nothing to zoom.
	 */
	function sgs_container_bg_hover_zoom_css( string $uid, bool $img_path, $scale_pct, $duration_ms, string $easing, string $easing_custom ): string {
		$uid = preg_replace( '/[^a-zA-Z0-9_-]/', '', $uid );
		if ( '' === $uid ) {
			return '';
		}

		$scale = is_numeric( $scale_pct ) ? (float) $scale_pct : 105.0;
		$scale = max( 101.0, min( 150.0, $scale ) );
		$ms    = is_numeric( $duration_ms ) ? (int) round( (float) $duration_ms ) : 600;
		$ms    = max( 0, min( 3000, $ms ) );

		$factor = rtrim( rtrim( number_format( $scale / 100, 3, '.', '' ), '0' ), '.' );
		$ease   = sgs_motion_easing_css( '' === $easing ? 'ease' : $easing, $easing_custom, 'ease' );
		$suffix = $img_path ? ' > .sgs-container__image-bg' : '::before';

		return '.' . $uid . $suffix . '{transition-property:transform;transition-duration:' . $ms . 'ms;transition-timing-function:' . $ease . ';}'
			. '@media (prefers-reduced-motion: no-preference){'
			. sgs_hover_state_rules( '.' . $uid, 'transform:scale(' . $factor . ')', ':focus-within', $suffix )
			. '}';
	}
}
