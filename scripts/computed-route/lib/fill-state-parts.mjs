// A state look on another instance of a repeated part (Spec 48 FR-48-81, register row C3): calibration measures a state setting
// on one instance of a block's repeated part (the navigation's hover fill on its first item, the one with a submenu) and the
// resting setting of the same part on others (the item fill on the plain items). The framework DB ties the two to one part
// (`block_attributes.canonical_slot`: itemBg and itemBgHover are both the item `card`). A state look the draft shows on an
// instance the state setting was not measured on is therefore the state setting's, wherever the resting setting of that part
// paints the instance: `partStateSlots` returns the slots the state setting was measured at, for the resolver to try.
import { canonicalSlotOf } from './resolve.mjs';
import { longhands } from './calibrate-props.mjs';

// A paint layer of an element (its ::before or ::after) is the element's own box: the path without the layer.
const bare = ( path ) => String( path ?? '' ).replace( /::(?:before|after)$/, '' );
const slotsOf = ( s ) => s.slots || [ s.slot ];

// db: the framework DB; cal: the block's calibration; block: the block name; prop: the CSS property of the look; slot: the
// element it was read on; state: the setting state of the look. Returns the calibrated slots (other than `slot` itself) of
// the state settings of `prop` that belong to a part the block's resting settings of `prop` paint at `slot`.
export function partStateSlots( { db, cal, block, prop, slot, state } ) {
	const of = Object.entries( cal?.settings || {} ).filter( ( [ , s ] ) => s.property === prop || longhands( s.property ).includes( prop ) );
	const parts = new Set( of.filter( ( [ , s ] ) => ! s.state && slotsOf( s ).some( ( p ) => bare( p ) === slot ) ).map( ( [ attr ] ) => canonicalSlotOf( db, block, attr ) ).filter( Boolean ) );
	const mine = of.filter( ( [ attr, s ] ) => state === s.state && parts.has( canonicalSlotOf( db, block, attr ) ) );
	return [ ...new Set( mine.flatMap( ( [ , s ] ) => slotsOf( s ) ) ) ].filter( ( p ) => bare( p ) !== slot );
}
