<?php
/**
 * SGS Smart Bulk Pricing — product-level authoring panel (Spec 28 P3, FR-28-10).
 *
 * Adds a "Smart Pricing" section to the WooCommerce product data meta-box
 * (General tab, after the existing SGS Value Ladder section).  Exposes:
 *
 *   _sgs_pack_k           Product-level steepness override (radio: gentle/standard/aggressive).
 *   _sgs_pack_sizes       Product-level pack-size checkboxes (6/12/24/48 + custom).
 *   _sgs_pack_manual_overrides  Per-pack manual price overrides (one text field per pack).
 *
 * "Generate Preview" button: POSTs to /sgs/v1/pack-pricing/preview via fetch,
 * renders the returned rows into a preview table — server-side formatting, no
 * JS maths (SSR==swap parity rule).  Writes NOTHING to WooCommerce.
 *
 * Legal-disclosure panel: shown inline above the preview (FR-28-10/16).
 * Reuses the attestation/disclosure copy pattern from configurator-product-fields.php.
 *
 * Security:
 *   - WC verifies its own product-save nonce before woocommerce_process_product_meta fires.
 *   - Capability check (edit_post) inside the save handler.
 *   - All output esc_html() / esc_attr(); REST call uses wp_rest nonce.
 *   - show_in_rest:false on all P3 meta keys (set in class-configurator-meta.php).
 *
 * Classic admin only — use_block_editor_for_post_type('product') is FALSE on this stack.
 *
 * @package   SGS\Blocks
 * @since     1.14.0
 * @see       .claude/specs/28-SGS-SMART-BULK-PRICING.md FR-28-10
 */

namespace SGS\Blocks;

defined( 'ABSPATH' ) || exit;

// This file owns its own dependencies: the render callback resolves the
// cascade via sgs_get_pack_pricing_config(); the save handler reuses
// Configurator_Meta's sanitisers (single validation path — never duplicate).
require_once __DIR__ . '/class-pack-pricing-cascade.php';
require_once __DIR__ . '/class-configurator-meta.php';
// The panel markup helpers + the inline admin JS live in their own files to
// keep every file under the 300-line limit. They define
// sgs_render_pack_pricing_input_fields(), sgs_render_pack_pricing_apply_controls()
// and sgs_pack_pricing_preview_js() respectively.
require_once __DIR__ . '/pack-pricing-product-fields-markup.php';
require_once __DIR__ . '/pack-pricing-product-fields-js.php';

/**
 * Register hooks — silent no-op when WooCommerce is inactive.
 *
 * @return void
 */
function sgs_pack_pricing_product_fields_register(): void {
	if ( ! \class_exists( 'WooCommerce' ) ) {
		return;
	}
	\add_action( 'woocommerce_product_options_general_product_data', __NAMESPACE__ . '\\sgs_render_pack_pricing_product_fields' );
	\add_action( 'woocommerce_process_product_meta', __NAMESPACE__ . '\\sgs_save_pack_pricing_product_fields' );
	\add_action( 'admin_enqueue_scripts', __NAMESPACE__ . '\\sgs_enqueue_pack_pricing_product_script' );
}
\add_action( 'init', __NAMESPACE__ . '\\sgs_pack_pricing_product_fields_register', 20 );

/**
 * Enqueue the inline preview script on product edit screens only.
 *
 * @return void
 */
function sgs_enqueue_pack_pricing_product_script(): void {
	$screen = \get_current_screen();
	if ( ! $screen || 'product' !== $screen->id || 'post' !== $screen->base ) {
		return;
	}

	// Inline script — no separate build file; zero frontend cost.
	\wp_add_inline_script(
		'woocommerce_admin', // WC already enqueues this on product screens.
		sgs_pack_pricing_preview_js()
	);
}

/**
 * Render the Smart Pricing panel inside the General product-data tab.
 *
 * @return void
 */
