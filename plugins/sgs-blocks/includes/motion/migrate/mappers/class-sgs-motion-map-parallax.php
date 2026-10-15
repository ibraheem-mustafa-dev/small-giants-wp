<?php
/**
 * The `parallax` migration mapper (Spec 38A §13.2, FR-38A-43, FR-38A-31, FR-38A-32): the five retired parallax
 * attributes to the one `parallax` effect layer.
 *
 * Sources (blocks from `SELECT block_slug, attr_name, default_value FROM block_attributes WHERE attr_name LIKE '%arallax%'`,
 * run 2026-10-15):
 * - `sgsParallax` (`none` or `element`; `background` was retired in 2026-08 and never ran) with `sgsParallaxStrength`
 *   (0 to 100, default 30), on every block through the extension: a view-basis layer on the root;
 * - `bgParallax` (boolean; `sgs/container`, `sgs/hero`, `sgs/multi-button`, `sgs/physics-canvas`, `sgs/site-footer`,
 *   `sgs/site-header`, `sgs/trust-bar`): a view-basis layer on the root with the background switch on;
 * - `splitMediaParallax` (boolean; the media atom on `sgs/hero`): a page-basis layer on the `media` part, the element
 *   the retired `scroll(root)` keyframe moved;
 * - `parallaxStrength` (0 and up; `sgs/decorative-image`): a view-basis layer on the root.
 *
 * Mapping, and why:
 * - Strength to ratio. The old runtime moved the element `( progress - 0.5 ) x strength` px while it crossed the
 *   viewport, so the whole swing was `strength` px over a travel of `viewport height + element height`. The effect
 *   multiplies the same travel by a ratio, so ratio = strength / REFERENCE_TRAVEL, with the reference travel 1500px
 *   (a 900px viewport and a 600px element, the middle of the shipped layouts), rounded to three places: 30 becomes
 *   0.02 and 100 becomes 0.067. `parallaxStrength` doubles the factor in its own runtime (`( progress - 0.5 ) x
 *   strength x 2`), so its ratio is 2 x strength / REFERENCE_TRAVEL. Strength 0 moved nothing and writes no layer.
 * - `splitMediaParallax`. The retired keyframe ran translateY -16px to 16px over the whole page scroll. The page basis
 *   multiplies scrolled px, so the ratio is 32 / SPLIT_MEDIA_RANGE with the range 3200px (the canary page's scrollable
 *   height: a 4100px page in a 900px viewport): 0.01. The 16px head start at scrollY 0 is not reproduced; the media
 *   rests at its natural position at the top of the page and ends within 1px of the old +16px.
 * - `bgParallax`. The old attribute fixed the background to the viewport. A fixed background shifts against its element
 *   by exactly the view travel (ratio 1), but a cover-sized image has no spare edge to shift into, so the layer takes
 *   ratio 0.5, the conventional background drift, and a reported row says the image needs spare height (a larger
 *   background size) or a clamp. The attribute is consumed.
 *
 * One parallax layer per element: the runner merges layers with the same effect slug, so when a block holds two
 * sources for one part (`sgsParallax` and `bgParallax` both on the root) the first in the order above is written and the
 * other stays on the block with a reported row. A value the effect cannot express (a non-number strength) stays on the
 * block with a reported row. Dead values (`none`, `background`, strength 0, false) are consumed and write no layer.
 *
 * @package SGS\Blocks
 */

namespace SGS\Blocks\Motion;

defined( 'ABSPATH' ) || exit;

require_once dirname( __DIR__ ) . '/interface-sgs-motion-mapper.php';

/**
 * Class Sgs_Motion_Map_Parallax
 */
final class Sgs_Motion_Map_Parallax implements Sgs_Motion_Mapper_Interface {

	/** The view travel (viewport height plus element height, px) the old strength was spread over. */
	const REFERENCE_TRAVEL = 1500;

	/** The scrollable page height (px) the old whole-page keyframe was spread over. */
	const SPLIT_MEDIA_RANGE = 3200;

	/** The old keyframe's total swing in px (-16 to 16). */
	const SPLIT_MEDIA_SWING = 32;

	/** The old `sgsParallaxStrength` default. */
	const DEFAULT_STRENGTH = 30;

	/** The ratio given to a former fixed background. */
	const BACKGROUND_RATIO = 0.5;

	/** The layer's id and effect slug. */
	const EFFECT = 'parallax';

	/** The media atom's attribute and the block and part it moves. */
	const SPLIT_MEDIA = array(
		'attr'  => 'splitMediaParallax',
		'block' => 'sgs/hero',
		'part'  => 'media',
	);

	/** Blocks that carry `bgParallax`. */
	const BACKGROUND_BLOCKS = array( 'sgs/container', 'sgs/hero', 'sgs/multi-button', 'sgs/physics-canvas', 'sgs/site-footer', 'sgs/site-header', 'sgs/trust-bar' );

