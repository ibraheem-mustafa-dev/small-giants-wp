<?php
/**
 * SGS WooCommerce seed — Eye Care Birmingham (Ward End Eye Care) shop catalogue.
 *
 * REPEATABLE by design: matches every WooCommerce object it creates by SLUG or
 * SKU and UPDATES it on a second run rather than duplicating. This is what makes
 * it safe to point at the client's real site later, not just this test site.
 *
 * Usage:
 *   wp eval-file seed.php data.json
 *   wp eval-file seed.php /absolute/path/to/data.json
 *
 * Reads the JSON produced by extract_data.py (PRODUCTS, BRANDS, COLS, STYLE_LIST,
 * MATERIALS, FTYPES, HINGES, NOSES, SHAPES, IMG) and creates:
 *   - product_brand terms (WooCommerce core taxonomy)
 *   - pa_colour attribute (SELECT type — see README.md "Colour/Image swatch test"
 *     for why; hex value stored on each term's _sgs_swatch_color meta, which the
 *     SGS framework already registers via Configurator_Meta, so a future SGS
 *     swatch-rendering block can read it without any new meta key)
 *   - pa_shape / pa_material / pa_frame-type / pa_hinge / pa_nose-pad global
 *     attributes + terms, from STYLE_LIST/MATERIALS/FTYPES/HINGES/NOSES
 *   - 16 variable products (SKU = the draft's product `code`, slugified), one
 *     variation per colour (no separate size axis — this catalogue has none)
 *   - UK shipping zone: flat rate £3.95, free over £75, local pickup
 *   - GBP as the store currency
 *
 * Idempotency contract: every wc_update_product()/wp_insert_term() call below is
 * preceded by a lookup (get_page_by_path / get_term_by / product SKU lookup) and
 * only creates when the lookup returns nothing — so re-running with the same
 * data.json updates in place, never duplicates. Proved by running this script
 * twice and diffing `wp post list --post_type=product` / attribute-term counts
 * (see README.md "Idempotency proof").
 *
 * @package SGS\EyeCareSeed
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit( "Run via WP-CLI: wp eval-file seed.php <path-to-data.json>\n" );
}

// ─────────────────────────────── load data ───────────────────────────────

$data_path = isset( $args[0] ) ? $args[0] : __DIR__ . '/data.json';
if ( ! file_exists( $data_path ) ) {
	echo "ERROR: data file not found: {$data_path}\n";
	exit( 1 );
}

$data = json_decode( file_get_contents( $data_path ), true );
if ( null === $data ) {
	echo "ERROR: could not parse JSON in {$data_path}\n";
	exit( 1 );
}

// Real per-product sizes, keyed by the draft's `code` field. Optional — a missing file just
// means every product falls back to its single data.json eye/bridge/temple as its one size.
$sizes_path    = dirname( $data_path ) . '/sizes-jpopticians.json';
$sizes_by_code = array();
if ( file_exists( $sizes_path ) ) {
	$sizes_data = json_decode( file_get_contents( $sizes_path ), true );
	if ( is_array( $sizes_data ) && ! empty( $sizes_data['products'] ) ) {
		foreach ( $sizes_data['products'] as $size_row ) {
			if ( isset( $size_row['code'] ) ) {
				$sizes_by_code[ $size_row['code'] ] = $size_row;
			}
		}
	}
} else {
	echo "  NOTE: sizes file not found ({$sizes_path}) — every product falls back to its single data.json size.\n";
}

$stats = array(
	'brands_created'    => 0,
	'brands_updated'    => 0,
	'attr_terms_created' => 0,
	'attr_terms_updated' => 0,
	'products_created'  => 0,
	'products_updated'  => 0,
	'variations_created' => 0,
	'variations_updated' => 0,
	'variations_deleted' => 0,
	'images_sideloaded' => 0,
	'images_skipped'    => 0,
);

// ─────────────────────────────── helpers ───────────────────────────────

/**
 * Find-or-create a term in a taxonomy by name, idempotently.
 *
 * @param string $name         Term name.
 * @param string $taxonomy     Taxonomy slug.
 * @param array  $stats        Stats accumulator (passed by reference).
 * @param string $created_key  Stats key to increment on create (default 'attr_terms_created').
 * @param string $updated_key  Stats key to increment on find (default 'attr_terms_updated').
 * @return int Term ID.
 */
function sgs_seed_find_or_create_term( string $name, string $taxonomy, array &$stats, string $created_key = 'attr_terms_created', string $updated_key = 'attr_terms_updated' ): int {
	$existing = get_term_by( 'name', $name, $taxonomy );
	if ( $existing ) {
		$stats[ $updated_key ]++;
		return (int) $existing->term_id;
	}
	$result = wp_insert_term( $name, $taxonomy );
	if ( is_wp_error( $result ) ) {
		echo "  ERROR creating term '{$name}' in {$taxonomy}: " . $result->get_error_message() . "\n";
		return 0;
	}
	$stats[ $created_key ]++;
	return (int) $result['term_id'];
}

