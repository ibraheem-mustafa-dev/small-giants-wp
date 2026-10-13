/**
 * LinkPopoverContent — the `<Popover>` primitive of the SGS standard LINK control, and the
 * `Open in` target options. `LinkPopoverControl.js` (the Field wrapper, and the import path
 * every block uses) re-exports both; see its header for why the link control is a popover.
 *
 * @package SGS\Blocks
 */
import { __ } from '@wordpress/i18n';
import { useState } from '@wordpress/element';
import { LinkControl } from '@wordpress/block-editor';
import { Popover, SelectControl, TextControl, ToggleControl } from '@wordpress/components';
import { VStack } from './primitives';
import LinkSourcePicker, { linkSourceMode, isSiteInfoMode } from './LinkSourcePicker';
import { linkSourcePostId, resolveLinkSource } from '../utils/link-source';

export const TARGET_ENUM_OPTIONS = [
	{ label: __( 'Same tab (_self)', 'sgs-blocks' ), value: '_self' },
	{ label: __( 'New tab (_blank)', 'sgs-blocks' ), value: '_blank' },
	{ label: __( 'Parent frame (_parent)', 'sgs-blocks' ), value: '_parent' },
	{ label: __( 'Full window (_top)', 'sgs-blocks' ), value: '_top' },
];

/**
 * The popover primitive. Mount ONE instance; swap `anchor` between however
 * many triggers should open it (see `sgs/button/edit.js`).
 *
 * @param {Object}    props
 * @param {Element}   props.anchor               DOM node the popover is pinned to.
 * @param {Function}  props.onClose              Fires on Escape / outside click.
 * @param {string}    props.url                  Stored url string.
 * @param {string}    [props.linkId]             Internal post/term ID (string); '' = none.
 *                                                Only meaningful when `enableInternalResolution`.
 * @param {string}    [props.linkKind]           LinkControl `kind`; '' = none.
 * @param {string}    [props.linkTarget]         HTML target — enum string ('_self'…) or
 *                                                'boolean' mode's `''`/`'_blank'`.
 * @param {string}    [props.rel]                Rel attribute string.
 * @param {boolean}   [props.download]           Download-link toggle value.
 * @param {Function}  props.onChangeLink         Receives { url, linkId, linkKind } (linkId/
 *                                                linkKind omitted when `enableInternalResolution`
 *                                                is false — caller's onChange only needs `url`).
 * @param {Function}  [props.onChangeTarget]     Receives the next linkTarget value. Omit the
 *                                                whole target row by omitting this prop.
 * @param {Function}  [props.onChangeRel]        Receives the next rel string. Omit to hide.
 * @param {Function}  [props.onChangeDownload]   Receives the next download boolean. Omit to hide.
 * @param {'enum'|'boolean'} [props.targetMode]  'enum' = 4-value SelectControl (_self/_blank/
 *                                                _parent/_top, `sgs/button`'s shape). 'boolean' =
 *                                                a single "Open in new tab" ToggleControl mapped
 *                                                to `''`/`'_blank'` (icon/media's existing shape).
 * @param {boolean}   [props.enableInternalResolution] When true, `onChangeLink` receives
 *                                                { url, linkId, linkKind } from LinkControl's
 *                                                internal-search result. When false (default),
 *                                                only { url } is passed — a plain pasted/typed
 *                                                URL string, matching the pre-migration contract
 *                                                for consumers whose render.php has no ID
 *                                                resolution.
 * @param {Function}  [props.renderExtraFields]  ( { url } ) => JSX, rendered after the standard
 *                                                fields, only when a url is set. For a consumer's
 *                                                own bespoke field (e.g. the block-link extension's
 *                                                accessible-label field).
 * @param {Object}    [props.suggestionsQuery]   Passed straight to LinkControl's own
 *                                                suggestionsQuery prop (e.g. { type: 'post',
 *                                                subtype: 'page' }) to scope suggestions to
 *                                                one PUBLIC post type/subtype. Core search
 *                                                rejects non-public post types (HTTP 400); use
 *                                                SavedPostPicker for those. Omit for the
 *                                                default unscoped search.
 * @param {string}    [props.linkSource]         Stored link source ('' = typed URL); see the
 *                                                file header's LINK SOURCE note.
 * @param {string[]}  [props.linkSources]        Sources offered besides the typed URL
 *                                                (`LINK_SOURCES_*`, shared/link-source-options.js).
 * @param {Function}  [props.onChangeLinkSource] Receives the next source string when the
 *                                                "Link to" choice changes. Omit to keep the plain
 *                                                URL popover. A URL edit that also changes the
 *                                                source (a page picked, a URL pasted) reports
 *                                                both through ONE onChangeLink call as
 *                                                `{ url, linkSource }`.
 */
