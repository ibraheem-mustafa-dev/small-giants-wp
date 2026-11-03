<?php
/**
 * Shop "Load more" mode (Spec 30 FR-30-3b): the Customizer settings, the page size, the `sgs_batches` URL parameter
 * and the settings handed to the client module.
 *
 * With the mode on, a shop or product-category archive renders `P` products (the batch size). The URL parameter
 * `sgs_batches=k` asks for `k` batches in one response, starting at the product that page `paged` would start at, so
 * Back and reloads need no client fetch. With the mode `pages` nothing here changes the query or the page.
 *
 * @package SGS\Theme
 */

namespace SGS\Theme;

defined( 'ABSPATH' ) || exit;

const SHOP_LOAD_MORE_PARAM       = 'sgs_batches';
const SHOP_LOAD_MORE_MAX_BATCHES = 8;
const SHOP_LOAD_MORE_MAX_ITEMS   = 200;
const SHOP_LOAD_MORE_MODULE      = '@sgs/shop-load-more';
const SHOP_LOAD_MORE_MODULE_PATH = 'assets/js/sgs-shop-load-more.js';

/**
 * Register the controls in the existing Shop Filters section.
 *
 * @param \WP_Customize_Manager $wp_customize Customizer manager.
 * @return void
 */
function register_shop_load_more_customizer_settings( \WP_Customize_Manager $wp_customize ): void {
	$fields = array(
		'sgs_shop_pagination_mode'         => array(
			'type'     => 'select',
			'label'    => __( 'Shop pagination', 'sgs-theme' ),
			'choices'  => array(
				'load_more' => __( 'Load more button', 'sgs-theme' ),
				'pages'     => __( 'Numbered pages', 'sgs-theme' ),
			),
			'default'  => 'load_more',
			'sanitize' => __NAMESPACE__ . '\sanitize_shop_pagination_mode',
		),
		'sgs_shop_batch_size'              => array(
			'type'        => 'number',
			'label'       => __( 'Load more: products per batch (also the first load on a phone)', 'sgs-theme' ),
			'default'     => 24,
			'sanitize'    => __NAMESPACE__ . '\sanitize_shop_batch_size',
			'input_attrs' => array(
				'min' => 12,
				'max' => 60,
			),
		),
		'sgs_shop_desktop_first_load'      => array(
			'type'        => 'number',
			'label'       => __( 'Load more: products shown on a wide screen before the button (rounded up to whole batches)', 'sgs-theme' ),
			'default'     => 120,
			'sanitize'    => __NAMESPACE__ . '\sanitize_shop_desktop_first_load',
			'input_attrs' => array(
				'min' => 24,
				'max' => SHOP_LOAD_MORE_MAX_ITEMS,
			),
		),
		'sgs_shop_load_more_label'         => array(
			'type'     => 'text',
			'label'    => __( 'Load more: button wording', 'sgs-theme' ),
			'default'  => __( 'Load more', 'sgs-theme' ),
			'sanitize' => 'sanitize_text_field',
		),
		'sgs_shop_load_more_count_label'   => array(
			'type'     => 'text',
			/* translators: %1$d and %2$d are shown as typed: they mark where the setting puts the numbers. */
			'label'    => __( 'Load more: count wording, with %1$d for the products shown and %2$d for all of them', 'sgs-theme' ),
			/* translators: %1$d is the number of products shown, %2$d the number in the list. */
			'default'  => __( 'Showing %1$d of %2$d products', 'sgs-theme' ),
			'sanitize' => 'sanitize_text_field',
		),
		'sgs_shop_load_more_loading_label' => array(
			'type'     => 'text',
			'label'    => __( 'Load more: button wording while loading', 'sgs-theme' ),
			'default'  => __( 'Loading…', 'sgs-theme' ),
			'sanitize' => 'sanitize_text_field',
		),
	);
	foreach ( $fields as $id => $field ) {
		$wp_customize->add_setting(
			$id,
			array(
				'default'           => $field['default'],
				'sanitize_callback' => $field['sanitize'],
			)
		);
		$wp_customize->add_control(
			$id,
			array(
				'section'     => 'sgs_shop_filters',
				'type'        => $field['type'],
				'label'       => $field['label'],
				'choices'     => $field['choices'] ?? array(),
				'input_attrs' => $field['input_attrs'] ?? array(),
			)
		);
	}
}
add_action( 'customize_register', __NAMESPACE__ . '\register_shop_load_more_customizer_settings', 20 );

/**
 * Sanitise the pagination mode.
 *
 * @param mixed $value Raw value.
 * @return string 'load_more' or 'pages'.
 */
function sanitize_shop_pagination_mode( $value ): string {
	return 'pages' === $value ? 'pages' : 'load_more';
}

/**
 * Sanitise the batch size: a whole number from 12 to 60.
 *
 * @param mixed $value Raw value.
 * @return int
 */
