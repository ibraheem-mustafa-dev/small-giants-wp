<?php
/**
 * Admin: Notes Management Page
 *
 * @package SGS\ClientNotes
 */

namespace SGS\ClientNotes\Admin;

// Exit if accessed directly.
if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

/**
 * Admin Notes class.
 */
class Admin_Notes {

	/**
	 * Register admin menu.
	 */
	public function register_menu() {
		global $wpdb;

		// Count unresolved notes for badge.
		$table = $wpdb->prefix . 'sgs_client_notes';
		$count = $wpdb->get_var( "SELECT COUNT(*) FROM {$table} WHERE status != 'resolved' AND status != 'archived'" );

		$menu_title = __( 'Client Notes', 'sgs-client-notes' );
		if ( $count > 0 ) {
			$menu_title .= sprintf( ' <span class="update-plugins count-%d"><span class="update-count">%d</span></span>', $count, $count );
		}

		add_menu_page(
			__( 'Client Notes', 'sgs-client-notes' ),
			$menu_title,
			'sgs_manage_notes',
			'sgs-client-notes',
			array( $this, 'render_page' ),
			'dashicons-sticky',
			30
		);

		add_submenu_page(
			'sgs-client-notes',
			__( 'Settings', 'sgs-client-notes' ),
			__( 'Settings', 'sgs-client-notes' ),
			'manage_options',
			'sgs-client-notes-settings',
			array( $this, 'render_settings_page' )
		);
	}

