// FR-48-15: a canvas citation is `canvas-settable` only when the cited attribute is shown to emit CSS on the cited
// element, by one of two proofs: the cited block's calibration (the setting's `slots` or `reaches` name the element),
// or confirm-canvas.mjs's live measurement (a CONFIRMED verdict for the block, setting and property). A citation with
// neither is `unconfirmed`. Emission found by searching PHP source text is never a proof here (Spec 48 §14 gate G5):
// lib/triage-source.mjs may still drop a citation, but it can never confirm one.
import { LOOSE } from './resolve.mjs';

// Whether a calibration entry shows `setting` painting or reaching `elementPath` (in the calibrated block's own path
// space; '' is the block's root). elementPath null: the cited block does not enclose the row's element (a sibling in
// the canvas), so the proof is that the setting paints some element of that block at all.
export function calibrationEmits( calibration, setting, elementPath ) {
	const c = calibration?.settings?.[ setting ];
	const paints = [ ...( c?.slots || ( c?.slot ? [ c.slot ] : [] ) ), ...( c?.reaches || [] ) ].filter( ( p ) => 'string' === typeof p );
	if ( null === elementPath || undefined === elementPath ) {
		return paints.length > 0;
	}
	return paints.map( LOOSE ).includes( LOOSE( elementPath ) );
}

// The ctx.measuredEmits lookup from confirm-canvas.mjs's results (an array of { block, setting, property, verdict }):
// true for a CONFIRMED family, the one verdict that found the cited setting's rule governing the property on the
// element. Every other verdict proves nothing (REFUTED and NO-RULE are lib/triage.mjs::measuredReachFrom's refusals).
export function measuredEmitsFrom( results ) {
	const confirmed = new Set( ( Array.isArray( results ) ? results : [] ).filter( ( rec ) => 'CONFIRMED' === rec?.verdict ).map( ( rec ) => `${ rec.block }|${ rec.setting }|${ rec.property }` ) );
	return ( block, setting, property ) => confirmed.has( `${ block }|${ setting }|${ property }` );
}

// Which proof shows `cite` emitting on its element: 'calibration', 'measured', or null (unconfirmed). calibration: the
// cited block's calibration (calFor( cite.block )); elementPath: the row's element in the cited block's path space, or
// null for a block that does not enclose it; measuredEmits: the measuredEmitsFrom lookup, when one was read.
export function emissionProof( cite, { calibration = null, elementPath = null, property, measuredEmits = null } ) {
	if ( ! cite?.block || ! cite.setting ) {
		return null;
	}
	if ( calibrationEmits( calibration, cite.setting, elementPath ) ) {
		return 'calibration';
	}
	return true === measuredEmits?.( cite.block, cite.setting, property ) ? 'measured' : null;
}

// The row's element in the cited block's path space: the row's own path when the citation is its own block, the owner
// path naming the cited ref when the cited block encloses it, else null.
export function citedElementPath( cite, row ) {
	if ( null != cite.ref && cite.ref === row.ref ) {
		return row.path ?? '';
	}
	const owner = ( row.owners || [] ).find( ( o ) => null != cite.ref && o.ref === cite.ref );
	return owner ? owner.path ?? '' : null;
}

// The hop's `canvasSettable` flag (lib/resolve.mjs::resolveViaAncestor's citation with its gap): the hop found a gap,
// and the cited ancestor's calibration (from the ancestors list the hop was given, each { ref, path, calibration })
// shows the setting painting or reaching the row's element there, or the live measurement confirms it.
export function hopCanvasSettable( hop, ancestors, property, measuredEmits = null ) {
	if ( ! hop?.gap || ! hop.cite ) {
		return false;
	}
	const a = ( ancestors || [] ).find( ( x ) => x.ref === hop.cite.ref );
	return null !== emissionProof( hop.cite, { calibration: a?.calibration ?? null, elementPath: a ? a.path ?? '' : null, property, measuredEmits } );
}
