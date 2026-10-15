<?php
/**
 * The old entrance stagger, frozen as data (Spec 38A §13.1, FR-38A-31, FR-38A-32).
 *
 * Until M2.4 the browser worked a block's stagger delay out at run time (`staggerOffset` in
 * `assets/js/animation-entrance-timing.js`): `min( index, max ) * step`, where `step` is the block's own
 * `sgsAnimationStagger` or its staggering parent's `sgsAnimationStaggerChildren`, `max` is `sgsAnimationStaggerMax`
 * clamped 1 to 50 (7 when absent), and `index` is the block's position among its peers. This class holds that
 * formula and the position rules over a parsed block tree, so the migration can compute every child's delay ONCE and
 * store it. The function's outputs are frozen in `tests/fixtures/motion/legacy-stagger-offset.json`; the standalone
 * test `tests/php/run-motion-map-entrance-standalone.php` compares this class with every row of it.
 *
 * The delay arithmetic goes through `Sgs_Motion_Stagger::compute_delays` (a single column, offset 0, `cap` =
 * `max * step`), the same function the editor helper and the renderer use, so the stored values and a later helper
 * re-run agree.
 *
 * Position rules, as the browser applied them:
 * - a block with its OWN step is positioned among "peers": walking up at most four ancestor levels, the first level
 *   where two or more siblings hold a block with an own step; its position is its index among those siblings (0 when
 *   no level has two);
 * - a block with no own step takes its nearest staggering ancestor's step (`sgsAnimationStaggerChildren`), unless an
 *   animated block sits between them (that block's children belong to it); its position is its index among the
 *   animated blocks that ancestor owns, in document order, through any wrappers.
 *
 * @package SGS\Blocks
 */

namespace SGS\Blocks\Motion;

defined( 'ABSPATH' ) || exit;

require_once dirname( __DIR__ ) . '/class-sgs-motion-stagger.php';

/**
 * Class Sgs_Motion_Legacy_Stagger
 */
final class Sgs_Motion_Legacy_Stagger {

	/** Where the old stagger stopped growing when no maximum was set (items). */
	const DEFAULT_MAX = 7;

	/** The old automatic spacing between entrances that start together with no stagger and no delay of their own. */
	const AUTOMATIC_SPACING_MS = 100;

	/** How many ancestor levels the own-step position search climbed. */
	const PEER_REACH = 4;

	/**
	 * Clamp a numeric attribute to a whole-number range the way `sgs_entrance_clamp_int` did when it wrote the
	 * attribute onto the element.
	 *
	 * @param mixed $value Raw attribute value.
	 * @param int   $min   Lowest allowed value.
	 * @param int   $max   Highest allowed value.
	 * @return string '' when unset or not numeric, else the clamped integer as text.
	 */
	public static function clamp_text( $value, int $min, int $max ): string {
		if ( null === $value || '' === $value || is_bool( $value ) || ! is_numeric( $value ) ) {
			return '';
		}
		return (string) max( $min, min( $max, (int) round( (float) $value ) ) );
	}

	/**
	 * Read a data-attribute text as the browser did: whole digits only, clamped; null otherwise.
	 *
	 * @param string|null $raw Attribute text.
	 * @param int         $min Lowest value.
	 * @param int         $max Highest value.
	 * @return int|null
	 */
	public static function int_attr( ?string $raw, int $min, int $max ): ?int {
		if ( null === $raw || 1 !== preg_match( '/^\d+$/', $raw ) ) {
			return null;
		}
		return max( $min, min( $max, (int) $raw ) );
	}

	/**
	 * The delay `staggerOffset` returned for a position, from the step and maximum attribute TEXT.
	 *
	 * @param int         $index    Position, 0-based.
	 * @param string|null $step_raw The step attribute text (null or non-digits: no stagger applies).
	 * @param string|null $max_raw  The maximum attribute text (null: the default cap).
	 * @return int|null Milliseconds, or null when no stagger applies.
	 */
	public static function offset( int $index, ?string $step_raw, ?string $max_raw ): ?int {
		$step = self::int_attr( $step_raw, 0, 1000 );
		if ( null === $step ) {
			return null;
		}
		$max = self::effective_max( $max_raw );
		return self::delay_at( $index, $step, $max );
	}

