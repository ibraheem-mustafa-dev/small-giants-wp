<?php
/**
 * Shared helper for server-side render_block injectors that need to attach
 * per-instance CSS custom-property VALUES to a block's root element without
 * writing a `style="…"` attribute (Spec 32 no-inline contract, FR-32-11).
 *
 * Used by hover-effects.php, parallax.php, and image-controls.php — the
 * three injectors that, before this fix, wrote `--sgs-*` custom properties
 * straight onto the root tag's `style` attribute. That path is the ONLY
 * sanctioned no-inline mechanism already proven live by every migrated
 * block's render.php (e.g. quote, info-box): build a scoped `.{uid}{…}`
 * rule and append it as the block's own `<style>` tag. On the front end the
 * Spec-32 CSS collector (class-sgs-css-registry.php, render_block priority
 * 99) lifts that tag out of the block's rendered HTML into the consolidated
 * `<head>` stylesheet; in the editor (ServerSideRender REST — no wp_footer
 * flush) the tag is left inline and renders as-authored. Both paths are
 * covered with zero extra plumbing because it is literally the same shape
 * every render.php already uses.
 *
 * @package SGS\Blocks
 */

namespace SGS\Blocks;

defined( 'ABSPATH' ) || exit;

/**
 * Find an existing SGS uid-pattern class (`sgs-<slug>-<8hex>`, the pattern
 * every migrated render.php already emits as its scoping selector, e.g.
 * `sgs-info-box-a1b2c3d4`) within a root tag's class attribute, or mint a
 * fresh scoping class with the given prefix when none exists. This function
 * only DECIDES the class name — the caller is responsible for adding it to
 * the root tag's class list.
 *
 * @param string $root_tag_html The root element's OPENING tag markup only
 *                               (e.g. `<div class="…">`), BEFORE any classes
 *                               this request is about to add.
 * @param string $prefix        Fallback prefix (no trailing hyphen) used to
 *                               mint a new class when no uid class exists,
 *                               e.g. 'sgs-hover', 'sgs-parallax', 'sgs-imgctl'.
 * @return string Class name (no leading dot) to use as the scoping selector.
 */
function sgs_scope_class_for_root( string $root_tag_html, string $prefix ): string {
	if ( preg_match( '/\bclass=["\']([^"\']*)["\']/', $root_tag_html, $class_match ) ) {
		if ( preg_match( '/sgs-[a-z-]+-[0-9a-f]{8}/', $class_match[1], $uid_match ) ) {
			return $uid_match[0];
		}
	}
	// No existing uid class — mint one. Uniqueness only needs to hold within
	// a single request (multiple instances of the same block on one page
	// must not collide); microtime()+wp_rand() over the tag markup gives a
	// fresh 8-hex suffix per call, matching the `sgs-<slug>-<8hex>` shape.
	return $prefix . '-' . substr( \md5( $root_tag_html . \microtime( true ) . \wp_rand() ), 0, 8 );
}

/**
 * Append a scoped `<style>` rule declaring CSS custom properties on the
 * given scope class, to a block's rendered HTML. No-op when there are no
 * declarations. See file docblock for why appending a `<style>` tag (rather
 * than an inline `style=""` attribute) is the correct + already-proven
 * mechanism.
 *
 * @param string $block_content Rendered block HTML to append to.
 * @param string $scope_class   Selector class name (no leading dot).
 * @param array  $declarations  CSS declarations, each already a complete
 *                               `property:value` string (e.g. `--sgs-hover-scale:1.02`).
 * @return string Block HTML with the scoped `<style>` tag appended.
 */
function sgs_append_scoped_var_style( string $block_content, string $scope_class, array $declarations ): string {
	if ( empty( $declarations ) || '' === $scope_class ) {
		return $block_content;
	}
	$css = '.' . $scope_class . '{' . \implode( ';', $declarations ) . '}';
	return $block_content . '<style>' . \wp_strip_all_tags( $css ) . '</style>';
}

/**
 * Extract just the root element's OPENING tag from a block-content substring
 * that starts at the real root (i.e. past any leading `<style>`/`<script>`
 * tags — see the `$sgs_root_offset` skip-loop every injector in this family
 * already runs). Returns '' when no tag is found (malformed markup).
 *
 * @param string $root_and_beyond Substring starting at the root element.
 * @return string
 */
function sgs_extract_root_opening_tag( string $root_and_beyond ): string {
	if ( \preg_match( '/^<[a-zA-Z][a-zA-Z0-9-]*\b[^>]*>/', $root_and_beyond, $tag_match ) ) {
		return $tag_match[0];
	}
	return '';
}