function sgs_render_pack_pricing_product_fields(): void {
	if ( ! \function_exists( 'woocommerce_wp_radio' ) && ! \function_exists( 'woocommerce_wp_text_input' ) ) {
		return;
	}

	global $post;
	$product_id = isset( $post->ID ) ? (int) $post->ID : 0;
	if ( $product_id <= 0 ) {
		return;
	}

	// Read current stored values.
	$current_k     = (string) \get_post_meta( $product_id, '_sgs_pack_k', true );
	$sizes_meta    = \get_post_meta( $product_id, '_sgs_pack_sizes', true );
	$current_sizes = \is_array( $sizes_meta ) ? $sizes_meta : array();
	$current_sizes = \array_map( 'intval', $current_sizes );

	// Read manual overrides (stored as JSON string).
	$overrides_meta = \get_post_meta( $product_id, '_sgs_pack_manual_overrides', true );
	$overrides_json = \is_string( $overrides_meta ) && '' !== $overrides_meta ? $overrides_meta : '{}';
	$overrides_raw  = \json_decode( $overrides_json, true );
	$overrides      = \is_array( $overrides_raw ) ? $overrides_raw : array();

	// Resolve cascade for display context (source labels).
	$cfg = sgs_get_pack_pricing_config( $product_id );

	// REST preview endpoint URL + nonce.
	$preview_url = \esc_url( \rest_url( 'sgs/v1/pack-pricing/preview' ) );
	$rest_nonce  = \wp_create_nonce( 'wp_rest' );

	echo '<div class="options_group sgs-smart-pricing-fields" style="border-top:1px solid #e0e0e0;margin-top:6px;padding-top:6px;">';

	// ── Section header ──────────────────────────────────────────────────────
	echo '<h4 style="padding-left:12px;margin-bottom:4px;">';
	echo \esc_html__( 'SGS Smart Bulk Pricing', 'sgs-blocks' );
	echo '</h4>';
	// Operator-empathy connector (visual-pass F7): make the dependency on the
	// Value Ladder section's single-unit price explicit.
	echo '<p class="description" style="padding-left:12px;margin:0 0 8px;">';
	echo \esc_html__( 'Uses the single-unit price you entered in the SGS Value Ladder section above as the starting point for every pack price.', 'sgs-blocks' );
	echo '</p>';

	// ── Legal disclosure panel (FR-28-10/16) ────────────────────────────────
	// Border #e65100 (3.79:1 vs white) clears the WCAG 1.4.11 3:1 UI-component
	// floor; the previous #f9a825 measured 1.97:1 (visual-pass FAIL-AA #2).
	// Bullet structure: the no-live-prices line leads, bolded (operator F3).
	echo '<div class="sgs-smart-pricing-disclosure" style="margin:8px 12px 12px;padding:10px 12px;background:#fff8e1;border-left:3px solid #e65100;">';
	echo '<strong>' . \esc_html__( 'Important — UK consumer law', 'sgs-blocks' ) . '</strong>';
	echo '<ul style="margin:6px 0 0 18px;list-style:disc;">';
	echo '<li><strong>' . \esc_html__( 'Nothing on this screen changes your live shop prices. The table below is a preview only.', 'sgs-blocks' ) . '</strong></li>';
	echo '<li>' . \esc_html__( 'Savings are calculated against your single-unit reference price. You are responsible for ensuring it is a genuine price at which you sell (or have recently sold) single units.', 'sgs-blocks' ) . '</li>';
	echo '<li>' . \esc_html__( 'If you never sell singles, do not use the "vs buying singly" framing.', 'sgs-blocks' ) . '</li>';
	echo '</ul>';
	echo '</div>';

	// ── Steepness + pack-size + manual-override input controls (P3) ──────────
	// Markup lives in the JS-companion file so this file stays under 300 lines.
	sgs_render_pack_pricing_input_fields( $cfg, $current_k, $current_sizes, $overrides );

	// ── Generate Preview button ──────────────────────────────────────────────
	// Apply + Revert URLs + nonce (P4 FR-28-10).
	$apply_url  = \esc_url( \rest_url( 'sgs/v1/pack-pricing/apply' ) );
	$revert_url = \esc_url( \rest_url( 'sgs/v1/pack-pricing/revert' ) );
	$has_backup = false;
	// Show "Revert" only when at least one variation has a backup snapshot.
	$child_ids = \get_children(
		array(
			'post_parent' => $product_id,
			'post_type'   => 'product_variation',
			'fields'      => 'ids',
		)
	);
	foreach ( (array) $child_ids as $cid ) {
		if ( '' !== \get_post_meta( (int) $cid, '_sgs_pack_price_backup', true ) ) {
			$has_backup = true;
			break;
		}
	}

	echo '<p class="form-field form-row form-row-full" style="padding-left:12px;">';
	\printf(
		'<button type="button" id="sgs-pack-pricing-preview-btn" class="button button-secondary" '
		. 'data-product-id="%d" data-preview-url="%s" data-apply-url="%s" data-revert-url="%s" data-nonce="%s">%s</button>',
		(int) $product_id,
		\esc_attr( $preview_url ),
		\esc_attr( $apply_url ),
		\esc_attr( $revert_url ),
		\esc_attr( $rest_nonce ),
		\esc_html__( 'Generate preview', 'sgs-blocks' )
	);
	echo ' <span id="sgs-pack-pricing-preview-status" style="margin-left:8px;color:#666;"></span>';
	echo '</p>';

	// ── Preview table (populated by JS) ──────────────────────────────────────
	echo '<div id="sgs-pack-pricing-preview-wrap" style="padding-left:12px;display:none;">';
	echo '<table class="widefat striped" style="max-width:640px;margin-bottom:8px;">';
	echo '<thead><tr>';
	foreach ( array(
		\__( 'Pack size', 'sgs-blocks' ),
		\__( 'Pack price (£)', 'sgs-blocks' ),
		\__( 'Per unit', 'sgs-blocks' ),
		\__( 'Saving vs single', 'sgs-blocks' ),
		\__( 'Notes', 'sgs-blocks' ),
	) as $heading ) {
		echo '<th style="white-space:nowrap;">' . \esc_html( $heading ) . '</th>';
	}
	echo '</tr></thead>';
	echo '<tbody id="sgs-pack-pricing-preview-tbody"></tbody>';
	echo '</table>';
	echo '<p class="description" id="sgs-pack-pricing-preview-meta"></p>';

	echo '</div>'; // End #sgs-pack-pricing-preview-wrap.

	// ── P4 apply + revert buttons + confirm modal (FR-28-10/14) ───────────────
	// Markup lives in the JS-companion file so this file stays under 300 lines.
	sgs_render_pack_pricing_apply_controls( $has_backup );

	echo '</div>'; // .sgs-smart-pricing-fields
}

