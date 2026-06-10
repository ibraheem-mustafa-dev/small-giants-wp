<?php
/**
 * SGS Smart Bulk Pricing — product panel markup helpers (Spec 28 P3/P4).
 *
 * Extracted from pack-pricing-product-fields.php to keep every file under the
 * 300-line limit (code-quality.md rule).  Two render helpers:
 *   sgs_render_pack_pricing_input_fields()    — steepness/pack-size/manual-override controls (P3).
 *   sgs_render_pack_pricing_apply_controls()  — apply + revert buttons + confirm modal (P4).
 *
 * All output is esc_html()/esc_attr() escaped.  The inline JS that binds to
 * this markup lives in pack-pricing-product-fields-js.php.
 *
 * @package   SGS\Blocks
 * @since     1.15.0
 * @see       .claude/specs/28-SGS-SMART-BULK-PRICING.md FR-28-10/14
 */

namespace SGS\Blocks;

defined( 'ABSPATH' ) || exit;

/**
 * Render the P3 input controls: steepness radio, pack-size checkboxes, and
 * per-pack manual override fields.
 *
 * Extracted from sgs_render_pack_pricing_product_fields() to keep that file
 * under the 300-line limit.  All output is esc_html()/esc_attr() escaped.
 *
 * @param array             $cfg           Resolved cascade config (for source labels + pack sizes).
 * @param string            $current_k     Stored product-level k notch ('' = inherit).
 * @param array<int, int>   $current_sizes Stored product-level pack sizes.
 * @param array<string,int> $overrides    Stored per-pack manual overrides (keyed by pack size string).
 * @return void
 */
