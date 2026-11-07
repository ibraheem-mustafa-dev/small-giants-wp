<?php
/**
 * The site reveal default (Spec 38A §8.1; FR-38A-62, FR-38A-63).
 *
 * A client's scroll reveal is global: `settings.custom.entrance.reveal` holds named rules (`heading`, `item`), and a
 * block inside the main content that matches a rule and stores no entrance of its own is given one here, as an
 * ordinary stored-shaped entrance on its root target. `Sgs_Motion_Renderer` then emits it through the normal path, so
 * the output is the same scoped rules and `data-sgs-me` attributes a stored entrance produces.
 *
 * Rules:
 * - `heading`: an `sgs/heading` at level h2 and the `sgs/text` block placed right after it.
 * - `item`: each child of a grid or wrapped flex container (read from the container's stored layout) that has two or
 *   more children. The delay is the child's index times `staggerStep`, capped at `staggerCap`, restarting after
 *   `staggerEvery` children (`Sgs_Motion_Stagger::compute_delays`), worked out here on the server.
 * - The page's first section, the header, footer, drawers and mega panels never take the default; a block's own entrance
 *   wins; `sgsMotion.elements.root.entrance.off` turns the default off for one block; a container whose `stagger.apply`
 *   is on hands its own entrance to its children, so its children take no default.
 *
 * With `entrance.reveal` unset nothing here changes a document or a frame.
 *
 * @package SGS\Blocks
 */

namespace SGS\Blocks\Motion;

defined( 'ABSPATH' ) || exit;

/**
 * Class Sgs_Motion_Reveal_Default
 */
final class Sgs_Motion_Reveal_Default {

	/**
	 * Blocks outside the default: the header, footer, nav and drawer, and mega panels.
	 */
	private const EXCLUDED_BLOCKS = '#^sgs/(?:site-header|site-footer|nav-bar|nav-drawer|mega-)#';

	/**
	 * A rule's `filter: blur(Npx)`, which the entrance stores as `from.blur`.
	 */
	private const BLUR_FILTER = '/^\s*blur\(\s*(-?[0-9.]+)\s*(px)?\s*\)\s*$/';

	/**
	 * The tokens for this request, or null before they are read.
	 *
	 * @var array<string,mixed>|null
	 */
	private static $tokens = null;

	/**
	 * The sibling state of the blocks rendered with no open frame above them.
	 *
	 * @var array<string,mixed>
	 */
	private static $root = array();

	/**
	 * Clear the request state.
	 *
	 * @return void
	 */
	public static function reset(): void {
		self::$tokens = null;
		self::$root   = array();
	}

	/**
	 * The client's entrance tokens: the `sgs_motion_reveal_tokens` filter, else `settings.custom.entrance`.
	 *
	 * @return array<string,mixed>
	 */
	public static function tokens(): array {
		if ( null === self::$tokens ) {
			$tokens = apply_filters( 'sgs_motion_reveal_tokens', null );
			if ( null === $tokens && function_exists( 'sgs_global_custom_setting' ) ) {
				$tokens = sgs_global_custom_setting( 'entrance' );
			}
			self::$tokens = is_array( $tokens ) ? $tokens : array();
		}
		return self::$tokens;
	}

	/**
	 * Whether the site has a reveal default.
	 *
	 * @return bool
	 */
	public static function active(): bool {
		$reveal = self::tokens()['reveal'] ?? null;
		return is_array( $reveal ) && array() !== $reveal;
	}

