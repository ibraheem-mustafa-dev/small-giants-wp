<?php
/**
 * REST endpoint for site-wide style-variation activation.
 *
 * POST /wp-json/sgs/v1/active-variation
 *   body: { slug: 'mamas-munches' }
 *
 * Sets the `active_theme_style` theme_mod so the SGS theme loads the
 * matching `theme/sgs-theme/styles/<slug>.css` + `<slug>.json` variation.
 * This is the canonical activation surface for the /sgs-clone pipeline's
 * Stage 10 deploy step -- without it, Stage 0.7's lifted variation CSS
 * never enqueues on the live page and pixel-diff stays at base-theme
 * defaults regardless of cv2 output quality.
 *
 * Capability: manage_options. Same gate as WP Admin's "Browse styles ->
 * Activate" surface uses internally.
 *
 * Validation: the requested slug must correspond to an existing file at
 * theme/sgs-theme/styles/<slug>.json OR <slug>.css. Unknown slugs return
 * 400 -- the endpoint never silently sets a theme_mod for a non-existent
 * variation.
 *
 * Shipped 2026-05-20 per Pipeline Root-Gap Council R1 (variation
 * activation gap). See reports/2026-05-20-pipeline-root-gap-council/
 * systematic-debugging.md for full root-cause writeup.
 *
 * @package SGS\Blocks
 */

namespace SGS\Blocks;

defined( 'ABSPATH' ) || exit;

/**
 * Handles the sgs/v1/active-variation REST route.
 *
 * Wired from sgs-blocks.php bootstrap via Variation_REST::register().
 * Stage 10 of /sgs-clone calls the POST endpoint after patching page
 * content; the matching client style variation activates site-wide.
 */
class Variation_REST {
	/*
	 * REST namespace: `sgs/v1` (NOT `sgs-blocks/v1`).
	 *
	 * SGS uses three REST namespaces by purpose:
	 *   - `sgs-blocks/v1`  — block-render-time data (e.g. /posts for sgs/post-grid AJAX)
	 *   - `sgs-forms/v1`   — form submission and admin endpoints
	 *   - `sgs/v1`         — framework-level admin / control endpoints (e.g.
	 *                        Trustpilot Sync at includes/trustpilot/class-trustpilot-rest.php,
	 *                        and this variation activation endpoint).
	 *
	 * Variation activation is framework-control (manage_options gated, called
	 * by /sgs-clone Stage 10 deploy step, NOT by frontend block renders), so
	 * it belongs under `sgs/v1` alongside Trustpilot Sync. Verified 2026-05-20
	 * during multi-rater /qc panel: the Trustpilot Sync precedent makes this
	 * the established convention for admin-control endpoints.
	 */
	const NAMESPACE = 'sgs/v1';
	const ROUTE     = '/active-variation';

	/**
	 * Wire up the rest_api_init action.
	 *
	 * Called once from the plugin bootstrap.
	 */
	public static function register(): void {
		add_action( 'rest_api_init', array( __CLASS__, 'register_routes' ) );
	}

	/**
	 * Register the POST + GET routes with WordPress.
	 */
	public static function register_routes(): void {
		register_rest_route(
			self::NAMESPACE,
			self::ROUTE,
			array(
				array(
					'methods'             => 'POST',
					'callback'            => array( __CLASS__, 'set_active_variation' ),
					'permission_callback' => array( __CLASS__, 'permissions_check' ),
					'args'                => array(
						'slug' => array(
							'type'              => 'string',
							'required'          => true,
							'sanitize_callback' => 'sanitize_key',
						),
					),
				),
				array(
					'methods'             => 'GET',
					'callback'            => array( __CLASS__, 'get_active_variation' ),
					'permission_callback' => array( __CLASS__, 'permissions_check' ),
				),
			)
		);
	}

	/**
	 * Capability gate: same as WP Admin's variation switcher.
	 *
	 * @return bool
	 */
	public static function permissions_check(): bool {
		return current_user_can( 'manage_options' );
	}

	/**
	 * POST handler: validate the slug, set the theme_mod, return the result.
	 *
	 * @param \WP_REST_Request $request Incoming request.
	 * @return \WP_REST_Response|\WP_Error
	 */
	public static function set_active_variation( \WP_REST_Request $request ) {
		$slug = (string) $request->get_param( 'slug' );

		if ( '' === $slug ) {
			return new \WP_Error(
				'sgs_invalid_slug',
				'slug parameter is empty',
				array( 'status' => 400 )
			);
		}

		$json_path = get_theme_file_path( "styles/{$slug}.json" );
		$css_path  = get_theme_file_path( "styles/{$slug}.css" );
		if ( ! file_exists( $json_path ) && ! file_exists( $css_path ) ) {
			return new \WP_Error(
				'sgs_unknown_variation',
				sprintf(
					'no variation file found at styles/%s.json or styles/%s.css',
					$slug,
					$slug
				),
				array( 'status' => 400 )
			);
		}

		$previous = (string) get_theme_mod( 'active_theme_style', '' );
		set_theme_mod( 'active_theme_style', $slug );

		// Read back to confirm the write actually took. set_theme_mod returns
		// void; without a read-back we can't tell whether a competing filter
		// or option-write hook intercepted the value. The orchestrator's
		// Stage 10 caller uses `activated:false` to surface a halt-warning.
		$confirmed = (string) get_theme_mod( 'active_theme_style', '' ) === $slug;

		return rest_ensure_response(
			array(
				'slug'                  => $slug,
				'previous_slug'         => $previous,
				'activated'             => $confirmed,
				'variation_json_exists' => file_exists( $json_path ),
				'variation_css_exists'  => file_exists( $css_path ),
			)
		);
	}

	/**
	 * GET handler: return the currently active variation slug.
	 *
	 * @return \WP_REST_Response
	 */
	public static function get_active_variation() {
		$slug = (string) get_theme_mod( 'active_theme_style', '' );
		return rest_ensure_response(
			array(
				'slug' => $slug,
			)
		);
	}
}