function sgs_render_pack_pricing_input_fields( array $cfg, string $current_k, array $current_sizes, array $overrides ): void {
	// ── Steepness (k_notch) radio ────────────────────────────────────────────
	echo '<p class="form-field form-row form-row-full" style="padding-left:12px;">';
	echo '<label>' . \esc_html__( 'Discount strength', 'sgs-blocks' ) . '</label>';
	echo '<span class="description" style="display:block;margin-bottom:6px;">';
	echo \esc_html__( 'How much cheaper each larger pack gets versus buying singles. ', 'sgs-blocks' );
	\printf(
		/* translators: %s: the source layer that is supplying the k value (e.g. "site", "category", "default"). */
		\esc_html__( 'Overrides the site or category default for this product. Current source: %s.', 'sgs-blocks' ),
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
			'<label style="float:none;width:auto;display:inline-block;margin:0 16px 4px 0;font-weight:normal;">'
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
	$all_sizes     = \array_unique( \array_merge( $default_sizes, $cfg['pack_sizes'], $current_sizes ) );
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
			'<label style="float:none;width:auto;display:inline-block;margin:0 16px 4px 0;font-weight:normal;">'
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
	// float:none/width:auto/margin:0 are load-bearing: WC's panel CSS targets
	// labels PANEL-WIDE; without the reset the label floats 150px off + clips.
	echo '<label style="float:none;width:auto;margin:0 0 4px;display:block;">' . \esc_html__( 'Manual price overrides (optional)', 'sgs-blocks' ) . '</label>';
	echo '<span class="description" style="display:block;margin-bottom:6px;">';
	echo \esc_html__( 'Whole pence per pack — a "p" sits after each box. Example: 499p locks that pack at £4.99. Leave blank to use the auto-generated price.', 'sgs-blocks' );
	echo '</span>';

	echo '<span style="display:flex;flex-wrap:wrap;gap:8px 16px;">';
	foreach ( $all_sizes as $n ) {
		$override_val = isset( $overrides[ (string) $n ] ) ? (int) $overrides[ (string) $n ] : '';
		\printf(
			'<label style="flex:0 0 auto;width:auto;margin:0;font-weight:normal;">'
			. '%s: <input type="number" name="_sgs_pack_manual_overrides[%d]" value="%s" min="2" max="999999" style="width:90px;" placeholder="%s">p'
			. '</label>',
			/* translators: %d: the pack size number. */
			\esc_html( \sprintf( \__( 'Pack of %d', 'sgs-blocks' ), (int) $n ) ),
			(int) $n,
			\esc_attr( (string) $override_val ),
			\esc_attr__( 'Auto', 'sgs-blocks' )
		);
	}
	echo '</span>';
	echo '</div>';
}

/**
 * Render the P4 apply + revert buttons and the confirm-apply modal.
 *
 * Extracted from sgs_render_pack_pricing_product_fields() to keep that file
 * under the 300-line limit.  All output is esc_html()/esc_attr() escaped; the
 * modal is a hidden dialog the JS populates with current→new prices before
 * showing it (FR-28-10 two-step apply).
 *
 * @param bool $has_backup Whether any variation has a price backup (reveals Revert).
 * @return void
 */
function sgs_render_pack_pricing_apply_controls( bool $has_backup ): void {
	// ── Two-step apply button (P4 FR-28-10) — JS reveals it after a preview ──
	echo '<p id="sgs-pack-pricing-apply-wrap" style="padding-left:12px;display:none;">';
	echo '<button type="button" id="sgs-pack-pricing-apply-btn" class="button button-primary" style="margin-right:8px;">';
	echo \esc_html__( 'Apply prices to your live shop', 'sgs-blocks' );
	echo '</button>';
	echo '<span id="sgs-pack-pricing-apply-status" style="margin-left:4px;color:#666;"></span>';
	echo '</p>';

	// ── Revert last generation (P4 FR-28-14) — shown when a backup exists ────
	\printf(
		'<p id="sgs-pack-pricing-revert-wrap" style="padding-left:12px;%s">'
		. '<button type="button" id="sgs-pack-pricing-revert-btn" class="button button-secondary">%s</button>'
		. ' <span id="sgs-pack-pricing-revert-status" style="margin-left:8px;color:#666;"></span>'
		. '</p>',
		$has_backup ? '' : 'display:none;',
		\esc_html__( 'Revert last generation', 'sgs-blocks' )
	);

	// ── Confirm-apply modal (FR-28-10) — hidden; JS fills + shows it ─────────
	echo '<div id="sgs-pack-pricing-confirm-modal" style="display:none;position:fixed;top:0;left:0;width:100%;height:100%;'
		. 'background:rgba(0,0,0,.5);z-index:99999;align-items:center;justify-content:center;">';
	echo '<div style="background:#fff;padding:24px;max-width:560px;width:90%;border-radius:4px;">';
	echo '<h3 style="margin-top:0;">' . \esc_html__( 'Apply prices to your live shop?', 'sgs-blocks' ) . '</h3>';
	echo '<p>' . \esc_html__( 'The following pack prices will be written to WooCommerce immediately:', 'sgs-blocks' ) . '</p>';
	echo '<table class="widefat" id="sgs-confirm-price-table" style="margin-bottom:16px;">';
	echo '<thead><tr>'
		. '<th>' . \esc_html__( 'Pack', 'sgs-blocks' ) . '</th>'
		. '<th>' . \esc_html__( 'Current price', 'sgs-blocks' ) . '</th>'
		. '<th>' . \esc_html__( 'New price (inc. VAT)', 'sgs-blocks' ) . '</th>'
		. '</tr></thead>';
	echo '<tbody id="sgs-confirm-price-tbody"></tbody>';
	echo '</table>';
	// Spec Gap-2 disclosure: the owner sees the side-effects BEFORE confirming.
	echo '<p class="description" style="background:#fcf9e8;border-left:3px solid #dba617;padding:8px 12px;margin-bottom:16px;">';
	echo \esc_html__( 'Before you apply: prices you hand-edited are skipped (you keep them). Any sale price at or above the new price — and any scheduled sale — is cleared so a sale never shows above the normal price. You can undo everything with "Revert last generation".', 'sgs-blocks' );
	echo '</p>';
	echo '<p style="display:flex;gap:8px;">';
	echo '<button type="button" id="sgs-confirm-apply-yes" class="button button-primary">'
		. \esc_html__( 'Yes, apply now', 'sgs-blocks' ) . '</button>';
	echo '<button type="button" id="sgs-confirm-apply-cancel" class="button button-secondary">'
		. \esc_html__( 'Cancel', 'sgs-blocks' ) . '</button>';
	echo '</p>';
	echo '</div>';
	echo '</div>';
}
