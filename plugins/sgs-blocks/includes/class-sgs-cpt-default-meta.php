<?php
/**
 * SGS CPT "default" post meta — `_sgs_is_default` (Client build, 2026-09-17).
 *
 * Registers ONE boolean post-meta key, `_sgs_is_default`, on `sgs_modal` only.
 * It marks which single modal post an operator has designated as the
 * fallback default for that CPT.
 *
 * ⚠ REDUCED SCOPE (2026-09-17, same-day correction): this originally also
 * covered `sgs_header` and `sgs_footer`, duplicating a mechanism that already
 * exists for those two CPTs — {@see Sgs_Active_Layout} / {@see
 * Sgs_Active_Layout_Admin} already provide a site-wide "Active" pointer +
 * admin "Set as active"/"Clear active" row actions for `sgs_header` and
 * `sgs_footer` (and `sgs_drawer`). Bean confirmed these are the same concept
 * from an operator's point of view, so the duplicate `_sgs_is_default`
 * coverage for header/footer was removed the same day it was added — the one
 * true mechanism for those two CPTs is `Sgs_Active_Layout`.
 *
 * `sgs_modal` is NOT covered by `Sgs_Active_Layout`, and deliberately was not
 * folded into it: `Sgs_Active_Layout`'s shape is "exactly one post is THE
 * live thing, site-wide" (one header renders, one footer renders, one drawer
 * renders on `wp_footer`). A `sgs_modal` post has no equivalent single
 * render slot — every `sgs/modal` BLOCK INSTANCE independently chooses which
 * `sgs_modal` post it shows via its own `modalRef` attribute (see {@see
 * Sgs_Block_CPTs::resolve_modal()}), and a page can embed many trigger
 * instances pointing at many different modal posts simultaneously. There is
 * no "the one active modal" render consumer for a site-wide pointer to feed,
 * so extending `Sgs_Active_Layout` to a 4th `sgs_modal` area would add an
 * option nobody reads — the same dead-attribute failure mode this class
 * exists to avoid. `_sgs_is_default` therefore stays modal-only for now, as a
 * plain data-layer flag with no render-side consumer yet (see the scope note
 * below) — whether/how it should wire into a future "trigger with no
 * modalRef falls back to the default modal" behaviour is a follow-up design
 * decision, not resolved here.
 *
 * Registration shape mirrors {@see Sgs_Template_Part_Meta}: `auth_callback`
 * gated on `edit_theme_options` (the capability `sgs_modal` already routes to
 * — see {@see Sgs_Block_CPTs::register_post_types()}), typed schema, a
 * sanitize callback, `show_in_rest` — here `true`, unlike the template-part
 * meta, because this value needs a block-editor Document sidebar toggle (see
 * `src/blocks/extensions/cpt-default-panel.js`) rather than being
 * pipeline-internal.
 *
 * Single-default enforcement: setting `_sgs_is_default` to true on one modal
 * post clears it on every OTHER modal post. Enforced on `updated_post_meta` /
 * `added_post_meta` (NOT `save_post` — a REST-driven Gutenberg save writes
 * post meta AFTER `save_post` already fired, so a `save_post` handler here
 * would always see the PREVIOUS value and enforce one request late).
 *
 * ⚠ Scope note: this class only registers the DATA LAYER — the meta key, its
 * single-default enforcement, and REST exposure for the editor toggle. It
 * does NOT wire `_sgs_is_default` into any modal render resolution; no such
 * fallback path exists today (see above).
 *
 * @package SGS\Blocks
 * @since   1.0.0
 */

namespace SGS\Blocks;

defined( 'ABSPATH' ) || exit;

/**
 * Class Sgs_Cpt_Default_Meta
 */
final class Sgs_Cpt_Default_Meta {

	/** Post-meta key: marks this post as the CPT-wide default/fallback. */
	public const META_IS_DEFAULT = '_sgs_is_default';

	/**
	 * Wire hooks. Call once from the plugin bootstrap.
	 */
	public static function register(): void {
		\add_action( 'init', array( self::class, 'register_meta' ) );
		\add_action( 'updated_post_meta', array( self::class, 'maybe_enforce_single_default' ), 10, 4 );
		\add_action( 'added_post_meta', array( self::class, 'maybe_enforce_single_default' ), 10, 4 );
	}

	/**
	 * The post type(s) this meta key applies to.
	 *
	 * Modal-only (2026-09-17) — `sgs_header`/`sgs_footer` were removed once
	 * confirmed duplicate of {@see Sgs_Active_Layout}. Kept as an array
	 * (rather than a single constant) because {@see register_meta()} and
	 * {@see maybe_enforce_single_default()} both iterate/check membership over
	 * it, and a second post type may join it later without changing either.
	 *
	 * @return array<int,string>
	 */
	public static function post_types(): array {
		return array(
			Sgs_Block_CPTs::MODAL_CPT,
		);
	}

