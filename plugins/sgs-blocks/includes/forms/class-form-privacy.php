<?php
/**
 * GDPR personal data hooks for SGS form submissions.
 *
 * Registers exporters and erasers with the WordPress Privacy API so that
 * form submissions are included when a site processes a data export or
 * erasure request under UK/EU GDPR obligations.
 *
 * @see https://developer.wordpress.org/plugins/privacy/adding-the-personal-data-eraser-to-your-plugin/
 * @see https://developer.wordpress.org/plugins/privacy/adding-the-personal-data-exporter-to-your-plugin/
 *
 * @package SGS\Blocks\Forms
 */

namespace SGS\Blocks\Forms;

defined( 'ABSPATH' ) || exit;

class Form_Privacy {

	/**
	 * Number of submissions to process per pagination page.
	 *
	 * WordPress will call the exporter/eraser repeatedly with an
	 * incrementing page number until `done` is returned as true.
	 * Keeping this below 500 avoids PHP memory exhaustion on sites
	 * with a large volume of form submissions.
	 *
	 * @var int
	 */
	const ITEMS_PER_PAGE = 500;

	/**
	 * Register GDPR privacy hooks.
	 *
	 * Called once during plugin bootstrap. Attaches to the two
	 * WordPress Privacy API filters that drive Tools > Export Personal
	 * Data and Tools > Erase Personal Data in the admin.
	 */
	public static function register(): void {
		add_filter( 'wp_privacy_personal_data_exporters', [ __CLASS__, 'register_exporter' ] );
		add_filter( 'wp_privacy_personal_data_erasers',  [ __CLASS__, 'register_eraser' ] );
	}

	// -------------------------------------------------------------------------
	// Filter callbacks
	// -------------------------------------------------------------------------

	/**
	 * Register the SGS Forms personal data exporter.
	 *
	 * @param array $exporters Existing registered exporters.
	 * @return array Exporters array with SGS Forms appended.
	 */
	public static function register_exporter( array $exporters ): array {
		$exporters['sgs-form-submissions'] = [
			'exporter_friendly_name' => __( 'SGS Form Submissions', 'sgs-blocks' ),
			'callback'               => [ __CLASS__, 'export_data' ],
		];
		return $exporters;
	}

	/**
	 * Register the SGS Forms personal data eraser.
	 *
	 * @param array $erasers Existing registered erasers.
	 * @return array Erasers array with SGS Forms appended.
	 */
	public static function register_eraser( array $erasers ): array {
		$erasers['sgs-form-submissions'] = [
			'eraser_friendly_name' => __( 'SGS Form Submissions', 'sgs-blocks' ),
			'callback'             => [ __CLASS__, 'erase_data' ],
		];
		return $erasers;
	}

	// -------------------------------------------------------------------------
	// Exporter
	// -------------------------------------------------------------------------

