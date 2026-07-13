<?php
/**
 * SGS Site Info — REST write endpoint (pipeline business-info sync, Tier 1).
 *
 * Exposes POST /wp-json/sgs/v1/site-info so the cloning pipeline can populate
 * the Business Details store remotely with HIGH-CONFIDENCE values extracted from
 * a draft (mailto: → email, tel: → phone, known social-domain links → socials,
 * © line → copyright). Capability-gated to `edit_theme_options`; every value is
 * key-allowlisted (Sgs_Site_Info::known_keys) + per-key sanitised by
 * Sgs_Site_Info::set(). Default mode is FILL-IF-EMPTY: an existing non-empty
 * value is never overwritten (the operator's edits win) unless overwrite=true.
 *
 * This is the ONLY remote write path into the Site Info store — there is no
 * public read/write of business data here; reads stay server-side + escaped.
 *
 * @package SGS\Blocks
 */

namespace SGS\Blocks;

defined( 'ABSPATH' ) || exit;

require_once __DIR__ . '/class-sgs-site-info.php';

/**
 * Class Sgs_Site_Info_Rest
 *
 * Registers the capability-gated Site Info write route.
 */
final class Sgs_Site_Info_Rest {

	/**
	 * REST namespace (shared SGS namespace).
	 *
	 * @var string
	 */
	const REST_NAMESPACE = 'sgs/v1';

	/**
	 * Route path (relative to the namespace).
	 *
	 * @var string
	 */
	const REST_ROUTE = '/site-info';

	/**
	 * Wire the route registration on rest_api_init.
	 *
	 * @return void
	 */
	public static function register(): void {
		\add_action( 'rest_api_init', array( __CLASS__, 'register_route' ) );
	}

	/**
	 * Register POST /sgs/v1/site-info.
	 *
	 * @return void
	 */
	public static function register_route(): void {
		\register_rest_route(
			self::REST_NAMESPACE,
			self::REST_ROUTE,
			array(
				'methods'             => 'POST',
				'callback'            => array( __CLASS__, 'handle_write' ),
				'permission_callback' => array( __CLASS__, 'can_write' ),
				'args'                => array(
					'fields'    => array(
						'required'    => true,
						'type'        => 'object',
						'description' => 'Map of Site Info key → value to write (e.g. {"email":"a@b.com"}).',
					),
					'overwrite' => array(
						'required'    => false,
						'type'        => 'boolean',
						'default'     => false,
						'description' => 'When false (default), never overwrite an existing non-empty value.',
					),
				),
			)
		);
	}

	/**
	 * Permission callback — only operators who can edit theme options may write.
	 *
	 * @return bool
	 */
	public static function can_write(): bool {
		return \current_user_can( 'edit_theme_options' );
	}

	/**
	 * Write handler. Applies key allowlist + fill-if-empty + per-key sanitisation
	 * (via Sgs_Site_Info::set()), and returns a per-field disposition report.
	 *
	 * @param \WP_REST_Request $request The REST request.
	 * @return \WP_REST_Response
	 */
	public static function handle_write( \WP_REST_Request $request ): \WP_REST_Response {
		$fields    = $request->get_param( 'fields' );
		$overwrite = (bool) $request->get_param( 'overwrite' );

		$result = array(
			'written'          => array(),
			'unchanged'        => array(),
			'skipped_existing' => array(),
			'skipped_invalid'  => array(),
			'skipped_empty'    => array(),
			'failed'           => array(),
		);

		if ( ! is_array( $fields ) ) {
			return new \WP_REST_Response(
				array( 'error' => 'fields must be an object of key => value pairs' ),
				400
			);
		}

		$allowed = array_flip( Sgs_Site_Info::known_keys() );

		foreach ( $fields as $key => $value ) {
			$key = (string) $key;

			// Only well-known Site Info keys may be written (prevents arbitrary
			// wp_options key writes even though set() also validates).
			if ( ! isset( $allowed[ $key ] ) ) {
				$result['skipped_invalid'][] = $key;
				continue;
			}

			// Never write an empty value (empty is the "unset" state).
			if ( ! is_scalar( $value ) || '' === trim( (string) $value ) ) {
				$result['skipped_empty'][] = $key;
				continue;
			}

			// Fill-if-empty: an existing non-empty value is the operator's — keep it.
			if ( ! $overwrite ) {
				$existing = Sgs_Site_Info::get( $key, '' );
				if ( is_scalar( $existing ) && '' !== trim( (string) $existing ) ) {
					$result['skipped_existing'][] = $key;
					continue;
				}
			}

			// No-op guard: if the stored value already equals this value,
			// update_option() returns false (WP no-change semantics) and set()
			// would report false — that's "unchanged", not a failure.
			$current = Sgs_Site_Info::get( $key, '' );
			if ( is_scalar( $current ) && trim( (string) $current ) === trim( (string) $value ) ) {
				$result['unchanged'][] = $key;
				continue;
			}

			// Sgs_Site_Info::set() re-checks the capability, re-validates the key,
			// and sanitises the value per the key's sanitiser.
			if ( Sgs_Site_Info::set( $key, (string) $value ) ) {
				$result['written'][] = $key;
			} else {
				$result['failed'][] = $key;
			}
		}

		return new \WP_REST_Response(
			array(
				'ok'        => true,
				'overwrite' => $overwrite,
				'result'    => $result,
			),
			200
		);
	}
}
