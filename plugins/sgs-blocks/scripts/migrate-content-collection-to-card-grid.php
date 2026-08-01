<?php
/**
 * Migrate `sgs/content-collection` blocks to `sgs/card-grid` (source = cpt-collection).
 *
 * WHY THIS IS A SCRIPT AND NOT A DEPRECATION
 * ------------------------------------------
 * Bean locked "no block version bumps and no deprecations pre-production" (D293),
 * so the fold cannot rely on a `deprecated.js` transform. Instead:
 *
 *   1. `sgs/content-collection` REMAINS REGISTERED and REMAINS RENDERING. Every
 *      existing page keeps working with no action at all. Nothing is orphaned.
 *   2. Both blocks now execute the SAME query engine
 *      (includes/class-cpt-collection-query.php), so a migrated block and an
 *      unmigrated one cannot produce different results.
 *   3. This script rewrites saved post content when — and only when — you choose
 *      to run it. It is opt-in and reversible from a database backup.
 *
 * USAGE (from the WordPress root, over SSH):
 *
 *   wp eval-file path/to/migrate-content-collection-to-card-grid.php
 *       → DRY RUN. Reports what would change. Writes nothing.
 *
 *   wp eval-file path/to/migrate-content-collection-to-card-grid.php apply
 *       → Performs the rewrite.
 *
 * WHAT IT DOES TO EACH BLOCK
 * --------------------------
 * The attribute names were deliberately kept identical across the fold, so the
 * map is close to an identity. Two adjustments are required and are applied
 * explicitly rather than left to chance:
 *
 *   - `source` is set to 'cpt-collection' (without it card-grid renders manual
 *     items, i.e. nothing).
 *   - `gap` is pinned to its EXISTING value, defaulting to '' when the block
 *     never set one. content-collection's gap default is '' (no gap) but
 *     card-grid's is '30', so an absent gap would silently gain 30px spacing.
 *   - `wrap` is dropped when boolean: content-collection typed it boolean,
 *     card-grid types it string, and WordPress coerces a type-mismatched value
 *     back to the default anyway (a silent no-op that is clearer removed).
 *
 * Only the self-closing form `<!-- wp:sgs/content-collection {…} /-->` is
 * rewritten — content-collection is a dynamic block with `save: null`, so that
 * is the only form it saves. Any other form is reported and skipped rather than
 * guessed at.
 *
 * @package SGS\Blocks
 */

defined( 'ABSPATH' ) || exit;

if ( ! defined( 'WP_CLI' ) || ! WP_CLI ) {
	exit( "This script must be run through WP-CLI: wp eval-file <this-file> [apply]\n" );
}

global $wpdb, $argv;

$sgs_mc_apply = in_array( 'apply', (array) ( $args ?? array() ), true )
	|| in_array( 'apply', (array) $argv, true );

$sgs_mc_mode = $sgs_mc_apply ? 'APPLY' : 'DRY RUN';
WP_CLI::log( "Mode: {$sgs_mc_mode}" );
WP_CLI::log( '' );

// Find every post whose content mentions the block. LIKE is sufficient — the
// regex below decides what actually gets rewritten.
$sgs_mc_rows = $wpdb->get_results(
	"SELECT ID, post_type, post_title, post_content
	   FROM {$wpdb->posts}
	  WHERE post_content LIKE '%wp:sgs/content-collection%'
	    AND post_status NOT IN ( 'trash', 'auto-draft' )"
);

if ( empty( $sgs_mc_rows ) ) {
	WP_CLI::success( 'No posts contain sgs/content-collection. Nothing to migrate.' );
	return;
}

/**
 * Rewrite one block delimiter's attribute JSON.
 *
 * @param array $attrs Decoded attributes from the block comment.
 * @return array Attributes for the sgs/card-grid replacement.
 */
