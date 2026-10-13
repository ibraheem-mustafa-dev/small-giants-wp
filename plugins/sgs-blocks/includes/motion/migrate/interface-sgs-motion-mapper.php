<?php
/**
 * The contract every motion migration mapper implements (Spec 38A §13.2, FR-38A-31, FR-38A-32).
 *
 * A mapper turns the old motion attributes of one family on a block into a fragment of the block's `sgsMotion`
 * attribute. Mapper files live in `includes/motion/migrate/mappers/` and are named `class-sgs-motion-map-<family>.php`;
 * the family slug is the file suffix after `class-sgs-motion-map-`, and the class is `Sgs_Motion_Map_<Family>` in the
 * `SGS\Blocks\Motion` namespace (hyphens become underscores). A mapper may also be registered through the
 * `sgs_motion_migrate_mappers` filter. `Sgs_Motion_Migrate_Runner` applies every mapper that handles a block.
 *
 * @package SGS\Blocks
 */

namespace SGS\Blocks\Motion;

defined( 'ABSPATH' ) || exit;

interface Sgs_Motion_Mapper_Interface {

	/**
	 * The mapper's family slug (the file suffix after `class-sgs-motion-map-`).
	 *
	 * @return string
	 */
	public function family(): string;

	/**
	 * Whether this mapper has anything to map on the block.
	 *
	 * @param string              $block_name Block name, for example `sgs/hero`.
	 * @param array<string,mixed> $attrs      The block's stored attributes.
	 * @return bool
	 */
	public function handles( string $block_name, array $attrs ): bool;

	/**
	 * Map the block's old attributes to an `sgsMotion` fragment.
	 *
	 * `motion` is merged into the block's `sgsMotion` (values already stored there win). `consumed` names every old
	 * attribute the fragment now carries; the runner removes those attributes from the block. The result may also carry
	 * `attrs`: block attributes to set (a rename), set only when the block does not already hold a different value.
	 * Effect layers in `motion.elements.<part>.effects` are a list; the runner appends them to the stored list and
	 * merges an item into the stored item with the same `effect` slug.
	 *
	 * @param string              $block_name Block name.
	 * @param array<string,mixed> $attrs      The block's stored attributes.
	 * @return array{motion: array<string,mixed>, consumed: string[], attrs?: array<string,mixed>}
	 */
	public function map( string $block_name, array $attrs ): array;
}
