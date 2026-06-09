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

	// ── Legal disclosure panel (FR-28-10/16) ────────────────────────────────
	echo '<div class="sgs-smart-pricing-disclosure" style="margin:8px 12px 12px;padding:10px 12px;background:#fff8e1;border-left:3px solid #f9a825;">';
	echo '<strong>' . \esc_html__( 'Important — UK consumer law', 'sgs-blocks' ) . '</strong><br>';
	echo \esc_html__(
		'The preview below shows auto-generated pack prices based on your single-unit reference price. You are responsible for ensuring that single-unit price is a genuine price at which you sell (or have recently sold) single units. If you never sell singles, do not use the "vs buying singly" framing. No prices are applied to your shop until you use the "Apply to live shop" button (coming in a future update).',
		'sgs-blocks'
	);
	echo '</div>';

	// ── Steepness (k_notch) radio ────────────────────────────────────────────
	echo '<p class="form-field form-row form-row-full" style="padding-left:12px;">';
	echo '<label>' . \esc_html__( 'Discount strength', 'sgs-blocks' ) . '</label>';
	echo '<span class="description" style="display:block;margin-bottom:6px;">';
	\printf(
		/* translators: %s: the source layer that is supplying the k value (e.g. "site", "category", "default"). */
		\esc_html__( 'Override the site/category default for this product. Current source: %s.', 'sgs-blocks' ),
		'<strong>' . \esc_html( $cfg['source_k'] ) . '</strong>'
	);
	echo '</span>';

	$k_options = array(
		''           => \__( 'Inherit (use site/category default)', 'sgs-blocks' ),
		'gentle'     => \__( 'Gentle (~8-20% saving on largest pack)', 'sgs-blocks' ),
		'standard'   => \__( 'Standard (~17-35% saving on largest pack)', 'sgs-blocks' ),
		'aggressive' => \__( 'Aggressive (~20-40% saving on largest pack)', 'sgs-blocks' ),
	);
	foreach ( $k_options as $value => $label ) {
		\printf(
			'<label style="display:inline-block;margin-right:16px;font-weight:normal;">'
			. '<input type="radio" name="_sgs_pack_k" value="%s"%s> %s'
			. '</label>',
			\esc_attr( $value ),
			\checked( $current_k, $value, false ),
			\esc_html( $label )
		);
	}
	echo '</p>';

	// ── Pack sizes checkboxes ────────────────────────────────────────────────
	$default_sizes = array( 6, 12, 24, 48 );
	$cascade_sizes = $cfg['pack_sizes'];
	$all_sizes     = \array_unique( \array_merge( $default_sizes, $cascade_sizes, $current_sizes ) );
	\sort( $all_sizes );

	echo '<p class="form-field form-row form-row-full" style="padding-left:12px;">';
	echo '<label>' . \esc_html__( 'Pack sizes offered', 'sgs-blocks' ) . '</label>';
	echo '<span class="description" style="display:block;margin-bottom:6px;">';
	\printf(
		/* translators: %s: the source layer supplying pack sizes (e.g. "site", "default"). */
		\esc_html__( 'Override the pack sizes for this product. Current source: %s.', 'sgs-blocks' ),
		'<strong>' . \esc_html( $cfg['source_sizes'] ) . '</strong>'
	);
	echo '</span>';

	foreach ( $all_sizes as $n ) {
		$checked = \in_array( (int) $n, $current_sizes, true ) || empty( $current_sizes );
		\printf(
			'<label style="display:inline-block;margin-right:12px;font-weight:normal;">'
			. '<input type="checkbox" name="_sgs_pack_sizes[]" value="%d"%s> %s'
			. '</label>',
			(int) $n,
			$checked ? ' checked' : '',
			/* translators: %d: the pack size number. */
			\sprintf( \esc_html__( 'Pack of %d', 'sgs-blocks' ), (int) $n )
		);
	}
	echo '</p>';

	// ── Per-pack manual override fields ─────────────────────────────────────
	echo '<div class="sgs-pack-manual-overrides" style="padding-left:12px;margin-bottom:8px;">';
	echo '<label style="display:block;margin-bottom:4px;">' . \esc_html__( 'Manual price overrides (optional)', 'sgs-blocks' ) . '</label>';
	echo '<span class="description" style="display:block;margin-bottom:6px;">';
	echo \esc_html__( 'Enter a fixed pack price (in pence) to lock that pack. Leave blank to use the auto-generated price. E.g. enter 499 for £4.99.', 'sgs-blocks' );
	echo '</span>';

	foreach ( $all_sizes as $n ) {
		$override_val = isset( $overrides[ (string) $n ] ) ? (int) $overrides[ (string) $n ] : '';
		\printf(
			'<label style="display:inline-block;margin-right:16px;font-weight:normal;margin-bottom:4px;">'
			. '%s: <input type="number" name="_sgs_pack_manual_overrides[%d]" value="%s" min="2" max="999999" style="width:90px;" placeholder="%s">'
			. '</label>',
			/* translators: %d: the pack size number. */
			\esc_html( \sprintf( \__( 'Pack of %d', 'sgs-blocks' ), (int) $n ) ),
			(int) $n,
			\esc_attr( (string) $override_val ),
			\esc_attr__( 'Auto', 'sgs-blocks' )
		);
	}
	echo '</div>';

	// ── Generate Preview button ──────────────────────────────────────────────
	echo '<p class="form-field form-row form-row-full" style="padding-left:12px;">';
	\printf(
		'<button type="button" id="sgs-pack-pricing-preview-btn" class="button button-secondary" '
		. 'data-product-id="%d" data-preview-url="%s" data-nonce="%s">%s</button>',
		(int) $product_id,
		\esc_attr( $preview_url ),
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
		\__( 'Pack price', 'sgs-blocks' ),
		\__( 'Per unit', 'sgs-blocks' ),
		\__( 'Saving', 'sgs-blocks' ),
		\__( 'Notes', 'sgs-blocks' ),
	) as $heading ) {
		echo '<th style="white-space:nowrap;">' . \esc_html( $heading ) . '</th>';
	}
	echo '</tr></thead>';
	echo '<tbody id="sgs-pack-pricing-preview-tbody"></tbody>';
	echo '</table>';
	echo '<p class="description" id="sgs-pack-pricing-preview-meta"></p>';
	echo '</div>';

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

