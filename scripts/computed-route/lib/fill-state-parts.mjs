// A state look on another instance of a repeated part (Spec 48 FR-48-81, register row C3): calibration measures a state setting
// on one instance of a block's repeated part (the navigation's hover fill on its first item, the one with a submenu) and the
// resting setting of the same part on others (the item fill on the plain items). The framework DB ties the two to one part
// (`block_attributes.canonical_slot`: itemBg and itemBgHover are both the item `card`). A state look the draft shows on an
// instance the state setting was not measured on is therefore the state setting's, wherever the resting setting of that part
// paints the instance: `partStateSlots` returns the slots the state setting was measured at, for the resolver to try.
import { canonicalSlotOf } from './resolve.mjs';
import { longhands } from './calibrate-props.mjs';

// The part keys the DB ties a setting to: its `canonical_slot` and its `css_element`. The two name one part: a state setting
// the slot assigner left without a `canonical_slot` (itemBgCurrent, itemColourCurrent) still sits on the `item` element its resting
// and hover siblings are declared on, so either key shared with a resting setting ties it to that part.
const partKeys = ( db, block, attr ) => {
	const row = db ? db.prepare( 'SELECT css_element, canonical_slot FROM block_attributes WHERE block_slug = ? AND attr_name = ?' ).get( block, attr ) : null;
	return [ canonicalSlotOf( db, block, attr ) && `slot:${ canonicalSlotOf( db, block, attr ) }`, row?.css_element && `element:${ row.css_element }` ].filter( Boolean );
};

// A paint layer of an element (its ::before or ::after) is the element's own box: the path without the layer.
const bare = ( path ) => String( path ?? '' ).replace( /::(?:before|after)$/, '' );
const slotsOf = ( s ) => s.slots || [ s.slot ];

// db: the framework DB; cal: the block's calibration; block: the block name; prop: the CSS property of the look; slot: the
// element it was read on; state: the setting state of the look. Returns the calibrated slots (other than `slot` itself) of
// the state settings of `prop` that belong to a part the block's resting settings of `prop` paint at `slot`.
export function partStateSlots( { db, cal, block, prop, slot, state } ) {
	const of = Object.entries( cal?.settings || {} ).filter( ( [ , s ] ) => s.property === prop || longhands( s.property ).includes( prop ) );
	const parts = new Set( of.filter( ( [ , s ] ) => ! s.state && slotsOf( s ).some( ( p ) => bare( p ) === slot ) ).flatMap( ( [ attr ] ) => partKeys( db, block, attr ) ) );
	const mine = of.filter( ( [ attr, s ] ) => state === s.state && partKeys( db, block, attr ).some( ( k ) => parts.has( k ) ) );
	return [ ...new Set( mine.flatMap( ( [ , s ] ) => slotsOf( s ) ) ) ].filter( ( p ) => bare( p ) !== slot );
}