/**
 * Find-or-create a global WooCommerce product attribute taxonomy (pa_*), idempotently.
 *
 * @param string $label Attribute label as shown in admin (e.g. "Colour").
 * @param string $slug  Attribute slug WITHOUT the pa_ prefix (e.g. "colour").
 * @return string The full taxonomy name (e.g. "pa_colour").
 */
function sgs_seed_find_or_create_attribute( string $label, string $slug ): string {
	$taxonomy = wc_attribute_taxonomy_name( $slug );

	$existing_id = wc_attribute_taxonomy_id_by_name( $taxonomy );
	if ( ! $existing_id ) {
		$attr_id = wc_create_attribute(
			array(
				'name'         => $label,
				'slug'         => $slug,
				'type'         => 'select',
				'order_by'     => 'menu_order',
				'has_archives' => false,
			)
		);
		if ( is_wp_error( $attr_id ) ) {
			echo "  ERROR creating attribute '{$label}': " . $attr_id->get_error_message() . "\n";
			return '';
		}
		echo "  Created attribute {$label} (pa_{$slug}, id={$attr_id})\n";
	}

	// Force WooCommerce to re-read wp_woocommerce_attribute_taxonomies and
	// register the taxonomy in THIS process (it normally happens on init:5,
	// which has already run before wp eval-file executes this script).
	delete_transient( 'wc_attribute_taxonomies' );
	if ( ! taxonomy_exists( $taxonomy ) ) {
		register_taxonomy(
			$taxonomy,
			apply_filters( 'woocommerce_taxonomy_objects_' . $taxonomy, array( 'product' ) ),
			apply_filters(
				'woocommerce_taxonomy_args_' . $taxonomy,
				array(
					'labels'       => array( 'name' => $label ),
					'hierarchical' => false,
					'show_ui'      => false,
					'query_var'    => true,
					'rewrite'      => false,
				)
			)
		);
	}

	return $taxonomy;
}

/**
 * Slugify a product code into a SKU-safe string.
 *
 * @param string $code Draft product `code` field, e.g. "RB3025 · 001/58".
 * @return string SKU, e.g. "RB3025-001-58".
 */
function sgs_seed_sku_from_code( string $code ): string {
	$sku = preg_replace( '/[^A-Za-z0-9]+/u', '-', $code );
	return trim( $sku, '-' );
}

/**
 * Find a product by SKU, idempotently.
 *
 * @param string $sku SKU to look up.
 * @return int Product ID, or 0 if not found.
 */
function sgs_seed_find_product_by_sku( string $sku ): int {
	$id = wc_get_product_id_by_sku( $sku );
	return $id ? (int) $id : 0;
}

/**
 * Sideload a remote image URL into the media library, idempotently keyed on
 * the source URL stored as the attachment's `_sgs_seed_source_url` meta —
 * running the seed twice re-uses the same attachment rather than duplicating.
 *
 * @param string $url          Remote image URL.
 * @param int    $post_parent  Post to attach the image to.
 * @param string $description  Alt text / description.
 * @return int Attachment ID, or 0 on failure.
 */
function sgs_seed_sideload_image( string $url, int $post_parent, string $description ): int {
	global $wpdb;
	$existing = $wpdb->get_var(
		$wpdb->prepare(
			"SELECT post_id FROM {$wpdb->postmeta} WHERE meta_key = '_sgs_seed_source_url' AND meta_value = %s LIMIT 1",
			$url
		)
	);
	if ( $existing ) {
		return (int) $existing;
	}

	require_once ABSPATH . 'wp-admin/includes/media.php';
	require_once ABSPATH . 'wp-admin/includes/file.php';
	require_once ABSPATH . 'wp-admin/includes/image.php';

	$tmp = download_url( $url );
	if ( is_wp_error( $tmp ) ) {
		echo "    Image download FAILED ({$url}): " . $tmp->get_error_message() . "\n";
		return 0;
	}

	$file_array = array(
		'name'     => sanitize_file_name( basename( wp_parse_url( $url, PHP_URL_PATH ) ) . '.jpg' ),
		'tmp_name' => $tmp,
	);

	$attachment_id = media_handle_sideload( $file_array, $post_parent, $description );
	if ( is_wp_error( $attachment_id ) ) {
		@unlink( $tmp ); // phpcs:ignore WordPress.PHP.NoSilencedErrors.Discouraged -- best-effort cleanup of a temp download.
		echo "    Image sideload FAILED ({$url}): " . $attachment_id->get_error_message() . "\n";
		return 0;
	}

	update_post_meta( $attachment_id, '_sgs_seed_source_url', $url );
	update_post_meta( $attachment_id, '_wp_attachment_image_alt', $description );

	return (int) $attachment_id;
}

