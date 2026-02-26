<?php
/**
 * REST API: Notes Controller
 *
 * @package SGS\ClientNotes
 */

namespace SGS\ClientNotes\API;

// Exit if accessed directly.
if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

/**
 * REST Notes Controller.
 */
class Rest_Notes extends \WP_REST_Controller {

	/**
	 * Namespace.
	 *
	 * @var string
	 */
	protected $namespace = 'sgs-client-notes/v1';

	/**
	 * Resource name.
	 *
	 * @var string
	 */
	protected $rest_base = 'notes';

	/**
	 * Register routes.
	 */
	public function register_routes() {
		// GET /notes - Get notes for current page.
		register_rest_route(
			$this->namespace,
			'/' . $this->rest_base,
			array(
				array(
					'methods'             => \WP_REST_Server::READABLE,
					'callback'            => array( $this, 'get_items' ),
					'permission_callback' => array( $this, 'get_items_permissions_check' ),
					'args'                => $this->get_collection_params(),
				),
			)
		);

		// POST /notes - Create a new note.
		register_rest_route(
			$this->namespace,
			'/' . $this->rest_base,
			array(
				array(
					'methods'             => \WP_REST_Server::CREATABLE,
					'callback'            => array( $this, 'create_item' ),
					'permission_callback' => array( $this, 'create_item_permissions_check' ),
					'args'                => $this->get_endpoint_args_for_item_schema( \WP_REST_Server::CREATABLE ),
				),
			)
		);

		// PATCH /notes/{id} - Update note status.
		register_rest_route(
			$this->namespace,
			'/' . $this->rest_base . '/(?P<id>[\d]+)',
			array(
				array(
					'methods'             => \WP_REST_Server::EDITABLE,
					'callback'            => array( $this, 'update_item' ),
					'permission_callback' => array( $this, 'update_item_permissions_check' ),
					'args'                => $this->get_endpoint_args_for_item_schema( \WP_REST_Server::EDITABLE ),
				),
			)
		);

		// DELETE /notes/{id} - Delete a note.
		register_rest_route(
			$this->namespace,
			'/' . $this->rest_base . '/(?P<id>[\d]+)',
			array(
				array(
					'methods'             => \WP_REST_Server::DELETABLE,
					'callback'            => array( $this, 'delete_item' ),
					'permission_callback' => array( $this, 'delete_item_permissions_check' ),
				),
			)
		);
	}

	/**
	 * Get notes for the current page.
	 *
	 * @param \WP_REST_Request $request Request object.
	 * @return \WP_REST_Response
	 */
	public function get_items( $request ) {
		global $wpdb;

		$table = $wpdb->prefix . 'sgs_client_notes';
		$post_id = $request->get_param( 'post_id' );
		$page_url = $request->get_param( 'page_url' );
		$status = $request->get_param( 'status' );

		// Build query.
		$where = array();
		$values = array();

		if ( $post_id ) {
			$where[] = 'post_id = %d';
			$values[] = $post_id;
		}

		if ( $page_url ) {
			$where[] = 'page_url = %s';
			$values[] = $page_url;
		}

		if ( $status ) {
			$where[] = 'status = %s';
			$values[] = $status;
		} else {
			// Default: exclude archived notes.
			$where[] = "status != 'archived'";
		}

		// If user can only view own notes, filter by user.
		if ( ! current_user_can( 'sgs_manage_notes' ) ) {
			$where[] = 'user_id = %d';
			$values[] = get_current_user_id();
		}

		$where_sql = implode( ' AND ', $where );
		$query = "SELECT * FROM {$table} WHERE {$where_sql} ORDER BY created_at DESC";

		if ( ! empty( $values ) ) {
			$query = $wpdb->prepare( $query, $values );
		}

		$notes = $wpdb->get_results( $query, ARRAY_A );

		// Format response.
		$items = array();
		foreach ( $notes as $note ) {
			$items[] = $this->prepare_item_for_response( $note, $request );
		}

		return rest_ensure_response( $items );
	}

