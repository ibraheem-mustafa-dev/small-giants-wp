<?php
/**
 * Read-only export: every post with content (any post type) as JSON, for the Custom CSS census and detector.
 *
 * Revisions, autosaves, auto-drafts, trash, attachments and menu items are skipped. For a template or template part the
 * row also carries the theme slug.
 *
 * Run: wp eval-file export-posts.php <output-json-path>
 *
 * @package SGS
 */

global $wpdb;

// phpcs:ignore WordPress.WP.GlobalVariablesOverride.Prohibited -- eval-file hands the command-line arguments over as $args.
$sgs_export_path = isset( $args[0] ) ? $args[0] : '';
if ( '' === $sgs_export_path ) {
	WP_CLI::error( 'Give the output JSON path as the first argument.' );
}

// phpcs:ignore WordPress.DB.DirectDatabaseQuery -- a read-only export of the posts table.
$sgs_export_rows = $wpdb->get_results(
	"SELECT p.ID, p.post_type, p.post_status, p.post_title, p.post_name, p.post_content, p.post_parent
	FROM {$wpdb->posts} p
	WHERE p.post_type NOT IN ('revision','nav_menu_item','attachment')
	AND p.post_status NOT IN ('auto-draft','trash','inherit')
	AND p.post_content <> ''
	ORDER BY p.ID",
	ARRAY_A
);

foreach ( $sgs_export_rows as &$sgs_export_row ) {
	$sgs_export_row['theme'] = '';
	if ( in_array( $sgs_export_row['post_type'], array( 'wp_template', 'wp_template_part' ), true ) ) {
		// phpcs:ignore WordPress.DB.DirectDatabaseQuery -- read-only.
		$sgs_export_row['theme'] = (string) $wpdb->get_var(
			$wpdb->prepare(
				"SELECT t.slug FROM {$wpdb->term_relationships} tr
				JOIN {$wpdb->term_taxonomy} tt ON tt.term_taxonomy_id = tr.term_taxonomy_id AND tt.taxonomy = 'wp_theme'
				JOIN {$wpdb->terms} t ON t.term_id = tt.term_id
				WHERE tr.object_id = %d",
				$sgs_export_row['ID']
			)
		);
	}
}
unset( $sgs_export_row );

// phpcs:ignore WordPress.WP.AlternativeFunctions.file_system_operations_file_put_contents -- a scratch file outside the site.
file_put_contents( $sgs_export_path, wp_json_encode( $sgs_export_rows, JSON_UNESCAPED_UNICODE | JSON_INVALID_UTF8_SUBSTITUTE ) );
echo count( $sgs_export_rows ) . " posts\n";
