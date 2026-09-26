<?php
/**
 * Row 5b reply-email live proof: an admin reply on a note the QA user
 * created emails the note's author (Spec 05 item 5, unified-email plan).
 *
 * Run with WP-CLI on a test site (never a client's live shop):
 *   wp eval-file row-5b-reply-live-proof.php <post_id> <author_user_id>
 *
 * A REAL send happens here — sandybrown's mail redirect
 * (provision-site-mail.py --redirect-all-to) is left in place, so the
 * email lands at Bean's Gmail. The note and reply this script creates are
 * deleted in a `finally` block either way.
 *
 * @package SGS\ClientNotes
 */

// phpcs:disable WordPress.NamingConventions.PrefixAllGlobals

use SGS\ClientNotes\API\Rest_Replies;

global $wpdb;

$target_post_id = absint( $args[0] ?? 0 );
$author_user_id = absint( $args[1] ?? 0 );
if ( ! $target_post_id || ! get_post( $target_post_id ) || ! $author_user_id || ! get_userdata( $author_user_id ) ) {
	WP_CLI::error( 'Usage: wp eval-file row-5b-reply-live-proof.php <post_id> <author_user_id>' );
}

$notes_table   = $wpdb->prefix . 'sgs_client_notes';
$replies_table = $wpdb->prefix . 'sgs_client_note_replies';
$note_id       = null;

try {
	// Create the note directly as $author_user_id (bypassing the REST
	// permission layer, which is not what this proof is testing).
	$now = current_time( 'mysql' );
	$wpdb->insert(
		$notes_table,
		array(
			'post_id'    => $target_post_id,
			'user_id'    => $author_user_id,
			'selector'   => '.row-5b-reply-proof',
			'comment'    => 'Row 5b reply proof note — safe to delete.',
			'priority'   => 'low',
			'status'     => 'open',
			'page_url'   => get_permalink( $target_post_id ),
			'created_at' => $now,
			'updated_at' => $now,
		)
	);
	$note_id = $wpdb->insert_id;
	WP_CLI::log( "Created note {$note_id} authored by user {$author_user_id}." );

	// Reply as the CURRENT WP-CLI user (an admin), never as the note's author.
	$reply_controller = new Rest_Replies();
	$reply_req = new WP_REST_Request( 'POST', "/sgs-client-notes/v1/notes/{$note_id}/replies" );
	$reply_req->set_param( 'note_id', $note_id );
	$reply_req->set_param( 'comment', 'Row 5b reply proof — this should email the note author.' );

	$replied = $reply_controller->create_item( $reply_req );
	if ( is_wp_error( $replied ) ) {
		WP_CLI::error( 'create_item (reply) failed: ' . $replied->get_error_message() );
	}
	WP_CLI::success( "Replied to note {$note_id} as user " . get_current_user_id() . " — check FluentSMTP's log for a reply notification to user {$author_user_id}'s email just now." );
} finally {
	if ( $note_id ) {
		$wpdb->delete( $replies_table, array( 'note_id' => $note_id ) );
		$wpdb->delete( $notes_table, array( 'id' => $note_id ) );
		WP_CLI::log( "Deleted proof note {$note_id} and its replies." );
	}
}
