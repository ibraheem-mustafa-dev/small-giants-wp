// The general slot path of paint conservation (Spec 48 section 3.4): a painted draft element a block absorbs and draws as one
// of its parts is read where the block's calibration holds a setting that paints that part. Each calibrated part slot (a
// path of steps below the block's root, lib/calibrate.mjs) is walked down from the block's own draft element; the element it
// lands on is that slot's draft element when the slot's settings paint one of the looks the element paints, and the slot is
// still free on the node. An absorbed element no slot lands on is recorded `no-part` when no setting of the block's calibration,
// at any slot and in any state, paints any of its looks (the block draws it with a fixed look: a missing block setting,
// mechanism F), and `not-calibrated` when the block has no calibration; one whose looks a setting paints but whose element no
// slot reaches is left unrecorded, for a finder of that block (a proposal problem). Neither record makes the look show: the
// proposal names those elements (lib/skeleton-paint-conservation.mjs::unreadList).
import { lookOfProperty, calibratedLooks } from './skeleton-paint-conservation.mjs';

const NTH = /:nth-of-type\((\d+)\)\s*$/;

// The looks each calibrated part slot of a block paints at rest: Map( slot -> Set( look ) ). The root (`''`), a
// pseudo-element and a state other than the block's current item are not parts the draft's element can be.
export function partLooks( settings = {}, tags = {} ) {
	const out = new Map();
	for ( const s of Object.values( settings || {} ) ) {
		const slot = s?.slot;
		if ( 'string' !== typeof slot || '' === slot || slot.includes( '::' ) || ( s.state && 'current' !== s.state ) ) {
			continue;
		}
		const look = lookOfProperty( s.property, tags[ slot ] ?? '' );
		look && ( out.get( slot ) ?? out.set( slot, new Set() ).get( slot ) ).add( look );
	}
	return out;
}

// The draft element a part slot names, walking its steps down from the block's element: a `:nth-of-type(k)` step is the k-th
// child, any other step the only child. A step the draft cannot follow (no k-th child, several children for a lone step) is
// no element. kids( element ) gives the element's children in order.
export function walkSlot( slot, from, kids ) {
	let cur = from;
	for ( const step of String( slot ).split( ' > ' ) ) {
		const list = kids( cur );
		const nth = NTH.exec( step );
		cur = nth ? list[ Number( nth[ 1 ] ) - 1 ] : 1 === list.length ? list[ 0 ] : null;
		if ( ! cur ) {
			return null;
		}
	}
	return cur === from ? null : cur;
}

// One host node's absorbed painted elements. host: the block's own draft element; node: its skeleton node; absorbed:
// [ { element, looks: [ look ] } ]; settings, tags: the block's calibration settings and slot tags; checked: the calibration
// file read. Returns { slots: { slot: finder }, records: Map( key -> record ), unmatched: [ { key, looks, parts } ] }.
export function absorbedSlots( { host, node, absorbed = [], kids, finder, settings = {}, tags = {}, block, checked } ) {
	const out = { slots: {}, records: new Map(), unmatched: [] };
	const parts = partLooks( settings, tags );
	const byKey = new Map( absorbed.map( ( a ) => [ a.element.key, a ] ) );
	const placed = new Set();
	for ( const [ slot, looks ] of parts ) {
		const hit = node.draftSlots?.[ slot ] || out.slots[ slot ] ? null : walkSlot( slot, host, kids );
		const a = hit ? byKey.get( hit.key ) : null;
		if ( a && ( ! tags[ slot ] || String( tags[ slot ] ).toLowerCase() === a.element.tag ) && a.looks.some( ( l ) => looks.has( l ) ) ) {
			out.slots[ slot ] = finder( a.element );
			placed.add( a.element.key );
		}
	}
	const calibrated = Object.keys( settings || {} ).length > 0;
	const painted = calibratedLooks( settings );
	for ( const a of absorbed ) {
		if ( placed.has( a.element.key ) ) {
			continue;
		}
		const covered = a.looks.filter( ( l ) => painted.has( l ) );
		if ( ! calibrated ) {
			out.records.set( a.element.key, { kind: 'not-calibrated', block, looks: a.looks } );
		} else if ( covered.length ) {
			out.unmatched.push( { key: a.element.key, looks: a.looks, parts: [ ...parts ].filter( ( [ , s ] ) => covered.some( ( l ) => s.has( l ) ) ).map( ( [ slot ] ) => slot ) } );
		} else {
			out.records.set( a.element.key, { kind: 'no-part', block, looks: a.looks, checked } );
		}
	}
	return out;
}
