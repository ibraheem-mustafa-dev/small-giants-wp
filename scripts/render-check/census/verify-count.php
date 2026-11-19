<?php
/**
 * Independent recount of sgsCustomCss per post (read-only), by WordPress's own block parser.
 *
 * Prints one tab-separated line per post that holds any (ID, type, slug, attributes, characters, bytes), then a TOTAL line:
 * TOTAL, posts searched, attribute count, character count, byte count. Characters are UTF-8 characters, as the census counts them.
 *
 * Run: wp eval-file verify-count.php
 *
 * @package SGS
 */

// phpcs:disable WordPress.Security.EscapeOutput -- command-line output read by a script, not HTML.

global $wpdb;

// phpcs:ignore WordPress.DB.DirectDatabaseQuery -- a read-only recount.
$sgs_verify_rows      = $wpdb->get_results(
	"SELECT ID, post_type, post_name, post_content FROM {$wpdb->posts}
	WHERE post_status IN ('publish','draft','private')
	AND post_type NOT IN ('revision','nav_menu_item','attachment')
	AND post_content LIKE '%sgsCustomCss%'"
);
$sgs_verify_total     = 0;
$sgs_verify_all_bytes = 0;
$sgs_verify_count     = 0;
$sgs_verify_chars     = 0;
$sgs_verify_bytes     = 0;
$sgs_verify_found     = 0;
$sgs_verify_walk      = function ( $blocks ) use ( &$sgs_verify_walk, &$sgs_verify_chars, &$sgs_verify_bytes, &$sgs_verify_found ) {
	foreach ( $blocks as $block ) {
		if ( ! empty( $block['attrs']['sgsCustomCss'] ) ) {
			$sgs_verify_chars += mb_strlen( $block['attrs']['sgsCustomCss'], 'UTF-8' );
			$sgs_verify_bytes += strlen( $block['attrs']['sgsCustomCss'] );
			++$sgs_verify_found;
		}
		if ( ! empty( $block['innerBlocks'] ) ) {
			$sgs_verify_walk( $block['innerBlocks'] );
		}
	}
};
foreach ( $sgs_verify_rows as $sgs_verify_row ) {
	$sgs_verify_chars = 0;
	$sgs_verify_bytes = 0;
	$sgs_verify_found = 0;
	$sgs_verify_walk( parse_blocks( $sgs_verify_row->post_content ) );
	if ( $sgs_verify_found ) {
		echo "{$sgs_verify_row->ID}\t{$sgs_verify_row->post_type}\t{$sgs_verify_row->post_name}\t{$sgs_verify_found}\t{$sgs_verify_chars}\t{$sgs_verify_bytes}\n";
		$sgs_verify_total     += $sgs_verify_chars;
		$sgs_verify_all_bytes += $sgs_verify_bytes;
		$sgs_verify_count     += $sgs_verify_found;
	}
}
echo "TOTAL\t" . count( $sgs_verify_rows ) . " posts\t{$sgs_verify_count} blocks\t{$sgs_verify_total} chars\t{$sgs_verify_all_bytes} bytes\n";
