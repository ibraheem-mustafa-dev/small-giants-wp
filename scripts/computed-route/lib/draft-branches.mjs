// FR-48-12 item 2: a row whose draft side is blank is classed by the draft's `sc-if` branches (Spec 48 §3.7). The row's
// live element is joined to its draft element by identity (`<surface>.origin.json`: the cr-ref's draft instance key, or
// the slot's for a slot path), the draft element to the `sc-if`s it sits in (the fact record's
// template.membership.scIf), and each `sc-if` to its row of the generated state map (lib/state-map.mjs::stateMap). A
// branch the walk did not reach is an unwalked state; an element whose branch is off where it was measured is absent.
// Neither is written and neither is a gap. A row with no identity, or whose branches were all on, is not decided here.
import { templateKeyOf } from './fact-key.mjs';
import { LOOSE } from './resolve.mjs';

// The census draft id ("<component>:<n>", the state map's sc-if id) of a template key ("<component>/<n>").
export const draftIdOfKey = ( key ) => String( key ).replace( /\/(\d+)$/, ':$1' );

// The draft instance key behind a row: the slot whose path is the row's path (a slot of the cited cr-ref), else the
// cr-ref's own element. A deeper path inherits the cr-ref's sc-ifs: an element sits in every sc-if its ancestor sits in.
export function instanceOf( row, origin ) {
	const o = origin?.[ row.ref ];
	if ( ! o?.tpl ) {
		return null;
	}
	const slot = Object.entries( o.slots || {} ).find( ( [ p ] ) => p === row.path ) || Object.entries( o.slots || {} ).find( ( [ p ] ) => LOOSE( p ) === LOOSE( row.path ) );
	return slot ? slot[ 1 ] : o.tpl;
}

// The branch index of one surface: draftOf( row ) -> { instance, element, scIf: [ { id, value, map } ] } or
// { reason } when the row has no draft identity or the fact record has no entry for it. map is the sc-if's state map
// row, or null when the map holds none (the sc-if belongs to a draft record outside this surface).
export function branchIndex( { origin, elements, map, rootComponent } ) {
	const byId = new Map( ( map?.scIf || [] ).map( ( r ) => [ r.id, r ] ) );
	return ( row ) => {
		const instance = instanceOf( row, origin );
		if ( ! instance ) {
			return { reason: `no draft identity for ${ row.ref ?? 'a row with no ref' } in the origin map` };
		}
		const element = templateKeyOf( instance, rootComponent );
		const rec = element ? elements?.[ element ] : null;
		if ( ! rec ) {
			return { reason: `the fact record has no element ${ element ?? instance }` };
		}
		const scIf = ( rec.template?.membership?.scIf || [] ).map( ( s ) => ( { id: draftIdOfKey( s.key ), value: s.value ?? null, map: byId.get( draftIdOfKey( s.key ) ) ?? null } ) );
		return { instance, element, scIf };
	};
}

// One sc-if's verdict for a row measured in walker state `state`: 'unwalked' (no walk reaches its branch), 'off' (its
// branch shows only in another walked state, or by route, width, props or content, so the draft does not render it
// here), or null (its branch is on here, so it does not explain the blank draft side).
export function branchVerdict( s, state, walked ) {
	const m = s.map;
	if ( ! m ) {
		return { verdict: 'off', id: s.id, why: 'the sc-if belongs to no draft record of this surface' };
	}
	if ( 'gap' === m.reach || 'set-state' === m.reach ) {
		return { verdict: 'unwalked', id: s.id, state: m.state ?? null, why: 'gap' === m.reach ? m.reason : `reached only by setting ${ JSON.stringify( m.keys ) }, which no walker state does` };
	}
	if ( 'walker' === m.reach ) {
		if ( ! walked.has( m.walkerState ) ) {
			return { verdict: 'unwalked', id: s.id, state: m.state ?? null, walkerState: m.walkerState, why: `walker state ${ m.walkerState } was not walked` };
		}
		return m.walkerState === state ? null : { verdict: 'off', id: s.id, why: `shows only in walker state ${ m.walkerState }` };
	}
	if ( 'rest' === m.reach ) {
		return null;
	}
	return { verdict: 'off', id: s.id, why: `reached by ${ m.reach }, not by a state` };
}

// The class of an issue whose every row has a blank draft side: { decidedBy: 'unwalked-state' | 'absent', evidence }, or
// null. walked: the walker states the walk ran. Unwalked wins: a branch no walk reached may hold the element, so it is
// not called absent. Any row its branches do not explain leaves the issue undecided here.
export function classifyBlankDraft( issue, { draftOf, walked } ) {
	if ( ! draftOf || ! issue.rows.length || issue.rows.some( ( x ) => null != x.draft ) ) {
		return null;
	}
	const per = [];
	for ( const r of issue.rows ) {
		const d = draftOf( r );
		if ( ! d.scIf ) {
			return null;
		}
		const verdicts = d.scIf.map( ( s ) => branchVerdict( s, r.state, walked ) ).filter( Boolean );
		const unwalked = verdicts.filter( ( v ) => 'unwalked' === v.verdict );
		const off = verdicts.filter( ( v ) => 'off' === v.verdict );
		if ( ! unwalked.length && ! off.length ) {
			return null;
		}
		per.push( { row: r, element: d.element, unwalked, off } );
	}
	const unwalked = per.flatMap( ( p ) => p.unwalked );
	if ( unwalked.length ) {
		const states = [ ...new Set( unwalked.map( ( v ) => v.state ?? v.id ) ) ];
		return { decidedBy: 'unwalked-state', evidence: { check: 'unwalked-state', states, element: per[ 0 ].element, branches: dedupe( unwalked ), detail: `the draft renders this element only in a state the walk did not reach (${ states.join( ', ' ) }): listed with the surface's unmapped states, never written` } };
	}
	return { decidedBy: 'absent', evidence: { check: 'absent', element: per[ 0 ].element, branches: dedupe( per.flatMap( ( p ) => p.off ) ), detail: 'no draft branch renders this element where it was measured: nothing to compare, never written' } };
}

const dedupe = ( list ) => [ ...new Map( list.map( ( v ) => [ `${ v.id }|${ v.why }`, v ] ) ).values() ];

// The walker states a walk ran (its runs' states).
export const walkedStates = ( walk ) => new Set( ( walk?.runs || [] ).map( ( r ) => r.state ) );