/**
 * Save handler for the Smart Pricing product fields.
 *
 * WC verifies its own nonce before this hook fires.  We check edit_post
 * capability and sanitise every value before persisting.
 *
 * Writes NOTHING to WooCommerce prices — P3 is preview-only (P4 deferred).
 *
 * @param int $product_id WooCommerce product post ID.
 * @return void
 */
function sgs_save_pack_pricing_product_fields( int $product_id ): void {
	if ( ! \current_user_can( 'edit_post', $product_id ) ) {
		return;
	}

	// Explicit nonce check (security review Finding 3, 2026-06-09): WC's
	// meta-box flow verifies woocommerce_meta_nonce before firing this hook,
	// but woocommerce_process_product_meta CAN be fired by other callers
	// (WP-CLI eval, bulk-edit plugins) without that gate — a guard on one
	// path is not a guard. Verify the same WC nonce ourselves.
	$wc_nonce = isset( $_POST['woocommerce_meta_nonce'] )
		? \sanitize_text_field( \wp_unslash( $_POST['woocommerce_meta_nonce'] ) )
		: '';
	if ( ! \wp_verify_nonce( $wc_nonce, 'woocommerce_save_data' ) ) {
		return;
	}

	// ── Steepness notch ──────────────────────────────────────────────────────
	$k_raw         = isset( $_POST['_sgs_pack_k'] )
		? \sanitize_key( \wp_unslash( $_POST['_sgs_pack_k'] ) )
		: '';
	$valid_notches = array( '', 'gentle', 'standard', 'aggressive' );
	if ( ! \in_array( $k_raw, $valid_notches, true ) ) {
		$k_raw = '';
	}
	\update_post_meta( $product_id, '_sgs_pack_k', $k_raw );

	// ── Pack sizes ───────────────────────────────────────────────────────────
	$sizes_raw = isset( $_POST['_sgs_pack_sizes'] ) && \is_array( $_POST['_sgs_pack_sizes'] )
		// phpcs:ignore WordPress.Security.ValidatedSanitizedInput.InputNotSanitized -- sanitised in sanitize_pack_sizes() below.
		? (array) \wp_unslash( $_POST['_sgs_pack_sizes'] )
		: array();
	$sizes = Configurator_Meta::sanitize_pack_sizes( $sizes_raw );
	\update_post_meta( $product_id, '_sgs_pack_sizes', $sizes );

	// ── Per-pack manual overrides ────────────────────────────────────────────
	$overrides_raw = isset( $_POST['_sgs_pack_manual_overrides'] ) && \is_array( $_POST['_sgs_pack_manual_overrides'] )
		// phpcs:ignore WordPress.Security.ValidatedSanitizedInput.InputNotSanitized -- sanitised in sanitize_pack_manual_overrides() below.
		? (array) \wp_unslash( $_POST['_sgs_pack_manual_overrides'] )
		: array();
	// Remove blank entries (unset overrides).
	$overrides_clean = array();
	foreach ( $overrides_raw as $n => $pence ) {
		if ( '' !== (string) $pence ) {
			$overrides_clean[ (int) $n ] = (int) $pence;
		}
	}
	$overrides_json = Configurator_Meta::sanitize_pack_manual_overrides( $overrides_clean );
	\update_post_meta( $product_id, '_sgs_pack_manual_overrides', $overrides_json );

	// phpcs:enable WordPress.Security.NonceVerification.Missing
}
