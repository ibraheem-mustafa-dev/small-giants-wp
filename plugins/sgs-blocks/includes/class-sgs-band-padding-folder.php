<?php
/**
 * Folds a stored `contentBandPadding` into `padding` in one post's block content, and lists a stored `contentBandMargin`.
 *
 * `padding` paints the content band and is the only padding control of a block that declares `contentWidth`
 * (`SGS_Container_Wrapper::render`), so a block comment that still carries `contentBandPadding` moves its sides
 * onto `padding`, per device and per side. Before the fold both painted (the block's padding outside the band, the
 * band's inside it), so each folded side is the two added together, each read as its tier paints it (a tier with no
 * value takes the nearest larger tier's): a zero or absent side adds nothing, and where both hold a length the sum
 * is `calc( own + band )` and is reported. Only the attribute JSON of the changed block
 * comments is replaced in the stored text, so every other byte of the post is untouched.
 *
 * A stored `contentBandMargin` is not folded. The band is a block-flow child of the block's outer element, so its
 * top and bottom margins collapse through that element (merging with the neighbours' margins) where padding never
 * does, and its left and right margins override the band's auto centring. No padding value paints the same space, so
 * every stored side is listed for a person to move onto the block's `margin`, and the block comment is left as stored.
 *
 * @package SGS\Blocks
 */

namespace SGS\Blocks;

defined( 'ABSPATH' ) || exit;

/**
 * Pure fold plus the text patcher. Used by `wp sgs band-padding-migrate`.
 */
final class Sgs_Band_Padding_Folder {

	const BAND_ATTRIBUTE = 'contentBandPadding';

	const MARGIN_ATTRIBUTE = 'contentBandMargin';

	const TIERS = array( 'desktop', 'tablet', 'mobile' );

	const SIDES = array( 'top', 'right', 'bottom', 'left' );

	/**
	 * A box attribute as `{ desktop, tablet, mobile }` boxes.
	 *
	 * A tier object keeps its array tiers; a flat `{ top, right, bottom, left }` box is the desktop tier; anything
	 * else holds nothing.
	 *
	 * @param mixed $value Stored attribute value.
	 * @return array<string,array<string,mixed>>
	 */
	public static function tiers_of( $value ): array {
		if ( ! is_array( $value ) ) {
			return array();
		}
		$out = array();
		foreach ( self::TIERS as $tier ) {
			if ( isset( $value[ $tier ] ) && is_array( $value[ $tier ] ) ) {
				$out[ $tier ] = $value[ $tier ];
			}
		}
		if ( array() === $out && array() !== array_intersect( array_keys( $value ), self::SIDES ) ) {
			$out['desktop'] = $value;
		}
		return $out;
	}

	/**
	 * Fold one block's attributes.
	 *
	 * @param array<string,mixed> $attrs Stored attributes of the block.
	 * @return array{attrs:array<string,mixed>,conflicts:array<int,array<string,mixed>>}|null Null when the block
	 *         carries no `contentBandPadding`.
	 */
	public static function fold( array $attrs ): ?array {
		if ( ! array_key_exists( self::BAND_ATTRIBUTE, $attrs ) ) {
			return null;
		}
		$band = self::tiers_of( $attrs[ self::BAND_ATTRIBUTE ] );
		unset( $attrs[ self::BAND_ATTRIBUTE ] );
		$conflicts = array();
		if ( array() === $band ) {
			return array(
				'attrs'     => $attrs,
				'conflicts' => $conflicts,
			);
		}
		$own    = self::tiers_of( $attrs['padding'] ?? null );
		$merged = $own;
		foreach ( self::TIERS as $index => $tier ) {
			// The block's sides first, then the band's, each in its stored order, so the written box keeps its order.
			$sides = array_intersect( array_unique( array_merge( array_keys( $own[ $tier ] ?? array() ), array_keys( $band[ $tier ] ?? array() ) ) ), self::SIDES );
			foreach ( $sides as $side ) {
				if ( '' === self::length( $own[ $tier ][ $side ] ?? null ) && '' === self::length( $band[ $tier ][ $side ] ?? null ) ) {
					continue;
				}
				$o = self::inherited( $own, $index, $side );
				$b = self::inherited( $band, $index, $side );
				if ( '' !== $o && '' !== $b && ! self::is_zero( $o ) && ! self::is_zero( $b ) ) {
					$conflicts[] = array(
						'tier' => $tier,
						'side' => $side,
						'own'  => $o,
						'band' => $b,
						'sum'  => self::sum( $o, $b ),
					);
				}
				$sum = self::sum( $o, $b );
				if ( '' !== $sum ) {
					$merged[ $tier ][ $side ] = $sum;
				}
			}
		}
		if ( array() !== $merged ) {
			$ordered = array();
			foreach ( self::TIERS as $tier ) {
				if ( isset( $merged[ $tier ] ) ) {
					$ordered[ $tier ] = $merged[ $tier ];
				}
			}
			$attrs['padding'] = $ordered;
		}
		return array(
			'attrs'     => $attrs,
			'conflicts' => $conflicts,
		);
	}

