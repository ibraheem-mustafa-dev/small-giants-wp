<?php
/**
 * `sgs/nav-drawer-menu` — the ornament frame sequence: an ordered list of
 * alternate glyph frames (`itemOrnamentFrames`, each a custom SVG) flashed one
 * after another on row hover or keyboard focus before the ornament settles on
 * its resting (or hover) glyph.
 *
 * Pure CSS. Each frame is a stacked, `aria-hidden` span that is transparent at
 * rest; on hover/focus-visible frame N runs a one-frame animation delayed by
 * N x the per-frame duration, and the settled glyph is held transparent for
 * the whole sequence. The static rules live in `style.css`
 * (`.sgs-nav-drawer-menu__ornament--frames`); this file renders the frames
 * and emits only the per-instance, per-tier custom properties
 * `--sgs-ndm-frame-ms` (duration), `--sgs-ndm-frame-n` (count),
 * `--sgs-ndm-frame-flash` / `--sgs-ndm-frame-hide` (animation names, `none`
 * where a tier switches the sequence off). Under `prefers-reduced-motion` the
 * animation rules are not applied at all, so only the final glyph shows.
 *
 * `require_once`'d by `nav-drawer-menu-items.php` (markup) and
 * `nav-drawer-menu-extras-css.php` (CSS); every function is guarded.
 *
 * @package SGS\Blocks
 */

defined( 'ABSPATH' ) || exit;

if ( ! defined( 'SGS_NDM_ORNAMENT_MAX_FRAMES' ) ) {
	define( 'SGS_NDM_ORNAMENT_MAX_FRAMES', 8 );
}

if ( ! function_exists( 'sgs_nav_drawer_menu_ornament_frame_svgs' ) ) {
	/**
	 * The frames' sanitised SVG markup, in order. A frame is accepted only as
	 * `{source:'custom', svg}`, re-sanitised with `sgs_svg_kses_allowed_tags()`
	 * (the same server-side pass as `itemTrailingIcons`); anything else, and
	 * anything past the cap, is dropped.
	 *
	 * @param mixed $frames `itemOrnamentFrames`.
	 * @return string[] SVG strings.
	 */
	function sgs_nav_drawer_menu_ornament_frame_svgs( $frames ): array {
		if ( ! is_array( $frames ) || ! function_exists( 'sgs_svg_kses_allowed_tags' ) ) {
			return array();
		}
		$out = array();
		foreach ( $frames as $frame ) {
			if ( ! is_array( $frame ) || 'custom' !== ( $frame['source'] ?? '' ) ) {
				continue;
			}
			$safe = trim( wp_kses( (string) ( $frame['svg'] ?? '' ), sgs_svg_kses_allowed_tags() ) );
			if ( '' !== $safe ) {
				$out[] = $safe;
			}
			if ( count( $out ) >= SGS_NDM_ORNAMENT_MAX_FRAMES ) {
				break;
			}
		}
		return $out;
	}
}

if ( ! function_exists( 'sgs_nav_drawer_menu_ornament_frames_html' ) ) {
	/**
	 * The frame stack, placed inside the ornament span.
	 *
	 * @param mixed $frames `itemOrnamentFrames`.
	 * @return string HTML, or '' when there are no usable frames.
	 */
	function sgs_nav_drawer_menu_ornament_frames_html( $frames ): string {
		$svgs = sgs_nav_drawer_menu_ornament_frame_svgs( $frames );
		if ( array() === $svgs ) {
			return '';
		}
		$html = '<span class="sgs-nav-drawer-menu__ornament-frames" aria-hidden="true">';
		foreach ( $svgs as $svg ) {
			$html .= '<span class="sgs-nav-drawer-menu__ornament-frame">' . $svg . '</span>';
		}
		return $html . '</span>';
	}
}

if ( ! function_exists( 'sgs_nav_drawer_menu_ornament_frames_css' ) ) {
	/**
	 * Per-instance, per-tier values for the frame sequence.
	 *
	 * @param array  $attributes Block attributes.
	 * @param string $scope      The instance scope selector.
	 * @return string CSS.
	 */
	function sgs_nav_drawer_menu_ornament_frames_css( array $attributes, string $scope ): string {
		$count = count( sgs_nav_drawer_menu_ornament_frame_svgs( $attributes['itemOrnamentFrames'] ?? null ) );
		$icon  = in_array( 'icon', array_values( is_array( $attributes['itemOrnament'] ?? null ) ? $attributes['itemOrnament'] : array() ), true );
		if ( 0 === $count || ! $icon ) {
			return '';
		}

		$ms   = static function ( $v ): string {
			return is_numeric( $v ) ? (int) max( 10, min( 1000, (float) $v ) ) . 'ms' : '';
		};
		$name = static function ( $v ) {
			return (string) $v;
		};
		$play = is_array( $attributes['itemOrnamentFramePlay'] ?? null ) ? $attributes['itemOrnamentFramePlay'] : array();

		return $scope . '{--sgs-ndm-frame-n:' . $count . ';}' . sgs_emit_responsive_css(
			$scope,
			array(
				array(
					'value'     => is_array( $attributes['itemOrnamentFrameDuration'] ?? null ) ? $attributes['itemOrnamentFrameDuration'] : array(),
					'css'       => '--sgs-ndm-frame-ms',
					'transform' => $ms,
				),
				array(
					'value'     => sgs_nav_drawer_menu_tier_map(
						$play,
						array(
							'on'  => 'sgs-ndm-frame-flash',
							'off' => 'none',
						)
					),
					'css'       => '--sgs-ndm-frame-flash',
					'transform' => $name,
				),
				array(
					'value'     => sgs_nav_drawer_menu_tier_map(
						$play,
						array(
							'on'  => 'sgs-ndm-frame-hide',
							'off' => 'none',
						)
					),
					'css'       => '--sgs-ndm-frame-hide',
					'transform' => $name,
				),
			)
		);
	}
}
