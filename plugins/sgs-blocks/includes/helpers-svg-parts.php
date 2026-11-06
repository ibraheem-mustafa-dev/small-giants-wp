<?php
/**
 * SVG part animation: the data document a block prints for an inlined SVG.
 *
 * The animation itself runs in src/shared/svg-parts/svg-parts.js, which reads the `data-sgs-svg-parts` attribute this
 * helper builds. A block stores the parts as an array of objects (`svgParts`), the trigger and the hover cooldown;
 * sgs_svg_parts_data() returns the cleaned JSON, or '' when no part holds anything to animate.
 *
 * Each part: `target` (an id of the SVG, or a CSS selector starting with `.`, `[` or `:`), `eachChild`, the entrance
 * (`fromOpacity`, `fromScale`, `fromX`, `fromY`, `fromRotate`, `draw`, `duration`, `delay`, `stagger`, `easing`,
 * `origin`), the loop (`loopRotate`, `loopDuration`) and the hover (`hoverReplay`, `hoverRate`, `hoverRateDuration`).
 *
 * @package SGS\Blocks
 */

defined( 'ABSPATH' ) || exit;

if ( ! function_exists( 'sgs_svg_parts_data' ) ) {
	/**
	 * The `data-sgs-svg-parts` JSON for a block's stored parts.
	 *
	 * @param mixed  $parts    The stored `svgParts` list.
	 * @param string $trigger  `load`, `visible` or `every-visible`; anything else is `visible`.
	 * @param mixed  $cooldown Least time between two hover replays, in ms.
	 * @return string The JSON, or '' when no part has a target and something to animate.
	 */
	function sgs_svg_parts_data( $parts, string $trigger = 'visible', $cooldown = 1400 ): string {
		if ( ! is_array( $parts ) ) {
			return '';
		}
		$number  = static function ( $value, float $min, float $max ) {
			return is_numeric( $value ) ? max( $min, min( $max, (float) $value ) ) : null;
		};
		$easings = array( 'linear', 'ease', 'ease-in', 'ease-out', 'ease-in-out', 'spring' );
		$origins = array( 'center', 'top', 'bottom', 'left', 'right' );
		$clean   = array();
		foreach ( $parts as $part ) {
			if ( ! is_array( $part ) ) {
				continue;
			}
			$target = trim( substr( wp_strip_all_tags( (string) ( $part['target'] ?? '' ) ), 0, 200 ) );
			if ( '' === $target ) {
				continue;
			}
			$item = array( 'target' => $target );
			foreach ( array(
				'fromOpacity'       => array( 0, 1 ),
				'fromScale'         => array( 0, 20 ),
				'fromX'             => array( -5000, 5000 ),
				'fromY'             => array( -5000, 5000 ),
				'fromRotate'        => array( -3600, 3600 ),
				'duration'          => array( 0, 60000 ),
				'delay'             => array( 0, 60000 ),
				'stagger'           => array( 0, 5000 ),
				'loopRotate'        => array( -36000, 36000 ),
				'loopDuration'      => array( 0, 3600000 ),
				'hoverRate'         => array( 0, 100 ),
				'hoverRateDuration' => array( 0, 60000 ),
			) as $key => $range ) {
				if ( isset( $part[ $key ] ) && '' !== $part[ $key ] ) {
					$value = $number( $part[ $key ], (float) $range[0], (float) $range[1] );
					if ( null !== $value ) {
						$item[ $key ] = $value;
					}
				}
			}
			foreach ( array( 'eachChild', 'draw', 'hoverReplay' ) as $flag ) {
				if ( ! empty( $part[ $flag ] ) ) {
					$item[ $flag ] = true;
				}
			}
			if ( isset( $part['easing'] ) && in_array( $part['easing'], $easings, true ) ) {
				$item['easing'] = $part['easing'];
			}
			if ( isset( $part['origin'] ) && in_array( $part['origin'], $origins, true ) ) {
				$item['origin'] = $part['origin'];
			}
			$animates = isset( $item['fromOpacity'] ) || isset( $item['fromScale'] ) || isset( $item['fromX'] ) || isset( $item['fromY'] )
				|| isset( $item['fromRotate'] ) || ! empty( $item['draw'] ) || ! empty( $item['loopRotate'] );
			if ( $animates ) {
				$clean[] = $item;
			}
		}
		if ( array() === $clean ) {
			return '';
		}
		$triggers = array( 'load', 'visible', 'every-visible' );
		$encoded  = wp_json_encode(
			array(
				'trigger'       => in_array( $trigger, $triggers, true ) ? $trigger : 'visible',
				'hoverCooldown' => $number( $cooldown, 0, 60000 ) ?? 1400.0,
				'parts'         => $clean,
			)
		);
		return is_string( $encoded ) ? $encoded : '';
	}
}
