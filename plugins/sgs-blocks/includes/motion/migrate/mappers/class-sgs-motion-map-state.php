<?php
/**
 * The `state` migration mapper (Spec 38A §13.1, §13.2, FR-38A-53; build unit M5.17): the cart count pop, the burger
 * morph's speed and easing, and the accordion icon turn to Entrance layers with the `state` trigger.
 *
 * - `sgs/cart` `countPopAnimation` (`off`, `change`, `load-and-change`; the legacy booleans read as the renderer reads
 *   them) to a layer on the `badge` part: trigger `state`, state `count-changed` for `change` and `count-loaded` for
 *   `load-and-change` (a layer holds one trigger, so "also at load" is a second declared state). The values are the pop
 *   keyframes of `style.css::@keyframes sgs-cart-count-pop` (opacity 0 and scale 0.6, then 1 and 1.15 at 60%, then 1 and
 *   1 at the end) over the old 0.5s `ease`. One difference is reported on every mapped cart: the model's keyframe player
 *   applies the easing across the whole pop, where the old CSS animation applied it between each pair of keyframes.
 *   `off` has no layer and is consumed.
 * - `sgs/nav-bar-menu` `burgerMorphDuration`, `burgerMorphEasing` and `burgerMorphEasingCustom` to a layer on the
 *   `burger` part holding only that timing (trigger `state`, state `menu-open`): render.php writes the layer's duration
 *   and easing into the CSS variables the pose transition reads. The pose itself (`burgerMorph`) stays an attribute
 *   because the bars' geometry is derived from the icon box. The duration is clamped 0 to 1200ms as rendered (a clamped
 *   value is stored as rendered and reported); a name the shared easing list does not know, or an invalid custom curve,
 *   rendered as `ease` and maps to `ease` (reported). With `burgerMorph` set to `none` the timing played nothing: the
 *   three attributes are consumed and reported as inert, with no layer.
 * - `sgs/accordion` `iconRotation` (degrees, 0 to 360) to a layer on the `turning-icon` part: trigger `state`, state
 *   `expanded`, a `to` rotation of that angle over the medium duration and default easing tokens the old transition read,
 *   and `close` values with the same duration and easing tokens (the icon turns back to rest over the time it turned).
 *   `0` (cross-fade, the default) has no layer and is consumed. The old turn was a `rotate` transition on `[open]`: it
 *   turned back smoothly on close and an item open at first paint showed it turned with no animation. The layer's close
 *   values and the accordion script (`leaveState` on close, `restState` for an item that starts open) reproduce both, so
 *   nothing is reported.
 *
 * A value with no exact destination is reported and its attributes stay, so the block keeps its old behaviour.
 *
 * @package SGS\Blocks
 */

namespace SGS\Blocks\Motion;

defined( 'ABSPATH' ) || exit;

require_once dirname( __DIR__ ) . '/interface-sgs-motion-mapper.php';
require_once dirname( __DIR__ ) . '/class-sgs-motion-legacy-hover-value.php';

/**
 * Class Sgs_Motion_Map_State
 */
final class Sgs_Motion_Map_State implements Sgs_Motion_Mapper_Interface {

	const CART      = 'sgs/cart';
	const BAR       = 'sgs/nav-bar-menu';
	const ACCORDION = 'sgs/accordion';

	/** The attributes this family owns, by block. */
	const OWNED = array(
		self::CART      => array( 'countPopAnimation' ),
		self::BAR       => array( 'burgerMorphDuration', 'burgerMorphEasing', 'burgerMorphEasingCustom' ),
		self::ACCORDION => array( 'iconRotation' ),
	);

	/** The old pop: 0.5s, `ease`. */
	const POP_DURATION = 500;
	const POP_EASING   = 'ease';

	/** The burger morph's old default and clamp (render.php). */
	const MORPH_DEFAULT = 200;
	const MORPH_MAX     = 1200;

	/**
	 * The mapper's family slug.
	 *
	 * @return string
	 */
	public function family(): string {
		return 'state';
	}

