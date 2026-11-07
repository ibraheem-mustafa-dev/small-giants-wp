// The handoff's animations.json as the applier's families read it: which records name a paired draft element, and what a
// state record asks for. A pair's draft id is `Root/231#0` for the main draft and `Root>EnquiryForm@468#0/6#0` for a mounted
// one; a record names the file (`element.dc`) and one or several template ids.
import { templateKey } from './fact-key.mjs';

export function draftId( tpl ) {
	const m = /^(?:Root>)?(\w+)(?:@[^/]*)?\/(\d+)#(\d+)$/.exec( String( tpl ?? '' ) );
	return m ? { dc: m[ 1 ], id: m[ 2 ], instance: Number( m[ 3 ] ) } : null;
}

const idsOf = ( record ) => [].concat( record.element?.template_tpl_id ?? [] ).map( String );

// { 'Root/231': [ record ], 'EnquiryForm/6': [ record ] }. `mainDc` is the handoff's first draft: the draft the page runs as Root.
export function recordIndex( records, mainDc ) {
	const index = new Map();
	for ( const record of records || [] ) {
		const dc = record.element?.dc === mainDc ? 'Root' : record.element?.dc;
		for ( const id of idsOf( record ) ) {
			const key = templateKey( { dc, tpl: id } );
			index.set( key, [ ...( index.get( key ) ?? [] ), record ] );
		}
	}
	return index;
}

export function recordsFor( index, tpl ) {
	const id = draftId( tpl );
	return id ? index.get( templateKey( { dc: id.dc, tpl: id.id } ) ) ?? [] : [];
}

// Whether a draft element is one a record runs on. A record lists every instance of a template, but its selector can narrow
// that to elements carrying a hook (`[data-peek]`, `closest('[data-mag]')`, `querySelector('[data-hero-img]')`): those elements only. A selector that names
// something inside the element, or no hook, passes. `facts` is the element's read; an unread element passes.
export function carriesHook( record, facts ) {
	const hook = /^\[(data-[\w-]+)\]$|closest\('\[(data-[\w-]+)\]'\)|querySelector\('\[(data-[\w-]+)\]'\)/.exec( String( record.element?.selector ?? '' ).trim() );
	return ! hook || ! facts?.data || facts.data.includes( hook[ 1 ] ?? hook[ 2 ] ?? hook[ 3 ] );
}

// A pseudo record's look: { state, looks: [ { property, from, to, duration_ms, delay_ms, easing } ] }. Null for any other record.
export function stateLook( record ) {
	const type = record.trigger?.type;
	if ( ! [ 'hover', 'focus', 'focus-visible', 'active' ].includes( type ) ) {
		return null;
	}
	const looks = ( record.properties || [] ).filter( ( p ) => null !== p.to && undefined !== p.to ).map( ( p ) => ( {
		property: p.property,
		from: p.from ?? null,
		to: p.to,
		duration_ms: 'number' === typeof p.duration_ms ? p.duration_ms : record.duration_ms,
		delay_ms: 'number' === typeof p.delay_ms ? p.delay_ms : 0,
		easing: p.easing ?? record.easing ?? null,
	} ) );
	return { state: type, looks };
}
