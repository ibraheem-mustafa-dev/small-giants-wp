<?php
/**
 * REST API: Replies Controller
 *
 * @package SGS\ClientNotes
 *
 * @since 1.0.0
 */

namespace SGS\ClientNotes\API;

// Exit if accessed directly.
if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

/**
 * REST Replies Controller.
 *
 * @since 1.0.0
 */
class Rest_Replies extends \WP_REST_Controller {

	/**
	 * Namespace.
	 *
	 * @since 1.0.0
	 * @var string
	 */
	protected $namespace = 'sgs-client-notes/v1';

	/**
	 * Resource name.
	 *
	 * @since 1.0.0
	 * @var string
	 */
	protected $rest_base = 'notes/(?P<note_id>[\d]+)/replies';

	/**
	 * Register routes.
	 *
	 * @since 1.0.0
	 */
	public function register_routes() {
		// GET /notes/{note_id}/replies - Get replies for a note.
		register_rest_route(
			$this->namespace,
			'/' . $this->rest_base,
			array(
				array(
					'methods'             => \WP_REST_Server::READABLE,
					'callback'            => array( $this, 'get_items' ),
					'permission_callback' => array( $this, 'get_items_permissions_check' ),
				),
			)
		);

		// POST /notes/{note_id}/replies - Add a reply.
		register_rest_route(
			$this->namespace,
			'/' . $this->rest_base,
			array(
				array(
					'methods'             => \WP_REST_Server::CREATABLE,
					'callback'            => array( $this, 'create_item' ),
					'permission_callback' => array( $this, 'create_item_permissions_check' ),
					'args'                => array(
						'comment' => array(
							'required'          => true,
							'type'              => 'string',
							'description'       => __( 'Reply comment text.', 'sgs-client-notes' ),
							'sanitize_callback' => 'wp_kses_post',
						),
					),
				),
			)
		);
	}

	/**
	 * Get replies for a note.
	 *
	 * @since 1.0.0
	 * @param \WP_REST_Request $request Request object.
	 * @return \WP_REST_Response
	 */
	public function get_items( $request ) {
		global $wpdb;

		$table = $wpdb->prefix . 'sgs_client_note_replies';
		$note_id = $request->get_param( 'note_id' );

		$replies = $wpdb->get_results(
			$wpdb->prepare(
				"SELECT * FROM {$table} WHERE note_id = %d ORDER BY created_at ASC",
				$note_id
			),
			ARRAY_A
		);

		$items = array();
		foreach ( $replies as $reply ) {
			$items[] = $this->prepare_item_for_response( $reply, $request );
		}

		return rest_ensure_response( $items );
	}

	/**
	 * Create a reply.
	 *
	 * @since 1.0.0
	 * @param \WP_REST_Request $request Request object.
	 * @return \WP_REST_Response
	 */
	public function create_item( $request ) {
		global $wpdb;

		$table = $wpdb->prefix . 'sgs_client_note_replies';
		$notes_table = $wpdb->prefix . 'sgs_client_notes';
		$note_id = $request->get_param( 'note_id' );
		$now = current_time( 'mysql' );

		$data = array(
			'note_id'    => $note_id,
			'user_id'    => get_current_user_id(),
			'comment'    => wp_kses_post( $request->get_param( 'comment' ) ),
			'created_at' => $now,
		);

		$result = $wpdb->insert( $table, $data );

		if ( false === $result ) {
			return new \WP_Error(
				'db_error',
				__( 'Failed to create reply.', 'sgs-client-notes' ),
				array( 'status' => 500 )
			);
		}

		// Update note's updated_at timestamp.
		$wpdb->update(
			$notes_table,
			array( 'updated_at' => $now ),
			array( 'id' => $note_id ),
			array( '%s' ),
			array( '%d' )
		);

		$reply_id = $wpdb->insert_id;
		$reply = $wpdb->get_row( $wpdb->prepare( "SELECT * FROM {$table} WHERE id = %d", $reply_id ), ARRAY_A );

		// Send webhook notification.
		$this->send_webhook( $note_id, $reply );

		return rest_ensure_response( $this->prepare_item_for_response( $reply, $request ) );
	}

	/**
	 * Prepare item for response.
	 *
	 * @since 1.0.0
	 * @param array            $item    Reply data.
	 * @param \WP_REST_Request $request Request object.
	 * @return array
	 */
	public function prepare_item_for_response( $item, $request ) {
		$author = get_userdata( $item['user_id'] );

		return array(
			'id'          => (int) $item['id'],
			'note_id'     => (int) $item['note_id'],
			'user_id'     => (int) $item['user_id'],
			'author_name' => $author ? $author->display_name : 'Unknown',
			'comment'     => $item['comment'],
			'created_at'  => $item['created_at'],
		);
	}

	/**
	 * Send webhook notification.
	 *
	 * @since 1.0.0
	 * @param int   $note_id Note ID.
	 * @param array $reply   Reply data.
	 */
	private function send_webhook( $note_id, $reply ) {
		global $wpdb;

		$webhook_url = get_option( 'sgs_client_notes_n8n_webhook_url' );
		if ( ! $webhook_url ) {
			return;
		}

		$notes_table = $wpdb->prefix . 'sgs_client_notes';
		$note = $wpdb->get_row(
			$wpdb->prepare( "SELECT * FROM {$notes_table} WHERE id = %d", $note_id ),
			ARRAY_A
		);

		if ( ! $note ) {
			return;
		}

		$author = get_userdata( $reply['user_id'] );
		$note_author = get_userdata( $note['user_id'] );
		$post = get_post( $note['post_id'] );

		$payload = array(
			'event'      => 'reply',
			'note_id'    => $note_id,
			'reply_id'   => $reply['id'],
			'post_id'    => $note['post_id'],
			'post_title' => $post ? $post->post_title : '',
			'page_url'   => $note['page_url'],
			'author'     => $author ? $author->display_name : 'Unknown',
			'note_author' => $note_author ? $note_author->display_name : 'Unknown',
			'note_author_email' => $note_author ? $note_author->user_email : '',
			'comment'    => $reply['comment'],
			'created_at' => $reply['created_at'],
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
	 * Permission check for getting replies.
	 *
	 * @since 1.0.0
	 * @return bool
	 */
	public function get_items_permissions_check( $request ) {
		return is_user_logged_in() && ( current_user_can( 'sgs_view_own_notes' ) || current_user_can( 'sgs_manage_notes' ) );
	}

	/**
	 * Permission check for creating replies.
	 *
	 * @since 1.0.0
	 * @return bool
	 */
	public function create_item_permissions_check( $request ) {
		return is_user_logged_in() && ( current_user_can( 'sgs_create_notes' ) || current_user_can( 'sgs_manage_notes' ) );
	}
}