	/**
	 * The document the block renders with, and the frame fields its children need.
	 *
	 * Called once per block from `Sgs_Motion_Renderer::open_frame`, after the stored document is read. `$stack` is the
	 * renderer's frame stack: the open parent's frame counts this block among its children.
	 *
	 * @param array<string,mixed>            $doc     The block's stored, sanitised document (empty when none).
	 * @param array<string,mixed>            $block   Parsed block.
	 * @param array<int,array<string,mixed>> $stack   Open frames, outermost first (updated: the parent counts the child).
	 * @param bool                           $first   Whether the block sits in the page's first section.
	 * @param bool                           $content Whether the main content has started rendering.
	 * @param bool                           $skip    Whether the block is a transparent `main` wrapper.
	 * @return array{doc:array<string,mixed>,frame:array<string,mixed>}
	 */
	public static function resolve( array $doc, array $block, array &$stack, bool $first, bool $content, bool $skip = false ): array {
		if ( ! self::active() ) {
			return array(
				'doc'   => $doc,
				'frame' => array(),
			);
		}
		$name  = (string) ( $block['blockName'] ?? '' );
		$attrs = is_array( $block['attrs'] ?? null ) ? $block['attrs'] : array();
		$top   = array() === $stack ? null : count( $stack ) - 1;
		if ( null === $top ) {
			$parent = &self::$root;
		} else {
			$parent = &$stack[ $top ];
		}
		$index        = (int) ( $parent['rv_next'] ?? 0 );
		$total        = (int) ( $parent['rv_total'] ?? 0 );
		$after_h2     = ! empty( $parent['rv_h2'] );
		$parent_items = ! empty( $parent['rv_claims'] ) && empty( $parent['rv_applies'] );
		$claimed      = ! empty( $parent['rv_claimed'] );
		$off          = ! empty( $parent['rv_off'] ) || self::excluded( $name, $attrs );

		$parent['rv_next'] = $index + 1;
		$is_h2             = 'sgs/heading' === $name && 'h2' === self::attribute( $name, $attrs, 'level' );
		$parent['rv_h2']   = $is_h2;

		$kids   = count(
			array_filter(
				is_array( $block['innerBlocks'] ?? null ) ? $block['innerBlocks'] : array(),
				static function ( $inner ): bool {
					return is_array( $inner ) && ! empty( $inner['blockName'] );
				}
			)
		);
		$claims = ! $claimed && $kids >= 2 && self::wraps_items( $name, $attrs ) && 'div' === ( self::attribute( $name, $attrs, 'tagName' ) ?? 'div' );
		$frame  = array(
			'rv_off'     => $off,
			'rv_claims'  => $claims,
			'rv_claimed' => $claimed || $claims,
			'rv_total'   => $kids,
			'rv_applies' => ! empty( $attrs[ Sgs_Motion_Renderer::ATTR ]['stagger']['apply'] ),
		);
		if ( $off || $first || $skip || ! $content || ! Sgs_Motion_Renderer::supports( $name ) || self::has_own_entrance( $doc ) ) {
			return array(
				'doc'   => $doc,
				'frame' => $frame,
			);
		}

		$rule  = null;
		$delay = 0;
		if ( $is_h2 || ( 'sgs/text' === $name && $after_h2 ) ) {
			$rule = 'heading';
		} elseif ( $parent_items ) {
			$rule  = 'item';
			$delay = self::delay( $index, $total );
		}
		$base = null === $rule ? null : self::base( $rule, $delay );
		if ( null !== $base ) {
			$doc = self::with_base( $doc, $base );
		}
		return array(
			'doc'   => $doc,
			'frame' => $frame,
		);
	}

	/**
	 * The entrance a rule produces for a block, as the schema stores it, or null when the rule is absent or invalid.
	 *
	 * @param string $rule  `heading` or `item`.
	 * @param int    $delay The block's delay in milliseconds.
	 * @return array<string,mixed>|null
	 */
	public static function base( string $rule, int $delay = 0 ): ?array {
		$tokens = self::tokens();
		$spec   = $tokens['reveal'][ $rule ] ?? null;
		if ( ! is_array( $spec ) || ! is_array( $spec['from'] ?? null ) ) {
			return null;
		}
		$from = array();
		foreach ( $spec['from'] as $key => $value ) {
			if ( 'filter' === $key ) {
				if ( is_string( $value ) && 1 === preg_match( self::BLUR_FILTER, $value, $m ) ) {
					$from['blur'] = (float) $m[1];
				}
				continue;
			}
			$from[ (string) $key ] = $value;
		}
		$values = array( 'from' => $from );
		$time   = self::milliseconds( $spec['duration'] ?? ( $tokens['duration'] ?? null ) );
		if ( null !== $time ) {
			$values['duration'] = $time;
		}
		$easing = $spec['easing'] ?? ( $tokens['easing'] ?? null );
		if ( is_string( $easing ) && '' !== $easing ) {
			$values['easing'] = $easing;
		}
		if ( $delay > 0 ) {
			$values['delay'] = $delay;
		}
		if ( isset( $tokens['start'] ) && is_numeric( $tokens['start'] ) ) {
			$values['start'] = (float) $tokens['start'];
		}
		$clean = Sgs_Motion_Document::sanitise(
			array(
				'v'        => 1,
				'elements' => array(
					'root' => array(
						'entrance' => array(
							'base' => array(
								'trigger' => 'scroll',
								'values'  => $values,
							),
						),
					),
				),
			)
		);
		$base  = $clean['elements']['root']['entrance']['base'] ?? null;
		return is_array( $base ) ? $base : null;
	}

	/**
	 * Whether a stored document already decides the block's entrance: a stored base entrance or text effect, or `off`.
	 *
	 * @param array<string,mixed> $doc Sanitised document.
	 * @return bool
	 */
	private static function has_own_entrance( array $doc ): bool {
		$entrance = $doc['elements']['root']['entrance'] ?? array();
		return ! empty( $entrance['off'] ) || ! empty( $entrance['base'] ) || ! empty( $entrance['text'] );
	}

