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
 * Only a user who may edit CSS (`edit_css`, as WordPress core requires for its own per-block CSS)
 * can save it: for anyone else the attribute is stripped from the post on save.
 *
 * @package SGS\Blocks
 */

namespace SGS\Blocks;

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

require_once __DIR__ . '/class-custom-css-scoper.php';

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

	// The scope class is DOUBLED (`.uid.uid`, 0,2,0), matching the block's own class-level
	// per-instance rules (Spec 32 §6.1(b), never `#uid`), so the residual wins by source order
	// alone: it is appended after the block. Never an ID or `!important` (Spec 32 FR-32-13).
	$result = Custom_Css_Scoper::scope( $custom_css, '.' . $uid . '.' . $uid );
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

/**
 * Strip the Additional-CSS attributes from every block in post content (for users without `edit_css`).
 *
 * Mirrors WordPress core's `wp_strip_custom_css_from_blocks()` for its own per-block CSS: the block
 * delimiters are tokenised with WP_Block_Parser and only the attribute JSON of a block carrying one
 * of the keys is re-serialised.
 *
 * @param string $content Slashed post content.
 * @return string Slashed post content without the attributes.
 */
function sgs_strip_custom_css_from_blocks( $content ) {
	if ( ! is_string( $content ) || false === strpos( $content, 'sgsCustomCss' ) || ! has_blocks( $content ) ) {
		return $content;
	}

	$unslashed        = stripslashes( $content );
	$parser           = new \WP_Block_Parser();
	$parser->document = $unslashed;
	$parser->offset   = 0;
	$end              = strlen( $unslashed );
	$replacements     = array();

	while ( $parser->offset < $end ) {
		$next_token = $parser->next_token();
		if ( 'no-more-tokens' === $next_token[0] ) {
			break;
		}
		list( $token_type, , $attrs, $start_offset, $token_length ) = $next_token;

		$parser->offset = $start_offset + $token_length;
		if ( 'block-opener' !== $token_type && 'void-block' !== $token_type ) {
			continue;
		}

		$found = false;
		foreach ( SGS_CUSTOM_CSS_ATTRS as $key ) {
			if ( array_key_exists( $key, $attrs ) ) {
				unset( $attrs[ $key ] );
				$found = true;
			}
		}
		if ( ! $found ) {
			continue;
		}

		$token_string   = substr( $unslashed, $start_offset, $token_length );
		$json_rel_start = strcspn( $token_string, '{' );
		$json_rel_end   = strrpos( $token_string, '}' );
		$json_start     = $start_offset + $json_rel_start;
		$json_length    = $json_rel_end - $json_rel_start + 1;

		$replacements[] = empty( $attrs )
			? array( $json_start, $json_length + 1, '' )
			: array( $json_start, $json_length, serialize_block_attributes( $attrs ) );
	}

	if ( empty( $replacements ) ) {
		return $content;
	}

	$result = '';
	$was_at = 0;
	foreach ( $replacements as $replacement ) {
		list( $offset, $length, $new_json ) = $replacement;
		$result                            .= substr( $unslashed, $was_at, $offset - $was_at ) . $new_json;
		$was_at                             = $offset + $length;
	}
	if ( $was_at < $end ) {
		$result .= substr( $unslashed, $was_at );
	}

	return addslashes( $result );
}

/**
 * Strip the attributes on save unless the current user may edit CSS. Priority 8, as core's
 * equivalent, runs before kses (10).
 */
function sgs_custom_css_kses_init() {
	remove_filter( 'content_save_pre', __NAMESPACE__ . '\sgs_strip_custom_css_from_blocks', 8 );
	remove_filter( 'content_filtered_save_pre', __NAMESPACE__ . '\sgs_strip_custom_css_from_blocks', 8 );
	if ( ! current_user_can( 'edit_css' ) ) {
		add_filter( 'content_save_pre', __NAMESPACE__ . '\sgs_strip_custom_css_from_blocks', 8 );
		add_filter( 'content_filtered_save_pre', __NAMESPACE__ . '\sgs_strip_custom_css_from_blocks', 8 );
	}
}
add_action( 'init', __NAMESPACE__ . '\sgs_custom_css_kses_init', 20 );
add_action( 'set_current_user', __NAMESPACE__ . '\sgs_custom_css_kses_init' );