	/**
	 * Export form submission data for a given e-mail address.
	 *
	 * WordPress invokes this callback in a loop, incrementing `$page`
	 * on each request, until the callback returns `done => true`.
	 * Each page fetches at most ITEMS_PER_PAGE rows.
	 *
	 * The `data` column is a JSON object whose keys are sanitised form
	 * field names and whose values are the submitted field values. The
	 * e-mail match uses a case-insensitive LIKE against the lowercased
	 * JSON text, with the address wrapped in `"` characters to target
	 * JSON string values rather than key names or partial substrings.
	 *
	 * @param string $email_address The e-mail address whose data to export.
	 * @param int    $page          1-indexed pagination page sent by WordPress.
	 * @return array {
	 *     @type array[] $data  Export item arrays.
	 *     @type bool    $done  True once all pages have been processed.
	 * }
	 */
	public static function export_data( string $email_address, int $page = 1 ): array {
		global $wpdb;

		$table_name = $wpdb->prefix . 'sgs_form_submissions';
		$offset     = ( $page - 1 ) * self::ITEMS_PER_PAGE;

		// Build a case-insensitive LIKE pattern that targets the e-mail
		// address as a JSON string value (surrounded by double quotes).
		$email_lower = strtolower( $email_address );
		$like        = '%' . $wpdb->esc_like( '"' . $email_lower . '"' ) . '%';

		// phpcs:ignore WordPress.DB.DirectDatabaseQuery.DirectQuery,WordPress.DB.DirectDatabaseQuery.NoCaching
		$submissions = $wpdb->get_results(
			$wpdb->prepare(
				"SELECT id, form_id, data, files, created_at
				 FROM {$table_name}
				 WHERE LOWER( data ) LIKE %s
				 ORDER BY created_at DESC
				 LIMIT %d OFFSET %d",
				$like,
				self::ITEMS_PER_PAGE,
				$offset
			)
		);

		$export_items = [];

		foreach ( $submissions as $submission ) {
			$fields    = json_decode( $submission->data, true );
			$item_data = [];

			if ( is_array( $fields ) ) {
				foreach ( $fields as $field_key => $field_value ) {
					// Convert snake_case / kebab-case keys to readable labels.
					$label = ucwords( str_replace( [ '-', '_' ], ' ', $field_key ) );

					$item_data[] = [
						'name'  => $label,
						'value' => is_array( $field_value )
							? implode( ', ', array_map( 'strval', $field_value ) )
							: (string) $field_value,
					];
				}
			}

			// Append uploaded file names + sizes — never a path or URL.
			// The files themselves are private (class-form-upload.php); an
			// admin who needs the file itself uses Form_Download's
			// authenticated link, not this export.
			$files = $submission->files ? json_decode( $submission->files, true ) : [];

			if ( is_array( $files ) ) {
				foreach ( $files as $file ) {
					if ( empty( $file['name'] ) ) {
						continue;
					}

					$item_data[] = [
						'name'  => __( 'Uploaded file', 'sgs-blocks' ),
						'value' => sprintf(
							/* translators: 1: file name, 2: human-readable file size */
							__( '%1$s (%2$s)', 'sgs-blocks' ),
							$file['name'],
							size_format( isset( $file['size'] ) ? (int) $file['size'] : 0 )
						),
					];
				}
			}

			// Append submission-level metadata after the field values.
			$item_data[] = [
				'name'  => __( 'Form ID', 'sgs-blocks' ),
				'value' => $submission->form_id,
			];
			$item_data[] = [
				'name'  => __( 'Submitted At', 'sgs-blocks' ),
				'value' => $submission->created_at,
			];

			$export_items[] = [
				'group_id'    => 'sgs-form-submissions',
				'group_label' => __( 'SGS Form Submissions', 'sgs-blocks' ),
				'item_id'     => 'sgs-submission-' . absint( $submission->id ),
				'data'        => $item_data,
			];
		}

		// If fewer rows were returned than the page size, all pages are done.
		$done = count( $submissions ) < self::ITEMS_PER_PAGE;

		return [
			'data' => $export_items,
			'done' => $done,
		];
	}

	// -------------------------------------------------------------------------
	// Eraser
	// -------------------------------------------------------------------------