	/**
	 * The sides a block's stored `contentBandMargin` still sets, per tier.
	 *
	 * A zero top or bottom is skipped (it paints nothing); a zero left or right is kept because it overrides the
	 * band's auto centring.
	 *
	 * @param array<string,mixed> $attrs Stored attributes of the block.
	 * @return array<int,array{tier:string,side:string,value:string}>
	 */
	public static function band_margins( array $attrs ): array {
		$out = array();
		foreach ( self::tiers_of( $attrs[ self::MARGIN_ATTRIBUTE ] ?? null ) as $tier => $box ) {
			foreach ( self::SIDES as $side ) {
				$value = self::length( $box[ $side ] ?? null );
				if ( '' === $value || ( in_array( $side, array( 'top', 'bottom' ), true ) && self::is_zero( $value ) ) ) {
					continue;
				}
				$out[] = array(
					'tier'  => $tier,
					'side'  => $side,
					'value' => $value,
				);
			}
		}
		return $out;
	}

	/**
	 * A stored side as a length string, or '' when it holds none.
	 *
	 * @param mixed $value Stored side value.
	 * @return string
	 */
	private static function length( $value ): string {
		return is_string( $value ) ? trim( $value ) : ( is_int( $value ) || is_float( $value ) ? (string) $value : '' );
	}

	/**
	 * The side a tier paints: its own value, else the nearest larger tier's (the tiers cascade from desktop down).
	 *
	 * @param array<string,array<string,mixed>> $tiers Boxes by tier.
	 * @param int                               $index Position of the tier in TIERS.
	 * @param string                            $side  Side name.
	 * @return string
	 */
	private static function inherited( array $tiers, int $index, string $side ): string {
		for ( $i = $index; $i >= 0; $i-- ) {
			$value = self::length( $tiers[ self::TIERS[ $i ] ][ $side ] ?? null );
			if ( '' !== $value ) {
				return $value;
			}
		}
		return '';
	}

	/**
	 * Whether a length is zero in any unit.
	 *
	 * @param string $value Length.
	 * @return bool
	 */
	private static function is_zero( string $value ): bool {
		return 1 === preg_match( '/^[-+]?0*\.?0+(?:[a-z%]+)?$/i', $value );
	}

	/**
	 * The space two stacked paddings leave on one side: the block's own padding sat outside the band, the band's
	 * inside it, so both painted. A zero or absent side adds nothing; two lengths add up in `calc()`.
	 *
	 * @param string $own  The block's padding on that side.
	 * @param string $band The band's padding on that side.
	 * @return string
	 */
	private static function sum( string $own, string $band ): string {
		if ( '' === $own || ( self::is_zero( $own ) && '' !== $band ) ) {
			return $band;
		}
		if ( '' === $band || self::is_zero( $band ) ) {
			return $own;
		}
		return 'calc(' . $own . ' + ' . $band . ')';
	}

