<?php
/**
 * REST: per-page motion budget — `GET /wp-json/sgs/v1/motion-budget?post_id=<id>`.
 *
 * WHY THIS EXISTS
 * `src/blocks/extensions/fx.js:1015-1038` documented this exact interface and
 * then deliberately COMPUTED NOTHING ITSELF, on the stated grounds that a
 * second independently-derived cost would give the operator two numbers that
 * can silently disagree. Nothing ever registered the route, so every editor
 * load 404'd. The client handles that gracefully (it treats any error as "no
 * data yet" and renders nothing), so this was console noise rather than a
 * broken feature — but a permanent 404 on every page load is still noise that
 * hides real errors, and the measurement it wanted already existed.
 *
 * WHAT IT RETURNS — the measurement `Sgs_Motion_Diagnostics` already performs
 * for its admin page, not a new one. That class fetches the page's own live
 * URL and reads the bytes a real visitor receives. Its docblock explicitly
 * names `fx.js` as the consumer that "should read rather than inventing its
 * own threshold", so this is the sanctioned join, not a new coupling.
 *
 * Response shape (matches the fx.js contract verbatim):
 *   200 { totalKb, budgetKb, overBudget, effects: [ { effect, kb } ] }
 *
 * ⚠ `effects[].kb` figures do NOT sum to `totalKb`, by design. Only a module
 * named `fx-<effect>.js` is attributed to an effect; the shared GSAP core and
 * any module serving several effects are real page cost with no single owner,
 * and apportioning them would invent a number nobody measured. `totalKb` is
 * the authoritative figure.
 *
 * ⚠ MEASURABILITY. A post with no live URL (draft, auto-draft, pending) cannot
 * be measured — there is nothing to fetch. That returns `null` fields rather
 * than zeros: a 0 would read as "this page is free", which is a different and
 * false claim. `fx.js` already renders nothing when `totalKb` is not a number.
 *
 * SECURITY. Authenticated + per-post capability checked (`edit_post`), so this
 * never becomes an unauthenticated way to make the site fetch its own pages.
 * `post_id` is validated and sanitised. The underlying measurement is
 * transient-cached, keyed on the post's modified time, so repeated editor
 * loads do not each trigger an outbound request.
 *
 * @package SGS\Blocks
 */

namespace SGS\Blocks;

defined( 'ABSPATH' ) || exit;

/**
 * Register the route.
 *
 * @return void
 */
function sgs_register_motion_budget_route(): void {
	\register_rest_route(
		'sgs/v1',
		'/motion-budget',
		array(
			'methods'             => 'GET',
			'callback'            => __NAMESPACE__ . '\\sgs_motion_budget_response',
			'permission_callback' => __NAMESPACE__ . '\\sgs_motion_budget_permission',
			'args'                => array(
				'post_id' => array(
					'required'          => true,
					'type'              => 'integer',
					'validate_callback' => static function ( $value ) {
						return \is_numeric( $value ) && (int) $value > 0;
					},
					'sanitize_callback' => 'absint',
				),
			),
		)
	);
}
\add_action( 'rest_api_init', __NAMESPACE__ . '\\sgs_register_motion_budget_route' );

/**
 * Only somebody who may edit THIS post may measure it.
 *
 * Deliberately per-post rather than a blanket `edit_posts`: the endpoint makes
 * the server fetch a URL, so it must not be reachable by anyone who could not
 * already open that post in the editor.
 *
 * @param \WP_REST_Request $request Request.
 * @return bool|\WP_Error
 */
function sgs_motion_budget_permission( $request ) {
	$post_id = \absint( $request->get_param( 'post_id' ) );
	if ( ! $post_id || ! \get_post( $post_id ) ) {
		return new \WP_Error(
			'sgs_motion_budget_no_post',
			\__( 'That post does not exist.', 'sgs-blocks' ),
			array( 'status' => 404 )
		);
	}
	if ( ! \current_user_can( 'edit_post', $post_id ) ) {
		return new \WP_Error(
			'sgs_motion_budget_forbidden',
			\__( 'You are not allowed to measure this post.', 'sgs-blocks' ),
			array( 'status' => \rest_authorization_required_code() )
		);
	}
	return true;
}

/**
 * Build the response.
 *
 * @param \WP_REST_Request $request Request.
 * @return \WP_REST_Response
 */
function sgs_motion_budget_response( $request ) {
	$post_id = \absint( $request->get_param( 'post_id' ) );

	if ( ! \class_exists( __NAMESPACE__ . '\\Sgs_Motion_Diagnostics' ) ) {
		return \rest_ensure_response( sgs_motion_budget_empty() );
	}

	$result = Sgs_Motion_Diagnostics::measure_post( $post_id );
	if ( null === $result ) {
		// Not measurable (unpublished, no permalink, fetch failed). NOT zero.
		return \rest_ensure_response( sgs_motion_budget_empty() );
	}

	$total_bytes  = (int) ( $result['total_bytes_gzip'] ?? 0 );
	$budget_bytes = (int) ( $result['budget_bytes_gzip'] ?? Sgs_Motion_Diagnostics::BUDGET_BYTES_GZIP );

	$effects = array();
	foreach ( Sgs_Motion_Diagnostics::attribute_effect_bytes( $result ) as $row ) {
		$effects[] = array(
			'effect' => (string) $row['effect'],
			'kb'     => \round( $row['bytes_gzip'] / 1024, 1 ),
		);
	}

	return \rest_ensure_response(
		array(
			'totalKb'     => \round( $total_bytes / 1024, 1 ),
			'budgetKb'    => \round( $budget_bytes / 1024, 1 ),
			'overBudget'  => $total_bytes > $budget_bytes,
			'effects'     => $effects,
			// Named so a future consumer cannot mistake the per-effect figures
			// for a breakdown that adds up. See this file's header.
			'effectsArePartialAttribution' => true,
		)
	);
}

/**
 * The "no data" payload.
 *
 * `totalKb` is null, never 0 — `fx.js` renders cost information only when it
 * sees a number, and a 0 would assert "this page costs nothing", which is a
 * claim this endpoint has not measured.
 *
 * @return array<string,mixed>
 */
function sgs_motion_budget_empty(): array {
	return array(
		'totalKb'    => null,
		'budgetKb'   => \class_exists( __NAMESPACE__ . '\\Sgs_Motion_Diagnostics' )
			? \round( Sgs_Motion_Diagnostics::BUDGET_BYTES_GZIP / 1024, 1 )
			: null,
		'overBudget' => false,
		'effects'    => array(),
	);
}
