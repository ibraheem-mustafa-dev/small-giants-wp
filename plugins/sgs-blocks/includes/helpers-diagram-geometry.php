<?php
/**
 * Measured diagram geometry — the page-side twin of
 * src/utils/diagram-geometry.js::dimensionPaths().
 *
 * Both sides read one shared fixture set
 * (tests/fixtures/diagram-geometry-fixtures.json) and must produce identical
 * path strings, so the canvas preview and the page draw the same lines. The
 * arithmetic below mirrors the JavaScript step for step, including its
 * rounding (Math.round), so a change here is a change there too.
 *
 * Coordinates arrive as % of the drawing box (0–100); reach, overshoot and
 * tick length as % of the drawing WIDTH. A positive reach reaches towards -n
 * (above a left-to-right line), a negative reach towards +n, where
 * n = (-uy, ux); the overshoot continues past the line on the other side.
 *
 * @package SGS\Blocks
 */

defined( 'ABSPATH' ) || exit;

if ( ! function_exists( 'sgs_diagram_fmt' ) ) {
	/**
	 * Two decimals, trailing zeros dropped (JS twin: fmt()).
	 *
	 * @param float $value Number.
	 * @return string
	 */
	function sgs_diagram_fmt( float $value ): string {
		$rounded = floor( $value * 100 + 0.5 ) / 100;
		if ( 0.0 === $rounded ) {
			$rounded = 0.0;
		}
		$fixed = number_format( $rounded, 2, '.', '' );
		$fixed = (string) preg_replace( '/\.?0+$/', '', $fixed );
		return '' === $fixed || '-' === $fixed ? '0' : $fixed;
	}
}

if ( ! function_exists( 'sgs_diagram_clamp' ) ) {
	/**
	 * Clamp a number, with a fallback for junk input (JS twin: clamp()).
	 *
	 * @param mixed $value    Raw value.
	 * @param float $min      Minimum.
	 * @param float $max      Maximum.
	 * @param float $fallback Fallback.
	 * @return float
	 */
	function sgs_diagram_clamp( $value, float $min, float $max, float $fallback ): float {
		if ( null === $value || '' === $value || is_bool( $value ) || ! is_numeric( $value ) ) {
			return $fallback;
		}
		return min( $max, max( $min, (float) $value ) );
	}
}

if ( ! function_exists( 'sgs_diagram_dimension_paths' ) ) {
	/**
	 * Build the SVG path data for one dimension.
	 *
	 * @param array $dim    Dimension settings (startX, startY, endX, endY, kind,
	 *                      endStyle, extReach, extReachEnd, extOvershoot, tickLength).
	 * @param float $width  Drawing (viewBox) width.
	 * @param float $height Drawing (viewBox) height.
	 * @return array{line: string, guides: string, ends: string, dots: array<int, array{cx: string, cy: string}>}
	 */
	function sgs_diagram_dimension_paths( array $dim, float $width, float $height ): array {
		$empty = array(
			'line'   => '',
			'guides' => '',
			'ends'   => '',
			'dots'   => array(),
		);
		if ( $width <= 0 || $height <= 0 ) {
			return $empty;
		}
		$scale  = $width / 100;
		$x1     = ( sgs_diagram_clamp( $dim['startX'] ?? null, 0, 100, 0 ) / 100 ) * $width;
		$y1     = ( sgs_diagram_clamp( $dim['startY'] ?? null, 0, 100, 0 ) / 100 ) * $height;
		$x2     = ( sgs_diagram_clamp( $dim['endX'] ?? null, 0, 100, 0 ) / 100 ) * $width;
		$y2     = ( sgs_diagram_clamp( $dim['endY'] ?? null, 0, 100, 0 ) / 100 ) * $height;
		$length = hypot( $x2 - $x1, $y2 - $y1 );
		if ( 0.0 === (float) $length ) {
			return $empty;
		}
		$ux = ( $x2 - $x1 ) / $length;
		$uy = ( $y2 - $y1 ) / $length;
		$nx = -$uy;
		$ny = $ux;

		$kind        = 'leader' === ( $dim['kind'] ?? '' ) ? 'leader' : 'dimension';
		$end_style   = in_array( $dim['endStyle'] ?? '', array( 'tick', 'arrow', 'dot', 'none' ), true ) ? $dim['endStyle'] : 'tick';
		$tick        = sgs_diagram_clamp( $dim['tickLength'] ?? null, 0, 20, 1.76 ) * $scale;
		$overshoot   = sgs_diagram_clamp( $dim['extOvershoot'] ?? null, 0, 50, 0 ) * $scale;
		$reach_start = sgs_diagram_clamp( $dim['extReach'] ?? null, -100, 100, 0 ) * $scale;
		$reach_raw   = $dim['extReachEnd'] ?? null;
		$reach_end   = ( null === $reach_raw || '' === $reach_raw )
			? $reach_start
			: sgs_diagram_clamp( $reach_raw, -100, 100, 0 ) * $scale;

		$f    = 'sgs_diagram_fmt';
		$line = 'M' . $f( $x1 ) . ' ' . $f( $y1 ) . 'L' . $f( $x2 ) . ' ' . $f( $y2 );

		$guides = '';
		if ( 'dimension' === $kind ) {
			foreach ( array( array( $x1, $y1, $reach_start ), array( $x2, $y2, $reach_end ) ) as $point ) {
				list( $px, $py, $reach ) = $point;
				if ( 0.0 === (float) $reach ) {
					continue;
				}
				$sign    = $reach > 0 ? 1 : -1;
				$ax      = $px - $nx * $reach;
				$ay      = $py - $ny * $reach;
				$bx      = $px + $nx * $sign * $overshoot;
				$by      = $py + $ny * $sign * $overshoot;
				$guides .= 'M' . $f( $ax ) . ' ' . $f( $ay ) . 'L' . $f( $bx ) . ' ' . $f( $by );
			}
		}

		$ends       = '';
		$dots       = array();
		$end_points = 'leader' === $kind
			? array( array( $x1, $y1, 1 ) )
			: array( array( $x1, $y1, 1 ), array( $x2, $y2, -1 ) );
		foreach ( $end_points as $point ) {
			list( $px, $py, $inward ) = $point;
			if ( 'none' === $end_style || 0.0 === (float) $tick ) {
				continue;
			}
			if ( 'dot' === $end_style ) {
				$dots[] = array(
					'cx' => $f( $px ),
					'cy' => $f( $py ),
				);
				continue;
			}
			if ( 'tick' === $end_style ) {
				$half  = $tick / 2;
				$ends .= 'M' . $f( $px - $nx * $half ) . ' ' . $f( $py - $ny * $half ) . 'L' . $f( $px + $nx * $half ) . ' ' . $f( $py + $ny * $half );
				continue;
			}
			// Arrow: two strokes pointing at the end, 30 degrees either side of the line.
			$back  = $tick * cos( M_PI / 6 );
			$side  = $tick * sin( M_PI / 6 );
			$bx    = $px + $ux * $inward * $back;
			$by    = $py + $uy * $inward * $back;
			$ends .= 'M' . $f( $bx + $nx * $side ) . ' ' . $f( $by + $ny * $side ) . 'L' . $f( $px ) . ' ' . $f( $py ) . 'L' . $f( $bx - $nx * $side ) . ' ' . $f( $by - $ny * $side );
		}

		return array(
			'line'   => $line,
			'guides' => $guides,
			'ends'   => $ends,
			'dots'   => $dots,
		);
	}
}
