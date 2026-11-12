/**
 * ItemSlotFields: the media fields for one item of an item set (Spec 49 §8.3, §9.2).
 *
 * An item is `{source, alt, decorative, fit, focal, ...}`. The media fields read and write a slot's settings under
 * `{prefix}*` attribute names, so an item is shown to them as those names and their writes are folded back into the
 * item. Source, Alt and Decorative, and Fit, are always shown; Focal when the slot's settings include it.
 *
 * @package
 */
import MediaSlotField from './MediaSlotField.js';
import FitField from './FitField.js';
import FocalField from './FocalField.js';

const upperFirst = ( text ) => text.charAt( 0 ).toUpperCase() + text.slice( 1 );
const lowerFirst = ( text ) => text.charAt( 0 ).toLowerCase() + text.slice( 1 );

/**
 * An item as the slot attributes the media fields read.
 *
 * @param {string} prefix Slot prefix.
 * @param {Object} item   The item.
 * @return {Object} `{ [prefix + Source]: ..., ... }`.
 */
export function itemToSlotAttrs( prefix, item ) {
	const out = {};
	Object.keys( item || {} ).forEach( ( key ) => {
		out[ `${ prefix }${ upperFirst( key ) }` ] = item[ key ];
	} );
	return out;
}

/**
 * A media field's `setAttributes` patch folded into an item; a blank value removes the field.
 *
 * @param {string} prefix Slot prefix.
 * @param {Object} item   The item.
 * @param {Object} patch  `{ [prefix + Focal]: ... }`.
 * @return {Object} The item with the patch applied.
 */
export function applySlotPatch( prefix, item, patch ) {
	const next = { ...item };
	Object.keys( patch ).forEach( ( name ) => {
		if ( ! name.startsWith( prefix ) ) {
			return;
		}
		const key = lowerFirst( name.slice( prefix.length ) );
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
 * @param {Object}   props
 * @param {Object}   props.item     The item.
 * @param {string}   props.prefix   Slot prefix.
 * @param {Object}   props.slot     `{prefix, kinds, context}`.
 * @param {Function} props.onChange Called with the item after a field writes.
 * @param {boolean}  props.focal    Whether to offer the focal point.
 * @param {string}   props.label    Label of the media field.
 */
export default function ItemSlotFields( { item, prefix, slot, onChange, focal = false, label } ) {
	const slotAttrs = itemToSlotAttrs( prefix, item );
	const setSlot = ( patch ) => onChange( applySlotPatch( prefix, item, patch ) );
	return (
		<>
			<MediaSlotField attributes={ slotAttrs } setAttributes={ setSlot } prefix={ prefix } slot={ slot } label={ label } />
			<FitField attributes={ slotAttrs } setAttributes={ setSlot } prefix={ prefix } slot={ slot } />
			{ focal && <FocalField attributes={ slotAttrs } setAttributes={ setSlot } prefix={ prefix } /> }
		</>
	);
}
