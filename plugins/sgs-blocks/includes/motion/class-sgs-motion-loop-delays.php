<?php
/**
 * Server-written loop delays (Spec 38A §8 "Query loops", FR-38A-26).
 *
 * A query loop's items are rendered by the server, so each item's stagger delay is written by the server too: one
 * positional scoped rule per item, through the shared collector, using the one delay function
 * (`Sgs_Motion_Stagger::compute_delays`). The item is found by a data attribute carrying its loop index
 * (`data-sgs-loop-i`), never by `:nth-child`, and no `style` attribute is written (Spec 32).
 *
 * - `sgs/post-grid`: `render-interior.php` calls `post_grid()` and `tag_item()`; settings come from the block's own
 *   `sgsMotion.stagger`; columns per device from `Sgs_Motion_Stagger::columns_for_block` (a grid layout only; list,
 *   masonry and carousel are one column).
 * - `sgs/gallery`, `sgs/card-grid`, `sgs/timeline` render their items from an attribute array: each block calls
 *   `item_array()` with its item count and item class and tags the items (`item_attr()` in its own loop, or
 *   `tag_by_class()` over the buffered items); the settings are the container's stored `sgsMotion.stagger`.
 * - Core `core/post-template` and WooCommerce `woocommerce/product-template`: a `render_block` filter tags each direct
 *   `<li>` child of the rendered list, adds the scope class `sgs-m-<hash>` to the list and collects the rules. These
 *   core blocks are not SGS blocks and register no `supports.sgs.motion`, so they hold no `sgsMotion` of their own.
 *   Settings are read, first match wins, from: the template block's own `sgsMotion.stagger`, the enclosing query
 *   block's (`core/query`, `woocommerce/product-collection`) `sgsMotion.stagger` (captured on `render_block_data`),
 *   then the `sgs_motion_loop_stagger` filter. Columns come from the template's own grid `layout.columnCount`, or the
 *   enclosing product collection's `displayLayout.columns`, the same count at every device.
 *
 * The delay is the item's `--sgs-me-delay`; the item's entrance (the card's `data-sgs-me`) reads it. When the block's
 * own entrance (on its root or a part) has the `open` trigger, each item's rule also carries its close delay,
 * `--sgs-me-close-delay` (read by `assets/css/motion-triggers.css`), from `Sgs_Motion_Stagger::compute_close_delays` in
 * the stored `closeOrder` (`same` when absent). The core and WooCommerce templates hold no `sgsMotion` of their own, so
 * an `open` entrance never reaches their items and they write open delays only. The index is the
 * item's position among the items the server rendered in this response, so it restarts at the offset on every page.
 *
 * @package SGS\Blocks
 */

namespace SGS\Blocks\Motion;

use function SGS\Blocks\sgs_collect_css;
use function SGS\Blocks\sgs_is_frontend_render;

defined( 'ABSPATH' ) || exit;

/**
 * Class Sgs_Motion_Loop_Delays
 */
final class Sgs_Motion_Loop_Delays {

	/** The attribute that carries an item's loop index. */
	const ITEM_ATTR = 'data-sgs-loop-i';

	/** The key the context capture writes into a template block's parsed attributes. */
	const CONTEXT_KEY = 'sgsLoopContext';

	/** Template blocks the render filter handles. */
	const TEMPLATE_BLOCKS = array( 'core/post-template', 'woocommerce/product-template' );

	/** Most items one loop is given rules for. */
	const MAX_ITEMS = 200;

	/** Void elements, which never open a nesting level. */
	const VOID = array( 'AREA', 'BASE', 'BR', 'COL', 'EMBED', 'HR', 'IMG', 'INPUT', 'LINK', 'META', 'SOURCE', 'TRACK', 'WBR' );

	/**
	 * Hook the filters.
	 *
	 * @return void
	 */
	public static function register(): void {
		add_filter( 'render_block_data', array( self::class, 'capture_context' ), 20, 3 );
		add_filter( 'render_block', array( self::class, 'filter' ), 25, 2 );
	}

