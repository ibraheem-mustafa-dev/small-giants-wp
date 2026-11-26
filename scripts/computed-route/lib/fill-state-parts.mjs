// A state look on another instance of a repeated part (Spec 48 FR-48-81, register row C3): calibration measures a state setting
// on one instance of a block's repeated part (the navigation's hover fill on its first item, the one with a submenu) and the
// resting setting of the same part on others (the item fill on the plain items). The framework DB ties the two to one part
// (`block_attributes.canonical_slot`: itemBg and itemBgHover are both the item `card`). A state look the draft shows on an
// instance the state setting was not measured on is therefore the state setting's, wherever the resting setting of that part
// paints the instance: `partStateSlots` returns the slots the state setting was measured at, for the resolver to try.
import { canonicalSlotOf } from './resolve.mjs';
import { longhands } from './calibrate-props.mjs';
import { paintedProps } from './css-families.mjs';

// The keys a setting stands for in a part match. A resting setting offers both its `canonical_slot` and its `css_element`. A
// state setting asks for one: its `canonical_slot`, or, when the slot assigner left it none (itemBgCurrent, itemColourCurrent),
// its `css_element`, which is the `item` element its resting and hover siblings are declared on. A `css_element` is shared by
// unrelated parts of one block (`wrapper`, `item`), so it never overrides a `canonical_slot`: a state setting with a slot of
// its own is that slot's part whatever element name it shares.
// `text` is the slot the assigner gives an element's own text properties whatever the part (quote's `attributionColour` is
// `text`, its hover sibling `attribution`, both on the `attribution` element), so it names no part and never conflicts.
const GENERIC_SLOT = 'text';
const rowOf = ( db, block, attr ) => ( db ? db.prepare( 'SELECT css_element FROM block_attributes WHERE block_slug = ? AND attr_name = ?' ).get( block, attr ) : null );
const partKeys = ( db, block, attr, resting, restingOnElement ) => {
	const row = rowOf( db, block, attr );
	const slot = canonicalSlotOf( db, block, attr );
	const element = row?.css_element && `element:${ row.css_element }`;
	if ( resting ) return [ slot && `slot:${ slot }`, element ].filter( Boolean );
	if ( ! slot ) return [ element ].filter( Boolean );
	// A state setting with a slot also ties through its element when no resting setting there is another specific part.
	const clash = ( restingOnElement || [] ).some( ( r ) => r.element === row?.css_element && r.slot && r.slot !== slot && GENERIC_SLOT !== r.slot );
	return [ `slot:${ slot }`, element && ! clash && element ].filter( Boolean );
};

// A paint layer of an element (its ::before or ::after) is the element's own box: the path without the layer.
const bare = ( path ) => String( path ?? '' ).replace( /::(?:before|after)$/, '' );
const slotsOf = ( s ) => s.slots || [ s.slot ];

// db: the framework DB; cal: the block's calibration; block: the block name; prop: the CSS property of the look; slot: the
// element it was read on; state: the setting state of the look. Returns the calibrated slots (other than `slot` itself) of
// the state settings of `prop` that belong to a part the block's resting settings of `prop` paint at `slot`.
export function partStateSlots( { db, cal, block, prop, slot, state } ) {
	const of = Object.entries( cal?.settings || {} ).filter( ( [ , s ] ) => paintedProps( s ).includes( prop ) || longhands( paintedProps( s ).join( ',' ) ).includes( prop ) );
	const resting = of.filter( ( [ , s ] ) => ! s.state );
	const parts = new Set( resting.filter( ( [ , s ] ) => slotsOf( s ).some( ( p ) => bare( p ) === slot ) ).flatMap( ( [ attr ] ) => partKeys( db, block, attr, true ) ) );
	const restingOnElement = resting.map( ( [ attr ] ) => ( { element: rowOf( db, block, attr )?.css_element, slot: canonicalSlotOf( db, block, attr ) } ) );
	const mine = of.filter( ( [ attr, s ] ) => state === s.state && partKeys( db, block, attr, false, restingOnElement ).some( ( k ) => parts.has( k ) ) );
	return [ ...new Set( mine.flatMap( ( [ , s ] ) => slotsOf( s ) ) ) ].filter( ( p ) => bare( p ) !== slot );
}
