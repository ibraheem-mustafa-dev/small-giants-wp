<?php
/**
 * Link-source resolution: the one server-side owner of "where does this link go".
 *
 * A link stores the URL an operator typed plus, optionally, a sibling source value (sgs/button's
 * `linkSource`, every other block's `<urlAttr>Source` or `linkSource` written by the shared
 * LinkPopoverField). This file turns that pair into the real href at render time, so changing
 * Site Info or a page's address updates every link that points at it. The editor twin is
 * src/utils/link-source.js.
 *
 * Source values:
 * - '' or 'url'     the typed URL, unchanged.
 * - 'post:<id>'     a page or post on this site, resolved to its current permalink by ID.
 * - 'phone', 'email', 'whatsapp'                       Site Info contact links.
 * - 'directions'    the Google Maps link Site Info makes for the address (maps_url, else the
 *                   place CID, else an address search).
 * - 'google'        the Google Business Profile link (socials.google).
 * - 'facebook', 'instagram', 'twitter', 'linkedin', 'youtube', 'tiktok'   Site Info socials.
 * - 'top'           back to the top of the page (focus handled by sgs/button's view module).
 * - 'account'       the WooCommerce My Account page, else the login screen.
 *
 * Fallback rule (sgs/button's): a Site Info source whose field is empty, a page that no longer
 * exists or is not public, and an unknown source all return the typed URL; with no typed URL
 * the result is '' and the caller renders no link. `phone`/`email`/`whatsapp` keep their
 * original resolution byte for byte (tests/php/run-link-source-standalone.php).
 *
 * @package SGS\Blocks
 */

defined( 'ABSPATH' ) || exit;

if ( ! function_exists( 'sgs_link_source_site_info_keys' ) ) {
	/**
	 * Link sources that read Site Info through Sgs_Site_Info_Binding::link_for_key(), keyed by
	 * source value, valued by the Site Info key. `phone`, `email` and `whatsapp` are resolved
	 * separately (sgs_resolve_link_source()) and are not listed.
	 *
	 * @return array<string,string>
	 */
	function sgs_link_source_site_info_keys(): array {
		return array(
			'directions' => 'address',
			'google'     => 'socials.google',
			'facebook'   => 'socials.facebook',
			'instagram'  => 'socials.instagram',
			'twitter'    => 'socials.twitter',
			'linkedin'   => 'socials.linkedin',
			'youtube'    => 'socials.youtube',
			'tiktok'     => 'socials.tiktok',
		);
	}
}

if ( ! function_exists( 'sgs_link_source_post_id' ) ) {
	/**
	 * The post ID a `post:<id>` source names, or 0 for any other value.
	 *
	 * @param string $source A link source value.
	 * @return int
	 */
	function sgs_link_source_post_id( string $source ): int {
		return 1 === preg_match( '/^post:([1-9][0-9]*)$/', $source, $m ) ? (int) $m[1] : 0;
	}
}

if ( ! function_exists( 'sgs_link_source_is_safe_url' ) ) {
	/**
	 * True when a resolved URL may become an href: http, https, mailto or tel, or a scheme-less
	 * relative path or fragment. Anything else (javascript:, data:, vbscript: …) is refused.
	 *
	 * @param string $url Unescaped URL.
	 * @return bool
	 */
	function sgs_link_source_is_safe_url( string $url ): bool {
		$url = trim( $url );
		if ( '' === $url || 1 === preg_match( '/[\x00-\x1F\x7F]/', $url ) ) {
			return false;
		}
		if ( 1 !== preg_match( '/^([a-z][a-z0-9+.\-]*):/i', $url, $m ) ) {
			return true;
		}
		return in_array( strtolower( $m[1] ), array( 'http', 'https', 'mailto', 'tel' ), true );
	}
}

