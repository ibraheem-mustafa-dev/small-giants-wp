<?php
/**
 * The WordPress functions includes/custom-css.php, custom-css-save.php and class-custom-css-scoper.php call, backed by
 * `$GLOBALS['sgs_t']`: the registered filters, the current user's capabilities, and the stored posts. Loaded in the test's
 * own process only (CustomCssSavePermissionTest runs each test in a separate process), never in the shared one.
 *
 * `current_user_can()` follows WordPress core's mapping for what these tests ask: `edit_css` needs `unfiltered_html`;
 * `edit_post` on a page needs `edit_pages`, plus `edit_others_pages` when the page belongs to someone else.
 *
 * @package SGS\Blocks\Tests
 */

// phpcs:disable WordPress.NamingConventions.PrefixAllGlobals, Universal.Files.SeparateFunctionsFromOO

if ( ! function_exists( 'add_filter' ) ) {
	function add_filter( $tag, $callback, $priority = 10, $args = 1 ) {
		$GLOBALS['sgs_t']['filters'][ $tag ][] = $callback;
		return true;
	}
	function add_action( $tag, $callback, $priority = 10, $args = 1 ) {
		return add_filter( $tag, $callback, $priority, $args );
	}
	function apply_filters( $tag, $value, ...$args ) {
		foreach ( $GLOBALS['sgs_t']['filters'][ $tag ] ?? array() as $callback ) {
			$value = $callback( $value, ...$args );
		}
		return $value;
	}
	function current_user_can( $cap, $post_id = null ) {
		$caps = $GLOBALS['sgs_t']['caps'];
		if ( 'edit_css' === $cap ) {
			$cap = 'unfiltered_html';
		}
		if ( 'edit_post' === $cap ) {
			$post = $GLOBALS['sgs_t']['posts'][ (int) $post_id ] ?? null;
			if ( null === $post ) {
				return false;
			}
			$needed = in_array( 'edit_pages', $caps, true );
			return $needed && ( (int) $post->post_author === $GLOBALS['sgs_t']['user_id'] || in_array( 'edit_others_pages', $caps, true ) );
		}
		return in_array( $cap, $caps, true );
	}
	function get_post( $id ) {
		return $GLOBALS['sgs_t']['posts'][ (int) $id ] ?? null;
	}
	function get_post_type_object( $type ) {
		$cap = array( 'wp_template' => 'edit_theme_options' );
		return (object) array( 'cap' => (object) array( 'edit_posts' => $cap[ $type ] ?? 'edit_posts' ) );
	}
	function home_url() {
		return 'https://site.test';
	}
	function site_url() {
		return 'https://site.test/wp';
	}
	function wp_parse_url( $url, $component = -1 ) {
		return parse_url( $url, $component );
	}
	function wp_json_encode( $value, $flags = 0 ) {
		return json_encode( $value, $flags );
	}
	// WordPress core's own (wp-includes/blocks.php), so stored fixtures are serialised as WordPress serialises them.
	function serialize_block_attributes( $block_attributes ) {
		$encoded_attributes = wp_json_encode( $block_attributes, JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE );
		return strtr(
			$encoded_attributes,
			array(
				'\\\\' => '\\u005c',
				'--'   => '\\u002d\\u002d',
				'<'    => '\\u003c',
				'>'    => '\\u003e',
				'&'    => '\\u0026',
				'\\"'  => '\\u0022',
			)
		);
	}
}
