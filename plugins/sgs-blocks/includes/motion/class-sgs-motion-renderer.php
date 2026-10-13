<?php
/**
 * The motion renderer: one `render_block` filter for the motion support (Spec 38A §6.5; FR-38A-16, 2, 18, 23, 49).
 *
 * For a block whose registered type declares `supports.sgs.motion`, it:
 * 1. drops every key and value the schema does not allow (`Sgs_Motion_Document::sanitise`);
 * 2. drops the later of two refused layers per element, or clears a refused value such as a second perspective
 *    (`Sgs_Motion_Layer_Drops::resolve`), and an X or Y rotation owner on a block whose parent's pin-scrub animates its
 *    children's transform (the cross-element §10 rule);
 * 3. suppresses an element's entrance when one of its effects owns the scroll range (`sgs_effect_owns_scroll_transform`,
 *    and for the root also the legacy `fx` attribute through `sgs_fx_owns_scroll_transform`);
 * 4. resolves each target to its scoped selector (`Sgs_Motion_Targets`) and emits its per-device custom properties and
 *    `transition` through the shared collector (`Sgs_Motion_Emitter`, `sgs_collect_css`; in the editor preview, where
 *    the collector never flushes, the same CSS stays in a `<style>` tag inside the block as every SGS block's does);
 * 5. writes the data attributes on each target element with `WP_HTML_Tag_Processor` (`data-sgs-mh`, `data-sgs-mc`,
 *    `data-sgs-me`, `data-sgs-me-keyframes`), the scope class `sgs-m-<hash>` and `data-sgs-mroot` on the root, and
 *    appends at most two `<span class="sgs-motion-layer" aria-hidden="true">` per element for injected-slot owners.
 *
 * The LCP rule (§9): a `load` entrance in the page's first top-level section (the first top-level block of the main
 * content, filterable through `sgs_motion_is_first_section`) or on an `<img fetchpriority="high">` keeps its
 * from-opacity at 1 unless the entrance sets `allowLcpFade`.
 *
 * Hover groups: any block whose root carries a whole-block link (`sgsBlockLink` or `sgsBlockLinkAuto`, the blockLink
 * extension that also adds `.sgs-has-block-link`) gets `data-sgs-hover-group`. While a block whose hover layers use
 * `source: group` renders, `$GLOBALS['sgs_hover_group_active']` is true, so `sgs_hover_state_rules()` adds the group
 * alternative to that block's existing hover colour rules.
 *
 * One model per block: the legacy entrance injector skips a block that holds the new attribute.
 *
 * @package SGS\Blocks
 */

namespace SGS\Blocks\Motion;

use function SGS\Blocks\sgs_collect_css;
use function SGS\Blocks\sgs_effect_owns_scroll_transform;
use function SGS\Blocks\sgs_fx_owns_scroll_transform;
use function SGS\Blocks\sgs_is_frontend_render;

defined( 'ABSPATH' ) || exit;

/**
 * Class Sgs_Motion_Renderer
 */
final class Sgs_Motion_Renderer {

	const ATTR = 'sgsMotion';

	/**
	 * Open render frames, outermost first.
	 *
	 * @var array<int,array<string,mixed>>
	 */
	private static $stack = array();

	/**
	 * Whether the next top-level block of the main content is the first section.
	 *
	 * @var bool
	 */
	private static $first_pending = false;

	/**
	 * Whether the main content has started rendering.
	 *
	 * @var bool
	 */
	private static $content_seen = false;

	/**
	 * Asset consumers seen this request: `css`, `reveal`, `keyframes`, `scroll` (each true once an attribute needing it
	 * was printed). `Sgs_Motion_Assets` enqueues from this.
	 *
	 * @var array<string,bool>
	 */
	private static $used = array();

