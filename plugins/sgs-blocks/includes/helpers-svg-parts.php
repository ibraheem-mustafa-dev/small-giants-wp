<?php
/**
 * SVG part animation: the data document a block prints for an inlined SVG.
 *
 * The animation itself runs in src/shared/svg-parts/svg-parts.js, which reads the `data-sgs-svg-parts` attribute this
 * helper builds. A block stores the parts as an array of objects (`svgParts`), the trigger and the hover cooldown;
 * sgs_svg_parts_data() returns the cleaned JSON, or '' when no part holds anything to animate.
 *
 * Each part: `target` (an id of the SVG, or a CSS selector starting with `.`, `[` or `:`), `eachChild`, the entrance
 * (`fromOpacity`, `fromScale`, `fromX`, `fromY`, `fromRotate`, `fromFill`, `fromClip`, `draw`, `duration`, `delay`,
 * `stagger`, `easing`, `easingCustom`, `origin`), a staged entrance (`settleAt`, `holdUntil`, `toScale`, `toFill`,
 * `copyShapeFrom`), the loop (`loopRotate`, `loopDuration`) and the hover (`hoverReplay`, `hoverRate`,
 * `hoverRateDuration`, and the bob `hoverScale`, `hoverX`, `hoverY`, `hoverRotate`, `hoverDuration`, `hoverStagger`,
 * `hoverEasing`, `hoverEasingCustom`). An easing is a name from `sgs_motion_easing_values()`; `custom` reads the
 * matching `*Custom` curve, which is kept only as four numbers rebuilt into a `cubic-bezier()`.
 *
 * @package SGS\Blocks
 */

defined( 'ABSPATH' ) || exit;

require_once __DIR__ . '/helpers-motion-easing.php';

if ( ! function_exists( 'sgs_svg_part_has_entrance' ) ) {
	/**
	 * Whether a cleaned part has an entrance (a from-state, a drawn stroke or a staged end look), as opposed to only a
	 * loop or a hover.
	 *
	 * @param array $item A cleaned part.
	 * @return bool
	 */
	function sgs_svg_part_has_entrance( array $item ): bool {
		return ( isset( $item['fromOpacity'] ) )
			|| ( isset( $item['fromScale'] ) && 1.0 !== (float) $item['fromScale'] )
			|| ! empty( $item['fromX'] ) || ! empty( $item['fromY'] ) || ! empty( $item['fromRotate'] )
			|| isset( $item['fromFill'] ) || isset( $item['fromClip'] )
			|| isset( $item['toScale'] ) || isset( $item['toFill'] ) || isset( $item['holdUntil'] )
			|| ! empty( $item['draw'] );
	}
}

