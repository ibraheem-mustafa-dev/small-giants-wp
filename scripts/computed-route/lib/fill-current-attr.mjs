// The current item a draft marks through a bound attribute (Spec 48 FR-48-81, register row C3): a header component takes the page
// it sits on as a prop (`current`) and writes `aria-current="{{ cur.shop }}"` and a bound `background: {{ act.shop }}` on each
// nav link, with no sc-if and no CSS selector, so neither the state reader (it enters states a stylesheet names) nor
// lib/fill-current-item.mjs (an sc-if inside a loop) meets it. The page the surface is read on may mark no link current (the
// home page is no nav item), so the reader opens the draft's other pages: where a peer of the item (a sibling of the same tag)
// has `aria-current` set, that peer's declared values against a non-current peer's are the item's `current` look, in
// lib/fill-state-read.mjs::readStates' shape, written by lib/fill-state.mjs::fillStates into the setting that holds the
// `current` state. The elements are found by template key, so the same nav element is read on every page that mounts the
// component; the page's own root component is never sampled (its elements exist on that page only).

import { declaredValues } from '../../parity/lib/devtools.mjs';
import { declaredDiff } from './fill-state-read.mjs';
import { renderedOf } from './fill-state-apply.mjs';
import { templateKeyOf, parseTemplateKey, parseInstanceKey } from './fact-key.mjs';

const ATTR_HOLE = 'attr:aria-current';
const MARK = 'data-sgs-current-read';

// The template keys (`<component>/<tpl>`) of the elements whose `aria-current` the draft binds to a value.
export function currentAttrKeys( facts ) {
	return Object.entries( facts?.elements || {} ).filter( ( [ , e ] ) => ( e.template?.holes || [] ).some( ( h ) => ATTR_HOLE === h.where ) ).map( ( [ key ] ) => key );
}

// The jobs (lib/fill-read.mjs::jobsFor) that are one of those elements, each with the component that mounts it and its tpl.
// A job inside the page's own root component is dropped: no other page holds that element.
export function currentAttrJobs( keys, jobs, rootComponent = null ) {
	const set = new Set( keys );
	const out = [];
	for ( const job of jobs ) {
		const instance = parseInstanceKey( job?.finder?.tpl );
		const key = templateKeyOf( job?.finder?.tpl, rootComponent );
		if ( ! instance || instance.chain.length < 2 || ! set.has( key ) ) {
			continue;
		}
		const parsed = parseTemplateKey( key );
		out.push( { id: job.id, component: parsed.dc, tpl: parsed.tpl } );
	}
	return out;
}

// In the page: marks one peer that carries a current value and one that does not, among the siblings of the same tag as the
// element `tpl` of the component's host. Returns whether both were found.
export function markPeers( [ component, tpl, mark ] ) {
	const set = ( el ) => {
		const v = el.getAttribute( 'aria-current' );
		return null !== v && '' !== v && 'false' !== v;
	};
	const shown = ( el ) => el.getClientRects().length > 0;
	document.querySelectorAll( `[${ mark }]` ).forEach( ( e ) => e.removeAttribute( mark ) );
	for ( const host of document.querySelectorAll( `.sc-host[data-sc-name="${ component }"]` ) ) {
		const item = [ ...host.querySelectorAll( `[data-dc-tpl="${ tpl }"]` ) ].find( ( e ) => e.closest( '.sc-host' ) === host && shown( e ) );
		if ( ! item ) {
			continue;
		}
		const peers = [ ...item.parentElement.children ].filter( ( p ) => p.tagName === item.tagName && shown( p ) );
		const cur = peers.find( set );
		const oth = ! set( item ) ? item : peers.find( ( p ) => ! set( p ) );
		if ( cur && oth ) {
			cur.setAttribute( mark, 'cur' );
			oth.setAttribute( mark, 'oth' );
			return true;
		}
	}
	return false;
}

// Reads the current-attribute looks at the width the open pages are set to: { looks: { [jobId]: [look] }, gaps: [ { ids, reason } ] }.
// jobs: currentAttrJobs; pages: the addresses of the draft's other pages; openSibling( url ): { page, cdp, close } on that page at
// this width (the caller's own settings: the state opener, the route rules). The first page that marks a peer current
// answers a job; a job no page answers is one gap row.
export async function readCurrentAttr( { jobs, pages, openSibling, resolveSrc, log = () => {} } ) {
	const out = { looks: {}, gaps: [] };
	let open = jobs.slice();
	for ( const url of pages ) {
		if ( ! open.length ) {
			break;
		}
		let sib = null;
		try {
			sib = await openSibling( url );
			const left = [];
			for ( const job of open ) {
				if ( ! await sib.page.evaluate( markPeers, [ job.component, job.tpl, MARK ] ) ) {
					left.push( job );
					continue;
				}
				const sel = { cur: `[${ MARK }="cur"]`, oth: `[${ MARK }="oth"]` };
				const cur = await declaredValues( sib.cdp, sel.cur, resolveSrc, null ).catch( () => null );
				const oth = await declaredValues( sib.cdp, sel.oth, resolveSrc, null ).catch( () => null );
				const changed = cur && oth ? declaredDiff( oth, cur ) : {};
				if ( ! Object.keys( changed ).length ) {
					left.push( job );
					continue;
				}
				const rendered = await sib.page.evaluate( renderedOf, [ sel.cur, resolveSrc, Object.keys( changed ) ] );
				( out.looks[ job.id ] ??= [] ).push( { states: [ 'current' ], family: 'aria', selector: `[aria-current] on ${ new URL( url ).pathname.replace( /^\//, '' ) }`, tokens: [ '[aria-current]' ], declared: changed, rendered, read: 'entered' } );
			}
			open = left;
		} catch ( e ) {
			log( `current-attribute read of ${ url } failed: ${ e.message }` );
		} finally {
			await sib?.close();
		}
	}
	for ( const job of open ) {
		out.gaps.push( { ids: [ job.id ], reason: 'current-attribute: the draft binds aria-current on this item, but no other page of the draft marks a peer current with a different look at this width, so its current look is not read' } );
	}
	return out;
}
