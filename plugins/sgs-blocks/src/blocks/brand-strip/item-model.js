/**
 * The brand strip item's shape and its bridge to the media fields (Spec 49 §8.3).
 *
 * An item is `{source, alt, decorative, fit, focal, name, link*, _key}`. The media fields read and write a slot's
 * settings under `logo*` attribute names, so an item is shown to them as those names and their writes are folded back
 * into the item.
 *
 * @package SGS\Blocks
 */
import { generateItemKey } from '../../utils';
import { sourceFromAttachment } from '../../components/media/mediaSlotWrites.js';

/** The strip's one media slot. */
export const LOGO_SLOT = { prefix: 'logo', kinds: [ 'image' ], context: 'item' };

const upperFirst = ( text ) => text.charAt( 0 ).toUpperCase() + text.slice( 1 );
const lowerFirst = ( text ) => text.charAt( 0 ).toLowerCase() + text.slice( 1 );

/**
 * An item as the slot attributes the media fields read.
 *
 * @param {Object} item One `logos` entry.
 * @return {Object} `{ logoSource, logoAlt, ... }`.
 */
export function itemToSlotAttrs( item ) {
	const out = {};
	Object.keys( item || {} ).forEach( ( key ) => {
		out[ `logo${ upperFirst( key ) }` ] = item[ key ];
	} );
	return out;
}

/**
 * A media field's `setAttributes` patch folded into an item.
 *
 * @param {Object} item  The item.
 * @param {Object} patch `{ logoSource: ..., logoFit: ... }`.
 * @return {Object} The item with the patch applied; a blank value removes the field.
 */
export function applySlotPatch( item, patch ) {
	const next = { ...item };
	Object.keys( patch ).forEach( ( name ) => {
		const key = lowerFirst( name.replace( /^logo/, '' ) );
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
 * A Media Library attachment as a new strip item.
 *
 * @param {Object} media A WordPress media object from `MediaUpload`.
 * @return {Object|null} The item, with a stable key; null when the attachment has no address.
 */
export function resolveLogoItem( media ) {
	if ( ! media || ! media.url ) {
		return null;
	}
	const item = {
		_key: generateItemKey(),
		source: { desktop: sourceFromAttachment( { ...media, mime: media.mime || media.mime_type || '' }, 'image' ) },
		name: '',
		linkUrl: '',
		linkTarget: '_self',
		linkRel: '',
	};
	if ( media.alt ) {
		item.alt = media.alt;
	}
	return item;
}

/**
 * An empty strip item, for "Add logo".
 *
 * @return {Object} The item, with a stable key.
 */
export function emptyLogoItem() {
	return { _key: generateItemKey(), name: '', linkUrl: '', linkTarget: '_self', linkRel: '' };
}

/**
 * The address an item shows on desktop, for the item's heading.
 *
 * @param {Object} item One `logos` entry.
 * @return {string} The address, or ''.
 */
export function itemUrl( item ) {
	return item?.source?.desktop?.url || '';
}