	/**
	 * Keep the enclosing query block's stagger settings and column count on a template block, which cannot see its
	 * parent when it renders.
	 *
	 * @param mixed $parsed_block Parsed block.
	 * @param mixed $source_block Unused.
	 * @param mixed $parent_block Parent `WP_Block`, or null.
	 * @return mixed The parsed block.
	 */
	public static function capture_context( $parsed_block, $source_block = null, $parent_block = null ) {
		unset( $source_block );
		if ( ! is_array( $parsed_block ) || ! in_array( $parsed_block['blockName'] ?? '', self::TEMPLATE_BLOCKS, true ) ) {
			return $parsed_block;
		}
		$parent = is_object( $parent_block ) && isset( $parent_block->parsed_block['attrs'] ) && is_array( $parent_block->parsed_block['attrs'] )
			? $parent_block->parsed_block['attrs']
			: array();
		$stored = array();
		if ( isset( $parent['sgsMotion']['stagger'] ) && is_array( $parent['sgsMotion']['stagger'] ) ) {
			$stored['stagger'] = $parent['sgsMotion']['stagger'];
		}
		if ( isset( $parent['displayLayout']['columns'] ) && is_numeric( $parent['displayLayout']['columns'] ) ) {
			$stored['columns'] = (int) $parent['displayLayout']['columns'];
		}
		if ( array() !== $stored ) {
			$parsed_block['attrs'][ self::CONTEXT_KEY ] = $stored;
		}
		return $parsed_block;
	}

	/**
	 * The `render_block` filter for the two template blocks.
	 *
	 * @param mixed $block_content Rendered HTML.
	 * @param mixed $block         Parsed block.
	 * @return mixed The HTML with item indexes, the scope class and (in the editor) the rules' `<style>`.
	 */
	public static function filter( $block_content, $block = null ) {
		if ( ! is_string( $block_content ) || '' === $block_content || ! is_array( $block ) ) {
			return $block_content;
		}
		$name = (string) ( $block['blockName'] ?? '' );
		if ( ! in_array( $name, self::TEMPLATE_BLOCKS, true ) ) {
			return $block_content;
		}
		$attrs   = isset( $block['attrs'] ) && is_array( $block['attrs'] ) ? $block['attrs'] : array();
		$context = isset( $attrs[ self::CONTEXT_KEY ] ) && is_array( $attrs[ self::CONTEXT_KEY ] ) ? $attrs[ self::CONTEXT_KEY ] : array();
		$stagger = self::stagger_settings( $name, $attrs, $context, $block );
		if ( null === $stagger ) {
			return $block_content;
		}
		$fallback = isset( $attrs['layout']['columnCount'] ) && is_numeric( $attrs['layout']['columnCount'] )
			&& 'grid' === ( $attrs['layout']['type'] ?? '' )
			? (int) $attrs['layout']['columnCount']
			: (int) ( $context['columns'] ?? 1 );

		$tagged = self::tag_children( $block_content );
		if ( 0 === $tagged['count'] ) {
			return $block_content;
		}
		$delays = self::device_delays( $stagger, $tagged['count'], self::columns_by_device( $name, $attrs, $fallback ) );
		if ( null === $delays ) {
			return $block_content;
		}
		$scope = 'sgs-m-' . substr( md5( $name . '|' . wp_json_encode( $delays ) ), 0, 10 );
		$html  = self::add_root_class( $tagged['html'], $scope );
		$tag   = self::collect( self::rules( '.' . $scope . ' > ', $delays ), $scope );
		return $tag . $html;
	}