	/**
	 * Whether the block is one of the three and still holds an old state-change motion attribute.
	 *
	 * @param string              $block_name Block name.
	 * @param array<string,mixed> $attrs      Stored attributes.
	 * @return bool
	 */
	public function handles( string $block_name, array $attrs ): bool {
		return array() !== self::present( $block_name, $attrs );
	}

	/**
	 * Map the block's state-change motion.
	 *
	 * @param string              $block_name Block name.
	 * @param array<string,mixed> $attrs      Stored attributes.
	 * @return array{motion: array<string,mixed>, consumed: string[], reported: array<int,array<string,mixed>>}
	 */
	public function map( string $block_name, array $attrs ): array {
		switch ( $block_name ) {
			case self::CART:
				return self::cart( $attrs );
			case self::BAR:
				return self::burger( $attrs );
			case self::ACCORDION:
				return self::accordion( $attrs );
		}
		return self::result( array(), array(), array() );
	}

	/**
	 * The cart's count pop.
	 *
	 * @param array<string,mixed> $attrs Stored attributes.
	 * @return array{motion: array<string,mixed>, consumed: string[], reported: array<int,array<string,mixed>>}
	 */
	private static function cart( array $attrs ): array {
		$raw = $attrs['countPopAnimation'];
		if ( is_bool( $raw ) ) {
			$raw = $raw ? 'load-and-change' : 'off';
		}
		if ( 'off' === $raw ) {
			return self::result( array(), array( 'countPopAnimation' ), array() );
		}
		if ( ! in_array( $raw, array( 'change', 'load-and-change' ), true ) ) {
			return self::result( array(), array(), array( self::row( 'countPopAnimation', $attrs['countPopAnimation'], 'left in place: not one of off, change or load-and-change, which the renderer reads as off', false ) ) );
		}
		$layer = array(
			'trigger' => 'state',
			'state'   => 'change' === $raw ? 'count-changed' : 'count-loaded',
			'values'  => array(
				'keyframes' => array(
					array(
						'offset'  => 0,
						'opacity' => 0,
						'scale'   => 0.6,
					),
					array(
						'offset'  => 60,
						'opacity' => 1,
						'scale'   => 1.15,
					),
					array(
						'offset'  => 100,
						'opacity' => 1,
						'scale'   => 1,
					),
				),
				'duration'  => self::POP_DURATION,
				'easing'    => self::POP_EASING,
			),
		);
		return self::result(
			self::fragment( 'badge', $layer ),
			array( 'countPopAnimation' ),
			array( self::row( 'countPopAnimation', $attrs['countPopAnimation'], 'mapped: the easing now spans the whole pop (the keyframe player applies it once across the 500ms; the old CSS animation applied it between each pair of keyframes)', true ) )
		);
	}

	/**
	 * The burger morph's speed and easing.
	 *
	 * @param array<string,mixed> $attrs Stored attributes.
	 * @return array{motion: array<string,mixed>, consumed: string[], reported: array<int,array<string,mixed>>}
	 */
	private static function burger( array $attrs ): array {
		$present  = self::present( self::BAR, $attrs );
		$reported = array();
		if ( 'none' === ( $attrs['burgerMorph'] ?? 'x' ) ) {
			foreach ( $present as $key ) {
				$reported[] = self::row( $key, $attrs[ $key ], 'inert: the burger pose is none, so the morph plays nothing', true );
			}
			return self::result( array(), $present, $reported );
		}

		$duration = self::MORPH_DEFAULT;
		if ( array_key_exists( 'burgerMorphDuration', $attrs ) ) {
			$number = Sgs_Motion_Legacy_Hover_Value::num( $attrs['burgerMorphDuration'] );
			if ( null === $number ) {
				return self::result( array(), array(), array( self::row( 'burgerMorphDuration', $attrs['burgerMorphDuration'], 'left in place: not a number of milliseconds', false ) ) );
			}
			$duration = max( 0, min( self::MORPH_MAX, (int) $number ) );
			if ( (float) $duration !== $number ) {
				$reported[] = self::row( 'burgerMorphDuration', $attrs['burgerMorphDuration'], 'stored as rendered: clamped to 0 to 1200ms', true );
			}
		}

		$name   = $attrs['burgerMorphEasing'] ?? 'ease';
		$custom = $attrs['burgerMorphEasingCustom'] ?? '';
		$easing = is_string( $name ) && is_string( $custom ) ? Sgs_Motion_Legacy_Hover_Value::shared_easing( '' === $name ? 'ease' : $name, $custom ) : null;
		if ( null === $easing || '' === $easing ) {
			$easing = 'ease';
			foreach ( array_intersect( array( 'burgerMorphEasing', 'burgerMorphEasingCustom' ), $present ) as $key ) {
				$reported[] = self::row( $key, $attrs[ $key ], 'stored as rendered: a name the shared easing list does not know, or an invalid custom curve, rendered as ease', true );
			}
		}

		$layer = array(
			'trigger' => 'state',
			'state'   => 'menu-open',
			'values'  => array(
				'duration' => $duration,
				'easing'   => $easing,
			),
		);
		return self::result( self::fragment( 'burger', $layer ), $present, $reported );
	}

