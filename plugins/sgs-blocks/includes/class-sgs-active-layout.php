<?php
/**
 * Active header/footer pointer store (FR-37-2, FR-37-25, Spec 37).
 *
 * A header or footer is a post of type `sgs_header` / `sgs_footer`. Exactly one
 * post per type may be marked ACTIVE, and the pointer to it lives in a single
 * `wp_options` row per type. This class owns that pointer: reading it, writing
 * it, clearing it, and — critically — VALIDATING it before any caller renders
 * from it.
 *
 * Why validation lives here and not at the call site (FR-37-3 clause (c)):
 * an operator can trash or delete the active post at any time. If the render
 * branch trusted the stored id blindly it would emit an empty header with no
 * error and no failing build — the D338 silent-failure class this spec exists
 * to prevent. `get_active_id()` therefore returns 0 for a missing, trashed,
 * draft, or wrong-post-type target, and every caller falls through to the
 * immutable framework default (FR-37-4).
 *
 * Deliberately NOT a block-pattern registration path. See Spec 37 §2.2:
 * CPT-derived patterns register on `admin_init`, the render hooks fire on the
 * frontend, so a pattern-based binding can never resolve for a visitor.
 *
 * @package SGS\Blocks
 * @since   1.0.0
 */

namespace SGS\Blocks;

defined( 'ABSPATH' ) || exit;

/**
 * Class Sgs_Active_Layout
 *
 * Stateless static storage + validated resolution. The FR-37-30 `wp sgs`
 * CLI commands wrap these directly, as does the admin UI in
 * {@see Sgs_Active_Layout_Admin}.
 */
final class Sgs_Active_Layout {

	/** Option key holding the active header post id. */
	public const OPTION_HEADER = 'sgs_active_header_cpt_id';

	/** Option key holding the active footer post id. */
	public const OPTION_FOOTER = 'sgs_active_footer_cpt_id';

	/** Canonical area token for the header. */
	public const AREA_HEADER = 'header';

	/** Canonical area token for the footer. */
	public const AREA_FOOTER = 'footer';

	/**
	 * Per-request, per-area guard for the direct-render branch (FR-37-3 clause (a)).
	 *
	 * The rules engines each carry their own `$evaluated_this_request` static,
	 * but those guard `evaluate()` — NOT this branch. A template that resolves
	 * the header area twice (a nested template-part, or a theme rendering the
	 * area in two places) would otherwise emit the active post's content twice.
	 * Keyed by area so a header render never suppresses a footer render.
	 *
	 * @var array<string,bool>
	 */
	private static $render_attempted = array();

	/**
	 * Per-request, per-area record of whether this class actually SERVED markup.
	 *
	 * Deliberately separate from the recursion guard above, because "I started
	 * rendering" and "I produced a header" are different facts and the callers
	 * need the second one. See {@see self::has_served()}.
	 *
	 * @var array<string,bool>
	 */
	private static $render_served = array();

	/**
	 * Reset the per-request render state. Exposed for testing; in production
	 * the static state resets naturally because PHP processes terminate at the
	 * end of each request.
	 */
	public static function reset_request_state(): void {
		self::$render_attempted = array();
		self::$render_served    = array();
	}

	/**
	 * Did this class already serve markup for this area on this request?
	 *
	 * The caller needs this to decide what to do with a SECOND template-part
	 * for the same area on one page. Without it the rules engine takes over on
	 * the second slot and renders the framework DEFAULT header there — so the
	 * page shows the operator's header once and an unrelated header once, with
	 * no error. That is worse than a duplicate, and silent.
	 *
	 * Returns false when a render was attempted but produced nothing, so the
	 * caller still falls through to the immutable default in that case.
	 *
	 * @param string $area Area token.
	 * @return bool
	 */
	public static function has_served( string $area ): bool {
		return ! empty( self::$render_served[ $area ] );
	}

