<?php
/**
 * The Site Info value a button prints as its label.
 *
 * The button block can show the live phone number, email address or WhatsApp number from
 * Appearance > SGS Site Info instead of its typed label, when its link source is the same
 * Site Info field. The caller falls back to the typed label while the field is empty.
 * JS twin for the editor preview: src/blocks/button/site-info-label.js.
 *
 * @package SGS\Blocks
 */

defined( 'ABSPATH' ) || exit;

if ( ! function_exists( 'sgs_button_site_info_label_sources' ) ) {
	/**
	 * The link sources whose Site Info value can be the button's label.
	 *
	 * @return string[] The `linkSource` values.
	 */
	function sgs_button_site_info_label_sources(): array {
		return array( 'phone', 'email', 'whatsapp' );
	}
}

if ( ! function_exists( 'sgs_button_site_info_label' ) ) {
	/**
	 * The plain-text Site Info value for a link source.
	 *
	 * Phone is the number as typed in Site Info. Email is the address, only when it is a valid
	 * address (the same test the button's mailto link applies). WhatsApp is the stored number,
	 * or `+<digits>` when Site Info holds a wa.me link; any other web address yields ''.
	 *
	 * @param string $source The button's `linkSource` value.
	 * @return string Unescaped text with tags removed, or '' when the source is not one of
	 *                sgs_button_site_info_label_sources() or Site Info holds no usable value.
	 */
	function sgs_button_site_info_label( string $source ): string {
		if ( ! in_array( $source, sgs_button_site_info_label_sources(), true ) ) {
			return '';
		}
		$key   = 'whatsapp' === $source ? 'socials.whatsapp' : $source;
		$value = trim( (string) \SGS\Blocks\Sgs_Site_Info::get( $key, '' ) );
		if ( '' === $value ) {
			return '';
		}
		if ( 'email' === $source && ! is_email( $value ) ) {
			return '';
		}
		if ( 'whatsapp' === $source ) {
			if ( 1 === preg_match( '#^(?:https?://)?(?:www\.)?(?:wa\.me/|api\.whatsapp\.com/send/?\?phone=)\+?([0-9]+)#i', $value, $m ) ) {
				return '+' . $m[1];
			}
			if ( 1 === preg_match( '#^[a-z][a-z0-9+.-]*:#i', $value ) ) {
				return '';
			}
		}
		return trim( wp_strip_all_tags( $value ) );
	}
}
