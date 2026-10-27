// The theme template each page-map row names (Spec 48 FR-48-30, FR-48-56), by what the surface is, read from the draft
// code. A word in a route's name or title only suggests a template; the structure confirms it, and a word the structure
// does not bear out is a gap row. Two passes:
//   - surfaceTemplates, before slugs are fixed: the search results page and the not-found page become their own
//     `template` rows (postType `template`: a row that makes no post and builds only the template it names);
//   - genericTemplates, last of all: the front page `front-page`, the posts page `home`, every other page `page`, a
//     post `single`. It runs after the commerce kinds, WooCommerce slugs and pages and the checkout's confirmation, so
//     those structural readers still see `template: null` on an ordinary page.
import { isThisMember } from './intake-ast.mjs';
import { elementTree, descendants, ancestors } from './intake-pagemap-surfaces.mjs';

// The front page's route: the route an empty-hash link reaches (a hash export's default page); else the route of the
// site header's brand link (the first link of the header no page holds that sits outside every `<nav>`; a files export
// has no empty hash); else the route row slugged `home` (lib/site-build-plan.mjs::planBuild's front-page default);
// else the first row. `surfaces` are lib/intake-pagemap-surfaces.mjs::codeSurfaces' surfaces.
export function frontRoute( exp, routing, surfaces, rows ) {
	const empty = routing.links.find( ( l ) => /^#\/?$/.test( l.href ) && l.route )?.route;
	if ( empty ) {
		return empty;
	}
	const header = surfaces.find( ( x ) => 'header' === x.kind && ! x.page );
	const at = header && /^(.+?):(\d+):(\d+) /.exec( header.draftId );
	const d = at && exp.drafts.find( ( x ) => x.file === at[ 1 ] && ! x.error );
	if ( d ) {
		const tree = elementTree( d );
		const box = tree.nodes.find( ( t ) => 'header' === t.name && t.line === Number( at[ 2 ] ) && t.col === Number( at[ 3 ] ) );
		for ( const a of box ? descendants( box ).filter( ( t ) => 'a' === t.name && ! ancestors( t ).some( ( u ) => 'nav' === u.name ) ) : [] ) {
			const link = routing.links.find( ( l ) => l.route && l.from.startsWith( `${ d.file }:${ a.line }:${ a.col } ` ) );
			if ( link ) {
				return link.route;
			}
		}
	}
	return rows.find( ( r ) => r.route && 'home' === r.slug )?.route || rows[ 0 ]?.route || null;
}

// A route row no structural reader has claimed yet: a page with no template and no commerce role.
const plainPage = ( r, home ) => !! r.route && r.route !== home && 'page' === r.postType && ! r.template;

// The routes the draft's router shows for an unknown route key, other than the home route: the literal in
// `pages[ key ] ? key : '<route>'` or `pages[ key ] || pages.<route>` (also `??` and `pages[ '<route>' ]`), wherever the
// export's logic reads a computed member of its page data. A router that falls back to the home route redirects an
// unknown address home (e.g. `this.pages[ h ] ? h : 'home'`), which is no not-found page, so home is never returned.
export function routerFallbacks( exp, routeKeys, home ) {
	const out = new Set();
	const named = ( n ) => ( 'StringLiteral' === n?.type ? n.value : 'MemberExpression' === n?.type ? ( n.computed ? ( 'StringLiteral' === n.property.type ? n.property.value : null ) : n.property.name ) : null );
	const lookup = ( n ) => 'MemberExpression' === n?.type && n.computed && 'StringLiteral' !== n.property.type && ( 'Identifier' === n.object.type || isThisMember( n.object ) );
	for ( const d of exp.drafts.filter( ( x ) => x.idx && exp.entries.includes( x.file ) ) ) {
		for ( const n of d.idx.all ) {
			const key = 'ConditionalExpression' === n.type && lookup( n.test ) && 'StringLiteral' === n.alternate.type ? n.alternate.value
				: 'LogicalExpression' === n.type && /^(\|\||\?\?)$/.test( n.operator ) && lookup( n.left ) && 'MemberExpression' === n.right.type ? named( n.right ) : null;
			if ( key && routeKeys.has( key ) && key !== home ) {
				out.add( key );
			}
		}
	}
	return out;
}

const SEARCH_WORDS = /(^|[^a-z])search([^a-z]|$)/i;
const NOT_FOUND_WORDS = /(^|[^a-z0-9])(404|not[\s-]?found)([^a-z0-9]|$)/i;
const SHAPES = {
	search: { slug: 'search', template: 'search', what: 'search results page', evidence: 'no search field with a results loop' },
	404: { slug: '404', template: '404', what: 'not-found page', evidence: 'no router fallback to it, and no not-found heading on a page nothing links to' },
};

// Gives the search results page and the not-found page their own `template` row (in place), from the structure:
//   - search: a page holding a search field (`input type="search"`, or a field in a `role="search"` landmark) and a
//     results loop (an `sc-for` whose items hold a link), lib/intake-pagemap-commerce.mjs::commerceFacts `search`;
//   - 404: the route the router shows for an unknown route key (routerFallbacks), or a page that no other page, menu or
//     the site chrome links to (the routing reader's links, which hold every menu item's link) whose heading says
//     "not found" or "404" (commerceFacts `notFound`).
// Of two or more candidates for one template none is taken and a gap row names them. A page whose words alone say
// search or not found stays a page with a gap row. `pageOfTag` maps a link's draft id to the route holding it.
export function surfaceTemplates( rows, { facts, links, pageOfTag, fallbacks, home, gaps } ) {
	const f = ( r ) => facts.get( r.route ) || {};
	const unlinked = ( r ) => ! links.some( ( l ) => l.route === r.route && pageOfTag( l.from ) !== r.route );
	const found = {
		search: rows.filter( ( r ) => plainPage( r, home ) && f( r ).search ),
		404: rows.filter( ( r ) => plainPage( r, home ) && ( fallbacks.has( r.route ) || ( f( r ).notFound && unlinked( r ) ) ) ),
	};
	for ( const [ kind, list ] of Object.entries( found ) ) {
		if ( list.length > 1 ) {
			gaps.push( { construct: 'page-map', draftId: list.map( ( r ) => r.route ).join( ', ' ), error: `${ list.length } pages read as the ${ SHAPES[ kind ].what }, so each stays a page` } );
			continue;
		}
		for ( const r of list ) {
			Object.assign( r, { slug: SHAPES[ kind ].slug, template: SHAPES[ kind ].template, postType: 'template', parent: null, collection: 'static', explicit: true } );
		}
	}
	for ( const r of rows.filter( ( x ) => plainPage( x, home ) ) ) {
		const words = `${ r.route } ${ r.title }`;
		const kind = SEARCH_WORDS.test( words ) ? 'search' : NOT_FOUND_WORDS.test( words ) ? '404' : null;
		if ( kind ) {
			gaps.push( { construct: 'page-map', draftId: r.route, error: `"${ r.title }" reads as the ${ SHAPES[ kind ].what } by its words alone; the draft shows ${ SHAPES[ kind ].evidence }, so it stays a page` } );
		}
	}
}

// The generic templates (in place), given last: the home row `front-page`; the one page other than home whose data
// lists the posts (`row.listsPosts`, set by lib/intake-pagemap.mjs::routeRows) `home`, the posts page; every other
// page `page`; a post `single`. A row that already names a template keeps it; layout and CPT rows keep null. Two or
// more pages listing the posts leave each a `page` and add a gap row.
export function genericTemplates( rows, home, gaps ) {
	const lists = rows.filter( ( r ) => 'page' === r.postType && ! r.template && r.listsPosts && r.route !== home );
	if ( lists.length > 1 ) {
		gaps.push( { construct: 'page-map', draftId: lists.map( ( r ) => r.route ).join( ', ' ), error: `${ lists.length } pages list the posts and none settles which is the posts page, so each is an ordinary page` } );
	}
	for ( const r of rows ) {
		if ( ! r.template && 'page' === r.postType ) {
			r.template = r.route && r.route === home ? 'front-page' : 1 === lists.length && lists[ 0 ] === r ? 'home' : 'page';
		} else if ( ! r.template && 'post' === r.postType ) {
			r.template = 'single';
		}
		delete r.listsPosts;
	}
}
