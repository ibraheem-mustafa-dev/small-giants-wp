<?php
/**
 * The spacing migration's attribute rewrite: the one function the WP-CLI sweep of saved content
 * (scripts/sweep-spacing-attrs.php) and the tests share.
 *
 * Eight blocks (card-grid, feature-grid, form-step, post-grid, pricing-table, product-card, tabs, testimonial-slider) used to
 * declare `supports.spacing`, so WordPress stored their padding and margin as one flat box under `style.spacing`. They now own
 * `padding` and `margin` attributes (a `{desktop, tablet, mobile}` object, each tier a `{top, right, bottom, left}` box) and the
 * shared wrapper reads only those. This moves a block's saved `style.spacing.padding` / `style.spacing.margin` into the desktop
 * tier of the owned attribute:
 *
 *   - A side value `var:preset|spacing|40` (WordPress's storage form) becomes `var(--wp--preset--spacing--40)`, the same theme
 *     token in the form the shared control stores. Any other value (`24px`, `0`, `2rem`) moves as it is.
 *   - An owned desktop tier that already holds a value wins: the flat box is dropped (the old wrapper read the owned value first).
 *   - `style.spacing.padding` and `style.spacing.margin` are removed; `blockGap` and every other key stay, and an emptied `spacing`
 *     or `style` object is removed with them.
 *
 * Every step is idempotent: a block with no flat box is returned as it came. Only blocks that own a padding or margin attribute
 * change, and only those attributes.
 *
 * @package SGS\Blocks
 */

defined( 'ABSPATH' ) || exit;

if ( ! function_exists( 'sgs_spacing_sweep_side' ) ) {

	/**
	 * One side value in the owned attribute's storage form.
	 *
	 * @param mixed $value A side of the flat box.
	 * @return string The value, with a WordPress preset reference as the theme token.
	 */
	function sgs_spacing_sweep_side( $value ): string {
		$value = trim( (string) $value );
		if ( preg_match( '/^var:preset\|spacing\|([a-z0-9-]+)$/i', $value, $m ) ) {
			return 'var(--wp--preset--spacing--' . $m[1] . ')';
		}
		return $value;
	}
}

if ( ! function_exists( 'sgs_spacing_sweep_box' ) ) {

	/**
	 * A flat box as the owned attribute's desktop box.
	 *
	 * @param mixed $box `{top, right, bottom, left}`, as WordPress stored it.
	 * @return array<string, string> The box without empty sides; empty when nothing is set.
	 */
	function sgs_spacing_sweep_box( $box ): array {
		$out = array();
		if ( ! is_array( $box ) ) {
			return $out;
		}
		foreach ( array( 'top', 'right', 'bottom', 'left' ) as $side ) {
			if ( isset( $box[ $side ] ) && ( is_string( $box[ $side ] ) || is_numeric( $box[ $side ] ) ) && '' !== trim( (string) $box[ $side ] ) ) {
				$out[ $side ] = sgs_spacing_sweep_side( $box[ $side ] );
			}
		}
		return $out;
	}
}

if ( ! function_exists( 'sgs_spacing_sweep_owned_has_value' ) ) {

	/**
	 * Whether an owned `padding` / `margin` value holds a side at its desktop tier.
	 *
	 * @param mixed $owned The saved attribute.
	 * @return bool
	 */
	function sgs_spacing_sweep_owned_has_value( $owned ): bool {
		return is_array( $owned ) && array() !== sgs_spacing_sweep_box( $owned['desktop'] ?? null );
	}
}

if ( ! function_exists( 'sgs_spacing_sweep_attrs' ) ) {

	/**
	 * One block's attributes with the flat `style.spacing` padding and margin moved into the owned attributes.
	 *
	 * @param array<string, mixed> $attrs Saved attributes.
	 * @return array<string, mixed> The attributes after the rewrite (equal to `$attrs` when nothing applies).
	 */
	function sgs_spacing_sweep_attrs( array $attrs ): array {
		$spacing = $attrs['style']['spacing'] ?? null;
		if ( ! is_array( $spacing ) ) {
			return $attrs;
		}
		$out = $attrs;
		foreach ( array( 'padding', 'margin' ) as $prop ) {
			if ( ! array_key_exists( $prop, $spacing ) ) {
				continue;
			}
			$box = sgs_spacing_sweep_box( $spacing[ $prop ] );
			if ( array() !== $box && ! sgs_spacing_sweep_owned_has_value( $out[ $prop ] ?? null ) ) {
				$owned            = is_array( $out[ $prop ] ?? null ) ? $out[ $prop ] : array();
				$owned['desktop'] = $box;
				$out[ $prop ]     = $owned;
			}
			unset( $out['style']['spacing'][ $prop ] );
		}
		if ( array() === $out['style']['spacing'] ) {
			unset( $out['style']['spacing'] );
		}
		if ( array() === $out['style'] ) {
			unset( $out['style'] );
		}
		return $out;
	}
}

