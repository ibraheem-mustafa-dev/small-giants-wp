<?php
/**
 * The contract for a mapper that needs more than one block to decide (Spec 38A §13.2, FR-38A-31, FR-38A-32).
 *
 * `Sgs_Motion_Mapper_Interface::map()` sees one block's attributes. The old entrance stagger is a property of a GROUP:
 * a child's delay came from its position among the animated blocks inside a staggering parent, worked out in the
 * browser, so no single block's attributes hold it. A mapper that implements this interface is handed the parsed block
 * tree of one post BEFORE the per-block pass and returns one patch per block, keyed by the same path string the runner
 * gives a block (`'3'` for the fourth top-level entry, `'3/0/2'` for a nested one; freeform entries count in the path).
 *
 * A patch has the shape of a `map()` result: `motion` (an `sgsMotion` fragment), `consumed` (old attributes the
 * fragment now carries) and `reported` (rows `attr`, `value`, `reason`, `consumed` for anything with no destination or
 * changed on the way). The runner merges, consumes and sanitises a patch exactly as it does a `map()` result, then runs
 * the per-block pass, which finds the consumed attributes gone.
 *
 * @package SGS\Blocks
 */

namespace SGS\Blocks\Motion;

defined( 'ABSPATH' ) || exit;

interface Sgs_Motion_Group_Mapper_Interface {

	/**
	 * Map every group-dependent attribute in one post's block tree.
	 *
	 * @param array<int,array<string,mixed>> $blocks The post's `parse_blocks()` result.
	 * @return array<string,array{motion:array<string,mixed>,consumed:string[],reported:array<int,array<string,mixed>>}> Patches by block path.
	 */
	public function map_groups( array $blocks ): array;
}