	/**
	 * Record that a header/footer was served this request by a path OTHER than
	 * render_active() — specifically the rules-engine / immutable-default path in
	 * Sgs_Header_Rules::filter_template_part(). This lets the one-header-per-request
	 * invariant (P-HEADER-DOUBLE-SLOT-NEST) suppress a duplicate second slot
	 * regardless of which path served the first header. render_active() sets the
	 * same flag inline on its own success path. Cleared by reset_request_state().
	 *
	 * @param string $area Area token.
	 */
	public static function mark_served( string $area ): void {
		self::$render_served[ $area ] = true;
	}

	/**
	 * Render the active layout's blocks for an area, once per request.
	 *
	 * This is the whole binding: read the post, run `do_blocks()`. It never
	 * consults `WP_Block_Patterns_Registry`, which is precisely why it works on
	 * a frontend request where CPT-derived patterns were never registered
	 * (Spec 37 §2.2).
	 *
	 * Returns null — meaning "I have nothing, carry on" — when there is no
	 * valid active post, or when this area has already rendered this request.
	 * The caller then falls through to the rules engine and ultimately the
	 * immutable framework default (FR-37-4).
	 *
	 * @param string $area Area token.
	 * @return string|null Rendered HTML, or null to fall through.
	 */
	public static function render_active( string $area ): ?string {
		if ( ! empty( self::$render_attempted[ $area ] ) ) {
			return null;
		}

		$content = self::get_active_content( $area );
		if ( '' === $content || ! function_exists( 'do_blocks' ) ) {
			return null;
		}

		// Set the guard BEFORE do_blocks(): the content may itself contain a
		// template-part block for this same area, which would re-enter this
		// method mid-render. Setting first makes that re-entry a no-op instead
		// of infinite recursion.
		self::$render_attempted[ $area ] = true;

		$html = (string) \do_blocks( $content );

		// Fail closed on an empty RENDER, not just on empty content.
		//
		// WordPress short-circuits `pre_render_block` on any NON-NULL return —
		// not merely a truthy one. So an empty string here would still
		// short-circuit, and the page would render a blank header with no error:
		// the D338 silent-failure class, one layer up from the content check
		// above. Validating post_content is necessary but NOT sufficient, because
		// a valid, published post whose blocks all fail their render callbacks
		// yields '' from do_blocks(). Returning null instead lets the caller fall
		// through to the rules engine and then the immutable framework default
		// (FR-37-4) — a real header rather than an empty one.
		//
		// $render_served is deliberately NOT set on this path: nothing was
		// served, so the caller must still be allowed to fall through to the
		// rules engine and the immutable default. The attempt guard above stays
		// set because a retry in the same request would render the same empty
		// result — repeating do_blocks() would cost work and change nothing.
		if ( '' === trim( $html ) ) {
			return null;
		}

		self::$render_served[ $area ] = true;

		return $html;
	}

	/**
	 * Map an area token to its option key.
	 *
	 * @param string $area Area token — 'header' or 'footer'.
	 * @return string Option key, or '' for an unknown area.
	 */
	public static function option_key( string $area ): string {
		if ( self::AREA_HEADER === $area ) {
			return self::OPTION_HEADER;
		}
		if ( self::AREA_FOOTER === $area ) {
			return self::OPTION_FOOTER;
		}
		return '';
	}

	/**
	 * Map an area token to its post type slug.
	 *
	 * @param string $area Area token — 'header' or 'footer'.
	 * @return string Post type slug, or '' for an unknown area.
	 */
	public static function post_type( string $area ): string {
		if ( self::AREA_HEADER === $area ) {
			return Sgs_Block_CPTs::HEADER_CPT;
		}
		if ( self::AREA_FOOTER === $area ) {
			return Sgs_Block_CPTs::FOOTER_CPT;
		}
		return '';
	}

	/**
	 * Return the raw stored id without validating that it still resolves.
	 *
	 * Use this ONLY where the unvalidated pointer is what you actually want —
	 * for example the admin list table, which must still highlight a row whose
	 * post has since been trashed so an operator can see why their header
	 * vanished. Every render path must use {@see self::get_active_id()}.
	 *
	 * @param string $area Area token.
	 * @return int Stored post id, or 0.
	 */
	public static function get_stored_id( string $area ): int {
		$key = self::option_key( $area );
		if ( '' === $key ) {
			return 0;
		}
		return max( 0, (int) \get_option( $key, 0 ) );
	}

