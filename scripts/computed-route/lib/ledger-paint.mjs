// The clone difference ledger's painted element (tools/clone-ledger.mjs): which live element of a block each property of a
// paired draft element is compared on. A block paints a setting on one part of itself (its setting record in the route's
// keys, lib/setting-record.mjs::loadRecord `settings[attr]`: `slot`, `slots`, `property`, `state`), which need not be the element the draft
// element pairs with: sgs/container pairs the draft section with its root and paints its padding on `.sgs-container__inner`.
// The rule, for one target (a node's root or one of its slots) and one CSS property:
//   1. The Fill writes of the node that answer the target (resting writes whose `readSlot`, else `slot`, is the target's
//      part; for the node's root also those whose part is no target of the node: Fill read them from the root's draft
//      element and wrote them to a part). Such a write paints its `slot`, unless the slot map records its setting at rest
//      on parts that do not include that slot: then the record's `slot`. The properties of the write that the record covers
//      (the recorded property and its longhands; every property of the write when the slot map has no record) are compared
//      on that part, or on the target's own element when the part is the target's.
//   2. No such write, on a node's root, with the block's default paint (the client's site look, `elements`): the
//      slot map's resting settings covering the property, when none paints the root, name the parts it may live on; a single
//      one of them (not a pseudo layer) whose default paint differs from the root's at every width is where the block's root
//      look holds it, and the property is compared there.
//   3. Otherwise on the target's own element.
// The properties the walker reads from the paint carrying most of the text (lib/ledger-diff.mjs::TEXT_READ: colour and
// typography) are never moved: they are already read where the words paint, on both sides. Box keys (x, y, w, h) are the
// target's own box. Pure functions.
import { longhandsOf } from './css-families.mjs';
import { TEXT_READ } from './ledger-diff.mjs';

// A property and its longhands ('padding' covers 'padding-top'; a comma list covers each piece's).
export const covered = ( property ) => new Set( String( property || '' ).split( /,\s*/ ).filter( Boolean ).flatMap( ( p ) => [ p, ...longhandsOf( p ) ] ) );

// The CSS properties one Fill write row names: its `prop` (a comma list for a combined write) and its `covers`.
export const writeProps = ( w ) => [ ...String( w.prop || '' ).split( /,\s*/ ), ...( Array.isArray( w.covers ) ? w.covers : String( w.covers || '' ).split( /,\s*/ ) ) ].filter( Boolean );

const rest = ( rec ) => rec && ! rec.state && 'string' === typeof rec.slot;
const slotsOf = ( rec ) => ( Array.isArray( rec.slots ) && rec.slots.length ? rec.slots : [ rec.slot ] );

// Map property -> { slot, attr, from: 'write' | 'default paint' } for each property of `target` compared on another part of
// its block. target: { slot }; writes: the node's Fill write rows; slotMap: the block's setting record (or null);
// opts.paint: the block's default paint (or null); opts.targetSlots: the parts of the node that are targets of their own.
export function paintSlots( target, writes, slotMap, { paint = null, targetSlots = new Set( [ '' ] ) } = {} ) {
	const settings = slotMap?.settings || {};
	const own = target.slot || '';
	const out = new Map();
	const decided = new Set();
	for ( const w of writes || [] ) {
		const answers = w.readSlot ?? w.slot ?? '';
		if ( w.state || ! ( answers === own || ( '' === own && ! targetSlots.has( answers ) ) ) ) {
			continue;
		}
		const rec = settings[ w.attr ];
		if ( rec && rec.state ) {
			continue;
		}
		const at = w.slot ?? '';
		const part = rest( rec ) && ! slotsOf( rec ).includes( at ) ? rec.slot : at;
		const cover = rest( rec ) ? covered( rec.property ) : null;
		for ( const p of writeProps( w ).flatMap( ( x ) => [ ...covered( x ) ] ) ) {
			if ( ( cover && ! cover.has( p ) ) || TEXT_READ.has( p ) || decided.has( p ) ) {
				continue;
			}
			decided.add( p );
			if ( part !== own ) {
				out.set( p, { slot: part, attr: w.attr, from: 'write' } );
			}
		}
	}
	if ( '' !== own || ! paint?.elements ) {
		return out;
	}
	const cands = new Map();
	for ( const [ attr, rec ] of Object.entries( settings ) ) {
		if ( ! rest( rec ) ) {
			continue;
		}
		for ( const p of covered( rec.property ) ) {
			if ( ! decided.has( p ) && ! TEXT_READ.has( p ) ) {
				( cands.get( p ) || cands.set( p, [] ).get( p ) ).push( { attr, rec } );
			}
		}
	}
	const root = paint.elements[ '' ] || {};
	for ( const [ p, list ] of cands ) {
		if ( list.some( ( c ) => slotsOf( c.rec ).includes( '' ) ) ) {
			continue;
		}
		const parts = [ ...new Set( list.flatMap( ( c ) => slotsOf( c.rec ) ) ) ].filter( ( s ) => ! /::/.test( s ) );
		const holds = parts.filter( ( s ) => {
			const el = paint.elements[ s ];
			const ws = el ? Object.keys( el ) : [];
			return ws.length && ws.every( ( w ) => undefined !== el[ w ]?.[ p ] && el[ w ][ p ] !== root[ w ]?.[ p ] );
		} );
		if ( 1 === holds.length ) {
			out.set( p, { slot: holds[ 0 ], attr: list.filter( ( c ) => slotsOf( c.rec ).includes( holds[ 0 ] ) ).map( ( c ) => c.attr ).join( ', ' ), from: 'default paint' } );
		}
	}
	return out;
}

// The ground, border and shadow: where the block paints these for a draft element, that part's box is the element's box.
export const PAINT_LOOK = new Set( [ 'background-color', 'background-image', 'border-top-width', 'border-top-color', 'border-top-style', 'border-radius', 'box-shadow' ] );

// The live read of a target with each moved property taken from the element of its part, and its box taken from the part
// its ground, border or shadow moved to (an icon whose root spans its column and whose 36px shape paints the circle compares
// the shape's box with the draft circle's). l: the target's live read; partReads: Map slot -> the read of that part's
// element; moves: paintSlots(). Returns { read, paintedOn: Map prop -> slot, boxOn: slot or null, missing: [ slot ] } (a part
// whose element the live block does not print keeps the target's own value, listed in missing).
export function paintedRead( l, partReads, moves ) {
	const paintedOn = new Map();
	const missing = new Set();
	if ( ! l?.snap || ! moves.size ) {
		return { read: l, paintedOn, boxOn: null, missing: [] };
	}
	const looks = [ ...new Set( [ ...moves ].filter( ( [ p ] ) => PAINT_LOOK.has( p ) ).map( ( [ , m ] ) => m.slot ) ) ];
	const boxOn = 1 === looks.length && partReads.get( looks[ 0 ] )?.snap?.box ? looks[ 0 ] : null;
	const styles = { ...l.snap.styles };
	for ( const [ p, m ] of moves ) {
		const part = partReads.get( m.slot );
		if ( ! part?.found ) {
			missing.add( m.slot );
			continue;
		}
		const v = part.snap?.styles?.[ p ];
		if ( undefined === v ) {
			continue;
		}
		styles[ p ] = v;
		paintedOn.set( p, m.slot );
	}
	return { read: { ...l, snap: { ...l.snap, styles, ...( boxOn ? { box: partReads.get( boxOn ).snap.box } : {} ) } }, paintedOn, boxOn, missing: [ ...missing ] };
}
