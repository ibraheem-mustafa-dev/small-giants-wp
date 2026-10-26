// Reaching a state-page draft's routes (Spec 48 FR-48-26, the `state-page` adapter): such a draft's router is a logic
// method (`go(page, extra)`) that sets `state.page`, so a URL cannot open a route. A route is reached the way the draft's own
// router moves it: the entry is opened, then the entry component's live logic instance is put in `{ page: <route> }`
// through the same setter the state opener uses (lib/intake-state.mjs::setDraftState), settled, and confirmed.
//
// A state route travels through every URL-shaped hand-off (a visit list, a harness hash, a Fill draft url, a walker
// config) as a reserved fragment, `#@state/page=<route>`, and `applyStateRoute` reads it back from the page's own address, so
// each consumer needs one call after its `goto` and no consumer parses routes itself. A hash or files draft never makes
// the fragment, so it is untouched.
import { setDraftState, readDraftState } from './intake-state.mjs';
import { settleAnimations } from '../../parity/lib/devtools.mjs';

// The name the runtime gives an entry draft served as the folder's index page (`Root`); a draft served under its own file
// name is hosted under that name, so the router's component is asked of the runtime (`window.__dcRootName()`).
export const ROOT_HOST = 'Root';
// The state key the adapter reads routes from (lib/intake-routing.mjs: `state.page`).
export const PAGE_KEY = 'page';
export const STATE_HASH = '@state/';

const routeName = ( route ) => String( route ?? '' ).replace( /^#?\/?/, '' );
export const isEntryRoute = ( route ) => null == route || [ '*', '/', '' ].includes( String( route ) );

// The fragment (no leading `#`) that opens `route` by state; '' for the entry route.
export const stateRouteHash = ( route ) => ( isEntryRoute( route ) ? '' : `${ STATE_HASH }${ PAGE_KEY }=${ routeName( route ) }` );

// { key, route } from a hash or url fragment (with or without `#`), or null when it is not a state route.
export function parseStateHash( hash ) {
	const m = /^#?@state\/([A-Za-z_$][\w$]*)=(.+)$/s.exec( String( hash ?? '' ) );
	return m ? { key: m[ 1 ], route: m[ 2 ] } : null;
}

// Whether a routing record (lib/intake-routing.mjs::readRouting) is a state-page export.
export const isStatePage = ( routing ) => 'state-page' === routing?.adapter;

// In-page: whether the runtime has mounted a component the draft's logic can be set on.
const mounted = () => !! document.querySelector( '#dc-root [data-dc-tpl]' ) && !! document.querySelector( '.sc-host' );

// Puts the entry component in `{ key: route }` on an open draft page and judges it: { ok, reached, reason }. `ok` when an
// instance was reached, its state then holds the route and the runtime still has a rendered tree (a route the draft cannot
// draw leaves a named reason, never a silent entry page).
export async function openStateRoute( page, { key = PAGE_KEY, route, component = null, timeout = 30000 } ) {
	await page.waitForFunction( mounted, null, { timeout } ).catch( () => {} );
	component ??= await page.evaluate( () => ( 'function' === typeof window.__dcRootName ? window.__dcRootName() : null ) ) ?? ROOT_HOST;
	const reached = await setDraftState( page, { component, keys: { [ key ]: route } } );
	if ( ! reached ) {
		return { ok: false, reached: 0, reason: `${ component } has no live instance to set ${ key }=${ route } on` };
	}
	await settleAnimations( page, { floor: 400, cap: 3000 } );
	const now = await readDraftState( page, { component, key } );
	if ( ! now.length || now.some( ( v ) => v !== route ) ) {
		return { ok: false, reached, reason: `${ key } is ${ JSON.stringify( now ) } after setting ${ JSON.stringify( route ) }: the draft's logic did not take the route` };
	}
	if ( ! await page.evaluate( mounted ) ) {
		return { ok: false, reached, reason: `the draft rendered nothing after ${ key }=${ route }` };
	}
	return { ok: true, reached, reason: null };
}

// Applies the state route the page's own address carries (a no-op, `null`, without one); throws when the route is not
// reached, which every caller already records as that visit's gap row.
export async function applyStateRoute( page, { timeout } = {} ) {
	const at = parseStateHash( await page.evaluate( () => location.hash ) );
	if ( ! at ) {
		return null;
	}
	const r = await openStateRoute( page, { ...at, timeout } );
	if ( ! r.ok ) {
		throw new Error( `state route ${ at.route } was not reached: ${ r.reason }` );
	}
	return r;
}

// Moves a loaded page to a visit's hash: a state route through its setter, any other hash by location.hash.
export async function moveToHash( page, hash ) {
	const at = parseStateHash( hash );
	if ( ! at ) {
		return page.evaluate( ( h ) => {
			window.location.hash = h;
		}, hash );
	}
	const r = await openStateRoute( page, at );
	if ( ! r.ok ) {
		throw new Error( `state route ${ at.route } was not reached: ${ r.reason }` );
	}
	return r;
}