$sgs_mc_map_attrs = static function ( array $attrs ): array {
	$attrs['source'] = 'cpt-collection';

	// Pin gap: card-grid defaults to '30', content-collection to ''.
	if ( ! array_key_exists( 'gap', $attrs ) ) {
		$attrs['gap'] = '';
	}

	// Drop the type-mismatched boolean `wrap` (string on card-grid).
	if ( array_key_exists( 'wrap', $attrs ) && is_bool( $attrs['wrap'] ) ) {
		unset( $attrs['wrap'] );
	}

	return $attrs;
};

$sgs_mc_total_blocks = 0;
$sgs_mc_total_posts  = 0;
$sgs_mc_skipped      = array();

foreach ( $sgs_mc_rows as $sgs_mc_row ) {
	$sgs_mc_content = $sgs_mc_row->post_content;
	$sgs_mc_count   = 0;

	// Non-self-closing occurrences are not something this script should guess at.
	if ( preg_match( '#<!--\s+wp:sgs/content-collection(\s+\{.*?\})?\s+-->#s', $sgs_mc_content ) ) {
		$sgs_mc_skipped[] = sprintf(
			'#%d (%s) — contains a non-self-closing sgs/content-collection block; left untouched.',
			$sgs_mc_row->ID,
			$sgs_mc_row->post_title
		);
		continue;
	}

	$sgs_mc_new = preg_replace_callback(
		'#<!--\s+wp:sgs/content-collection(\s+(\{.*?\}))?\s+/-->#s',
		static function ( $m ) use ( $sgs_mc_map_attrs, &$sgs_mc_count ) {
			$attrs = array();
			if ( ! empty( $m[2] ) ) {
				$decoded = json_decode( $m[2], true );
				if ( ! is_array( $decoded ) ) {
					// Undecodable JSON — return the original untouched.
					return $m[0];
				}
				$attrs = $decoded;
			}

			$attrs = $sgs_mc_map_attrs( $attrs );
			++$sgs_mc_count;

			return '<!-- wp:sgs/card-grid ' . wp_json_encode( $attrs ) . ' /-->';
		},
		$sgs_mc_content
	);

	if ( 0 === $sgs_mc_count || null === $sgs_mc_new ) {
		continue;
	}

	$sgs_mc_total_blocks += $sgs_mc_count;
	++$sgs_mc_total_posts;

	WP_CLI::log(
		sprintf(
			'%s #%d (%s) "%s" — %d block(s)',
			$sgs_mc_apply ? 'MIGRATED' : 'would migrate',
			$sgs_mc_row->ID,
			$sgs_mc_row->post_type,
			$sgs_mc_row->post_title,
			$sgs_mc_count
		)
	);

	if ( $sgs_mc_apply ) {
		// wp_update_post() runs kses on the content for non-privileged users and
		// would strip block comments; a direct, prepared update is the correct
		// tool for a structural content rewrite run by an administrator on CLI.
		$sgs_mc_updated = $wpdb->update(
			$wpdb->posts,
			array( 'post_content' => $sgs_mc_new ),
			array( 'ID' => $sgs_mc_row->ID ),
			array( '%s' ),
			array( '%d' )
		);

		if ( false === $sgs_mc_updated ) {
			WP_CLI::warning( "  Database update FAILED for #{$sgs_mc_row->ID} — left unchanged." );
		} else {
			clean_post_cache( $sgs_mc_row->ID );
		}
	}
}

WP_CLI::log( '' );

foreach ( $sgs_mc_skipped as $sgs_mc_skip ) {
	WP_CLI::warning( 'SKIPPED ' . $sgs_mc_skip );
}

WP_CLI::log(
	sprintf(
		'%d block(s) across %d post(s).',
		$sgs_mc_total_blocks,
		$sgs_mc_total_posts
	)
);

if ( $sgs_mc_apply ) {
	WP_CLI::success( 'Migration applied. Check a migrated page before purging caches.' );
} else {
	WP_CLI::success( 'Dry run complete. Re-run with the "apply" argument to write changes.' );
}