	/**
	 * Render notes management page.
	 */
	public function render_page() {
		global $wpdb;

		// Handle bulk actions.
		$this->handle_bulk_actions();

		// Get filters.
		$status_filter = isset( $_GET['status'] ) ? sanitize_text_field( $_GET['status'] ) : '';
		$priority_filter = isset( $_GET['priority'] ) ? sanitize_text_field( $_GET['priority'] ) : '';
		$post_id_filter = isset( $_GET['post_id'] ) ? intval( $_GET['post_id'] ) : 0;

		// Build query.
		$table = $wpdb->prefix . 'sgs_client_notes';
		$where = array( '1=1' );
		$values = array();

		if ( $status_filter ) {
			$where[] = 'status = %s';
			$values[] = $status_filter;
		} else {
			$where[] = "status != 'archived'";
		}

		if ( $priority_filter ) {
			$where[] = 'priority = %s';
			$values[] = $priority_filter;
		}

		if ( $post_id_filter ) {
			$where[] = 'post_id = %d';
			$values[] = $post_id_filter;
		}

		$where_sql = implode( ' AND ', $where );
		$query = "SELECT * FROM {$table} WHERE {$where_sql} ORDER BY 
			CASE priority 
				WHEN 'urgent' THEN 1 
				WHEN 'issue' THEN 2 
				WHEN 'suggestion' THEN 3 
			END,
			created_at DESC";

		if ( ! empty( $values ) ) {
			$query = $wpdb->prepare( $query, $values );
		}

		$notes = $wpdb->get_results( $query, ARRAY_A );

		// Get unique post IDs for filter dropdown.
		$post_ids = $wpdb->get_col( "SELECT DISTINCT post_id FROM {$table} ORDER BY post_id DESC" );

		?>
		<div class="wrap">
			<h1><?php esc_html_e( 'Client Notes', 'sgs-client-notes' ); ?></h1>

			<!-- Filters -->
			<div class="sgs-cn-filters" style="margin: 20px 0;">
				<form method="get">
					<input type="hidden" name="page" value="sgs-client-notes">
					
					<select name="status">
						<option value=""><?php esc_html_e( 'All Statuses', 'sgs-client-notes' ); ?></option>
						<option value="open" <?php selected( $status_filter, 'open' ); ?>><?php esc_html_e( 'Open', 'sgs-client-notes' ); ?></option>
						<option value="in_progress" <?php selected( $status_filter, 'in_progress' ); ?>><?php esc_html_e( 'In Progress', 'sgs-client-notes' ); ?></option>
						<option value="resolved" <?php selected( $status_filter, 'resolved' ); ?>><?php esc_html_e( 'Resolved', 'sgs-client-notes' ); ?></option>
						<option value="archived" <?php selected( $status_filter, 'archived' ); ?>><?php esc_html_e( 'Archived', 'sgs-client-notes' ); ?></option>
					</select>

					<select name="priority">
						<option value=""><?php esc_html_e( 'All Priorities', 'sgs-client-notes' ); ?></option>
						<option value="urgent" <?php selected( $priority_filter, 'urgent' ); ?>><?php esc_html_e( 'Urgent', 'sgs-client-notes' ); ?></option>
						<option value="issue" <?php selected( $priority_filter, 'issue' ); ?>><?php esc_html_e( 'Issue', 'sgs-client-notes' ); ?></option>
						<option value="suggestion" <?php selected( $priority_filter, 'suggestion' ); ?>><?php esc_html_e( 'Suggestion', 'sgs-client-notes' ); ?></option>
					</select>

					<select name="post_id">
						<option value=""><?php esc_html_e( 'All Pages', 'sgs-client-notes' ); ?></option>
						<?php foreach ( $post_ids as $pid ) : ?>
							<?php $post = get_post( $pid ); ?>
							<?php if ( $post ) : ?>
								<option value="<?php echo esc_attr( $pid ); ?>" <?php selected( $post_id_filter, $pid ); ?>>
									<?php echo esc_html( $post->post_title ); ?>
								</option>
							<?php endif; ?>
						<?php endforeach; ?>
					</select>

					<button type="submit" class="button"><?php esc_html_e( 'Filter', 'sgs-client-notes' ); ?></button>
				</form>
			</div>

			<!-- Notes Table -->
			<form method="post">
				<?php wp_nonce_field( 'sgs_client_notes_bulk', 'sgs_client_notes_nonce' ); ?>
				
				<div class="tablenav top">
					<div class="alignleft actions bulkactions">
						<select name="action">
							<option value="-1"><?php esc_html_e( 'Bulk Actions', 'sgs-client-notes' ); ?></option>
							<option value="mark_in_progress"><?php esc_html_e( 'Mark as In Progress', 'sgs-client-notes' ); ?></option>
							<option value="mark_resolved"><?php esc_html_e( 'Mark as Resolved', 'sgs-client-notes' ); ?></option>
							<option value="archive"><?php esc_html_e( 'Archive', 'sgs-client-notes' ); ?></option>
							<option value="delete"><?php esc_html_e( 'Delete', 'sgs-client-notes' ); ?></option>
						</select>
						<button type="submit" class="button action"><?php esc_html_e( 'Apply', 'sgs-client-notes' ); ?></button>
					</div>
				</div>

				<table class="wp-list-table widefat fixed striped">
					<thead>
						<tr>
							<td class="check-column"><input type="checkbox" id="cb-select-all"></td>
							<th><?php esc_html_e( 'Page', 'sgs-client-notes' ); ?></th>
							<th><?php esc_html_e( 'Comment', 'sgs-client-notes' ); ?></th>
							<th><?php esc_html_e( 'Author', 'sgs-client-notes' ); ?></th>
							<th><?php esc_html_e( 'Priority', 'sgs-client-notes' ); ?></th>
							<th><?php esc_html_e( 'Status', 'sgs-client-notes' ); ?></th>
							<th><?php esc_html_e( 'Date', 'sgs-client-notes' ); ?></th>
							<th><?php esc_html_e( 'Replies', 'sgs-client-notes' ); ?></th>
						</tr>
					</thead>
					<tbody>
						<?php if ( empty( $notes ) ) : ?>
							<tr>
								<td colspan="8"><?php esc_html_e( 'No notes found.', 'sgs-client-notes' ); ?></td>
							</tr>
						<?php else : ?>
							<?php foreach ( $notes as $note ) : ?>
								<?php
								$post = get_post( $note['post_id'] );
								$author = get_userdata( $note['user_id'] );
								$replies_table = $wpdb->prefix . 'sgs_client_note_replies';
								$reply_count = $wpdb->get_var( $wpdb->prepare( "SELECT COUNT(*) FROM {$replies_table} WHERE note_id = %d", $note['id'] ) );
								?>
								<tr>
									<th scope="row" class="check-column">
										<input type="checkbox" name="notes[]" value="<?php echo esc_attr( $note['id'] ); ?>">
									</th>
									<td>
										<?php if ( $post ) : ?>
											<a href="<?php echo esc_url( $note['page_url'] ); ?>" target="_blank">
												<?php echo esc_html( $post->post_title ); ?>
											</a>
										<?php else : ?>
											<em><?php esc_html_e( 'Post not found', 'sgs-client-notes' ); ?></em>
										<?php endif; ?>
									</td>
									<td>
										<?php echo esc_html( wp_trim_words( $note['comment'], 15 ) ); ?>
										<?php if ( $note['screenshot_url'] ) : ?>
											<br><a href="<?php echo esc_url( $note['screenshot_url'] ); ?>" target="_blank"><?php esc_html_e( 'View Screenshot', 'sgs-client-notes' ); ?></a>
										<?php endif; ?>
									</td>
									<td><?php echo esc_html( $author ? $author->display_name : 'Unknown' ); ?></td>
									<td>
										<span class="sgs-cn-priority sgs-cn-priority-<?php echo esc_attr( $note['priority'] ); ?>">
											<?php echo esc_html( ucfirst( $note['priority'] ) ); ?>
										</span>
									</td>
									<td>
										<span class="sgs-cn-status sgs-cn-status-<?php echo esc_attr( $note['status'] ); ?>">
											<?php echo esc_html( ucfirst( str_replace( '_', ' ', $note['status'] ) ) ); ?>
										</span>
									</td>
									<td><?php echo esc_html( wp_date( get_option( 'date_format' ), strtotime( $note['created_at'] ) ) ); ?></td>
									<td><?php echo esc_html( $reply_count ); ?></td>
								</tr>
							<?php endforeach; ?>
						<?php endif; ?>
					</tbody>
				</table>
			</form>
		</div>

		<script>
		document.getElementById('cb-select-all').addEventListener('change', function(e) {
			const checkboxes = document.querySelectorAll('input[name="notes[]"]');
			checkboxes.forEach(cb => cb.checked = e.target.checked);
		});
		</script>
		<?php
	}

