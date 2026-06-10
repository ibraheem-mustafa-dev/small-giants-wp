<?php
/**
 * Product-template authoring fields on the WooCommerce product editor.
 *
 * Adds a "Product Template" section inside the WooCommerce product-data meta-box
 * (General tab) exposing three controls:
 *
 *   1. Save as template   — text input for the template name + button that
 *                           POSTs to POST /sgs/v1/product-templates.
 *   2. Apply a template   — <select> listing saved templates + "Preview & apply"
 *                           button that performs a dry-run first (confirm=false),
 *                           reveals an inline confirm box (summary + optional
 *                           starting-price input + Apply/Cancel), then fires
 *                           confirm=true on operator confirmation.
 *   3. Export / Import    — "Export" link per selected template (JS fetch with
 *                           the X-WP-Nonce header → Blob download); plus a
 *                           textarea control that imports via
 *                           POST /sgs/v1/product-templates/import.
 *
 * The inline admin JS lives in product-template-fields-js.php (required below)
 * to keep this file under the 300-line limit.
 *
 * WC Admin CSS traps avoided (all live-caught in this codebase):
 *   - WC floats every label into a 150px column; hand-rolled nested labels need
 *     inline `float:none;width:auto;margin:0` or they overlap.
 *   - Keep `woocommerce_wp_*` field labels SHORT; descriptive text goes in
 *     description/desc_tip.
 *   - Use `form-row form-row-full` wrappers; a lone `form-row-first` with no
 *     partner lets the next row float beside it.
 *   - A description after a floated select needs `display:block;clear:both`.
 *   - Inline admin JS attached to a head-printed handle MUST be wrapped in a
 *     readyState-guarded init (document.readyState check + DOMContentLoaded
 *     fallback) — an unguarded IIFE silently no-binds.
 *
 * Security:
 *   - All output uses esc_html() / esc_attr() / esc_url().
 *   - Inline JS uses wp_json_encode() for data injection; never raw PHP in JS.
 *   - Capability check (manage_woocommerce) runs inside every REST handler;
 *     this file only renders the UI — it does not save anything itself.
 *   - The X-WP-Nonce header is populated from wp_create_nonce('wp_rest') at
 *     render time and used by every fetch call here.
 *   - createElement/textContent only for server-supplied text (never innerHTML
 *     with dynamic data — XSS guard).
 *
 * @package SGS\Blocks
 * @since   1.8.0
 */

namespace SGS\Blocks;

defined( 'ABSPATH' ) || exit;

require_once __DIR__ . '/product-template-fields-js.php';
require_once __DIR__ . '/class-product-templates-cpt.php';

/**
 * Register the product-template field hooks.
 *
 * Silent no-op when WooCommerce is inactive.
 *
 * @return void
 */
function sgs_product_template_fields_register(): void {
	if ( ! class_exists( 'WooCommerce' ) ) {
		return;
	}

	add_action( 'woocommerce_product_options_general_product_data', __NAMESPACE__ . '\\sgs_render_product_template_fields' );
	add_action( 'admin_footer', __NAMESPACE__ . '\\sgs_product_template_inline_script' );
}
add_action( 'init', __NAMESPACE__ . '\\sgs_product_template_fields_register', 20 );

/**
 * Render the "Product Template" section inside the General product-data panel.
 *
 * @return void
 */
