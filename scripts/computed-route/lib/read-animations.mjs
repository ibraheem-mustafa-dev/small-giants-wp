// The animations reader (Spec 48 FR-48-7, Spec 48A §3): for each template element, the `animations.json` records that
// target it or a descendant. A record names its element by `template_tpl_id` (a string or a list of strings); a record
// built in code or inside an external SVG has none and names the nearest template ancestor in `nearest_tpl_id` instead.
// Keys are lib/fact-key.mjs template keys (`<dc>/<tpl>`). An element gets each record once: `self` when the record
// targets it, `descendant` when the record targets an element under it (the element is in the target's parent chain).
// `animations.json` is plain JSON and is read as it is: no `.dc.html` is parsed and no draft logic runs here.
import { templateKey } from './fact-key.mjs';

const idsOf = ( v ) => ( null == v ? [] : [ v ].flat().map( String ).filter( ( id ) => '' !== id ) );

// The effect entry of one record as it appears on an element.
function entryOf( r, target, via, reach ) {
	const status = r.status ?? 'active';
	return {
		id: r.id,
		name: r.name ?? null,
		mechanism: r.mechanism ?? null,
		group: r.group ?? null,
		status,
		flagged: 'active' === status ? null : status,
		reach,
		target,
		via,
		trigger: { type: r.trigger?.type ?? null, detail: r.trigger?.detail ?? '', ...( r.trigger?.state_keys ? { state_keys: r.trigger.state_keys } : {} ) },
		breakpoints: r.breakpoints || [],
		routes: r.routes || [],
		reduced_motion: { behaviour: r.reduced_motion?.behaviour ?? null, detail: r.reduced_motion?.detail ?? '' },
	};
}

// { byElement: { <template key>: [ effect ] }, unjoined: [ { id, reason } ], records, gaps } from animations.json's records
// and lib/read-template.mjs's result. A `records` that is not a list is one gap row; an empty-string id names no element and falls through to
// the next field; a record with no `status` is `active`. `flagged` is the record's status when it is not `active` (`dead-code` can never run
// in the draft, `no-op` changes nothing visible), so a consumer skips it without reading `status` again.
export function readAnimations( { records, template } ) {
	const byElement = {};
	const unjoined = [];
	const gaps = [];
	const put = ( key, entry ) => {
		const list = ( byElement[ key ] ||= [] );
		const held = list.findIndex( ( e ) => e.id === entry.id );
		if ( held < 0 ) {
			list.push( entry );
		} else if ( 'self' === entry.reach && 'self' !== list[ held ].reach ) {
			list[ held ] = entry;
		}
	};
	if ( ! Array.isArray( records ) ) {
		gaps.push( { construct: 'animations', draftId: 'animations.json', error: `animations.json \`records\` is ${ null === records ? 'null' : typeof records } and not a list, so no animation record was read` } );
		return { byElement, unjoined, records: 0, gaps };
	}
	for ( const r of records ) {
		if ( ! r || 'object' !== typeof r ) {
			gaps.push( { construct: 'animations', draftId: 'animations.json', error: 'a record in animations.json is not an object and was not read' } );
			continue;
		}
		const own = idsOf( r.element?.template_tpl_id );
		const via = own.length ? 'template_tpl_id' : 'nearest_tpl_id';
		const ids = own.length ? own : idsOf( r.element?.nearest_tpl_id );
		if ( ! ids.length ) {
			unjoined.push( { id: r.id, reason: 'the record names no template element (template_tpl_id and nearest_tpl_id are both null)' } );
			continue;
		}
		let landed = 0;
		for ( const n of ids ) {
			const target = templateKey( { dc: r.element.dc, tpl: n } );
			if ( ! template.elements[ target ] ) {
				gaps.push( { construct: 'animation-target', draftId: `${ r.id } ${ target }`, error: `animations.json ${ r.id } names template element ${ target } (${ via }), which the annotated template does not hold` } );
				continue;
			}
			landed++;
			put( target, entryOf( r, target, via, 'self' ) );
			for ( const up of template.elements[ target ].parentChain ) {
				template.elements[ up ] && put( up, entryOf( r, target, via, 'descendant' ) );
			}
		}
		landed || unjoined.push( { id: r.id, reason: `every named template element is missing from the annotated template (${ ids.map( ( n ) => templateKey( { dc: r.element.dc, tpl: n } ) ).join( ', ' ) })` } );
	}
	return { byElement, unjoined, records: records.length, gaps };
}