	/**
	 * Register `_sgs_is_default` on each eligible post type.
	 *
	 * `auth_callback` matches {@see Sgs_Template_Part_Meta}'s gate exactly —
	 * `sgs_modal`'s capabilities already route to `edit_theme_options` (Council
	 * M1 shape), so this is the same bar the CPT itself enforces, not a new
	 * one.
	 */
	public static function register_meta(): void {
		$auth_callback = static function (): bool {
			return \current_user_can( 'edit_theme_options' );
		};

		foreach ( self::post_types() as $post_type ) {
			\register_post_meta(
				$post_type,
				self::META_IS_DEFAULT,
				array(
					'single'            => true,
					'type'              => 'boolean',
					'default'           => false,
					'show_in_rest'      => true,
					'sanitize_callback' => 'rest_sanitize_boolean',
					'auth_callback'     => $auth_callback,
					'description'       => 'Marks this post as the default/fallback for its post type. Only one post per type may be true at a time.',
				)
			);
		}
	}

	/**
	 * Enforce "only one default per post type" whenever `_sgs_is_default` is
	 * written true.
	 *
	 * Hooked on BOTH `updated_post_meta` and `added_post_meta` — the first row
	 * ever written for a given post fires `added_post_meta`, every subsequent
	 * write fires `updated_post_meta`. Re-entrant-safe: clearing another post's
	 * flag calls `update_post_meta( …, false )`, which re-fires this same
	 * action with a falsy value, which the truthy guard below immediately
	 * returns from — no loop.
	 *
	 * @param int    $meta_id    Meta row id (unused).
	 * @param int    $post_id    Post the meta belongs to.
	 * @param string $meta_key   Meta key written.
	 * @param mixed  $meta_value Sanitised value written.
	 */
	public static function maybe_enforce_single_default( $meta_id, $post_id, $meta_key, $meta_value ): void {
		unset( $meta_id );

		if ( self::META_IS_DEFAULT !== $meta_key || ! self::is_truthy( $meta_value ) ) {
			return;
		}

		$post_type = \get_post_type( (int) $post_id );
		if ( ! in_array( $post_type, self::post_types(), true ) ) {
			return;
		}

		self::clear_other_defaults( (string) $post_type, (int) $post_id );
	}

	/**
	 * Clear `_sgs_is_default` on every OTHER post of the given type.
	 *
	 * @param string $post_type    Post type slug.
	 * @param int    $keep_post_id The post that should stay the default.
	 */
	private static function clear_other_defaults( string $post_type, int $keep_post_id ): void {
		// numberposts=-1 is intentional here (mirrors Sgs_Block_CPTs' own
		// pattern-derivation query): these CPTs hold a tiny post count.
		// phpcs:ignore WordPress.WP.PostsPerPage.posts_per_page_numberposts
		$others = \get_posts(
			array(
				'post_type'     => $post_type,
				'post_status'   => 'any',
				'numberposts'   => -1,
				'no_found_rows' => true,
				'post__not_in'  => array( $keep_post_id ),
				'meta_key'      => self::META_IS_DEFAULT, // phpcs:ignore WordPress.DB.SlowDBQuery.slow_db_query_meta_key -- tiny CPT, no pagination.
				'fields'        => 'ids',
			)
		);

		foreach ( $others as $other_id ) {
			if ( self::is_truthy( \get_post_meta( (int) $other_id, self::META_IS_DEFAULT, true ) ) ) {
				\update_post_meta( (int) $other_id, self::META_IS_DEFAULT, false );
			}
		}
	}

	/**
	 * Loosely-typed truthiness check spanning the shapes this value arrives in
	 * (native `true` from a direct PHP call, the string `'1'` WordPress stores
	 * booleans as, `1`, and the string `'true'` a REST body could carry before
	 * `rest_sanitize_boolean` normalises it).
	 *
	 * @param mixed $value Value to check.
	 * @return bool
	 */
	private static function is_truthy( $value ): bool {
		return in_array( $value, array( true, 1, '1', 'true' ), true );
	}

	/**
	 * Read whether a post is currently marked default. Helper for consumers
	 * (admin columns, future render-time wiring).
	 *
	 * @param int $post_id Post id.
	 * @return bool
	 */
	public static function is_default( int $post_id ): bool {
		return self::is_truthy( \get_post_meta( $post_id, self::META_IS_DEFAULT, true ) );
	}
}
