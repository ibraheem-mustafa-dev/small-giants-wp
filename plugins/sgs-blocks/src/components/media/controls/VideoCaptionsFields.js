/**
 * VideoCaptionsFields — the caption-track workflow for the `video-behaviour`
 * atom (WCAG 1.2.2 Level A).
 *
 * ⚑ DELIBERATE SHAPE DEVIATION. Every other shared control in this directory
 * takes `{ value, onChange, prefix, disabled, hiddenReason }` — one stored
 * value, one setter. Captions are FOUR attributes that only make sense
 * together (an id/url pair identifying the track, plus a label and a
 * language code that are meaningless without it), so this component takes
 * `{ attributes, setAttributes, blockSlug, prefix }` directly, the same way
 * `sgs/media`'s existing hand-rolled "Video Source" block treats a workflow
 * as one unit rather than four independent ToolsPanel rows (see that file's
 * own comment on why — the picker gates which control shows next).
 *
 * Modelled byte-for-byte on the existing captions UI in
 * `src/blocks/media/edit.js` (the only surface with captions today, because
 * it is the only one exposing a client control to unmute) so adopting the
 * atom does not change what a client already sees there.
 *
 * ⛔ WRITTEN WITH `createElement()`, NOT JSX — see MediaTypeControl.js's
 * docblock for why (this module is imported raw by
 * `scripts/tests/test-media-atom-parity.mjs` under plain Node).
 *
 * @package SGS\Blocks
 */
import { createElement, Fragment } from '@wordpress/element';
import { MediaUpload, MediaUploadCheck } from '@wordpress/block-editor';
import { Button, TextControl } from '@wordpress/components';
import { __ } from '@wordpress/i18n';
import { mediaStoredAttrName } from '../../MediaElementControls.js';

/**
 * @param {Object}   props
 * @param {Object}   props.attributes    Block attributes.
 * @param {Function} props.setAttributes Block setAttributes.
 * @param {string}   [props.prefix]      Surface prefix.
 * @param {string}   props.blockSlug     e.g. 'sgs/media'.
 * @param {boolean}  [props.videoPresent] Gate: only meaningful once a video
 *                                        exists. Caller passes this rather
 *                                        than the component re-deriving it,
 *                                        since "what counts as a video" is
 *                                        source-atom territory, not ours.
 */
export default function VideoCaptionsFields( {
	attributes,
	setAttributes,
	prefix = '',
	blockSlug,
	videoPresent = true,
} ) {
	if ( ! videoPresent ) {
		return null;
	}

	const idKey = mediaStoredAttrName( blockSlug, prefix, 'VideoCaptionsId' );
	const urlKey = mediaStoredAttrName( blockSlug, prefix, 'VideoCaptionsUrl' );
	const labelKey = mediaStoredAttrName( blockSlug, prefix, 'VideoCaptionsLabel' );
	const langKey = mediaStoredAttrName( blockSlug, prefix, 'VideoCaptionsSrcLang' );

	const captionsUrl = attributes[ urlKey ] || '';

	const uploadButton = createElement( MediaUploadCheck, {},
		createElement( MediaUpload, {
			onSelect: ( media ) =>
				setAttributes( {
					[ idKey ]: media.id || null,
					[ urlKey ]: media.url || '',
				} ),
			allowedTypes: [ 'text/vtt' ],
			value: attributes[ idKey ],
			render: ( { open } ) =>
				createElement(
					Button,
					{ variant: 'secondary', onClick: open, __next40pxDefaultSize: true },
					captionsUrl
						? __( 'Replace captions (.vtt)', 'sgs-blocks' )
						: __( 'Add captions (.vtt)', 'sgs-blocks' )
				),
		} )
	);

	if ( ! captionsUrl ) {
		return uploadButton;
	}

	const labelField = createElement( TextControl, {
		label: __( 'Captions label', 'sgs-blocks' ),
		help: __( 'Shown in the player’s subtitle menu, e.g. “English”.', 'sgs-blocks' ),
		value: attributes[ labelKey ] || '',
		onChange: ( value ) => setAttributes( { [ labelKey ]: value } ),
		__next40pxDefaultSize: true,
		__nextHasNoMarginBottom: true,
	} );

	const langField = createElement( TextControl, {
		label: __( 'Captions language code', 'sgs-blocks' ),
		help: __( 'A two- or three-letter code such as en, cy or fr.', 'sgs-blocks' ),
		value: attributes[ langKey ] || '',
		onChange: ( value ) => setAttributes( { [ langKey ]: value } ),
		__next40pxDefaultSize: true,
		__nextHasNoMarginBottom: true,
	} );

	const removeButton = createElement(
		Button,
		{
			variant: 'link',
			isDestructive: true,
			onClick: () => setAttributes( { [ idKey ]: null, [ urlKey ]: '' } ),
		},
		__( 'Remove captions', 'sgs-blocks' )
	);

	return createElement(
		Fragment,
		{},
		uploadButton,
		labelField,
		langField,
		removeButton
	);
}