	/**
	 * Render settings page.
	 */
	public function render_settings_page() {
		// Handle form submission.
		if ( isset( $_POST['sgs_client_notes_settings_nonce'] ) && wp_verify_nonce( $_POST['sgs_client_notes_settings_nonce'], 'sgs_client_notes_settings' ) ) {
			update_option( 'sgs_client_notes_n8n_webhook_url', esc_url_raw( $_POST['n8n_webhook_url'] ) );
			update_option( 'sgs_client_notes_n8n_webhook_urgent', esc_url_raw( $_POST['n8n_webhook_urgent'] ) );
			update_option( 'sgs_client_notes_enable_screenshots', isset( $_POST['enable_screenshots'] ) );
			update_option( 'sgs_client_notes_max_notes_per_hour', intval( $_POST['max_notes_per_hour'] ) );
			update_option( 'sgs_client_notes_notification_email', sanitize_email( $_POST['notification_email'] ) );

			echo '<div class="notice notice-success"><p>' . esc_html__( 'Settings saved.', 'sgs-client-notes' ) . '</p></div>';
		}

		$webhook_url = get_option( 'sgs_client_notes_n8n_webhook_url', '' );
		$webhook_urgent = get_option( 'sgs_client_notes_n8n_webhook_urgent', '' );
		$enable_screenshots = get_option( 'sgs_client_notes_enable_screenshots', true );
		$max_notes = get_option( 'sgs_client_notes_max_notes_per_hour', 20 );
		$notification_email = get_option( 'sgs_client_notes_notification_email', get_option( 'admin_email' ) );

		?>
		<div class="wrap">
			<h1><?php esc_html_e( 'Client Notes Settings', 'sgs-client-notes' ); ?></h1>

			<form method="post">
				<?php wp_nonce_field( 'sgs_client_notes_settings', 'sgs_client_notes_settings_nonce' ); ?>

				<table class="form-table">
					<tr>
						<th scope="row"><label for="n8n_webhook_url"><?php esc_html_e( 'N8N Webhook URL', 'sgs-client-notes' ); ?></label></th>
						<td>
							<input type="url" id="n8n_webhook_url" name="n8n_webhook_url" value="<?php echo esc_attr( $webhook_url ); ?>" class="regular-text">
							<p class="description"><?php esc_html_e( 'URL for note creation and reply notifications.', 'sgs-client-notes' ); ?></p>
						</td>
					</tr>
					<tr>
						<th scope="row"><label for="n8n_webhook_urgent"><?php esc_html_e( 'N8N Urgent Webhook URL', 'sgs-client-notes' ); ?></label></th>
						<td>
							<input type="url" id="n8n_webhook_urgent" name="n8n_webhook_urgent" value="<?php echo esc_attr( $webhook_urgent ); ?>" class="regular-text">
							<p class="description"><?php esc_html_e( 'Separate URL for urgent notes (optional).', 'sgs-client-notes' ); ?></p>
						</td>
					</tr>
					<tr>
						<th scope="row"><?php esc_html_e( 'Enable Screenshots', 'sgs-client-notes' ); ?></th>
						<td>
							<label>
								<input type="checkbox" name="enable_screenshots" value="1" <?php checked( $enable_screenshots ); ?>>
								<?php esc_html_e( 'Allow clients to capture screenshots', 'sgs-client-notes' ); ?>
							</label>
						</td>
					</tr>
					<tr>
						<th scope="row"><label for="max_notes_per_hour"><?php esc_html_e( 'Max Notes Per Hour', 'sgs-client-notes' ); ?></label></th>
						<td>
							<input type="number" id="max_notes_per_hour" name="max_notes_per_hour" value="<?php echo esc_attr( $max_notes ); ?>" min="1" max="100">
							<p class="description"><?php esc_html_e( 'Rate limit per user to prevent spam.', 'sgs-client-notes' ); ?></p>
						</td>
					</tr>
					<tr>
						<th scope="row"><label for="notification_email"><?php esc_html_e( 'Notification Email', 'sgs-client-notes' ); ?></label></th>
						<td>
							<input type="email" id="notification_email" name="notification_email" value="<?php echo esc_attr( $notification_email ); ?>" class="regular-text">
						</td>
					</tr>
				</table>

				<p class="submit">
					<button type="submit" class="button button-primary"><?php esc_html_e( 'Save Settings', 'sgs-client-notes' ); ?></button>
				</p>
			</form>
		</div>
		<?php
	}