/**
 * The `pa_frame-size` term slug for a given measurement triple: "<eye>-<bridge>-<temple>",
 * e.g. "55-14-135". Two frames sharing a lens width but differing in bridge/temple get
 * distinct slugs (and so distinct terms), because the slug carries all three numbers.
 *
 * @param array $size Size row with 'eye', 'bridge', 'temple' (all int).
 * @return string Term slug.
 */
function sgs_seed_size_slug( array $size ): string {
	return $size['eye'] . '-' . $size['bridge'] . '-' . $size['temple'];
}

/**
 * Find-or-create a `pa_frame-size` term for one eye/bridge/temple measurement, idempotently
 * (by slug, since two sizes can share a lens-width NAME but never a slug). The term name is
 * just the lens width ("55"); the full measurement lives on `_sgs_size_measure` term meta
 * ("55□14 135", U+25A1) for display, and `_sgs_variesby_value` = 'size' so the product
 * preflight gate's variesBy check passes.
 *
 * @param int    $eye      Lens width (mm).
 * @param int    $bridge   Bridge width (mm).
 * @param int    $temple   Temple length (mm).
 * @param string $taxonomy The `pa_frame-size` taxonomy name.
 * @param array  $stats    Stats accumulator (passed by reference).
 * @return int Term ID, or 0 on failure.
 */
function sgs_seed_find_or_create_size_term( int $eye, int $bridge, int $temple, string $taxonomy, array &$stats ): int {
	$slug    = sgs_seed_size_slug( array( 'eye' => $eye, 'bridge' => $bridge, 'temple' => $temple ) );
	$measure = $eye . '□' . $bridge . ' ' . $temple;

	$existing = get_term_by( 'slug', $slug, $taxonomy );
	if ( $existing ) {
		update_term_meta( $existing->term_id, '_sgs_size_measure', $measure );
		update_term_meta( $existing->term_id, '_sgs_variesby_value', 'size' );
		$stats['attr_terms_updated']++;
		return (int) $existing->term_id;
	}

	$result = wp_insert_term( (string) $eye, $taxonomy, array( 'slug' => $slug ) );
	if ( is_wp_error( $result ) ) {
		echo "  ERROR creating size term '{$slug}' in {$taxonomy}: " . $result->get_error_message() . "\n";
		return 0;
	}

	update_term_meta( (int) $result['term_id'], '_sgs_size_measure', $measure );
	update_term_meta( (int) $result['term_id'], '_sgs_variesby_value', 'size' );
	$stats['attr_terms_created']++;

	return (int) $result['term_id'];
}

/**
 * The sizes a product ships in, smallest lens-width first: the real sizes from
 * sizes-jpopticians.json when that product was `found` there, otherwise a single size from
 * data.json's own eye/bridge/temple fields.
 *
 * @param array $p             One data.json PRODUCTS row.
 * @param array $sizes_by_code sizes-jpopticians.json rows keyed by `code`.
 * @return array List of ['eye' => int, 'bridge' => int, 'temple' => int], smallest eye first.
 */
function sgs_seed_product_sizes( array $p, array $sizes_by_code ): array {
	$entry = $sizes_by_code[ $p['code'] ] ?? null;
	$sizes = array();

	if ( $entry && 'found' === ( $entry['status'] ?? '' ) && ! empty( $entry['sizes'] ) ) {
		foreach ( $entry['sizes'] as $size_row ) {
			$sizes[] = array(
				'eye'    => (int) $size_row['eye'],
				'bridge' => (int) $size_row['bridge'],
				'temple' => (int) $size_row['temple'],
			);
		}
	} else {
		$sizes[] = array(
			'eye'    => (int) $p['eye'],
			'bridge' => (int) $p['bridge'],
			'temple' => (int) $p['temple'],
		);
	}

	usort(
		$sizes,
		function ( $a, $b ) {
			return $a['eye'] <=> $b['eye'];
		}
	);

	return $sizes;
}

/**
 * The product's default size: the middle one of three, the first of two, or the only one.
 *
 * @param array $sizes Sizes from sgs_seed_product_sizes(), smallest first.
 * @return array The chosen ['eye' => int, 'bridge' => int, 'temple' => int].
 */
function sgs_seed_default_size( array $sizes ): array {
	if ( 3 === count( $sizes ) ) {
		return $sizes[1];
	}
	return $sizes[0];
}

// ─────────────────────────────── 1. store currency ───────────────────────────────

update_option( 'woocommerce_currency', 'GBP' );
echo "Store currency set to GBP.\n";

// ─────────────────────────────── 2. brands ───────────────────────────────

echo "\n=== Brands ===\n";
$brand_taxonomy = 'product_brand';
if ( ! taxonomy_exists( $brand_taxonomy ) ) {
	echo "  ERROR: {$brand_taxonomy} taxonomy is not registered on this WooCommerce install — brands SKIPPED.\n";
	$brand_taxonomy = '';
} else {
	foreach ( $data['BRANDS'] as $brand_row ) {
		$brand_name = $brand_row[0];
		sgs_seed_find_or_create_term( $brand_name, $brand_taxonomy, $stats, 'brands_created', 'brands_updated' );
	}
	echo '  Brands processed: ' . count( $data['BRANDS'] ) . "\n";
}