	/**
	 * Create a new note.
	 *
	 * @param \WP_REST_Request $request Request object.
	 * @return \WP_REST_Response
	 */
	public function create_item( $request ) {
		global $wpdb;

		// Rate limiting check.
		if ( ! $this->check_rate_limit() ) {
			return new \WP_Error(
				'rate_limit_exceeded',
				__( 'You have created too many notes in a short time. Please try again later.', 'sgs-client-notes' ),
				array( 'status' => 429 )
			);
		}

		$table = $wpdb->prefix . 'sgs_client_notes';
		$now = current_time( 'mysql' );

		$data = array(
			'post_id'        => $request->get_param( 'post_id' ),
			'user_id'        => get_current_user_id(),
			'selector'       => sanitize_text_field( $request->get_param( 'selector' ) ),
			'xpath'          => sanitize_text_field( $request->get_param( 'xpath' ) ),
			'offset_x'       => floatval( $request->get_param( 'offset_x' ) ),
			'offset_y'       => floatval( $request->get_param( 'offset_y' ) ),
			'viewport_width' => intval( $request->get_param( 'viewport_width' ) ),
			'comment'        => wp_kses_post( $request->get_param( 'comment' ) ),
			'priority'       => sanitize_text_field( $request->get_param( 'priority' ) ),
			'status'         => 'open',
			'screenshot_url' => esc_url_raw( $request->get_param( 'screenshot_url' ) ),
			'page_url'       => esc_url_raw( $request->get_param( 'page_url' ) ),
			'element_text'   => sanitize_text_field( substr( $request->get_param( 'element_text' ), 0, 255 ) ),
			'created_at'     => $now,
			'updated_at'     => $now,
		);

		$result = $wpdb->insert( $table, $data );

		if ( false === $result ) {
			return new \WP_Error(
				'db_error',
				__( 'Failed to create note.', 'sgs-client-notes' ),
				array( 'status' => 500 )
			);
		}

		$note_id = $wpdb->insert_id;
		$note = $wpdb->get_row( $wpdb->prepare( "SELECT * FROM {$table} WHERE id = %d", $note_id ), ARRAY_A );

		// Send webhook notification.
		$this->send_webhook( 'created', $note );

		return rest_ensure_response( $this->prepare_item_for_response( $note, $request ) );
	}

	/**
	 * Update a note.
	 *
	 * @param \WP_REST_Request $request Request object.
	 * @return \WP_REST_Response
	 */
	public function update_item( $request ) {
		global $wpdb;

		$table = $wpdb->prefix . 'sgs_client_notes';
		$note_id = $request->get_param( 'id' );

		$data = array(
			'updated_at' => current_time( 'mysql' ),
		);

		// Update status.
		if ( $request->has_param( 'status' ) ) {
			$status = sanitize_text_field( $request->get_param( 'status' ) );
			$data['status'] = $status;

			// If resolving, set resolved_by and resolved_at.
			if ( 'resolved' === $status ) {
				$data['resolved_by'] = get_current_user_id();
				$data['resolved_at'] = current_time( 'mysql' );
			}
		}

		$result = $wpdb->update(
			$table,
			$data,
			array( 'id' => $note_id ),
			array( '%s', '%s', '%d', '%s' ),
			array( '%d' )
		);

		if ( false === $result ) {
			return new \WP_Error(
				'db_error',
				__( 'Failed to update note.', 'sgs-client-notes' ),
				array( 'status' => 500 )
			);
		}

		$note = $wpdb->get_row( $wpdb->prepare( "SELECT * FROM {$table} WHERE id = %d", $note_id ), ARRAY_A );

		// Send webhook notification if resolved.
		if ( isset( $data['status'] ) && 'resolved' === $data['status'] ) {
			$this->send_webhook( 'resolved', $note );
		}

		return rest_ensure_response( $this->prepare_item_for_response( $note, $request ) );
	}

	/**
	 * Delete a note.
	 *
	 * @param \WP_REST_Request $request Request object.
	 * @return \WP_REST_Response
	 */
	public function delete_item( $request ) {
		global $wpdb;

		$table = $wpdb->prefix . 'sgs_client_notes';
		$replies_table = $wpdb->prefix . 'sgs_client_note_replies';
		$note_id = $request->get_param( 'id' );

		// Delete replies first.
		$wpdb->delete( $replies_table, array( 'note_id' => $note_id ), array( '%d' ) );

		// Delete note.
		$result = $wpdb->delete( $table, array( 'id' => $note_id ), array( '%d' ) );

		if ( false === $result ) {
			return new \WP_Error(
				'db_error',
				__( 'Failed to delete note.', 'sgs-client-notes' ),
				array( 'status' => 500 )
			);
		}

		return rest_ensure_response( array( 'deleted' => true ) );
	}

