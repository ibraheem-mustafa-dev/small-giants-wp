/**
 * The card grid card's shape and its bridge to the media fields (Spec 49 §8.3).
 *
 * A card is `{source, alt, decorative, fit, focal, title, subtitle, ...}`. The media fields read and write a slot's
 * settings under `image*` attribute names, so the card's media fields are shown to them as those names and their
 * writes are folded back into the card.
 *
 * @package SGS\Blocks
 */
import { hasFile } from '../../components/media/mediaSlotWrites.js';
import { resolveTierSource } from '../../components/media/deviceValues.js';

/** The card grid's one media slot. */
export const IMAGE_SLOT = { prefix: 'image', kinds: [ 'image' ], context: 'item' };

/** The card fields the media fields own. */
const MEDIA_KEYS = [ 'source', 'alt', 'decorative', 'fit', 'focal' ];

const upperFirst = ( text ) => text.charAt( 0 ).toUpperCase() + text.slice( 1 );
const lowerFirst = ( text ) => text.charAt( 0 ).toLowerCase() + text.slice( 1 );

/**
 * A card's media fields as the slot attributes the media fields read.
 *
 * @param {Object} item One `items` entry.
 * @return {Object} `{ imageSource, imageAlt, ... }`.
 */
export function itemToSlotAttrs( item ) {
	const out = {};
	MEDIA_KEYS.forEach( ( key ) => {
		if ( undefined !== item?.[ key ] ) {
			out[ `image${ upperFirst( key ) }` ] = item[ key ];
		}
	} );
	return out;
}

/**
 * A media field's `setAttributes` patch folded into a card.
 *
 * @param {Object} item  The card.
 * @param {Object} patch `{ imageSource: ..., imageFocal: ... }`.
 * @return {Object} The card with the patch applied; a blank value removes the field.
 */
export function applySlotPatch( item, patch ) {
	const next = { ...item };
	Object.keys( patch ).forEach( ( name ) => {
		const key = lowerFirst( name.replace( /^image/, '' ) );
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
 * The file a card shows at a device.
 *
 * @param {Object} item   One `items` entry.
 * @param {string} device 'desktop' | 'tablet' | 'mobile'.
 * @return {{url: string}} The file; empty `url` when the card has none.
 */
export function itemFile( item, device = 'desktop' ) {
	const found = resolveTierSource( item?.source, device, hasFile ).value;
	return { url: found?.url || '' };
}
