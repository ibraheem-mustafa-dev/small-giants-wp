/**
 * The canvas picture for one adopted image slot (Spec 49 §9.7): the media element of the device being edited, with the
 * CSS `mediaPreview()` builds (the editor's twin of what `SGS_Media_Element::render()` prints), or a media placeholder
 * when the slot has no file.
 *
 * The picture carries the scope class `uid` itself (the slot's layout box is the picture, or the helper around it), so
 * the caller's own wrapper must not: a class on a wrapper would pick up the slot's width rule.
 *
 * @package
 */
import { MediaPlaceholder, MediaUploadCheck } from '@wordpress/block-editor';

import { slotAccess } from './fieldBase.js';
import { resolveTierSource, useActiveDevice } from './deviceValues.js';
import { hasFile, pickPatch } from './mediaSlotWrites.js';
import mediaPreview from './mediaPreview.js';

/**
 * @param {Object}   props
 * @param {Object}   props.attributes     Block attributes.
 * @param {Function} props.setAttributes  Block `setAttributes`.
 * @param {string}   props.prefix         The slot's prefix.
 * @param {string[]} [props.kinds]        The slot's kinds; default image.
 * @param {string}   [props.context]      The slot's context; default content.
 * @param {string}   props.uid            The scope class the picture carries; unique to this slot.
 * @param {string}   [props.fallbackAlt]  Alt text when the slot has none of its own.
 * @param {string}   [props.title]        Placeholder title.
 * @param {string}   [props.instructions] Placeholder instructions.
 * @param {string}   [props.className]    Extra class for the picture.
 * @param {boolean}  [props.placeholder]  Show the placeholder when empty; default true.
 * @return {JSX.Element|null} The style and picture, or the placeholder.
 */
export default function SlotPicture( {
	attributes,
	setAttributes,
	prefix,
	kinds = [ 'image' ],
	context = 'content',
	uid,
	fallbackAlt = '',
	title,
	instructions,
	className = '',
	placeholder = true,
} ) {
	const device = useActiveDevice();
	const access = slotAccess( attributes, setAttributes, prefix );
	const shown = resolveTierSource( attributes[ `${ prefix }Source` ], device, hasFile ).value;
	const hasMedia = !! ( shown && ( shown.url || shown.markup ) );

	if ( ! hasMedia ) {
		if ( ! placeholder ) {
			return null;
		}
		const pick = ( attachment ) => {
			access.write( pickPatch( { read: access.read, device, media: attachment, kind: 'image', keepFocal: false } ).patch );
		};
		return (
			<MediaUploadCheck>
				<MediaPlaceholder
					allowedTypes={ [ 'image' ] }
					onSelect={ pick }
					labels={ { title, instructions } }
				/>
			</MediaUploadCheck>
		);
	}

	const { css, needsHelper } = mediaPreview( { prefix, kinds, context }, attributes, uid );
	const decorative = !! attributes[ `${ prefix }Decorative` ];
	const alt = decorative ? '' : shown.alt || attributes[ `${ prefix }Alt` ] || fallbackAlt;
	const src = shown.url || 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent( shown.markup );
	const image = (
		<img
			className={ `sgs-media-el ${ needsHelper ? '' : uid } ${ className }`.replace( /\s+/g, ' ' ).trim() }
			src={ src }
			width={ shown.width || undefined }
			height={ shown.height || undefined }
			alt={ alt }
		/>
	);
	const picture = needsHelper ? (
		<span className={ `sgs-media-box ${ uid }` }>
			<span className="sgs-media-box__mask">{ image }</span>
		</span>
	) : (
		image
	);
	return (
		<>
			{ css && <style>{ css }</style> }
			{ picture }
		</>
	);
}
