/**
 * What `MediaSlotField` writes (Spec 49 §9.2, §8): pure builders, so every multi-write action is one object for one
 * `setAttributes` call and one undo step.
 *
 * @package
 */
import { __ } from '@wordpress/i18n';
import { isUnset, resolveTierSource, writeDevice } from './deviceValues.js';

/** Allowed library types per kind. */
export const LIBRARY_TYPES = {
	image: [ 'image' ],
	video: [ 'video' ],
	svg: [ 'image/svg+xml' ],
};

/** The kind choices, in the order of §9.5's empty state. */
export function kindOptions() {
	return [
		{ value: 'image', label: __( 'Photo', 'sgs-blocks' ) },
		{ value: 'video', label: __( 'Video file', 'sgs-blocks' ) },
		{ value: 'embed', label: __( 'YouTube or Vimeo link', 'sgs-blocks' ) },
		{ value: 'svg', label: __( 'SVG', 'sgs-blocks' ) },
	];
}

/** "photo", "video", "SVG" and "video link": what "Mobile: using Desktop's ..." names. */
export function kindNoun( kind ) {
	if ( 'video' === kind ) {
		return __( 'video', 'sgs-blocks' );
	}
	if ( 'embed' === kind ) {
		return __( 'video link', 'sgs-blocks' );
	}
	if ( 'svg' === kind ) {
		return __( 'SVG', 'sgs-blocks' );
	}
	return __( 'photo', 'sgs-blocks' );
}

/**
 * @param {*} source A stored `Source` value for one device.
 * @return {boolean} True when it holds something to show.
 */
export function hasFile( source ) {
	return !! source && 'object' === typeof source && !! ( source.url || source.markup || source.id );
}

/**
 * The iframe address for a YouTube or Vimeo link.
 *
 * @param {string} url The pasted address.
 * @return {string} The embeddable address, or '' when the link is not supported.
 */
export function embedSrc( url ) {
	const text = String( url || '' ).trim();
	const youtube = text.match( /^https?:\/\/(?:www\.|m\.)?(?:youtube\.com\/(?:watch\?(?:[^#]*&)?v=|embed\/|shorts\/)|youtu\.be\/)([\w-]{6,20})/i );
	if ( youtube ) {
		return `https://www.youtube-nocookie.com/embed/${ youtube[ 1 ] }`;
	}
	const vimeo = text.match( /^https?:\/\/(?:www\.|player\.)?vimeo\.com\/(?:video\/)?(\d{5,12})/i );
	return vimeo ? `https://player.vimeo.com/video/${ vimeo[ 1 ] }` : '';
}

/** A device's source built from a library attachment. */
export function sourceFromAttachment( media, kind ) {
	const source = { kind, id: media?.id || 0, url: media?.url || '' };
	if ( media?.width ) {
		source.width = media.width;
	}
	if ( media?.height ) {
		source.height = media.height;
	}
	if ( media?.mime ) {
		source.mime = media.mime;
	}
	return source;
}

/**
 * The patch for choosing or replacing the file at one device.
 *
 * - Replace (the device already had its own file): Focal at this device resets to centre unless `keepFocal`; when
 *   Alt is not empty, `staleAlt` is true so the panel can ask for an update.
 * - Empty Alt on first pick copies the library alt: into `Alt` on Desktop, into the device's own `Source.alt` off
 *   Desktop (where the file differs from the wider device's).
 *
 * @param {Object}  args
 * @param {Object}  args.read      `slotAccess().read`.
 * @param {string}  args.device    The active device.
 * @param {Object}  args.media     The library attachment.
 * @param {string}  args.kind      The kind being picked.
 * @param {boolean} args.keepFocal "Keep focal point" ticked.
 * @return {{patch: Object, staleAlt: boolean}} `patch` is `{ Base: value }` for `slotAccess().write`.
 */
export function pickPatch( { read, device, media, kind, keepFocal } ) {
	const stored = read( 'Source' );
	const own = resolveTierSource( stored, device, hasFile );
	const replacing = own.own;
	const source = sourceFromAttachment( media, kind );
	const libraryAlt = String( media?.alt || '' );
	const currentAlt = String( ( 'desktop' === device ? read( 'Alt' ) : replacing && own.value?.alt ) || '' );
	const patch = {};
	let staleAlt = false;

	if ( replacing && ! keepFocal ) {
		patch.Focal = writeDevice( read( 'Focal' ), device, '' );
	}
	if ( replacing && currentAlt.trim() ) {
		staleAlt = true;
		if ( 'desktop' !== device && own.value?.alt ) {
			source.alt = own.value.alt;
		}
	} else if ( libraryAlt.trim() && ! currentAlt.trim() ) {
		if ( 'desktop' === device ) {
			patch.Alt = libraryAlt;
		} else {
			source.alt = libraryAlt;
		}
	}
	patch.Source = writeDevice( stored, device, source );
	return { patch, staleAlt };
}

/** The patch for choosing the cover image of the video at one device. */
export function posterPatch( { read, device, media } ) {
	const stored = read( 'Source' );
	const own = resolveTierSource( stored, device, hasFile );
	const base = own.own ? own.value : { kind: 'video' };
	const poster = { id: media?.id || 0, url: media?.url || '' };
	if ( media?.width ) {
		poster.width = media.width;
	}
	if ( media?.height ) {
		poster.height = media.height;
	}
	return { Source: writeDevice( stored, device, { ...base, poster } ) };
}

/** The patch that removes the file at one device (the device then inherits, or is empty on Desktop). */
export function removePatch( { read, device } ) {
	return { Source: writeDevice( read( 'Source' ), device, '' ) };
}

/**
 * Whether an own, kind-only source (the kind chosen, no file yet) should still count as unset.
 *
 * @param {*} value A stored device source.
 * @return {boolean} True when nothing is chosen.
 */
export function isEmptySource( value ) {
	return isUnset( value ) || ! hasFile( value );
}