	/**
	 * Fold every block of one post's content.
	 *
	 * @param string $content The stored `post_content`.
	 * @return array{content:string,changed:bool,changes:array<int,array<string,mixed>>,margins:array<int,array<string,mixed>>,skipped?:string}
	 *         One `changes` row per folded block: path, block, conflicts. One `margins` row per block that still sets a
	 *         `contentBandMargin` side: path, block, sides. When the block comments in the text do not line up with the parsed blocks
	 *         nothing is changed, `changes` is empty and `skipped` names the reason.
	 */
	public function migrate_content( string $content ): array {
		$unchanged = array(
			'content' => $content,
			'changed' => false,
			'changes' => array(),
			'margins' => array(),
		);
		if ( false === strpos( $content, self::BAND_ATTRIBUTE ) && false === strpos( $content, self::MARGIN_ATTRIBUTE ) ) {
			return $unchanged;
		}
		$blocks = parse_blocks( $content );
		$run    = array(
			'seq'     => 0,
			'patches' => array(),
			'changes' => array(),
			'margins' => array(),
		);
		$this->walk( $blocks, '', $run );
		$unchanged['margins'] = $run['margins'];
		if ( array() === $run['changes'] ) {
			return $unchanged;
		}
		$patched = self::patch_comments( $content, $run['patches'], $run['seq'] );
		if ( null === $patched ) {
			return array_merge( $unchanged, array( 'skipped' => 'its block comments do not line up with the parsed blocks' ) );
		}
		if ( $patched === $content ) {
			return $unchanged;
		}
		return array(
			'content' => $patched,
			'changed' => true,
			'changes' => $run['changes'],
			'margins' => $run['margins'],
		);
	}

	/**
	 * Walk the parsed blocks in document order, numbering the named ones.
	 *
	 * @param array<int,array<string,mixed>> $blocks Parsed blocks.
	 * @param string                         $path   Path of the parent, for the report.
	 * @param array<string,mixed>            $run    Run state (seq, patches, changes), by reference.
	 */
	private function walk( array $blocks, string $path, array &$run ): void {
		foreach ( $blocks as $index => $block ) {
			$here = '' === $path ? (string) $index : $path . '.' . $index;
			if ( ! empty( $block['blockName'] ) && is_string( $block['blockName'] ) ) {
				$seq   = $run['seq']++;
				$attrs = is_array( $block['attrs'] ?? null ) ? $block['attrs'] : array();
				$out   = self::fold( $attrs );
				$sides = self::band_margins( $attrs );
				if ( array() !== $sides ) {
					$run['margins'][] = array(
						'path'  => $here,
						'block' => $block['blockName'],
						'sides' => $sides,
					);
				}
				if ( null !== $out ) {
					$run['patches'][ $seq ] = $out['attrs'];
					$run['changes'][]       = array(
						'path'      => $here,
						'block'     => $block['blockName'],
						'conflicts' => $out['conflicts'],
					);
				}
			}
			if ( ! empty( $block['innerBlocks'] ) && is_array( $block['innerBlocks'] ) ) {
				$this->walk( $block['innerBlocks'], $here, $run );
			}
		}
	}

	/**
	 * Replace the attribute JSON of the folded blocks' opening comments.
	 *
	 * @param string                         $content Original text.
	 * @param array<int,array<string,mixed>> $patches New attributes by document-order block number.
	 * @param int                            $total   Number of named blocks the parser found.
	 * @return string|null Null when the comment count differs from the parsed block count.
	 */
	private static function patch_comments( string $content, array $patches, int $total ): ?string {
		$count  = 0;
		$result = preg_replace_callback(
			'/<!--\s+wp:([a-z][a-z0-9_-]*(?:\/[a-z][a-z0-9_-]*)?)(\s+\{.*?\})?(\s*\/)?\s*-->/s',
			static function ( array $m ) use ( &$count, $patches ): string {
				$i = $count++;
				if ( ! isset( $patches[ $i ] ) ) {
					return $m[0];
				}
				$attrs = array() === $patches[ $i ] ? '' : ' ' . serialize_block_attributes( $patches[ $i ] );
				return '<!-- wp:' . $m[1] . $attrs . ( empty( $m[3] ) ? ' -->' : ' /-->' );
			},
			$content
		);
		return null === $result || $count !== $total ? null : $result;
	}
}
