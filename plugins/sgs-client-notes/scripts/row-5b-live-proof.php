<?php
/**
 * Row 5b live proof: sgs-client-notes on a real site (unified-email plan,
 * Spec 04) — creating and resolving a note each sends a real email through
 * wp_mail()/FluentSMTP.
 *
 * Run with WP-CLI on a test site (never a client's live shop):
 *   wp eval-file row-5b-live-proof.php <post_id>
 *
 * A REAL send happens here — sandybrown's mail redirect
 * (provision-site-mail.py --redirect-all-to) is left in place, so both
 * emails land at Bean's Gmail rather than the real Site Info address. The
 * note this script creates is deleted in a `finally` block either way.
 *
 * @package SGS\ClientNotes
 */

// phpcs:disable WordPress.NamingConventions.PrefixAllGlobals

use SGS\ClientNotes\API\Rest_Notes;

global $wpdb;

$target_post_id = absint( $args[0] ?? 0 );
if ( ! $target_post_id || ! get_post( $target_post_id ) ) {
	WP_CLI::error( 'Usage: wp eval-file row-5b-live-proof.php <post_id>' );
}

if ( '' === (string) get_option( 'sgs_client_notes_notification_email', '' ) ) {
	WP_CLI::error( 'sgs_client_notes_notification_email is empty — set it before running this proof.' );
}

$table   = $wpdb->prefix . 'sgs_client_notes';
$note_id = null;

try {
	$controller = new Rest_Notes();

	$create_req = new WP_REST_Request( 'POST', '/sgs-client-notes/v1/notes' );
	$create_req->set_param( 'post_id', $target_post_id );
	$create_req->set_param( 'selector', '.row-5b-proof' );
	$create_req->set_param( 'xpath', '/html/body' );
	$create_req->set_param( 'offset_x', 10 );
	$create_req->set_param( 'offset_y', 10 );
	$create_req->set_param( 'viewport_width', 1440 );
	$create_req->set_param( 'comment', 'Row 5b live proof — safe to delete.' );
	$create_req->set_param( 'priority', 'low' );
	$create_req->set_param( 'page_url', get_permalink( $target_post_id ) );
	$create_req->set_param( 'element_text', 'Row 5b live proof' );

	$created = $controller->create_item( $create_req );
	if ( is_wp_error( $created ) ) {
		WP_CLI::error( 'create_item failed: ' . $created->get_error_message() );
	}
	$note_id = (int) $created->get_data()['id'];
	WP_CLI::log( "Created note {$note_id} — check FluentSMTP's log for a 'created' notification just now." );

	$update_req = new WP_REST_Request( 'PATCH', "/sgs-client-notes/v1/notes/{$note_id}" );
	$update_req->set_param( 'id', $note_id );
	$update_req->set_param( 'status', 'resolved' );

	$updated = $controller->update_item( $update_req );
	if ( is_wp_error( $updated ) ) {
		WP_CLI::error( 'update_item failed: ' . $updated->get_error_message() );
	}
	WP_CLI::success( "Resolved note {$note_id} — check FluentSMTP's log for a 'resolved' notification just now." );
} finally {
	if ( $note_id ) {
		$wpdb->delete( $table, array( 'id' => $note_id ) );
		WP_CLI::log( "Deleted proof note {$note_id}." );
	}
}