export function LinkPopoverContent( {
	anchor,
	onClose,
	url,
	linkId,
	linkKind,
	linkTarget,
	rel,
	download,
	onChangeLink,
	onChangeTarget,
	onChangeRel,
	onChangeDownload,
	targetMode = 'enum',
	enableInternalResolution = false,
	renderExtraFields,
	suggestionsQuery,
	linkSource = '',
	linkSources,
	onChangeLinkSource,
} ) {
	const [ pendingPost, setPendingPost ] = useState( false );
	const sourceOn = 'function' === typeof onChangeLinkSource;
	const mode = sourceOn ? linkSourceMode( linkSource, pendingPost ) : '';
	const sourcePostId = sourceOn ? linkSourcePostId( linkSource ) : 0;
	const fallbackOnly = isSiteInfoMode( mode );

	let linkValue = {
		url: url || '',
		id: enableInternalResolution && linkId ? linkId : undefined,
		kind: enableInternalResolution && linkKind ? linkKind : undefined,
	};
	if ( sourcePostId > 0 ) {
		linkValue = { ...linkValue, id: sourcePostId, kind: 'post-type' };
	}
	const hasLink = !! linkValue.url || ( sourceOn && '' !== resolveLinkSource( linkSource, linkValue.url ).url );

	// A search pick of a page or post stores its ID; a pasted URL or a removed link stores
	// the typed source. While a Site Info source is chosen the URL is only its fallback, so
	// the source stays. The source rides in the SAME onChangeLink payload as the URL, so a
	// caller that patches a copied array item never loses one of the two.
	const withSource = ( payload, next ) => {
		if ( ! sourceOn || fallbackOnly ) {
			return payload;
		}
		setPendingPost( false );
		const nextSource = next?.id && 'post-type' === next?.kind ? `post:${ next.id }` : '';
		return nextSource === linkSource ? payload : { ...payload, linkSource: nextSource };
	};

	const handleLinkChange = ( next ) => {
		onChangeLink( withSource(
			enableInternalResolution
				? { url: next.url || '', linkId: next.id ? String( next.id ) : '', linkKind: next.kind || '' }
				: { url: next.url || '' },
			next
		) );
	};

	const handleRemove = () => {
		onChangeLink( withSource(
			enableInternalResolution ? { url: '', linkId: '', linkKind: '' } : { url: '' },
			null
		) );
	};

	return (
		<Popover
			anchor={ anchor }
			onClose={ onClose }
			placement="bottom-start"
			offset={ 8 }
			shift
			className="sgs-link-popover"
		>
			{ /* `VStack spacing={4}` = the WP grid-unit-20 (16px) rhythm — matches
			   core's own popover spacing. Every control below carries
			   `__nextHasNoMarginBottom` so VStack is the ONLY source of the
			   gap (mixing the two would double it up). */ }
			<VStack className="sgs-link-popover__inner" spacing={ 4 }>
				{ sourceOn && (
					<LinkSourcePicker
						value={ linkSource }
						sources={ linkSources }
						pendingPost={ pendingPost }
						onPendingPost={ setPendingPost }
						onChange={ onChangeLinkSource }
					/>
				) }
				{ fallbackOnly && (
					<p className="sgs-link-source__fallback-label">
						{ __( 'Fallback link (used while that Site Info field is empty)', 'sgs-blocks' ) }
					</p>
				) }
				{ 'top' !== mode && (
					<LinkControl
						searchInputPlaceholder={
							'post' === mode
								? __( 'Search for a page or post', 'sgs-blocks' )
								: __( 'Search or paste a URL', 'sgs-blocks' )
						}
						value={ linkValue }
						settings={ [] }
						onChange={ handleLinkChange }
						onRemove={ handleRemove }
						forceIsEditingLink={ ! linkValue.url }
						suggestionsQuery={ suggestionsQuery }
					/>
				) }
				{ hasLink && (
					<VStack spacing={ 4 }>
						{ onChangeTarget && 'enum' === targetMode && (
							<SelectControl
								label={ __( 'Open in', 'sgs-blocks' ) }
								value={ linkTarget }
								options={ TARGET_ENUM_OPTIONS }
								onChange={ onChangeTarget }
								__nextHasNoMarginBottom
								__next40pxDefaultSize
							/>
						) }
						{ onChangeTarget && 'boolean' === targetMode && (
							<ToggleControl
								label={ __( 'Open in new tab', 'sgs-blocks' ) }
								checked={ '_blank' === linkTarget }
								onChange={ ( checked ) => onChangeTarget( checked ? '_blank' : '_self' ) }
								__nextHasNoMarginBottom
							/>
						) }
						{ onChangeRel && (
							<TextControl
								label={ __( 'Rel attribute', 'sgs-blocks' ) }
								value={ rel }
								onChange={ onChangeRel }
								help={ __( 'e.g. noopener noreferrer nofollow', 'sgs-blocks' ) }
								__nextHasNoMarginBottom
								__next40pxDefaultSize
							/>
						) }
						{ onChangeDownload && (
							<ToggleControl
								label={ __( 'Download link', 'sgs-blocks' ) }
								checked={ !! download }
								onChange={ onChangeDownload }
								__nextHasNoMarginBottom
							/>
						) }
						{ renderExtraFields && renderExtraFields( { url: linkValue.url } ) }
					</VStack>
				) }
			</VStack>
		</Popover>
	);
}
