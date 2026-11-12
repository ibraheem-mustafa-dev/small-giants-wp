/**
 * The gallery item's shape and its bridge to the media fields (Spec 49 §8.3).
 *
 * An item is `{source, alt, decorative, fit, focal, caption, link*, _key}`. The media fields read and write a slot's
 * settings under `item*` attribute names, so an item is shown to them as those names and their writes are folded back
 * into the item.
 *
 * @package SGS\Blocks
 */
import { generateItemKey } from '../../utils';
import { hasFile, sourceFromAttachment } from '../../components/media/mediaSlotWrites.js';
import { resolveTierSource } from '../../components/media/deviceValues.js';

/** The gallery's one media slot. */
export const ITEM_SLOT = { prefix: 'item', kinds: [ 'image', 'video' ], context: 'item' };

const upperFirst = ( text ) => text.charAt( 0 ).toUpperCase() + text.slice( 1 );
const lowerFirst = ( text ) => text.charAt( 0 ).toLowerCase() + text.slice( 1 );

/**
 * An item as the slot attributes the media fields read.
 *
 * @param {Object} item One `mediaItems` entry.
 * @return {Object} `{ itemSource, itemAlt, ... }`.
 */
export function itemToSlotAttrs( item ) {
	const out = {};
	Object.keys( item || {} ).forEach( ( key ) => {
		out[ `item${ upperFirst( key ) }` ] = item[ key ];
	} );
	return out;
}

/**
 * A media field's `setAttributes` patch folded into an item.
 *
 * @param {Object} item  The item.
 * @param {Object} patch `{ itemSource: ..., itemFocal: ... }`.
 * @return {Object} The item with the patch applied; a blank value removes the field.
 */
export function applySlotPatch( item, patch ) {
	const next = { ...item };
	Object.keys( patch ).forEach( ( name ) => {
		const key = lowerFirst( name.replace( /^item/, '' ) );
		const value = patch[ name ];
		if ( undefined === value || '' === value || null === value ) {
			delete next[ key ];
		} else {
			next[ key ] = value;
		}
	} );
	return next;
}

/**
 * The file an item shows at a device, and whether its kind is video.
 *
 * @param {Object} item   One `mediaItems` entry.
 * @param {string} device 'desktop' | 'tablet' | 'mobile'.
 * @return {{kind: string, url: string, poster: string}} The file; empty `url` when the item has none.
 */
export function itemFile( item, device = 'desktop' ) {
	const found = resolveTierSource( item?.source, device, hasFile ).value;
	if ( ! found ) {
		return { kind: 'image', url: '', poster: '' };
	}
	return {
		kind: found.kind || ( /\.(mp4|webm|mov|ogv|m4v)(\?|#|$)/i.test( found.url || '' ) ? 'video' : 'image' ),
		url: found.url || '',
		poster: found.poster?.url || '',
	};
}

/**
 * A Media Library attachment as a new gallery item.
 *
 * @param {Object} media A WordPress media object from `MediaUpload`.
 * @return {Object} The item, with a stable key.
 */
export function resolveGalleryMedia( media ) {
	const mime = media?.mime || media?.mime_type || '';
	const kind = mime.startsWith( 'video/' ) ? 'video' : 'image';
	const item = {
		_key: generateItemKey(),
		source: { desktop: sourceFromAttachment( { ...media, mime }, kind ) },
	};
	if ( media?.alt ) {
		item.alt = media.alt;
	}
	if ( media?.caption ) {
		item.caption = media.caption;
	}
	return item;
}

/**
 * The attachment id an item points at on desktop (0 when it has none), for the library's "already picked" marks.
 *
 * @param {Object} item One `mediaItems` entry.
 * @return {number} The id.
 */
export function itemAttachmentId( item ) {
	return Number( item?.source?.desktop?.id ) || 0;
}