	/**
	 * The rules and markup for a `sgs/post-grid` render.
	 *
	 * @param string              $uid        The block's per-instance class.
	 * @param array<string,mixed> $attributes The block's attributes.
	 * @param int                 $count      Cards on this page.
	 * @return string|null Null when the block has no stagger (do not tag cards); otherwise the `<style>` tag to echo
	 *                     before the cards (an empty string when the rules went to the front-end collector).
	 */
	public static function post_grid( string $uid, array $attributes, int $count ): ?string {
		$stagger = self::normalise( $attributes['sgsMotion']['stagger'] ?? null );
		if ( null === $stagger || $count < 1 || '' === $uid ) {
			return null;
		}
		$grid    = 'grid' === ( $attributes['layout'] ?? 'grid' );
		$columns = array();
		foreach ( array( 'desktop', 'tablet', 'mobile' ) as $device ) {
			$columns[ $device ] = $grid ? Sgs_Motion_Stagger::columns_for_block( 'sgs/post-grid', $attributes, $device ) : 1;
		}
		$delays = self::device_delays( $stagger, $count, $columns );
		if ( null === $delays ) {
			return null;
		}
		return self::collect( self::rules( '.' . $uid . ' .sgs-post-grid__card', $delays, true, self::close_delays( $attributes, $stagger, $delays ) ), $uid . '-loop' );
	}

	/**
	 * The rules for a block that renders its items from an attribute array (`sgs/gallery`, `sgs/card-grid`,
	 * `sgs/timeline`), whose items are not inner blocks, so the stagger helper cannot write a delay on each child.
	 * The block's stored `sgsMotion.stagger` settings are turned into one scoped rule per item by the same delay
	 * function, found by the item's `data-sgs-loop-i` index (never `:nth-child`). Columns per device come from the
	 * block's own grid-columns attribute (1 when it has none).
	 *
	 * @param string              $block_name    Block slug, for example `sgs/card-grid`.
	 * @param string              $uid           The block's per-instance class (on the block root).
	 * @param array<string,mixed> $attributes    The block's attributes.
	 * @param int                 $count         Items rendered.
	 * @param string              $item_selector Class selector of one item under the root, for example `.sgs-card-grid__item`.
	 * @return string|null Null when the block has no stagger (do not tag the items); otherwise the `<style>` tag to echo
	 *                     before the block (an empty string when the rules went to the front-end collector).
	 */
	public static function item_array( string $block_name, string $uid, array $attributes, int $count, string $item_selector ): ?string {
		$stagger = self::normalise( $attributes['sgsMotion']['stagger'] ?? null );
		if ( null === $stagger || $count < 1 || '' === $uid || 1 !== preg_match( '/^(?:\.[A-Za-z][A-Za-z0-9_-]*)+$/', $item_selector ) ) {
			return null;
		}
		$columns = array();
		foreach ( array( 'desktop', 'tablet', 'mobile' ) as $device ) {
			$columns[ $device ] = Sgs_Motion_Stagger::columns_for_block( $block_name, $attributes, $device );
		}
		$delays = self::device_delays( $stagger, $count, $columns );
		if ( null === $delays ) {
			return null;
		}
		return self::collect( self::rules( '.' . $uid . ' ' . $item_selector, $delays, true, self::close_delays( $attributes, $stagger, $delays ) ), $uid . '-loop' );
	}

	/**
	 * The index attribute for an item written in the block's own markup, with a leading space.
	 *
	 * @param int $index Position among the block's items, from 0.
	 * @return string ` data-sgs-loop-i="N"`.
	 */
	public static function item_attr( int $index ): string {
		return ' ' . self::ITEM_ATTR . '="' . max( 0, $index ) . '"';
	}

	/**
	 * Give every element that carries a class its position as the loop index, in document order.
	 *
	 * @param string $html       The rendered items.
	 * @param string $item_class One class name (no dot) every item carries.
	 * @return array{html:string,count:int} The HTML and how many items were tagged.
	 */
	public static function tag_by_class( string $html, string $item_class ): array {
		$processor = new \WP_HTML_Tag_Processor( $html );
		$count     = 0;
		while ( $processor->next_tag() ) {
			if ( $processor->has_class( $item_class ) ) {
				$processor->set_attribute( self::ITEM_ATTR, (string) $count );
				++$count;
			}
		}
		return array(
			'html'  => $processor->get_updated_html(),
			'count' => $count,
		);
	}

