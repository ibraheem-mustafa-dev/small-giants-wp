/**
 * Block Bindings — editor-side registration for the `sgs/site-info` source.
 *
 * PROBLEM this closes (C15-2 / C15-3 — see the scope proposal this file
 * implements: .claude/reports/2026-08-28-c15-block-bindings-scope-proposal.md):
 * `sgs/site-info` has only ever been registered in PHP
 * (includes/class-sgs-site-info-binding.php). A PHP-only source renders
 * correctly on the frontend but is MUTE in the editor — WordPress core's own
 * Attributes panel (block sidebar, WP 6.7+) cannot list its fields, so a
 * client has no way to discover or pick a binding; only a developer typing
 * raw JSON into a pattern file could ever create one. This file is the JS
 * half of the two-sided registration the Block Bindings API requires.
 *
 * PAIRS WITH the PHP registration — the `name` below MUST be byte-identical
 * to the first argument of `register_block_bindings_source()` at
 * includes/class-sgs-site-info-binding.php:56-63 ('sgs/site-info'). If the
 * two strings ever diverge, WordPress treats them as two unrelated sources:
 * the PHP one still renders the frontend value, but core's editor UI will
 * never populate a picker for it, silently reproducing the exact gap this
 * file exists to close.
 *
 * SCOPE (deliberately narrow — read before extending):
 *   - `getFieldsList()` (WP 6.9+) is the headline deliverable: it is what
 *     lets core's binding picker offer "Phone", "Email", "Address" etc. as
 *     clickable options instead of a client needing to know the raw key.
 *   - `getValues()` reads `window.sgsBlocksData.siteInfo`, which
 *     `Sgs_Site_Info_Binding::editor_site_info()` prints into the editor for
 *     the contact keys (phone, email, address) and every social, and only for
 *     a user who can edit posts (they already see these values on the pages
 *     they edit; there is still no public REST read of the store). A link
 *     attribute gets the link the key makes, any other attribute its plain
 *     value; a key outside that list resolves to '' in the editor and the
 *     canvas shows the server-rendered value where the block renders through
 *     <ServerSideRender>. Values refresh when the editor reloads.
 *   - Write-back (`setValues` / `canUserEditValue`) is C15-4 and explicitly
 *     OUT OF SCOPE. Neither is implemented; per the Block Bindings API, a
 *     source with no `canUserEditValue` is treated as not editable in the
 *     editor UI, matching this source's existing read-only PHP behaviour.
 *
 * @package SGS\Blocks
 * @since   0.1.2
 */

import { registerBlockBindingsSource } from '@wordpress/blocks';
import { __ } from '@wordpress/i18n';

/**
 * Field list surfaced in core's block-bindings picker.
 *
 * Keys mirror the six existing consumers (theme/sgs-theme/patterns/
 * contact-form.php + contact-minimal.php: email, phone, address,
 * opening_hours.mon) plus every other top-level key documented in the GDPR
 * sensitivity map at includes/class-sgs-site-info.php:73-82, plus the
 * `opening_hours.*` and `socials.*` sub-trees already supported by the PHP
 * source's dot-notation resolver (Sgs_Site_Info::get()).
 *
 * A full per-day / per-channel breakdown of source GROUPING (Kadence-style
 * Post/Site/Author/Media/Time categorisation) is C15-11 and deliberately not
 * attempted here — this is a flat list, which is what `getFieldsList()`
 * requires at minimum for WP 6.9's picker to work at all.
 *
 * @type {Record<string, {label: string, type: string}>}
 */