if ( ! function_exists( 'sgs_resolve_link_source' ) ) {
	/**
	 * Resolve a link source to a final href plus any extra attributes the source needs on the
	 * rendered link element.
	 *
	 * @param string $source    The stored source value ('' = the typed URL).
	 * @param string $typed_url The typed URL: the result for '' and 'url', and the fallback for
	 *                          every source that cannot resolve.
	 *
	 * @return array{url:string,attrs:array<string,string>} `url` is the resolved (unescaped)
	 *              href, '' when there is no link; `attrs` are extra element attributes (the
	 *              `top` source's `data-sgs-link-source`).
	 */
	function sgs_resolve_link_source( string $source, string $typed_url ): array {
		$typed = array(
			'url'   => $typed_url,
			'attrs' => array(),
		);

		$post_id = sgs_link_source_post_id( $source );
		if ( $post_id > 0 ) {
			$post = function_exists( 'get_post' ) ? get_post( $post_id ) : null;
			if ( ! $post || ! function_exists( 'is_post_publicly_viewable' ) || ! is_post_publicly_viewable( $post ) ) {
				return $typed;
			}
			$permalink = (string) get_permalink( $post );
			return '' !== $permalink && sgs_link_source_is_safe_url( $permalink )
				? array(
					'url'   => $permalink,
					'attrs' => array(),
				)
				: $typed;
		}

		$site_info_keys = sgs_link_source_site_info_keys();
		if ( isset( $site_info_keys[ $source ] ) ) {
			$link = class_exists( '\SGS\Blocks\Sgs_Site_Info_Binding' )
				? (string) \SGS\Blocks\Sgs_Site_Info_Binding::link_for_key( $site_info_keys[ $source ] )
				: '';
			return '' !== trim( $link ) && sgs_link_source_is_safe_url( $link )
				? array(
					'url'   => $link,
					'attrs' => array(),
				)
				: $typed;
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
				// (esc_url_raw-sanitised on write) and used as-is.
				$sgs_site_info_href = (string) \SGS\Blocks\Sgs_Site_Info::get( 'socials.whatsapp', '' );
				return array(
					'url'   => '' !== trim( $sgs_site_info_href ) ? $sgs_site_info_href : $typed_url,
					'attrs' => array(),
				);

			case 'top':
				// A fixed in-page anchor that works with no JavaScript. sgs/button's view module
				// upgrades it to a focus-managed smooth scroll on any element carrying the
				// data attribute; it is enqueued here so a top link in any block gets it.
				wp_enqueue_script_module( generate_block_asset_handle( 'sgs/button', 'viewScriptModule' ) );
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
				// '' (no source chosen), 'url' and any unknown value keep the typed URL, so a
				// link never silently loses its destination.
				return $typed;
		}
	}
}

if ( ! function_exists( 'sgs_link_source_href' ) ) {
	/**
	 * The resolved href alone, for a call site that prints its own anchor. Unescaped: the
	 * caller escapes with esc_url() as before. Pair with sgs_link_source_attrs_html() so a
	 * `top` link carries its data attribute.
	 *
	 * @param string $source    Stored source value ('' = typed URL).
	 * @param string $typed_url Typed URL.
	 * @return string
	 */
	function sgs_link_source_href( string $source, string $typed_url ): string {
		if ( '' === $source || 'url' === $source ) {
			return $typed_url;
		}
		return sgs_resolve_link_source( $source, $typed_url )['url'];
	}
}

if ( ! function_exists( 'sgs_link_source_attrs_html' ) ) {
	/**
	 * The extra attributes a source puts on its link element, as escaped HTML with a leading
	 * space (' data-sgs-link-source="top"'), or '' for every source that needs none.
	 *
	 * @param string $source Stored source value.
	 * @return string
	 */
	function sgs_link_source_attrs_html( string $source ): string {
		if ( 'top' !== $source ) {
			return '';
		}
		$html = '';
		foreach ( sgs_resolve_link_source( $source, '' )['attrs'] as $name => $value ) {
			$html .= ' ' . sanitize_key( $name ) . '="' . esc_attr( $value ) . '"';
		}
		return $html;
	}
}
