/**
 * Link-source resolution for the editor: the twin of includes/helpers-link-source.php
 * (`sgs_resolve_link_source()`), used for previews and the link row's label.
 *
 * Site Info links come from `window.sgsBlocksData.siteInfo`
 * (Sgs_Site_Info_Binding::editor_site_info(): `{ [key]: { value, link, filled } }`), which
 * the server builds with the same link_for_key() the resolver uses, so a preview shows the
 * href the page will print. Two documented differences: the editor shows the email address
 * plain where the page obscures it with antispambot(), and a `post:<id>` link previews the
 * permalink the caller passes (else the typed URL captured when the page was picked).
 *
 * @package SGS\Blocks
 */

/** Source value → Site Info key, for every source that reads Site Info. */
export const LINK_SOURCE_SITE_INFO_KEYS = {
	phone: 'phone',
	email: 'email',
	whatsapp: 'socials.whatsapp',
	directions: 'address',
	google: 'socials.google',
	facebook: 'socials.facebook',
	instagram: 'socials.instagram',
	twitter: 'socials.twitter',
	linkedin: 'socials.linkedin',
	youtube: 'socials.youtube',
	tiktok: 'socials.tiktok',
};

/**
 * The post ID a `post:<id>` source names, or 0. Twin: sgs_link_source_post_id().
 *
 * @param {string} source Stored source value.
 * @return {number} Post ID or 0.
 */
export function linkSourcePostId( source ) {
	const match = /^post:([1-9][0-9]*)$/.exec( 'string' === typeof source ? source : '' );
	return match ? Number( match[ 1 ] ) : 0;
}

/**
 * True when a URL may become an href: http, https, mailto, tel, or scheme-less.
 * Twin: sgs_link_source_is_safe_url().
 *
 * @param {string} url Unescaped URL.
 * @return {boolean} Whether the URL is allowed.
 */
export function isSafeLinkUrl( url ) {
	const value = 'string' === typeof url ? url.trim() : '';
	// eslint-disable-next-line no-control-regex
	if ( '' === value || /[\x00-\x1F\x7F]/.test( value ) ) {
		return false;
	}
	const scheme = /^([a-z][a-z0-9+.\-]*):/i.exec( value );
	if ( ! scheme ) {
		return true;
	}
	return [ 'http', 'https', 'mailto', 'tel' ].includes( scheme[ 1 ].toLowerCase() );
}

/**
 * The editor's Site Info store, or an empty object.
 *
 * @return {Object} `{ [key]: { value, link, filled } }`.
 */
export function editorSiteInfo() {
	const data = 'undefined' !== typeof window ? window.sgsBlocksData?.siteInfo : undefined;
	return data && 'object' === typeof data ? data : {};
}

/**
 * Resolve a stored source and typed URL to the href the page prints.
 * Twin: sgs_resolve_link_source().
 *
 * @param {string} source            Stored source value ('' = the typed URL).
 * @param {string} typedUrl          Typed URL (the fallback for every source that cannot resolve).
 * @param {Object} [context]
 * @param {Object} [context.siteInfo]  `window.sgsBlocksData.siteInfo` shape; defaults to the live one.
 * @param {string} [context.permalink] Current permalink of a `post:<id>` target, when known.
 * @param {string} [context.accountUrl] The account destination, when known.
 * @return {{url: string, attrs: Object<string,string>}} Resolved href ('' = no link) and extra attributes.
 */
export function resolveLinkSource( source, typedUrl, context = {} ) {
	const typed = { url: 'string' === typeof typedUrl ? typedUrl : '', attrs: {} };
	const value = 'string' === typeof source ? source : '';

	if ( linkSourcePostId( value ) > 0 ) {
		const permalink = context.permalink || '';
		return permalink && isSafeLinkUrl( permalink ) ? { url: permalink, attrs: {} } : typed;
	}

	const key = LINK_SOURCE_SITE_INFO_KEYS[ value ];
	if ( key ) {
		const siteInfo = context.siteInfo || editorSiteInfo();
		const link = String( siteInfo?.[ key ]?.link || '' ).trim();
		return link && isSafeLinkUrl( link ) ? { url: link, attrs: {} } : typed;
	}

	if ( 'top' === value ) {
		return { url: '#top', attrs: { 'data-sgs-link-source': 'top' } };
	}
	if ( 'account' === value ) {
		return { url: context.accountUrl || typed.url, attrs: {} };
	}
	return typed;
}
