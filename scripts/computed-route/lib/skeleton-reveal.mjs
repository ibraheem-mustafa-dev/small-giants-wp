// Reveal states of a draft surface, the browser half (Spec 48 §3.4 step 1; the pure half is lib/reveal-merge.mjs). The
// inventory reads a draft in its opening state, which leaves out what a click shows. This finds the states that show more under
// a surface's root, from the draft's own logic and never by name, in two ways:
//   - toggles: each button or disclosure under the root is clicked through the draft's own handler, and the change to the logic
//     state it makes is kept when it shows new elements and hides none (a keyed `open` map, a step number); the state is put
//     back after each click;
//   - records: the states the handoff's surfaces.json records give for the components mounted on the page, which
//     lib/state-openers.mjs::stateWays turns into settable keys (a step of a form). A key the component's logic does not
//     hold, a width bound, a placeholder or the router's own `page` key is never set;
//   - nested: with each of those states on, the controls inside it are clicked the same way (a choice that shows an address
//     block, a business type that shows more fields); a change that shows new elements and hides none is kept as the state's
//     keys plus the change's. One level only: a nested state is never probed again, and at most MAX_NESTED are kept.
// A state counts only when the root then holds an element (key, tag and text) the opening state does not. Every state is put
// on with lib/intake-state.mjs::setDraftState, the same path the pairing and the applier use.
import { settleAnimations } from '../../parity/lib/devtools.mjs';
import { setDraftState, snapshotDraftState, restoreDraftState } from './intake-state.mjs';
import { openStates, stateWays } from './state-openers.mjs';
import { toggleStates, splitMerged, holdsAll, mergeRevealRecords, revealId } from './reveal-merge.mjs';
import fs from 'node:fs';
import path from 'node:path';

export const MAX_PROBES = 150;
export const MAX_NESTED = 24;
export const NESTED_PROBES = 60;

// The handoff's surfaces.json records of a client (the draft's own states, lib/state-openers.mjs), or none when it has no such file.
export function handoffRecords( { repo, client } ) {
	const file = path.join( repo, 'sites', client, 'handoff', 'surfaces.json' );
	return fs.existsSync( file ) ? JSON.parse( fs.readFileSync( file, 'utf8' ) ).records ?? [] : [];
}
const SLOT = 'reveal';
// The signature of a drawn mark (an svg and its parts): its going away is not content hidden (countSigs).
const DRAWN = /\|(svg|path|circle|line|polyline|polygon|rect|g|use)\|/;
const WIDTH_KEY = /^(w|width|vw)$/i;
const ROUTE_KEY = 'page';

// In-page (self-contained). How many elements of each signature (host/tpl|tag|own text) the root holds.
export function countSigs( rootSelector ) {
	const root = document.querySelector( rootSelector );
	const out = {};
	if ( ! root ) {
		return out;
	}
	const ws = ( s ) => ( s || '' ).replace( /\s+/g, ' ' ).trim();
	for ( const e of [ root, ...root.querySelectorAll( '[data-dc-tpl]' ) ] ) {
		if ( ! e.hasAttribute( 'data-dc-tpl' ) ) {
			continue;
		}
		let own = '';
		for ( const c of e.childNodes ) {
			if ( 3 === c.nodeType ) {
				own += `${ c.nodeValue } `;
			} else if ( 1 === c.nodeType && ! c.hasAttribute( 'data-dc-tpl' ) ) {
				own += `${ c.textContent } `;
			}
		}
		const host = e.parentElement ? e.parentElement.closest( '.sc-host' ) : null;
		const sig = `${ host ? host.dataset.scName : '' }/${ e.dataset.dcTpl }|${ e.tagName.toLowerCase() }|${ ws( own ) }`;
		out[ sig ] = ( out[ sig ] || 0 ) + 1;
	}
	return out;
}

// In-page. The mounted components and the state keys each one's logic holds: [ { name, keys } ].
export function mountedComponents() {
	const seen = new Map();
	for ( const host of document.querySelectorAll( '.sc-host' ) ) {
		const name = host.dataset.scName;
		const k = Object.keys( host ).find( ( x ) => x.startsWith( '__reactFiber$' ) );
		let f = k ? host[ k ] : null;
		while ( f && ! ( f.stateNode && f.stateNode.logic && f.stateNode.__name === name ) ) {
			f = f.return;
		}
		if ( f && ! seen.has( name ) ) {
			seen.set( name, Object.keys( f.stateNode.logic.state || {} ) );
		}
	}
	return [ ...seen ].map( ( [ name, keys ] ) => ( { name, keys } ) );
}

