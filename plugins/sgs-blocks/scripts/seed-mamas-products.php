<?php
/**
 * Seed script — Mama's Munches reference products (Spec 24 Phase A).
 *
 * Creates 2 `sgs_product` posts if they do not already exist (idempotent —
 * checked by post slug). Safe to run multiple times; existing posts are left
 * unchanged.
 *
 * Usage (run after deploying the plugin):
 *
 *   wp eval-file plugins/sgs-blocks/scripts/seed-mamas-products.php
 *
 * Run from the WordPress root directory (the directory containing wp-load.php).
 * The `wp` binary must be on your PATH and pointed at the target site.
 *
 * @package SGS\Blocks
 */

// Abort if accessed directly (not via WP-CLI / wp eval-file).
if ( ! defined( 'ABSPATH' ) ) {
	echo "This script must be run via WP-CLI: wp eval-file seed-mamas-products.php\n";
	exit( 1 );
}

// ---------------------------------------------------------------------------
// Helper: create a product post if it does not already exist.
// Returns the post ID (existing or new) and a status string.
// ---------------------------------------------------------------------------

/**
 * Ensure a product post exists; create it if not.
 *
 * @param  string $slug      Post slug (used as uniqueness key).
 * @param  string $title     Post title.
 * @param  array  $meta      Associative array of meta_key => meta_value.
 * @return array{ id: int, status: string }
 */
function sgs_seed_product( string $slug, string $title, array $meta ): array {
	// Check by slug first.
	$existing = get_page_by_path( $slug, OBJECT, 'sgs_product' );

	if ( $existing ) {
		return array(
			'id'     => (int) $existing->ID,
			'status' => 'already_exists',
		);
	}

	$post_id = wp_insert_post(
		array(
			'post_type'   => 'sgs_product',
			'post_title'  => $title,
			'post_name'   => $slug,
			'post_status' => 'publish',
		),
		true // Return WP_Error on failure.
	);

	if ( is_wp_error( $post_id ) ) {
		return array(
			'id'     => 0,
			'status' => 'error: ' . $post_id->get_error_message(),
		);
	}

	foreach ( $meta as $key => $value ) {
		update_post_meta( $post_id, $key, $value );
	}

	return array(
		'id'     => (int) $post_id,
		'status' => 'created',
	);
}

// ---------------------------------------------------------------------------
// Product 1 — Mama's Munches Zookies
// ---------------------------------------------------------------------------

$zookies_pack_options = wp_json_encode(
	array(
		array(
			'label'   => '8-pack',
			'qty'     => 8,
			'price'   => 10.00,
			'default' => false,
		),
		array(
			'label'   => '12-pack',
			'qty'     => 12,
			'price'   => 14.00,
			'default' => true, // Default / pre-selected option.
		),
		array(
			'label'   => '20-pack',
			'qty'     => 20,
			'price'   => 22.00,
			'default' => false,
		),
		array(
			'label'   => '30-pack',
			'qty'     => 30,
			'price'   => 30.00,
			'default' => false,
		),
	)
);

$result_zookies = sgs_seed_product(
	'mamas-munches-zookies',
	"Mama's Munches Zookies",
	array(
		'sgs_price'        => 10.00,
		'sgs_price_note'   => 'from',
		'sgs_featured'     => true,
		'sgs_badge'        => 'Best value',
		'sgs_description'  => "Baked fresh every week and posted the same day. Oats, brewer's yeast, flaxseed, fenugreek — no shortcuts, no preservatives.",
		'sgs_pack_options' => $zookies_pack_options,
		'sgs_views'        => 0,
	)
);

WP_CLI::log( "Product 1 — Mama's Munches Zookies: " . $result_zookies['status'] . ' (ID ' . (int) $result_zookies['id'] . ')' );

// ---------------------------------------------------------------------------
// Product 2 — The Trial Pack
// ---------------------------------------------------------------------------

$result_trial = sgs_seed_product(
	'the-trial-pack',
	'The Trial Pack',
	array(
		'sgs_price'        => 5.00,
		'sgs_price_note'   => '3 Classic Zookies · postage included',
		'sgs_featured'     => false,
		'sgs_badge'        => 'New? Start here',
		'sgs_description'  => 'Not sure yet? Try 3 Classic Zookies and see what all the mums are talking about. Postage included.',
		'sgs_pack_options' => '', // Single item — no pack options.
		'sgs_views'        => 0,
	)
);

WP_CLI::log( 'Product 2 — The Trial Pack: ' . $result_trial['status'] . ' (ID ' . (int) $result_trial['id'] . ')' );

// ---------------------------------------------------------------------------
// Summary
// ---------------------------------------------------------------------------

$created = array_filter(
	array( $result_zookies, $result_trial ),
	static function ( array $r ): bool {
		return 'created' === $r['status'];
	}
);

$existing = array_filter(
	array( $result_zookies, $result_trial ),
	static function ( array $r ): bool {
		return 'already_exists' === $r['status'];
	}
);

WP_CLI::log( '' );
WP_CLI::log( 'Done. ' . count( $created ) . ' created, ' . count( $existing ) . ' already existed.' );

if ( ! empty( $created ) ) {
	WP_CLI::log( 'Flush permalinks after seeding: wp rewrite flush' );
}