	/**
	 * Give an item its loop index: the attribute goes on the first tag of the item's HTML.
	 *
	 * @param string $html  The item's HTML (a card).
	 * @param int    $index Position in the loop, from 0.
	 * @return string The HTML with the index attribute.
	 */
	public static function tag_item( string $html, int $index ): string {
		$processor = new \WP_HTML_Tag_Processor( $html );
		if ( $processor->next_tag() ) {
			$processor->set_attribute( self::ITEM_ATTR, (string) $index );
		}
		return $processor->get_updated_html();
	}

	/**
	 * The stagger settings that apply to a template block.
	 *
	 * @param string              $name    Block name.
	 * @param array<string,mixed> $attrs   Parsed attributes.
	 * @param array<string,mixed> $context Captured parent context.
	 * @param array<string,mixed> $block   Parsed block.
	 * @return array<string,mixed>|null Settings, or null for none.
	 */
	private static function stagger_settings( string $name, array $attrs, array $context, array $block ): ?array {
		$found = self::normalise( $attrs['sgsMotion']['stagger'] ?? null );
		if ( null === $found ) {
			$found = self::normalise( $context['stagger'] ?? null );
		}
		if ( null === $found ) {
			$found = self::normalise( apply_filters( 'sgs_motion_loop_stagger', null, $name, $block ) );
		}
		return $found;
	}

	/**
	 * Accept a stagger settings array that is not switched off.
	 *
	 * @param mixed $stagger Raw value.
	 * @return array<string,mixed>|null Settings keys only, or null.
	 */
	private static function normalise( $stagger ): ?array {
		if ( ! is_array( $stagger ) || array() === $stagger || false === ( $stagger['apply'] ?? true ) ) {
			return null;
		}
		return array_intersect_key( $stagger, array_flip( array( 'offset', 'step', 'order', 'perRow', 'cap', 'closeOrder' ) ) );
	}

	/**
	 * Grid columns at each device for a template block.
	 *
	 * @param string              $name     Block name.
	 * @param array<string,mixed> $attrs    Attributes.
	 * @param int                 $fallback The template's stored single column count (1 when it has none).
	 * @return array<string,int>
	 */
	private static function columns_by_device( string $name, array $attrs, int $fallback ): array {
		$out = array();
		foreach ( array( 'desktop', 'tablet', 'mobile' ) as $device ) {
			$known          = Sgs_Motion_Stagger::columns_for_block( $name, $attrs, $device );
			$out[ $device ] = $known > 1 ? $known : max( 1, $fallback );
		}
		return $out;
	}

	/**
	 * Every item's delay at each device.
	 *
	 * @param array<string,mixed> $stagger  Normalised settings.
	 * @param int                 $count    Items.
	 * @param array<string,int>   $columns  Columns per device.
	 * @return array<string,int[]>|null Null when every delay is 0 (nothing to write).
	 */
	private static function device_delays( array $stagger, int $count, array $columns ): ?array {
		$count = min( $count, self::MAX_ITEMS );
		$out   = array();
		$any   = false;
		foreach ( array( 'desktop', 'tablet', 'mobile' ) as $device ) {
			$settings       = array_merge(
				$stagger,
				array(
					'count'   => $count,
					'columns' => $columns[ $device ] ?? 1,
				)
			);
			$out[ $device ] = Sgs_Motion_Stagger::compute_delays( $settings );
			$any            = $any || array() !== array_filter( $out[ $device ] );
		}
		return $any ? $out : null;
	}

