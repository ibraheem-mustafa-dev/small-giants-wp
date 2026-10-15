<?php
/**
 * The `entrance` migration mapper (Spec 38A §13.1, §13.2, FR-38A-31, FR-38A-32): the `sgsAnimation*` entrance and its
 * stagger to `entrance.base`, per-child stored delays and the container stagger helper's last settings.
 *
 * Two passes, because the old stagger belonged to a GROUP and no single block's attributes hold it:
 *
 * 1. `map_groups()` (`Sgs_Motion_Group_Mapper_Interface`) runs over a post's whole block tree FIRST. For every animated
 *    block a step reaches it computes the delay the browser used to compute (`Sgs_Motion_Legacy_Stagger`, frozen in
 *    `tests/fixtures/motion/legacy-stagger-offset.json`), adds the block's own `sgsAnimationDelay` and stores the sum in
 *    that block's `entrance.base.values.delay`. The old stagger counted only a group's ANIMATED blocks, through any
 *    wrappers; the editor's re-run (`stagger/use-stagger-rerun.js`) counts every DIRECT child of the container, animated
 *    or not, so a stored delay and the helper's delay for that child's position can differ (Heading, Spacer, Card at
 *    step 100: the Card stores 100, the helper says 200). Every direct child whose stored delay differs from the
 *    helper's at a tier is marked `customised` on that tier (`values.delay`, `devices.tablet.delay`,
 *    `devices.mobile.delay`), so a later insert or move keeps the old delay; a child the re-run does not write (one
 *    nested inside a wrapper, or whose entrance sits on an item part) needs no mark. A block carrying
 *    `sgsAnimationStaggerChildren` gets `motion.stagger`: `step` the old
 *    step, `offset` 0, `order` row-first, `perRow` false (the old stagger never restarted per row), `cap` the old
 *    maximum position times the step, and `apply` false (every child already carries its own entrance, so the helper has
 *    nothing to stamp). A `cap` above the schema's 20000ms ceiling is left out and reported; the stored delays are exact.
 * 2. `map()` then maps every other block's `sgsAnimation*` entrance with no stagger.
 *
 * The runner calls `map_groups()` before its per-block pass and the group patches consume the attributes they carry, so
 * `handles()` finds them gone on the per-block pass: a block is never mapped twice.
 *
 * A block whose `supports.sgs.animationItems` names an item part gets its entrance on that part (the block's items took
 * the block's settings), not on the root. The block's `staggerDelay` is the per-block-reveals family's, not this one.
 *
 * What is NOT mapped, and why: the old automatic spacing (`Sgs_Motion_Legacy_Stagger::AUTOMATIC_SPACING_MS`, 100ms
 * between entrances that start together with no stagger and no delay) depended on which blocks were in view at load, so
 * no stored value can reproduce it; and an absent `sgsAnimation` on a block whose block.json default is an effect is
 * not inferred.
 *
 * @package SGS\Blocks
 */

namespace SGS\Blocks\Motion;

defined( 'ABSPATH' ) || exit;

require_once dirname( __DIR__ ) . '/interface-sgs-motion-mapper.php';
require_once dirname( __DIR__ ) . '/interface-sgs-motion-group-mapper.php';
require_once dirname( __DIR__ ) . '/class-sgs-motion-legacy-stagger.php';
require_once dirname( __DIR__ ) . '/class-sgs-motion-legacy-entrance.php';
require_once dirname( __DIR__ ) . '/class-sgs-motion-migrate-merge.php';

/**
 * Class Sgs_Motion_Map_Entrance
 */
final class Sgs_Motion_Map_Entrance implements Sgs_Motion_Mapper_Interface, Sgs_Motion_Group_Mapper_Interface {

	/** The stagger attributes. */
	const STAGGER_ATTRS = array( 'sgsAnimationStagger', 'sgsAnimationStaggerChildren', 'sgsAnimationStaggerMax' );

	/** The schema's ceiling for the helper's `cap` (ms). */
	const CAP_CEILING = 20000;

	/**
	 * A test's stand-in for the registered block supports: callable( string $block_name ): array.
	 *
	 * @var callable|null
	 */
	private static $supports_provider = null;

	/**
	 * Replace the source of a block's `supports.sgs` (null restores the block registry).
	 *
	 * @param callable|null $provider Callable taking the block name and returning its `supports.sgs` array.
	 */
	public static function set_supports_provider( ?callable $provider ): void {
		self::$supports_provider = $provider;
	}

	/**
	 * The mapper's family slug.
	 *
	 * @return string
	 */
	public function family(): string {
		return 'entrance';
	}