if ( ! function_exists( 'sgs_spacing_sweep_blocks' ) ) {

	/**
	 * The registered `sgs/*` blocks that own a padding or margin attribute: the only blocks whose flat `style.spacing` box is
	 * moved, because it is the only place such a box can be read.
	 *
	 * @return string[] Block names, sorted.
	 */
	function sgs_spacing_sweep_blocks(): array {
		$names = array();
		foreach ( WP_Block_Type_Registry::get_instance()->get_all_registered() as $name => $type ) {
			if ( 0 === strpos( (string) $name, 'sgs/' ) && ( isset( $type->attributes['padding'] ) || isset( $type->attributes['margin'] ) ) ) {
				$names[] = (string) $name;
			}
		}
		sort( $names );
		return $names;
	}
}

if ( ! function_exists( 'sgs_spacing_sweep_same_attrs' ) ) {

	/**
	 * Whether a block's rewritten attributes equal the attributes parsed back from the written content (compared as values with
	 * keys sorted at every level; an empty object reads back as an empty array).
	 *
	 * @param array $expect The rewrite of the old attributes.
	 * @param array $parsed The attributes parse_blocks() read from the written content.
	 * @return bool
	 */
	function sgs_spacing_sweep_same_attrs( array $expect, array $parsed ): bool {
		$canon = static function ( $v ) use ( &$canon ) {
			if ( is_object( $v ) ) {
				$v = (array) $v;
			}
			if ( ! is_array( $v ) ) {
				return $v;
			}
			ksort( $v );
			return array_map( $canon, $v );
		};
		return $canon( $expect ) === $canon( $parsed );
	}
}

if ( ! function_exists( 'sgs_spacing_sweep_content' ) ) {

	/**
	 * A post's saved content with the named blocks' delimiters rewritten. Only a block comment's JSON attributes change, and only
	 * for a delimiter that holds a flat `style.spacing` padding or margin; every other byte of the content stays as it was.
	 *
	 * @param string        $content   `post_content`.
	 * @param string[]      $blocks    Block names to rewrite (`sgs/tabs`).
	 * @param callable|null $serialise Encodes a block's attributes as WordPress writes them in a delimiter (`serialize_block_attributes`).
	 * @return array{content: string, changed: array<string, int>, attrs: array<string, int>} The new content, the count of
	 *         delimiters changed per block name, and the count of boxes moved per `block::padding` or `block::margin`.
	 */
	function sgs_spacing_sweep_content( string $content, array $blocks, ?callable $serialise = null ): array {
		$serialise = $serialise ?? 'serialize_block_attributes';
		$changed   = array();
		$counted   = array();
		$names     = implode( '|', array_map( static fn( string $b ): string => preg_quote( substr( $b, strpos( $b, '/' ) + 1 ), '#' ), $blocks ) );
		if ( '' === $names ) {
			return array(
				'content' => $content,
				'changed' => $changed,
				'attrs'   => $counted,
			);
		}
		$pattern = '#<!--(\s+)wp:sgs/(' . $names . ')(\s+)(\{(?:(?!-->).)*?\})(\s+)(/?)-->#s';
		$new     = preg_replace_callback(
			$pattern,
			static function ( array $m ) use ( $serialise, &$changed, &$counted ): string {
				$block = 'sgs/' . $m[2];
				$attrs = json_decode( $m[4], true );
				if ( ! is_array( $attrs ) ) {
					return $m[0];
				}
				$after = sgs_spacing_sweep_attrs( $attrs );
				if ( $after === $attrs ) {
					return $m[0];
				}
				$changed[ $block ] = ( $changed[ $block ] ?? 0 ) + 1;
				foreach ( array( 'padding', 'margin' ) as $prop ) {
					if ( isset( $attrs['style']['spacing'] ) && array_key_exists( $prop, (array) $attrs['style']['spacing'] ) ) {
						$counted[ $block . '::' . $prop ] = ( $counted[ $block . '::' . $prop ] ?? 0 ) + 1;
					}
				}
				return '<!--' . $m[1] . 'wp:' . $block . $m[3] . $serialise( $after ) . $m[5] . $m[6] . '-->';
			},
			$content
		);
		return array(
			'content' => is_string( $new ) ? $new : $content,
			'changed' => $changed,
			'attrs'   => $counted,
		);
	}
}
