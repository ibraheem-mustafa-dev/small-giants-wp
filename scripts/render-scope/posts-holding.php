<?php
/**
 * Read only: the saved posts of this site whose content holds one of the named blocks, as one JSON line.
 * Run by scripts/render-scope/render-scope.py: wp eval-file posts-holding.php sgs/accordion sgs/hero
 *
 * A reusable block or pattern holding the block is listed too (its type is not `page`), so a page that only
 * references it is never missed: render-scope.py treats any non-page post as the whole site.
 */

global $wpdb;
$found = array();
$front = (int) get_option( 'page_on_front' );
foreach ( $args as $block ) {
	if ( ! preg_match( '#^[a-z0-9-]+/[a-z0-9-]+$#', $block ) ) {
		continue;
	}
	// Every form of a block's opening comment has a space after its name, so `sgs/accordion` never matches `sgs/accordion-item`.
	foreach ( array( '<!-- wp:' . $block . ' ' ) as $opener ) {
		$rows = $wpdb->get_results(
			$wpdb->prepare(
				"SELECT ID, post_type, post_name FROM {$wpdb->posts} WHERE post_content LIKE %s AND post_status IN ('publish','private') AND post_type <> 'revision'",
				'%' . $wpdb->esc_like( $opener ) . '%'
			)
		);
		foreach ( $rows as $row ) {
			$found[ (int) $row->ID ] = array(
				'type'  => $row->post_type,
				'name'  => $row->post_name,
				'id'    => (int) $row->ID,
				'front' => (int) $row->ID === $front,
			);
		}
	}
}
echo wp_json_encode( array_values( $found ) ) . "\n";