	/**
	 * The document with the default entrance on its root target; the rest of the document is kept.
	 *
	 * @param array<string,mixed> $doc  Sanitised document (empty when none).
	 * @param array<string,mixed> $base The entrance base layer.
	 * @return array<string,mixed>
	 */
	private static function with_base( array $doc, array $base ): array {
		if ( array() === $doc ) {
			$doc = array( 'v' => 1 );
		}
		$doc['elements']['root']['entrance']['base'] = $base;
		return $doc;
	}

	/**
	 * The delay of the child at an index: index times step, capped, restarting after `staggerEvery` children.
	 *
	 * @param int $index Child position, from 0.
	 * @param int $total Children in the container.
	 * @return int Milliseconds.
	 */
	private static function delay( int $index, int $total ): int {
		$tokens = self::tokens();
		$step   = $tokens['staggerStep'] ?? null;
		if ( ! is_numeric( $step ) || (float) $step <= 0 ) {
			return 0;
		}
		$every  = isset( $tokens['staggerEvery'] ) && is_numeric( $tokens['staggerEvery'] ) && (int) $tokens['staggerEvery'] > 0 ? (int) $tokens['staggerEvery'] : $total;
		$cap    = isset( $tokens['staggerCap'] ) && is_numeric( $tokens['staggerCap'] ) ? (float) $tokens['staggerCap'] : null;
		$delays = Sgs_Motion_Stagger::compute_delays(
			array(
				'count'   => max( 1, $every ),
				'columns' => 1,
				'offset'  => 0,
				'step'    => (float) $step,
				'cap'     => $cap,
			)
		);
		return (int) ( $delays[ $index % max( 1, $every ) ] ?? 0 );
	}

	/**
	 * Whether a block is outside the default: header, footer, drawer and mega panel blocks, and a `header` or `footer`
	 * element or template part.
	 *
	 * @param string              $name  Block name.
	 * @param array<string,mixed> $attrs Stored attributes.
	 * @return bool
	 */
	private static function excluded( string $name, array $attrs ): bool {
		if ( 1 === preg_match( self::EXCLUDED_BLOCKS, $name ) ) {
			return true;
		}
		foreach ( array( 'tagName', 'area', 'slug' ) as $key ) {
			$value = $attrs[ $key ] ?? null;
			if ( is_string( $value ) && in_array( $value, array( 'header', 'footer' ), true ) ) {
				return true;
			}
		}
		return false;
	}

	/**
	 * Whether the block arranges its children as a grid or a wrapped flex row, from its stored layout.
	 *
	 * @param string              $name  Block name.
	 * @param array<string,mixed> $attrs Stored attributes.
	 * @return bool
	 */
	private static function wraps_items( string $name, array $attrs ): bool {
		$layout = self::attribute( $name, $attrs, 'layout' );
		if ( 'grid' === $layout ) {
			return true;
		}
		if ( 'flex' !== $layout ) {
			return false;
		}
		$direction = self::attribute( $name, $attrs, 'flexDirection' );
		if ( is_string( $direction ) && 0 === strpos( $direction, 'column' ) ) {
			return false;
		}
		$wrap = self::attribute( $name, $attrs, 'flexWrap' );
		return is_array( $wrap ) ? in_array( 'wrap', $wrap, true ) : 'wrap' === $wrap;
	}

	/**
	 * A stored attribute, or the block type's default.
	 *
	 * @param string              $name  Block name.
	 * @param array<string,mixed> $attrs Stored attributes.
	 * @param string              $key   Attribute name.
	 * @return mixed
	 */
	private static function attribute( string $name, array $attrs, string $key ) {
		if ( array_key_exists( $key, $attrs ) ) {
			return $attrs[ $key ];
		}
		if ( ! class_exists( '\WP_Block_Type_Registry' ) ) {
			return null;
		}
		$type = \WP_Block_Type_Registry::get_instance()->get_registered( $name );
		return is_object( $type ) && is_array( $type->attributes ?? null ) ? ( $type->attributes[ $key ]['default'] ?? null ) : null;
	}

	/**
	 * A duration in milliseconds from a number, `800ms` or `0.8s`.
	 *
	 * @param mixed $value Token or rule value.
	 * @return float|int|null
	 */
	private static function milliseconds( $value ) {
		if ( is_numeric( $value ) ) {
			return $value + 0;
		}
		if ( is_string( $value ) && 1 === preg_match( '/^\s*([0-9.]+)\s*(ms|s)\s*$/', $value, $m ) ) {
			return 's' === $m[2] ? (float) $m[1] * 1000 : (float) $m[1];
		}
		return null;
	}
}
