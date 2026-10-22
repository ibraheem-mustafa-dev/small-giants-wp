// A state rule the draft declares and never paints, built from the code (Spec 48 FR-48-69, FR-48-34 test 1, FR-48-73): intake
// lists a `style-hover` declaration whose `{{ }}` binding the runtime leaves unresolved at read time (intake.json
// `draftDefects`, test `unresolved-binding`, the declaration `dropped`): the page never shows it, but the code states what it
// means. The value is what the fact record's logic reader resolved the binding to (`logic.holes`, the draft's own
// `renderVals()`), at each read width, for the copy of the element Fill reads. It is added to the target's state looks as a
// code look (`read: 'code'`, nothing rendered to confirm it), so lib/fill-state.mjs::fillStates writes it through the setting
// that holds the state like any look. Each is listed: the write carries the draft ID and the returned `listed` rows go to the
// fill report for Bean. A binding that resolves to no single value (undefined, or an expression error) is a gap row.

import { draftIdOf } from './fill-confirm.mjs';

// The defect rows of intake's `draftDefects` (groups hold `rows`) that name a dropped state declaration:
// [{ draftId, pseudo, prop, declared }].
export function droppedStateDecls( draftDefects = [] ) {
	return draftDefects.flatMap( ( g ) => g.rows || [ g ] )
		.filter( ( r ) => 'unresolved-binding' === r.test && r.evidence?.pseudo )
		.flatMap( ( r ) => ( r.evidence.decls || [] ).filter( ( d ) => 'dropped' === d.state ).map( ( d ) => ( { draftId: r.draftId, pseudo: r.evidence.pseudo, prop: d.prop, declared: d.declared } ) ) );
}

// The single string a hole resolved to at one width for one copy of its element, or { gap }. `answer` is the fact record's
// `{ v: [ summary ], n, loop }`; a loop's list holds one summary per copy, in order.
export function holeValue( answer, copy ) {
	if ( ! answer || answer.err ) {
		return { gap: `the binding did not resolve (${ answer?.err || 'no answer' })` };
	}
	const summary = answer.v?.[ answer.loop ? copy : 0 ];
	if ( 'string' !== summary?.t || '' === summary.v ) {
		return { gap: summary ? `the binding resolves to ${ summary.t }, not a value` : `the binding has no value for copy ${ copy }` };
	}
	return { value: summary.v };
}

// Adds the code looks of every dropped declaration to `reads.states[width].looks[jobId]` (in place) and returns
// { listed, gaps }. reads: lib/fill-read.mjs::readDraft's result; jobs: [{ id, finder }]; facts: the fact record; draftDefects:
// intake.json's; rootComponent: the entry draft's component (lib/fill-confirm.mjs::draftIdOf). A look already read for the
// same state and property at a width (the page did paint it) is kept as read.
export function addDefectLooks( { reads, jobs, facts, draftDefects, rootComponent } ) {
	const out = { listed: [], gaps: [] };
	const decls = droppedStateDecls( draftDefects );
	if ( ! decls.length || ! facts ) {
		return out;
	}
	for ( const job of jobs ) {
		const draftId = draftIdOf( job.finder, rootComponent );
		const copy = Number( /#(\d+)$/.exec( job.finder?.tpl || '' )?.[ 1 ] ?? 0 );
		for ( const d of decls.filter( ( x ) => x.draftId === draftId ) ) {
			const [ component, n ] = [ draftId.slice( 0, draftId.lastIndexOf( ':' ) ), draftId.slice( draftId.lastIndexOf( ':' ) + 1 ) ];
			const el = facts.elements?.[ `${ component }/${ n }` ];
			const hole = ( el?.template?.holes || [] ).find( ( h ) => h.where === `style-${ d.pseudo }:${ d.prop }` );
			if ( ! hole ) {
				out.gaps.push( { draftId, state: d.pseudo, prop: d.prop, reason: `the fact record holds no ${ d.pseudo } binding for ${ d.prop } on ${ draftId }` } );
				continue;
			}
			const perWidth = {};
			for ( const w of Object.keys( reads.states || {} ) ) {
				const v = holeValue( el.logic?.holes?.[ hole.id ]?.[ w ], copy );
				if ( v.gap ) {
					out.gaps.push( { draftId, state: d.pseudo, prop: d.prop, width: Number( w ), reason: v.gap } );
					continue;
				}
				perWidth[ w ] = v.value;
				const looks = ( reads.states[ w ].looks[ job.id ] ??= [] );
				const had = looks.some( ( l ) => l.states.includes( d.pseudo ) && l.declared?.[ d.prop ] );
				had || looks.push( { states: [ d.pseudo ], family: 'pseudo-class', selector: `style-${ d.pseudo } ${ d.declared }`, tokens: [], declared: { [ d.prop ]: v.value }, rendered: null, read: 'code', draftDefect: draftId } );
			}
			Object.keys( perWidth ).length && out.listed.push( { draftId, job: job.id, state: d.pseudo, prop: d.prop, declared: d.declared, built: perWidth } );
		}
	}
	return out;
}