const SITE_INFO_FIELDS = {
	phone: { label: __( 'Phone', 'sgs-blocks' ), type: 'string' },
	email: { label: __( 'Email', 'sgs-blocks' ), type: 'string' },
	support_email: {
		label: __( 'Support email', 'sgs-blocks' ),
		type: 'string',
	},
	address: { label: __( 'Address', 'sgs-blocks' ), type: 'string' },
	registered_office: {
		label: __( 'Registered office', 'sgs-blocks' ),
		type: 'string',
	},
	vat_number: { label: __( 'VAT number', 'sgs-blocks' ), type: 'string' },
	copyright: { label: __( 'Copyright', 'sgs-blocks' ), type: 'string' },
	tagline: { label: __( 'Tagline', 'sgs-blocks' ), type: 'string' },
	google_rating: {
		label: __( 'Google rating (out of 5)', 'sgs-blocks' ),
		type: 'string',
	},
	google_review_count: {
		label: __( 'Number of Google reviews', 'sgs-blocks' ),
		type: 'string',
	},
	// The PHP source resolves `logo` to the attachment's URL (a string), not to
	// the stored attachment ID — see Sgs_Site_Info_Binding::get_value().
	logo: { label: __( 'Logo URL', 'sgs-blocks' ), type: 'string' },
	'opening_hours.mon': {
		label: __( 'Opening hours — Monday', 'sgs-blocks' ),
		type: 'string',
	},
	'opening_hours.tue': {
		label: __( 'Opening hours — Tuesday', 'sgs-blocks' ),
		type: 'string',
	},
	'opening_hours.wed': {
		label: __( 'Opening hours — Wednesday', 'sgs-blocks' ),
		type: 'string',
	},
	'opening_hours.thu': {
		label: __( 'Opening hours — Thursday', 'sgs-blocks' ),
		type: 'string',
	},
	'opening_hours.fri': {
		label: __( 'Opening hours — Friday', 'sgs-blocks' ),
		type: 'string',
	},
	'opening_hours.sat': {
		label: __( 'Opening hours — Saturday', 'sgs-blocks' ),
		type: 'string',
	},
	'opening_hours.sun': {
		label: __( 'Opening hours — Sunday', 'sgs-blocks' ),
		type: 'string',
	},
	'socials.facebook': {
		label: __( 'Facebook link', 'sgs-blocks' ),
		type: 'string',
	},
	'socials.instagram': {
		label: __( 'Instagram link', 'sgs-blocks' ),
		type: 'string',
	},
	'socials.twitter': {
		label: __( 'Twitter / X link', 'sgs-blocks' ),
		type: 'string',
	},
	'socials.linkedin': {
		label: __( 'LinkedIn link', 'sgs-blocks' ),
		type: 'string',
	},
	'socials.youtube': {
		label: __( 'YouTube link', 'sgs-blocks' ),
		type: 'string',
	},
	'socials.tiktok': {
		label: __( 'TikTok link', 'sgs-blocks' ),
		type: 'string',
	},
	'socials.whatsapp': {
		label: __( 'WhatsApp link', 'sgs-blocks' ),
		type: 'string',
	},
	'socials.google': {
		label: __( 'Google Business link', 'sgs-blocks' ),
		type: 'string',
	},
};

/**
 * @param {string} attrName Bound attribute name.
 * @return {boolean} True for a link attribute: `url`, or a name ending `Url` (linkUrl, imageUrl …).
 */
const isLinkAttribute = ( attrName ) => 'url' === attrName || ( attrName.length > 3 && attrName.endsWith( 'Url' ) );

registerBlockBindingsSource( {
	name: 'sgs/site-info',
	label: __( 'SGS Site Info', 'sgs-blocks' ),

	/**
	 * Resolves the CURRENT bound values for the editor UI.
	 *
	 * From `window.sgsBlocksData.siteInfo` (see the file docblock): a link
	 * attribute gets the key's link, any other attribute its plain value, and
	 * a key the editor data does not carry gets ''.
	 *
	 * @param {Object} params
	 * @param {Object} params.bindings Map of attribute name -> binding args.
	 * @return {Object} Map of attribute name -> resolved value.
	 */
	getValues( { bindings } ) {
		const siteInfo = window.sgsBlocksData?.siteInfo || {};
		const values = {};

		Object.entries( bindings || {} ).forEach( ( [ attrName, binding ] ) => {
			const entry = siteInfo[ binding?.args?.key ];
			if ( ! entry ) {
				values[ attrName ] = '';
				return;
			}
			// A link attribute takes the link the key makes; any other attribute its plain value
			// (Sgs_Site_Info_Binding::is_link_attribute is the PHP twin of this rule).
			values[ attrName ] = isLinkAttribute( attrName ) ? entry.link : entry.value;
		} );

		return values;
	},

	/**
	 * Populates core's binding picker (WP 6.9+ `getFieldsList`).
	 *
	 * This is the change that turns the source from a developer-only,
	 * hand-typed-JSON feature into something a client can select from a
	 * dropdown in the block sidebar.
	 *
	 * @return {Record<string, {label: string, type: string}>}
	 */
	getFieldsList() {
		return SITE_INFO_FIELDS;
	},
} );

import './product-field';
