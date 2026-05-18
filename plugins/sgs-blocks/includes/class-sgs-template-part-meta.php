<?php
/**
 * SGS Template Part Meta — FR-S7-4.
 *
 * Registers three post-meta keys on the wp_template_part post type that the
 * cloning pipeline uses to track which pattern seeded each template part record.
 *
 * Meta keys:
 *   _sgs_cloned_from_pattern_slug — slug of the block pattern that seeded this record.
 *   _sgs_last_seeded_variation    — style variation slug active at last seeding.
 *   _sgs_last_seeded_at           — Unix timestamp of last seeding event.
 *
 * All three keys are registered with auth_callback requiring edit_theme_options
 * (Council C1) and are NOT exposed via the REST API (show_in_rest => false).
 *
 * Re-clone idempotence logic (M3):
 *   - Meta present  → safe to overwrite (pipeline-seeded record).
 *   - Meta absent   → skip + warn (operator-edited record; preserve it).
 *   - --force flag  → bypass check (acknowledged destructive operation, Wave 3 CLI).
 *
 * @package SGS\Blocks
 */

namespace SGS\Blocks;

defined( 'ABSPATH' ) || exit;

/**
 * Registers and provides helper API for SGS template-part post meta.
 */
final class Sgs_Template_Part_Meta {

	/**
	 * Post-meta key: slug of the block pattern that seeded this template part.
	 *
	 * @var string
	 */
	const META_PATTERN_SLUG = '_sgs_cloned_from_pattern_slug';

	/**
	 * Post-meta key: style variation slug that was active at last seeding.
	 *
	 * @var string
	 */
	const META_VARIATION_SLUG = '_sgs_last_seeded_variation';

	/**
	 * Post-meta key: Unix timestamp (UTC) of the last seeding event.
	 *
	 * @var string
	 */
	const META_SEEDED_AT = '_sgs_last_seeded_at';

	/**
	 * Post type that owns these meta keys.
	 *
	 * @var string
	 */
	const POST_TYPE = 'wp_template_part';

	// -------------------------------------------------------------------------
	// Sanitisation helper.
	// -------------------------------------------------------------------------

	/**
	 * Sanitise a pattern slug while preserving the namespace separator.
	 *
	 * WordPress's sanitize_key() strips the forward slash, mangling slugs such
	 * as 'sgs/framework-header-default' to 'sgsframework-header-default' and
	 * breaking round-trip integrity against WP_Block_Patterns_Registry.
	 *
	 * This sanitiser allows exactly the characters present in valid SGS pattern
	 * slugs: lowercase letters, digits, hyphens, underscores, slashes, and dots.
	 * It provides equivalent XSS/injection safety — no spaces, no angle brackets,
	 * no quotes — while keeping the slash intact.
	 *
	 * @param string $slug Raw slug value.
	 * @return string Sanitised slug safe for storage and registry look-up.
	 */
	public static function sanitize_pattern_slug( string $slug ): string {
		return \preg_replace( '/[^a-z0-9_\-\/\.]/', '', \strtolower( $slug ) );
	}

	// -------------------------------------------------------------------------
	// Boot.
	// -------------------------------------------------------------------------

	/**
	 * Register hooks. Call once from the plugin bootstrap.
	 */
	public static function register(): void {
		\add_action( 'init', array( self::class, 'register_meta' ) );
	}

	// -------------------------------------------------------------------------
	// Meta registration.
	// -------------------------------------------------------------------------

