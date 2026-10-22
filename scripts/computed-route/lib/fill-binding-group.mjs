// Binding grouping (Spec 48 FR-48-41, row 5): elements that share one `{{ }}` binding in their style attribute share one
// setting. The fact record (lib/fact-record.mjs) names each bound element: `elements[<template key>].template.holes` lists a
// hole per `{{ }}` with its place (`style:<property>` for the style attribute) and `expr`. A Fill node names its draft
// element by a tpl finder (`<chain>/<n>#<copy>`, read to the record's `<component>/<n>` key), and a write names its node and
// slot. A group is one binding that fed the same setting with the same value on two or more elements; it is listed once, as
// the one token the n writes share, instead of n copies. Elements bound to the same expression whose written values differ
// (a loop item's own value) are listed apart as `split`, never grouped.

import { templateKeyOf } from './fact-key.mjs';

// The resting style-attribute expressions of each record element: Map<template key, expression[]>. A `style-hover:` hole is
// a state look, not the resting style, and is left out.
function styleBindings( facts ) {
	const out = new Map();
	for ( const [ key, e ] of Object.entries( facts?.elements || {} ) ) {
		const exprs = ( e?.template?.holes || [] )
			.filter( ( h ) => String( h?.where ?? '' ).startsWith( 'style:' ) && h.expr )
			.map( ( h ) => String( h.expr ).trim() );
		exprs.length && out.set( key, exprs );
	}
	return out;
}

// The record key (`<component>/<n>`) of the element a finder names, or null when the finder is not a tpl key.
function elementOfFinder( finder, rootComponent ) {
	const key = 'string' === typeof finder ? finder : finder?.tpl;
	return key ? templateKeyOf( key, rootComponent ) : null;
}

const rootOf = ( nodes, i ) => {
	let at = i;
	while ( null !== nodes[ at ]?.parent && undefined !== nodes[ at ]?.parent ) {
		at = nodes[ at ].parent;
	}
	return at;
};

// { groups, split }. facts: the fact record (null when intake has not run: nothing is grouped); nodes: lib/fill-skeleton.mjs::skeletonNodes; writes: Fill's style writes (node,
// index, slot, prop, attr, after). A group: { id, binding, attr, value, members: [ { node, slot, prop } ], sections }. A
// split: { binding, attr, values: [ { value, members } ] }. Each grouped write gains `group: <id>`.
export function groupBindings( { facts, nodes, writes, rootComponent = null } ) {
	const exprsOf = styleBindings( facts );
	const elementOf = ( w ) => {
		const t = nodes[ w.index ]?.targets.find( ( x ) => x.slot === ( w.slot || '' ) );
		return t ? elementOfFinder( t.finder, rootComponent ) : null;
	};
	const bucket = new Map();
	for ( const w of writes ) {
		if ( ! w.attr || w.state || '(' === String( w.prop ).charAt( 0 ) || 'motion' === w.how ) {
			continue;
		}
		const el = elementOf( w );
		for ( const expression of new Set( exprsOf.get( el ) || [] ) ) {
			const k = JSON.stringify( [ expression, w.attr ] );
			const values = bucket.get( k ) || new Map();
			const v = JSON.stringify( w.after );
			values.set( v, [ ...( values.get( v ) || [] ), w ] );
			bucket.set( k, values );
		}
	}
	const groups = [];
	const split = [];
	const memberKey = ( w ) => `${ w.index }:${ w.slot || '' }`;
	const member = ( w ) => ( { node: w.node, slot: w.slot || '', prop: w.prop } );
	for ( const [ k, values ] of bucket ) {
		const [ binding, attr ] = JSON.parse( k );
		if ( new Set( [ ...values.values() ].flat().map( memberKey ) ).size < 2 ) {
			continue;
		}
		if ( values.size > 1 ) {
			split.push( { binding, attr, values: [ ...values.entries() ].map( ( [ v, ws ] ) => ( { value: JSON.parse( v ), members: ws.map( member ) } ) ) } );
			continue;
		}
		const [ [ v, ws ] ] = [ ...values.entries() ];
		const id = `${ binding }|${ attr }`;
		ws.forEach( ( w ) => {
			w.group = id;
		} );
		groups.push( { id, binding, attr, value: JSON.parse( v ), members: ws.map( member ), sections: new Set( ws.map( ( w ) => rootOf( nodes, w.index ) ) ).size } );
	}
	return { groups, split };
}