	/**
	 * Hook the filters.
	 *
	 * @return void
	 */
	public static function register(): void {
		add_filter( 'the_content', array( self::class, 'arm_first_section' ), 8 );
		add_filter( 'render_block_data', array( self::class, 'open_frame' ), 10, 3 );
		add_filter( 'render_block', array( self::class, 'render' ), 20, 2 );
		add_filter( 'render_block', array( self::class, 'close_frame' ), PHP_INT_MAX, 2 );
	}

	/**
	 * Clear the request state (tests and a second render pass).
	 *
	 * @return void
	 */
	public static function reset(): void {
		self::$stack                       = array();
		self::$first_pending               = false;
		self::$content_seen                = false;
		self::$used                        = array();
		$GLOBALS['sgs_hover_group_active'] = false;
	}

	/**
	 * The asset consumers seen so far this request.
	 *
	 * @return array<string,bool>
	 */
	public static function used_features(): array {
		return self::$used;
	}

	/**
	 * Record which assets the data attributes just printed need.
	 *
	 * @param array<string,mixed> $attrs  Attributes printed on a target or the root.
	 * @param bool                $layers Whether a motion layer span was injected.
	 * @return void
	 */
	private static function note_features( array $attrs, bool $layers ): void {
		$css = $layers;
		foreach ( array( 'data-sgs-mh', 'data-sgs-mc', 'data-sgs-me', 'data-sgs-hover-group', 'data-sgs-mroot' ) as $key ) {
			$css = $css || isset( $attrs[ $key ] );
		}
		if ( $css ) {
			self::$used['css'] = true;
		}
		if ( isset( $attrs['data-sgs-me'] ) && in_array( 'scroll', preg_split( '/\s+/', (string) $attrs['data-sgs-me'] ), true ) ) {
			self::$used['reveal'] = true;
		}
		if ( isset( $attrs['data-sgs-me-keyframes'] ) ) {
			self::$used['keyframes'] = true;
		}
		if ( isset( $attrs['data-sgs-scroll'] ) ) {
			self::$used['scroll'] = true;
		}
	}

	/**
	 * Arm the first-section rule when the main content starts.
	 *
	 * @param mixed $content Post content.
	 * @return mixed
	 */
	public static function arm_first_section( $content ) {
		$in_loop = function_exists( 'in_the_loop' ) && in_the_loop();
		if ( ! self::$content_seen && ( array() !== self::$stack || $in_loop ) ) {
			self::$content_seen  = true;
			self::$first_pending = true;
		}
		return $content;
	}

	/**
	 * Whether a block type declares the motion support.
	 *
	 * @param string $name Block name.
	 * @return bool
	 */
	private static function supports( string $name ): bool {
		if ( '' === $name || ! class_exists( '\WP_Block_Type_Registry' ) ) {
			return false;
		}
		$type = \WP_Block_Type_Registry::get_instance()->get_registered( $name );
		return is_object( $type ) && ! empty( $type->supports['sgs']['motion'] );
	}

	/**
	 * The block's sanitised document, or an empty array.
	 *
	 * @param array<string,mixed> $block Parsed block.
	 * @return array<string,mixed>
	 */
	private static function document( array $block ): array {
		$name = isset( $block['blockName'] ) && is_string( $block['blockName'] ) ? $block['blockName'] : '';
		$raw  = $block['attrs'][ self::ATTR ] ?? null;
		if ( empty( $raw ) || ! self::supports( $name ) ) {
			return array();
		}
		$doc = Sgs_Motion_Document::sanitise( $raw );
		return isset( $doc['elements'] ) && is_array( $doc['elements'] ) ? $doc : array();
	}

