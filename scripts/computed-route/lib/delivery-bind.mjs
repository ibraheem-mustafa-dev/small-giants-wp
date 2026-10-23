// Binds tree evidence for a delivery-map animation record to the block that renders the record's own draft element. A
// block's draft element is the template key (`<dc>/<tpl>`) of its `draftRef` (a finder `{ tpl: <instance key> }` or a
// selector naming `data-dc-tpl`) and of its `variantKey` (the words element of a words-only variant). A record's draft
// elements are its `element.template_tpl_id` (one id or a list), or, for an element no template draws (a node a script
// appends), its `element.nearest_tpl_id`, the template ancestor the route writes it on.
import { templateKey, templateKeyOf, templateKeyOfSelector } from './fact-key.mjs';

const ids = ( v ) => ( null == v ? [] : [ v ].flat() ).filter( ( x ) => null != x && '' !== String( x ) );

// The template keys a tree block renders; empty when it carries no draft identity. `rootComponent` names the root host.
export function nodeElementKeys( node, rootComponent = null ) {
	const ref = node?.draftRef;
	const keys = [
		ref && 'object' === typeof ref ? templateKeyOf( ref.tpl, rootComponent ) : 'string' === typeof ref ? templateKeyOfSelector( ref, rootComponent ) : null,
		'string' === typeof node?.variantKey ? templateKeyOf( node.variantKey, rootComponent ) : null,
	];
	return [ ...new Set( keys.filter( Boolean ) ) ];
}

// The template keys of a record's own draft element, as the route pairs it; empty when it names none.
export function recordElementKeys( record ) {
	const el = record?.element || {};
	const own = ids( el.template_tpl_id );
	return ( own.length ? own : ids( el.nearest_tpl_id ) ).map( ( tpl ) => templateKey( { dc: el.dc, tpl: String( tpl ) } ) );
}

// { nodes, why }: the tree blocks that render the record's draft element, and the reason when there are none.
export function boundNodes( record, facts ) {
	const want = recordElementKeys( record );
	if ( ! want.length ) {
		return { nodes: [], why: 'the record names no draft element (template_tpl_id or nearest_tpl_id) a block could render' };
	}
	const nodes = ( facts?.nodes || [] ).filter( ( n ) => ( n.keys || [] ).some( ( k ) => want.includes( k ) ) );
	return { nodes, why: nodes.length ? '' : `no built block renders the record's draft element ${ want.join( ', ' ) } (no block's draftRef names it)` };
}