	/**
	 * Whether the block still holds an old entrance attribute.
	 *
	 * @param string              $block_name Block name.
	 * @param array<string,mixed> $attrs      Stored attributes.
	 * @return bool
	 */
	public function handles( string $block_name, array $attrs ): bool {
		foreach ( array_merge( array( 'sgsAnimation' ), Sgs_Motion_Legacy_Entrance::SETTINGS, self::STAGGER_ATTRS ) as $key ) {
			if ( array_key_exists( $key, $attrs ) ) {
				return true;
			}
		}
		return false;
	}

	/**
	 * Map one block's entrance (the blocks no stagger reaches) and clear the stagger attributes that do nothing.
	 *
	 * @param string              $block_name Block name.
	 * @param array<string,mixed> $attrs      Stored attributes.
	 * @return array{motion: array<string,mixed>, consumed: string[], reported: array<int,array<string,mixed>>}
	 */
	public function map( string $block_name, array $attrs ): array {
		$entrance = $this->entrance( $block_name, $attrs, 0, false );
		$left     = $this->leftover_stagger( $attrs, $entrance['consumed'] );
		return array(
			'motion'   => $entrance['motion'],
			'consumed' => array_values( array_unique( array_merge( $entrance['consumed'], $left['consumed'] ) ) ),
			'reported' => array_merge( $entrance['reported'], $left['reported'] ),
		);
	}

	/**
	 * Map every group-dependent attribute in one post's block tree.
	 *
	 * @param array<int,array<string,mixed>> $blocks The post's `parse_blocks()` result.
	 * @return array<string,array{motion:array<string,mixed>,consumed:string[],reported:array<int,array<string,mixed>>}> Patches by block path.
	 */
	public function map_groups( array $blocks ): array {
		$plan  = Sgs_Motion_Legacy_Stagger::plan( $blocks );
		$index = array();
		self::index( $blocks, '', $index );
		$patches = array();
		foreach ( $plan['offsets'] as $path => $info ) {
			$block  = $index[ $path ];
			$result = $this->entrance( $block['name'], $block['attrs'], $info['offset'], 'children' === $info['mode'] );
			if ( array() === $result['motion'] ) {
				$result['reported'][] = array(
					'attr'     => 'sgsAnimationStagger',
					'value'    => $info['offset'],
					'reason'   => 'the stagger delay of ' . $info['offset'] . 'ms could not be stored because the entrance was not mapped',
					'consumed' => false,
				);
			} elseif ( 'own' === $info['mode'] ) {
				$result['consumed'] = array_merge( $result['consumed'], array( 'sgsAnimationStagger', 'sgsAnimationStaggerMax' ) );
			}
			$patches[ $path ] = $result;
		}
		foreach ( $plan['owners'] as $path => $owner ) {
			$helper            = $this->helper( $owner );
			$patch             = $patches[ $path ] ?? array(
				'motion'   => array(),
				'consumed' => array(),
				'reported' => array(),
			);
			$patch['motion']   = Sgs_Motion_Migrate_Merge::merge(
				$patch['motion'],
				array(
					'v'        => 1,
					'elements' => array( 'root' => array() ),
					'stagger'  => $helper['stagger'],
				)
			);
			$patch['consumed'] = array_merge( $patch['consumed'], array( 'sgsAnimationStaggerChildren' ), null === $owner['max_raw'] ? array() : array( 'sgsAnimationStaggerMax' ) );
			$patch['reported'] = array_merge( $patch['reported'], $helper['reported'] );
			$patches[ $path ]  = $patch;
		}
		foreach ( $plan['owners'] as $path => $owner ) {
			self::keep_positions( $patches, $index, $path );
		}
		foreach ( $patches as $path => $patch ) {
			$patches[ $path ]['consumed'] = array_values( array_unique( $patch['consumed'] ) );
		}
		return $patches;
	}