	/**
	 * The effective maximum position: the attribute clamped 1 to 50, else 7.
	 *
	 * @param string|null $max_raw The maximum attribute text.
	 * @return int
	 */
	public static function effective_max( ?string $max_raw ): int {
		$max = self::int_attr( $max_raw, 1, 50 );
		return null === $max ? self::DEFAULT_MAX : $max;
	}

	/**
	 * One position's delay through the shared stagger function.
	 *
	 * @param int $index Position, 0-based.
	 * @param int $step  Step in ms.
	 * @param int $max   Effective maximum position.
	 * @return int
	 */
	public static function delay_at( int $index, int $step, int $max ): int {
		$index  = max( 0, $index );
		$delays = Sgs_Motion_Stagger::compute_delays(
			array(
				'count'   => $index + 1,
				'columns' => 1,
				'offset'  => 0,
				'step'    => $step,
				'order'   => 'row-first',
				'perRow'  => false,
				'cap'     => $max * $step,
			)
		);
		return (int) $delays[ $index ];
	}

	/**
	 * Work out every block's stagger offset in one post's block tree.
	 *
	 * @param array<int,array<string,mixed>> $blocks The post's `parse_blocks()` result.
	 * @return array{offsets:array<string,array{offset:int,mode:string,index:int}>,owners:array<string,array{step:int,max:int,members:int,max_raw:?string}>}
	 *         `offsets` by block path for every animated block a step reaches; `owners` by path for every block that
	 *         carries a children step.
	 */
	public static function plan( array $blocks ): array {
		$nodes = array();
		self::collect( $blocks, '', -1, $nodes );
		$roots = array();
		foreach ( $nodes as $id => $node ) {
			if ( -1 === $node['parent'] ) {
				$roots[] = $id;
			}
		}
		$offsets = array();
		$owners  = array();
		$groups  = array();
		foreach ( $nodes as $id => $node ) {
			if ( null !== $node['kids'] ) {
				$owners[ $node['path'] ] = array(
					'step'    => (int) $node['kids'],
					'max'     => self::effective_max( $node['max'] ),
					'members' => 0,
					'max_raw' => $node['max'],
				);
			}
			if ( ! $node['animated'] ) {
				continue;
			}
			if ( null !== $node['own'] ) {
				$index  = self::repeat_index( $nodes, $roots, $id );
				$offset = self::offset( $index, $node['own'], $node['max'] );
				$mode   = 'own';
			} else {
				$owner = self::group_owner( $nodes, $id );
				if ( null === $owner ) {
					continue;
				}
				if ( ! isset( $groups[ $owner ] ) ) {
					$groups[ $owner ] = self::group_of( $nodes, $owner );
				}
				$found  = array_search( $id, $groups[ $owner ], true );
				$index  = false === $found ? 0 : (int) $found;
				$offset = self::offset( $index, $nodes[ $owner ]['kids'], $nodes[ $owner ]['max'] );
				$mode   = 'children';
				++$owners[ $nodes[ $owner ]['path'] ]['members'];
			}
			if ( null !== $offset ) {
				$offsets[ $node['path'] ] = array(
					'offset' => $offset,
					'mode'   => $mode,
					'index'  => $index,
				);
			}
		}
		return array(
			'offsets' => $offsets,
			'owners'  => $owners,
		);
	}

	/**
	 * Flatten a block tree into nodes in document order.
	 *
	 * @param array<int,array<string,mixed>> $blocks Blocks of one level.
	 * @param string                         $path   Path prefix.
	 * @param int                            $parent_id Parent node id (-1 for the top level).
	 * @param array<int,array<string,mixed>> $nodes  Nodes so far (appended to).
	 */
	private static function collect( array $blocks, string $path, int $parent_id, array &$nodes ): void {
		foreach ( $blocks as $i => $block ) {
			$here = '' === $path ? (string) $i : $path . '/' . $i;
			$name = isset( $block['blockName'] ) && is_string( $block['blockName'] ) ? $block['blockName'] : '';
			$id   = $parent_id;
			if ( '' !== $name ) {
				$attrs        = isset( $block['attrs'] ) && is_array( $block['attrs'] ) ? $block['attrs'] : array();
				$effect       = $attrs['sgsAnimation'] ?? '';
				$own          = self::clamp_text( $attrs['sgsAnimationStagger'] ?? null, 0, 1000 );
				$kids         = self::clamp_text( $attrs['sgsAnimationStaggerChildren'] ?? null, 0, 1000 );
				$max          = self::clamp_text( $attrs['sgsAnimationStaggerMax'] ?? null, 1, 50 );
				$animed       = is_string( $effect ) && '' !== $effect && 'none' !== $effect;
				$id           = count( $nodes );
				$nodes[ $id ] = array(
					'path'     => $here,
					'parent'   => $parent_id,
					'children' => array(),
					'animated' => $animed,
					'own'      => $animed && '' !== $own ? $own : null,
					'kids'     => '' !== $kids ? $kids : null,
					'max'      => '' !== $max ? $max : null,
				);
				if ( -1 !== $parent_id ) {
					$nodes[ $parent_id ]['children'][] = $id;
				}
			}
			if ( ! empty( $block['innerBlocks'] ) && is_array( $block['innerBlocks'] ) ) {
				self::collect( $block['innerBlocks'], $here, $id, $nodes );
			}
		}
	}

