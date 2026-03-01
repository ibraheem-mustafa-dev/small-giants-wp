<?php
/**
 * Admin: Dashboard Widget
 *
 * @package SGS\ClientNotes
 *
 * @since 1.0.0
 */

namespace SGS\ClientNotes\Admin;

// Exit if accessed directly.
if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

/**
 * Admin Dashboard class.
 *
 * @since 1.0.0
 */
class Admin_Dashboard {

	/**
	 * Register dashboard widget.
	 *
	 * @since 1.0.0
	 */
	public function register_widget() {
		wp_add_dashboard_widget(
			'sgs_client_notes_dashboard',
			__( 'Client Notes Summary', 'sgs-client-notes' ),
			array( $this, 'render_widget' )
		);
	}

	/**
	 * Render dashboard widget.
	 *
	 * @since 1.0.0
	 */
	public function render_widget() {
		global $wpdb;

		$table = $wpdb->prefix . 'sgs_client_notes';

		// Get counts by priority.
		$counts = $wpdb->get_results(
			"SELECT 
				priority,
				COUNT(*) as count
			FROM {$table}
			WHERE status != 'resolved' AND status != 'archived'
			GROUP BY priority",
			ARRAY_A
		);

		$priority_counts = array(
			'urgent'     => 0,
			'issue'      => 0,
			'suggestion' => 0,
		);

		foreach ( $counts as $row ) {
			$priority_counts[ $row['priority'] ] = (int) $row['count'];
		}

		$total = array_sum( $priority_counts );

		// Get latest notes.
		$latest_notes = $wpdb->get_results(
			"SELECT * FROM {$table} 
			WHERE status != 'resolved' AND status != 'archived'
			ORDER BY created_at DESC 
			LIMIT 5",
			ARRAY_A
		);

		?>
		<div class="sgs-cn-dashboard-widget">
			<!-- Summary -->
			<div class="sgs-cn-summary" style="display: flex; gap: 15px; margin-bottom: 20px;">
				<div style="flex: 1; text-align: center; padding: 15px; background: #fee; border-radius: 4px;">
					<div style="font-size: 28px; font-weight: bold; color: #d63638;"><?php echo esc_html( $priority_counts['urgent'] ); ?></div>
					<div style="font-size: 12px; color: #666;"><?php esc_html_e( 'Urgent', 'sgs-client-notes' ); ?></div>
				</div>
				<div style="flex: 1; text-align: center; padding: 15px; background: #fef5e7; border-radius: 4px;">
					<div style="font-size: 28px; font-weight: bold; color: #f39c12;"><?php echo esc_html( $priority_counts['issue'] ); ?></div>
					<div style="font-size: 12px; color: #666;"><?php esc_html_e( 'Issues', 'sgs-client-notes' ); ?></div>
				</div>
				<div style="flex: 1; text-align: center; padding: 15px; background: #e8f4f8; border-radius: 4px;">
					<div style="font-size: 28px; font-weight: bold; color: #3498db;"><?php echo esc_html( $priority_counts['suggestion'] ); ?></div>
					<div style="font-size: 12px; color: #666;"><?php esc_html_e( 'Suggestions', 'sgs-client-notes' ); ?></div>
				</div>
			</div>

			<?php if ( $total > 0 ) : ?>
				<!-- Latest Notes -->
				<h4 style="margin: 0 0 10px 0;"><?php esc_html_e( 'Latest Unresolved Notes', 'sgs-client-notes' ); ?></h4>
				<ul style="margin: 0; padding: 0; list-style: none;">
					<?php foreach ( $latest_notes as $note ) : ?>
						<?php
						$post = get_post( $note['post_id'] );
						$author = get_userdata( $note['user_id'] );
						$priority_class = 'sgs-cn-priority-' . $note['priority'];
						?>
						<li style="padding: 10px 0; border-bottom: 1px solid #eee;">
							<div style="display: flex; justify-content: space-between; align-items: flex-start;">
								<div style="flex: 1;">
									<span class="sgs-cn-priority <?php echo esc_attr( $priority_class ); ?>" style="display: inline-block; padding: 2px 8px; border-radius: 3px; font-size: 11px; font-weight: 600; margin-right: 5px;">
										<?php echo esc_html( strtoupper( $note['priority'] ) ); ?>
									</span>
									<strong>
										<?php if ( $post ) : ?>
											<a href="<?php echo esc_url( $note['page_url'] ); ?>" target="_blank">
												<?php echo esc_html( $post->post_title ); ?>
											</a>
										<?php else : ?>
											<?php esc_html_e( 'Unknown Page', 'sgs-client-notes' ); ?>
										<?php endif; ?>
									</strong>
									<div style="font-size: 12px; color: #666; margin-top: 3px;">
										<?php echo esc_html( wp_trim_words( $note['comment'], 12 ) ); ?>
									</div>
									<div style="font-size: 11px; color: #999; margin-top: 3px;">
										<?php
										printf(
											/* translators: 1: author name, 2: time ago */
											esc_html__( 'By %1$s, %2$s', 'sgs-client-notes' ),
											esc_html( $author ? $author->display_name : 'Unknown' ),
											esc_html( human_time_diff( strtotime( $note['created_at'] ), current_time( 'timestamp' ) ) . ' ago' )
										);
										?>
									</div>
								</div>
							</div>
						</li>
					<?php endforeach; ?>
				</ul>

				<p style="text-align: center; margin-top: 15px;">
					<a href="<?php echo esc_url( admin_url( 'admin.php?page=sgs-client-notes' ) ); ?>" class="button button-primary">
						<?php esc_html_e( 'View All Notes', 'sgs-client-notes' ); ?>
					</a>
				</p>
			<?php else : ?>
				<p style="text-align: center; color: #666; padding: 20px 0;">
					<?php esc_html_e( 'No unresolved notes. Great work!', 'sgs-client-notes' ); ?> 🎉
				</p>
			<?php endif; ?>
		</div>

		<style>
		.sgs-cn-priority {
			display: inline-block;
			padding: 2px 8px;
			border-radius: 3px;
			font-size: 11px;
			font-weight: 600;
			text-transform: uppercase;
		}
		.sgs-cn-priority-urgent {
			background: #d63638;
			color: #fff;
		}
		.sgs-cn-priority-issue {
			background: #f39c12;
			color: #fff;
		}
		.sgs-cn-priority-suggestion {
			background: #3498db;
			color: #fff;
		}
		</style>
		<?php
	}
}
