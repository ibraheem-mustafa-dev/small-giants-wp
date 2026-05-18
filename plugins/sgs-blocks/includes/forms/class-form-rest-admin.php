<?php
/**
 * Admin-only submission management REST handlers.
 *
 * Owns the manage_options-gated callbacks under /sgs-forms/v1:
 *   - GET    /submissions               — list with filters + pagination.
 *   - GET    /submissions/{id}          — single submission detail.
 *   - DELETE /submissions/{id}          — GDPR erasure.
 *   - GET    /export/{formId}           — streamed CSV export.
 *
 * @package SGS\Blocks\Forms
 */

namespace SGS\Blocks\Forms;

defined( 'ABSPATH' ) || exit;

/**
 * Admin-only submission management REST handlers.
 */
class Form_REST_Admin {

	/**
	 * List form submissions with optional filtering.
	 *
	 * @param \WP_REST_Request $request REST API request.
	 * @return \WP_REST_Response Response with submissions array and pagination data.
	 */
	public static function list_submissions( \WP_REST_Request $request ): \WP_REST_Response {
		global $wpdb;

		$table_name = $wpdb->prefix . 'sgs_form_submissions';
		$form_id    = $request->get_param( 'form_id' );
		$status     = $request->get_param( 'status' );
		$per_page   = $request->get_param( 'per_page' );
		$page       = $request->get_param( 'page' );
		$offset     = ( $page - 1 ) * $per_page;

		// Build WHERE clause.
		$where        = 'WHERE 1=1';
		$prepare_args = [];

		if ( ! empty( $form_id ) ) {
			$where         .= ' AND form_id = %s';
			$prepare_args[] = $form_id;
		}

		if ( ! empty( $status ) ) {
			$where         .= ' AND status = %s';
			$prepare_args[] = $status;
		}

		// phpcs:ignore WordPress.DB.DirectDatabaseQuery.DirectQuery,WordPress.DB.DirectDatabaseQuery.NoCaching
		$total = $wpdb->get_var(
			// phpcs:ignore WordPress.DB.PreparedSQL.InterpolatedNotPrepared
			$wpdb->prepare( "SELECT COUNT(*) FROM $table_name $where", ...$prepare_args )
		);

		// phpcs:ignore WordPress.DB.DirectDatabaseQuery.DirectQuery,WordPress.DB.DirectDatabaseQuery.NoCaching
		$rows = $wpdb->get_results(
			// phpcs:ignore WordPress.DB.PreparedSQL.InterpolatedNotPrepared
			$wpdb->prepare(
				"SELECT id, form_id, files, payment_status, payment_amount, ip_address, user_id, status, created_at FROM $table_name $where ORDER BY created_at DESC LIMIT %d OFFSET %d",
				...array_merge( $prepare_args, [ $per_page, $offset ] )
			)
		);

		$response = new \WP_REST_Response(
			[
				'submissions' => $rows,
				'total'       => (int) $total,
				'pages'       => (int) ceil( $total / $per_page ),
				'page'        => $page,
			],
			200
		);

		$response->header( 'X-WP-Total', (int) $total );
		$response->header( 'X-WP-TotalPages', (int) ceil( $total / $per_page ) );

		return $response;
	}

	/**
	 * Get a single submission by ID.
	 *
	 * @param \WP_REST_Request $request REST API request.
	 * @return \WP_REST_Response|\WP_Error Submission data or 404.
	 */
	public static function get_submission( \WP_REST_Request $request ): \WP_REST_Response|\WP_Error {
		global $wpdb;

		$table_name    = $wpdb->prefix . 'sgs_form_submissions';
		$submission_id = absint( $request->get_param( 'id' ) );

		// phpcs:ignore WordPress.DB.DirectDatabaseQuery.DirectQuery,WordPress.DB.DirectDatabaseQuery.NoCaching
		$row = $wpdb->get_row(
			$wpdb->prepare( "SELECT * FROM $table_name WHERE id = %d", $submission_id )
		);

		if ( ! $row ) {
			return new \WP_Error(
				'not_found',
				__( 'Submission not found.', 'sgs-blocks' ),
				[ 'status' => 404 ]
			);
		}

		// Decode JSON columns.
		$row->data  = json_decode( $row->data, true );
		$row->files = $row->files ? json_decode( $row->files, true ) : [];

		return new \WP_REST_Response( $row, 200 );
	}