function sanitize_shop_batch_size( $value ): int {
	return max( 12, min( 60, absint( $value ) ) );
}

/**
 * Sanitise the wide-screen first load: a whole number from 24 to 200.
 *
 * @param mixed $value Raw value.
 * @return int
 */
function sanitize_shop_desktop_first_load( $value ): int {
	return max( 24, min( SHOP_LOAD_MORE_MAX_ITEMS, absint( $value ) ) );
}

/**
 * Whether the current request is a shop or product-category archive in Load more mode.
 *
 * @return bool
 */
function shop_load_more_enabled(): bool {
	if ( 'load_more' !== sanitize_shop_pagination_mode( get_theme_mod( 'sgs_shop_pagination_mode', 'load_more' ) ) ) {
		return false;
	}
	return function_exists( 'is_shop' ) && ( is_shop() || is_product_taxonomy() );
}

/**
 * The batch size P: the stored setting as a whole number from 1 to the item cap.
 *
 * @return int
 */
function shop_load_more_batch_size(): int {
	$stored = absint( get_theme_mod( 'sgs_shop_batch_size', 24 ) );
	return max( 1, min( SHOP_LOAD_MORE_MAX_ITEMS, 0 === $stored ? 24 : $stored ) );
}

/**
 * The most batches a request may ask for: 8, and never more than the item cap holds.
 *
 * @param int $batch_size Batch size P.
 * @return int
 */
function shop_load_more_max_batches( int $batch_size ): int {
	return max( 1, min( SHOP_LOAD_MORE_MAX_BATCHES, intdiv( SHOP_LOAD_MORE_MAX_ITEMS, max( 1, $batch_size ) ) ) );
}

/**
 * The batches the request asks for: `sgs_batches` as a whole number, 1 when absent or not a number, at most the
 * allowed maximum.
 *
 * @param int $batch_size Batch size P.
 * @return int
 */
function shop_load_more_requested_batches( int $batch_size ): int {
	// phpcs:ignore WordPress.Security.NonceVerification.Recommended -- Public read-only archive parameter, clamped below.
	$raw = isset( $_GET[ SHOP_LOAD_MORE_PARAM ] ) ? wp_unslash( $_GET[ SHOP_LOAD_MORE_PARAM ] ) : '';
	$k   = is_scalar( $raw ) ? absint( $raw ) : 0;
	return max( 1, min( shop_load_more_max_batches( $batch_size ), $k ) );
}

/**
 * The page size WooCommerce paginates by: the batch size while the mode is on, else untouched.
 *
 * @param mixed $per_page Page size so far.
 * @return mixed
 */
function filter_shop_load_more_per_page( $per_page ) {
	return shop_load_more_enabled() ? shop_load_more_batch_size() : $per_page;
}
add_filter( 'loop_shop_per_page', __NAMESPACE__ . '\filter_shop_load_more_per_page', 20 );

/**
 * Let the main product query return `k` batches starting where page `paged` starts: posts_per_page = k * P and
 * offset = (paged - 1) * P. WP_Query ignores `paged` when an offset is set, and `paged` stays in the query vars for
 * the pagination blocks. The batch size is kept in a query var so the page count can be restored afterwards.
 *
 * @param \WP_Query $query Query being built.
 * @return void
 */
function apply_shop_load_more_batches( $query ): void {
	if ( ! $query instanceof \WP_Query || is_admin() || ! $query->is_main_query() || ! shop_load_more_enabled() ) {
		return;
	}
	$batch = shop_load_more_batch_size();
	$k     = shop_load_more_requested_batches( $batch );
	$page  = max( 1, absint( $query->get( 'paged' ) ) );
	$query->set( 'posts_per_page', $k * $batch );
	$query->set( 'offset', ( $page - 1 ) * $batch );
	$query->set( 'sgs_load_more_size', $batch );
}
add_action( 'pre_get_posts', __NAMESPACE__ . '\apply_shop_load_more_batches', 20 );

/**
 * A query that returned several batches counts its pages in batches, so the paged links keep their meaning.
 *
 * @param array<int,\WP_Post>|mixed $posts Posts found.
 * @param \WP_Query                 $query Query.
 * @return mixed
 */
function restore_shop_load_more_page_count( $posts, $query ) {
	$batch = $query instanceof \WP_Query ? absint( $query->get( 'sgs_load_more_size' ) ) : 0;
	if ( $batch > 0 ) {
		$query->max_num_pages = (int) ceil( $query->found_posts / $batch );
	}
	return $posts;
}
add_filter( 'the_posts', __NAMESPACE__ . '\restore_shop_load_more_page_count', 20, 2 );

/**
 * A canonical URL never carries the batch parameter.
 *
 * @param mixed $canonical Canonical URL.
 * @return mixed
 */