	/**
	 * Mark `customised`, per tier, every delay of an owner's direct children that the editor's re-run would rewrite.
	 *
	 * The re-run (`entrance/stagger-write.js::staggerUpdates`) gives direct child j the helper's delay for position j
	 * among ALL the container's direct children, at each tier, and keeps a tier whose path is in the child's
	 * `customised`; it writes only a child that holds a root entrance (the stored helper has `apply` false).
	 *
	 * @param array<string,array<string,mixed>>                          $patches Patches by block path (changed in place).
	 * @param array<string,array{name:string,attrs:array<string,mixed>}> $index   The post's blocks by path.
	 * @param string                                                     $owner   The owner's path.
	 */
	private static function keep_positions( array &$patches, array $index, string $owner ): void {
		$settings = $patches[ $owner ]['motion']['stagger'] ?? null;
		if ( ! is_array( $settings ) ) {
			return;
		}
		$kids = array();
		foreach ( array_keys( $index ) as $path ) {
			$path = (string) $path;
			if ( 0 === strpos( $path, $owner . '/' ) && false === strpos( substr( $path, strlen( $owner ) + 1 ), '/' ) ) {
				$kids[ (int) substr( $path, strlen( $owner ) + 1 ) ] = $path;
			}
		}
		ksort( $kids );
		$kids  = array_values( $kids );
		$tiers = array(
			'desktop' => 'values.delay',
			'tablet'  => 'devices.tablet.delay',
			'mobile'  => 'devices.mobile.delay',
		);
		$owner_block = $index[ $owner ];
		$helper      = array();
		foreach ( array_keys( $tiers ) as $tier ) {
			$helper[ $tier ] = Sgs_Motion_Stagger::compute_delays(
				$settings + array(
					'count'   => count( $kids ),
					'columns' => Sgs_Motion_Stagger::columns_for_block( $owner_block['name'], $owner_block['attrs'], $tier ),
				)
			);
		}
		foreach ( $kids as $j => $path ) {
			$base = $patches[ $path ]['motion']['elements']['root']['entrance']['base'] ?? null;
			if ( ! is_array( $base ) ) {
				continue;
			}
			$marks  = isset( $base['customised'] ) && is_array( $base['customised'] ) ? $base['customised'] : array();
			$stored = (int) ( $base['values']['delay'] ?? 0 );
			foreach ( $tiers as $tier => $key ) {
				$stored = 'desktop' === $tier ? $stored : (int) ( $base['devices'][ $tier ]['delay'] ?? $stored );
				if ( $helper[ $tier ][ $j ] !== $stored && ! in_array( $key, $marks, true ) ) {
					$marks[] = $key;
				}
			}
			if ( array() !== $marks ) {
				$patches[ $path ]['motion']['elements']['root']['entrance']['base']['customised'] = $marks;
			}
		}
	}

	/**
	 * The container stagger helper's last settings from an owner's old values.
	 *
	 * @param array{step:int,max:int,members:int,max_raw:?string} $owner Owner row of the stagger plan.
	 * @return array{stagger:array<string,mixed>,reported:array<int,array<string,mixed>>}
	 */
	private function helper( array $owner ): array {
		$cap      = $owner['max'] * $owner['step'];
		$stagger  = array(
			'apply'  => false,
			'offset' => 0,
			'step'   => $owner['step'],
			'order'  => 'row-first',
			'perRow' => false,
		);
		$reported = array();
		if ( $cap <= self::CAP_CEILING ) {
			$stagger['cap'] = $cap;
		} else {
			$reported[] = array(
				'attr'     => 'sgsAnimationStaggerMax',
				'value'    => $owner['max_raw'],
				'reason'   => 'the helper cap of ' . $cap . 'ms is above the schema ceiling of ' . self::CAP_CEILING . 'ms and is left out; the stored per-child delays are exact',
				'consumed' => true,
			);
		}
		return array(
			'stagger'  => $stagger,
			'reported' => $reported,
		);
	}

	/**
	 * One block's entrance as a motion fragment on its target element.
	 *
	 * @param string              $block_name  Block name.
	 * @param array<string,mixed> $attrs       Stored attributes.
	 * @param int                 $extra_delay Stagger offset added to the block's own delay.
	 * @param bool                $staggered   Whether a stagger reaches the block.
	 * @return array{motion:array<string,mixed>,consumed:string[],reported:array<int,array<string,mixed>>}
	 */
	private function entrance( string $block_name, array $attrs, int $extra_delay, bool $staggered ): array {
		$built = Sgs_Motion_Legacy_Entrance::build( $attrs, $extra_delay, $staggered );
		if ( null === $built['base'] ) {
			return array(
				'motion'   => array(),
				'consumed' => $built['consumed'],
				'reported' => $built['reported'],
			);
		}
		$target = $this->target( $block_name );
		if ( null === $target ) {
			$built['reported'][] = array(
				'attr'     => 'sgsAnimation',
				'value'    => $attrs['sgsAnimation'],
				'reason'   => 'the block animates its items (supports.sgs.animationItems) and the item selector names no declared element part',
				'consumed' => false,
			);
			return array(
				'motion'   => array(),
				'consumed' => array(),
				'reported' => array_map( array( Sgs_Motion_Legacy_Entrance::class, 'unconsume' ), $built['reported'] ),
			);
		}
		return array(
			'motion'   => array(
				'v'        => 1,
				'elements' => array( $target => array( 'entrance' => array( 'base' => $built['base'] ) ) ),
			),
			'consumed' => $built['consumed'],
			'reported' => $built['reported'],
		);
	}

	/**
	 * The element an entrance lands on: the root, or the declared item part for a block that animates its items.
	 *
	 * @param string $block_name Block name.
	 * @return string|null Element key, or null when the item selector names no declared part.
	 */
	private function target( string $block_name ): ?string {
		$supports = self::supports( $block_name );
		$items    = $supports['animationItems'] ?? '';
		if ( ! is_string( $items ) || '' === trim( $items ) ) {
			return 'root';
		}
		$elements = isset( $supports['elements'] ) && is_array( $supports['elements'] ) ? $supports['elements'] : array();
		foreach ( explode( ',', $items ) as $selector ) {
			if ( 1 === preg_match( '/\.sgs-[a-z0-9-]+?__([a-z][a-zA-Z0-9-]*)/', $selector, $m ) && isset( $elements[ $m[1] ] ) ) {
				return $m[1];
			}
		}
		return null;
	}

