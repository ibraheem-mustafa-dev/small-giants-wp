<?php
/**
 * Edit-safety hooks for WooCommerce attribute terms and product variations
 * (FR-27-R3 edit-safety).
 *
 * Responsibilities:
 *  1. Slug-rename warning — when an admin changes an attribute term's slug in a
 *     pa_* taxonomy, fire a dismissible admin notice explaining the risk
 *     (broken links, Google Merchant errors). Does NOT hard-block the rename.
 *  2. Delete-variation warning + orphan cleanup — when a product_variation post
 *     is deleted, check for linked order history and surface a warning if found.
 *     Regardless of orders, delete all Configurator_Meta postmeta keys so no
 *     orphaned rows linger after the variation is gone.
 *
 * Security contracts:
 *  - All save-path hooks run capability checks (`manage_woocommerce` for term
 *    operations, `edit_post` for variation deletion detection).
 *  - No user-supplied data is written — hooks are read-only apart from the
 *    orphan-cleanup delete_post_meta() calls and the transient writes used for
 *    the admin notice pipeline.
 *  - Transient keys are scoped to the user ID so multi-admin sites don't leak
 *    notices across accounts.
 *
 * @package SGS\Blocks
 */

namespace SGS\Blocks;

defined( 'ABSPATH' ) || exit;

/**
 * Edit-safety guards for Configurator_Meta-managed terms and variations.
 */
final class Configurator_Edit_Safety {

	/**
	 * Transient lifetime for queued admin notices (seconds).
	 * Long enough to survive the post-save redirect; short enough to auto-expire.
	 */
	const NOTICE_TTL = 60;

	/**
	 * Maximum number of orders queried when checking variation history.
	 * Defensive cap — avoids slow queries on large shops.
	 */
	const ORDER_LOOKUP_LIMIT = 5;

	/**
	 * Variation postmeta keys managed by Configurator_Meta.
	 * Deleted on variation deletion as orphan-cleanup (defensive + idempotent).
	 *
	 * `_sgs_variation_upsert_key` is SGS bookkeeping meta — also cleaned up here
	 * because it references the now-deleted variation and has no further purpose.
	 *
	 * @var string[]
	 */
	const VARIATION_META_KEYS = array(
		'_sgs_variation_gallery',
		'_sgs_unit_divisor',
		'_sgs_unit_label',
		'_sgs_discount_label',
		'_sgs_variation_upsert_key',
	);

	/**
	 * Wire all hooks. Called from sgs-blocks.php after WooCommerce is available.
	 *
	 * @return void
	 */
	public static function register(): void {
		// Slug-rename warning — fires before the DB update so we can compare
		// the submitted slug to the stored one and queue a notice when they differ.
		\add_action( 'edit_terms', array( __CLASS__, 'maybe_warn_slug_change' ), 10, 2 );

		// Surface queued slug-rename notices.
		\add_action( 'admin_notices', array( __CLASS__, 'render_queued_notices' ) );

		// Variation delete — warn + orphan cleanup.
		\add_action( 'before_delete_post', array( __CLASS__, 'handle_variation_delete' ), 10, 2 );
	}

	// ─── Slug-rename warning ──────────────────────────────────────────────────

	/**
	 * Hook: `edit_terms` — fires BEFORE the term is updated in the DB.
	 *
	 * Compares the submitted slug (from $_POST) to the currently stored slug.
	 * When they differ and the taxonomy is a WooCommerce pa_* attribute taxonomy,
	 * queue a dismissible admin notice for the current user.
	 *
	 * @param int    $term_id  Term ID about to be updated.
	 * @param string $taxonomy Taxonomy of the term.
	 * @return void
	 */
	public static function maybe_warn_slug_change( int $term_id, string $taxonomy ): void {
		// Only for WooCommerce attribute taxonomies (pa_*).
		if ( ! \function_exists( 'wc_get_attribute_taxonomy_names' ) ) {
			return;
		}
		if ( ! \in_array( $taxonomy, \wc_get_attribute_taxonomy_names(), true ) ) {
			return;
		}

		// Capability check — attribute term edits require manage_woocommerce.
		if ( ! \current_user_can( 'manage_woocommerce' ) ) { // phpcs:ignore WordPress.WP.Capabilities.Unknown -- manage_woocommerce is a WooCommerce core capability.
			return;
		}

		// Retrieve the slug the admin submitted (may be empty; WP derives one from name then).
		// edit_terms fires inside WP's term-update flow which has already verified the
		// _wpnonce at the form level (wp_verify_nonce is called in wp-admin/edit-tags.php
		// before reaching this hook). No additional nonce check is required here.
		// phpcs:disable WordPress.Security.NonceVerification.Missing
		$submitted_slug = isset( $_POST['slug'] )
			? \sanitize_title( \wp_unslash( $_POST['slug'] ) )
			: '';
		// phpcs:enable WordPress.Security.NonceVerification.Missing

		if ( '' === $submitted_slug ) {
			// No explicit slug submitted — WP will derive one from name; no rename intent.
			return;
		}

		$existing_term = \get_term( $term_id, $taxonomy );
		if ( ! $existing_term instanceof \WP_Term ) {
			return;
		}

		// Only warn when the slug is actually changing.
		if ( $submitted_slug === $existing_term->slug ) {
			return;
		}

		// Queue a per-user transient notice. The notice renders on admin_notices
		// after the redirect that follows the save.
		$user_id       = \get_current_user_id();
		$transient_key = 'sgs_edit_safety_notice_' . $user_id;
		$existing      = \get_transient( $transient_key );
		$messages      = \is_array( $existing ) ? $existing : array();

		$messages[] = \sprintf(
			/* translators: 1: old term slug, 2: new slug submitted */
			\__(
				'<strong>SGS warning:</strong> You have changed the attribute term slug from <code>%1$s</code> to <code>%2$s</code>. Renaming a slug breaks existing product and cart URLs and may cause Google Merchant Center errors on any <em>variesBy</em> axis that references this attribute. Existing order line items are unaffected, but any external links, canonical URLs, or feed references to the old slug will return 404s. Proceed only if you are certain and have updated all external references.',
				'sgs-blocks'
			),
			\esc_html( $existing_term->slug ),
			\esc_html( $submitted_slug )
		);

		\set_transient( $transient_key, $messages, self::NOTICE_TTL );
	}

