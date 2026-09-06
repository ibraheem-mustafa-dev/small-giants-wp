/**
 * Atom: SOURCE (control half) — the editor UI.
 *
 * JSX + `@wordpress/components` live ONLY here, per the atom contract
 * (`scripts/check-media-atom-purity.js`). The pure logic — `resolveMediaType()`,
 * `disclosure()`, `validate()`, `css()` — lives in `source.js` and is imported
 * from there rather than duplicated.
 *
 * PICKERS ARE HARD-RESTRICTED to the current media type. `MediaPicker`
 * defaults to `['image','video']` unrestricted; every mount here passes an
 * explicit single-entry `allowedTypes` AND re-checks the resolved
 * `media.type` before writing, so a video cannot land in the image slot (or
 * the reverse) even if a future MediaPicker change loosens its own default.
 *
 * Per-tier art direction uses ONE `<ResponsiveControl>`-wrapped picker per
 * media type — never three always-visible slots (a recorded banned
 * lookalike). The global device toggle
 * (`src/blocks/extensions/responsive-device-toggle.js`) selects the tier;
 * `ResponsiveControl` only reads it and hands it to the picker below.
 *
 * @package SGS\Blocks
 */
import { TextareaControl, TextControl } from '@wordpress/components';
import { __ } from '@wordpress/i18n';

import { mediaStoredAttrName } from '../../MediaElementControls.js';
import MediaPicker from '../../MediaPicker.js';
import ResponsiveControl from '../../ResponsiveControl.js';
import { resolveMediaType } from './source.js';

/** Tier key -> attribute-name suffix. Desktop carries no suffix. */
const TIER_SUFFIX = { desktop: '', tablet: 'Tablet', mobile: 'Mobile' };

/**
 * One responsive ID+URL picker row, hard-restricted to `allowedType`.
 *
 * @param {Object} props
 * @param {string} props.rowKey React key.
 * @param {string} props.label  Row label.
 * @param {Object} props.attrs  Current attribute values.
 * @param {Function} props.setAttributes
 * @param {Function} props.name Resolves a base name to the surface's stored attribute name.
 * @param {string} props.idBase  PascalCase base for the attachment-ID half (e.g. 'ImageId').
 * @param {string} props.urlBase PascalCase base for the URL half (e.g. 'ImageUrl').
 * @param {'image'|'video'} props.allowedType The single media-library type this slot accepts.
 * @return {JSX.Element} A bare row — no InspectorControls/PanelBody wrapper.
 */
function pairPickerRow( { rowKey, label, attrs, setAttributes, name, idBase, urlBase, allowedType } ) {
	return (
		<ResponsiveControl key={ rowKey } label={ label }>
			{ ( tier ) => {
				const suffix = TIER_SUFFIX[ tier ] ?? '';
				const idKey = name( idBase + suffix );
				const urlKey = name( urlBase + suffix );
				const url = attrs[ urlKey ] || '';
				const id = attrs[ idKey ] || 0;
				const value = url ? { id, url, type: allowedType } : null;

				return (
					<MediaPicker
						value={ value }
						allowedTypes={ [ allowedType ] }
						label={
							'video' === allowedType
								? __( 'Select video', 'sgs-blocks' )
								: __( 'Select image', 'sgs-blocks' )
						}
						onChange={ ( media ) => {
							// HARD RESTRICTION: reject anything the picker resolves to a
							// type other than the one this slot owns, even though
							// `allowedTypes` already narrows the library dialog — belt
							// and braces against a picker change loosening its default.
							if ( ! media || allowedType !== media.type ) {
								return;
							}
							const next = {
								[ idKey ]: media.id || 0,
								[ urlKey ]: media.url,
							};
							// Auto-fill alt from the picked attachment's own alt text
							// (media-element-architecture-v2 §18.3) — the `meaning` atom's
							// TextControl stays a low-emphasis override, never a required
							// field. Only when the attachment actually has alt text, and
							// only when the CURRENT alt is empty, so a client's own typed
							// wording is never silently overwritten by re-picking a
							// different file. Poster-image row is excluded (idBase check)
							// — a poster is a fallback frame, not screen-reader-facing.
							if ( media.alt && 'ThumbnailId' !== idBase ) {
								const altKey =
									'video' === allowedType
										? name( 'VideoAlt' + suffix )
										: name( 'ImageAlt' + suffix );
								if ( ! attrs[ altKey ] ) {
									next[ altKey ] = media.alt;
								}
							}
							setAttributes( next );
						} }
						onRemove={ () =>
							setAttributes( { [ idKey ]: 0, [ urlKey ]: '' } )
						}
					/>
				);
			} }
		</ResponsiveControl>
	);
}

