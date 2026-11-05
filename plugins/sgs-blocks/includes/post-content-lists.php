<?php
/**
 * Core Post Content: the "Lists" settings (`sgsListFontSize`, `sgsListTextColour`, `sgsListGap`).
 *
 * `core/post-content` prints a product's description with its paragraphs and lists. This extension
 * adds three settings to that block only, so a client can style the description's list items from
 * the inspector:
 * - `sgsListFontSize` ({desktop,tablet,mobile}): `font-size` on the block's `li` elements.
 * - `sgsListTextColour` (palette slug or CSS colour, through sgs_colour_value()): `color` on the same elements.
 * - `sgsListGap` ({desktop,tablet,mobile}): sets `--sgs-plain-list-gap` on the block root, which the
 *   theme's "Plain lists" block style reads (theme/sgs-theme/inc/core-block-styles.php), so it only
 *   has an effect while that style is chosen.
 * An unset value (the default) emits nothing.
 *
 * The rules are a scoped `<style>` tag, never a style="" attribute (Spec 32). The `li` selector is
 * `.<scope>.wp-block-post-content li` (0,2,1): it beats the theme's `:where()` list rules (0,0,0)
 * and WordPress's global element styles. A blank tablet/mobile tier inherits the tier above.
 *
 * @package SGS\Blocks
 */

namespace SGS\Blocks;

defined( 'ABSPATH' ) || exit;

const SGS_POST_CONTENT_LISTS_BLOCK_NAME = 'core/post-content';

add_filter( 'render_block', __NAMESPACE__ . '\sgs_inject_post_content_lists', 10, 2 );

/**
 * Reduce one stored tier value to a safe single CSS length, or ''.
 *
 * Used as the responsive emitter's `transform`.
 *
 * @param mixed $raw Stored tier value.
 * @return string
 */
function sgs_post_content_list_length( $raw ): string {
	require_once __DIR__ . '/render-helpers.php';

	return is_scalar( $raw ) ? sgs_css_single_length_value( (string) $raw ) : '';
}

/**
 * The tier map for one stored value, keeping only tiers that hold a safe length.
 *
 * @param mixed $value Stored {desktop,tablet,mobile} object.
 * @return array|null Tier map, or null when no tier holds a safe length.
 */
function sgs_post_content_list_tiers( $value ): ?array {
	if ( ! is_array( $value ) ) {
		return null;
	}
	$tiers = array();
	$any   = false;
	foreach ( array( 'desktop', 'tablet', 'mobile' ) as $tier ) {
		$raw            = $value[ $tier ] ?? null;
		$safe           = '' === sgs_post_content_list_length( $raw ) ? null : $raw;
		$tiers[ $tier ] = $safe;
		$any            = $any || null !== $safe;
	}
	return $any ? $tiers : null;
}

/**
 * The scoped CSS for the three list settings.
 *
 * @param array  $attrs Block attributes.
 * @param string $scope Scope class name, no leading dot.
 * @return string CSS text without a <style> wrapper; '' when nothing is set.
 */
function sgs_post_content_lists_css( array $attrs, string $scope ): string {
	if ( '' === $scope ) {
		return '';
	}
	require_once __DIR__ . '/render-helpers.php';

	$root  = '.' . $scope . '.wp-block-post-content';
	$items = $root . ' li';
	$css   = '';

	$size_tiers = sgs_post_content_list_tiers( $attrs['sgsListFontSize'] ?? null );
	if ( null !== $size_tiers ) {
		$css .= sgs_emit_responsive_css(
			$items,
			array(
				array(
					'value'     => $size_tiers,
					'css'       => 'font-size',
					'transform' => __NAMESPACE__ . '\sgs_post_content_list_length',
				),
			)
		);
	}

	$colour_raw = $attrs['sgsListTextColour'] ?? '';
	$colour     = is_string( $colour_raw ) ? sgs_colour_value( $colour_raw ) : '';
	if ( '' !== $colour ) {
		$css .= $items . '{color:' . $colour . ';}';
	}

	$gap_tiers = sgs_post_content_list_tiers( $attrs['sgsListGap'] ?? null );
	if ( null !== $gap_tiers ) {
		$css .= sgs_emit_responsive_css(
			$root,
			array(
				array(
					'value'     => $gap_tiers,
					'css'       => '--sgs-plain-list-gap',
					'transform' => __NAMESPACE__ . '\sgs_post_content_list_length',
				),
			)
		);
	}
	return $css;
}

/**
 * Render-block filter: add the scope class and the scoped list rules.
 *
 * @param mixed $block_content Rendered block HTML.
 * @param mixed $block         Parsed block.
 * @return mixed
 */
function sgs_inject_post_content_lists( $block_content, $block ) {
	if ( ! is_string( $block_content ) || '' === trim( $block_content ) || ! is_array( $block ) ) {
		return $block_content;
	}
	if ( SGS_POST_CONTENT_LISTS_BLOCK_NAME !== ( $block['blockName'] ?? '' ) ) {
		return $block_content;
	}
	$attrs = $block['attrs'] ?? array();
	if ( ! is_array( $attrs ) || ! ( isset( $attrs['sgsListFontSize'] ) || isset( $attrs['sgsListTextColour'] ) || isset( $attrs['sgsListGap'] ) ) ) {
		return $block_content;
	}

	require_once __DIR__ . '/render-helpers.php';
	require_once __DIR__ . '/helpers-scoped-instance-vars.php';

	$root_tag = sgs_extract_root_opening_tag( ltrim( $block_content ) );
	if ( '' === $root_tag ) {
		return $block_content;
	}
	$scope = sgs_scope_class_for_root(
		$root_tag,
		'sgs-post-content-lists',
		static fn( string $scope_class ): string => sgs_post_content_lists_css( $attrs, $scope_class )
	);
	$css   = sgs_post_content_lists_css( $attrs, $scope );
	if ( '' === $css ) {
		return $block_content;
	}

	// The scope reuses an existing uid class; add it only when it was freshly minted.
	$has_uid = (bool) preg_match( '/\bclass=["\'][^"\']*\b' . preg_quote( $scope, '/' ) . '\b/', $root_tag );
	if ( ! $has_uid ) {
		if ( preg_match( '/^(\s*<\w+\b[^>]*\bclass=["\'])/', $block_content ) ) {
			$block_content = preg_replace( '/^(\s*<\w+\b[^>]*\bclass=["\'])/', '$1' . $scope . ' ', $block_content, 1 );
		} else {
			$block_content = preg_replace( '/^(\s*<\w+)(\b)/', '$1 class="' . $scope . '"$2', $block_content, 1 );
		}
	}

	// The collector's lift filter takes `<style>` tags out of sgs/* blocks only, so this core block hands its
	// rules to the collector directly on the front end; the editor and REST renders keep them beside the block.
	if ( function_exists( __NAMESPACE__ . '\sgs_is_frontend_render' ) && sgs_is_frontend_render() ) {
		sgs_collect_css( wp_strip_all_tags( $css ) );
		return $block_content;
	}
	return $block_content . '<style>' . wp_strip_all_tags( $css ) . '</style>';
}
