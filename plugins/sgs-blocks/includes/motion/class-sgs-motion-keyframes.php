<?php
/**
 * Motion keyframes: a multi-keyframe entrance's desktop frames as JSON for the WAAPI module
 * (`assets/js/motion-keyframes.js`; Spec 38A §9, FR-38A-18).
 *
 * Called by `Sgs_Motion_Emitter::emit()` for an entrance whose values hold `keyframes`. Field names and owner
 * properties are read from the schema's `EntranceKeyframe` node through `Sgs_Motion_Emitter::fields()`.
 *
 * @package SGS\Blocks
 */

namespace SGS\Blocks\Motion;

defined( 'ABSPATH' ) || exit;

/**
 * Class Sgs_Motion_Keyframes
 */
final class Sgs_Motion_Keyframes {

	/**
	 * The desktop keyframes as JSON for the WAAPI module: offset 0 to 1 and each owner property's CSS. The first frame
	 * is also the hidden start state: each of its owner properties with no stored desktop from-value is written to
	 * `--sgs-me-from-<suffix>`, so the stylesheet hides the element before the animation plays.
	 *
	 * @param mixed                $list    Stored keyframe list.
	 * @param array<string,bool>   $used    Owner properties touched (by reference through the caller's array).
	 * @param bool                 $keep_op Whether the LCP rule holds opacity at 1.
	 * @param array<string,string> $desktop Desktop declarations (by reference).
	 * @return string|null
	 */
	public static function json( $list, array &$used, bool $keep_op, array &$desktop ): ?string {
		if ( ! is_array( $list ) || array() === $list ) {
			return null;
		}
		$out = array();
		foreach ( self::sorted_frames( $list ) as $index => $frame ) {
			$row = array();
			foreach ( is_array( $frame ) ? $frame : array() as $key => $value ) {
				if ( 'offset' === $key ) {
					$css = Sgs_Motion_Emitter::value_css( 'EntranceKeyframe', 'offset', $value );
					if ( null !== $css && ( is_int( $value ) || is_float( $value ) ) ) {
						$row['offset'] = $value / 100;
					}
					continue;
				}
				$prop = Sgs_Motion_Emitter::fields( 'EntranceKeyframe' )[ $key ]['css'] ?? null;
				$css  = Sgs_Motion_Emitter::value_css( 'EntranceKeyframe', (string) $key, $value );
				if ( null !== $prop && null !== $css ) {
					$row[ $prop ]  = $keep_op && Sgs_Motion_Emitter::ME_PREFIX . 'op' === $prop ? '1' : $css;
					$used[ $prop ] = true;
					$from          = Sgs_Motion_Emitter::ME_PREFIX . 'from-' . substr( $prop, strlen( Sgs_Motion_Emitter::ME_PREFIX ) );
					if ( 0 === $index && ! isset( $desktop[ $from ] ) ) {
						$desktop[ $from ] = $css;
					}
				}
			}
			if ( 0 === $index && isset( $row['offset'] ) && $row['offset'] > 0 ) {
				$row['offset'] = 0;
			}
			$out[] = $row;
		}
		return (string) wp_json_encode( $out );
	}

	/**
	 * Stored frames in offset order; a frame without a numeric offset keeps its list position (it sorts with the frame before it).
	 *
	 * @param array<int|string,mixed> $list Stored frames.
	 * @return array<int,mixed>
	 */
	private static function sorted_frames( array $list ): array {
		$keyed = array();
		$last  = 0;
		foreach ( array_values( $list ) as $frame ) {
			$offset = is_array( $frame ) ? ( $frame['offset'] ?? null ) : null;
			$last   = is_int( $offset ) || is_float( $offset ) ? $offset : $last;
			$keyed[] = array( $last, $frame );
		}
		usort( $keyed, static fn ( array $a, array $b ): int => $a[0] <=> $b[0] );
		return array_column( $keyed, 1 );
	}
}