	/**
	 * Hook: `admin_notices` — render any queued edit-safety notices for the
	 * current user and delete the transient immediately so they show once only.
	 *
	 * @return void
	 */
	public static function render_queued_notices(): void {
		$user_id       = \get_current_user_id();
		$transient_key = 'sgs_edit_safety_notice_' . $user_id;
		$messages      = \get_transient( $transient_key );

		if ( ! \is_array( $messages ) || empty( $messages ) ) {
			return;
		}

		\delete_transient( $transient_key );

		foreach ( $messages as $message ) {
			// $message is pre-built with sprintf + esc_html inside; the outer
			// wrapper uses a fixed CSS class — no additional escaping needed here.
			echo '<div class="notice notice-warning is-dismissible"><p>'
				. \wp_kses(
					$message,
					array(
						'strong' => array(),
						'code'   => array(),
						'em'     => array(),
					)
				)
				. '</p></div>';
		}
	}

	// ─── Variation delete — warning + orphan cleanup ──────────────────────────

	/**
	 * Hook: `before_delete_post` — fires just before a post is permanently deleted.
	 *
	 * For product_variation posts:
	 *  1. Checks whether the variation has any linked order history (defensive,
	 *     capped query). Queues a warning notice when orders are found.
	 *  2. Deletes all Configurator_Meta postmeta keys unconditionally (orphan
	 *     cleanup). delete_post_meta() is idempotent — safe even when keys are
	 *     already absent (WP cleans postmeta on post delete, but this runs before
	 *     that and is explicit insurance for any external-ref cleanup we add later).
	 *
	 * @param int      $post_id The post ID about to be deleted.
	 * @param \WP_Post $post    The post object.
	 * @return void
	 */
	public static function handle_variation_delete( int $post_id, \WP_Post $post ): void {
		if ( 'product_variation' !== $post->post_type ) {
			return;
		}

		// Capability check — per-object edit_post on the variation.
		if ( ! \current_user_can( 'edit_post', $post_id ) ) {
			return;
		}

		// ── Order history check ───────────────────────────────────────────────

		self::maybe_warn_variation_has_orders( $post_id );

		// ── Orphan cleanup ────────────────────────────────────────────────────
		// WP will delete all postmeta when the post is deleted, but we run this
		// explicitly before the delete so that any future external-reference
		// cleanup (e.g. clearing a lookup cache keyed by variation_id) can be
		// added here without timing concerns.

		foreach ( self::VARIATION_META_KEYS as $meta_key ) {
			\delete_post_meta( $post_id, $meta_key );
		}
	}

	/**
	 * Check whether a variation has linked WooCommerce order items and, when it
	 * does, queue a dismissible admin notice for the current user.
	 *
	 * Uses wc_get_orders() with a variation_id filter — the safest WC-native
	 * approach that avoids direct $wpdb queries and respects HPOS (WC 7+).
	 *
	 * Capped at ORDER_LOOKUP_LIMIT results to prevent slow queries on large shops.
	 * We only need to know "≥ 1 order exists", so the cap is purely defensive.
	 *
	 * @param int $variation_id The variation post ID being deleted.
	 * @return void
	 */
	private static function maybe_warn_variation_has_orders( int $variation_id ): void {
		if ( ! \function_exists( 'wc_get_orders' ) ) {
			return;
		}

		$orders = \wc_get_orders(
			array(
				'limit'        => self::ORDER_LOOKUP_LIMIT,
				'return'       => 'ids',
				'variation_id' => $variation_id,
				// Include all statuses so historical orders are found.
				'status'       => array_keys( \wc_get_order_statuses() ),
			)
		);

		if ( empty( $orders ) ) {
			return;
		}

		$user_id       = \get_current_user_id();
		$transient_key = 'sgs_edit_safety_notice_' . $user_id;
		$existing      = \get_transient( $transient_key );
		$messages      = \is_array( $existing ) ? $existing : array();

		$messages[] = \sprintf(
			/* translators: %d: variation post ID */
			\__(
				'<strong>SGS notice:</strong> The variation (ID %d) you just deleted has past order history. The order line items are retained in WooCommerce and your records are safe, but the variation link on those orders is now broken — historical order detail pages will show the variation as unavailable. If this was unintentional, restore the variation from the WP Trash before the trash is emptied.',
				'sgs-blocks'
			),
			$variation_id
		);

		\set_transient( $transient_key, $messages, self::NOTICE_TTL );
	}
}