	/**
	 * Open a frame for a block about to render (render_block_data).
	 *
	 * @param mixed $parsed_block Parsed block.
	 * @param mixed $source_block Unfiltered parsed block.
	 * @param mixed $parent_block The parent WP_Block, or null for a top-level block.
	 * @return mixed The parsed block, unchanged.
	 */
	public static function open_frame( $parsed_block, $source_block = null, $parent_block = null ) {
		unset( $source_block );
		$block = is_array( $parsed_block ) ? $parsed_block : array();
		$top   = array() === self::$stack ? null : self::$stack[ count( self::$stack ) - 1 ];
		$doc   = self::document( $block );
		$first = null !== $top && ! empty( $top['first'] );
		if ( null === $parent_block && self::$first_pending ) {
			self::$first_pending = false;
			$first               = true;
		}
		$dropped = array();
		if ( null !== $parent_block && null !== $top && array() !== $top['doc'] && isset( $doc['elements']['root'] ) ) {
			foreach ( $top['doc']['elements'] as $parent_element ) {
				$refusal = Sgs_Motion_Layer_Drops::cross_element_refusal( (array) $parent_element, $doc['elements']['root'] );
				if ( null !== $refusal ) {
					$doc['elements']['root'] = self::drop_matching( $doc['elements']['root'], $refusal );
					$dropped[]               = $refusal;
				}
			}
		}
		$group = self::uses_source( $doc, 'group' );

		self::$stack[]                     = array(
			'name'    => (string) ( $block['blockName'] ?? '' ),
			'doc'     => $doc,
			'first'   => (bool) apply_filters( 'sgs_motion_is_first_section', $first, $block ),
			'group'   => $group,
			'dropped' => $dropped,
		);
		$GLOBALS['sgs_hover_group_active'] = $group;
		return $parsed_block;
	}

	/**
	 * Close the frame after the block rendered (render_block, last).
	 *
	 * @param mixed $block_content Rendered HTML.
	 * @param mixed $block         Parsed block.
	 * @return mixed
	 */
	public static function close_frame( $block_content, $block ) {
		unset( $block );
		array_pop( self::$stack );
		$top                               = array() === self::$stack ? null : self::$stack[ count( self::$stack ) - 1 ];
		$GLOBALS['sgs_hover_group_active'] = null !== $top && ! empty( $top['group'] );
		return $block_content;
	}

	/**
	 * Remove what a cross-element refusal names on a child: the matched X and Y values of a hover state or entrance (the
	 * rest of that layer stays), or a whole matched list layer.
	 *
	 * @param array<string,mixed>  $element The child root element.
	 * @param array<string,string> $refusal The refusal.
	 * @return array<string,mixed>
	 */
	private static function drop_matching( array $element, array $refusal ): array {
		$pairs = array_column( Sgs_Motion_Field_Types::schema()['x-sgs-refusals']['pairs'] ?? array(), null, 'id' );
		$side  = $pairs[ $refusal['id'] ]['a'] ?? array();
		foreach ( array_reverse( Sgs_Motion_Layers::element_layers( $element ) ) as $entry ) {
			if ( ! Sgs_Motion_Layers::matches( $entry, $side ) ) {
				continue;
			}
			if ( isset( $side['values'] ) && in_array( $entry['list'], Sgs_Motion_Layers::SINGLE, true ) ) {
				foreach ( $side['values'] as $value_path ) {
					$element = Sgs_Motion_Layer_Drops::remove_value( $element, $entry['path'], (string) $value_path );
				}
			} else {
				$element = Sgs_Motion_Layer_Drops::remove_path( $element, $entry['path'] );
			}
		}
		return $element;
	}

	/**
	 * Whether any hover layer in the document uses this source.
	 *
	 * @param array<string,mixed> $doc    Sanitised document.
	 * @param string              $source `root` or `group`.
	 * @return bool
	 */
	private static function uses_source( array $doc, string $source ): bool {
		foreach ( $doc['elements'] ?? array() as $element ) {
			$layers = array_merge( array( $element['hover']['state'] ?? array() ), $element['hover']['effects'] ?? array() );
			foreach ( $layers as $layer ) {
				if ( is_array( $layer ) && ( $layer['source'] ?? null ) === $source ) {
					return true;
				}
			}
		}
		return false;
	}

