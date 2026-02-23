<?php
/**
 * Uninstall Script
 *
 * Removes all plugin data when uninstalled.
 *
 * @package SGS\ClientNotes
 */

// Exit if not called from WordPress.
if ( ! defined( 'WP_UNINSTALL_PLUGIN' ) ) {
	exit;
}

global $wpdb;

// Drop database tables.
$table_notes = $wpdb->prefix . 'sgs_client_notes';
$table_replies = $wpdb->prefix . 'sgs_client_note_replies';

$wpdb->query( "DROP TABLE IF EXISTS {$table_replies}" );
$wpdb->query( "DROP TABLE IF EXISTS {$table_notes}" );

// Delete options.
$options = array(
	'sgs_client_notes_db_version',
	'sgs_client_notes_activated',
	'sgs_client_notes_n8n_webhook_url',
	'sgs_client_notes_n8n_webhook_urgent',
	'sgs_client_notes_enable_screenshots',
	'sgs_client_notes_max_notes_per_hour',
	'sgs_client_notes_show_resolved_notes',
	'sgs_client_notes_auto_archive_days',
	'sgs_client_notes_notification_email',
);

foreach ( $options as $option ) {
	delete_option( $option );
}

// Remove custom role.
remove_role( 'sgs_client' );

// Remove capabilities from admin and editor roles.
$admin_role = get_role( 'administrator' );
if ( $admin_role ) {
	$admin_role->remove_cap( 'sgs_manage_notes' );
	$admin_role->remove_cap( 'sgs_manage_client_users' );
	$admin_role->remove_cap( 'sgs_create_notes' );
	$admin_role->remove_cap( 'sgs_view_own_notes' );
}

$editor_role = get_role( 'editor' );
if ( $editor_role ) {
	$editor_role->remove_cap( 'sgs_manage_notes' );
	$editor_role->remove_cap( 'sgs_create_notes' );
	$editor_role->remove_cap( 'sgs_view_own_notes' );
}

// Delete all screenshot attachments.
$attachments = get_posts(
	array(
		'post_type'      => 'attachment',
		'posts_per_page' => -1,
		'meta_query'     => array(
			array(
				'key'     => '_wp_attached_file',
				'value'   => 'client-note-',
				'compare' => 'LIKE',
			),
		),
	)
);

foreach ( $attachments as $attachment ) {
	wp_delete_attachment( $attachment->ID, true );
}