// In-page (self-contained). Clicks, one at a time, each control under the root through the draft's own handler (the click's
// default action prevented, so a link never navigates), and records what it did: [ { label, deltas: [ { component, key, before,
// after } ], added: [ signature ], removed } ]. The logic state and the address are put back after every click.
export async function probeToggles( { rootSelector, max, choices = false } ) {
	const root = document.querySelector( rootSelector );
	if ( ! root ) {
		return { error: `no element matches ${ rootSelector }` };
	}
	const wait = ( ms ) => new Promise( ( r ) => setTimeout( r, ms ) );
	const ws = ( s ) => ( s || '' ).replace( /\s+/g, ' ' ).trim();
	const logics = () => {
		const out = [];
		for ( const host of document.querySelectorAll( '.sc-host' ) ) {
			const name = host.dataset.scName;
			const k = Object.keys( host ).find( ( x ) => x.startsWith( '__reactFiber$' ) );
			let f = k ? host[ k ] : null;
			while ( f && ! ( f.stateNode && f.stateNode.logic && f.stateNode.__name === name ) ) {
				f = f.return;
			}
			f && out.push( { name, logic: f.stateNode.logic } );
		}
		return out;
	};
	const counts = () => {
		const out = {};
		for ( const e of [ root, ...root.querySelectorAll( '[data-dc-tpl]' ) ] ) {
			if ( ! e.hasAttribute( 'data-dc-tpl' ) ) {
				continue;
			}
			let own = '';
			for ( const c of e.childNodes ) {
				if ( 3 === c.nodeType ) {
					own += `${ c.nodeValue } `;
				} else if ( 1 === c.nodeType && ! c.hasAttribute( 'data-dc-tpl' ) ) {
					own += `${ c.textContent } `;
				}
			}
			const host = e.parentElement ? e.parentElement.closest( '.sc-host' ) : null;
			const sig = `${ host ? host.dataset.scName : '' }/${ e.dataset.dcTpl }|${ e.tagName.toLowerCase() }|${ ws( own ) }`;
			out[ sig ] = ( out[ sig ] || 0 ) + 1;
		}
		return out;
	};
	// `choices`: a checkbox or radio is clicked too (a choice inside a state, such as "deliver to this address").
	const clickable = ( e ) => {
		const k = Object.keys( e ).find( ( x ) => x.startsWith( '__reactProps$' ) );
		const handler = k && 'function' === typeof e[ k ].onClick;
		const choice = choices && 'input' === e.tagName.toLowerCase() && /^(checkbox|radio)$/i.test( e.getAttribute( 'type' ) || '' );
		return ( choice || ( ( handler || /^(button|summary)$/i.test( e.tagName ) || 'button' === e.getAttribute( 'role' ) || e.hasAttribute( 'aria-expanded' ) ) && ! e.closest( 'a[href]' ) && ! /^(input|select|textarea|a)$/i.test( e.tagName ) && 'submit' !== e.getAttribute( 'type' ) ) );
	};
	const list = () => [ ...root.querySelectorAll( '[data-dc-tpl]' ) ].filter( clickable );
	const plain = ( v ) => {
		try {
			const t = JSON.stringify( v );
			return undefined === t ? undefined : JSON.parse( t );
		} catch {
			return undefined;
		}
	};
	const out = [];
	const hash = location.hash;
	const n = Math.min( list().length, max );
	for ( let i = 0; i < n; i++ ) {
		const el = list()[ i ];
		if ( ! el ) {
			break;
		}
		const label = ws( el.textContent ).slice( 0, 60 );
		const was = logics().map( ( x ) => ( { ...x, state: { ...x.logic.state } } ) );
		const before = counts();
		const stop = ( e ) => e.preventDefault();
		window.addEventListener( 'click', stop );
		try {
			el.dispatchEvent( new MouseEvent( 'click', { bubbles: true, cancelable: true, composed: true } ) );
		} finally {
			window.removeEventListener( 'click', stop );
		}
		await wait( 250 );
		const after = counts();
		const deltas = [];
		for ( const x of was ) {
			for ( const key of Object.keys( x.logic.state ) ) {
				if ( x.logic.state[ key ] !== x.state[ key ] && undefined !== plain( x.logic.state[ key ] ) ) {
					deltas.push( { component: x.name, key, before: plain( x.state[ key ] ), after: plain( x.logic.state[ key ] ) } );
				}
			}
		}
		for ( const x of was ) {
			const back = {};
			Object.keys( x.logic.state ).filter( ( k ) => x.logic.state[ k ] !== x.state[ k ] ).forEach( ( k ) => ( back[ k ] = x.state[ k ] ) );
			Object.keys( back ).length && x.logic.setState( back );
		}
		if ( location.hash !== hash ) {
			history.replaceState( null, '', `${ location.pathname }${ location.search }${ hash }` );
		}
		const added = [];
		let removed = 0;
		for ( const s of new Set( [ ...Object.keys( before ), ...Object.keys( after ) ] ) ) {
			const d = ( after[ s ] || 0 ) - ( before[ s ] || 0 );
			d > 0 && added.push( ...Array( d ).fill( s ) );
			d < 0 && ( removed -= choices ? 0 : d );
		}
		// Inside a state (`choices`) an element is hidden only when fewer elements of its template and tag remain: a drawn mark
		// that goes away (a ticked box's tick) or a status line whose text changes is not content hidden.
		if ( choices ) {
			const shape = ( c ) => Object.entries( c ).reduce( ( m, [ sig, n ] ) => m.set( sig.replace( /\|[^|]*$/, '' ), ( m.get( sig.replace( /\|[^|]*$/, '' ) ) || 0 ) + n ), new Map() );
			const was = shape( before );
			const now = shape( after );
			for ( const [ k, n ] of was ) {
				removed += /\|(svg|path|circle|line|polyline|polygon|rect|g|use)$/.test( k ) ? 0 : Math.max( 0, n - ( now.get( k ) || 0 ) );
			}
		}
		deltas.length && out.push( { label, deltas, added, removed } );
		await wait( 150 );
	}
	return { toggles: out };
}

