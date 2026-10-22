// Parent writes over one loop body (Spec 48 FR-48-14): the ancestor hop (lib/resolve.mjs::resolveViaAncestor) writes a parent
// setting whose paint reaches several measured descendants when every one of them is a copy of one `sc-for` loop body and the
// property is static in that body (the draft's code gives the same value in every copy). Loop membership is the runtime's
// identity (the fact record's template element and its enclosing `sc-for`, R-47-4), never a match on words. This builds the
// `ctx.loopBody` callback the hop calls: { ancestor, paths, prop, state } -> { key } | null.

import { templateKeyOf } from './fact-key.mjs';

// The innermost `sc-for` a template element sits in, or null.
export function loopKeyOf( facts, tplKey ) {
	return facts?.elements?.[ tplKey ]?.template?.membership?.scFor?.[ 0 ]?.key ?? null;
}

// Whether a property is the same in every copy of a template element: no style hole for it (or for a shorthand it belongs to)
// answers with more than one distinct value across the loop's copies.
export function staticIn( facts, tplKey, prop, state = null ) {
	const el = facts?.elements?.[ tplKey ];
	if ( ! el ) {
		return false;
	}
	const kind = state ? `style-${ state }` : 'style';
	return ( el.template?.holes || [] ).filter( ( h ) => h.where?.startsWith( `${ kind }:` ) ).every( ( h ) => {
		const p = h.where.slice( kind.length + 1 );
		if ( p !== prop && ! prop.startsWith( `${ p }-` ) ) {
			return true;
		}
		const distinct = new Set( Object.values( el.logic?.holes?.[ h.id ] || {} ).flatMap( ( a ) => ( a.v || [] ).map( ( x ) => JSON.stringify( x ) ) ) );
		return distinct.size <= 1;
	} );
}

// The callback for the hop. facts: the fact record; identityOf( ancestor, path ) -> the template key (`<component>/<n>`) of
// the draft element behind a measured path, or null when the runtime names none (the origin map, lib/fill-skeleton.mjs::originMap).
export function loopBodyCheck( { facts, identityOf } ) {
	return ( { ancestor, paths, prop, state } ) => {
		const keys = paths.map( ( p ) => identityOf( ancestor, p ) );
		if ( keys.some( ( k ) => ! k ) ) {
			return null;
		}
		const loops = new Set( keys.map( ( k ) => loopKeyOf( facts, k ) ) );
		if ( 1 !== loops.size || loops.has( null ) || ! keys.every( ( k ) => staticIn( facts, k, prop, state ) ) ) {
			return null;
		}
		return { key: [ ...loops ][ 0 ] };
	};
}

// identityOf for loopBodyCheck from the surface's origin map ({ [cr-ref]: { tpl } }, lib/fill-skeleton.mjs::originMap): the
// measured path of an ancestor came from the descendant ref the caller recorded in `ancestor.measuredRefs`.
export const identityFromOrigin = ( origin, rootComponent = null ) => ( ancestor, path ) => templateKeyOf( origin?.[ ancestor?.measuredRefs?.[ path ] ]?.tpl, rootComponent );
