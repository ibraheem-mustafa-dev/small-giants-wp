// A rule written on one part of a loop (Spec 48 FR-48-50, FR-48-14). The skeleton reads a loop's look from its representative, the
// first copy, so a part of it is named by its position (`.x__item:nth-of-type(1)`), and a selector built from that path styles the
// first copy alone. Where the draft draws every copy alike, the rule belongs on every copy's class (`.x__item`): this is the one
// place that decides it, for every writer of selector rules (the width ladder's scoped @media rules, the residual CSS
// writer's rules).
//
// A part is written on its class when all of these hold:
//   - its path counts exactly one position (`:nth-of-type(n)`: one loop level; nested positions keep their own paths);
//   - the draft element behind it is one body of a `sc-for` loop, from the fact record's membership (lib/loop-body.mjs::loopKeyOf),
//     never from the words or the number of copies;
//   - the draft gives the property the same value in every copy at each width (lib/loop-body.mjs::staticAtEachWidth);
//   - the block draws the part on every copy: for a rule that repeats a setting's paint (`paint: 'setting'`, the width ladder) a
//     setting of the block paints the property on the part and its calibration reaches more than one position of the part (its
//     slots); for a rule no setting holds (`paint: 'part'`, the residual writer) the block's calibrated paths hold more than one
//     position of the part (drawsEveryCopy).
// Otherwise the path is returned as it is. Nothing here names a block, a part or a class.
import { LOOSE } from './resolve.mjs';
import { candidates } from './db.mjs';
import { loopKeyOf, staticAtEachWidth } from './loop-body.mjs';
import { tplKey } from './fill-width-gate.mjs';
import { knownPaths } from './fill-prop.mjs';

const STEP = /:nth-of-type\(\d+\)/g;
// The positional steps of a path: a path with one is a part of one loop level; nested positions are left to their own paths.
const stepsIn = ( slot ) => String( slot ?? '' ).match( STEP )?.length ?? 0;

// Whether a calibrated setting of the block reaches the part on more than one copy. cal: the block's calibration.
export function paintsEveryCopy( cal, db, block, prop, state, slot ) {
	const loose = LOOSE( slot );
	return candidates( db, block, prop, state ).some( ( r ) => {
		const c = cal?.settings?.[ r.attr_name ];
		const slots = [ ...( c?.slots || ( undefined !== c?.slot ? [ c.slot ] : [] ) ) ].filter( ( p ) => 'string' === typeof p && LOOSE( p ) === loose );
		return new Set( slots ).size > 1 && slots.includes( slot );
	} );
}

// Whether the block draws the part at more than one position: its calibrated paths (elements, and the slots and reaches of its
// settings) hold the part, in the position `slot` names and in another. cal: the block's calibration.
export function drawsEveryCopy( cal, slot ) {
	const loose = LOOSE( slot );
	const here = new Set( knownPaths( cal ).filter( ( p ) => 'string' === typeof p && LOOSE( p ) === loose ) );
	return here.size > 1 && here.has( slot );
}

// The path a selector rule for `prop` on `slot` is written at: the part's class on every copy when it is a loop copy that
// every copy shares (see above), else `slot` unchanged. target: the measured element ({ slot, finder }); facts: the fact record
// (null: nothing is proved, the path stays); rootComponent: the draft's root component name (lib/fact-key.mjs::templateKeyOf);
// paint: 'setting' (default) or 'part', as above.
export function copyClassSlot( { slot, target, prop, state = null, rec, cal, db, facts, rootComponent = null, paint = 'setting' } ) {
	if ( ! facts || 1 !== stepsIn( slot ) ) {
		return slot;
	}
	const key = target?.finder ? tplKey( target.finder, rootComponent ) : null;
	if ( ! key || ! loopKeyOf( facts, key ) || ! staticAtEachWidth( facts, key, prop, state ) || ! ( 'part' === paint ? drawsEveryCopy( cal, slot ) : paintsEveryCopy( cal, db, rec.name, prop, state, slot ) ) ) {
		return slot;
	}
	return slot.replace( STEP, '' );
}