	/**
	 * Prepare item for response.
	 *
	 * @param array            $item    Note data.
	 * @param \WP_REST_Request $request Request object.
	 * @return array
	 */
	public function prepare_item_for_response( $item, $request ) {
		// Get author data.
		$author = get_userdata( $item['user_id'] );
		$resolved_by = null;

		if ( $item['resolved_by'] ) {
			$resolved_user = get_userdata( $item['resolved_by'] );
			$resolved_by = $resolved_user ? $resolved_user->display_name : null;
		}

		return array(
			'id'             => (int) $item['id'],
			'post_id'        => (int) $item['post_id'],
			'user_id'        => (int) $item['user_id'],
			'author_name'    => $author ? $author->display_name : 'Unknown',
			'selector'       => $item['selector'],
			'xpath'          => $item['xpath'],
			'offset_x'       => (float) $item['offset_x'],
			'offset_y'       => (float) $item['offset_y'],
			'viewport_width' => (int) $item['viewport_width'],
			'comment'        => $item['comment'],
			'priority'       => $item['priority'],
			'status'         => $item['status'],
			'screenshot_url' => $item['screenshot_url'],
			'page_url'       => $item['page_url'],
			'element_text'   => $item['element_text'],
			'resolved_by'    => $resolved_by,
			'resolved_at'    => $item['resolved_at'],
			'created_at'     => $item['created_at'],
			'updated_at'     => $item['updated_at'],
		);
	}

	/**
	 * Check rate limit.
	 *
	 * @return bool
	 */
	private function check_rate_limit() {
		global $wpdb;

		$table = $wpdb->prefix . 'sgs_client_notes';
		$user_id = get_current_user_id();
		$max_notes = get_option( 'sgs_client_notes_max_notes_per_hour', 20 );
		$one_hour_ago = date( 'Y-m-d H:i:s', strtotime( '-1 hour' ) );

		$count = $wpdb->get_var(
			$wpdb->prepare(
				"SELECT COUNT(*) FROM {$table} WHERE user_id = %d AND created_at > %s",
				$user_id,
				$one_hour_ago
			)
		);

		return $count < $max_notes;
	}

	/**
	 * Send webhook notification.
	 *
	 * @param string $event Event type.
	 * @param array  $note  Note data.
	 */
	private function send_webhook( $event, $note ) {
		$webhook_url = get_option( 'sgs_client_notes_n8n_webhook_url' );
		$urgent_webhook = get_option( 'sgs_client_notes_n8n_webhook_urgent' );

		// Use urgent webhook for urgent notes.
		if ( 'urgent' === $note['priority'] && $urgent_webhook ) {
			$webhook_url = $urgent_webhook;
		}

		if ( ! $webhook_url ) {
			return;
		}

		$author = get_userdata( $note['user_id'] );
		$post = get_post( $note['post_id'] );

		$payload = array(
			'event'     => $event,
			'note_id'   => $note['id'],
			'post_id'   => $note['post_id'],
			'post_title' => $post ? $post->post_title : '',
			'page_url'  => $note['page_url'],
			'author'    => $author ? $author->display_name : 'Unknown',
			'comment'   => $note['comment'],
			'priority'  => $note['priority'],
			'status'    => $note['status'],
			'created_at' => $note['created_at'],
		);

		wp_safe_remote_post(
			$webhook_url,
			array(
				'body'    => wp_json_encode( $payload ),
				'headers' => array( 'Content-Type' => 'application/json' ),
				'timeout' => 10,
			)
		);
	}

	/**
	 * Get collection params.
	 *
	 * @return array
	 */
	public function get_collection_params() {
		return array(
			'post_id'  => array(
				'description' => __( 'Post ID to filter notes.', 'sgs-client-notes' ),
				'type'        => 'integer',
			),
			'page_url' => array(
				'description' => __( 'Page URL to filter notes.', 'sgs-client-notes' ),
				'type'        => 'string',
			),
			'status'   => array(
				'description' => __( 'Status to filter notes.', 'sgs-client-notes' ),
				'type'        => 'string',
				'enum'        => array( 'open', 'in_progress', 'resolved', 'archived' ),
			),
		);
	}

	/**
	 * Permission check for getting notes.
	 *
	 * @return bool
	 */
	public function get_items_permissions_check( $request ) {
		return is_user_logged_in() && ( current_user_can( 'sgs_view_own_notes' ) || current_user_can( 'sgs_manage_notes' ) );
	}

	/**
	 * Permission check for creating notes.
	 *
	 * @return bool
	 */
	public function create_item_permissions_check( $request ) {
		return current_user_can( 'sgs_create_notes' );
	}

	/**
	 * Permission check for updating notes.
	 *
	 * @return bool
	 */
	public function update_item_permissions_check( $request ) {
		return current_user_can( 'sgs_manage_notes' );
	}

	/**
	 * Permission check for deleting notes.
	 *
	 * @return bool
	 */
	public function delete_item_permissions_check( $request ) {
		return current_user_can( 'sgs_manage_notes' );
	}
}
