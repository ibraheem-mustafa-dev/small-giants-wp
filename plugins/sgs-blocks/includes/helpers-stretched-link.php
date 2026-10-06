<?php
/**
 * Shared stretched-link wiring for a block that owns its own destination.
 *
 * The stretched-link mechanism itself is the `blockLink` extension:
 * includes/hover-effects/hover-effects.php::SGS\Blocks\inject_hover_effects
 * adds `.sgs-has-block-link` to the block root and
 * includes/hover-effects/link-overlay.php::SGS\Blocks\insert_block_link_overlay
 * injects the empty overlay `<a class="sgs-block-link-overlay">` as the root's
 * last child, with assets/css/extensions.css stretching it and raising real
 * interactive descendants above it. Nothing here re-implements any of that.
 *
 * What this file adds is the ONE case that mechanism cannot express on its own:
 * the extension reads a fixed `sgsBlockLink` string an operator typed, but some
 * blocks KNOW their destination at render time and nobody should have to type it
 * (a product card links to the product it is rendering; a logo links to the
 * site home). Those blocks declare `supports.sgs.blockLinkAutoUrl: true`, which
 * turns the extension's Block Link panel from a URL field into a single toggle
 * writing `sgsBlockLinkAuto`, and call sgs_stretched_link_apply() from their
 * render.php with the URL they resolved.
 *
 * How the handover works: `render_block` is applied AFTER the dynamic render
 * callback returns, and it is applied to the LIVE `WP_Block::$parsed_block`
 * property — `apply_filters( 'render_block', $block_content, $this->parsed_block,
 * $this )` in WP_Block::render(), reached only after
 * `call_user_func( $this->block_type->render_callback, ... )` has run. So a
 * render.php that writes `sgsBlockLink` into `$block->parsed_block['attrs']` is
 * writing it in time for inject_hover_effects() to read it, and the whole
 * extension pipeline then runs unmodified. Writing it into render.php's own
 * local `$attributes` array would NOT work: that array is a copy and the filter
 * never sees it.
 *
 * @package SGS\Blocks
 */

defined( 'ABSPATH' ) || exit;

if ( ! function_exists( 'sgs_stretched_link_active' ) ) {
	/**
	 * Whether the operator has turned the whole-block link on.
	 *
	 * @param array $attributes Block attributes as passed to render.php.
	 * @return bool True when `sgsBlockLinkAuto` is set.
	 */
	function sgs_stretched_link_active( array $attributes ): bool {
		return ! empty( $attributes['sgsBlockLinkAuto'] );
	}
}

if ( ! function_exists( 'sgs_stretched_link_apply' ) ) {
	/**
	 * Hand a render-time URL to the `blockLink` extension.
	 *
	 * Writes `sgsBlockLink` (and, when the operator left the accessible-label
	 * field empty, `sgsBlockLinkLabel`) onto the live block instance so
	 * inject_hover_effects() picks them up on the `render_block` pass that
	 * follows this render. An operator-supplied label always wins — the label
	 * passed here is a sensible default, never an override.
	 *
	 * @param mixed  $block Block instance passed to render.php (a WP_Block, or
	 *                      null in a synthetic/preview render).
	 * @param string $url   Destination the block resolved for itself. '' is a
	 *                      no-op, so a card with no resolvable product simply
	 *                      stays unlinked rather than emitting a dead overlay.
	 * @param string $label Accessible name for the overlay anchor (the overlay
	 *                      is empty, so it has no text of its own).
	 * @return bool True when the link was handed over, false when it was not
	 *              (no block instance, or no URL). The caller does NOT suppress
	 *              its own link on the strength of it: the extension finds that
	 *              link and lends it the stretched surface.
	 */
	function sgs_stretched_link_apply( $block, string $url, string $label = '' ): bool {
		if ( ! $block instanceof \WP_Block || '' === trim( $url ) ) {
			return false;
		}

		$attrs = isset( $block->parsed_block['attrs'] ) && is_array( $block->parsed_block['attrs'] )
			? $block->parsed_block['attrs']
			: array();

		$attrs['sgsBlockLink'] = $url;

		if ( '' !== $label && '' === trim( (string) ( $attrs['sgsBlockLinkLabel'] ?? '' ) ) ) {
			$attrs['sgsBlockLinkLabel'] = $label;
		}

		$block->parsed_block['attrs'] = $attrs;

		return true;
	}
}

if ( ! function_exists( 'sgs_stretched_link_handover' ) ) {
	/**
	 * The whole decision in one call: is the toggle on, and did the handover
	 * succeed?
	 *
	 * The return value reports only that the handover happened. It is NOT a
	 * "the overlay now owns the tab stop" flag: the extension finds the block's
	 * own visible link to that destination and lends it the stretched surface,
	 * demoting any further link to the same place, so exactly one element means
	 * "go to this destination" without the block suppressing anything of its own
	 * (`includes/hover-effects/link-overlay.php::insert_block_link_overlay`).
	 *
	 * @param mixed  $block      Block instance passed to render.php.
	 * @param array  $attributes Block attributes as passed to render.php.
	 * @param string $url        Destination the block resolved for itself.
	 * @param string $label      Default accessible name for the overlay anchor.
	 * @return bool True when the URL was handed to the extension.
	 */
	function sgs_stretched_link_handover( $block, array $attributes, string $url, string $label = '' ): bool {
		if ( ! sgs_stretched_link_active( $attributes ) ) {
			return false;
		}
		return sgs_stretched_link_apply( $block, $url, $label );
	}
}