	/**
	 * Erase form submission data for a given e-mail address.
	 *
	 * WordPress calls this in a loop (incrementing `$page`) until
	 * `done => true` is returned. Rows are deleted in batches of
	 * ITEMS_PER_PAGE; when fewer rows remain than the batch size the
	 * eraser signals completion.
	 *
	 * @param string $email_address The e-mail address whose data to erase.
	 * @param int    $page          1-indexed pagination page sent by WordPress.
	 * @return array {
	 *     @type int      $items_removed  Number of submissions deleted in this pass.
	 *     @type int      $items_retained Number of submissions intentionally kept.
	 *     @type string[] $messages       Optional messages for the admin log.
	 *     @type bool     $done           True once no further rows remain.
	 * }
	 */
	public static function erase_data( string $email_address, int $page = 1 ): array {
		global $wpdb;

		$table_name  = $wpdb->prefix . 'sgs_form_submissions';
		$email_lower = strtolower( $email_address );
		$like        = '%' . $wpdb->esc_like( '"' . $email_lower . '"' ) . '%';

		// Fetch IDs (+ files, for the file cleanup below) for the current
		// batch — rows are deleted by ID to avoid a time-of-check/
		// time-of-delete race on the LIKE predicate.
		// phpcs:ignore WordPress.DB.DirectDatabaseQuery.DirectQuery,WordPress.DB.DirectDatabaseQuery.NoCaching
		$rows = $wpdb->get_results(
			$wpdb->prepare(
				"SELECT id, files FROM {$table_name}
				 WHERE LOWER( data ) LIKE %s
				 LIMIT %d",
				$like,
				self::ITEMS_PER_PAGE
			)
		);

		$ids           = wp_list_pluck( $rows, 'id' );
		$items_removed = 0;
		$files_removed = self::delete_uploaded_files( $rows );

		if ( ! empty( $ids ) ) {
			// Build the IN ( %d, %d, … ) clause dynamically.
			$id_placeholders = implode( ', ', array_fill( 0, count( $ids ), '%d' ) );

			// phpcs:ignore WordPress.DB.DirectDatabaseQuery.DirectQuery,WordPress.DB.DirectDatabaseQuery.NoCaching
			$deleted = $wpdb->query(
				// phpcs:ignore WordPress.DB.PreparedSQL.InterpolatedNotPrepared
				$wpdb->prepare(
					"DELETE FROM {$table_name} WHERE id IN ( {$id_placeholders} )",
					...$ids
				)
			);

			$items_removed = ( false !== $deleted ) ? (int) $deleted : 0;
		}

		// If the batch was smaller than the page size there are no more rows.
		$done = count( $ids ) < self::ITEMS_PER_PAGE;

		$messages = [];

		if ( $files_removed > 0 ) {
			$messages[] = sprintf(
				/* translators: %d: number of uploaded files deleted */
				_n(
					'Deleted %d uploaded file.',
					'Deleted %d uploaded files.',
					$files_removed,
					'sgs-blocks'
				),
				$files_removed
			);
		}

		return [
			'items_removed'  => $items_removed,
			'items_retained' => 0,
			'messages'       => $messages,
			'done'           => $done,
		];
	}

	/**
	 * Delete every uploaded file attached to a batch of submission rows.
	 *
	 * Called BEFORE the submission rows themselves are deleted, so this
	 * is the only chance to clean up the files — leaving them behind
	 * would defeat the point of a GDPR erasure request for health data.
	 *
	 * Only ever touches an attachment that carries
	 * `Form_Upload::UPLOAD_META_KEY` — a submission's `files` JSON is
	 * otherwise-untrusted stored data, and this guard is what stops it
	 * being used to delete an unrelated attachment.
	 *
	 * @param object[] $rows Rows with `id` and `files` (raw JSON) properties.
	 * @return int Number of files actually removed from disk.
	 */
	private static function delete_uploaded_files( array $rows ): int {
		$removed = 0;

		foreach ( $rows as $row ) {
			if ( empty( $row->files ) ) {
				continue;
			}

			$files = json_decode( $row->files, true );

			if ( ! is_array( $files ) ) {
				continue;
			}

			foreach ( $files as $file ) {
				if ( empty( $file['id'] ) ) {
					continue;
				}

				$file_id = absint( $file['id'] );

				if ( ! get_post_meta( $file_id, Form_Upload::UPLOAD_META_KEY, true ) ) {
					continue;
				}

				$file_path = get_attached_file( $file_id );

				// wp_delete_attachment() removes the attachment post and (via
				// wp_delete_file_from_directory()) its file — but that helper
				// refuses to delete a path outside the uploads basedir, which
				// is exactly our outside-webroot private directory. Fall back
				// to a manual, path-verified delete when the file survives.
				wp_delete_attachment( $file_id, true );

				if ( ! $file_path || ! file_exists( $file_path ) ) {
					++$removed;
					continue;
				}

				$private_dir = Form_Upload::resolve_private_dir();

				if ( is_wp_error( $private_dir ) ) {
					continue;
				}

				$real_file = realpath( $file_path );
				$real_dir  = realpath( $private_dir['path'] );

				if ( $real_file && $real_dir && 0 === strpos( $real_file, $real_dir ) ) {
					wp_delete_file( $real_file );
				}

				if ( ! file_exists( $file_path ) ) {
					++$removed;
				}
			}
		}

		return $removed;
	}
}
