// Reveal states of a draft surface, the browser half (Spec 48 §3.4 step 1; the pure half is lib/reveal-merge.mjs). The
// inventory reads a draft in its opening state, which leaves out what a click shows. This finds the states that show more under
// a surface's root, from the draft's own logic and never by name, in two ways:
//   - toggles: each button or disclosure under the root is clicked through the draft's own handler, and the change to the logic
//     state it makes is kept when it shows new elements and hides none (a keyed `open` map, a step number); the state is put
//     back after each click;
//   - records: the states the handoff's surfaces.json records give for the components mounted on the page, which
//     lib/state-openers.mjs::stateWays turns into settable keys (a step of a form). A key the component's logic does not
//     hold, a width bound, a placeholder or the router's own `page` key is never set.
// A state counts only when the root then holds an element (key, tag and text) the opening state does not. Every state is put
// on with lib/intake-state.mjs::setDraftState, the same path the pairing and the applier use.
import { settleAnimations } from '../../parity/lib/devtools.mjs';
import { setDraftState, snapshotDraftState, restoreDraftState } from './intake-state.mjs';
import { openStates, stateWays } from './state-openers.mjs';
import { toggleStates, splitMerged, holdsAll, mergeRevealRecords } from './reveal-merge.mjs';
import fs from 'node:fs';
import path from 'node:path';

export const MAX_PROBES = 150;

// The handoff's surfaces.json records of a client (the draft's own states, lib/state-openers.mjs), or none when it has no such file.
export function handoffRecords( { repo, client } ) {
	const file = path.join( repo, 'sites', client, 'handoff', 'surfaces.json' );
	return fs.existsSync( file ) ? JSON.parse( fs.readFileSync( file, 'utf8' ) ).records ?? [] : [];
}
const SLOT = 'reveal';
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
export async function probeToggles( { rootSelector, max } ) {
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
	const clickable = ( e ) => {
		const k = Object.keys( e ).find( ( x ) => x.startsWith( '__reactProps$' ) );
		const handler = k && 'function' === typeof e[ k ].onClick;
		return ( handler || /^(button|summary)$/i.test( e.tagName ) || 'button' === e.getAttribute( 'role' ) || e.hasAttribute( 'aria-expanded' ) ) && ! e.closest( 'a[href]' ) && ! /^(input|select|textarea|a)$/i.test( e.tagName ) && 'submit' !== e.getAttribute( 'type' );
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
			d > 0 ? added.push( ...Array( d ).fill( s ) ) : ( removed -= d );
		}
		deltas.length && out.push( { label, deltas, added, removed } );
		await wait( 150 );
	}
	return { toggles: out };
}

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
	await settleSmall();
	return states;
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
		reads.push( { reveal: { component: st.component, keys: st.keys }, records: await read() } );
		await restoreDraftState( page, SLOT );
		await settleAnimations( page, { floor: 300, cap: 2000 } );
	}
	return mergeRevealRecords( base, reads );
}
