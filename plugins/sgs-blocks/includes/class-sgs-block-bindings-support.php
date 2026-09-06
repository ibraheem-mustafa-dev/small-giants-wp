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
	 * WIDENED 2026-09-04 (C15-5, `.claude/reports/2026-08-28-c15-block-bindings-scope-proposal.md`)
	 * from 3 blocks / 6 attrs to the 37 blocks / 78 attrs below. Every pair here
	 * is a SAFE binding target per the detector `scripts/audit-bindable-attrs.py`
	 * (`--check` gates this const against it): a SCALAR attribute (never
	 * object/array — a binding resolves to one value and a mismatched type is
	 * silently coerced to the attribute's default) carrying `"role":"content"`
	 * in its own block.json (this codebase's existing "this holds client
	 * content" marker), or a `linkTarget`/`rel` sibling of a content URL attr
	 * (mirrors core/button's own bindable set) — AND actually READ by the
	 * block's own render surface (own render.php, a `use function`-imported
	 * shared helper, a sibling PHP file in the same block folder, or the
	 * `$prefix . 'Suffix'` dynamic-key pattern `sgs/before-after` uses).
	 * `sgs/product-card` is deliberately EXCLUDED — its dynamic data already
	 * routes through `Product_Bindings::get_product_data()` called directly
	 * from render.php (C15-6); adding it here would double up two live-data
	 * mechanisms.
	 * NOT covered (named, not silently dropped — see the detector's `--survey`
	 * for the full picture):
	 *   - `sgs/button`'s `linkId`/`linkKind` (SgsLinkPopover internal
	 *     bookkeeping, not client content); `sgs/heading`'s `headingRole` (an
	 *     enum UI selector, not authored text) — deliberately curated out.
	 *   - `sgs/info-box` (`heading`/`description`), `sgs/hero` (`label`),
	 *     `sgs/notice-banner` (`text`), `sgs/cta-section` (`headline`),
	 *     `sgs/tab` (`label`) — DECLARED `role:content` in block.json but
	 *     genuinely DEAD at render: each was FR-22-6-migrated to an InnerBlocks
	 *     child (sgs/heading/sgs/text/sgs/label) that owns the real text, and
	 *     the parent's flat scalar is a leftover marker nothing reads. A
	 *     binding on any of these would resolve and be silently discarded.
	 *     `sgs/form-field-address`/`-consent`/`-file`/`-tiles` similarly do not
	 *     read their own `placeholder` (address computes it internally per
	 *     sub-field; consent/file/tiles are not text inputs, so it never
	 *     applied) — the detector proved this per-attribute, not per-block, so
	 *     each of those blocks keeps whichever of `label`/`helpText` IS read.
	 *   - Every other `role:content` pair on a block/attr this pass did not
	 *     reach — run `--survey` for the live list and widen in a follow-up
	 *     pass, per THE-MIGRATION-METHOD.md (do not cover every block in one
	 *     sitting).
	 *
	 * @var array<string,string[]>
	 */
	private const SUPPORTED_ATTRIBUTES = array(
		'sgs/text'              => array( 'text' ),
		'sgs/heading'           => array( 'content' ),
		'sgs/button'            => array( 'url', 'label', 'linkTarget', 'rel' ),
		'sgs/media'             => array( 'imageAlt', 'imageUrl', 'caption', 'linkUrl', 'videoUrl' ),
		'sgs/decorative-image'  => array( 'imageAlt', 'imageUrl' ),
		'sgs/responsive-logo'   => array( 'alt', 'logoUrl' ),
		'sgs/team-member'       => array( 'name', 'bio' ),
		'sgs/testimonial'       => array( 'quote', 'reviewerName', 'reviewerRole', 'orgName', 'summaryPhrase' ),
		'sgs/counter'           => array( 'label', 'prefix', 'suffix' ),
		'sgs/trust-bar'         => array( 'title' ),
		'sgs/icon'              => array( 'linkUrl', 'linkTarget' ),
		'sgs/whatsapp-cta'      => array( 'label' ),
		'sgs/label'             => array( 'text' ),
		'sgs/collapsible-text'  => array( 'text' ),
		'sgs/table-of-contents' => array( 'title' ),
		'sgs/form-review'       => array( 'heading' ),
		'sgs/product-faq'       => array( 'heading' ),
		'sgs/product-faq-item'  => array( 'question' ),
		'sgs/accordion-item'    => array( 'title' ),
		'sgs/form-step'         => array( 'label' ),
		'sgs/star-rating'       => array( 'label' ),
		'sgs/audio'             => array( 'title' ),
		'sgs/before-after'      => array( 'beforeImageAlt', 'beforeImageUrl', 'afterImageAlt', 'afterImageUrl', 'beforeLabel', 'afterLabel' ),
		'sgs/form'              => array( 'successMessage' ),
		'sgs/form-field-address'  => array( 'label', 'helpText' ),
		'sgs/form-field-checkbox' => array( 'label', 'helpText' ),
		'sgs/form-field-consent'  => array( 'helpText' ),
		'sgs/form-field-date'     => array( 'label', 'placeholder', 'helpText' ),
		'sgs/form-field-email'    => array( 'label', 'placeholder', 'helpText' ),
		'sgs/form-field-file'     => array( 'label', 'helpText' ),
		'sgs/form-field-number'   => array( 'label', 'placeholder', 'helpText' ),
		'sgs/form-field-phone'    => array( 'label', 'placeholder', 'helpText' ),
		'sgs/form-field-radio'    => array( 'label', 'helpText' ),
		'sgs/form-field-select'   => array( 'label', 'placeholder', 'helpText' ),
		'sgs/form-field-text'     => array( 'label', 'placeholder', 'helpText' ),
		'sgs/form-field-textarea' => array( 'label', 'placeholder', 'helpText' ),
		'sgs/form-field-tiles'    => array( 'label', 'helpText' ),
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
