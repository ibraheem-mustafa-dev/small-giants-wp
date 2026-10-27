// A draft link's destination as the site address of the page-map row it reaches (Spec 48 FR-48-6 "Links", over FR-48-26's
// routing adapters and FR-48-30's page map). A Claude Design draft links by draft route: a hash key (`#/contact`), a page
// file (`Contact.dc.html?x=1#part`) or a click handler that calls the page setter (`go('contact')`). None of those exists on
// the built site, so every writer of a link setting asks `resolveDraftLink` and writes what it answers:
//   - `address`: the row's root-relative address (`/`, `/about/our-story/`, `/shop/`, a post's `/<slug>/`), the draft's
//     `#fragment` kept (`Home.dc.html#build` gives `/#build`) and its query dropped (`dropped` names it);
//   - `external` (a scheme or `//` link), `site` (already root-relative) and `anchor` (an in-page `#part`): the href as it is;
//   - `none`: a bare `#` or empty href whose click handler reaches no single page (url left empty, as before);
//   - `unresolved`: a draft route no row holds, a product the page map has no product for, or a row that makes no page (the
//     order confirmation): never written; `owner` and `why` make the handover row;
//   - `other`: a relative link that is no draft route (an asset path), as it is.
// `draftLinksFor` reads the client's context once: the confirmed page map, the routing intake recorded, and the page map's
// own route-to-row matching (lib/intake-pagemap.mjs::proposePageMap `routeSlug`), which holds the routes two draft pages
// share one row through (a signed-out and a signed-in view of the account page).
import fs from 'fs';
import path from 'path';
import { resolveRef } from './handoff.mjs';
import { permalinkOf } from './fill-route.mjs';
import { PERMALINKS } from './site-build-plan.mjs';
import { proposePageMap } from './intake-pagemap.mjs';

const EXTERNAL = /^([a-z][a-z0-9+.-]*:|\/\/)/i;
const FILE = /^(.+?\.dc\.html):\d+/;
const isFront = ( row ) => 'front-page' === row.template;

// The `{{ x }}` expression of a click handler value, or null.
export const handlerOf = ( value ) => /^\s*\{\{\s*([^}\s]+)\s*\}\}\s*$/.exec( String( value ?? '' ) )?.[ 1 ] ?? null;

// The click handler an inventory element's own markup carries (`sc-camel-on-click="{{ goHelp }}"`), or null.
export const elementHandler = ( e ) => /sc-camel-on-click="(\{\{[^"]*\}\})"/.exec( e?.snippet || '' )?.[ 1 ] ?? null;

// The draft file an inventory element's template lives in.
export const elementFile = ( e ) => ( e?.template ? `${ e.template }.dc.html` : '' );

// The resolver context from its parts: `rows` the page map, `routing` intake's { adapter, links } (FR-48-26), `routeSlug`
// { route: slug } the page map's matching and `proposed` the proposed rows it names slugs from. A route the confirmed map
// holds is its row; a route the proposal folded into another row (routeSlug names that row's slug) is the confirmed row of
// the same route, else of the same slug. `goRoutes` maps `<file>\0<handler>` to the routes the handler reaches.
export function linkContext( { rows = [], routing = null, routeSlug = {}, proposed = [] } ) {
	const routeRow = new Map( rows.filter( ( r ) => r.route ).map( ( r ) => [ r.route, r ] ) );
	for ( const [ route, slug ] of Object.entries( routeSlug || {} ) ) {
		if ( routeRow.has( route ) ) {
			continue;
		}
		const p = proposed.find( ( r ) => r.slug === slug && r.route );
		const row = ( p && routeRow.get( p.route ) ) || rows.find( ( r ) => r.slug === slug && r.route && ( ! p || r.postType === p.postType ) );
		row && routeRow.set( route, row );
	}
	const goRoutes = new Map();
	for ( const l of routing?.links || [] ) {
		const file = FILE.exec( l.from || '' )?.[ 1 ];
		const h = handlerOf( /onClick="([^"]*)"/.exec( l.call || '' )?.[ 1 ] );
		if ( file && h ) {
			const k = `${ file }\u0000${ h }`;
			goRoutes.set( k, new Set( [ ...( goRoutes.get( k ) || [] ), l.route ?? null ] ) );
		}
	}
	return { adapter: routing?.adapter ?? null, rows, routeRow, goRoutes };
}

// The site address of one row, or { owner, why } when the row makes no page.
function rowAddress( row, rows, query ) {
	if ( 'product' === row.postType ) {
		const id = query.get( 'id' );
		return { owner: 'product-data', why: `the draft product ${ id ? `"${ id }"` : 'with no id' } has no product in the page map (its ${ row.slug } row is WooCommerce's single-product template; products are WooCommerce data)` };
	}
	if ( 'post' === row.postType ) {
		return { address: PERMALINKS.replace( '%postname%', row.slug ) };
	}
	if ( [ 'page', 'shop' ].includes( row.postType ) ) {
		const address = isFront( row ) ? '/' : permalinkOf( row, rows );
		return address ? { address } : { owner: 'content-page', why: `the ${ row.slug } row's parents name no page` };
	}
	return { owner: 'content-page', why: `the ${ row.postType }:${ row.slug } row makes no page to link to` };
}

