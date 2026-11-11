/**
 * The timeline entry's bridge to the media fields (Spec 49 §8.3).
 *
 * An entry is `{date, title, description, icon, source, alt, decorative, fit, focal}`. The media fields read and write
 * a slot's settings under `entry*` attribute names, so an entry is shown to them as those names and their writes are
 * folded back into the entry.
 *
 * @package SGS\Blocks
 */

/** The timeline's one media slot. */
export const ENTRY_SLOT = { prefix: 'entry', kinds: [ 'image', 'video' ], context: 'content' };

const upperFirst = ( text ) => text.charAt( 0 ).toUpperCase() + text.slice( 1 );
const lowerFirst = ( text ) => text.charAt( 0 ).toLowerCase() + text.slice( 1 );

/** The entry fields that belong to the media slot. */
const SLOT_KEYS = [ 'source', 'alt', 'decorative', 'fit', 'focal' ];

/**
 * An entry as the slot attributes the media fields read.
 *
 * @param {Object} entry One `entries` item.
 * @return {Object} `{ entrySource, entryAlt, ... }`.
 */
export function entryToSlotAttrs( entry ) {
	const out = {};
	SLOT_KEYS.forEach( ( key ) => {
		if ( undefined !== entry?.[ key ] ) {
			out[ `entry${ upperFirst( key ) }` ] = entry[ key ];
		}
	} );
	return out;
}

/**
 * A media field's `setAttributes` patch folded into an entry.
 *
 * @param {Object} entry The entry.
 * @param {Object} patch `{ entrySource: ..., entryFocal: ... }`.
 * @return {Object} The entry with the patch applied; a blank value removes the field.
 */
export function applySlotPatch( entry, patch ) {
	const next = { ...entry };
	Object.keys( patch ).forEach( ( name ) => {
		const key = lowerFirst( name.replace( /^entry/, '' ) );
		const value = patch[ name ];
		if ( undefined === value || '' === value || null === value ) {
			delete next[ key ];
		} else {
			next[ key ] = value;
		}
	} );
	return next;
}