	/**
	 * Register the three post-meta keys on the wp_template_part post type.
	 *
	 * All keys are registered with:
	 *   - single         => true   (one value per post)
	 *   - show_in_rest   => false  (sensitive pipeline data; not exposed via REST)
	 *   - auth_callback  => checks edit_theme_options (Council C1)
	 *
	 * Sanitisation:
	 *   - Slug fields use sgs_sanitize_pattern_slug() — lowercase alphanumeric plus
	 *     hyphens, underscores, forward slashes, and dots — preserving the namespace
	 *     separator in SGS pattern slugs (e.g. 'sgs/framework-header-default').
	 *     Using sanitize_key() would strip the slash, breaking round-trip integrity.
	 *   - Timestamp field uses absint() (positive integer only).
	 */
	public static function register_meta(): void {
		$auth_callback = static function (): bool {
			return \current_user_can( 'edit_theme_options' );
		};

		\register_post_meta(
			self::POST_TYPE,
			self::META_PATTERN_SLUG,
			array(
				'single'            => true,
				'show_in_rest'      => false,
				'sanitize_callback' => array( self::class, 'sanitize_pattern_slug' ),
				'auth_callback'     => $auth_callback,
				'type'              => 'string',
				'description'       => 'Slug of the block pattern that seeded this template part record.',
			)
		);

		\register_post_meta(
			self::POST_TYPE,
			self::META_VARIATION_SLUG,
			array(
				'single'            => true,
				'show_in_rest'      => false,
				'sanitize_callback' => array( self::class, 'sanitize_pattern_slug' ),
				'auth_callback'     => $auth_callback,
				'type'              => 'string',
				'description'       => 'Style variation slug that was active at the last seeding event.',
			)
		);

		\register_post_meta(
			self::POST_TYPE,
			self::META_SEEDED_AT,
			array(
				'single'            => true,
				'show_in_rest'      => false,
				'sanitize_callback' => 'absint',
				'auth_callback'     => $auth_callback,
				'type'              => 'integer',
				'description'       => 'Unix timestamp (UTC) of the last seeding event.',
			)
		);
	}

	// -------------------------------------------------------------------------
	// Helper API.
	// -------------------------------------------------------------------------

	/**
	 * Write all three meta keys when a template part is seeded by the pipeline.
	 *
	 * Capability must be verified by the caller (e.g. FR-S2-1 seeding hook or
	 * the wp sgs seed-template-parts CLI command) before invoking this method.
	 *
	 * @param int    $post_id       ID of the wp_template_part post.
	 * @param string $pattern_slug  Slug of the block pattern that was applied.
	 * @param string $variation_slug Style variation slug that was active at seeding.
	 */
	public static function mark_seeded( int $post_id, string $pattern_slug, string $variation_slug ): void {
		\update_post_meta( $post_id, self::META_PATTERN_SLUG, self::sanitize_pattern_slug( $pattern_slug ) );
		\update_post_meta( $post_id, self::META_VARIATION_SLUG, self::sanitize_pattern_slug( $variation_slug ) );
		\update_post_meta( $post_id, self::META_SEEDED_AT, \time() );
	}

	/**
	 * Check whether a template part was seeded by the SGS pipeline.
	 *
	 * Returns true when _sgs_cloned_from_pattern_slug is set and non-empty.
	 * A non-pipeline record (operator-edited) will not have this meta key.
	 *
	 * @param int $post_id ID of the wp_template_part post.
	 * @return bool
	 */
	public static function is_pipeline_seeded( int $post_id ): bool {
		$slug = \get_post_meta( $post_id, self::META_PATTERN_SLUG, true );
		return \is_string( $slug ) && '' !== $slug;
	}

	/**
	 * Determine whether a template part should be re-seeded for a new variation.
	 *
	 * Returns true when BOTH conditions hold:
	 *   1. The record was pipeline-seeded (meta present).
	 *   2. The stored variation slug differs from $new_variation_slug (M3 slug comparison).
	 *
	 * A record that passes this check is safe to overwrite; the caller should
	 * call mark_seeded() after writing the new content.
	 *
	 * A record that fails this check (meta absent, or variation unchanged) must
	 * NOT be overwritten unless the caller holds an explicit --force flag.
	 *
	 * @param int    $post_id            ID of the wp_template_part post.
	 * @param string $new_variation_slug Slug of the variation being activated.
	 * @return bool True = safe to reseed; false = skip or require --force.
	 */
	public static function should_reseed( int $post_id, string $new_variation_slug ): bool {
		if ( ! self::is_pipeline_seeded( $post_id ) ) {
			return false;
		}

		$stored_variation = \get_post_meta( $post_id, self::META_VARIATION_SLUG, true );

		// Reseed only when the active variation has actually changed.
		return self::sanitize_pattern_slug( $new_variation_slug ) !== (string) $stored_variation;
	}
}