function toRow( route, ctx, { query = new URLSearchParams(), fragment = '' } = {} ) {
	const row = ctx?.routeRow.get( route );
	if ( ! row ) {
		return { kind: 'unresolved', route, owner: 'content-page', why: `no page-map row holds the draft route "${ route }"` };
	}
	const at = rowAddress( row, ctx.rows, query );
	if ( ! at.address ) {
		return { kind: 'unresolved', route, owner: at.owner, why: at.why };
	}
	const dropped = [ ...query.keys() ].length ? `?${ query.toString() }` : null;
	return { kind: 'address', value: `${ at.address }${ fragment ? `#${ fragment }` : '' }`, route, ...( dropped ? { dropped } : {} ) };
}

// One draft href (and, for `#` or an empty href, the element's click handler) resolved. o: { file (the draft file the link
// sits in), handler (its `{{ x }}` click handler) }. `ctx` null resolves with no page map: every draft route is unresolved.
export function resolveDraftLink( href, ctx, { file = '', handler = null } = {} ) {
	const h = String( href ?? '' ).trim();
	if ( ! h || '#' === h ) {
		const routes = [ ...( ctx?.goRoutes.get( `${ file }\u0000${ handlerOf( handler ) }` ) || [] ) ];
		if ( 1 === routes.length && null !== routes[ 0 ] ) {
			return toRow( routes[ 0 ], ctx );
		}
		const named = routes.filter( ( x ) => null !== x );
		return { kind: 'none', ...( named.length ? { routes: named } : {} ) };
	}
	if ( EXTERNAL.test( h ) ) {
		return { kind: 'external', value: h };
	}
	if ( h.startsWith( '/' ) ) {
		return { kind: 'site', value: h };
	}
	if ( h.startsWith( '#' ) ) {
		const slash = h.startsWith( '#/' );
		const key = h.slice( slash ? 2 : 1 ).split( /[?#]/ )[ 0 ].replace( /\/+$/, '' );
		const front = ctx?.rows.find( ( r ) => isFront( r ) && r.route );
		if ( slash && '' === key ) {
			return front ? toRow( front.route, ctx ) : { kind: 'unresolved', route: '', owner: 'content-page', why: 'the page map has no front page for the draft\'s home route' };
		}
		if ( slash || ( 'hash' === ctx?.adapter && ctx.routeRow.has( key ) ) ) {
			return toRow( key, ctx );
		}
		return { kind: 'anchor', value: h };
	}
	const cut = h.search( /[?#]/ );
	const p = cut < 0 ? h : h.slice( 0, cut );
	const rest = cut < 0 ? '' : h.slice( cut );
	const hashAt = rest.indexOf( '#' );
	const query = new URLSearchParams( hashAt < 0 ? rest.replace( /^\?/, '' ) : rest.slice( 0, hashAt ).replace( /^\?/, '' ) );
	const fragment = hashAt < 0 ? '' : rest.slice( hashAt + 1 );
	const route = ctx?.routeRow.has( p ) ? p : resolveRef( p, file );
	if ( route && ctx?.routeRow.has( route ) ) {
		return toRow( route, ctx, { query, fragment } );
	}
	if ( /\.dc\.html$/i.test( p ) ) {
		return { kind: 'unresolved', route: route || p, owner: 'content-page', why: `no page-map row holds the draft page "${ route || p }"` };
	}
	return { kind: 'other', value: h };
}

const readJson = ( file ) => ( fs.existsSync( file ) ? JSON.parse( fs.readFileSync( file, 'utf8' ) ) : null );
const memo = new Map();

// The resolver context of one client, read once per process: the confirmed page map (sites/<client>/build/page-map.json,
// else `proposedRows`, the page map the caller's own intake run just proposed, else intake.json's), the routing the caller
// holds (else intake.json's) and the page map's route-to-row matching, proposed again from the handoff folder (offline and
// static, as the intake run proposes it). Null when the client has no page map.
export function draftLinksFor( { repo, client, routing = null, proposedRows = null } ) {
	const key = `${ repo }\u0000${ client }`;
	const given = routing || proposedRows;
	if ( ! given && memo.has( key ) ) {
		return memo.get( key );
	}
	const build = path.join( repo, 'sites', client, 'build' );
	const intake = readJson( path.join( build, 'intake', 'intake.json' ) );
	const map = readJson( path.join( build, 'page-map.json' ) ) || proposedRows || intake?.pageMap || null;
	const folder = path.join( repo, 'sites', client, 'handoff' );
	const proposal = Array.isArray( map ) && fs.existsSync( folder ) ? proposePageMap( { folder } ) : { rows: [], routeSlug: {} };
	const ctx = Array.isArray( map ) ? linkContext( { rows: map, routing: routing || intake?.routing || null, routeSlug: proposal.routeSlug, proposed: proposal.rows } ) : null;
	! given && memo.set( key, ctx );
	return ctx;
}

// The resolver a skeleton writer calls for one element's link: ( href, e ) -> resolveDraftLink's answer, reading the file the
// element's template lives in and its own click handler. `ctx` null resolves with no page map.
export const siteLinkResolver = ( ctx ) => ( href, e ) => resolveDraftLink( href, ctx, { file: elementFile( e ), handler: elementHandler( e ) } );

// What a writer puts in a link setting for one resolution: { value (null writes nothing), handover (a skeleton handover row
// { owner, kind: 'link', detail }, or null) }. `href` is the draft's own value, named in the row.
export function linkWrite( r, href ) {
	if ( 'unresolved' === r.kind ) {
		return { value: null, handover: { owner: r.owner, kind: 'link', detail: `draft link "${ href }" goes to the draft route "${ r.route }": ${ r.why }; url left empty` } };
	}
	if ( 'none' === r.kind ) {
		return { value: null, handover: null };
	}
	return { value: r.value, handover: r.dropped ? { owner: 'behaviour', kind: 'link', detail: `draft link "${ href }" opens ${ r.value }; its draft query ${ r.dropped } has no site address and is dropped` } : null };
}