	/** The block with its own `parallaxStrength`. */
	const DECORATIVE_IMAGE = 'sgs/decorative-image';

	/**
	 * The mapper's family slug.
	 *
	 * @return string
	 */
	public function family(): string {
		return 'parallax';
	}

	/**
	 * Whether the block holds an old parallax attribute.
	 *
	 * @param string              $block_name Block name.
	 * @param array<string,mixed> $attrs      Stored attributes.
	 * @return bool
	 */
	public function handles( string $block_name, array $attrs ): bool {
		return array() !== self::present( $block_name, $attrs );
	}

	/**
	 * The old parallax attributes the block holds.
	 *
	 * @param string              $block_name Block name.
	 * @param array<string,mixed> $attrs      Stored attributes.
	 * @return string[]
	 */
	private static function present( string $block_name, array $attrs ): array {
		$keys = array( 'sgsParallax', 'sgsParallaxStrength' );
		if ( in_array( $block_name, self::BACKGROUND_BLOCKS, true ) ) {
			$keys[] = 'bgParallax';
		}
		if ( self::SPLIT_MEDIA['block'] === $block_name ) {
			$keys[] = self::SPLIT_MEDIA['attr'];
		}
		if ( self::DECORATIVE_IMAGE === $block_name ) {
			$keys[] = 'parallaxStrength';
		}
		return array_values( array_filter( $keys, static fn( string $key ): bool => array_key_exists( $key, $attrs ) ) );
	}

	/**
	 * Map the block's old parallax attributes to layers.
	 *
	 * @param string              $block_name Block name.
	 * @param array<string,mixed> $attrs      Stored attributes.
	 * @return array{motion: array<string,mixed>, consumed: string[], reported: array<int,array<string,mixed>>}
	 */
	public function map( string $block_name, array $attrs ): array {
		$plans    = array();
		$consumed = array();
		$reported = array();

		$this->plan_element( $attrs, $plans, $consumed, $reported );
		if ( in_array( $block_name, self::BACKGROUND_BLOCKS, true ) && array_key_exists( 'bgParallax', $attrs ) ) {
			$this->plan_background( $attrs['bgParallax'], $plans, $consumed, $reported );
		}
		if ( self::SPLIT_MEDIA['block'] === $block_name && array_key_exists( self::SPLIT_MEDIA['attr'], $attrs ) ) {
			$this->plan_split_media( $attrs[ self::SPLIT_MEDIA['attr'] ], $plans, $consumed );
		}
		if ( self::DECORATIVE_IMAGE === $block_name && array_key_exists( 'parallaxStrength', $attrs ) ) {
			$this->plan_decorative( $attrs['parallaxStrength'], $plans, $consumed, $reported );
		}

		$elements = array();
		foreach ( $plans as $part => $plan ) {
			$values = array(
				'speedRatio' => $plan['ratio'],
				'basis'      => $plan['basis'],
			);
			if ( true === $plan['background'] ) {
				$values['background'] = true;
			}
			$elements[ $part ]['effects'][] = array(
				'id'     => self::EFFECT,
				'effect' => self::EFFECT,
				'values' => $values,
			);
		}
		return array(
			'motion'   => array() === $elements ? array() : array(
				'v'        => 1,
				'elements' => $elements,
			),
			'consumed' => array_values( array_unique( $consumed ) ),
			'reported' => $reported,
		);
	}

	/**
	 * The ratio for a strength: strength over the reference travel, three places.
	 *
	 * @param float|int $strength Old strength, already within range.
	 * @param int       $factor   1, or 2 for the decorative image's doubled runtime.
	 * @return float|int
	 */
	public static function ratio_for_strength( $strength, int $factor = 1 ) {
		return self::whole( round( ( $factor * $strength ) / self::REFERENCE_TRAVEL, 3 ) );
	}

	/**
	 * The page-basis ratio that reproduces the old whole-page keyframe at the reference page range.
	 *
	 * @return float|int
	 */
	public static function split_media_ratio() {
		return self::whole( round( self::SPLIT_MEDIA_SWING / self::SPLIT_MEDIA_RANGE, 3 ) );
	}

	/**
	 * `sgsParallax` with `sgsParallaxStrength`.
	 *
	 * @param array<string,mixed>               $attrs    Stored attributes.
	 * @param array<string,array<string,mixed>> $plans    Plans by part (appended to).
	 * @param string[]                          $consumed Consumed attributes (appended to).
	 * @param array<int,array<string,mixed>>    $reported Reported rows (appended to).
	 */
	private function plan_element( array $attrs, array &$plans, array &$consumed, array &$reported ): void {
		$held = array_keys( array_intersect_key( $attrs, array_flip( array( 'sgsParallax', 'sgsParallaxStrength' ) ) ) );
		if ( array() === $held ) {
			return;
		}
		if ( 'element' !== ( $attrs['sgsParallax'] ?? 'none' ) ) {
			// 'none' and the retired 'background' never moved anything, whatever the strength.
			array_push( $consumed, ...$held );
			return;
		}
		$strength = $attrs['sgsParallaxStrength'] ?? self::DEFAULT_STRENGTH;
		if ( ! self::is_number( $strength ) ) {
			$reported[] = self::row( 'sgsParallaxStrength', $strength, 'not a number; sgsParallax and the strength stay on the block and the parallax is not mapped', false );
			return;
		}
		array_push( $consumed, ...$held );
		$clamped = min( 100, max( 0, 0 + $strength ) );
		if ( $clamped <= 0 ) {
			return;
		}
		$plans['root'] = array(
			'ratio'      => self::ratio_for_strength( $clamped ),
			'basis'      => 'view',
			'background' => false,
		);
	}