// Whether every element of the first read (by template and tag, not by text) is still there in the second, drawn marks aside.
const shapeKeeps = ( base, now ) => {
	const shape = ( c ) => Object.entries( c ).reduce( ( m, [ sig, n ] ) => m.set( sig.replace( /\|[^|]*$/, '' ), ( m.get( sig.replace( /\|[^|]*$/, '' ) ) || 0 ) + n ), new Map() );
	const had = shape( now );
	return [ ...shape( base ) ].every( ( [ k, n ] ) => DRAWN.test( `${ k }|` ) || ( had.get( k ) || 0 ) >= n );
};

const grew = ( base, now ) => Object.keys( now ).some( ( s ) => ( now[ s ] || 0 ) > ( base[ s ] || 0 ) );

// The states under `root` that show more than the opening state. page: the draft open in its opening state; records: the
// handoff's surfaces.json records. Returns [ { component, keys, covers?, merged?, source } ]; the page is back in its opening
// state.
export async function discoverReveals( page, { root, records = [], log = () => {} } ) {
	const base = await page.evaluate( countSigs, root );
	const settleSmall = () => settleAnimations( page, { floor: 400, cap: 2500 } );
	const states = [];
	const probe = await page.evaluate( probeToggles, { rootSelector: root, max: MAX_PROBES } );
	if ( probe.error ) {
		throw new Error( probe.error );
	}
	await settleSmall();
	const toggles = probe.toggles;
	await snapshotDraftState( page, SLOT );
	for ( const st of toggleStates( toggles ) ) {
		await setDraftState( page, st );
		await settleSmall();
		const now = await page.evaluate( countSigs, root );
		await restoreDraftState( page, SLOT );
		if ( ! st.merged || holdsAll( { opening: base, merged: now, toggles, covers: st.covers } ) ) {
			states.push( { ...st, source: 'toggle' } );
			continue;
		}
		log( `reveal: ${ st.covers.length } toggles are not all shown together; read one at a time` );
		states.push( ...splitMerged( st, toggles ).map( ( s ) => ( { ...s, source: 'toggle' } ) ) );
	}
	const mounted = await page.evaluate( mountedComponents );
	const tried = new Set( states.map( ( s ) => JSON.stringify( [ s.component, s.keys ] ) ) );
	for ( const { name, keys } of mounted ) {
		const own = ( records || [] ).filter( ( r ) => r.dc === name ).flatMap( ( r ) => r.states || [] );
		const { ways } = stateWays( openStates( own ), { own: new Set(), live: { keys, widthKeys: [] } } );
		for ( const way of ways ) {
			const usable = 'state' === way.via && ! way.bounds.length && ! Object.keys( way.keys ).some( ( k ) => WIDTH_KEY.test( k ) || ROUTE_KEY === k );
			const id = JSON.stringify( [ name, way.keys ] );
			if ( ! usable || tried.has( id ) ) {
				continue;
			}
			tried.add( id );
			await setDraftState( page, { component: name, keys: way.keys } );
			await settleSmall();
			const now = await page.evaluate( countSigs, root );
			await restoreDraftState( page, SLOT );
			grew( base, now ) && states.push( { component: name, keys: way.keys, covers: [], merged: false, source: 'record', label: way.state } );
		}
	}
	const nested = await discoverNested( page, { root, parents: states, seen: tried, settle: settleSmall, log } );
	states.push( ...nested );
	await settleSmall();
	return states;
}