	/**
	 * A block's `supports.sgs`.
	 *
	 * @param string $block_name Block name.
	 * @return array<string,mixed>
	 */
	private static function supports( string $block_name ): array {
		if ( null !== self::$supports_provider ) {
			$found = call_user_func( self::$supports_provider, $block_name );
			return is_array( $found ) ? $found : array();
		}
		if ( ! class_exists( '\WP_Block_Type_Registry' ) ) {
			return array();
		}
		$type  = \WP_Block_Type_Registry::get_instance()->get_registered( $block_name );
		$found = $type && isset( $type->supports['sgs'] ) ? $type->supports['sgs'] : array();
		return is_array( $found ) ? $found : array();
	}

	/**
	 * Stagger attributes the group pass left behind: empty ones go, ones that did nothing are reported and go, others
	 * stay and are reported.
	 *
	 * @param array<string,mixed> $attrs    Stored attributes.
	 * @param string[]            $consumed Attributes the entrance already consumed.
	 * @return array{consumed:string[],reported:array<int,array<string,mixed>>}
	 */
	private function leftover_stagger( array $attrs, array $consumed ): array {
		$gone     = array();
		$reported = array();
		$effect   = $attrs['sgsAnimation'] ?? '';
		$animated = is_string( $effect ) && '' !== $effect && 'none' !== $effect;
		$valid    = static function ( string $key ) use ( $attrs ): bool {
			return array_key_exists( $key, $attrs ) && '' !== Sgs_Motion_Legacy_Stagger::clamp_text( $attrs[ $key ], 0, 1000 );
		};
		// A step still on the block here is one the group pass could not store; a maximum beside it must stay.
		$step_set = $valid( 'sgsAnimationStaggerChildren' ) || ( $animated && $valid( 'sgsAnimationStagger' ) );
		foreach ( self::STAGGER_ATTRS as $key ) {
			if ( ! array_key_exists( $key, $attrs ) || in_array( $key, $consumed, true ) ) {
				continue;
			}
			$value = $attrs[ $key ];
			if ( null === $value || '' === $value ) {
				$gone[] = $key;
				continue;
			}
			$clamped = 'sgsAnimationStaggerMax' === $key ? Sgs_Motion_Legacy_Stagger::clamp_text( $value, 1, 50 ) : Sgs_Motion_Legacy_Stagger::clamp_text( $value, 0, 1000 );
			if ( '' === $clamped ) {
				$reported[] = $this->left_row( $key, $value, 'not a number', false );
			} elseif ( 'sgsAnimationStaggerMax' === $key && ! $step_set ) {
				$gone[]     = $key;
				$reported[] = $this->left_row( $key, $value, 'inert: a maximum with no stagger step', true );
			} elseif ( 'sgsAnimationStagger' === $key ) {
				$gone[]     = $key;
				$reported[] = $this->left_row( $key, $value, 'inert: an own stagger step only applied to a block with an entrance', true );
			} else {
				$reported[] = $this->left_row( $key, $value, 'left in place: the stagger could not be stored on this block', false );
			}
		}
		return array(
			'consumed' => $gone,
			'reported' => $reported,
		);
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
	private function left_row( string $attr, $value, string $reason, bool $consumed ): array {
		return array(
			'attr'     => $attr,
			'value'    => $value,
			'reason'   => $reason,
			'consumed' => $consumed,
		);
	}

	/**
	 * Index a block tree by runner path.
	 *
	 * @param array<int,array<string,mixed>>                             $blocks Blocks of one level.
	 * @param string                                                     $path   Path prefix.
	 * @param array<string,array{name:string,attrs:array<string,mixed>}> $index  Index so far (appended to).
	 */
	private static function index( array $blocks, string $path, array &$index ): void {
		foreach ( $blocks as $i => $block ) {
			$here = '' === $path ? (string) $i : $path . '/' . $i;
			$name = isset( $block['blockName'] ) && is_string( $block['blockName'] ) ? $block['blockName'] : '';
			if ( '' !== $name ) {
				$index[ $here ] = array(
					'name'  => $name,
					'attrs' => isset( $block['attrs'] ) && is_array( $block['attrs'] ) ? $block['attrs'] : array(),
				);
			}
			if ( ! empty( $block['innerBlocks'] ) && is_array( $block['innerBlocks'] ) ) {
				self::index( $block['innerBlocks'], $here, $index );
			}
		}
	}
}