	/**
	 * Handle bulk actions.
	 */
	private function handle_bulk_actions() {
		if ( ! isset( $_POST['action'] ) || '-1' === $_POST['action'] ) {
			return;
		}

		if ( ! isset( $_POST['sgs_client_notes_nonce'] ) || ! wp_verify_nonce( $_POST['sgs_client_notes_nonce'], 'sgs_client_notes_bulk' ) ) {
			return;
		}

		if ( ! isset( $_POST['notes'] ) || ! is_array( $_POST['notes'] ) ) {
			return;
		}

		global $wpdb;
		$table = $wpdb->prefix . 'sgs_client_notes';
		$action = sanitize_text_field( $_POST['action'] );
		$note_ids = array_map( 'intval', $_POST['notes'] );

		foreach ( $note_ids as $note_id ) {
			switch ( $action ) {
				case 'mark_in_progress':
					$wpdb->update( $table, array( 'status' => 'in_progress' ), array( 'id' => $note_id ) );
					break;
				case 'mark_resolved':
					$wpdb->update(
						$table,
						array(
							'status' => 'resolved',
							'resolved_by' => get_current_user_id(),
							'resolved_at' => current_time( 'mysql' ),
						),
						array( 'id' => $note_id )
					);
					break;
				case 'archive':
					$wpdb->update( $table, array( 'status' => 'archived' ), array( 'id' => $note_id ) );
					break;
				case 'delete':
					$replies_table = $wpdb->prefix . 'sgs_client_note_replies';
					$wpdb->delete( $replies_table, array( 'note_id' => $note_id ) );
					$wpdb->delete( $table, array( 'id' => $note_id ) );
					break;
			}
		}

		wp_safe_redirect( admin_url( 'admin.php?page=sgs-client-notes' ) );
		exit;
	}
}
