/**
 * Link-source options shared by every inspector that offers a "where does this link
 * come from" choice (sgs/button, sgs/choice-flow's note link). The values match
 * `sgs_resolve_link_source()` in includes/helpers-link-source.php.
 *
 * @package SGS\Blocks
 */
import { __ } from '@wordpress/i18n';

export const LINK_SOURCE_OPTIONS = [
	{ label: __( 'Typed URL', 'sgs-blocks' ), value: 'url' },
	{ label: __( 'Phone (Site Info)', 'sgs-blocks' ), value: 'phone' },
	{ label: __( 'Email (Site Info)', 'sgs-blocks' ), value: 'email' },
	{ label: __( 'WhatsApp (Site Info)', 'sgs-blocks' ), value: 'whatsapp' },
	{ label: __( 'Back to top', 'sgs-blocks' ), value: 'top' },
	{ label: __( 'Account', 'sgs-blocks' ), value: 'account' },
];

// Link sources that resolve their own destination and never fall back to the
// typed URL field — the URL row below the dropdown is hidden entirely for
// these (U-12 §F), rather than shown-but-disabled like the Site Info sources.
export const FIXED_DESTINATION_LINK_SOURCES = [ 'top', 'account' ];

// Plain-English "where does this come from" help line per non-URL source —
// shown under the Link source dropdown once picked. Site Info sources are
// PHP-side sourced from the matching Sgs_Site_Info keys (render.php: 'phone',
// 'email', 'socials.whatsapp'); 'top'/'account' are resolved by
// sgs_resolve_link_source() (includes/helpers-link-source.php).
export const LINK_SOURCE_HELP = {
	phone: __( 'Uses the phone number set in Appearance > SGS Site Info. If that field is empty, the typed URL below is used instead.', 'sgs-blocks' ),
	email: __( 'Uses the email address set in Appearance > SGS Site Info. If that field is empty, the typed URL below is used instead.', 'sgs-blocks' ),
	whatsapp: __( 'Uses the WhatsApp link set in Appearance > SGS Site Info. If that field is empty, the typed URL below is used instead.', 'sgs-blocks' ),
	top: __( 'Scrolls smoothly to the top of the page and moves keyboard/screen-reader focus there.', 'sgs-blocks' ),
	account: __( 'Links to the WooCommerce My Account page, or the login screen when WooCommerce is not active.', 'sgs-blocks' ),
};

// The sources a block can offer when it has no "back to top" or "account" meaning.
export const SITE_INFO_LINK_SOURCE_OPTIONS = LINK_SOURCE_OPTIONS.filter( ( option ) =>
	[ 'url', 'phone', 'email', 'whatsapp' ].includes( option.value )
);
