// The role the page map gives a skeleton surface (Spec 48 FR-48-30; plan 2026-10-23-cloning-tool-completion S5): a choice
// flow (an `sgs_choice_flow` row whose draftId names the surface's surfaces.json record, Spec 43), a part another row's block
// draws (a part with owner `block`, such as the cart page's bag drawer), or a part another row holds with no row of its own
// (`ownedPart`, FR-48-87): a part the page map names by the surface's record (owner `woocommerce`, `page` or `draft-notes`),
// or a surface other than a page, header or footer on a WooCommerce row's page (lib/intake-pagemap-owners.mjs::isWooRow,
// the page map's own rule: a form or modal there is WooCommerce's), its route the row's or one the row folds in (`folds`,
// a signed-in view folded into the account row). Such a surface is drawn by its owner and never built as its own form or
// blocks. surfaces.json has no choice-flow kind (a flow is a `modal` or a `form` record there), so the page map is the only
// source; nothing is read from a name.
//
// A part names its surface by `surfaces.json <id>`, or by the draft tag the page map read (`<file>:<line>:<col> <tag
// aria-label="…">`, lib/intake-pagemap-surfaces.mjs::tagId), matched to an element of the surface's inventory with the same
// component, tag and aria-label. The line is not compared: the page map counts lines in the file, the template in its own text.
import { isWooRow } from './intake-pagemap-owners.mjs';

// The parts of a page-map tag id: { file stem, tag, ariaLabel } or null.
export function parseTagId( draftId ) {
	const hit = /^(.+?)\.dc\.html:\d+:\d+ <([a-z][a-z0-9-]*)(?: aria-label="([^"]*)")?>$/.exec( String( draftId ?? '' ) );
	return hit ? { component: hit[ 1 ], tag: hit[ 2 ], ariaLabel: hit[ 3 ] ?? null } : null;
}

// The component an inventory element was stamped in: its record entry's, else the last host of its import chain.
const componentOf = ( e, view ) => view?.entry( e )?.template.component ?? String( e.template ?? '' ).split( '>' ).pop().replace( /@.*$/, '' );

// Whether a page-map draftId names this surface: its surfaces.json id, or a tag id one of its rendered elements carries.
function names( draftId, { id, m, view } ) {
	if ( id && draftId === `surfaces.json ${ id }` ) {
		return true;
	}
	const t = parseTagId( draftId );
	return !! t && !! m && m.els.some( ( e ) => ( view?.realTag( e ) ?? e.tag ) === t.tag && componentOf( e, view ) === t.component && ( null == t.ariaLabel || ( view?.attr( e, 'aria-label' ) ?? e.attrs?.[ 'aria-label' ] ) === t.ariaLabel ) );
}

// A route without its query string and its fragment (`SignIn.dc.html?mode=register` is the SignIn page). A fragment that is
// itself a route (`#/account`, a hash-routed draft) is kept, without its own query string.
export const routePath = ( route ) => {
	if ( null == route ) {
		return null;
	}
	const [ base, ...rest ] = String( route ).split( '#' );
	const hash = rest.join( '#' );
	return `${ base.split( '?' )[ 0 ] }${ hash.startsWith( '/' ) ? `#${ hash.split( '?' )[ 0 ] }` : '' }`;
};

// The page-map row whose page is `route`: the row's own route, or one it folds in (`folds`, the twin rule).
export const rowOfRoute = ( rows, route ) => {
	const at = routePath( route );
	return at ? rows.find( ( r ) => ( r.route && routePath( r.route ) === at ) || ( r.folds || [] ).some( ( f ) => routePath( f ) === at ) ) || null : null;
};

// The surface kinds that are never another row's part here: a page is a row, and a page's own header or footer is that
// page's layout, built on its own surface.
const NOT_PARTS = new Set( [ 'page', 'header', 'footer' ] );
const OWNERS = new Set( [ 'woocommerce', 'page', 'draft-notes' ] );

// o: { pageMap (the page-map rows), id (the surface's surfaces.json id), kind (its surfaces.json kind: a part is a surface
// of its own kind only, so a header whose markup holds the drawer is never the drawer), name (its surfaces.json name), route
// (its surfaces.json route), m (lib/skeleton-model.mjs), view (lib/skeleton-record.mjs::recordView), postType
// (rules.choiceFlow.postType) }. Returns { role: 'choiceFlow', row } | { role: 'blockPart', row, part } | { role: 'ownedPart',
// row, part } | null.
export function surfaceRole( { pageMap = [], id = null, kind = null, name = null, route = null, m = null, view = null, postType = 'sgs_choice_flow' } ) {
	const rows = Array.isArray( pageMap ) ? pageMap : [];
	const flow = id ? rows.find( ( r ) => r.postType === postType && r.draftId === `surfaces.json ${ id }` ) : null;
	if ( flow ) {
		return { role: 'choiceFlow', row: flow };
	}
	for ( const row of rows ) {
		const part = ( row.parts || [] ).find( ( p ) => 'block' === p.owner && p.kind === kind && names( p.draftId, { id, m, view } ) );
		if ( part ) {
			return { role: 'blockPart', row, part };
		}
	}
	// A surface with a row of its own (a saved form, a modal, a drawer) is built as that row, whatever page holds it.
	if ( ! id || NOT_PARTS.has( kind ) || rows.some( ( r ) => r.draftId === `surfaces.json ${ id }` ) ) {
		return null;
	}
	for ( const row of rows ) {
		const part = ( row.parts || [] ).find( ( p ) => OWNERS.has( p.owner ) && p.draftId === `surfaces.json ${ id }` );
		if ( part ) {
			return { role: 'ownedPart', row, part };
		}
	}
	const woo = rowOfRoute( rows, route );
	return isWooRow( woo ) ? { role: 'ownedPart', row: woo, part: { kind, label: name ?? id, owner: 'woocommerce', draftId: `surfaces.json ${ id }` } } : null;
}

// The fact record's surfaces of `kind` that the page map hands to another row's block, seen from any surface (a header
// holding the control that opens one): each surface's elements are the record entries at or under its roots, matched to
// the part's draftId as surfaceRole matches a surface's own inventory. o: { pageMap, surfaces (the record's surfaces by
// id), elements (the record's elements by key), kind }. Returns [ { surface, row, part } ].
export function blockPartSurfaces( { pageMap = [], surfaces = {}, elements = {}, kind = 'drawer' } ) {
	const all = Object.values( elements );
	return Object.values( surfaces ).filter( ( s ) => s.kind === kind ).flatMap( ( s ) => {
		const roots = new Set( s.roots || [] );
		const els = all.filter( ( x ) => roots.has( x.template.key ) || ( x.template.parentChain || [] ).some( ( k ) => roots.has( k ) ) )
			.map( ( x ) => ( { tag: x.template.realTag ?? x.template.tag, template: x.template.component, attrs: x.template.attrs || {} } ) );
		const role = surfaceRole( { pageMap, id: s.id, kind: s.kind, m: { els } } );
		return 'blockPart' === role?.role ? [ { surface: s, row: role.row, part: role.part } ] : [];
	} );
}