	/**
	 * The nearest ancestor that staggers its children, null when an animated block sits between.
	 *
	 * @param array<int,array<string,mixed>> $nodes Nodes.
	 * @param int                            $id    Node id.
	 * @return int|null
	 */
	private static function group_owner( array $nodes, int $id ): ?int {
		for ( $p = $nodes[ $id ]['parent']; - 1 !== $p; $p = $nodes[ $p ]['parent'] ) {
			if ( null !== $nodes[ $p ]['kids'] ) {
				return $p;
			}
			if ( $nodes[ $p ]['animated'] ) {
				return null;
			}
		}
		return null;
	}

	/**
	 * A staggering ancestor's animated blocks, in document order.
	 *
	 * @param array<int,array<string,mixed>> $nodes Nodes.
	 * @param int                            $owner Owner node id.
	 * @return int[]
	 */
	private static function group_of( array $nodes, int $owner ): array {
		$members = array();
		foreach ( array_keys( $nodes ) as $id ) {
			if ( $id !== $owner && $nodes[ $id ]['animated'] && self::group_owner( $nodes, $id ) === $owner && self::is_below( $nodes, $id, $owner ) ) {
				$members[] = $id;
			}
		}
		return $members;
	}

	/**
	 * Whether a node sits inside another.
	 *
	 * @param array<int,array<string,mixed>> $nodes    Nodes.
	 * @param int                            $id       Node id.
	 * @param int                            $ancestor Ancestor id.
	 * @return bool
	 */
	private static function is_below( array $nodes, int $id, int $ancestor ): bool {
		for ( $p = $nodes[ $id ]['parent']; - 1 !== $p; $p = $nodes[ $p ]['parent'] ) {
			if ( $p === $ancestor ) {
				return true;
			}
		}
		return false;
	}

	/**
	 * A block with its own step: its position among the matching blocks beside it.
	 *
	 * @param array<int,array<string,mixed>> $nodes Nodes.
	 * @param int[]                          $roots Top-level node ids (the siblings of a top-level block).
	 * @param int                            $id    Node id.
	 * @return int
	 */
	private static function repeat_index( array $nodes, array $roots, int $id ): int {
		$node = $id;
		for ( $depth = 0; $depth < self::PEER_REACH; $depth++ ) {
			$siblings = -1 === $nodes[ $node ]['parent'] ? $roots : $nodes[ $nodes[ $node ]['parent'] ]['children'];
			$peers    = array_values(
				array_filter(
					$siblings,
					static function ( int $sibling ) use ( $nodes ): bool {
						return self::holds_own( $nodes, $sibling );
					}
				)
			);
			if ( count( $peers ) > 1 ) {
				$found = array_search( $node, $peers, true );
				return false === $found ? 0 : (int) $found;
			}
			if ( -1 === $nodes[ $node ]['parent'] ) {
				break;
			}
			$node = $nodes[ $node ]['parent'];
		}
		return 0;
	}

	/**
	 * Whether a node or any node below it carries an own step.
	 *
	 * @param array<int,array<string,mixed>> $nodes Nodes.
	 * @param int                            $id    Node id.
	 * @return bool
	 */
	private static function holds_own( array $nodes, int $id ): bool {
		if ( null !== $nodes[ $id ]['own'] ) {
			return true;
		}
		foreach ( $nodes[ $id ]['children'] as $child ) {
			if ( self::holds_own( $nodes, $child ) ) {
				return true;
			}
		}
		return false;
	}
}
