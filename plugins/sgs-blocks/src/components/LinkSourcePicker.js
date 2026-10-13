/**
 * LinkSourcePicker — the "Link to" choice inside the shared link popover
 * (`LinkPopoverControl.js`): a typed URL, a page or post on this site, a Site Info link
 * (phone, email, WhatsApp, directions, Google Business Profile, socials) or back to top.
 *
 * DATA SHAPE: ONE string sibling per link, next to the URL attribute, named
 * `<urlAttr>Source` (`linkUrl` → `linkUrlSource`, `sgsBlockLink` → `sgsBlockLinkSource`,
 * `ctaUrl` → `ctaUrlSource`), or `linkSource` when the URL attribute is `url` or `link`
 * (sgs/button's `url` + `linkSource` pair). Values: '' = the typed URL (the default; emits
 * nothing), `post:<id>` = a page or post by ID, otherwise the source name ('phone',
 * 'email', 'whatsapp', 'directions', 'google', 'facebook', 'instagram', 'twitter',
 * 'linkedin', 'youtube', 'tiktok', 'top'). No block.json enum (a post ID cannot be
 * enumerated): the server allow-lists it, so an unknown value keeps the typed URL.
 *
 * The URL attribute keeps the typed URL: the fallback while a Site Info field is empty,
 * and the last address picked for a page (used if that page is deleted or unpublished).
 * Picking a page from search, in either the typed or the page mode, stores its ID;
 * pasting a URL or removing the link stores ''. A saved link with no source renders
 * exactly as before, so nothing needs migrating.
 *
 * render.php resolves the pair with includes/helpers-link-source.php:
 * `sgs_link_source_href( $source, $url )` for the href (escape it with esc_url() as
 * before) and `sgs_link_source_attrs_html( $source )` for the `top` source's data
 * attribute. This file only edits the value.
 *
 * @package SGS\Blocks
 */
import { __, sprintf } from '@wordpress/i18n';
import { ComboboxControl } from '@wordpress/components';
import {
	SITE_INFO_SOURCE_OPTIONS,
	LINK_SOURCE_HELP,
} from '../shared/link-source-options';
import {
	LINK_SOURCE_SITE_INFO_KEYS,
	linkSourcePostId,
	editorSiteInfo,
	resolveLinkSource,
} from '../utils/link-source';

/**
 * The picker mode a stored source shows as: '' (typed), 'post', a Site Info source or 'top'.
 *
 * @param {string}  source      Stored source value.
 * @param {boolean} pendingPost True while "Page or post" is chosen and no page is picked yet.
 * @return {string} Mode.
 */
export function linkSourceMode( source, pendingPost = false ) {
	if ( pendingPost || linkSourcePostId( source ) > 0 ) {
		return 'post';
	}
	return ! source || 'url' === source ? '' : source;
}

/**
 * True when the mode keeps the typed URL as a fallback rather than the destination.
 *
 * @param {string} mode linkSourceMode() result.
 * @return {boolean} Whether the source reads Site Info.
 */
export function isSiteInfoMode( mode ) {
	return Object.prototype.hasOwnProperty.call( LINK_SOURCE_SITE_INFO_KEYS, mode );
}

/**
 * Short label for the link row: "Phone (Site Info)", "Page or post", "Back to top", or ''
 * for a typed URL.
 *
 * @param {string} mode linkSourceMode() result.
 * @return {string} Label.
 */
export function linkSourceLabel( mode ) {
	if ( 'post' === mode ) {
		return __( 'Page or post', 'sgs-blocks' );
	}
	if ( 'top' === mode ) {
		return __( 'Back to top', 'sgs-blocks' );
	}
	const option = SITE_INFO_SOURCE_OPTIONS.find( ( o ) => o.value === mode );
	return option ? option.label : '';
}

/**
 * The text the link row shows: the source label and the href it resolves to.
 *
 * @param {string} source   Stored source value.
 * @param {string} typedUrl Typed URL.
 * @return {string} Row text, '' when there is nothing to show.
 */
export function linkSourceRowText( source, typedUrl ) {
	const mode = linkSourceMode( source );
	const href = resolveLinkSource( source, typedUrl ).url;
	if ( '' === mode || 'post' === mode ) {
		return href;
	}
	const label = linkSourceLabel( mode );
	return href ? `${ label }: ${ href }` : sprintf(
		/* translators: %s: link source, e.g. "Phone (Site Info)". */
		__( '%s: not set', 'sgs-blocks' ),
		label
	);
}

/**
 * The "Link to" select plus a status line saying what the chosen Site Info field holds.
 *
 * @param {Object}   props
 * @param {string}   props.value        Stored source value.
 * @param {string[]} props.sources      Offered sources ('post', Site Info names, 'top'); the
 *                                      typed URL is always offered.
 * @param {boolean}  props.pendingPost  "Page or post" chosen, no page picked yet.
 * @param {Function} props.onPendingPost Receives the next pendingPost boolean.
 * @param {Function} props.onChange     Receives the next stored source value.
 */
export default function LinkSourcePicker( { value, sources, pendingPost, onPendingPost, onChange } ) {
	const mode = linkSourceMode( value, pendingPost );
	const offered = Array.isArray( sources ) ? sources : [];
	const siteInfoOptions = SITE_INFO_SOURCE_OPTIONS.filter( ( o ) => offered.includes( o.value ) );

	// Up to 14 choices, so a searchable combobox (D812: more than 10 options). The typed URL is
	// listed as 'url' because the combobox treats an empty value as "nothing chosen".
	const options = [
		{ value: 'url', label: __( 'Typed URL', 'sgs-blocks' ) },
		...( offered.includes( 'post' ) ? [ { value: 'post', label: __( 'Page or post on this site', 'sgs-blocks' ) } ] : [] ),
		...siteInfoOptions,
		...( offered.includes( 'top' ) ? [ { value: 'top', label: __( 'Back to top', 'sgs-blocks' ) } ] : [] ),
	];

	const handleChange = ( picked ) => {
		const next = ! picked || 'url' === picked ? '' : picked;
		if ( 'post' === next ) {
			// Nothing is stored until a page is picked; an already-picked page stays.
			onPendingPost( true );
			return;
		}
		onPendingPost( false );
		onChange( next );
	};

	let status = '';
	if ( isSiteInfoMode( mode ) ) {
		const entry = editorSiteInfo()[ LINK_SOURCE_SITE_INFO_KEYS[ mode ] ];
		status = entry?.filled
			? sprintf(
				/* translators: %s: the Site Info value, e.g. a phone number. */
				__( 'Site Info holds: %s', 'sgs-blocks' ),
				entry.value || entry.link
			)
			: __( 'This Site Info field is empty, so the typed link below is used until it is filled in.', 'sgs-blocks' );
	}

	return (
		<div className="sgs-link-source">
			<ComboboxControl
				label={ __( 'Link to', 'sgs-blocks' ) }
				value={ mode || 'url' }
				options={ options }
				onChange={ handleChange }
				allowReset={ false }
				help={ '' === mode ? undefined : LINK_SOURCE_HELP[ mode ] }
				__nextHasNoMarginBottom
				__next40pxDefaultSize
			/>
			{ status && <p className="sgs-link-source__status">{ status }</p> }
		</div>
	);
}