function sgs_render_product_template_fields(): void {
	global $post;
	$product_id = isset( $post->ID ) ? (int) $post->ID : 0;
	if ( $product_id <= 0 ) {
		return;
	}

	if ( ! current_user_can( 'manage_woocommerce' ) ) { // phpcs:ignore WordPress.WP.Capabilities.Unknown -- manage_woocommerce is a registered WooCommerce capability.
		return;
	}

	// Fetch saved templates for the apply / export select.
	$templates = get_posts(
		array(
			'post_type'      => Product_Templates_CPT::POST_TYPE,
			'post_status'    => 'publish',
			'posts_per_page' => 50,
			'no_found_rows'  => true,
			'orderby'        => 'title',
			'order'          => 'ASC',
		)
	);

	$rest_nonce = wp_create_nonce( 'wp_rest' );
	$rest_root  = esc_url( get_rest_url( null, 'sgs/v1' ) );

	echo '<div class="options_group sgs-product-template-fields" id="sgs-product-template-panel" style="border-top:1px solid #e0e0e0;margin-top:6px;padding-top:6px;">';
	echo '<h4 style="padding-left:12px;margin-bottom:4px;">' . esc_html__( 'SGS Product Template', 'sgs-blocks' ) . '</h4>';
	echo '<p class="description" style="padding-left:12px;margin-bottom:8px;">';
	echo esc_html__( 'Save this product\'s attribute/presentation structure as a reusable template, or apply a saved template to this product.', 'sgs-blocks' );
	echo '</p>';

	// ── 1. Save as template ────────────────────────────────────────────────────
	echo '<p class="form-field form-row form-row-full" style="padding:0 12px;">';
	// WC floats labels — inline reset so this nested label sits inline with the input.
	echo '<label for="sgs_template_save_name" style="float:none;width:auto;margin:0 6px 0 0;display:inline-block;">';
	echo esc_html__( 'Save as template:', 'sgs-blocks' );
	echo '</label>';
	echo '<input type="text" id="sgs_template_save_name" style="float:none;width:220px;max-width:60%;vertical-align:middle;" placeholder="' . esc_attr__( 'Template name', 'sgs-blocks' ) . '" />';
	echo ' <button type="button" id="sgs_template_save_btn" class="button" style="min-height:44px;vertical-align:middle;">' . esc_html__( 'Save template', 'sgs-blocks' ) . '</button>';
	echo '<span id="sgs_template_save_msg" style="margin-left:8px;vertical-align:middle;display:none;"></span>';
	echo '</p>';

	// ── 2. Apply a template ────────────────────────────────────────────────────
	if ( ! empty( $templates ) ) {
		echo '<p class="form-field form-row form-row-full" style="padding:0 12px;">';
		echo '<label for="sgs_template_apply_select" style="float:none;width:auto;margin:0 6px 0 0;display:inline-block;">';
		echo esc_html__( 'Apply template:', 'sgs-blocks' );
		echo '</label>';
		echo '<select id="sgs_template_apply_select" style="float:none;width:220px;max-width:60%;vertical-align:middle;">';
		echo '<option value="">' . esc_html__( '— Select a template —', 'sgs-blocks' ) . '</option>';
		foreach ( $templates as $tpl ) {
			printf(
				'<option value="%d" data-export-url="%s">%s</option>',
				(int) $tpl->ID,
				esc_attr( $rest_root . '/product-templates/' . (int) $tpl->ID . '/export' ),
				esc_html( $tpl->post_title )
			);
		}
		echo '</select>';
		echo ' <button type="button" id="sgs_template_preview_btn" class="button" style="min-height:44px;vertical-align:middle;">' . esc_html__( 'Preview &amp; apply', 'sgs-blocks' ) . '</button>';
		// clear:both is load-bearing — WC floats the select, so without it the description
		// floats beside it and truncates (same pattern as pack-size axis field).
		echo '<span class="description" style="display:block;clear:both;padding-top:4px;">';
		echo esc_html__( 'Applying a template provisions the template\'s attribute/term structure then sets presentation config. No prices are set — use the "Starting price" field in the confirm box.', 'sgs-blocks' );
		echo '</span>';
		echo '<span id="sgs_template_apply_msg" style="display:block;clear:both;margin-top:4px;"></span>';
		echo '</p>';

		// Inline confirm box — hidden until a dry-run preview returns. Replaces
		// window.prompt (inaccessible). Summary is filled via textContent in JS.
		echo '<div id="sgs_template_confirm_box" style="display:none;clear:both;margin:8px 12px;padding:10px;border:1px solid #c3c4c7;background:#f6f7f7;max-width:480px;">';
		echo '<strong style="display:block;margin-bottom:4px;">' . esc_html__( 'Preview — applying this template will:', 'sgs-blocks' ) . '</strong>';
		echo '<div id="sgs_template_confirm_summary" style="white-space:pre-line;margin-bottom:8px;"></div>';
		// Nested label needs the float reset (WC floats every panel label into a 150px column).
		echo '<label for="sgs_template_starting_price" style="float:none;width:auto;margin:0 6px 0 0;display:inline-block;">';
		echo esc_html__( 'Starting price (optional, £)', 'sgs-blocks' );
		echo '</label>';
		echo '<input type="text" inputmode="decimal" id="sgs_template_starting_price" style="float:none;width:120px;min-height:44px;box-sizing:border-box;vertical-align:middle;" placeholder="9.99" />';
		// Description forced onto its own line below the input (clear:both — floated-select trap).
		echo '<span class="description" style="display:block;clear:both;padding-top:4px;">';
		echo esc_html__( 'Sets this regular price on every new variation. Leave blank to create variations priceless — the product stays unpublished until prices are set.', 'sgs-blocks' );
		echo '</span>';
		echo '<p style="margin:8px 0 0;">';
		echo '<button type="button" id="sgs_template_confirm_apply_btn" class="button button-primary" style="min-height:44px;">' . esc_html__( 'Apply template', 'sgs-blocks' ) . '</button> ';
		echo '<button type="button" id="sgs_template_confirm_cancel_btn" class="button" style="min-height:44px;">' . esc_html__( 'Cancel', 'sgs-blocks' ) . '</button>';
		echo '</p>';
		echo '</div>';

		// Export link (visibility toggled by JS; download happens via fetch +
		// X-WP-Nonce header + Blob — no nonce in the URL).
		echo '<p class="form-field form-row form-row-full" style="padding:0 12px;">';
		echo '<a id="sgs_template_export_link" href="#" style="display:none;min-height:44px;line-height:44px;">' . esc_html__( 'Export selected template (JSON)', 'sgs-blocks' ) . '</a>';
		echo '</p>';
	} else {
		echo '<p class="form-field form-row form-row-full" style="padding:0 12px;">';
		echo '<span class="description">' . esc_html__( 'No saved templates yet. Save this product as a template first.', 'sgs-blocks' ) . '</span>';
		echo '</p>';
	}

	// ── 3. Import ──────────────────────────────────────────────────────────────
	echo '<p class="form-field form-row form-row-full" style="padding:0 12px;">';
	echo '<label for="sgs_template_import_json" style="float:none;width:auto;margin:0 0 4px;display:block;">';
	echo esc_html__( 'Import template (JSON):', 'sgs-blocks' );
	echo '</label>';
	echo '<textarea id="sgs_template_import_json" rows="3" style="float:none;width:100%;max-width:480px;font-family:monospace;font-size:11px;" placeholder="' . esc_attr__( 'Paste exported JSON here…', 'sgs-blocks' ) . '"></textarea>';
	echo '<br/><button type="button" id="sgs_template_import_btn" class="button" style="min-height:44px;margin-top:4px;">' . esc_html__( 'Import', 'sgs-blocks' ) . '</button>';
	echo '<span id="sgs_template_import_msg" style="margin-left:8px;vertical-align:middle;display:none;"></span>';
	echo '</p>';

	echo '</div>';

	// Inject PHP data for JS — a pure-JSON data element (type="application/json")
	// because the JS partial reads it via JSON.parse(textContent); wrapping it in
	// a `var x = ...;` assignment makes textContent unparseable and silently
	// kills every button binding (caught by the visual pass, 2026-06-10).
	// All user-facing JS strings are translated HERE (i18n) and read as cfg.strings.x.
	printf(
		'<script type="application/json" id="sgs-template-data">%s</script>',
		wp_json_encode(
			array(
				'productId' => $product_id,
				'restRoot'  => $rest_root,
				'nonce'     => $rest_nonce,
				'strings'   => array(
					'enterName'          => __( 'Please enter a template name.', 'sgs-blocks' ),
					'saving'             => __( 'Saving…', 'sgs-blocks' ),
					'saved'              => __( 'Saved! Reload the page to use this template.', 'sgs-blocks' ),
					'saveFailed'         => __( 'Save failed', 'sgs-blocks' ),
					'networkError'       => __( 'Network error:', 'sgs-blocks' ),
					'exportFailed'       => __( 'Export failed', 'sgs-blocks' ),
					'selectTemplate'     => __( 'Please select a template.', 'sgs-blocks' ),
					'loadingPreview'     => __( 'Loading preview…', 'sgs-blocks' ),
					'previewFailed'      => __( 'Preview failed', 'sgs-blocks' ),
					'reviewPreview'      => __( 'Review the preview below, then apply or cancel.', 'sgs-blocks' ),
					'applying'           => __( 'Applying…', 'sgs-blocks' ),
					'applied'            => __( 'Template applied successfully.', 'sgs-blocks' ),
					'applyFailed'        => __( 'Apply failed', 'sgs-blocks' ),
					'applyCancelled'     => __( 'Apply cancelled.', 'sgs-blocks' ),
					'pasteJson'          => __( 'Paste JSON into the field first.', 'sgs-blocks' ),
					'invalidJson'        => __( 'Invalid JSON:', 'sgs-blocks' ),
					'importing'          => __( 'Importing…', 'sgs-blocks' ),
					'imported'           => __( 'Imported! Reload the page to use this template.', 'sgs-blocks' ),
					'importFailed'       => __( 'Import failed', 'sgs-blocks' ),
					'presentationFields' => __( 'Presentation fields:', 'sgs-blocks' ),
					'notCarried'         => __( 'Not carried:', 'sgs-blocks' ),
				),
			)
		)
	);
}
