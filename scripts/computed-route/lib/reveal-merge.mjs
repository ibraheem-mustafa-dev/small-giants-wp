// Reveal states of a draft surface, the pure half (Spec 48 §3.4 step 1). Content a draft shows only after a click (a closed
// accordion's answer, a later form step) is read with the draft put in the state that shows it (lib/skeleton-reveal.mjs); the
// elements it adds join the inventory carrying `reveal: { component, keys }`, the state the draft must be in for them to render
// (lib/intake-state.mjs::setDraftState takes exactly that). They are kept in the inventory's `revealed` list, beside `elements`
// (which stays exactly as the opening state read it), so a reader that looks elements up by key never meets two for one key.
//   - revealId / recId: the identity of an element or an inventory record. Its key alone for an opening-state element; its key
//     plus its state otherwise (the same key can name different elements in two states, as every step of a form does);
//   - toggleStates: from the toggles a probe clicked, the states to read: toggles whose state is one keyed map are merged into
//     one state when the draft renders them all open together, else each is read on its own;
//   - mergeRevealRecords: puts the records read in each state into the opening state's records, in document order;
//   - withRevealed: the inventory's `elements` and `revealed` as one list in document order, for a reader that pairs by order.

// Stable text of a JSON-like value: object keys sorted, so equal states give equal text.
export function stable( v ) {
	if ( Array.isArray( v ) ) {
		return `[${ v.map( stable ).join( ',' ) }]`;
	}
	if ( v && 'object' === typeof v ) {
		return `{${ Object.keys( v ).sort().map( ( k ) => `${ JSON.stringify( k ) }:${ stable( v[ k ] ) }` ).join( ',' ) }}`;
	}
	return JSON.stringify( v ) ?? 'null';
}

// The identity of a reveal state: '' for none (the opening state).
export const revealId = ( reveal ) => ( reveal ? stable( [ reveal.component, reveal.keys ] ) : '' );

// The identity of an inventory record: its key, plus its state when it has one. A pair names its element by `tpl` (the key).
export const recId = ( r ) => ( r?.reveal ? `${ r.key }@${ revealId( r.reveal ) }` : r?.key );
export const pairId = ( p ) => ( p?.reveal ? `${ p.tpl }@${ revealId( p.reveal ) }` : p?.tpl );

const isPlain = ( v ) => !! v && 'object' === typeof v && ! Array.isArray( v );

// The states to read from the toggles a probe clicked. toggle: { label, deltas: [ { component, key, before, after } ],
// added: [ signature ], removed: number }. A toggle counts when it shows something new and hides nothing. Toggles whose
// whole change is one plain-object key of one component (an `open` map keyed by item) are offered together as one merged state
// (`covers` lists them); every other toggle is its own state. Returns [ { component, keys, covers: [ toggle index ], merged } ].
export function toggleStates( toggles ) {
	const states = [];
	const seen = new Set();
	const add = ( s ) => {
		const id = revealId( s );
		if ( ! seen.has( id ) ) {
			seen.add( id );
			states.push( s );
		}
	};
	const groups = new Map();
	toggles.forEach( ( t, i ) => {
		if ( ! t.added?.length || t.removed || ! t.deltas?.length ) {
			return;
		}
		const one = 1 === t.deltas.length && isPlain( t.deltas[ 0 ].before ) && isPlain( t.deltas[ 0 ].after ) ? t.deltas[ 0 ] : null;
		if ( ! one ) {
			add( { component: t.deltas[ 0 ].component, keys: Object.fromEntries( t.deltas.map( ( d ) => [ d.key, d.after ] ) ), covers: [ i ], merged: false } );
			return;
		}
		const id = `${ one.component }\u0000${ one.key }`;
		groups.set( id, [ ...( groups.get( id ) || [] ), { i, d: one } ] );
	} );
	for ( const members of groups.values() ) {
		const { component, key } = members[ 0 ].d;
		members.length > 1
			? add( { component, keys: { [ key ]: Object.assign( {}, members[ 0 ].d.before, ...members.map( ( m ) => m.d.after ) ) }, covers: members.map( ( m ) => m.i ), merged: true } )
			: add( { component, keys: { [ key ]: members[ 0 ].d.after }, covers: [ members[ 0 ].i ], merged: false } );
	}
	return states;
}

