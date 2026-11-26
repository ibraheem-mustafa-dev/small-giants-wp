<?php
/**
 * WP-CLI read-only dump: every saved post that holds an SGS block, one JSON object per line.
 *
 * The surveys and checks that count saved instances of a block's attribute across a site (survey-commerce-saved-content.py) read
 * this file instead of querying the database themselves, so one scanner reads a mirror's rows, a repo tree and a backup alike.
 * It reads `post_content` of every row in the posts table except revisions and auto drafts (pages, posts, `wp_template`,
 * `wp_template_part`, `wp_block`, `wp_navigation` and the plugin's own post types), and writes nothing to the database.
 *
 * Run (positional argument: the output file, which the script overwrites):
 *   wp eval-file wp-content/plugins/sgs-blocks/scripts/dump-sgs-posts.php /path/to/posts.jsonl --allow-root
 *
 * @package SGS\Blocks
 */

if ( ! defined( 'ABSPATH' ) || ! defined( 'WP_CLI' ) ) {
	exit;
}

$sgs_dump_out = isset( $args[0] ) ? (string) $args[0] : '';
if ( '' === $sgs_dump_out ) {
	WP_CLI::error( 'Pass the output file as the first argument.' );
}

global $wpdb;
$sgs_dump_ids = $wpdb->get_col( "SELECT ID FROM {$wpdb->posts} WHERE post_content LIKE '%wp:sgs/%' AND post_type NOT IN ('revision','auto-draft') ORDER BY ID" ); // phpcs:ignore WordPress.DB.DirectDatabaseQuery
$sgs_dump_fh  = fopen( $sgs_dump_out, 'w' ); // phpcs:ignore WordPress.WP.AlternativeFunctions.file_system_operations_fopen
if ( false === $sgs_dump_fh ) {
	WP_CLI::error( 'Cannot write ' . $sgs_dump_out );
}
$sgs_dump_n = 0;
foreach ( $sgs_dump_ids as $sgs_dump_id ) {
	$sgs_dump_row = $wpdb->get_row( $wpdb->prepare( "SELECT ID, post_type, post_status, post_title, post_content FROM {$wpdb->posts} WHERE ID = %d", (int) $sgs_dump_id ), ARRAY_A ); // phpcs:ignore WordPress.DB.DirectDatabaseQuery
	fwrite( $sgs_dump_fh, wp_json_encode( $sgs_dump_row ) . "\n" ); // phpcs:ignore WordPress.WP.AlternativeFunctions.file_system_operations_fwrite
	++$sgs_dump_n;
}
fclose( $sgs_dump_fh ); // phpcs:ignore WordPress.WP.AlternativeFunctions.file_system_operations_fclose
WP_CLI::success( $sgs_dump_n . ' posts dumped to ' . $sgs_dump_out );
