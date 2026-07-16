<?php
/**
 * Block bindings support — extends `metadata.bindings` resolution to SGS blocks.
 *
 * WP core only resolves `metadata.bindings` for a hardcoded core-block allowlist.
 * Verified live on WP 7.0.1 (sandybrown canary), wp-includes/block-bindings.php
 * lines 141-187 (get_block_bindings_supported_attributes()):
 *
 *   $block_bindings_supported_attributes = array(
 *       'core/paragraph'          => array( 'content' ),
 *       'core/heading'            => array( 'content' ),
 *       'core/image'              => array( 'id', 'url', 'title', 'alt', 'caption' ),
 *       'core/button'             => array( 'url', 'text', 'linkTarget', 'rel' ),
 *       'core/post-date'          => array( 'datetime' ),
 *       'core/navigation-link'    => array( 'url' ),
 *       'core/navigation-submenu' => array( 'url' ),
 *   );
 *
 * Any block not in that map resolves to an empty $supported_block_attributes
 * array, and class-wp-block.php:279 process_block_bindings() returns early
 * when the list is empty for the block's attribute — the binding never runs,
 * the block silently renders its raw placeholder attribute value instead of
 * the live bound value.
 *
 * Since WP 6.9 the same function applies a per-block-type dynamic filter,
 * `block_bindings_supported_attributes_{$block_type}` (block-bindings.php
 * line 181-184), called with $block_type as a STRING (the block name, e.g.
 * 'sgs/text') and $supported_block_attributes as that block's current
 * (empty, for any non-core block) attribute list. Hooking this per block
 * name is the smallest legitimate extension point — no core patch, no
 * generic filter needing an in-callback block-name switch.
 *
 * Consequence this unblocks: sites/*.theme patterns bind `sgs/site-info`
 * (contact-form.php: 4x core/paragraph 'content' → email/phone/address/
 * opening_hours; contact-minimal.php: 2x core/button 'url' → email/phone).
 * Those patterns cannot be migrated from core/paragraph + core/button to
 * sgs/text + sgs/heading + sgs/button while the binding would render inert.
 *
 * @package SGS\Blocks
 * @since   0.1.9
 */

namespace SGS\Blocks;

defined( 'ABSPATH' ) || exit;

/**
 * Registers SGS blocks as supported binding targets for `metadata.bindings`.
 */
final class Sgs_Block_Bindings_Support {

	/**
	 * Attribute names, per SGS block, resolvable via a block binding.
	 *
	 * Names are verified directly against each block's own block.json
	 * (src/blocks/<slug>/block.json) — not assumed by analogy with the core
	 * blocks they replace:
	 *   - sgs/text    → the content attr is `text`   (NOT `content`).
	 *   - sgs/heading → the content attr is `content` (matches core/heading).
	 *   - sgs/button  → the label attr is `label`     (NOT `text`, unlike
	 *                    core/button); url/linkTarget/rel match core/button.
	 *
	 * Each block's render.php was also confirmed to read the attribute
	 * straight from $attributes (text → $text, content → $content,
	 * label/url/linkTarget/rel → $label/$url/$link_target/$rel) — the
	 * binding-computed value is not silently ignored at render time.
	 *
	 * @var array<string,string[]>
	 */
	private const SUPPORTED_ATTRIBUTES = array(
		'sgs/text'    => array( 'text' ),
		'sgs/heading' => array( 'content' ),
		'sgs/button'  => array( 'url', 'label', 'linkTarget', 'rel' ),
	);

	/**
	 * Registers one `block_bindings_supported_attributes_{$block_type}`
	 * filter per supported block. Runs on `init` so it is wired before any
	 * block render (register_block_bindings_source() for sgs/site-info also
	 * runs on `init` — order between the two doesn't matter, they act on
	 * different stages of the bindings pipeline: this filter widens WHICH
	 * attrs are eligible for binding; the source resolves the VALUE).
	 */
	public static function register(): void {
		\add_action( 'init', array( self::class, 'register_filters' ) );
	}

	/**
	 * Adds the per-block dynamic filters.
	 */
	public static function register_filters(): void {
		foreach ( self::SUPPORTED_ATTRIBUTES as $block_name => $attributes ) {
			\add_filter(
				"block_bindings_supported_attributes_{$block_name}",
				static function ( $supported_block_attributes ) use ( $attributes ) {
					// Merge rather than replace — respects any future third-party
					// extension of the same block's supported attribute list.
					$merged = array_merge(
						is_array( $supported_block_attributes ) ? $supported_block_attributes : array(),
						$attributes
					);
					return array_values( array_unique( $merged ) );
				}
			);
		}
	}
}
