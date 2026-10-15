<?php
/**
 * "Apply entrance to children" for server-rendered item lists (Spec 38A §8, FR-38A-26).
 *
 * A container's stagger helper setting `stagger.apply` moves the container's entrance onto every child with no
 * entrance of its own. Inner-block children get it in the editor (`stagger-write.js::childMotionWithDelay`); the items
 * a block prints from an attribute array or a query (card-grid, post-grid, gallery, timeline, nav-drawer-menu,
 * nav-bar-menu) are not blocks, so they get it here, on the server:
 *
 * - The item is the block's declared part whose element the caller's item selector names (card-grid
 *   `.sgs-card-grid__item` is the part `item`, timeline `.sgs-timeline__entry` the part `entry`). An item selector that
 *   names no declared part (a delegated child block's root) inherits nothing here: the delegating block hands the
 *   entrance to the child block's own motion instead (`Sgs_Motion_Delegate`).
 * - When that part has an entrance of its own, it keeps it and nothing is inherited (`apply` fills gaps only).
 * - The inherited layer is the container's own entrance (the root's `entrance.base`, else a wrapper part's) with every
 *   delay removed, so each item's delay comes from its stagger rule (`--sgs-me-delay`, `Sgs_Motion_Loop_Delays`).
 * - The container itself no longer plays that entrance (`moved_target`, read by the motion renderer and by the canvas
 *   twin `canvas/stagger-apply.js`), so the container's movement and each item's never add up.
 * - The LCP rule (§9) holds for the items as for any entrance: on a block in the page's first section an inherited
 *   page-load entrance keeps its items at full opacity.
 * - The scoped rule `.<uid> <item selector>` is emitted by the shared emitter; the items' data attributes
 *   (`data-sgs-me` and its keyframes) are written by a `render_block` filter after the motion renderer, on every
 *   element of that instance's output (the output that carries its `<uid>` class) that carries the item class and has
 *   no `data-sgs-me` yet. Pending attributes are held per instance, so two blocks of one type never take each other's.
 * - Items fetched later (post-grid "load more", page buttons and filters) take the same attributes: the first render
 *   computes them (`item_attrs`), the query data carries them, and the REST handler stamps the fetched cards with them
 *   (`decode_attrs`, `stamp_class`).
 *
 * `apply: false` (or absent) inherits nothing, moves nothing and leaves the delays exactly as before.
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

	/** The attributes an inherited entrance writes on an item, the only ones the query data may carry. */
	const ITEM_ATTRS = array( 'data-sgs-me', 'data-sgs-me-keyframes' );

	/**
	 * Item attributes waiting for their block's `render_block` pass: instance class => {block, class, attrs}.
	 *
	 * @var array<string,array{block:string,class:string,attrs:array<string,string>}>
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
		if ( '' === $uid ) {
			return null;
		}
		$emitted = self::inherited( $block_name, $attributes, $item_selector, '.' . $uid . ' ' . $item_selector, Sgs_Motion_Renderer::in_first_section() );
		if ( null === $emitted ) {
			return null;
		}
		$classes               = explode( '.', ltrim( $item_selector, '.' ) );
		self::$pending[ $uid ] = array(
			'block' => $block_name,
			'class' => (string) end( $classes ),
			'attrs' => $emitted['attrs'],
		);
		Sgs_Motion_Renderer::note_used( $emitted['attrs'] );
		return self::collect( $emitted['css'], $uid . '-inherit' );
	}

	/**
	 * The data attributes a block's items inherit, for items printed after the first render (load more): an empty array
	 * when nothing is inherited.
	 *
	 * @param string              $block_name    Block slug.
	 * @param array<string,mixed> $attributes    The block's attributes.
	 * @param string              $item_selector Class selector of one item under the root.
	 * @return array<string,string>
	 */
	public static function item_attrs( string $block_name, array $attributes, string $item_selector ): array {
		$emitted = self::inherited( $block_name, $attributes, $item_selector, '.sgs-x ' . $item_selector, false );
		return null === $emitted ? array() : array_intersect_key( $emitted['attrs'], array_flip( self::ITEM_ATTRS ) );
	}

	/**
	 * The item attributes carried back by a REST request, validated: only the entrance attributes, a trigger and
	 * channel list of lower-case words, and a keyframes value that is a JSON list. Anything else carries nothing.
	 *
	 * @param string $json The JSON object `item_attrs` produced.
	 * @return array<string,string>
	 */
	public static function decode_attrs( string $json ): array {
		$raw = json_decode( $json, true );
		if ( ! is_array( $raw ) || array() === $raw || array_keys( $raw ) === range( 0, count( $raw ) - 1 ) ) {
			return array();
		}
		$out = array();
		foreach ( $raw as $name => $value ) {
			if ( ! in_array( $name, self::ITEM_ATTRS, true ) || ! is_string( $value ) ) {
				return array();
			}
			if ( 'data-sgs-me' === $name && 1 !== preg_match( '/^[a-z]+(?: [a-z-]+)*$/', $value ) ) {
				return array();
			}
			if ( 'data-sgs-me-keyframes' === $name ) {
				$frames = json_decode( $value, true );
				if ( ! is_array( $frames ) || array() === $frames || array_keys( $frames ) !== range( 0, count( $frames ) - 1 ) ) {
					return array();
				}
				$value = (string) wp_json_encode( $frames );
			}
			$out[ $name ] = $value;
		}
		return isset( $out['data-sgs-me'] ) ? $out : array();
	}

	/**
	 * Write item attributes on every element carrying a class that has no `data-sgs-me` yet.
	 *
	 * @param string               $html       HTML.
	 * @param string               $item_class One class name (no dot).
	 * @param array<string,string> $attrs      Attributes to write.
	 * @return string
	 */
	public static function stamp_class( string $html, string $item_class, array $attrs ): string {
		if ( array() === $attrs || '' === $html || '' === $item_class ) {
			return $html;
		}
		$processor = new \WP_HTML_Tag_Processor( $html );
		while ( $processor->next_tag() ) {
			if ( null === $processor->get_attribute( 'data-sgs-me' ) && true === $processor->has_class( $item_class ) ) {
				foreach ( $attrs as $attr => $value ) {
					$processor->set_attribute( $attr, $value );
				}
			}
		}
		return $processor->get_updated_html();
	}

	/**
	 * The target whose entrance the container's stagger moves onto its children, or null when `apply` is off or the
	 * container has no entrance (the twin of `canvas/stagger-apply.js::movedEntranceTarget`).
	 *
	 * @param string $block_name Block slug.
	 * @param mixed  $motion     The block's stored motion value.
	 * @return string|null
	 */
	public static function moved_target( string $block_name, $motion ): ?string {
		if ( ! is_array( $motion ) || true !== ( $motion['stagger']['apply'] ?? null ) ) {
			return null;
		}
		return self::container_target( $block_name, Sgs_Motion_Document::sanitise( $motion ) );
	}

	/**
	 * The container's own entrance: the root's `entrance.base`, else the first wrapper part's.
	 *
	 * @param string              $block_name Block slug.
	 * @param array<string,mixed> $doc        Sanitised motion document.
	 * @return array<string,mixed>|null
	 */
	public static function container_base( string $block_name, array $doc ): ?array {
		$target = self::container_target( $block_name, $doc );
		return null === $target ? null : $doc['elements'][ $target ]['entrance']['base'];
	}

	/**
	 * The target that holds the container's own entrance: `root` when it has one, else the first wrapper part that has
	 * one, else null.
	 *
	 * @param string              $block_name Block slug.
	 * @param array<string,mixed> $doc        Sanitised motion document.
	 * @return string|null
	 */
	public static function container_target( string $block_name, array $doc ): ?string {
		$elements = isset( $doc['elements'] ) && is_array( $doc['elements'] ) ? $doc['elements'] : array();
		if ( is_array( $elements['root']['entrance']['base'] ?? null ) ) {
			return 'root';
		}
		foreach ( Sgs_Motion_Targets::parts( $block_name ) as $part => $is_wrapper ) {
			if ( $is_wrapper && is_array( $elements[ $part ]['entrance']['base'] ?? null ) ) {
				return (string) $part;
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
	 * Write the inherited entrance's data attributes on the items of each instance of this block whose `<uid>` class
	 * is in the output (render_block, priority 21).
	 *
	 * @param mixed $block_content Rendered HTML.
	 * @param mixed $block         Parsed block.
	 * @return mixed
	 */
	public static function stamp( $block_content, $block = null ) {
		$name = is_array( $block ) ? (string) ( $block['blockName'] ?? '' ) : '';
		if ( '' === $name || ! is_string( $block_content ) || '' === $block_content ) {
			return $block_content;
		}
		$mine = array();
		foreach ( self::$pending as $uid => $entry ) {
			if ( $name === $entry['block'] ) {
				$mine[ (string) $uid ] = $entry;
			}
		}
		if ( array() === $mine ) {
			return $block_content;
		}
		$found     = array();
		$left      = count( $mine );
		$processor = new \WP_HTML_Tag_Processor( $block_content );
		while ( $left > 0 && $processor->next_tag() ) {
			foreach ( array_keys( $mine ) as $uid ) {
				if ( ! isset( $found[ $uid ] ) && true === $processor->has_class( $uid ) ) {
					$found[ $uid ] = true;
					--$left;
				}
			}
		}
		foreach ( array_keys( $found ) as $uid ) {
			$block_content = self::stamp_class( $block_content, $mine[ $uid ]['class'], $mine[ $uid ]['attrs'] );
			unset( self::$pending[ $uid ] );
		}
		return $block_content;
	}

	/**
	 * The emitted inherited entrance under a selector, or null when nothing is inherited.
	 *
	 * @param string              $block_name    Block slug.
	 * @param array<string,mixed> $attributes    The block's attributes.
	 * @param string              $item_selector Class selector of one item under the root.
	 * @param string              $selector      The items' scoped selector.
	 * @param bool                $lcp           Whether the block sits in the page's first section (the LCP rule, §9).
	 * @return array{css:string,attrs:array<string,string>,entrance:bool}|null
	 */
	private static function inherited( string $block_name, array $attributes, string $item_selector, string $selector, bool $lcp ): ?array {
		$motion = $attributes['sgsMotion'] ?? null;
		if ( ! is_array( $motion ) || true !== ( $motion['stagger']['apply'] ?? null ) ) {
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
		$emitted = Sgs_Motion_Emitter::emit(
			array( 'entrance' => array( 'base' => self::without_delays( $template ) ) ),
			$selector,
			array(
				'lcp'               => $lcp,
				'suppress_entrance' => false,
				'no_transition'     => false,
				'block'             => $block_name,
				'target'            => $part,
			)
		);
		return empty( $emitted['entrance'] ) || array() === $emitted['attrs'] ? null : $emitted;
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
