<?php
/**
 * Link-source resolution for sgs/button (and any future block that adopts the
 * same `linkSource` contract).
 *
 * Moved out of button/render.php's inline `switch` (U-12 §F) so the URL logic
 * has one owner instead of being re-derived per block. `phone`/`email`/
 * `whatsapp` reproduce the original switch byte-for-byte (same Site Info
 * keys, same phone-normalisation regex, same antispambot() call, same
 * empty-value fallback to the typed/internal URL) — proved by
 * tests/php/run-link-source-standalone.php's before/after comparison against
 * a copy of the pre-change switch.
 *
 * @package SGS\Blocks
 */

defined( 'ABSPATH' ) || exit;

if ( ! function_exists( 'sgs_resolve_link_source' ) ) {
	/**
	 * Resolve a button's `linkSource` attribute to a final href plus any
	 * extra wrapper attributes the source needs on the rendered element.
	 *
	 * `$typed_url` is the URL the resolver falls back to: for `phone`/
	 * `email`/`whatsapp` this is the Site-Info-empty fallback (unchanged
	 * behaviour); for an unrecognised source (the negative-control case —
	 * the allow-list removed or a future typo) it is returned as-is, so a
	 * button never silently loses its link. `top` and `account` ignore
	 * `$typed_url` — both always resolve to a real destination.
	 *
	 * @param string $source    The `linkSource` attribute value.
	 * @param string $typed_url The typed/internal-link URL to fall back to.
	 *
	 * @return array{url:string,attrs:array<string,string>} `url` is the
	 *              resolved (unescaped) href; `attrs` are extra element
	 *              attributes to merge into the block wrapper (e.g. the
	 *              `top` source's `data-sgs-link-source`).
	 */
	function sgs_resolve_link_source( string $source, string $typed_url ): array {
		$allowed_sources = array( 'url', 'phone', 'email', 'whatsapp', 'top', 'account' );

		// Negative-control path: an unknown source (allow-list missing, or a
		// future typo in a client's stored attribute) falls back to the typed
		// URL rather than rendering a dead '#' link.
		if ( ! in_array( $source, $allowed_sources, true ) ) {
			return array(
				'url'   => $typed_url,
				'attrs' => array(),
			);
		}

		switch ( $source ) {
			case 'phone':
				// Matches business-info/render.php's phone normalisation exactly
				// (strip everything except digits and a leading +) so the same
				// number produces the same tel: href on both blocks.
				$sgs_site_info_phone = (string) \SGS\Blocks\Sgs_Site_Info::get( 'phone', '' );
				$sgs_site_info_href  = '' !== $sgs_site_info_phone ? 'tel:' . preg_replace( '/[^0-9+]/', '', $sgs_site_info_phone ) : '';
				return array(
					'url'   => '' !== trim( $sgs_site_info_href ) ? $sgs_site_info_href : $typed_url,
					'attrs' => array(),
				);

			case 'email':
				// Matches business-info/render.php's email link (antispambot-obscured
				// mailto:), gated on is_email() the same way.
				$sgs_site_info_email = (string) \SGS\Blocks\Sgs_Site_Info::get( 'email', '' );
				$sgs_site_info_href  = ( '' !== $sgs_site_info_email && is_email( $sgs_site_info_email ) ) ? 'mailto:' . antispambot( $sgs_site_info_email ) : '';
				return array(
					'url'   => '' !== trim( $sgs_site_info_href ) ? $sgs_site_info_href : $typed_url,
					'attrs' => array(),
				);

			case 'whatsapp':
				// socials.whatsapp is stored as a full https://wa.me/... URL
				// (esc_url_raw-sanitised on write) — used as-is, no rebuilding.
				$sgs_site_info_href = (string) \SGS\Blocks\Sgs_Site_Info::get( 'socials.whatsapp', '' );
				return array(
					'url'   => '' !== trim( $sgs_site_info_href ) ? $sgs_site_info_href : $typed_url,
					'attrs' => array(),
				);

			case 'top':
				// U-12 §F: a fixed in-page anchor. src/blocks/button/view.js
				// (enqueued only when this element exists) upgrades the plain
				// anchor jump to a focus-managed smooth scroll; no-JS visitors
				// still get a working #top jump from the browser itself.
				return array(
					'url'   => '#top',
					'attrs' => array( 'data-sgs-link-source' => 'top' ),
				);

			case 'account':
				// WooCommerce's My Account page when WooCommerce is active,
				// else the core login screen — never a dead link.
				$sgs_account_url = '';
				if ( class_exists( 'WooCommerce' ) && function_exists( 'wc_get_page_permalink' ) ) {
					$sgs_account_url = (string) wc_get_page_permalink( 'myaccount' );
				}
				if ( '' === trim( $sgs_account_url ) ) {
					$sgs_account_url = wp_login_url();
				}
				return array(
					'url'   => $sgs_account_url,
					'attrs' => array(),
				);

			case 'url':
			default:
				return array(
					'url'   => $typed_url,
					'attrs' => array(),
				);
		}
	}
}
