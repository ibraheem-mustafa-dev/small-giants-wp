// The state check (Spec 48 FR-48-81, FR-48-46): whether the live page shows each state look the draft shows. Both pages
// are read by lib/fill-state-read.mjs::readStates, the same vocabulary entering each state on each page's own host (the
// draft's `.card:hover`, the live block's `[aria-current="page"]`). For every paired element and every state look the
// draft has, each property's draft value is compared with the live value in that state, by property type with the
// confirm record's tolerances (lib/fill-confirm.mjs::compareDR). A property the live state does not change keeps its
// live resting value, so a live page that never paints the state is found where the draft changes it.

import { compareDR } from './fill-confirm.mjs';

const keyOf = ( look ) => look.states.join( '+' );
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
			for ( const look of read.looks?.[ pair.draft ] || [] ) {
				const state = keyOf( look );
				const liveLook = liveLooks.find( ( l ) => keyOf( l ) === state ) || null;
				for ( const prop of Object.keys( look.declared ) ) {
					const draftValue = valueOf( look, prop );
					const liveValue = valueOf( liveLook, prop ) ?? liveRest[ width ]?.[ pair.live ]?.[ prop ] ?? null;
					const { dr, tolerance } = null === liveValue ? { dr: 'unreadable', tolerance: null } : compareDR( prop, draftValue, liveValue );
					const verdict = { agree: 'match', runtime: 'match', disagree: 'differs' }[ dr ] || 'unreadable';
					rows.push( { draft: pair.draft, live: pair.live, width: Number( width ), state, prop, draftValue, liveValue, liveState: !! liveLook, verdict, tolerance, confirmed: ! ( byCode( look ) || byCode( liveLook ) ) } );
				}
			}
		}
	}
	return rows;
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