// The single-toggle states a merged state falls back to when the draft does not render all its toggles open at once.
export const splitMerged = ( state, toggles ) => state.covers.map( ( i ) => ( { component: state.component, keys: Object.fromEntries( toggles[ i ].deltas.map( ( d ) => [ d.key, d.after ] ) ), covers: [ i ], merged: false } ) );

// Whether a read of a merged state holds what each covered toggle showed alone: per signature, the merged read has at least as
// many more than the opening read as the toggles needed together. counts: { signature: how many } of the opening and merged reads.
export function holdsAll( { opening, merged, toggles, covers } ) {
	const need = {};
	for ( const i of covers ) {
		toggles[ i ].added.forEach( ( s ) => ( need[ s ] = ( need[ s ] || 0 ) + 1 ) );
	}
	return Object.entries( need ).every( ( [ s, n ] ) => ( merged[ s ] || 0 ) - ( opening[ s ] || 0 ) >= n );
}

const sigOf = ( r ) => `${ r.key }|${ r.tag }|${ r.words }`;
const countBy = ( records ) => records.reduce( ( m, r ) => m.set( sigOf( r ), ( m.get( sigOf( r ) ) || 0 ) + 1 ), new Map() );

// Whether a state only adds to what the opening state shows: every element (key, tag, own text) the opening state has is in the
// read, as many times over. An accordion opening is additive; a form step replaces the step before it.
const adds = ( base, records ) => {
	const have = countBy( records );
	return [ ...countBy( base ) ].every( ( [ s, n ] ) => ( have.get( s ) || 0 ) >= n );
};

// Puts what each state read into the opening records. base: the opening state's records (document order); reads: [ { reveal,
// records } ], each read's records in its own document order. A record that is an element already listed is dropped, every other
// is kept with `reveal` and `after` (the id, recId, of the record before it in its own read, which places it). What counts as the
// same element depends on the state: in one that only adds (an accordion's answer), the same key, tag and own text; in one that
// replaces the opening content (a form step, whose fields share keys with the step before), the same key, tag, own text and all
// text under it, with its parent the same element too, so a field is not taken for the field that held its key before. The
// opening records come back as the same objects, in the same order; a record kept is placed after its `after` record, and
// after any records an earlier state placed there.
export function mergeRevealRecords( base, reads ) {
	const out = [ ...base ];
	const byKey = new Map();
	const note = ( r ) => byKey.set( r.key, [ ...( byKey.get( r.key ) || [] ), r ] );
	base.forEach( note );
	for ( const { reveal, records } of reads ) {
		const additive = adds( base, records );
		const twinOf = new Map();
		const placedBy = new Map();
		records.forEach( ( r ) => {
			const parentTwin = null === r.parentKey || undefined === r.parentKey || twinOf.has( r.parentKey ) && twinOf.get( r.parentKey );
			const twin = ( byKey.get( r.key ) || [] ).find( ( x ) => x.tag === r.tag && x.words === r.words && ( additive || ( x.allText === r.allText && parentTwin ) ) );
			twinOf.set( r.key, !! twin );
			const before = placedBy.get( records[ records.indexOf( r ) - 1 ]?.key );
			if ( twin ) {
				placedBy.set( r.key, twin );
				return;
			}
			let at = before ? out.indexOf( before ) + 1 : out.length;
			// Elements an earlier state added after the same record stay before this state's.
			while ( out[ at ]?.reveal && out[ at ].reveal !== reveal ) {
				at++;
			}
			const kept = { ...r, reveal, after: before ? recId( before ) : null };
			out.splice( at, 0, kept );
			note( kept );
			placedBy.set( r.key, kept );
		} );
	}
	return out;
}

// The inventory's records in document order: `elements` (the opening state's, untouched) with `revealed` (the elements only a
// state shows, lib/skeleton-inventory.mjs) each put after the record its `after` names, and after any another state placed there.
export function withRevealed( inventory ) {
	const out = [ ...( inventory.elements || [] ) ];
	for ( const r of inventory.revealed || [] ) {
		let at = null === r.after || undefined === r.after ? -1 : out.findIndex( ( x ) => recId( x ) === r.after );
		at = at < 0 ? out.length : at + 1;
		while ( out[ at ]?.reveal && revealId( out[ at ].reveal ) !== revealId( r.reveal ) ) {
			at++;
		}
		out.splice( at, 0, r );
	}
	return out;
}
