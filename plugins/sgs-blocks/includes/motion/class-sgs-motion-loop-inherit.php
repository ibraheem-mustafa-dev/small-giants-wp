<?php
/**
 * "Apply entrance to children" for server-rendered item lists (Spec 38A §8, FR-38A-26).
 *
 * A container's stagger helper setting `stagger.apply` gives every child with no entrance of its own the container's
 * entrance. Inner-block children get it in the editor (`stagger-write.js::childMotionWithDelay`); the items a block
 * prints from an attribute array or a query (card-grid, post-grid, gallery, timeline, nav-drawer-menu, nav-bar-menu)
 * are not blocks, so they get it here, on the server:
 *
 * - The item is the block's declared part whose element the caller's item selector names (card-grid
 *   `.sgs-card-grid__item` is the part `item`, timeline `.sgs-timeline__entry` the part `entry`). An item selector that
 *   names no declared part (a delegated child block's root) inherits nothing here: the delegating block hands the
 *   entrance to the child block's own motion instead (`Sgs_Motion_Delegate`).
 * - When that part has an entrance of its own, it keeps it and nothing is inherited (`apply` fills gaps only).
 * - The inherited layer is the container's own entrance (the root's `entrance.base`, else a wrapper part's) with every
 *   delay removed, so each item's delay comes from its stagger rule (`--sgs-me-delay`, `Sgs_Motion_Loop_Delays`).
 * - The scoped rule `.<uid> <item selector>` is emitted by the shared emitter; the items' data attributes
 *   (`data-sgs-me` and its keyframes) are written by a `render_block` filter after the motion renderer, on every
 *   element of the block's output that carries the item class and has no `data-sgs-me` yet.
 *
 * The container keeps its own entrance: §8 has the helper stamp the container's entrance onto each child, never move
 * it, which is what the editor does for inner blocks; it also keeps the runtime the items need loaded.
 * `apply: false` (or absent) inherits nothing and leaves the delays exactly as before.
 *
 * @package SGS\Blocks
 */

namespace SGS\Blocks\Motion;

use function SGS\Blocks\sgs_collect_css;
use function SGS\Blocks\sgs_is_frontend_render;

defined( 'ABSPATH' ) || exit;

/**
 * Class Sgs_Motion_Loop_Inherit
 */
final class Sgs_Motion_Loop_Inherit {

	/**
	 * Item attributes waiting for their block's `render_block` pass: block name => list of {class, attrs}.
	 *
	 * @var array<string,array<int,array{class:string,attrs:array<string,string>}>>
	 */
	private static $pending = array();

	/**
	 * Hook the stamping filter, after the motion renderer (priority 20).
	 *
	 * @return void
	 */
	public static function register(): void {
		add_filter( 'render_block', array( self::class, 'stamp' ), 21, 2 );
	}

	/**
	 * Emit the inherited entrance for a block's items, when the block's stagger has `apply` on.
	 *
	 * @param string              $block_name    Block slug.
	 * @param string              $uid           The block's per-instance class.
	 * @param array<string,mixed> $attributes    The block's attributes.
	 * @param string              $item_selector Class selector of one item under the root.
	 * @return string|null Null when nothing is inherited; otherwise the `<style>` tag to echo (an empty string when the
	 *                     rule went to the front-end collector).
	 */
	public static function item_entrance( string $block_name, string $uid, array $attributes, string $item_selector ): ?string {
		$motion = $attributes['sgsMotion'] ?? null;
		if ( ! is_array( $motion ) || true !== ( $motion['stagger']['apply'] ?? null ) || '' === $uid ) {
			return null;
		}
		$part = self::item_part( $block_name, $item_selector );
		if ( null === $part ) {
			return null;
		}
		$doc = Sgs_Motion_Document::sanitise( $motion );
		if ( is_array( $doc['elements'][ $part ]['entrance']['base'] ?? null ) ) {
			return null;
		}
		$template = self::container_base( $block_name, $doc );
		if ( null === $template ) {
			return null;
		}
		$element = array( 'entrance' => array( 'base' => self::without_delays( $template ) ) );
		$emitted = Sgs_Motion_Emitter::emit(
			$element,
			'.' . $uid . ' ' . $item_selector,
			array(
				'lcp'               => false,
				'suppress_entrance' => false,
				'no_transition'     => false,
				'block'             => $block_name,
				'target'            => $part,
			)
		);
		if ( empty( $emitted['entrance'] ) || array() === $emitted['attrs'] ) {
			return null;
		}
		$classes                        = explode( '.', ltrim( $item_selector, '.' ) );
		self::$pending[ $block_name ][] = array(
			'class' => (string) end( $classes ),
			'attrs' => $emitted['attrs'],
		);
		return self::collect( $emitted['css'], $uid . '-inherit' );
	}

