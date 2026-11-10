<?php
/**
 * The one definition of "above the fold" (Spec 38A §9).
 *
 * A pure function of the parsed block tree: no page-loop global and no renderer state. A block is above the fold when it
 * sits in one of the first `FOLD_SECTIONS` top-level content sections of the page, every descendant (a loop item
 * included) following its section. A section is a top-level block that has a name and is not a template part
 * (`core/template-part`: the header, footer and the like are not content). When the content is exactly one such block
 * whose `tagName` is `main`, that wrapper is transparent and its own child blocks are the sections.
 *
 * `Sgs_Motion_Renderer` marks each block with `is_above_fold()` and the Spec 49 image loader calls the same function
 * for a block rendered anywhere, in or out of the page loop.
 *
 * @package SGS\Blocks
 */

declare( strict_types=1 );

namespace SGS\Blocks\Motion;

defined( 'ABSPATH' ) || exit;

/**
 * Above-the-fold decision over a parsed block tree.
 */
final class Sgs_Motion_Fold {

	/** How many top-level content sections count as above the fold. */
	const FOLD_SECTIONS = 2;

	/** The block name of a template part, which is never a content section. */
	const TEMPLATE_PART = 'core/template-part';

	/**
	 * Whether the block at a position in the parsed tree is above the fold.
	 *
	 * @param array<int,mixed> $blocks Parsed blocks (`parse_blocks()` output).
	 * @param array<int,int>   $path   The block's position: an index into `$blocks`, then an index into that block's
	 *                                 `innerBlocks`, and so on (`array( 2, 0 )` is the first inner block of the third block).
	 * @param int              $sections How many sections count as above the fold: `FOLD_SECTIONS`, or a page's measured
	 *                                 count (`Sgs_Fold_Scan::section_count()`).
	 * @return bool
	 */
	public static function is_above_fold( array $blocks, array $path, int $sections = self::FOLD_SECTIONS ): bool {
		$position = self::section_position( $blocks, $path );
		return null !== $position && $position < $sections;
	}

	/**
	 * The zero-based number of the content section a block sits in (0 is the first section), or null when it sits in none.
	 *
	 * @param array<int,mixed> $blocks Parsed blocks.
	 * @param array<int,int>   $path   The block's position, as for `is_above_fold()`.
	 * @return int|null
	 */
	public static function section_position( array $blocks, array $path ): ?int {
		if ( array() === $path ) {
			return null;
		}
		$sections = self::section_indexes( $blocks );
		if ( 1 === count( $sections ) && self::is_main_wrapper( (array) $blocks[ $sections[0] ] ) ) {
			if ( (int) $path[0] !== $sections[0] || count( $path ) < 2 ) {
				return null;
			}
			$sections = self::section_indexes( (array) ( $blocks[ $sections[0] ]['innerBlocks'] ?? array() ) );
			$root     = (int) $path[1];
		} else {
			$root = (int) $path[0];
		}
		$position = array_search( $root, $sections, true );
		return false === $position ? null : (int) $position;
	}

	/**
	 * Whether the parsed content is exactly one section that is a `main` wrapper.
	 *
	 * @param array<int,mixed> $blocks Parsed blocks.
	 * @return bool
	 */
	public static function is_lone_main( array $blocks ): bool {
		$sections = self::section_indexes( $blocks );
		return 1 === count( $sections ) && self::is_main_wrapper( (array) $blocks[ $sections[0] ] );
	}

	/**
	 * Whether a parsed block is a `main` wrapper.
	 *
	 * @param array<string,mixed> $block Parsed block.
	 * @return bool
	 */
	public static function is_main_wrapper( array $block ): bool {
		return 'main' === ( $block['attrs']['tagName'] ?? null );
	}

	/**
	 * Whether a block name is a content section candidate: named, and not a template part.
	 *
	 * @param mixed $name Block name.
	 * @return bool
	 */
	public static function is_section_name( $name ): bool {
		return is_string( $name ) && '' !== $name && self::TEMPLATE_PART !== $name;
	}

	/**
	 * The indexes of the blocks that are content sections (freeform whitespace entries and template parts are not).
	 *
	 * @param array<int,mixed> $blocks Parsed blocks.
	 * @return array<int,int>
	 */
	public static function section_indexes( array $blocks ): array {
		$out = array();
		foreach ( $blocks as $index => $block ) {
			if ( is_array( $block ) && self::is_section_name( $block['blockName'] ?? null ) ) {
				$out[] = (int) $index;
			}
		}
		return $out;
	}
}
