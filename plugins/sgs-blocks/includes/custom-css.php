<?php
/**
 * Custom CSS per block - server-side output (Spec 32 FR-32-13, FR-32-20).
 *
 * A block's `sgsCustomCss` is parsed and scoped to the block instance by
 * `Custom_Css_Scoper` (includes/class-custom-css-scoper.php): every rule, including rules inside
 * `@media`, `@supports` and `@container`, is confined to the instance, and anything that cannot be
 * confined is refused, never emitted against the whole page. A `@keyframes` is renamed for the
 * instance and the input's own `animation` references follow it. The scoped rules render as a `<style>`
 * appended after the block, which the CSS collector lifts into the head
 * (class-sgs-css-registry.php::sgs_lift_block_css) for SGS and core blocks alike.
 *
 * Who may write the attribute, and what a save by anyone else keeps, is includes/custom-css-save.php.
 * A `url()` that points outside the site is refused by the scoper; the hosts it may name are the site's own
 * (`sgs_custom_css_site_hosts()`).
 *
 * @package SGS\Blocks
 */

namespace SGS\Blocks;

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

require_once __DIR__ . '/class-custom-css-scoper.php';
require_once __DIR__ . '/custom-css-save.php';

/**
 * How many times Custom CSS repeats the scope class (`.uid.uid.uid.uid.uid`), and how many times any settings emitter may.
 *
 * Custom CSS must out-rank every setting the framework prints for the same part, so its scope is always one class longer
 * than the longest scope any emitter prints (the commerce-look table's `root_repeat` is the largest). The editor canvas
 * holds the same numbers (src/utils/custom-css-scope.js), and tests/php/CustomCssOutranksSettingsTest.php fails when an
 * emitter reaches Custom CSS's count.
 */
const SGS_SETTINGS_SCOPE_REPEAT_MAX = 4;
const SGS_CUSTOM_CSS_SCOPE_REPEAT   = 5;

/** The block attributes that make up the Additional-CSS channel. */
const SGS_CUSTOM_CSS_ATTRS = array( 'sgsCustomCss', 'sgsCustomCssId', 'sgsCustomCssNote' );

/**
 * The scope class for one block instance.
 *
 * The editor stores a stable per-instance key in `sgsCustomCssId` (src/blocks/extensions/custom-css.js),
 * so the class survives edits to the CSS and differs between two instances carrying the same CSS. A block
 * saved without a key falls back to a hash of its CSS, made unique within the request by an occurrence count.
 *
 * @param array $block Parsed block.
 * @return string
 */
function sgs_custom_css_uid( array $block ): string {
	static $seen = array();

	$key = (string) ( $block['attrs']['sgsCustomCssId'] ?? '' );
	if ( 1 === preg_match( '/^[a-z0-9]{4,16}$/', $key ) ) {
		return 'sgs-c-' . $key;
	}

	$hash          = substr( md5( (string) $block['attrs']['sgsCustomCss'] . ( $block['blockName'] ?? '' ) ), 0, 8 );
	$seen[ $hash ] = ( $seen[ $hash ] ?? 0 ) + 1;
	return 'sgs-c-' . $hash . ( $seen[ $hash ] > 1 ? '-' . $seen[ $hash ] : '' );
}

/**
 * Add the block's scoped custom CSS to its rendered HTML.
 *
 * @param string $block_content Rendered block HTML.
 * @param array  $block         Block data including attrs.
 * @return string
 */
function render_custom_css( string $block_content, array $block ): string {
	$custom_css = $block['attrs']['sgsCustomCss'] ?? '';
	if ( ! is_string( $custom_css ) || '' === trim( $custom_css ) || '' === $block_content ) {
		return $block_content;
	}

	$uid = sgs_custom_css_uid( $block );

	// The scope class is repeated SGS_CUSTOM_CSS_SCOPE_REPEAT times (`.uid.uid.uid.uid.uid`), one more than any settings emitter
	// repeats it, so the residual out-ranks every setting for the same part on specificity and not on source order (it is
	// also appended after the block). Never an ID or `!important` (Spec 32 FR-32-13).
	$result = Custom_Css_Scoper::scope( $custom_css, str_repeat( '.' . $uid, SGS_CUSTOM_CSS_SCOPE_REPEAT ), sgs_custom_css_site_hosts() );
	if ( '' === $result['css'] ) {
		return $block_content;
	}

	$block_content = preg_replace( '/class="/', 'class="' . esc_attr( $uid ) . ' ', $block_content, 1 );

	// APPEND so the residual follows the block's own render-time styles at equal specificity,
	// as WordPress core emits its site-wide Additional CSS last. The scoper refuses any input
	// containing `<`, so the rule text cannot close the `<style>` element.
	return $block_content . '<style id="sgs-custom-css-' . esc_attr( $uid ) . '">' . $result['css'] . '</style>';
}
add_filter( 'render_block', __NAMESPACE__ . '\render_custom_css', 10, 2 );
