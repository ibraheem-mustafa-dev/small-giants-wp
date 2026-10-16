<?php
/**
 * "Apply entrance to children" for server-rendered item lists (Spec 38A §8, FR-38A-26).
 *
 * A container's stagger helper setting `stagger.apply` moves the container's entrance onto every child with no
 * entrance of its own. Inner-block children get it in the editor (`stagger-write.js::childMotionWithDelay`); the items
 * a block prints from an attribute array or a query (card-grid, post-grid, gallery, timeline, nav-drawer-menu,
 * nav-bar-menu) are not blocks, so they get it here, on the server:
 *
 * - The item is the part the block declares in `supports.sgs.motionItems` (card-grid `item`, post-grid `card`,
 *   timeline `entry`), and the caller's item selector must name that part's element (`.sgs-card-grid__item`). The
 *   editor canvas reads the same declaration (`canvas/stagger-apply.js`). An item selector that names no declared part
 *   (a delegated child block's root) inherits nothing here: the delegating block hands the entrance to the child
 *   block's own motion instead (`Sgs_Motion_Delegate`).
 * - When that part has an entrance of its own, it keeps it and nothing is inherited (`apply` fills gaps only).
 * - The inherited layer is the container's own entrance (the root's `entrance.base`, else a wrapper part's) with every
 *   delay removed, so each item's delay comes from its stagger rule (`--sgs-me-delay`, `Sgs_Motion_Loop_Delays`).
 * - The container itself no longer plays that entrance once its items took it: `item_entrance` records the hand-over on
 *   the block's render frame (`Sgs_Motion_Renderer::note_moved`) and the renderer leaves the container target's
 *   entrance out, so the container's movement and each item's never add up. Items that keep their own entrance, or a
 *   render with no items, leave the container its entrance. The trigger goes over unchanged: an `open` or `state`
 *   entrance plays on the items under the same state host as on the container (the host's descendants match the
 *   trigger rules in `assets/css/motion-triggers.css`); a trigger the emitter refuses for the items moves nothing.
 * - The LCP rule (§9) holds for the items as for any entrance: on a block in the page's first section an inherited
 *   page-load entrance keeps its items at full opacity.
 * - The scoped rule `.<uid> <item selector>` is emitted by the shared emitter; the items' data attributes
 *   (`data-sgs-me` and its keyframes) are written by a `render_block` filter after the motion renderer, on every
 *   element of that instance's output (the output that carries its `<uid>` class) that carries the item class and has
 *   no `data-sgs-me` yet. Pending attributes are held per instance, so two blocks of one type never take each other's.
 * - Items fetched later (post-grid "load more", page buttons and filters) take the same attributes: the first render
 *   computes them (`item_attrs`), the query data carries them, and the REST handler stamps the fetched cards with them
 *   (`decode_attrs`, `stamp_class`). A post grid whose first page is empty still emits its cards' rule (without
 *   moving the container's entrance), so cards fetched later play.
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

	/** The longest keyframe value a carried keyframes attribute may hold (a CSS length, angle or number is far shorter). */
	const KEYFRAME_VALUE_MAX = 64;

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
	 * @param bool                $moves         Whether this render prints items that take the entrance, so the
	 *                                           container's own entrance moves (false for a post grid's empty first
	 *                                           page, whose rule serves only cards fetched later).
	 * @return string|null Null when nothing is inherited; otherwise the `<style>` tag to echo (an empty string when the
	 *                     rule went to the front-end collector).
	 */
	public static function item_entrance( string $block_name, string $uid, array $attributes, string $item_selector, bool $moves = true ): ?string {
		if ( '' === $uid ) {
			return null;
		}
		$emitted = self::inherited( $block_name, $attributes, $item_selector, '.' . $uid . ' ' . $item_selector, Sgs_Motion_Renderer::in_first_section() );
		if ( null === $emitted ) {
			return null;
		}
		if ( $moves ) {
			Sgs_Motion_Renderer::note_moved( $block_name, $emitted['from'] );
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
	 * channel list of lower-case words (nothing after the last word, not even a newline), and a keyframes value that is
	 * a JSON list of frames the emitter writes (`keyframes_valid`). Anything else carries nothing.
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
			if ( 'data-sgs-me' === $name && 1 !== preg_match( '/^[a-z]+(?: [a-z-]+)*\z/', $value ) ) {
				return array();
			}
			if ( 'data-sgs-me-keyframes' === $name ) {
				$frames = json_decode( $value, true );
				if ( ! self::keyframes_valid( $frames ) ) {
					return array();
				}
				$value = (string) wp_json_encode( $frames );
			}
			$out[ $name ] = $value;
		}
		return isset( $out['data-sgs-me'] ) ? $out : array();
	}

	/**
	 * Whether a decoded keyframes value has the shape `Sgs_Motion_Keyframes::json` writes: a list of at most the schema's
	 * `EntranceKeyframeList` maximum of frames, each an object whose keys are `offset` (a number from 0 to 1) or an owner
	 * property the emitter writes for a keyframe (`Sgs_Motion_Emitter::fields( 'EntranceKeyframe' )`), with a string or
	 * number value of at most `KEYFRAME_VALUE_MAX` characters.
	 *
	 * @param mixed $frames Decoded value.
	 * @return bool
	 */
	private static function keyframes_valid( $frames ): bool {
		$max = (int) ( Sgs_Motion_Field_Types::schema()['$defs']['EntranceKeyframeList']['maxItems'] ?? 0 );
		if ( ! is_array( $frames ) || array() === $frames || array_keys( $frames ) !== range( 0, count( $frames ) - 1 ) || $max < 1 || count( $frames ) > $max ) {
			return false;
		}
		$props = array();
		foreach ( Sgs_Motion_Emitter::fields( 'EntranceKeyframe' ) as $field ) {
			if ( is_string( $field['css'] ?? null ) && '' !== $field['css'] ) {
				$props[ $field['css'] ] = true;
			}
		}
		foreach ( $frames as $frame ) {
			if ( ! is_array( $frame ) || array() === $frame || array_keys( $frame ) === range( 0, count( $frame ) - 1 ) ) {
				return false;
			}
			foreach ( $frame as $key => $value ) {
				if ( 'offset' === $key ) {
					if ( ( ! is_int( $value ) && ! is_float( $value ) ) || $value < 0 || $value > 1 ) {
						return false;
					}
					continue;
				}
				if ( ! isset( $props[ $key ] ) || ( ! is_string( $value ) && ! is_int( $value ) && ! is_float( $value ) ) || strlen( (string) $value ) > self::KEYFRAME_VALUE_MAX ) {
					return false;
				}
			}
		}
		return true;
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
	 * The target whose entrance a container holding inner blocks moves onto its children, or null when `apply` is off or
	 * the container has no entrance (the twin of `canvas/stagger-apply.js::movedEntranceTarget`). A block that prints its
	 * items itself moves it only when they take it (`item_entrance`, `Sgs_Motion_Delegate::child_motion`).
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
	 * The part a block declares as its printed items (`supports.sgs.motionItems`), or null when it declares none or the
	 * value names no declared part that is not a wrapper (the twin of `canvas/stagger-apply.js::declaredItemPart`).
	 *
	 * @param string $block_name Block slug.
	 * @return string|null
	 */
	public static function declared_item_part( string $block_name ): ?string {
		if ( ! class_exists( '\WP_Block_Type_Registry' ) ) {
			return null;
		}
		$type = \WP_Block_Type_Registry::get_instance()->get_registered( $block_name );
		$part = is_object( $type ) ? ( $type->supports['sgs']['motionItems'] ?? null ) : null;
		$all  = Sgs_Motion_Targets::parts( $block_name );
		return is_string( $part ) && array_key_exists( $part, $all ) && ! $all[ $part ] ? $part : null;
	}

	/**
	 * What the block's declared item part inherits, before emission: the part, the container target the entrance comes
	 * from, and the entrance layer with its delays removed. Null when `apply` is off, the block declares no item part,
	 * the item part has its own entrance or the container has none.
	 *
	 * @param string $block_name Block slug.
	 * @param mixed  $motion     The block's stored motion value.
	 * @return array{part:string,from:string,base:array<string,mixed>}|null
	 */
	public static function inherited_layer( string $block_name, $motion ): ?array {
		if ( ! is_array( $motion ) || true !== ( $motion['stagger']['apply'] ?? null ) ) {
			return null;
		}
		$part = self::declared_item_part( $block_name );
		if ( null === $part ) {
			return null;
		}
		$doc = Sgs_Motion_Document::sanitise( $motion );
		if ( is_array( $doc['elements'][ $part ]['entrance']['base'] ?? null ) ) {
			return null;
		}
		$from = self::container_target( $block_name, $doc );
		if ( null === $from ) {
			return null;
		}
		return array(
			'part' => $part,
			'from' => $from,
			'base' => self::without_delays( $doc['elements'][ $from ]['entrance']['base'] ),
		);
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
	 * @return array{css:string,attrs:array<string,string>,entrance:bool,from:string}|null
	 */
	private static function inherited( string $block_name, array $attributes, string $item_selector, string $selector, bool $lcp ): ?array {
		$layer = self::inherited_layer( $block_name, $attributes['sgsMotion'] ?? null );
		if ( null === $layer || self::item_part( $block_name, $item_selector ) !== $layer['part'] ) {
			return null;
		}
		$emitted = self::emit_layer( $block_name, $layer, $selector, $lcp );
		if ( null === $emitted ) {
			return null;
		}
		$emitted['from'] = $layer['from'];
		return $emitted;
	}

	/**
	 * The inherited layer emitted under the items' selector, or null when the emitter wrote no entrance (a trigger it
	 * refused for the items moves nothing).
	 *
	 * @param string                                                  $block_name Block slug.
	 * @param array{part:string,from:string,base:array<string,mixed>} $layer      `inherited_layer()`.
	 * @param string                                                  $selector   The items' scoped selector.
	 * @param bool                                                    $lcp        The LCP rule (section 9).
	 * @return array{css:string,attrs:array<string,string>,entrance:bool}|null
	 */
	public static function emit_layer( string $block_name, array $layer, string $selector, bool $lcp ): ?array {
		$emitted = Sgs_Motion_Emitter::emit(
			array( 'entrance' => array( 'base' => $layer['base'] ) ),
			$selector,
			array(
				'lcp'               => $lcp,
				'suppress_entrance' => false,
				'no_transition'     => false,
				'block'             => $block_name,
				'target'            => $layer['part'],
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
