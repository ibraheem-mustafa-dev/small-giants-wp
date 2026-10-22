// The surfaces reader (Spec 48 FR-48-7, Spec 48A §3): for each template element, the `surfaces.json` records it belongs to.
// An element belongs to a record when it is a root of the record (a `template_tpl_id` of the record's `dc`) or sits
// anywhere under one in that draft's template. Each membership carries the record's id, kind and parent, whether the
// element is a root, and the states whose `sc_if_tpl_ids` hold the element or one of its ancestors. A record whose
// `parent` is another record is a part of it: the parent's `parts` list its id, kind and roots, and an element under the
// part's root carries the part's membership (its `parent` names the surface it is part of).
// Fields are carried as surfaces.json states them: each state's `state_keys` and `animation_ids`, the record's
// `closed_by`, `time_dependent` and `unresolved`, and a page record's `blocks` (the record's `pages` list). A membership's
// `states` are the states whose `sc_if_tpl_ids` hold the element (`in_sc_if` true); its `otherStates` are the surface's
// other states (`in_sc_if` false), so a state with no sc-if list (a hover) keeps its keys and animations.
import { templateKey, parseTemplateKey } from './fact-key.mjs';

// The tpl ids a surfaces.json field holds (a string, a list of strings or null) as a list of strings.
const idsOf = ( v ) => ( null == v ? [] : [ v ].flat().map( String ) );

// { surfaces: { <id>: { id, kind, name, dc, parent, roots: [ template key ], parts: [ { id, kind, roots } ], states,
//   closed_by, time_dependent, unresolved } }, pages: [ { surface, route, blocks } ], byElement: { <template key>: [ membership ] }, gaps } from surfaces.json's records and lib/read-template.mjs's result.
export function readSurfaces( { records, template } ) {
	const surfaces = {};
	const byElement = {};
	const gaps = [];
	const pages = records.filter( ( r ) => Array.isArray( r.blocks ) ).map( ( r ) => ( { surface: r.id, route: r.route ?? null, blocks: r.blocks.map( String ) } ) );
	const add = ( key, m ) => ( byElement[ key ] ||= [] ).push( m );
	for ( const r of records ) {
		const roots = idsOf( r.template_tpl_id ).map( ( n ) => templateKey( { dc: r.dc, tpl: n } ) );
		surfaces[ r.id ] = { id: r.id, kind: r.kind, name: r.name ?? null, dc: r.dc, parent: r.parent ?? null, roots: [], parts: [], states: ( r.states || [] ).map( ( s ) => ( { name: s.name, state_keys: s.state_keys || {}, sc_if_tpl_ids: idsOf( s.sc_if_tpl_ids ), animation_ids: idsOf( s.animation_ids ) } ) ), closed_by: r.closed_by ?? null, time_dependent: r.time_dependent ?? null, unresolved: r.unresolved ?? null };
		for ( const root of roots ) {
			if ( ! template.elements[ root ] ) {
				gaps.push( { construct: 'surface-root', draftId: `${ r.id } ${ root }`, error: `surfaces.json ${ r.id } names template element ${ root }, which the annotated template does not hold` } );
				continue;
			}
			surfaces[ r.id ].roots.push( root );
		}
	}
	for ( const s of Object.values( surfaces ) ) {
		const parent = s.parent && surfaces[ s.parent ];
		parent && parent.parts.push( { id: s.id, kind: s.kind, roots: s.roots } );
		s.parent && ! parent && gaps.push( { construct: 'surface-parent', draftId: s.id, error: `${ s.id } names parent ${ s.parent }, which surfaces.json does not hold` } );
	}
	for ( const s of Object.values( surfaces ) ) {
		const members = new Map();
		for ( const root of s.roots ) {
			members.set( root, true );
			for ( const key of template.order ) {
				if ( template.elements[ key ].parentChain.includes( root ) ) {
					members.has( key ) || members.set( key, false );
				}
			}
		}
		for ( const [ key, isRoot ] of members ) {
			const rec = template.elements[ key ];
			const held = new Set( [ rec.n, ...rec.parentChain.map( ( k ) => parseTemplateKey( k ).tpl ) ] );
			const inIf = ( st ) => st.sc_if_tpl_ids.some( ( n ) => held.has( n ) );
			const stateOf = ( st ) => ( { name: st.name, state_keys: st.state_keys, in_sc_if: inIf( st ), animation_ids: st.animation_ids } );
			add( key, {
				id: s.id, kind: s.kind, parent: s.parent, root: isRoot,
				states: s.states.filter( inIf ).map( stateOf ),
				otherStates: s.states.filter( ( st ) => ! inIf( st ) ).map( stateOf ),
				closed_by: s.closed_by, time_dependent: s.time_dependent, unresolved: s.unresolved,
			} );
		}
	}
	return { surfaces, pages, byElement, gaps };
}
