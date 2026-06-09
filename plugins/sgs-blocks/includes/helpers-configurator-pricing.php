<?php
/**
 * Configurator pricing display helpers for SGS block server-side rendering.
 *
 * Provides sgs_configurator_format_minor(), sgs_configurator_mode_price(),
 * sgs_configurator_mode_regular(), and sgs_configurator_per_unit_display() —
 * formatting minor-unit prices and applying the TAX-UI tax-display modes
 * used across the product configurator.
 *
 * @package SGS\Blocks
 */

/**
 * Format a minor-int price as a plain display string (symbol + amount), matching
 * the SSR pattern used across the configurator (wc_price, tags stripped).
 *
 * @param int $minor    Price in minor units (pence).
 * @param int $decimals Currency decimals.
 * @return string e.g. "£9.99".
 */
function sgs_configurator_format_minor( int $minor, int $decimals ): string {
	return html_entity_decode(
		wp_strip_all_tags( wc_price( $minor / 10 ** $decimals ) ),
		ENT_QUOTES,
		'UTF-8'
	);
}

/**
 * The current-price display string for a combo under a tax-display mode (TAX-UI).
 *
 *  - 'auto'        : the shop-configured display price (unchanged behaviour).
 *  - 'inc-suffix'  : display price + the WC price suffix (e.g. "£11.99 inc. VAT").
 *  - 'ex-plus-vat' : ex-VAT price + " + £x VAT" (trade); no VAT line when tax is 0.
 *
 * @param array  $combo    Manifest combo (priceMinor / exMinor / taxMinor).
 * @param string $mode     'auto' | 'inc-suffix' | 'ex-plus-vat'.
 * @param int    $decimals Currency decimals.
 * @param string $suffix   Sanitised WC price suffix (inc-suffix mode only).
 * @return string
 */
function sgs_configurator_mode_price( array $combo, string $mode, int $decimals, string $suffix ): string {
	// Defensive: a stale combo missing the ex/tax fields degrades to the display
	// price instead of emitting "£0.00".
	if ( 'ex-plus-vat' === $mode && isset( $combo['exMinor'], $combo['taxMinor'] ) ) {
		$out = sgs_configurator_format_minor( (int) $combo['exMinor'], $decimals );
		if ( ! empty( $combo['taxMinor'] ) && (int) $combo['taxMinor'] > 0 ) {
			$out .= ' + ' . sgs_configurator_format_minor( (int) $combo['taxMinor'], $decimals ) . ' ' . __( 'VAT', 'sgs-blocks' );
		}
		return $out;
	}
	if ( 'inc-suffix' === $mode && '' !== $suffix ) {
		return sgs_configurator_format_minor( (int) $combo['priceMinor'], $decimals ) . ' ' . $suffix;
	}
	return sgs_configurator_format_minor( (int) $combo['priceMinor'], $decimals );
}

/**
 * The struck-through regular-price display string for a combo under a tax mode.
 *
 * @param array  $combo    Manifest combo (regularMinor / regularExMinor).
 * @param string $mode     Tax-display mode.
 * @param int    $decimals Currency decimals.
 * @return string
 */
function sgs_configurator_mode_regular( array $combo, string $mode, int $decimals ): string {
	$minor = ( 'ex-plus-vat' === $mode && isset( $combo['regularExMinor'] ) )
		? (int) $combo['regularExMinor']
		: (int) $combo['regularMinor'];
	return sgs_configurator_format_minor( $minor, $decimals );
}

/**
 * Per-unit price display string for a combo under a tax mode, e.g. "£1.04 per bar".
 *
 * Derived live (price ÷ divisor) — NEVER a stored price. Returns '' when the
 * variation has no divisor (>0) or no unit label, so the per-unit line is hidden.
 * The headline base mirrors sgs_configurator_mode_price(): ex-VAT in ex-plus-vat
 * mode, else the display price — so "per bar" matches the price shown above it.
 *
 * @param array  $combo    Manifest combo (priceMinor/exMinor/unitDivisor/unitLabel).
 * @param string $mode     Tax-display mode ('auto'|'inc-suffix'|'ex-plus-vat').
 * @param int    $decimals Currency decimals.
 * @param string $template Translated "per %s" template (e.g. from __() ).
 * @return string
 */
function sgs_configurator_per_unit_display( array $combo, string $mode, int $decimals, string $template ): string {
	$divisor = isset( $combo['unitDivisor'] ) ? (float) $combo['unitDivisor'] : 0.0;
	$label   = isset( $combo['unitLabel'] ) ? (string) $combo['unitLabel'] : '';
	if ( $divisor <= 0 || '' === $label ) {
		return '';
	}
	$base_minor     = ( 'ex-plus-vat' === $mode && isset( $combo['exMinor'] ) ) ? (int) $combo['exMinor'] : (int) $combo['priceMinor'];
	$per_unit_minor = (int) round( $base_minor / $divisor );
	return sgs_configurator_format_minor( $per_unit_minor, $decimals ) . ' ' . sprintf( $template, $label );
}