// ─────────────────────────────── 3. attributes ───────────────────────────────

echo "\n=== Attributes ===\n";

$tax_colour   = sgs_seed_find_or_create_attribute( 'Colour', 'colour' );
$tax_shape    = sgs_seed_find_or_create_attribute( 'Shape', 'shape' );
$tax_material = sgs_seed_find_or_create_attribute( 'Material', 'material' );
$tax_ftype    = sgs_seed_find_or_create_attribute( 'Frame type', 'frame-type' );
$tax_hinge    = sgs_seed_find_or_create_attribute( 'Hinge', 'hinge' );
$tax_nose     = sgs_seed_find_or_create_attribute( 'Nose pads', 'nose-pad' );
$tax_size     = sgs_seed_find_or_create_attribute( 'Frame size', 'frame-size' );

// Colour terms — name + hex, hex stored on _sgs_swatch_color (framework-standard key).
$colour_term_ids = array(); // code (e.g. 'blk') => term_id
foreach ( $data['COLS'] as $code => $pair ) {
	list( $colour_name, $hex ) = $pair;
	$term_id = sgs_seed_find_or_create_term( $colour_name, $tax_colour, $stats );
	if ( $term_id ) {
		update_term_meta( $term_id, '_sgs_swatch_color', $hex );
		// Google variesBy axis: the product preflight gate needs it before a variable product can publish.
		update_term_meta( $term_id, '_sgs_variesby_value', 'color' );
		$colour_term_ids[ $code ] = $term_id;
	}
}
echo '  Colour terms: ' . count( $colour_term_ids ) . ' (of ' . count( $data['COLS'] ) . ")\n";

$shape_term_ids = array();
foreach ( $data['STYLE_LIST'] as $shape_name ) {
	$shape_term_ids[ $shape_name ] = sgs_seed_find_or_create_term( $shape_name, $tax_shape, $stats );
}

$material_term_ids = array();
foreach ( $data['MATERIALS'] as $material_name ) {
	$material_term_ids[ $material_name ] = sgs_seed_find_or_create_term( $material_name, $tax_material, $stats );
}

$ftype_term_ids = array();
foreach ( $data['FTYPES'] as $ftype_name ) {
	$ftype_term_ids[ $ftype_name ] = sgs_seed_find_or_create_term( $ftype_name, $tax_ftype, $stats );
}

$hinge_term_ids = array();
foreach ( $data['HINGES'] as $hinge_name ) {
	$hinge_term_ids[ $hinge_name ] = sgs_seed_find_or_create_term( $hinge_name, $tax_hinge, $stats );
}

$nose_term_ids = array();
foreach ( $data['NOSES'] as $nose_name ) {
	$nose_term_ids[ $nose_name ] = sgs_seed_find_or_create_term( $nose_name, $tax_nose, $stats );
}

echo "  Shape/Material/Frame-type/Hinge/Nose-pad terms processed.\n";

/**
 * The product description, as the draft writes it (its `blurb()` plus the Description tab's four lines):
 * a paragraph on the shape, the fit of the default size and the lenses, then a list.
 *
 * @param array $p    Draft product row.
 * @param array $size The product's default size ['eye', 'bridge', 'temple'].
 * @return string Description HTML.
 */
function sgs_seed_description( array $p, array $size ): string {
	$shapes = array(
		'Pilot'     => 'The pilot shape is about as universally flattering as eyewear gets — the teardrop softens a square jaw and adds length to a rounder face.',
		'Square'    => 'A square frame gives a rounder or heart-shaped face some structure, and it is the shape most people find easiest to wear every day.',
		'Round'     => 'Round frames soften stronger, more angular features. They sit best on longer faces and they never really go out of fashion.',
		'Cat-eye'   => 'The cat-eye lifts the outer corner of the eye and draws attention upwards, which is why it flatters most face shapes.',
		'Shield'    => 'A single wrapped lens with proper coverage at the sides. Bolder than most, and genuinely better at keeping low sun out.',
		'Rectangle' => 'A narrow rectangular lens keeps the proportions quiet — a good choice if you want sunglasses nobody comments on.',
	);
	$eye  = (int) ( $size['eye'] ?? $p['eye'] );
	$fit  = 'measures ' . $eye . 'mm across each lens' . ( $eye <= 50 ? ', which is on the small side' : ( $eye >= 58 ? ', which is on the wider side' : '' ) );
	$lens = ! empty( $p['pol'] )
		? 'The lenses are polarised as standard, so glare off wet roads and water is cut rather than just dimmed.'
		: 'The lenses block 100% of UV as the brand supplies them, and I can swap in polarised if you would rather.';
	$blurb = 'The ' . $p['brand'] . ' ' . $p['name'] . ', in ' . $p['colour'] . '. ' . ( $shapes[ $p['shape'] ] ?? '' )
		. ' This size ' . $fit . '. ' . $lens . ' Prescription lenses go in this frame without any trouble — single vision or varifocal — and I cut and fit them here.';
	$lens_line = ( ! empty( $p['pol'] ) ? 'Polarised lenses, category ' : 'Tinted lenses, category ' ) . $p['lensCat'];
	$items     = array(
		$p['shape'] . ' shape in ' . $p['mat'] . ', ' . $p['colour'],
		$lens_line . ', 100% UV400',
		"Boxed with the brand's own case, cloth and two-year manufacturer's warranty — claims handled by me, not a call centre",
		'Prescription lenses available in this frame — single vision or varifocal',
	);
	return '<p>' . esc_html( $blurb ) . '</p><ul><li>' . implode( '</li><li>', array_map( 'esc_html', $items ) ) . '</li></ul>';
}

