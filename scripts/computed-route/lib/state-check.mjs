// The state check (Spec 48 FR-48-81, FR-48-46): whether the live page shows each state look the draft shows. Both pages
// are read by lib/fill-state-read.mjs::readStates, the same vocabulary entering each state on each page's own host (the
// draft's `.card:hover`, the live block's `[aria-current="page"]`). For every paired element and every state look the
// draft has, each property's draft value is compared with the live value in that state, by property type with the
// confirm record's tolerances (lib/fill-confirm.mjs::compareDR). A property the live state does not change keeps its
// live resting value, so a live page that never paints the state is found where the draft changes it.

import { compareDR } from './fill-confirm.mjs';

// A state look's key: its states, the pseudo-element it sits on (`hover::after` is not `hover`) and, for a look read
// by entering a logic state (family 'logic'), `#logic`, so a logic look never merges with a CSS look of the same state.
const keyOf = ( look ) => `${ look.states.join( '+' ) }${ look.pseudo ?? '' }${ 'logic' === look.family ? '#logic' : '' }`;
const valueOf = ( look, prop ) => look?.rendered?.[ prop ] ?? look?.declared?.[ prop ];
const byCode = ( look ) => 'code' === look?.read;

// rows: one per pair, width, state and property the draft's state changes:
//   { draft, live, width, state, prop, draftValue, liveValue, liveState (the live page has a look for this state),
//     verdict: 'match' | 'differs' | 'unreadable', tolerance, confirmed }
// `confirmed` is false when a side's look was read by code (`read: 'code'`, a state no browser can enter: :visited): that
// value is the stylesheet's declared one and the render cannot confirm it, so the row compares declared values.
// draft, live: { [width]: readStates result }; liveRest: { [width]: { [liveId]: { prop: value } } } (the live element's
// resting computed styles); pairs: [{ draft: draftTargetId, live: liveTargetId }].
export function checkStates( { draft, live, liveRest = {}, pairs } ) {
	const rows = [];
	for ( const [ width, read ] of Object.entries( draft ) ) {
		for ( const pair of pairs ) {
			const liveLooks = live[ width ]?.looks?.[ pair.live ] || [];
			const liveByState = mergeByState( liveLooks, true );
			for ( const [ state, props ] of mergeByState( read.looks?.[ pair.draft ] || [] ) ) {
				const liveProps = liveByState.get( state );
				for ( const [ prop, draftHits ] of props ) {
					const liveHits = liveProps?.get( prop ) || [];
					const rest = liveRest[ width ]?.[ pair.live ]?.[ prop ] ?? null;
					const candidates = liveHits.length ? liveHits : [ { look: null, value: rest } ];
					const { draftHit, liveHit, verdict, tolerance } = judge( prop, draftHits, candidates );
					const liveValue = liveHit.value ?? null;
					const liveCode = liveHit.look ? byCode( liveHit.look ) : liveLooks.some( ( l ) => keyOf( l ) === state && byCode( l ) );
					rows.push( { draft: pair.draft, live: pair.live, width: Number( width ), state, prop, draftValue: draftHit.value, liveValue, liveState: !! liveProps, verdict, tolerance, confirmed: ! ( byCode( draftHit.look ) || liveCode ) } );
				}
			}
		}
	}
	return rows;
}

// The verdict for one property: every look of the state keeps its own value on each side (the cascade, not the reader's
// order, decides which one shows), and the property matches when the live side agrees with any draft value; it differs
// only when no live value agrees (and unreadable when no live value could be read at all). Returns the pair judged: the
// agreeing pair, else the last pair compared.
function judge( prop, draftHits, liveHits ) {
	let last = { draftHit: draftHits.at( -1 ), liveHit: liveHits.at( -1 ), verdict: 'unreadable', tolerance: null };
	for ( const draftHit of draftHits ) {
		for ( const liveHit of liveHits ) {
			const { dr, tolerance } = null == liveHit.value ? { dr: 'unreadable', tolerance: null } : compareDR( prop, draftHit.value, liveHit.value );
			last = { draftHit, liveHit, verdict: { agree: 'match', runtime: 'match', disagree: 'differs' }[ dr ] || 'unreadable', tolerance };
			if ( 'match' === last.verdict ) {
				return last;
			}
		}
	}
	return last;
}

// One element's looks merged per state, then per property: Map<state key, Map<prop, [{ look, value }]>>, every look's
// value kept in reader order (the live side also counts a property only its render shows).
function mergeByState( looks, withRendered = false ) {
	const out = new Map();
	for ( const look of looks ) {
		const props = out.get( keyOf( look ) ) || new Map();
		for ( const prop of withRendered ? [ ...new Set( [ ...Object.keys( look.declared ), ...Object.keys( look.rendered || {} ) ] ) ] : Object.keys( look.declared ) ) {
			props.set( prop, [ ...( props.get( prop ) || [] ), { look, value: valueOf( look, prop ) } ] );
		}
		out.set( keyOf( look ), props );
	}
	return out;
}

// The rows grouped for a report: { match, differs, unreadable, byState: { state: { match, differs, unreadable } },
// unreachedDraft } where unreachedDraft lists the draft states no page can enter (:visited), named, never judged.
export function stateSummary( rows, draft ) {
	const out = { match: 0, differs: 0, unreadable: 0, byState: {}, unreachedDraft: Object.values( draft ).flatMap( ( r ) => r.unreached || [] ) };
	for ( const r of rows ) {
		out[ r.verdict ]++;
		const s = ( out.byState[ r.state ] ??= { match: 0, differs: 0, unreadable: 0 } );
		s[ r.verdict ]++;
	}
	return out;
}