	/**
	 * Emit the block's motion (render_block, priority 20).
	 *
	 * @param mixed $block_content Rendered HTML.
	 * @param mixed $block         Parsed block.
	 * @return mixed
	 */
	public static function render( $block_content, $block ) {
		if ( ! is_string( $block_content ) || '' === $block_content || ! is_array( $block ) ) {
			return $block_content;
		}
		$name  = (string) ( $block['blockName'] ?? '' );
		$frame = array() === self::$stack ? null : self::$stack[ count( self::$stack ) - 1 ];
		if ( null === $frame || $frame['name'] !== $name ) {
			$frame = array(
				'doc'     => self::document( $block ),
				'first'   => false,
				'dropped' => array(),
			);
		}
		$attrs      = isset( $block['attrs'] ) && is_array( $block['attrs'] ) ? $block['attrs'] : array();
		$root_attrs = array();
		if ( ! empty( $attrs['sgsBlockLink'] ) || ! empty( $attrs['sgsBlockLinkAuto'] ) ) {
			$root_attrs['data-sgs-hover-group'] = '';
		}
		$doc = $frame['doc'];
		if ( array() === $doc ) {
			if ( array() !== $root_attrs ) {
				self::note_features( $root_attrs, false );
				Sgs_Motion_Assets::enqueue_used();
			}
			return array() === $root_attrs ? $block_content : Sgs_Motion_Markup::apply( $block_content, array(), $root_attrs, '' );
		}
		foreach ( $frame['dropped'] as $refusal ) {
			do_action( 'sgs_motion_layer_dropped', $name, 'root', $refusal );
		}

		$scope = 'sgs-m-' . substr( md5( $name . '|' . wp_json_encode( $doc ) . '|' . ( $frame['first'] ? '1' : '0' ) ), 0, 10 );
		if ( self::uses_source( $doc, 'root' ) ) {
			$root_attrs['data-sgs-mroot'] = '';
		}
		$legacy_scroll = sgs_fx_owns_scroll_transform( $block_content, $attrs );
		$plans         = array();
		$css           = '';
		foreach ( $doc['elements'] as $target => $element ) {
			$target   = (string) $target;
			$resolved = Sgs_Motion_Targets::resolve( $name, $scope, $target, (array) $element );
			if ( null === $resolved ) {
				continue;
			}
			$result = Sgs_Motion_Layer_Drops::resolve( (array) $element );
			foreach ( $result['dropped'] as $drop ) {
				do_action( 'sgs_motion_layer_dropped', $name, $target, $drop );
			}
			$element  = $result['element'];
			$suppress = $resolved['match']['root'] && $legacy_scroll;
			foreach ( $element['effects'] ?? array() as $layer ) {
				$suppress = $suppress || sgs_effect_owns_scroll_transform( (string) $layer['effect'] );
			}
			$lcp_image = Sgs_Motion_Markup::is_priority_image( $block_content, $resolved['match'] );
			$emitted   = Sgs_Motion_Emitter::emit(
				$element,
				$resolved['selector'],
				array(
					'lcp'               => $frame['first'] || $lcp_image,
					'suppress_entrance' => $suppress,
					'block'             => $name,
					'target'            => $target,
				)
			);
			$css      .= $emitted['css'];
			$layers    = Sgs_Motion_Layer_Drops::injected_layers( $element );
			self::note_features( $emitted['attrs'], array() !== $layers );
			$plans[]   = array(
				'match'  => $resolved['match'],
				'attrs'  => $emitted['attrs'],
				'layers' => $layers,
			);
		}
		self::note_features( $root_attrs, false );
		Sgs_Motion_Assets::enqueue_used();

		$css_tag = '';
		if ( '' !== $css ) {
			if ( sgs_is_frontend_render() ) {
				sgs_collect_css( $css );
			} else {
				$css_tag = '<style id="' . esc_attr( $scope ) . '">' . $css . '</style>';
			}
		}
		return Sgs_Motion_Markup::apply( $block_content, $plans, $root_attrs, $scope, $css_tag );
	}
}

Sgs_Motion_Renderer::register();