	/**
	 * The accordion's icon turn.
	 *
	 * @param array<string,mixed> $attrs Stored attributes.
	 * @return array{motion: array<string,mixed>, consumed: string[], reported: array<int,array<string,mixed>>}
	 */
	private static function accordion( array $attrs ): array {
		$number = Sgs_Motion_Legacy_Hover_Value::num( $attrs['iconRotation'] );
		if ( null === $number ) {
			return self::result( array(), array(), array( self::row( 'iconRotation', $attrs['iconRotation'], 'left in place: not a number of degrees', false ) ) );
		}
		$degrees  = max( 0.0, min( 360.0, $number ) );
		$reported = array();
		if ( $degrees !== $number ) {
			$reported[] = self::row( 'iconRotation', $attrs['iconRotation'], 'stored as rendered: clamped to 0 to 360 degrees', true );
		}
		if ( $degrees <= 0.0 ) {
			return self::result( array(), array( 'iconRotation' ), $reported );
		}
		$layer = array(
			'trigger' => 'state',
			'state'   => 'expanded',
			'values'  => array(
				'to'       => array( 'rotate' => Sgs_Motion_Legacy_Hover_Value::tidy( $degrees ) ),
				'duration' => 'token:duration.medium',
				'easing'   => 'token:easing.default',
			),
			'close'   => array(
				'closeDuration' => 'token:duration.medium',
				'closeEasing'   => 'token:easing.default',
			),
		);
		return self::result( self::fragment( 'turning-icon', $layer ), array( 'iconRotation' ), $reported );
	}

	/**
	 * The `sgsMotion` fragment for one part's layer.
	 *
	 * @param string              $part  Part key.
	 * @param array<string,mixed> $layer The entrance base layer.
	 * @return array<string,mixed>
	 */
	private static function fragment( string $part, array $layer ): array {
		return array(
			'v'        => 1,
			'elements' => array( $part => array( 'entrance' => array( 'base' => $layer ) ) ),
		);
	}

	/**
	 * The old attributes the block stores, in catalogue order.
	 *
	 * @param string              $block_name Block name.
	 * @param array<string,mixed> $attrs      Stored attributes.
	 * @return string[]
	 */
	private static function present( string $block_name, array $attrs ): array {
		return array_values( array_intersect( self::OWNED[ $block_name ] ?? array(), array_keys( $attrs ) ) );
	}

	/**
	 * One reported row.
	 *
	 * @param string $attr     Attribute.
	 * @param mixed  $value    Stored value.
	 * @param string $reason   Reason.
	 * @param bool   $consumed Whether the attribute is removed.
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

	/**
	 * One result.
	 *
	 * @param array<string,mixed>            $motion   The fragment.
	 * @param string[]                       $consumed Consumed attributes.
	 * @param array<int,array<string,mixed>> $reported Reported rows.
	 * @return array{motion: array<string,mixed>, consumed: string[], reported: array<int,array<string,mixed>>}
	 */
	private static function result( array $motion, array $consumed, array $reported ): array {
		return array(
			'motion'   => $motion,
			'consumed' => $consumed,
			'reported' => $reported,
		);
	}
}
