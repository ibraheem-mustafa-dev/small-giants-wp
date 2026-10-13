/**
 * Link-source options shared by every inspector that offers a "where does this link
 * come from" choice: sgs/button's own Link source select, sgs/choice-flow's note link and
 * the shared link popover (`src/components/LinkSourcePicker.js`). The values match
 * `sgs_resolve_link_source()` in includes/helpers-link-source.php and its editor twin
 * src/utils/link-source.js.
 *
 * @package SGS\Blocks
 */
import { __, sprintf } from '@wordpress/i18n';

/** Site Info sources, in the order the pickers list them. */
export const SITE_INFO_SOURCE_OPTIONS = [
	{ label: __( 'Phone (Site Info)', 'sgs-blocks' ), value: 'phone' },
	{ label: __( 'Email (Site Info)', 'sgs-blocks' ), value: 'email' },
	{ label: __( 'WhatsApp (Site Info)', 'sgs-blocks' ), value: 'whatsapp' },
	{ label: __( 'Directions (Site Info)', 'sgs-blocks' ), value: 'directions' },
	{ label: __( 'Google Business Profile (Site Info)', 'sgs-blocks' ), value: 'google' },
	{ label: __( 'Facebook (Site Info)', 'sgs-blocks' ), value: 'facebook' },
	{ label: __( 'Instagram (Site Info)', 'sgs-blocks' ), value: 'instagram' },
	{ label: __( 'X / Twitter (Site Info)', 'sgs-blocks' ), value: 'twitter' },
	{ label: __( 'LinkedIn (Site Info)', 'sgs-blocks' ), value: 'linkedin' },
	{ label: __( 'YouTube (Site Info)', 'sgs-blocks' ), value: 'youtube' },
	{ label: __( 'TikTok (Site Info)', 'sgs-blocks' ), value: 'tiktok' },
];

/** sgs/button's Link source select (its block.json `linkSource` enum holds the same values). */
export const LINK_SOURCE_OPTIONS = [
	{ label: __( 'Typed URL', 'sgs-blocks' ), value: 'url' },
	...SITE_INFO_SOURCE_OPTIONS,
	{ label: __( 'Back to top', 'sgs-blocks' ), value: 'top' },
	{ label: __( 'Account', 'sgs-blocks' ), value: 'account' },
];

// Link sources that resolve their own destination and never fall back to the
// typed URL field — the URL row below the dropdown is hidden entirely for
// these, rather than shown as a fallback like the Site Info sources.
export const FIXED_DESTINATION_LINK_SOURCES = [ 'top', 'account' ];

const siteInfoHelp = ( what ) =>
	sprintf(
		/* translators: %s: the Site Info field, e.g. "phone number". */
		__( 'Uses the %s set in Appearance > SGS Site Info. If that field is empty, the typed URL is used instead.', 'sgs-blocks' ),
		what
	);

// Plain-English "where does this come from" help line per non-URL source, shown under the
// source select once picked.
export const LINK_SOURCE_HELP = {
	phone: siteInfoHelp( __( 'phone number', 'sgs-blocks' ) ),
	email: siteInfoHelp( __( 'email address', 'sgs-blocks' ) ),
	whatsapp: siteInfoHelp( __( 'WhatsApp link', 'sgs-blocks' ) ),
	directions: siteInfoHelp( __( 'Google Maps link (or, without one, the address)', 'sgs-blocks' ) ),
	google: siteInfoHelp( __( 'Google Business Profile link', 'sgs-blocks' ) ),
	facebook: siteInfoHelp( __( 'Facebook link', 'sgs-blocks' ) ),
	instagram: siteInfoHelp( __( 'Instagram link', 'sgs-blocks' ) ),
	twitter: siteInfoHelp( __( 'X / Twitter link', 'sgs-blocks' ) ),
	linkedin: siteInfoHelp( __( 'LinkedIn link', 'sgs-blocks' ) ),
	youtube: siteInfoHelp( __( 'YouTube link', 'sgs-blocks' ) ),
	tiktok: siteInfoHelp( __( 'TikTok link', 'sgs-blocks' ) ),
	top: __( 'Scrolls smoothly to the top of the page and moves keyboard/screen-reader focus there.', 'sgs-blocks' ),
	account: __( 'Links to the WooCommerce My Account page, or the login screen when WooCommerce is not active.', 'sgs-blocks' ),
	post: __( 'Follows the chosen page or post: if its address changes, the link updates. If it is deleted or unpublished, the last address picked is used.', 'sgs-blocks' ),
};

// The sources a block can offer when it has no "back to top" or "account" meaning.
export const SITE_INFO_LINK_SOURCE_OPTIONS = LINK_SOURCE_OPTIONS.filter( ( option ) =>
	[ 'url', 'phone', 'email', 'whatsapp' ].includes( option.value )
);

/**
 * Source sets a LinkPopoverField call site passes as `linkSources` ('' — the typed URL — is
 * always offered). `post` stands for every `post:<id>` value.
 */
export const LINK_SOURCES_ALL = [ 'post', ...SITE_INFO_SOURCE_OPTIONS.map( ( o ) => o.value ), 'top' ];
/** For a link that is a destination in its own right, never an in-page jump (a product's buttons). */
export const LINK_SOURCES_NO_TOP = LINK_SOURCES_ALL.filter( ( source ) => 'top' !== source );
/** For a destination that must be a page address (a redirect, a language or store URL). */
export const LINK_SOURCES_PAGES = [ 'post' ];
/** For a link that must be a web page (https): pages plus the web Site Info links. */
export const LINK_SOURCES_WEB = [ 'post', 'directions', 'google', 'facebook', 'instagram', 'twitter', 'linkedin', 'youtube', 'tiktok' ];
