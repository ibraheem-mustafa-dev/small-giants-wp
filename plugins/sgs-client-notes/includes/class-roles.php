<?php
/**
 * Roles and Capabilities Manager
 *
 * @package SGS\ClientNotes
 *
 * @since 1.0.0
 */

namespace SGS\ClientNotes;

// Exit if accessed directly.
if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

/**
 * Roles class.
 *
 * @since 1.0.0
 */
class Roles {

	/**
	 * Initialise roles.
	 *
	 * @since 1.0.0
	 */
	public static function init() {
		// Hook to check if roles need updating.
		add_action( 'admin_init', array( __CLASS__, 'check_roles' ) );
	}

	/**
	 * Check if roles need updating.
	 *
	 * @since 1.0.0
	 */
	public static function check_roles() {
		$db_version = get_option( 'sgs_client_notes_db_version', '0' );
		if ( version_compare( $db_version, SGS_CLIENT_NOTES_VERSION, '<' ) ) {
			self::create_client_role();
			self::add_admin_capabilities();
		}
	}

	/**
	 * Create the sgs_client role.
	 *
	 * @since 1.0.0
	 */
	public static function create_client_role() {
		// Remove role if it exists (to refresh capabilities).
		remove_role( 'sgs_client' );

		// Create the role.
		add_role(
			'sgs_client',
			__( 'SGS Client', 'sgs-client-notes' ),
			array(
				'read'                => true,  // Can view frontend.
				'sgs_create_notes'    => true,  // Can create annotations.
				'sgs_view_own_notes'  => true,  // Can see their own notes and replies.
				'edit_posts'          => false, // No admin access.
				'delete_posts'        => false,
			)
		);
	}

	/**
	 * Add note management capabilities to administrator role.
	 *
	 * @since 1.0.0
	 */
	public static function add_admin_capabilities() {
		$admin_role = get_role( 'administrator' );

		if ( $admin_role ) {
			$admin_role->add_cap( 'sgs_manage_notes' );
			$admin_role->add_cap( 'sgs_manage_client_users' );
			$admin_role->add_cap( 'sgs_create_notes' );
			$admin_role->add_cap( 'sgs_view_own_notes' );
		}

		// Also add to editor role.
		$editor_role = get_role( 'editor' );
		if ( $editor_role ) {
			$editor_role->add_cap( 'sgs_manage_notes' );
			$editor_role->add_cap( 'sgs_create_notes' );
			$editor_role->add_cap( 'sgs_view_own_notes' );
		}
	}

	/**
	 * Remove plugin capabilities from all roles.
	 *
	 * @since 1.0.0
	 */
	public static function remove_capabilities() {
		global $wp_roles;

		if ( ! isset( $wp_roles ) ) {
			$wp_roles = new \WP_Roles();
		}

		$capabilities = array(
			'sgs_create_notes',
			'sgs_view_own_notes',
			'sgs_manage_notes',
			'sgs_manage_client_users',
		);

		foreach ( $wp_roles->roles as $role_name => $role_info ) {
			$role = get_role( $role_name );
			if ( $role ) {
				foreach ( $capabilities as $cap ) {
					$role->remove_cap( $cap );
				}
			}
		}
	}

	/**
	 * Remove the sgs_client role.
	 *
	 * @since 1.0.0
	 */
	public static function remove_client_role() {
		remove_role( 'sgs_client' );
	}
}