	/**
	 * Delete a submission (GDPR erasure).
	 *
	 * @param \WP_REST_Request $request REST API request.
	 * @return \WP_REST_Response|\WP_Error Success response or 404.
	 */
	public static function delete_submission( \WP_REST_Request $request ): \WP_REST_Response|\WP_Error {
		global $wpdb;

		$table_name    = $wpdb->prefix . 'sgs_form_submissions';
		$submission_id = absint( $request->get_param( 'id' ) );

		// Check submission exists.
		// phpcs:ignore WordPress.DB.DirectDatabaseQuery.DirectQuery,WordPress.DB.DirectDatabaseQuery.NoCaching
		$exists = $wpdb->get_var(
			$wpdb->prepare( "SELECT id FROM $table_name WHERE id = %d", $submission_id )
		);

		if ( ! $exists ) {
			return new \WP_Error(
				'not_found',
				__( 'Submission not found.', 'sgs-blocks' ),
				[ 'status' => 404 ]
			);
		}

		// phpcs:ignore WordPress.DB.DirectDatabaseQuery.DirectQuery
		$deleted = $wpdb->delete( $table_name, [ 'id' => $submission_id ], [ '%d' ] );

		if ( false === $deleted ) {
			return new \WP_Error(
				'delete_failed',
				__( 'Failed to delete submission.', 'sgs-blocks' )
			);
		}

		return new \WP_REST_Response( [ 'deleted' => true, 'id' => $submission_id ], 200 );
	}

	/**
	 * Export all submissions for a given form as CSV.
	 *
	 * Streams CSV directly so large data sets don't exhaust PHP memory.
	 *
	 * @param \WP_REST_Request $request REST API request.
	 * @return void Outputs CSV and exits.
	 */
	public static function export_submissions( \WP_REST_Request $request ): void {
		global $wpdb;

		if ( ! current_user_can( 'manage_options' ) ) {
			wp_die( esc_html__( 'Permission denied.', 'sgs-blocks' ), 403 );
		}

		$table_name = $wpdb->prefix . 'sgs_form_submissions';
		$form_id    = sanitize_key( $request->get_param( 'formId' ) );

		// phpcs:ignore WordPress.DB.DirectDatabaseQuery.DirectQuery,WordPress.DB.DirectDatabaseQuery.NoCaching
		$rows = $wpdb->get_results(
			$wpdb->prepare(
				"SELECT * FROM $table_name WHERE form_id = %s ORDER BY created_at ASC",
				$form_id
			),
			ARRAY_A
		);

		// Set CSV response headers.
		header( 'Content-Type: text/csv; charset=utf-8' );
		header( 'Content-Disposition: attachment; filename="sgs-form-' . sanitize_file_name( $form_id ) . '-' . gmdate( 'Y-m-d' ) . '.csv"' );
		header( 'Pragma: no-cache' );
		header( 'Expires: 0' );

		$output = fopen( 'php://output', 'w' );

		if ( empty( $rows ) ) {
			fputcsv( $output, [ __( 'No submissions found.', 'sgs-blocks' ) ] );
			fclose( $output );
			exit;
		}

		// Build unified column list from all submissions' JSON data.
		$field_keys = [];
		foreach ( $rows as $row ) {
			$data = json_decode( $row['data'], true );
			if ( is_array( $data ) ) {
				foreach ( array_keys( $data ) as $key ) {
					if ( ! in_array( $key, $field_keys, true ) ) {
						$field_keys[] = $key;
					}
				}
			}
		}

		// CSV header row: metadata columns then dynamic field columns.
		$meta_cols = [ 'id', 'form_id', 'status', 'payment_status', 'payment_amount', 'ip_address', 'user_id', 'created_at' ];
		fputcsv( $output, array_merge( $meta_cols, $field_keys ) );

		// Data rows.
		foreach ( $rows as $row ) {
			$data    = json_decode( $row['data'], true );
			$csv_row = [];

			foreach ( $meta_cols as $col ) {
				$csv_row[] = $row[ $col ] ?? '';
			}

			foreach ( $field_keys as $key ) {
				$val = $data[ $key ] ?? '';
				// Flatten arrays (e.g. checkboxes) to comma-separated strings.
				if ( is_array( $val ) ) {
					$val = implode( ', ', $val );
				}
				$csv_row[] = $val;
			}

			fputcsv( $output, $csv_row );
		}

		fclose( $output );
		exit;
	}
}
