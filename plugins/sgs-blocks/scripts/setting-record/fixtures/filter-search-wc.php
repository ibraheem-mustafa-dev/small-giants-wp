<?php
// The one core function the offline runner's stubs lack that taxonomy-terms mode calls: add_query_arg() builds each term's
// toggle link (src/blocks/filter-search/resolve-taxonomy-terms.php::sgs_filter_search_resolve_taxonomy_terms; without it
// every render stops on "Call to undefined function add_query_arg()"). It appends one query argument to a URL or path
// (the runner's remove_query_arg() answers the base). Declared only when absent, so a runner that gains it wins. No absolute
// path: the runner's working directory is the plugin folder being rendered.
if ( ! function_exists( 'add_query_arg' ) ) {
	function add_query_arg( $key, $value = null, $url = null ) {
		if ( is_array( $key ) ) {
			$url    = null === $value ? '' : $value;
			$params = $key;
		} else {
			$url    = null === $url ? '' : $url;
			$params = array( $key => $value );
		}
		$url = (string) $url;
		return $url . ( false === strpos( $url, '?' ) ? '?' : '&' ) . http_build_query( $params );
	}
}
require getcwd() . '/src/blocks/filter-search/render.php';