/**
 * Return the inline JS for the "Generate preview" button.
 *
 * Fetches POST /sgs/v1/pack-pricing/preview, reads the current form values
 * (k_notch, pack_sizes, base_pence), and renders server-returned rows into
 * the preview table.
 *
 * No price maths in JS — all formatting comes from the server (SSR==swap rule).
 *
 * @return string Raw JS (no <script> tags; caller uses wp_add_inline_script).
 */
function sgs_pack_pricing_preview_js(): string {
	return <<<'JS'
( function() {
	'use strict';

	var btn = document.getElementById( 'sgs-pack-pricing-preview-btn' );
	if ( ! btn ) { return; }

	btn.addEventListener( 'click', function() {
		var productId  = parseInt( btn.dataset.productId, 10 );
		var previewUrl = btn.dataset.previewUrl;
		var nonce      = btn.dataset.nonce;
		var status     = document.getElementById( 'sgs-pack-pricing-preview-status' );
		var wrap       = document.getElementById( 'sgs-pack-pricing-preview-wrap' );
		var tbody      = document.getElementById( 'sgs-pack-pricing-preview-tbody' );
		var metaEl     = document.getElementById( 'sgs-pack-pricing-preview-meta' );

		if ( ! productId || ! previewUrl ) { return; }

		// Read base_pence from the existing Wave-2 field (pence = pounds × 100).
		var basePoundsEl = document.getElementById( '_sgs_base_price_pounds' );
		var basePence    = basePoundsEl && basePoundsEl.value
			? Math.round( parseFloat( basePoundsEl.value ) * 100 )
			: 0;

		// Read current k_notch radio.
		var kRadio = document.querySelector( 'input[name="_sgs_pack_k"]:checked' );
		var kNotch = kRadio ? kRadio.value : '';

		// Read checked pack-size checkboxes.
		var sizeCheckboxes = document.querySelectorAll( 'input[name="_sgs_pack_sizes[]"]:checked' );
		var packSizes = [];
		sizeCheckboxes.forEach( function( cb ) {
			packSizes.push( parseInt( cb.value, 10 ) );
		} );

		// Build request body.
		var body = { product_id: productId };
		if ( basePence >= 10 ) { body.base_pence = basePence; }
		if ( kNotch )          { body.k_notch    = kNotch; }
		if ( packSizes.length ) { body.pack_sizes  = packSizes; }

		status.textContent = 'Generating preview…';
		btn.disabled       = true;

		fetch( previewUrl, {
			method:  'POST',
			headers: {
				'Content-Type':  'application/json',
				'X-WP-Nonce':    nonce,
			},
			body: JSON.stringify( body ),
		} )
		.then( function( res ) { return res.json(); } )
		.then( function( data ) {
			btn.disabled = false;
			if ( data.code ) {
				// WP_Error response.
				status.style.color = '#c62828';
				status.textContent = data.message || 'Error generating preview.';
				wrap.style.display = 'none';
				return;
			}

			status.style.color = '#2e7d32';
			status.textContent = 'Preview generated (no prices saved to shop).';

			// Render rows via createElement/textContent ONLY — never innerHTML
			// with server data. Server strings are esc_html()'d too, but the
			// DOM-injection layer must not rely on that holding for every
			// future response field (structural XSS defence, security review
			// Finding 1, 2026-06-09).
			while ( tbody.firstChild ) {
				tbody.removeChild( tbody.firstChild );
			}
			( data.preview_rows || [] ).forEach( function( row ) {
				var tr   = document.createElement( 'tr' );
				var note = row.clamped ? ( '⚠️ ' + row.guardrail_note ) : ( row.locked ? '🔒 ' + row.guardrail_note : '' );

				var tdSize   = document.createElement( 'td' );
				var strongEl = document.createElement( 'strong' );
				strongEl.textContent = String( row.pack_size );
				tdSize.appendChild( strongEl );
				tr.appendChild( tdSize );

				[ row.pack_price_fmt, row.per_unit_fmt, row.saving_display ].forEach( function( cellText ) {
					var td = document.createElement( 'td' );
					td.textContent = String( cellText || '' );
					tr.appendChild( td );
				} );

				var tdNote = document.createElement( 'td' );
				tdNote.style.color    = row.clamped ? '#e65100' : '#666';
				tdNote.style.fontSize = '11px';
				tdNote.textContent    = note;
				tr.appendChild( tdNote );

				tbody.appendChild( tr );
			} );

			// Config summary.
			if ( data.config ) {
				var c = data.config;
				metaEl.textContent = 'Base: ' + ( c.base_pence / 100 ).toFixed( 2 ) +
					' | k source: ' + c.source_k +
					' | sizes source: ' + c.source_sizes +
					' | charm: ' + ( c.charm_round ? 'on' : 'off' );
			}

			wrap.style.display = 'block';
		} )
		.catch( function( err ) {
			btn.disabled       = false;
			status.style.color = '#c62828';
			status.textContent = 'Network error: ' + err.message;
		} );
	} );
} )();
JS;
}