/**
 * The shared "Photo to come" image (woo-seed/photo-to-come.png), uploaded once and reused.
 *
 * @return int Attachment ID, or 0 on failure.
 */
function sgs_seed_placeholder_image(): int {
	static $id = null;
	if ( null !== $id ) {
		return $id;
	}
	$existing = get_posts(
		array(
			'post_type'   => 'attachment',
			'post_status' => 'inherit',
			'title'       => 'Photo to come',
			'numberposts' => 1,
			'fields'      => 'ids',
		)
	);
	if ( $existing ) {
		$id = (int) $existing[0];
		return $id;
	}
	require_once ABSPATH . 'wp-admin/includes/file.php';
	require_once ABSPATH . 'wp-admin/includes/media.php';
	require_once ABSPATH . 'wp-admin/includes/image.php';
	$tmp = wp_tempnam( 'photo-to-come.png' );
	copy( __DIR__ . '/photo-to-come.png', $tmp );
	$att = media_handle_sideload( array( 'name' => 'photo-to-come.png', 'tmp_name' => $tmp ), 0, 'Photo to come' );
	$id  = is_wp_error( $att ) ? 0 : (int) $att;
	if ( $id ) {
		update_post_meta( $id, '_wp_attachment_image_alt', '' );
	}
	return $id;
}

// ─────────────────────────────── 4. products ───────────────────────────────

echo "\n=== Products ===\n";

$img_skipped = array();

