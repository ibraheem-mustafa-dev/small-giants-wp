<?php
/**
 * Cart line summary — the client's own wording, and nothing else.
 *
 * Every word a shopper reads in a line summary comes from here, and every
 * framework default is an EMPTY STRING. That is the whole point of this file:
 * the summary builder (functions.php) is a pure string shaper that never
 * knows what trade the client is in, so no industry vocabulary can leak into
 * framework code. A site that sets nothing still gets a correct summary —
 * just without a lead word.
 *
 * Storage shape (option `sgs_cart_line_summary`, autoload off):
 *   {
 *     "leadWithAddons":    "",         // opens line 1 when the line has add-ons
 *     "leadWithoutAddons": "",         // opens the single line when it has none
 *     "attributeLabels":   { "pa_x": "Shorter name" },
 *     "sizeBand":          { "axis": "pa_x", "scale": "S:52,M:57,L" }
 *   }
 *
 * `attributeLabels` renames an attribute for the SHOPPER only, through the
 * core `woocommerce_attribute_label` filter — never by renaming the attribute
 * itself, which would also move the product-page picker label and the shop
 * filter heading.
 *
 * `sizeBand` names the one variation axis whose numeric term names are shown
 * as band letters, and the scale that maps them, in the mini-syntax
 * includes/buybox-picker-band.php parses. Same axis and same scale as the
 * product page's size tiles, so the two can never disagree.
 *
 * @package SGS\Blocks
 */

namespace SGS\Blocks;

defined( 'ABSPATH' ) || exit;

/** The option name the cart line summary wording is stored under. */
const SGS_CART_LINE_SUMMARY_OPTION = 'sgs_cart_line_summary';

if ( ! function_exists( __NAMESPACE__ . '\\sgs_cart_line_summary_wording' ) ) {
	/**
	 * Read the client's summary wording, normalised, with empty defaults.
	 *
	 * @return array{leadWithAddons:string,leadWithoutAddons:string,attributeLabels:array<string,string>,sizeBand:array{axis:string,scale:string}}
	 */
	function sgs_cart_line_summary_wording(): array {
		$raw = \get_option( SGS_CART_LINE_SUMMARY_OPTION, array() );
		return sgs_cart_line_summary_wording_normalise( \is_array( $raw ) ? $raw : array() );
	}
}

if ( ! function_exists( __NAMESPACE__ . '\\sgs_cart_line_summary_wording_normalise' ) ) {
	/**
	 * Normalise/sanitise raw summary wording (from the option or a CLI seed
	 * file) into the canonical shape. Run on every read AND every write, so a
	 * hand-edited option can never leak an unsanitised string into a cart
	 * line, an order email or a PayPal line description.
	 *
	 * @param array<string,mixed> $raw Raw wording.
	 * @return array{leadWithAddons:string,leadWithoutAddons:string,attributeLabels:array<string,string>,sizeBand:array{axis:string,scale:string}}
	 */
	function sgs_cart_line_summary_wording_normalise( array $raw ): array {
		$labels     = array();
		$raw_labels = isset( $raw['attributeLabels'] ) && \is_array( $raw['attributeLabels'] )
			? $raw['attributeLabels']
			: array();
		foreach ( $raw_labels as $taxonomy => $label ) {
			if ( ! \is_scalar( $label ) ) {
				continue;
			}
			// A taxonomy name, not a slug: sanitize_key() would strip nothing
			// useful here but would also accept a hyphen, which is correct for
			// `pa_frame-size`.
			$taxonomy = \sanitize_key( (string) $taxonomy );
			$label    = \sanitize_text_field( (string) $label );
			if ( '' !== $taxonomy && '' !== $label ) {
				$labels[ $taxonomy ] = $label;
			}
		}

		$raw_band = isset( $raw['sizeBand'] ) && \is_array( $raw['sizeBand'] ) ? $raw['sizeBand'] : array();

		return array(
			'leadWithAddons'    => isset( $raw['leadWithAddons'] ) && \is_scalar( $raw['leadWithAddons'] )
				? \sanitize_text_field( (string) $raw['leadWithAddons'] )
				: '',
			'leadWithoutAddons' => isset( $raw['leadWithoutAddons'] ) && \is_scalar( $raw['leadWithoutAddons'] )
				? \sanitize_text_field( (string) $raw['leadWithoutAddons'] )
				: '',
			'attributeLabels'   => $labels,
			'sizeBand'          => array(
				'axis'  => isset( $raw_band['axis'] ) && \is_scalar( $raw_band['axis'] )
					? \sanitize_key( (string) $raw_band['axis'] )
					: '',
				'scale' => isset( $raw_band['scale'] ) && \is_scalar( $raw_band['scale'] )
					? \sanitize_text_field( (string) $raw_band['scale'] )
					: '',
			),
		);
	}
}

if ( ! function_exists( __NAMESPACE__ . '\\sgs_cart_line_summary_size_band' ) ) {
	/**
	 * The configured size-band axis and its scale.
	 *
	 * Resolution order: the client's wording option, then the
	 * `sgs_cart_line_summary_size_band` filter, so a site can compute a scale
	 * in code without storing it. Absent either, both are '' and every caller
	 * degrades to the term's own name — never a blank size.
	 *
	 * @return array{axis:string,scale:string}
	 */
	function sgs_cart_line_summary_size_band(): array {
		$band = sgs_cart_line_summary_wording()['sizeBand'];

		/**
		 * Filter the cart summary's size-band axis and scale.
		 *
		 * @param array{axis:string,scale:string} $band Axis taxonomy and band scale.
		 */
		$band = \apply_filters( 'sgs_cart_line_summary_size_band', $band );

		return array(
			'axis'  => \is_array( $band ) && isset( $band['axis'] ) ? \sanitize_key( (string) $band['axis'] ) : '',
			'scale' => \is_array( $band ) && isset( $band['scale'] ) ? (string) $band['scale'] : '',
		);
	}
}