// The states inside the given states: each parent is put on, the controls under the root are clicked, and a click that shows new
// elements and hides none (relative to the parent) gives the state `{ parent keys, the click's keys }`. A click that sets a key
// the parent sets, or one of another component, is not a refinement of the parent and is left out. The page is back in its
// opening state. seen: the ids ([ component, keys ] as JSON) of states already found, which a nested state must not repeat. A
// nested state is kept only when it shows an element (a signature, countSigs) that neither the opening state nor any parent shows,
// so a combination of states that only repeats what they show on their own is not a state, and only when no kept nested state adds
// the same elements. Checkboxes and radios are clicked as well as buttons.
export async function discoverNested( page, { root, parents, seen, settle, log = () => {} } ) {
	const found = [];
	if ( ! parents.length ) {
		return found;
	}
	await snapshotDraftState( page, SLOT );
	const known = await page.evaluate( countSigs, root );
	// What each kept nested state adds over its parent: a state that adds the same as one kept already (the six business-type tiles
	// each show the same selected mark) is the same state.
	const adds = new Set();
	for ( const parent of parents ) {
		if ( await setDraftState( page, parent ) ) {
			await settle();
			const counts = await page.evaluate( countSigs, root );
			Object.entries( counts ).forEach( ( [ sig, n ] ) => ( known[ sig ] = Math.max( known[ sig ] || 0, n ) ) );
		}
		await restoreDraftState( page, SLOT );
	}
	for ( const parent of parents ) {
		if ( found.length >= MAX_NESTED ) {
			log( `reveal: nested states stop at ${ MAX_NESTED }` );
			break;
		}
		if ( ! await setDraftState( page, parent ) ) {
			continue;
		}
		await settle();
		const base = await page.evaluate( countSigs, root );
		const probe = await page.evaluate( probeToggles, { rootSelector: root, max: NESTED_PROBES, choices: true } );
		await settle();
		const toggles = probe.toggles || [];
		for ( const st of toggleStates( toggles ) ) {
			const own = Object.keys( st.keys );
			if ( st.component !== parent.component || own.some( ( k ) => k in parent.keys ) ) {
				continue;
			}
			const keys = { ...parent.keys, ...st.keys };
			const id = JSON.stringify( [ parent.component, keys ] );
			if ( seen.has( id ) || found.length >= MAX_NESTED ) {
				continue;
			}
			await setDraftState( page, { component: parent.component, keys } );
			await settle();
			const now = await page.evaluate( countSigs, root );
			// Kept only when it still shows everything the parent showed and an element no known state shows.
			const keeps = shapeKeeps( base, now );
			seen.add( id );
			const addedKey = JSON.stringify( Object.keys( now ).filter( ( sig ) => ( now[ sig ] || 0 ) > ( base[ sig ] || 0 ) ).sort() );
			const fresh = keeps && grew( known, now ) && ! adds.has( addedKey );
			fresh && adds.add( addedKey );
			fresh && found.push( { component: parent.component, keys, covers: [], merged: false, source: 'nested', of: revealId( parent ), label: `${ JSON.stringify( parent.keys ) } then ${ JSON.stringify( st.keys ) }` } );
			await restoreDraftState( page, SLOT );
			await setDraftState( page, parent );
			await settle();
		}
		await restoreDraftState( page, SLOT );
	}
	return found;
}

// The records each state shows, merged into the opening records. page: in its opening state; states: from discoverReveals;
// read: async () => the records of the root as the page shows it now; base: the opening state's records. Every state is put on,
// read and put back. Returns the merged records.
export async function readReveals( { page, states, read, base, log = () => {} } ) {
	if ( ! states.length ) {
		return base;
	}
	const reads = [];
	await snapshotDraftState( page, SLOT );
	for ( const st of states ) {
		if ( ! await setDraftState( page, st ) ) {
			log( `reveal ${ JSON.stringify( st.keys ) }: ${ st.component } is not mounted` );
			continue;
		}
		await settleAnimations( page, { floor: 500, cap: 3000 } );
		reads.push( { reveal: { component: st.component, keys: st.keys }, records: await read(), ...( st.of ? { of: st.of } : {} ) } );
		await restoreDraftState( page, SLOT );
		await settleAnimations( page, { floor: 300, cap: 2000 } );
	}
	return mergeRevealRecords( base, reads );
}