if ( ! function_exists( 'sgs_svg_parts_hide_css' ) ) {
	/**
	 * The pre-arm rule: the inline SVG of a gated parts document is hidden from first paint until src/shared/svg-parts/
	 * svg-parts.js sets `data-sgs-svg-armed` in the tick it applies the entrance's from-states. It applies only under
	 * the motion ready gate's `sgs-motion-ready` class (which script alone sets, and which reduced motion never gets),
	 * and the gate's load handler adds `sgs-svg-parts-released` so a module that never armed cannot leave the logo hidden.
	 *
	 * @return string The CSS.
	 */
	function sgs_svg_parts_hide_css(): string {
		// Held hidden until armed: before the page load for any gated SVG, and after it for one the module has booted (data-sgs-svg-parts-booted, set by bootSvgParts())
		// (its entrance still to play); the load release frees only an SVG whose module never ran.
		$gated = "[data-sgs-svg-parts*='\"gate\":true']:not([data-sgs-svg-armed]) svg";
		return 'html.sgs-motion-ready:not(.sgs-svg-parts-released) ' . $gated . ',html.sgs-motion-ready [data-sgs-svg-parts-booted]' . substr( $gated, 0, -4 ) . ' svg{visibility:hidden}';
	}
}

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
		$easings = sgs_motion_easing_values();
		$origins = array( 'center', 'top', 'bottom', 'left', 'right' );
		$clips   = array( 'up', 'down', 'left', 'right' );
		$curve   = static function ( $value ) {
			if ( ! is_string( $value ) || 1 !== preg_match( '/^cubic-bezier\(\s*(-?\d*\.?\d+)\s*,\s*(-?\d*\.?\d+)\s*,\s*(-?\d*\.?\d+)\s*,\s*(-?\d*\.?\d+)\s*\)$/', trim( $value ), $m ) ) {
				return null;
			}
			$n = array_map( 'floatval', array_slice( $m, 1 ) );
			return ( $n[0] >= 0 && $n[0] <= 1 && $n[2] >= 0 && $n[2] <= 1 )
				? 'cubic-bezier(' . implode( ', ', $n ) . ')'
				: null;
		};
		$colour  = static function ( $value ) {
			$resolved = is_string( $value ) ? sgs_colour_value( $value ) : '';
			return 1 === preg_match( '/^(#[0-9a-fA-F]{3,8}|[a-zA-Z]+|var\(--[a-zA-Z0-9_-]+\))$/', $resolved ) ? $resolved : null;
		};
		$clean        = array();
		$has_entrance = false;
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
				'settleAt'          => array( 0, 1 ),
				'holdUntil'         => array( 0, 1 ),
				'toScale'           => array( 0, 20 ),
				'hoverScale'        => array( 0, 20 ),
				'hoverX'            => array( -5000, 5000 ),
				'hoverY'            => array( -5000, 5000 ),
				'hoverRotate'       => array( -3600, 3600 ),
				'hoverDuration'     => array( 0, 60000 ),
				'hoverStagger'      => array( 0, 5000 ),
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
			foreach ( array( 'easing' => 'easingCustom', 'hoverEasing' => 'hoverEasingCustom' ) as $key => $custom_key ) {
				if ( isset( $part[ $key ] ) && in_array( $part[ $key ], $easings, true ) ) {
					$item[ $key ] = $part[ $key ];
					$bezier       = 'custom' === $part[ $key ] ? $curve( $part[ $custom_key ] ?? '' ) : null;
					if ( null !== $bezier ) {
						$item[ $custom_key ] = $bezier;
					}
				}
			}
			foreach ( array( 'fromFill', 'toFill' ) as $key ) {
				$value = isset( $part[ $key ] ) ? $colour( $part[ $key ] ) : null;
				if ( null !== $value ) {
					$item[ $key ] = $value;
				}
			}
			if ( isset( $part['fromClip'] ) && in_array( $part['fromClip'], $clips, true ) ) {
				$item['fromClip'] = $part['fromClip'];
			}
			$shape = trim( substr( wp_strip_all_tags( (string) ( $part['copyShapeFrom'] ?? '' ) ), 0, 200 ) );
			if ( '' !== $shape ) {
				$item['copyShapeFrom'] = $shape;
			}
			if ( isset( $part['origin'] ) && in_array( $part['origin'], $origins, true ) ) {
				$item['origin'] = $part['origin'];
			}
			$animates = isset( $item['fromOpacity'] ) || isset( $item['fromScale'] ) || isset( $item['fromX'] ) || isset( $item['fromY'] )
				|| isset( $item['fromRotate'] ) || isset( $item['fromFill'] ) || isset( $item['fromClip'] ) || isset( $item['toScale'] ) || isset( $item['toFill'] )
				|| ! empty( $item['draw'] ) || ! empty( $item['loopRotate'] )
				|| isset( $item['hoverScale'] ) || isset( $item['hoverX'] ) || isset( $item['hoverY'] ) || isset( $item['hoverRotate'] );
			if ( $animates ) {
				$clean[]     = $item;
				$has_entrance = $has_entrance || sgs_svg_part_has_entrance( $item );
			}
		}
		if ( array() === $clean ) {
			return '';
		}
		$triggers = array( 'load', 'visible', 'every-visible' );
		$trigger  = in_array( $trigger, $triggers, true ) ? $trigger : 'visible';
		// A document whose entrance plays on first sight or on load is hidden before first paint (see
		// sgs_svg_parts_hide_css()); `gate` is the marker that stylesheet reads. A drawer logo that replays on every
		// open stays visible.
		$gated    = $has_entrance && 'every-visible' !== $trigger;
		if ( $gated && class_exists( '\SGS\Blocks\Motion\Sgs_Motion_Assets' ) ) {
			\SGS\Blocks\Motion\Sgs_Motion_Assets::queue_svg_parts_gate();
		}
		$encoded  = wp_json_encode(
			array(
				'gate'          => $gated,
				'trigger'       => $trigger,
				'hoverCooldown' => $number( $cooldown, 0, 60000 ) ?? 1400.0,
				'parts'         => $clean,
			)
		);
		return is_string( $encoded ) ? $encoded : '';
	}
}