	/**
	 * The container's own entrance: the root's `entrance.base`, else the first wrapper part's.
	 *
	 * @param string              $block_name Block slug.
	 * @param array<string,mixed> $doc        Sanitised motion document.
	 * @return array<string,mixed>|null
	 */
	public static function container_base( string $block_name, array $doc ): ?array {
		$elements = isset( $doc['elements'] ) && is_array( $doc['elements'] ) ? $doc['elements'] : array();
		if ( is_array( $elements['root']['entrance']['base'] ?? null ) ) {
			return $elements['root']['entrance']['base'];
		}
		foreach ( Sgs_Motion_Targets::parts( $block_name ) as $part => $is_wrapper ) {
			if ( $is_wrapper && is_array( $elements[ $part ]['entrance']['base'] ?? null ) ) {
				return $elements[ $part ]['entrance']['base'];
			}
		}
		return null;
	}

	/**
	 * An entrance layer with every delay and close delay removed (the twin of `stagger-write.js::inheritedBase`).
	 *
	 * @param array<string,mixed> $base Entrance layer.
	 * @return array<string,mixed>
	 */
	public static function without_delays( array $base ): array {
		unset( $base['values']['delay'], $base['close']['closeDelay'] );
		foreach ( is_array( $base['devices'] ?? null ) ? array_keys( $base['devices'] ) : array() as $device ) {
			if ( is_array( $base['devices'][ $device ] ) ) {
				unset( $base['devices'][ $device ]['delay'], $base['devices'][ $device ]['close']['closeDelay'] );
			}
		}
		if ( isset( $base['customised'] ) && is_array( $base['customised'] ) ) {
			$base['customised'] = array_values(
				array_filter(
					$base['customised'],
					static function ( $path ): bool {
						return ! is_string( $path ) || 1 !== preg_match( '/(?:^|\.)(?:delay|closeDelay)$/', $path );
					}
				)
			);
		}
		return $base;
	}

	/**
	 * The declared part (not a wrapper or band) whose element the item selector names, or null.
	 *
	 * @param string $block_name    Block slug.
	 * @param string $item_selector Class selector, for example `.sgs-card-grid__item`.
	 * @return string|null
	 */
	public static function item_part( string $block_name, string $item_selector ): ?string {
		$want = '.sgs-x ' . $item_selector;
		foreach ( Sgs_Motion_Targets::parts( $block_name ) as $part => $is_wrapper ) {
			if ( $is_wrapper ) {
				continue;
			}
			$resolved = Sgs_Motion_Targets::resolve( $block_name, 'sgs-x', (string) $part, array() );
			if ( null !== $resolved && $want === $resolved['selector'] ) {
				return (string) $part;
			}
		}
		return null;
	}

	/**
	 * Write the inherited entrance's data attributes on the block's items (render_block, priority 21).
	 *
	 * @param mixed $block_content Rendered HTML.
	 * @param mixed $block         Parsed block.
	 * @return mixed
	 */
	public static function stamp( $block_content, $block = null ) {
		$name = is_array( $block ) ? (string) ( $block['blockName'] ?? '' ) : '';
		if ( '' === $name || empty( self::$pending[ $name ] ) ) {
			return $block_content;
		}
		$entries = self::$pending[ $name ];
		unset( self::$pending[ $name ] );
		if ( ! is_string( $block_content ) || '' === $block_content ) {
			return $block_content;
		}
		$processor = new \WP_HTML_Tag_Processor( $block_content );
		while ( $processor->next_tag() ) {
			if ( null !== $processor->get_attribute( 'data-sgs-me' ) ) {
				continue;
			}
			foreach ( $entries as $entry ) {
				if ( $processor->has_class( $entry['class'] ) ) {
					foreach ( $entry['attrs'] as $attr => $value ) {
						$processor->set_attribute( $attr, $value );
					}
					break;
				}
			}
		}
		return $processor->get_updated_html();
	}

	/**
	 * Hand CSS to the front-end collector, or return an inline `<style>` tag where the collector never flushes.
	 *
	 * @param string $css CSS.
	 * @param string $id  Style tag id.
	 * @return string
	 */
	private static function collect( string $css, string $id ): string {
		if ( '' === $css ) {
			return '';
		}
		if ( sgs_is_frontend_render() ) {
			sgs_collect_css( $css );
			return '';
		}
		return '<style id="' . esc_attr( $id ) . '">' . $css . '</style>';
	}
}

Sgs_Motion_Loop_Inherit::register();