foreach ( $data['PRODUCTS'] as $p ) {
	$sku  = sgs_seed_sku_from_code( $p['code'] );
	// The brand is its own field (product_brand), shown by the card and product page; the title is the model name.
	$name = $p['name'];

	$product_id = sgs_seed_find_product_by_sku( $sku );
	$is_new     = ! $product_id;

	$product = $product_id ? wc_get_product( $product_id ) : new WC_Product_Variable();

	$product->set_name( $name );
	$product->set_status( 'publish' );
	$product->set_catalog_visibility( 'visible' );
	$product->set_sku( $sku );
	$product->set_description( sgs_seed_description( $p, sgs_seed_default_size( sgs_seed_product_sizes( $p, $sizes_by_code ) ) ) );
	$product->set_short_description( $p['code'] );

	// Base regular price so the parent has a displayable range even before
	// variations save; each variation gets the same price (this catalogue has
	// one price per product, not per colour).
	$product->set_regular_price( (string) $p['price'] );

	// ── sizes: the real jpopticians sizes when found, else the single data.json size ──
	$sizes                = sgs_seed_product_sizes( $p, $sizes_by_code );
	$default_size         = sgs_seed_default_size( $sizes );
	$size_slug_to_term_id = array();
	if ( $tax_size ) {
		foreach ( $sizes as $size ) {
			$term_id = sgs_seed_find_or_create_size_term( $size['eye'], $size['bridge'], $size['temple'], $tax_size, $stats );
			if ( $term_id ) {
				$size_slug_to_term_id[ sgs_seed_size_slug( $size ) ] = $term_id;
			}
		}
	}

	// ── build the colour + size attributes (variation-enabled) + the non-variation attributes ──
	$attributes = array();

	if ( $tax_colour && ! empty( $p['cols'] ) ) {
		$colour_ids_for_product = array();
		foreach ( $p['cols'] as $code ) {
			if ( isset( $colour_term_ids[ $code ] ) && $colour_term_ids[ $code ] ) {
				$colour_ids_for_product[] = $colour_term_ids[ $code ];
			}
		}
		if ( $colour_ids_for_product ) {
			$attr = new WC_Product_Attribute();
			$attr->set_id( wc_attribute_taxonomy_id_by_name( $tax_colour ) );
			$attr->set_name( $tax_colour );
			$attr->set_options( $colour_ids_for_product );
			$attr->set_visible( true );
			$attr->set_variation( true );
			$attributes[ $tax_colour ] = $attr;
		}
	}

	if ( $tax_size && $size_slug_to_term_id ) {
		$attr = new WC_Product_Attribute();
		$attr->set_id( wc_attribute_taxonomy_id_by_name( $tax_size ) );
		$attr->set_name( $tax_size );
		$attr->set_options( array_values( $size_slug_to_term_id ) );
		$attr->set_visible( true );
		$attr->set_variation( true );
		$attributes[ $tax_size ] = $attr;
	}

	$non_variation_map = array(
		array( $tax_shape, $shape_term_ids, $p['shape'] ),
		array( $tax_material, $material_term_ids, $p['mat'] ),
		array( $tax_ftype, $ftype_term_ids, $p['ftype'] ),
		array( $tax_hinge, $hinge_term_ids, $p['hinge'] ),
		array( $tax_nose, $nose_term_ids, $p['nose'] ),
	);
	foreach ( $non_variation_map as list( $tax, $term_map, $value ) ) {
		if ( $tax && isset( $term_map[ $value ] ) && $term_map[ $value ] ) {
			$attr = new WC_Product_Attribute();
			$attr->set_id( wc_attribute_taxonomy_id_by_name( $tax ) );
			$attr->set_name( $tax );
			$attr->set_options( array( $term_map[ $value ] ) );
			$attr->set_visible( true );
			$attr->set_variation( false );
			$attributes[ $tax ] = $attr;
		}
	}

	// Default selection: the product's first colour + its default size (middle of 3, first of
	// 2, the only one of 1) — what the variation-swatch UI pre-selects on page load.
	$default_attributes = array();
	if ( $tax_colour && ! empty( $p['cols'] ) && isset( $colour_term_ids[ $p['cols'][0] ] ) && $colour_term_ids[ $p['cols'][0] ] ) {
		$default_colour_term = get_term( $colour_term_ids[ $p['cols'][0] ], $tax_colour );
		if ( $default_colour_term && ! is_wp_error( $default_colour_term ) ) {
			$default_attributes[ $tax_colour ] = $default_colour_term->slug;
		}
	}
	if ( $tax_size && isset( $size_slug_to_term_id[ sgs_seed_size_slug( $default_size ) ] ) ) {
		$default_attributes[ $tax_size ] = sgs_seed_size_slug( $default_size );
	}
	$product->set_default_attributes( $default_attributes );

	$product->set_attributes( $attributes );
	$product_id = $product->save();

	// Now that we have a real ID, (re-)apply product-level meta + taxonomy terms.
	update_post_meta( $product_id, '_sgs_rrp', $p['rrp'] );
	update_post_meta( $product_id, '_sgs_frame_eye', $default_size['eye'] );
	update_post_meta( $product_id, '_sgs_frame_bridge', $default_size['bridge'] );
	update_post_meta( $product_id, '_sgs_frame_temple', $default_size['temple'] );

	if ( $brand_taxonomy ) {
		$brand_term = get_term_by( 'name', $p['brand'], $brand_taxonomy );
		if ( $brand_term ) {
			wp_set_object_terms( $product_id, array( (int) $brand_term->term_id ), $brand_taxonomy );
		}
	}
	// The draft's `pol` flag: a "Polarised" product tag (the card's attribute tag reads it).
	wp_set_object_terms( $product_id, ! empty( $p['pol'] ) ? array( 'Polarised' ) : array(), 'product_tag', false );
	// Every draft product is a pair of sunglasses (the breadcrumb reads Home / Sunglasses / <brand>).
	wp_set_object_terms( $product_id, array( 'Sunglasses' ), 'product_cat', false );

	if ( $tax_shape && isset( $shape_term_ids[ $p['shape'] ] ) ) {
		wp_set_object_terms( $product_id, array( $shape_term_ids[ $p['shape'] ] ), $tax_shape );
	}
	if ( $tax_material && isset( $material_term_ids[ $p['mat'] ] ) ) {
		wp_set_object_terms( $product_id, array( $material_term_ids[ $p['mat'] ] ), $tax_material );
	}
	if ( $tax_ftype && isset( $ftype_term_ids[ $p['ftype'] ] ) ) {
		wp_set_object_terms( $product_id, array( $ftype_term_ids[ $p['ftype'] ] ), $tax_ftype );
	}
	if ( $tax_hinge && isset( $hinge_term_ids[ $p['hinge'] ] ) ) {
		wp_set_object_terms( $product_id, array( $hinge_term_ids[ $p['hinge'] ] ), $tax_hinge );
	}
	if ( $tax_nose && isset( $nose_term_ids[ $p['nose'] ] ) ) {
		wp_set_object_terms( $product_id, array( $nose_term_ids[ $p['nose'] ] ), $tax_nose );
	}
	if ( $tax_colour && ! empty( $p['cols'] ) ) {
		$colour_ids_for_product = array();
		foreach ( $p['cols'] as $code ) {
			if ( isset( $colour_term_ids[ $code ] ) && $colour_term_ids[ $code ] ) {
				$colour_ids_for_product[] = $colour_term_ids[ $code ];
			}
		}
		wp_set_object_terms( $product_id, $colour_ids_for_product, $tax_colour );
	}
	if ( $tax_size && $size_slug_to_term_id ) {
		wp_set_object_terms( $product_id, array_values( $size_slug_to_term_id ), $tax_size );
	}

	// ── image: sideload if the draft names one, else skip + report ──
	if ( ! empty( $p['img'] ) && isset( $data['IMG'][ $p['img'] ] ) ) {
		$image_url = $data['IMG'][ $p['img'] ];
		$att_id    = sgs_seed_sideload_image( $image_url, $product_id, $p['alt'] ?? $name );
		if ( $att_id ) {
			set_post_thumbnail( $product_id, $att_id );
			$stats['images_sideloaded']++;
		}
	} else {
		// No draft photo: the shared "Photo to come" image (the draft's own placeholder tile), so the
		// product preflight gate (a variable product needs an image) lets it publish.
		$placeholder_id = sgs_seed_placeholder_image();
		if ( $placeholder_id ) {
			set_post_thumbnail( $product_id, $placeholder_id );
		}
		$img_skipped[] = $sku . ' (' . $name . ') - placeholder';
		$stats['images_skipped']++;
	}

	// ── variations: one per colour × size ──
	if ( $tax_colour && ! empty( $p['cols'] ) && $tax_size && $size_slug_to_term_id ) {
		$existing_variation_ids = $product->get_children();
		$existing_by_pair       = array(); // "colour_slug|size_slug" => variation id.
		foreach ( $existing_variation_ids as $vid ) {
			$vattrs      = wc_get_product( $vid )->get_attributes();
			$colour_slug = $vattrs[ $tax_colour ] ?? '';
			$size_slug   = $vattrs[ $tax_size ] ?? '';
			if ( $colour_slug && $size_slug ) {
				$existing_by_pair[ $colour_slug . '|' . $size_slug ] = $vid;
			}
		}

		$wanted_pairs = array();

		foreach ( $p['cols'] as $code ) {
			if ( ! isset( $colour_term_ids[ $code ] ) || ! $colour_term_ids[ $code ] ) {
				continue;
			}
			$colour_term = get_term( $colour_term_ids[ $code ], $tax_colour );
			$colour_slug = $colour_term->slug;

			foreach ( $sizes as $size ) {
				$size_slug = sgs_seed_size_slug( $size );
				if ( ! isset( $size_slug_to_term_id[ $size_slug ] ) ) {
					continue;
				}
				$pair_key       = $colour_slug . '|' . $size_slug;
				$wanted_pairs[] = $pair_key;

				$existing_variation_id = $existing_by_pair[ $pair_key ] ?? 0;
				$variation              = $existing_variation_id ? wc_get_product( $existing_variation_id ) : new WC_Product_Variation();
				$variation->set_parent_id( $product_id );
				$variation->set_regular_price( (string) $p['price'] );
				$variation->set_sku( $sku . '-' . $colour_slug . '-' . $size_slug );
				$variation->set_attributes(
					array(
						$tax_colour => $colour_slug,
						$tax_size   => $size_slug,
					)
				);
				$variation->set_status( 'publish' );
				$variation_id = $variation->save();

				update_post_meta( $variation_id, '_sgs_frame_eye', $size['eye'] );
				update_post_meta( $variation_id, '_sgs_frame_bridge', $size['bridge'] );
				update_post_meta( $variation_id, '_sgs_frame_temple', $size['temple'] );

				if ( $existing_variation_id ) {
					$stats['variations_updated']++;
				} else {
					$stats['variations_created']++;
				}
			}
		}

		// Delete any child variation whose (colour, size) pair is no longer wanted — e.g. the
		// old colour-only variations from before pa_frame-size existed, which have no size value.
		foreach ( $existing_variation_ids as $vid ) {
			$vattrs      = wc_get_product( $vid )->get_attributes();
			$colour_slug = $vattrs[ $tax_colour ] ?? '';
			$size_slug   = $vattrs[ $tax_size ] ?? '';
			$pair_key    = $colour_slug . '|' . $size_slug;
			if ( ! in_array( $pair_key, $wanted_pairs, true ) ) {
				wp_delete_post( $vid, true );
				$stats['variations_deleted']++;
			}
		}
	}

	// Sync the parent's price range / variation cache now variations exist.
	$product = wc_get_product( $product_id );
	if ( $product && $product->is_type( 'variable' ) ) {
		$product->save();
		WC_Product_Variable::sync( $product_id );
	}

	if ( $is_new ) {
		$stats['products_created']++;
		echo "  Created: {$name} (SKU {$sku}, id={$product_id})\n";
	} else {
		$stats['products_updated']++;
		echo "  Updated: {$name} (SKU {$sku}, id={$product_id})\n";
	}

	// Publish last, once variations, colour mappings and the image exist: the product preflight
	// gate reverts a variable product to draft if it publishes without them.
	wp_update_post(
		array(
			'ID'          => $product_id,
			'post_status' => 'publish',
		)
	);
	if ( 'publish' !== get_post_status( $product_id ) ) {
		echo "  NOT PUBLISHED (preflight): {$name} " . wp_json_encode( get_post_meta( $product_id, '_sgs_preflight_issues', true ) ) . "\n";
	}
}