	/**
	 * Each item's close delay at each device, when the block's own entrance plays on the `open` trigger.
	 *
	 * @param array<string,mixed> $attributes The block's attributes.
	 * @param array<string,mixed> $stagger    Normalised settings (`closeOrder` `same` or `reversed`).
	 * @param array<string,int[]> $delays     Open delays per device.
	 * @return array<string,int[]>|null Null when no entrance of the block has the `open` trigger.
	 */
	private static function close_delays( array $attributes, array $stagger, array $delays ): ?array {
		$elements = $attributes['sgsMotion']['elements'] ?? null;
		$open     = false;
		foreach ( is_array( $elements ) ? $elements : array() as $element ) {
			$open = $open || ( is_array( $element ) && 'open' === ( $element['entrance']['base']['trigger'] ?? '' ) );
		}
		if ( ! $open ) {
			return null;
		}
		$order = 'reversed' === ( $stagger['closeOrder'] ?? 'same' ) ? 'reversed' : 'same';
		$out   = array();
		foreach ( $delays as $device => $list ) {
			$out[ $device ] = Sgs_Motion_Stagger::compute_close_delays( $list, $order );
		}
		return $out;
	}

	/**
	 * One scoped rule per item, tablet and mobile only where a delay differs from the tier above.
	 *
	 * @param string                   $prefix   Selector up to the item (ends with a space or `>`).
	 * @param array<string,int[]>      $delays   Delays per device.
	 * @param bool                     $compound Whether the attribute joins the prefix without a combinator.
	 * @param array<string,int[]>|null $close    Close delays per device (`--sgs-me-close-delay`), or null for none.
	 * @return string CSS.
	 */
	private static function rules( string $prefix, array $delays, bool $compound = false, ?array $close = null ): string {
		$css   = '';
		$props = array( '--sgs-me-delay' => $delays );
		if ( null !== $close ) {
			$props['--sgs-me-close-delay'] = $close;
		}
		foreach ( array_keys( $delays['desktop'] ) as $i ) {
			$decls = array_fill_keys( Sgs_Motion_Emitter::TIERS, array() );
			foreach ( $props as $prop => $by_device ) {
				$effect                    = $by_device['desktop'][ $i ];
				$decls['desktop'][ $prop ] = $effect . 'ms';
				foreach ( array( 'tablet', 'mobile' ) as $device ) {
					$value = $by_device[ $device ][ $i ] ?? $effect;
					if ( $value !== $effect ) {
						$decls[ $device ][ $prop ] = $value . 'ms';
						$effect                    = $value;
					}
				}
			}
			$tail = '[' . self::ITEM_ATTR . '="' . (int) $i . '"]';
			$css .= Sgs_Motion_Emitter::rules( $prefix . ( $compound ? '' : '*' ) . $tail, $decls );
		}
		return $css;
	}

	/**
	 * Hand CSS to the front-end collector, or return an inline `<style>` tag where the collector never flushes.
	 *
	 * @param string $css CSS.
	 * @param string $id  Style tag id.
	 * @return string The `<style>` tag, or '' when collected.
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

	/**
	 * Add the index attribute to every direct `<li>` child of the root element of a rendered list.
	 *
	 * @param string $html Rendered list.
	 * @return array{html:string,count:int}
	 */
	private static function tag_children( string $html ): array {
		$processor = new \WP_HTML_Tag_Processor( $html );
		$depth     = 0;
		$count     = 0;
		while ( $processor->next_tag( array( 'tag_closers' => 'visit' ) ) ) {
			$tag = (string) $processor->get_tag();
			if ( $processor->is_tag_closer() ) {
				--$depth;
				continue;
			}
			if ( 1 === $depth && 'LI' === $tag && $count < self::MAX_ITEMS ) {
				$processor->set_attribute( self::ITEM_ATTR, (string) $count );
				++$count;
			}
			if ( ! in_array( $tag, self::VOID, true ) && ! $processor->has_self_closing_flag() ) {
				++$depth;
			}
		}
		return array(
			'html'  => $processor->get_updated_html(),
			'count' => $count,
		);
	}

	/**
	 * Put the scope class on the first element of the HTML.
	 *
	 * @param string $html  HTML.
	 * @param string $scope_class Class.
	 * @return string
	 */
	private static function add_root_class( string $html, string $scope_class ): string {
		$processor = new \WP_HTML_Tag_Processor( $html );
		if ( $processor->next_tag() ) {
			$processor->add_class( $scope_class );
		}
		return $processor->get_updated_html();
	}
}

Sgs_Motion_Loop_Delays::register();
