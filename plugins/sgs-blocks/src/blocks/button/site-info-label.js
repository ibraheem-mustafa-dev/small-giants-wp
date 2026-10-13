/**
 * The Site Info value a button prints as its label: the editor's twin of
 * includes/helpers-button-site-info-label.php::sgs_button_site_info_label(). Reads the values
 * the editor already carries in `window.sgsBlocksData.siteInfo`
 * (Sgs_Site_Info_Binding::editor_site_info()).
 *
 * Logic only, no React and no WordPress imports, so plain Node can load it.
 *
 * @package SGS\Blocks
 */

/** `linkSource` values whose Site Info value can be the label. */
export const SITE_INFO_LABEL_SOURCES = [ 'phone', 'email', 'whatsapp' ];

const EMAIL_PATTERN = /^[^\s@<>]+@[^\s@<>]+\.[^\s@<>]+$/;
const WHATSAPP_LINK = /^(?:https?:\/\/)?(?:www\.)?(?:wa\.me\/|api\.whatsapp\.com\/send\/?\?phone=)\+?([0-9]+)/i;

/**
 * The plain-text Site Info value for a link source.
 *
 * @param {string} source   The button's `linkSource` value.
 * @param {Object} siteInfo `window.sgsBlocksData.siteInfo`: key to `{ value }`.
 * @return {string} The text, or '' when the source is not supported or Site Info holds no usable value.
 */
export function siteInfoLabelText( source, siteInfo ) {
	if ( ! SITE_INFO_LABEL_SOURCES.includes( source ) ) {
		return '';
	}
	const key = 'whatsapp' === source ? 'socials.whatsapp' : source;
	const entry = siteInfo && 'object' === typeof siteInfo ? siteInfo[ key ] : undefined;
	const value = 'string' === typeof entry?.value ? entry.value.trim() : '';
	if ( '' === value ) {
		return '';
	}
	if ( 'email' === source && ! EMAIL_PATTERN.test( value ) ) {
		return '';
	}
	if ( 'whatsapp' === source ) {
		const link = WHATSAPP_LINK.exec( value );
		if ( link ) {
			return `+${ link[ 1 ] }`;
		}
		if ( /^[a-z][a-z0-9+.-]*:/i.test( value ) ) {
			return '';
		}
	}
	return value.replace( /<[^>]*>/g, '' ).trim();
}