// ─────────────────────────────── 5. shipping ───────────────────────────────

echo "\n=== Shipping ===\n";

// Find-or-create the "United Kingdom" zone.
$zone_id = 0;
foreach ( WC_Shipping_Zones::get_zones() as $z ) {
	if ( 'United Kingdom' === $z['zone_name'] ) {
		$zone_id = (int) $z['id'];
		break;
	}
}
if ( ! $zone_id ) {
	$zone = new WC_Shipping_Zone();
	$zone->set_zone_name( 'United Kingdom' );
	$zone->set_zone_order( 0 );
	$zone_id = $zone->save();
	echo "  Created shipping zone 'United Kingdom' (id={$zone_id})\n";
} else {
	echo "  Found existing shipping zone 'United Kingdom' (id={$zone_id})\n";
	$zone = new WC_Shipping_Zone( $zone_id );
}

$zone->set_locations( array( array( 'code' => 'GB', 'type' => 'country' ) ) );
$zone->save();

$existing_methods = $zone->get_shipping_methods();
$has_flat_rate     = false;
$has_free_shipping = false;
$has_local_pickup   = false;
foreach ( $existing_methods as $m ) {
	if ( 'flat_rate' === $m->id ) {
		$has_flat_rate = true;
	}
	if ( 'free_shipping' === $m->id ) {
		$has_free_shipping = true;
	}
	if ( 'local_pickup' === $m->id || 'pickup_location' === $m->id ) {
		$has_local_pickup = $m->id;
	}
}