function strip_shop_load_more_canonical_param( $canonical ) {
	return is_string( $canonical ) && false !== strpos( $canonical, SHOP_LOAD_MORE_PARAM ) ? remove_query_arg( SHOP_LOAD_MORE_PARAM, $canonical ) : $canonical;
}
add_filter( 'get_canonical_url', __NAMESPACE__ . '\strip_shop_load_more_canonical_param', 20 );

/**
 * The list total on the collection's outer element. The router swaps that element on every navigation, so the
 * client module always reads the total of the list on screen (the results-count block sits outside the region).
 *
 * @param mixed $content Rendered block HTML.
 * @return mixed
 */
function add_shop_load_more_total( $content ) {
	global $wp_query;
	if ( ! is_string( $content ) || '' === $content || ! shop_load_more_enabled() || ! $wp_query instanceof \WP_Query ) {
		return $content;
	}
	$tags = new \WP_HTML_Tag_Processor( $content );
	if ( ! $tags->next_tag() ) {
		return $content;
	}
	$tags->set_attribute( 'data-sgs-total', (string) absint( $wp_query->found_posts ) );
	return $tags->get_updated_html();
}
add_filter( 'render_block_woocommerce/product-collection', __NAMESPACE__ . '\add_shop_load_more_total', 20 );

/**
 * The settings the client module reads.
 *
 * @return array<string,mixed>
 */
function shop_load_more_client_settings(): array {
	$batch   = shop_load_more_batch_size();
	$desktop = max( $batch, min( SHOP_LOAD_MORE_MAX_ITEMS, absint( get_theme_mod( 'sgs_shop_desktop_first_load', 120 ) ) ) );
	$labels  = array(
		'button'  => array( 'sgs_shop_load_more_label', __( 'Load more', 'sgs-theme' ) ),
		/* translators: %1$d is the number of products shown, %2$d the number in the list. */
		'count'   => array( 'sgs_shop_load_more_count_label', __( 'Showing %1$d of %2$d products', 'sgs-theme' ) ),
		'loading' => array( 'sgs_shop_load_more_loading_label', __( 'Loading…', 'sgs-theme' ) ),
	);
	$text = array();
	foreach ( $labels as $key => $pair ) {
		$value        = trim( sanitize_text_field( (string) get_theme_mod( $pair[0], $pair[1] ) ) );
		$text[ $key ] = '' === $value ? $pair[1] : $value;
	}
	return array(
		'param'          => SHOP_LOAD_MORE_PARAM,
		'batchSize'      => $batch,
		'maxBatches'     => shop_load_more_max_batches( $batch ),
		'desktopBatches' => min( shop_load_more_max_batches( $batch ), (int) ceil( $desktop / $batch ) ),
		'labels'         => $text,
		'messages'       => array(
			/* translators: %d is the number of products just added. */
			'loadedMore' => __( '%d more products loaded.', 'sgs-theme' ),
			/* translators: %d is the number of products in the list. */
			'allShown'   => __( 'All %d products shown.', 'sgs-theme' ),
			'failed'     => __( 'Could not load more products. Try again.', 'sgs-theme' ),
		),
	);
}

/**
 * On a shop or category archive in Load more mode, register and enqueue the client module (once its file exists) and
 * print its settings as a JSON data block it reads.
 *
 * @return void
 */
function enqueue_shop_load_more(): void {
	if ( ! shop_load_more_enabled() ) {
		return;
	}
	$file = get_theme_file_path( SHOP_LOAD_MORE_MODULE_PATH );
	if ( ! file_exists( $file ) ) {
		return;
	}
	wp_register_script_module(
		SHOP_LOAD_MORE_MODULE,
		get_theme_file_uri( SHOP_LOAD_MORE_MODULE_PATH ),
		array(
			array(
				'id'     => '@sgs/load-more-core',
				'import' => 'static',
			),
			array(
				'id'     => '@wordpress/interactivity-router',
				'import' => 'dynamic',
			),
		),
		asset_version( SHOP_LOAD_MORE_MODULE_PATH, wp_get_theme()->get( 'Version' ) )
	);
	wp_enqueue_script_module( SHOP_LOAD_MORE_MODULE );
	wp_enqueue_style(
		'sgs-shop-load-more',
		get_theme_file_uri( 'assets/css/shop-load-more.css' ),
		array(),
		asset_version( 'assets/css/shop-load-more.css', wp_get_theme()->get( 'Version' ) )
	);
	add_action( 'wp_footer', __NAMESPACE__ . '\print_shop_load_more_settings', 5 );
}
add_action( 'wp_enqueue_scripts', __NAMESPACE__ . '\enqueue_shop_load_more', 22 );

/**
 * Print the module's settings as a JSON data block.
 *
 * @return void
 */
function print_shop_load_more_settings(): void {
	wp_print_inline_script_tag(
		(string) wp_json_encode( shop_load_more_client_settings(), JSON_HEX_TAG | JSON_HEX_AMP ),
		array(
			'type' => 'application/json',
			'id'   => 'sgs-shop-load-more-settings',
		)
	);
}
