<?php
/**
 * The motion renderer: one `render_block` filter for the motion support (Spec 38A §6.5; FR-38A-16, 2, 18, 23, 49).
 *
 * For a block whose registered type declares `supports.sgs.motion`, it:
 * 1. drops every key and value the schema does not allow (`Sgs_Motion_Document::sanitise`);
 * 2. drops the later of two refused layers per element, or clears a refused value such as a second perspective
 *    (`Sgs_Motion_Layer_Drops::resolve`), and an X or Y rotation owner on a block whose parent's pin-scrub animates its
 *    children's transform (the cross-element §10 rule), and the hover state and entrance of a target that shares its
 *    element with an earlier-declared target (`Sgs_Motion_Shared_Element`);
 * 3. suppresses an element's entrance when one of its effects owns the scroll range (`sgs_effect_owns_scroll_transform`,
 *    and for the root also the legacy `fx` attribute through `sgs_fx_owns_scroll_transform`);
 * 4. resolves each target to its scoped selector (`Sgs_Motion_Targets`) and emits its per-device custom properties and
 *    `transition` through the shared collector (`Sgs_Motion_Emitter`, `sgs_collect_css`; in the editor preview, where
 *    the collector never flushes, the same CSS stays in a `<style>` tag inside the block as every SGS block's does);
 * 5. writes the data attributes on each target element with `WP_HTML_Tag_Processor` (`data-sgs-mh`, `data-sgs-mc`,
 *    `data-sgs-me`, `data-sgs-me-keyframes`), the scope class `sgs-m-<hash>` and `data-sgs-mroot` on the root, and
 *    appends at most two `<span class="sgs-motion-layer" aria-hidden="true">` per element for injected-slot owners;
 * 6. writes each element's effect layers as the `data-sgs-fx` runtime grammar (`Sgs_Motion_Fx_Emitter`) on the same
 *    target element. Every element that resolves to the root (the root itself and an `isWrapper` part) adds its
 *    effects to the root's own attribute set, so two such elements join their `data-sgs-fx` lists instead of the
 *    later one overwriting the earlier. Effect value fields that name a custom property are written into the same
 *    scoped CSS, per device tier (`Sgs_Motion_Effect_Properties`).
 *
 * The start floor (§9): a `load` or `scroll` entrance on a block above the fold (`Sgs_Motion_Fold::is_above_fold`: one of the
 * first `Sgs_Motion_Fold::FOLD_SECTIONS` top-level content sections, filterable through `sgs_motion_is_first_section`)
 * has the start values that would hide it completely raised to the nearest visible ones unless the entrance sets
 * `allowLcpFade`. When the main content is one top-level block with `tagName` `main`, that wrapper is transparent: its
 * child blocks are the sections, and the wrapper's own entrance is not floored.
 *
 * Hover groups: any block whose root carries a whole-block link (`sgsBlockLink`, `sgsBlockLinkSource` or `sgsBlockLinkAuto`, the blockLink
 * extension that also adds `.sgs-has-block-link`) or a container set to `hoverAsCard` gets `data-sgs-hover-group`. While a block whose hover layers use
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
	 * Whether the main content is armed: its top-level blocks are being counted into sections.
	 *
	 * @var bool
	 */
	private static $armed = false;

	/**
	 * The parsed main content, the tree `Sgs_Motion_Fold::is_above_fold` reads.
	 *
	 * @var array<int,mixed>
	 */
	private static $tree = array();

	/**
	 * Whether top-level blocks are matched to the armed tree by what they are (name and attributes) rather than by the
	 * order they open in: true for a tree armed from the block template, because the theme renders the header, footer
	 * and drawers itself, as parentless top-level blocks that are not in the template's tree.
	 *
	 * @var bool
	 */
	private static $by_identity = false;

	/** The attributes that identify a template block when matching it to the armed tree. */
	const IDENTITY_ATTRS = array( 'anchor', 'className', 'sgsMotion', 'tagName' );

	/**
	 * The tree indexes of the sections already matched by identity.
	 *
	 * @var array<int,int>
	 */
	private static $matched = array();

	/**
	 * How many content sections count as above the fold on the page being rendered (`Sgs_Fold_Scan::section_count`).
	 *
	 * @var int
	 */
	private static $fold_sections = Sgs_Motion_Fold::FOLD_SECTIONS;

	/**
	 * How many content sections (top-level blocks that are not template parts) have opened since the content was armed.
	 *
	 * @var int
	 */
	private static $sections = 0;

	/**
	 * Whether the main content is one `main` wrapper: its child blocks are then the sections.
	 *
	 * @var bool
	 */
	private static $lone_main = false;

	/**
	 * How many child blocks of the transparent `main` wrapper have opened.
	 *
	 * @var int
	 */
	private static $main_children = 0;

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
		add_filter( 'template_include', array( self::class, 'arm_from_template' ), 30 );
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
		self::$armed                       = false;
		self::$tree                        = array();
		self::$sections                    = 0;
		self::$by_identity                 = false;
		self::$matched                     = array();
		self::$fold_sections               = Sgs_Motion_Fold::FOLD_SECTIONS;
		self::$lone_main                   = false;
		self::$main_children               = 0;
		self::$content_seen                = false;
		self::$used                        = array();
		Sgs_Motion_Reveal_Default::reset();
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
	 * Whether the block rendering now sits in the page's first content section (the reveal default and the image loader
	 * skip it).
	 *
	 * @return bool
	 */
	public static function in_first_section(): bool {
		return array() !== self::$stack && ! empty( self::$stack[ count( self::$stack ) - 1 ]['first'] );
	}

	/**
	 * Whether the block rendering now sits above the fold (`Sgs_Motion_Fold`, section 9): read by code that emits
	 * entrances from inside a block's render callback (`Sgs_Motion_Loop_Inherit`).
	 *
	 * @return bool
	 */
	public static function in_above_fold(): bool {
		return array() !== self::$stack && ! empty( self::$stack[ count( self::$stack ) - 1 ]['fold'] );
	}

	/**
	 * Whether the renderer is armed on this request's main content tree: read by the media loading resolver
	 * (`SGS_Media_Priority`), which treats an unarmed render as having no page around it.
	 *
	 * @return bool
	 */
	public static function is_armed(): bool {
		return self::$armed;
	}

	/**
	 * Record and enqueue the assets that attributes written outside the renderer's own pass need (the items'
	 * inherited entrance, `Sgs_Motion_Loop_Inherit`).
	 *
	 * @param array<string,string> $attrs Attributes written on an element.
	 * @return void
	 */
	public static function note_used( array $attrs ): void {
		self::note_features( $attrs, false );
		Sgs_Motion_Assets::enqueue_used();
	}

	/**
	 * Record that the block rendering now handed its container entrance to its items (`Sgs_Motion_Loop_Inherit`, a
	 * delegated child block through `Sgs_Motion_Delegate`), so `render()` leaves that target's entrance out. Called from
	 * inside the block's render callback, where the block's own frame is the open one; any other block is ignored.
	 *
	 * @param string $block_name The block that handed its entrance over.
	 * @param string $target     The container target whose entrance moved (`root` or a wrapper part).
	 * @return void
	 */
	public static function note_moved( string $block_name, string $target ): void {
		$top = count( self::$stack ) - 1;
		if ( $top >= 0 && self::$stack[ $top ]['name'] === $block_name ) {
			self::$stack[ $top ]['moved'] = $target;
		}
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
		foreach ( array( 'data-sgs-mh', 'data-sgs-mh-move', 'data-sgs-mh-scale', 'data-sgs-mh-rotate', 'data-sgs-mc', 'data-sgs-me', 'data-sgs-hover-group', 'data-sgs-mroot', 'data-sgs-mitem' ) as $key ) {
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
	 * Arm the above-the-fold rule when the main content starts: the content is parsed once into the tree that
	 * `Sgs_Motion_Fold::is_above_fold` reads.
	 *
	 * @param mixed $content Post content.
	 * @return mixed
	 */
	public static function arm_first_section( $content ) {
		$in_loop = function_exists( 'in_the_loop' ) && in_the_loop();
		if ( ! self::$content_seen && ( array() !== self::$stack || $in_loop ) ) {
			$tree = is_string( $content ) && '' !== $content && function_exists( 'parse_blocks' ) ? parse_blocks( $content ) : array();
			if ( array() === Sgs_Motion_Fold::section_indexes( $tree ) ) {
				// No parseable blocks: there are no content sections, so nothing on the page is above the fold.
				self::$content_seen = true;
				return $content;
			}
			self::arm( $tree, false );
		}
		return $content;
	}

	/**
	 * Arm the above-the-fold rule from the block template when the page's main content comes from it: a template whose
	 * sections are not the post content (the shop and other archives, search, a product page, whose post content sits
	 * inside a tab) never runs `the_content` for those sections, so its own blocks are the tree. Template parts stay out of
	 * the count (`Sgs_Motion_Fold`). A template whose own section is the `core/post-content` block is left to
	 * `arm_first_section`. A `core/pattern` block is not expanded (`resolve_pattern_blocks` would turn its blocks into
	 * sections, but they render inside the pattern block's own frame, where they are not counted): the pattern block is
	 * one section and everything inside it follows its fold mark.
	 *
	 * @param mixed $template The template path (`template_include`), returned unchanged.
	 * @return mixed
	 */
	public static function arm_from_template( $template ) {
		$content = $GLOBALS['_wp_current_template_content'] ?? '';
		if ( self::$content_seen || ! is_string( $content ) || '' === $content || ! function_exists( 'parse_blocks' ) ) {
			return $template;
		}
		$tree = parse_blocks( $content );
		if ( array() !== Sgs_Motion_Fold::section_indexes( $tree ) && ! self::post_content_is_a_section( $tree ) ) {
			self::arm( $tree, true );
		}
		return $template;
	}

	/**
	 * Whether one of the template's own sections is the `core/post-content` block: the page's body is then the post's
	 * content, and its sections are counted from that content (`arm_first_section`). Post content nested deeper (a product
	 * description inside a tab below the buy box) is part of a template section and does not defer.
	 *
	 * @param array<int,mixed> $tree Parsed template blocks.
	 * @return bool
	 */
	private static function post_content_is_a_section( array $tree ): bool {
		$sections = Sgs_Motion_Fold::section_indexes( $tree );
		$blocks   = $tree;
		if ( Sgs_Motion_Fold::is_lone_main( $tree ) ) {
			$blocks   = (array) ( $tree[ $sections[0] ]['innerBlocks'] ?? array() );
			$sections = Sgs_Motion_Fold::section_indexes( $blocks );
		}
		foreach ( $sections as $index ) {
			if ( 'core/post-content' === ( $blocks[ $index ]['blockName'] ?? null ) ) {
				return true;
			}
		}
		return false;
	}

	/**
	 * Start counting sections over a parsed tree.
	 *
	 * @param array<int,mixed> $tree        Parsed blocks of the main content.
	 * @param bool             $by_identity Whether top-level blocks are matched to the tree by name and attributes.
	 * @return void
	 */
	private static function arm( array $tree, bool $by_identity ): void {
		self::$content_seen  = true;
		self::$armed         = true;
		self::$by_identity   = $by_identity;
		self::$matched       = array();
		self::$tree          = $tree;
		self::$lone_main     = Sgs_Motion_Fold::is_lone_main( $tree );
		self::$fold_sections = self::measured_sections();
	}

	/**
	 * The section count of the post whose content is being rendered: the count the editor measured for it, else
	 * `Sgs_Motion_Fold::FOLD_SECTIONS`. The post is the one in the loop (`get_the_ID()`, the post `the_content` is
	 * filtering), falling back to the queried object.
	 *
	 * @return int
	 */
	private static function measured_sections(): int {
		$post_id = function_exists( 'get_the_ID' ) ? (int) get_the_ID() : 0;
		if ( $post_id <= 0 && function_exists( 'get_queried_object_id' ) ) {
			$post_id = (int) get_queried_object_id();
		}
		if ( $post_id <= 0 || ! class_exists( __NAMESPACE__ . '\Sgs_Fold_Scan' ) || ! function_exists( 'get_post_meta' ) ) {
			return Sgs_Motion_Fold::FOLD_SECTIONS;
		}
		return Sgs_Fold_Scan::section_count( $post_id );
	}

	/**
	 * The position in the parsed content of the block that opens now, as a top-level block or a child of the transparent
	 * `main` wrapper: the order it opens in among the content's section candidates, mapped to its index in the tree.
	 *
	 * @param array<string,mixed> $block Parsed block.
	 * @param bool                $child Whether it is a child of the transparent `main` wrapper.
	 * @return array<int,int>|null Null for a block that is not a section candidate (a template part, a freeform entry).
	 */
	private static function opens_at( array $block, bool $child ): ?array {
		if ( ! Sgs_Motion_Fold::is_section_name( $block['blockName'] ?? null ) ) {
			return null;
		}
		$sections = Sgs_Motion_Fold::section_indexes( self::$tree );
		if ( ! $child && self::$by_identity ) {
			$index = self::match_in_tree( $block, $sections );
			return null === $index ? null : array( $index );
		}
		if ( ! $child ) {
			$ordinal = self::$sections++;
			return isset( $sections[ $ordinal ] ) ? array( $sections[ $ordinal ] ) : null;
		}
		$children = Sgs_Motion_Fold::section_indexes( (array) ( self::$tree[ $sections[0] ]['innerBlocks'] ?? array() ) );
		$ordinal  = self::$main_children++;
		return isset( $children[ $ordinal ] ) ? array( $sections[0], $children[ $ordinal ] ) : null;
	}

	/**
	 * Whether this top-level block is the transparent `main` wrapper of a lone-main page: by identity for a template
	 * tree, else the first section to open when it is a `main`.
	 *
	 * @param array<string,mixed> $block Parsed block.
	 * @return bool
	 */
	private static function is_the_lone_main( array $block ): bool {
		if ( ! self::is_main_wrapper( $block ) ) {
			return false;
		}
		if ( self::$by_identity ) {
			$sections = Sgs_Motion_Fold::section_indexes( self::$tree );
			$index    = self::match_in_tree( $block, $sections );
			return null !== $index;
		}
		if ( 0 !== self::$sections ) {
			return false;
		}
		++self::$sections;
		return true;
	}

	/**
	 * The tree index of the not yet matched section that this block is, by name and attributes; null for a block that is
	 * not in the tree (the header, footer or a drawer the theme renders itself).
	 *
	 * @param array<string,mixed> $block    Parsed block.
	 * @param array<int,int>      $sections The tree's section indexes.
	 * @return int|null
	 */
	private static function match_in_tree( array $block, array $sections ): ?int {
		$same_name = array();
		foreach ( $sections as $index ) {
			if ( in_array( $index, self::$matched, true ) ) {
				continue;
			}
			$candidate = (array) self::$tree[ $index ];
			if ( ( $candidate['blockName'] ?? null ) !== ( $block['blockName'] ?? null ) ) {
				continue;
			}
			$same_name[] = $index;
			if ( self::stable_attrs( (array) ( $candidate['attrs'] ?? array() ) ) === self::stable_attrs( (array) ( $block['attrs'] ?? array() ) ) ) {
				self::$matched[] = $index;
				return $index;
			}
		}
		// A `render_block_data` filter changed even the stable attributes: the one candidate of this name left is it.
		if ( 1 === count( $same_name ) ) {
			self::$matched[] = $same_name[0];
			return $same_name[0];
		}
		return null;
	}

	/**
	 * The attributes of a block that identify it, encoded for comparison: the ones a render-time filter does not change.
	 *
	 * @param array<string,mixed> $attrs Block attributes.
	 * @return string
	 */
	private static function stable_attrs( array $attrs ): string {
		$stable = array();
		foreach ( self::IDENTITY_ATTRS as $key ) {
			$stable[ $key ] = $attrs[ $key ] ?? null;
		}
		return (string) wp_json_encode( $stable );
	}

	/**
	 * Whether a parsed block is a `main` wrapper.
	 *
	 * @param array<string,mixed> $block Parsed block.
	 * @return bool
	 */
	private static function is_main_wrapper( array $block ): bool {
		return Sgs_Motion_Fold::is_main_wrapper( $block );
	}

	/**
	 * Whether a block type declares the motion support.
	 *
	 * @param string $name Block name.
	 * @return bool
	 */
	public static function supports( string $name ): bool {
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
		$fold  = null !== $top && ! empty( $top['fold'] );
		$transparent = false;
		$at          = null;
		$inside_section = null !== $top && ! empty( $top['section'] );
		if ( null === $parent_block && self::$armed && ! $inside_section ) {
			if ( self::$lone_main && self::is_the_lone_main( $block ) ) {
				$transparent = true;
				$first       = false;
				$fold        = false;
			} else {
				$at = self::opens_at( $block, false ) ?? array();
			}
		} elseif ( null !== $parent_block && self::$armed && null !== $top && ! empty( $top['transparent'] ) ) {
			$at = self::opens_at( $block, true ) ?? array();
		}
		if ( null !== $at ) {
			$first = 0 === Sgs_Motion_Fold::section_position( self::$tree, $at );
			$fold  = Sgs_Motion_Fold::is_above_fold( self::$tree, $at, self::$fold_sections );
		}
		$first   = (bool) apply_filters( 'sgs_motion_is_first_section', $first, $block );
		$fold    = $fold || $first;
		$reveal  = Sgs_Motion_Reveal_Default::resolve( $doc, $block, self::$stack, $first, self::$content_seen, $transparent );
		$doc     = $reveal['doc'];
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
			'name'        => (string) ( $block['blockName'] ?? '' ),
			'doc'         => $doc,
			'first'       => $first,
			'fold'        => $fold,
			'section'     => $inside_section || $transparent || null !== $at,
			'transparent' => $transparent,
			'group'       => $group,
			'dropped'     => $dropped,
			'parent'      => is_object( $parent_block ) && isset( $parent_block->name ) && is_string( $parent_block->name ) ? $parent_block->name : '',
		) + $reveal['frame'];
		$GLOBALS['sgs_hover_group_active'] = $group;
		return $parsed_block;
	}

	/**
	 * Whether the block's root may carry its perspective on its parent: the block is placed directly inside another SGS
	 * block, so the renderer prints the parent's markup and writes the parent's `perspective` property from the child's
	 * scoped rule (`:has(> .scope)`). A block at the top level, or inside a core or third-party block, is not.
	 *
	 * @param string              $name  Block name.
	 * @param array<string,mixed> $frame The block's frame.
	 * @return bool
	 */
	private static function parent_owned( string $name, array $frame ): bool {
		unset( $name );
		return 0 === strpos( (string) ( $frame['parent'] ?? '' ), 'sgs/' );
	}

	/**
	 * Register the perspective this block's root asks its parent to carry on the parent's frame, or, when a block already
	 * registered a different one, clear the request (the block keeps its own perspective) and report the refusal. Two
	 * owners on one parent never disagree (Spec 38A FR-38A-41).
	 *
	 * @param array{element:array<string,mixed>,dropped:array<int,array<string,string>>} $result The resolved root element.
	 * @return array{element:array<string,mixed>,dropped:array<int,array<string,string>>}
	 */
	private static function claim_parent_perspective( array $result ): array {
		$wanted = Sgs_Motion_Rotation::parent_signature( $result['element'] );
		$index  = count( self::$stack ) - 2;
		if ( null === $wanted || $index < 0 ) {
			return $result;
		}
		$held = self::$stack[ $index ]['persp_owner'] ?? null;
		if ( null === $held ) {
			self::$stack[ $index ]['persp_owner'] = $wanted;
			return $result;
		}
		if ( $held === $wanted ) {
			return $result;
		}
		$rule                = array_column( Sgs_Motion_Field_Types::schema()['x-sgs-refusals']['crossElement'] ?? array(), null, 'id' )['perspective-parent-owners'] ?? array();
		$result['element']   = Sgs_Motion_Layer_Drops::remove_value( $result['element'], 'hover.state', Sgs_Motion_Rotation::PERSPECTIVE_ON );
		$result['dropped'][] = array(
			'path' => 'hover.state.values.' . Sgs_Motion_Rotation::PERSPECTIVE_ON,
			'id'   => 'perspective-parent-owners',
			'text' => (string) ( $rule['text'] ?? '' ),
		);
		return $result;
	}

	/**
	 * Close the frame after the block rendered (render_block, last). `render_block` also fires for blocks that never
	 * went through `render_block_data` (a pre-rendered template part, WooCommerce's product template announcing a
	 * synthetic `core/null` block once per product), so a block closes the topmost frame opened for its own block name,
	 * together with any frame left open above it (a block that never reached `render_block`), and a block with no open
	 * frame closes nothing: popping for it would take a frame that is not its own and strip the enclosing blocks of their
	 * fold mark.
	 *
	 * @param mixed $block_content Rendered HTML.
	 * @param mixed $block         Parsed block.
	 * @return mixed
	 */
	public static function close_frame( $block_content, $block ) {
		$name  = is_array( $block ) ? (string) ( $block['blockName'] ?? '' ) : '';
		$depth = self::topmost_frame( $name );
		if ( null === $depth ) {
			return $block_content;
		}
		// A frame above it belongs to a block that never reached `render_block`: it leaked, so it goes too.
		array_splice( self::$stack, $depth );
		$top                               = array() === self::$stack ? null : self::$stack[ count( self::$stack ) - 1 ];
		$GLOBALS['sgs_hover_group_active'] = null !== $top && ! empty( $top['group'] );
		return $block_content;
	}

	/**
	 * The stack position of the topmost frame opened for a block of this name, or null when none is open.
	 *
	 * @param string $name Block name.
	 * @return int|null
	 */
	private static function topmost_frame( string $name ): ?int {
		for ( $i = count( self::$stack ) - 1; $i >= 0; $i-- ) {
			if ( self::$stack[ $i ]['name'] === $name ) {
				return $i;
			}
		}
		return null;
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
	 * Whether a block's stored motion has a hover layer driven by its hover group (`source: group`): the opt-in a block's
	 * own stylesheet reads to follow its card's hover with the colours its CSS paints (the icon's `.sgs-icon--follows-group`).
	 *
	 * @param array<string,mixed> $attributes The block's attributes.
	 * @return bool
	 */
	public static function block_uses_group( array $attributes ): bool {
		$raw = $attributes[ self::ATTR ] ?? null;
		return ! empty( $raw ) && self::uses_source( Sgs_Motion_Document::sanitise( $raw ), 'group' );
	}

	/**
	 * Whether any hover layer in the document uses this source.
	 *
	 * @param array<string,mixed> $doc    Sanitised document.
	 * @param string              $source `root`, `group` or `item`.
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
	 * The container target whose entrance `stagger.apply` moved to the children, or null. A block holding inner blocks
	 * moves it whenever `apply` is on and it has an entrance (the editor wrote it on each child,
	 * `stagger-write.js::childMotionWithDelay`); a block that prints its items itself, or prints them through its
	 * template inner block in a delegating mode (`Sgs_Motion_Delegate`), moves it only when this render handed it over
	 * (`note_moved`), so a container whose items keep their own entrance, or that printed no items, keeps its own.
	 *
	 * @param array<string,mixed> $block Parsed block.
	 * @param array<string,mixed> $frame The block's render frame.
	 * @return string|null
	 */
	private static function moved( array $block, array $frame ): ?string {
		$name = (string) ( $block['blockName'] ?? '' );
		if ( ! empty( $block['innerBlocks'] ) && null === Sgs_Motion_Delegate::active( $name, is_array( $block['attrs'] ?? null ) ? $block['attrs'] : array() ) ) {
			return Sgs_Motion_Loop_Inherit::moved_target( (string) ( $block['blockName'] ?? '' ), $block['attrs'][ self::ATTR ] ?? null );
		}
		return isset( $frame['moved'] ) && is_string( $frame['moved'] ) ? $frame['moved'] : null;
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
				'fold'    => false,
				'dropped' => array(),
			);
		}
		$attrs      = isset( $block['attrs'] ) && is_array( $block['attrs'] ) ? $block['attrs'] : array();
		$root_attrs = array();
		if ( ! empty( $attrs['sgsBlockLink'] ) || ! empty( $attrs['sgsBlockLinkSource'] ) || ! empty( $attrs['sgsBlockLinkAuto'] ) || ! empty( $attrs['hoverAsCard'] ) ) {
			$root_attrs['data-sgs-hover-group'] = '';
		}
		// `sgsFocusRests`: the block's hover state and hover effects play on pointer hover only, so every element the
		// renderer marks carries `data-sgs-focus-rests`, which the focus arm of `assets/css/motion.css` excludes.
		$focus_rests = ! empty( $attrs['sgsFocusRests'] );
		$doc         = $frame['doc'];
		if ( array() === $doc ) {
			if ( $focus_rests && array() !== $root_attrs ) {
				$root_attrs['data-sgs-focus-rests'] = '';
			}
			if ( array() !== $root_attrs ) {
				self::note_features( $root_attrs, false );
				Sgs_Motion_Assets::enqueue_used();
			}
			return array() === $root_attrs ? $block_content : Sgs_Motion_Markup::apply( $block_content, array(), $root_attrs, '' );
		}
		foreach ( $frame['dropped'] as $refusal ) {
			do_action( 'sgs_motion_layer_dropped', $name, 'root', $refusal );
		}

		$in_item  = Sgs_Motion_Loop_Delays::in_template_item();
		$scope    = 'sgs-m-' . substr( md5( $name . '|' . wp_json_encode( $doc ) . '|' . ( $frame['first'] ? '1' : '0' ) . ( $in_item ? '|item' : '' ) ), 0, 10 );
		if ( self::uses_source( $doc, 'root' ) ) {
			$root_attrs['data-sgs-mroot'] = '';
		}
		$legacy_scroll = sgs_fx_owns_scroll_transform( $block_content, $attrs );
		$plans         = array();
		$css           = '';
		$losers        = Sgs_Motion_Shared_Element::losers( $block_content, $name, $scope, $doc['elements'] );
		$moved         = self::moved( $block, $frame );
		$parent_owned  = self::parent_owned( $name, $frame );
		foreach ( $doc['elements'] as $target => $element ) {
			$target   = (string) $target;
			$resolved = Sgs_Motion_Targets::resolve( $name, $scope, $target, (array) $element, $block_content );
			if ( null === $resolved ) {
				continue;
			}
			$owned  = $parent_owned && 'root' === $target;
			$fitted = Sgs_Motion_Layer_Drops::drop_level_misfits( (array) $element, Sgs_Motion_Layer_Drops::levels_for_target( $name, $target ) );
			$result = Sgs_Motion_Layer_Drops::resolve( $fitted['element'], array( 'parent-owned' => $owned ) );
			if ( $owned ) {
				$result = self::claim_parent_perspective( $result );
			}
			$result['dropped'] = array_merge( $fitted['dropped'], $result['dropped'] );
			foreach ( $result['dropped'] as $drop ) {
				do_action( 'sgs_motion_layer_dropped', $name, $target, $drop );
			}
			$element = $result['element'];
			if ( isset( $losers[ $target ] ) ) {
				$element = Sgs_Motion_Shared_Element::strip( $element, $name, $target, $losers[ $target ] );
			}
			$suppress = ( $resolved['match']['root'] && $legacy_scroll ) || $target === $moved;
			foreach ( $element['effects'] ?? array() as $layer ) {
				$suppress = $suppress || sgs_effect_owns_scroll_transform( (string) $layer['effect'] );
			}
			$emitted   = Sgs_Motion_Emitter::emit(
				$element,
				$resolved['selector'],
				array(
					'above_fold'        => $frame['fold'],
					'suppress_entrance' => $suppress,
					'no_transition'     => isset( $losers[ $target ] ),
					'block'             => $name,
					'target'            => $target,
					'attributes'        => $attrs,
					'parent_owned'      => $owned,
					'match'             => $resolved['match'],
					'in_item'           => $in_item,
				)
			);
			$css      .= $emitted['css'];
			$css      .= Sgs_Motion_Effect_Properties::css( $element, $resolved['selector'] );
			$fx_attrs  = Sgs_Motion_Fx_Emitter::attrs( $element, $name, $target );
			if ( $resolved['match']['root'] ) {
				$root_attrs = Sgs_Motion_Fx_Emitter::merge( $root_attrs, $fx_attrs, $name, $target );
			} else {
				$emitted['attrs'] = Sgs_Motion_Fx_Emitter::merge( $emitted['attrs'], $fx_attrs, $name, $target );
			}
			$layers = Sgs_Motion_Layer_Drops::injected_layers( $element );
			self::note_features( $emitted['attrs'], array() !== $layers );
			$plans[] = array(
				'match'  => $resolved['match'],
				'attrs'  => $emitted['attrs'],
				'layers' => $layers,
			);
		}
		if ( self::uses_source( $doc, 'item' ) ) {
			foreach ( Sgs_Motion_Targets::item_matches( $name ) as $item ) {
				if ( $item['root'] ) {
					$root_attrs['data-sgs-mitem'] = '';
					continue;
				}
				$plans[] = array(
					'match'  => array(
						'root'    => false,
						'classes' => $item['classes'],
						'tag'     => null,
						'child'   => false,
					),
					'attrs'  => array( 'data-sgs-mitem' => '' ),
					'layers' => array(),
				);
				self::note_features( array( 'data-sgs-mitem' => '' ), false );
			}
		}
		if ( $focus_rests ) {
			$root_attrs['data-sgs-focus-rests'] = '';
			foreach ( $plans as $index => $plan ) {
				$plans[ $index ]['attrs']['data-sgs-focus-rests'] = '';
			}
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