	/**
	 * Return the active post id ONLY when it still resolves to a usable post.
	 *
	 * FR-37-3 clause (c). Fails closed on every one of these, so the caller
	 * falls through to the immutable default rather than rendering nothing:
	 *   - no pointer stored
	 *   - the post was deleted outright
	 *   - the post was trashed (post_status !== 'publish')
	 *   - the post is a draft or pending review
	 *   - the id points at a post of the wrong type (e.g. a footer id stored
	 *     under the header key by a bad CLI call)
	 *
	 * @param string $area Area token.
	 * @return int Usable post id, or 0.
	 */
	public static function get_active_id( string $area ): int {
		$post_id = self::get_stored_id( $area );
		if ( 0 === $post_id ) {
			return 0;
		}

		$expected_type = self::post_type( $area );
		if ( '' === $expected_type || ! function_exists( 'get_post' ) ) {
			return 0;
		}

		$post = \get_post( $post_id );
		if ( ! $post instanceof \WP_Post ) {
			return 0;
		}
		if ( $expected_type !== $post->post_type ) {
			return 0;
		}
		if ( 'publish' !== $post->post_status ) {
			return 0;
		}

		return $post_id;
	}

	/**
	 * Return the active post's raw block markup, unrendered.
	 *
	 * Returns '' whenever {@see self::get_active_id()} fails closed, so a
	 * caller can treat '' as "no active layout, use the default" without
	 * repeating the validation.
	 *
	 * @param string $area Area token.
	 * @return string Raw `post_content`, or ''.
	 */
	public static function get_active_content( string $area ): string {
		$post_id = self::get_active_id( $area );
		if ( 0 === $post_id ) {
			return '';
		}
		$post = \get_post( $post_id );
		if ( ! $post instanceof \WP_Post ) {
			return '';
		}
		return (string) $post->post_content;
	}

	/**
	 * Mark a post active for its area, replacing any previous active post.
	 *
	 * Single-active-per-type is enforced structurally: the pointer is one
	 * option holding one id, so setting a new one necessarily clears the old.
	 * There is no per-post "is active" meta that could drift out of sync with
	 * the pointer.
	 *
	 * @param string $area    Area token.
	 * @param int    $post_id Post id to activate.
	 * @return true|\WP_Error True on success, WP_Error on a rejected input.
	 */
	public static function set_active( string $area, int $post_id ) {
		$key           = self::option_key( $area );
		$expected_type = self::post_type( $area );

		if ( '' === $key || '' === $expected_type ) {
			return new \WP_Error(
				'sgs_active_layout_bad_area',
				\__( 'Unknown layout area.', 'sgs-blocks' ),
				array( 'status' => 400 )
			);
		}

		$post = \get_post( $post_id );
		if ( ! $post instanceof \WP_Post || $expected_type !== $post->post_type ) {
			return new \WP_Error(
				'sgs_active_layout_not_found',
				\__( 'That layout does not exist.', 'sgs-blocks' ),
				array( 'status' => 404 )
			);
		}

		if ( 'publish' !== $post->post_status ) {
			return new \WP_Error(
				'sgs_active_layout_not_published',
				\__( 'Publish this layout before setting it as active.', 'sgs-blocks' ),
				array( 'status' => 400 )
			);
		}

		\update_option( $key, $post_id );
		return true;
	}

	/**
	 * Clear the active pointer for an area (FR-37-25).
	 *
	 * Doubles as the rollback for the whole direct-render binding: with the
	 * pointer cleared, {@see Sgs_Header_Rules::filter_template_part()} falls
	 * straight through to the pre-existing rules engine and the immutable
	 * framework default. The previously-active post is left untouched and can
	 * be re-activated.
	 *
	 * @param string $area Area token.
	 * @return bool True when the option was removed or already absent.
	 */
	public static function clear_active( string $area ): bool {
		$key = self::option_key( $area );
		if ( '' === $key ) {
			return false;
		}
		\delete_option( $key );
		return true;
	}
}