if ( ! $has_flat_rate ) {
	$instance_id = $zone->add_shipping_method( 'flat_rate' );
	$flat        = new WC_Shipping_Flat_Rate( $instance_id );
	$flat->update_option( 'cost', '3.95' );
	$flat->update_option( 'title', 'Standard delivery' );
	echo "  Added Flat rate: £3.95 (instance {$instance_id})\n";
} else {
	echo "  Flat rate already present — left as-is (re-run does not duplicate).\n";
}

if ( ! $has_free_shipping ) {
	$instance_id = $zone->add_shipping_method( 'free_shipping' );
	$free        = new WC_Shipping_Free_Shipping( $instance_id );
	$free->update_option( 'requires', 'min_amount' );
	$free->update_option( 'min_amount', '75' );
	$free->update_option( 'title', 'Free UK delivery' );
	echo "  Added Free shipping: over £75 (instance {$instance_id})\n";
} else {
	echo "  Free shipping already present — left as-is.\n";
}

// Which local-pickup method does this WooCommerce version actually ship AS A
// ZONE METHOD? Both 'local_pickup' (legacy) and 'pickup_location' (the newer
// block-checkout Pickup Location feature) are REGISTERED as WC_Shipping_Method
// classes on WC 11.1.1 — but only one of them declares 'shipping-zones'
// support, which is what WC_Shipping_Zone::add_shipping_method() requires.
// On this install 'pickup_location' supports only [ 'settings', 'local-pickup' ]
// (it is configured globally under WooCommerce > Settings > Shipping > Pickup
// Location, not per zone) and 'woocommerce_feature_local_pickup_enabled' is
// OFF, so a zone-method add of 'pickup_location' silently no-ops (instance id
// 0, never appears in the zone). Detecting by "does the class exist" alone —
// as an earlier version of this script did — produces exactly that silent
// failure. Checking `supports` for 'shipping-zones' is what actually predicts
// whether add_shipping_method() will work.
$available_methods = WC()->shipping()->get_shipping_methods();
$pickup_method_id  = 'local_pickup';
if (
	isset( $available_methods['pickup_location'] )
	&& in_array( 'shipping-zones', (array) $available_methods['pickup_location']->supports, true )
) {
	$pickup_method_id = 'pickup_location';
}

if ( ! $has_local_pickup ) {
	$instance_id = $zone->add_shipping_method( $pickup_method_id );
	if ( $instance_id ) {
		echo "  Added {$pickup_method_id} (instance {$instance_id})\n";
	} else {
		echo "  FAILED to add {$pickup_method_id} as a zone method — it does not declare 'shipping-zones' support.\n";
	}
} else {
	echo "  {$has_local_pickup} already present — left as-is.\n";
}

// ─────────────────────────────── summary ───────────────────────────────

echo "\n=== Summary ===\n";
foreach ( $stats as $key => $value ) {
	echo "  {$key}: {$value}\n";
}

if ( $img_skipped ) {
	echo "\n  Images SKIPPED (no fetchable draft image for this product):\n";
	foreach ( $img_skipped as $line ) {
		echo "    - {$line}\n";
	}
}

echo "\nDone.\n";