	/**
	 * `bgParallax`.
	 *
	 * @param mixed                             $value    Stored value.
	 * @param array<string,array<string,mixed>> $plans    Plans by part (appended to).
	 * @param string[]                          $consumed Consumed attributes (appended to).
	 * @param array<int,array<string,mixed>>    $reported Reported rows (appended to).
	 */
	private function plan_background( $value, array &$plans, array &$consumed, array &$reported ): void {
		if ( true !== $value ) {
			$consumed[] = 'bgParallax';
			return;
		}
		if ( isset( $plans['root'] ) ) {
			$reported[] = self::row( 'bgParallax', $value, 'the root already holds the element parallax layer and one element takes one parallax layer; bgParallax stays on the block', false );
			return;
		}
		$plans['root'] = array(
			'ratio'      => self::BACKGROUND_RATIO,
			'basis'      => 'view',
			'background' => true,
		);
		$consumed[]    = 'bgParallax';
		$reported[]    = self::row( 'bgParallax', $value, 'was a fixed background; now moves the background at ratio ' . self::BACKGROUND_RATIO . ' of the view travel. A cover-sized image has no spare edge, so give the background a larger size or set a clamp', true );
	}

	/**
	 * `splitMediaParallax`.
	 *
	 * @param mixed                             $value    Stored value.
	 * @param array<string,array<string,mixed>> $plans    Plans by part (appended to).
	 * @param string[]                          $consumed Consumed attributes (appended to).
	 */
	private function plan_split_media( $value, array &$plans, array &$consumed ): void {
		$consumed[] = self::SPLIT_MEDIA['attr'];
		if ( true !== $value ) {
			return;
		}
		$plans[ self::SPLIT_MEDIA['part'] ] = array(
			'ratio'      => self::split_media_ratio(),
			'basis'      => 'page',
			'background' => false,
		);
	}

	/**
	 * `parallaxStrength` on the decorative image.
	 *
	 * @param mixed                             $value    Stored value.
	 * @param array<string,array<string,mixed>> $plans    Plans by part (appended to).
	 * @param string[]                          $consumed Consumed attributes (appended to).
	 * @param array<int,array<string,mixed>>    $reported Reported rows (appended to).
	 */
	private function plan_decorative( $value, array &$plans, array &$consumed, array &$reported ): void {
		if ( ! self::is_number( $value ) ) {
			$reported[] = self::row( 'parallaxStrength', $value, 'not a number; the strength stays on the block and the parallax is not mapped', false );
			return;
		}
		if ( $value <= 0 ) {
			$consumed[] = 'parallaxStrength';
			return;
		}
		if ( isset( $plans['root'] ) ) {
			$reported[] = self::row( 'parallaxStrength', $value, 'the root already holds the element parallax layer and one element takes one parallax layer; parallaxStrength stays on the block', false );
			return;
		}
		$consumed[]    = 'parallaxStrength';
		$plans['root'] = array(
			'ratio'      => self::ratio_for_strength( min( 100, 0 + $value ), 2 ),
			'basis'      => 'view',
			'background' => false,
		);
	}

	/**
	 * Whether a stored value is a finite number (or a numeric string).
	 *
	 * @param mixed $value Stored value.
	 * @return bool
	 */
	private static function is_number( $value ): bool {
		return ( is_int( $value ) || is_float( $value ) || ( is_string( $value ) && is_numeric( $value ) ) ) && is_finite( (float) $value );
	}

	/**
	 * A number as an integer when it is whole.
	 *
	 * @param float|int $number Number.
	 * @return float|int
	 */
	private static function whole( $number ) {
		$rounded = round( (float) $number, 4 );
		return floor( $rounded ) === $rounded ? (int) $rounded : $rounded;
	}

	/**
	 * One reported row.
	 *
	 * @param string $attr     Attribute.
	 * @param mixed  $value    Stored value.
	 * @param string $reason   Reason.
	 * @param bool   $consumed Whether it is removed.
	 * @return array{attr:string,value:mixed,reason:string,consumed:bool}
	 */
	private static function row( string $attr, $value, string $reason, bool $consumed ): array {
		return array(
			'attr'     => $attr,
			'value'    => $value,
			'reason'   => $reason,
			'consumed' => $consumed,
		);
	}
}