/**
 * One responsive external-video-URL row (TextControl), for a surface whose
 * `media-type` atom's `VideoSource` base is set to `'external'`. Writes the
 * URL half only and clears the ID half, matching what a picked-media
 * `onChange` writes for the internal-library branch — the two writers are
 * mutually exclusive per tier, never both populated at once.
 *
 * Matches the pre-atom-layer `sgs/media` "Video URL" TextControl's label and
 * help text verbatim, so adopting this atom changes nothing about the field
 * a client already knows (`git show 0e897e004^:plugins/sgs-blocks/src/blocks/media/edit.js`).
 * The old block's separate desktop-tier explanatory paragraph ("someone who
 * resizes across a breakpoint mid-watch will have the player restart") is
 * NOT reproduced here — this atom's `<ResponsiveControl>` already shows one
 * plain URL field per tier with no desktop-only prose branch.
 */
function videoUrlRow( { rowKey, label, help, attrs, setAttributes, name, idBase, urlBase } ) {
	return (
		<ResponsiveControl key={ rowKey } label={ label }>
			{ ( tier ) => {
				const suffix = TIER_SUFFIX[ tier ] ?? '';
				const idKey = name( idBase + suffix );
				const urlKey = name( urlBase + suffix );
				return (
					<TextControl
						label={ label }
						help={ help }
						value={ attrs[ urlKey ] || '' }
						onChange={ ( value ) =>
							setAttributes( { [ urlKey ]: value, [ idKey ]: 0 } )
						}
						__next40pxDefaultSize
						__nextHasNoMarginBottom
					/>
				);
			} }
		</ResponsiveControl>
	);
}

/** One responsive SVG-markup row, matching `sgs/media`'s existing pattern. */
function svgRow( { attrs, setAttributes, name } ) {
	return (
		<ResponsiveControl key="source-svg" label={ __( 'SVG markup', 'sgs-blocks' ) }>
			{ ( tier ) => {
				const suffix = TIER_SUFFIX[ tier ] ?? '';
				const key = name( 'SvgContent' + suffix );
				return (
					<TextareaControl
						label={ __( 'SVG markup', 'sgs-blocks' ) }
						help={ __(
							'Paste inline SVG markup. Sanitised on render.',
							'sgs-blocks'
						) }
						value={ attrs[ key ] || '' }
						onChange={ ( value ) => setAttributes( { [ key ]: value } ) }
						rows={ 6 }
						__nextHasNoMarginBottom
					/>
				);
			} }
		</ResponsiveControl>
	);
}

/**
 * Bare control rows for the current media type. Never its own
 * `<InspectorControls>` — the caller mounts these inside its own panel.
 *
 * @param {Object}   ctx
 * @param {Object}   ctx.attributes
 * @param {Function} ctx.setAttributes
 * @param {string}   ctx.prefix
 * @param {string}   ctx.blockSlug
 * @return {JSX.Element[]} Rows for the currently resolved media type.
 */
export function control( { attributes, setAttributes, prefix, blockSlug } ) {
	const attrs = attributes || {};
	const name = ( base ) => mediaStoredAttrName( blockSlug, prefix, base );
	const type = resolveMediaType( attrs, prefix, blockSlug );

	if ( 'svg' === type ) {
		return [ svgRow( { attrs, setAttributes, name } ) ];
	}

	if ( 'video' === type ) {
		// `VideoSource` is owned by the `media-type` atom's base set
		// (`MEDIA_BASES.type`), not this atom's own — it is READ here only,
		// to branch which video-source control this atom renders, exactly as
		// `media-type.control.js` reads this same key to decide whether to
		// show its own toggle at all. A surface that never declared the
		// attribute (`hasOwnProperty` false) has no external/internal
		// concept — treat it as the pre-atom-layer default of an always-on
		// WordPress-library picker, matching what this file did before this
		// fix (no external-URL field reachable anywhere).
		const videoSourceKey = mediaStoredAttrName( blockSlug, prefix, 'VideoSource' );
		const hasVideoSource = Object.prototype.hasOwnProperty.call( attrs, videoSourceKey );
		const videoSource = hasVideoSource ? attrs[ videoSourceKey ] || 'external' : 'internal';

		return [
			'external' === videoSource
				? videoUrlRow( {
						rowKey: 'source-video',
						label: __( 'Video URL', 'sgs-blocks' ),
						help: __(
							'YouTube, Vimeo, or direct MP4/WebM URL. Watch URLs are converted to embed URLs automatically.',
							'sgs-blocks'
						),
						attrs,
						setAttributes,
						name,
						idBase: 'VideoId',
						urlBase: 'VideoUrl',
				  } )
				: pairPickerRow( {
						rowKey: 'source-video',
						label: __( 'Video', 'sgs-blocks' ),
						attrs,
						setAttributes,
						name,
						idBase: 'VideoId',
						urlBase: 'VideoUrl',
						allowedType: 'video',
				  } ),
			pairPickerRow( {
				rowKey: 'source-thumbnail',
				label: __( 'Poster image', 'sgs-blocks' ),
				attrs,
				setAttributes,
				name,
				idBase: 'ThumbnailId',
				urlBase: 'Thumbnail',
				allowedType: 'image',
			} ),
		];
	}

	return [
		pairPickerRow( {
			rowKey: 'source-image',
			label: __( 'Image', 'sgs-blocks' ),
			attrs,
			setAttributes,
			name,
			idBase: 'ImageId',
			urlBase: 'ImageUrl',
			allowedType: 'image',
		} ),
	];
}
