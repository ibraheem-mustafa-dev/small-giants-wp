// The page map proposal (Spec 48 FR-48-30, Spec 48A FR-48A-9): one row per route and one per CPT surface, in the
// Appendix C "Page map row" shape that data/page-map.schema.json fixes and the site-build script (FR-48-55) consumes,
// plus a link map in which every link the routing reader found resolves to a row, is external, is an in-page control,
// or is a gap row. Routes come from the routing adapter (FR-48-26), or from the draft's embedded data-sgs-manifest
// block when present (its pages ARE the proposal; anything it lacks is filled by the same rules). Routes the pages
// getter adds per data element (`this._pages['post-' + p.slug] = …` inside a forEach) and links built from loop variables resolve
// through lib/intake-ast-eval.mjs. CPT surfaces and menus come from lib/intake-pagemap-surfaces.mjs.
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { loadExport, readRouting, embeddedManifest } from './intake-routing.mjs';
import { resolveRef, loadAjv, schemaProblems } from './handoff.mjs';
import { keyName, isThisMember, subtree, scanTags, decodeEntities } from './intake-ast.mjs';
import { ref, resolveRefs, propRefs, elementsOf, evalDeep, oneString, loopEnvs } from './intake-ast-eval.mjs';
import { codeSurfaces, crossCheck, KIND_POST_TYPE, kebab, stem } from './intake-pagemap-surfaces.mjs';

const HERE = path.dirname( fileURLToPath( import.meta.url ) );
export const PAGE_MAP_SCHEMA = path.join( HERE, '..', 'data', 'page-map.schema.json' );
const EXTERNAL = /^([a-z][a-z0-9+.-]*:|\/\/)/i;
const gap = ( construct, draftId, error ) => ( { construct, draftId, error } );
const SLUG_PREFIX = { header: 'header', footer: 'footer', drawer: 'drawer', menu: 'mega-menu', modal: 'modal', form: 'form', 'choice-flow': 'choice-flow' };
const titleCase = ( key ) => kebab( key ).split( '-' ).filter( Boolean ).map( ( w ) => w[ 0 ].toUpperCase() + w.slice( 1 ) ).join( ' ' );

// Post type, page template and collection from a route's own words (its key, title, or the manifest's type text):
// a product archive is the WooCommerce shop (a product category when it says so), a single product the
// single-product template, cart and checkout their WooCommerce templates, an article a post, anything else a page.
export function classifyRoute( text, { prices = false } = {} ) {
	const t = String( text ).toLowerCase().replace( /\.dc\.html/g, '' );
	if ( /product categor/.test( t ) ) {
		return { postType: 'product_cat', template: 'archive-product', collection: 'live' };
	}
	if ( /single product|product single|(^|\s)product(\s|$)/.test( t ) && ! /archive/.test( t ) ) {
		return { postType: 'shop', template: 'single-product', collection: 'live' };
	}
	if ( /product archive|(^|[^a-z])(shop|store)([^a-z]|$)/.test( t ) || ( prices && /catalog/.test( t ) ) ) {
		return { postType: /catalog/.test( t ) && ! /shop|store/.test( t ) ? 'product_cat' : 'shop', template: 'archive-product', collection: 'live' };
	}
	if ( /checkout/.test( t ) ) {
		return { postType: 'page', template: 'checkout', collection: 'static' };
	}
	if ( /(^|[^a-z])(cart|basket)([^a-z]|$)/.test( t ) ) {
		return { postType: 'page', template: 'cart', collection: 'static' };
	}
	return { postType: /(^|[^a-z])(post|article)([^a-z]|$)/.test( t ) ? 'post' : 'page', template: null, collection: 'static' };
}

// The hash export's page data: the pages getter's object literal (returned, or memoised into this._x), each route's
// value node, and the routes the getter adds by assignment per data element (one env per element).
function pageData( exp ) {
	for ( const d of exp.drafts.filter( ( x ) => x.idx && exp.entries.includes( x.file ) ) ) {
		const getter = d.idx.all.find( ( n ) => /ClassMethod|ObjectMethod/.test( n.type ) && 'get' === n.kind && 'pages' === keyName( n ) );
		if ( ! getter ) {
			continue;
		}
		const inside = subtree( d.idx, getter );
		const ret = inside.find( ( n ) => 'ReturnStatement' === n.type && n.argument );
		const memo = isThisMember( ret?.argument ) ? ret.argument.property.name : null;
		const obj = memo ? inside.find( ( n ) => 'AssignmentExpression' === n.type && isThisMember( n.left, memo ) && 'ObjectExpression' === n.right.type )?.right
			: inside.find( ( n ) => 'ReturnStatement' === n.type && 'ObjectExpression' === n.argument?.type )?.argument;
		const values = new Map( ( obj?.properties || [] ).filter( ( p ) => 'ObjectProperty' === p.type && null !== keyName( p ) ).map( ( p ) => [ keyName( p ), p.value ] ) );
		const added = [];
		for ( const a of inside.filter( ( n ) => 'AssignmentExpression' === n.type && n.left.computed && ( isThisMember( n.left.object, memo ) || 'Identifier' === n.left.object.type ) ) ) {
			for ( const env of loopEnvs( d.idx, a ) ) {
				const key = oneString( d.idx, a.left.property, env );
				const el = [ ...env.values() ][ 0 ]?.[ 0 ];
				if ( key && ! values.has( key ) && ! added.some( ( x ) => x.key === key ) ) {
					added.push( { key, value: a.right, env, element: el, source: el && d.idx.parent.get( el.node ), draftId: `${ d.file }:${ d.idx.line( a ) } (logic)` } );
				}
			}
		}
		return { d, values, added };
	}
	return null;
}

const one = ( d, refs ) => refs.map( ( r ) => oneString( d.idx, r.node, r.env ) ).find( Boolean ) || null;
const field = ( d, node, env, keys ) => keys.reduce( ( refs, k ) => propRefs( d.idx, refs, k ), resolveRefs( d.idx, ref( node, env ) ) );
const hasKey = ( d, el, k ) => el && propRefs( d.idx, [ el ], k ).length > 0;

// Title candidates from a route's page data, in order: title, crumb, label, name, hero.title.
const titleCandidates = ( d, node, env ) => [ [ 'title' ], [ 'crumb' ], [ 'label' ], [ 'name' ], [ 'hero', 'title' ] ]
	.map( ( keys ) => ( { key: keys.join( '.' ), value: one( d, field( d, node, env, keys ) ) } ) ).filter( ( c ) => c.value );

// Does a page's data reference one of the collection arrays (the data a route-per-element set is built from)?
function listsCollection( d, node, env, sources ) {
	if ( ! sources.size ) {
		return false;
	}
	return subtree( d.idx, node ).some( ( n ) => 'ObjectProperty' === n.type && /^(MemberExpression|CallExpression)$/.test( n.value.type )
		&& elementsOf( d.idx, ref( n.value, env ) ).some( ( el ) => sources.has( d.idx.parent.get( el.node ) ) ) );
}

// Does a page's data hold a list of items with prices?
const listsPrices = ( d, node, env ) => subtree( d.idx, node ).some( ( n ) => 'ArrayExpression' === n.type && n.elements.filter( ( e ) => 'ObjectExpression' === e?.type
	&& e.properties.some( ( p ) => /^price/i.test( keyName( p ) || '' ) ) ).length >= 2 );

// A draft file's <title> text.
function docTitle( d ) {
	const t = scanTags( d.text ).find( ( x ) => 'title' === x.name );
	return t ? decodeEntities( d.text.slice( t.end, d.text.toLowerCase().indexOf( '</title', t.end ) ) ).trim() : '';
}

const SEP = /\s[—–|·:-]\s/;
// The site name the page files' <title>s share (the text after or before a separator in at least half of them).
function siteName( titles ) {
	const parts = titles.flatMap( ( t ) => { const p = t.split( SEP ); return p.length > 1 ? [ p[ 0 ], p[ p.length - 1 ] ] : []; } );
	const best = [ ...new Set( parts ) ].map( ( p ) => [ p, titles.filter( ( t ) => t.split( SEP ).some( ( x ) => x === p ) ).length ] ).sort( ( a, b ) => b[ 1 ] - a[ 1 ] )[ 0 ];
	return best && best[ 1 ] * 2 >= titles.length && titles.length > 1 ? best[ 0 ] : null;
}
const withoutSite = ( t, site ) => ( site ? t.split( SEP ).filter( ( x ) => x !== site ).join( ' · ' ) || t : t );

// Route rows (before parents and menus): from the embedded manifest when present, else the adapter's routes plus
// the routes the pages getter adds per element.
function routeRows( exp, routing, gaps ) {
	const rows = [];
	const add = ( r ) => rows.push( { route: r.route, slug: r.slug, title: r.title, parent: r.parent ?? null, template: r.template ?? null, menus: [], postType: r.postType,
		collection: r.collection, flags: [], id: null, ...( r.draftParent ? { draftParent: r.draftParent } : {} ) } );
	const manifest = exp.drafts.filter( ( d ) => exp.entries.includes( d.file ) ).map( ( d ) => ( { d, ...embeddedManifest( d.text, d.file ) } ) ).find( ( m ) => m.manifest?.pages || m.gaps.length );
	gaps.push( ...( manifest?.gaps || [] ) );
	if ( manifest?.manifest?.pages ) {
		for ( const p of manifest.manifest.pages ) {
			const wp = p.wp || {};
			const c = classifyRoute( `${ p.id } ${ wp.type || '' } ${ p.kind || '' }` );
			const slug = /^[a-z0-9-]+$/.test( wp.slug || '' ) ? wp.slug : kebab( p.id || p.label );
			add( { route: String( p.id ), slug, title: p.label || titleCase( p.id ), ...c, draftParent: wp.parent || null } );
			rows[ rows.length - 1 ].explicit = slug === wp.slug;
		}
	}
	const data = 'hash' === routing.adapter ? pageData( exp ) : null;
	const sources = new Set( ( data?.added || [] ).map( ( a ) => a.source ).filter( Boolean ) );
	const cands = new Map( ( data ? [ ...data.values ].map( ( [ k, v ] ) => [ k, titleCandidates( data.d, v ) ] ) : [] )
		.concat( ( data?.added || [] ).map( ( a ) => [ a.key, titleCandidates( data.d, a.value, a.env ) ] ) ) );
	const shared = ( c ) => [ ...cands.values() ].filter( ( list ) => list.some( ( x ) => x.key === c.key && x.value === c.value ) ).length > 1;
	const titled = ( key ) => cands.get( key )?.find( ( c ) => ! shared( c ) )?.value || null;
	const files = 'files' === routing.adapter ? routing.routes.map( ( r ) => ( { key: r.key, t: docTitle( exp.drafts.find( ( d ) => d.file === r.key ) || { text: '' } ) } ) ) : [];
	const site = siteName( files.map( ( f ) => f.t ) );
	for ( const r of routing.routes.filter( ( x ) => ! rows.some( ( row ) => row.route === x.key ) ) ) {
		const fileTitle = files.find( ( f ) => f.key === r.key )?.t;
		const title = titled( r.key ) || ( fileTitle && withoutSite( fileTitle, site ) ) || null;
		const value = data?.values.get( r.key );
		const c = classifyRoute( `${ stem( r.key ) } ${ title || '' }`, { prices: !! value && listsPrices( data.d, value, new Map() ) } );
		const live = value && listsCollection( data.d, value, new Map(), sources );
		add( { route: r.key, slug: kebab( 'files' === routing.adapter ? stem( r.key ) : r.key ) || 'home', title: title || titleCase( stem( r.key ) ), ...c, collection: live ? 'live' : c.collection } );
	}
	for ( const a of data?.added || [] ) {
		const title = titled( a.key );
		const article = [ 'date', 'body', 'content', 'excerpt' ].some( ( k ) => hasKey( data.d, a.element, k ) ) && hasKey( data.d, a.element, 'title' );
		const c = hasKey( data.d, a.element, 'price' ) ? classifyRoute( 'single product' ) : classifyRoute( article ? 'post' : a.key );
		add( { route: a.key, slug: kebab( title || a.key ), title: title || titleCase( a.key ), ...c,
			collection: listsCollection( data.d, a.value, a.env, sources ) ? 'live' : c.collection } );
	}
	return { rows, data };
}

// Every route key a link value can reach: the key itself, a #<key> or #/<key> hash, or a .dc.html file resolved
// from the linking draft; `home` stands for the empty hash.
function routeOfHref( href, file, routeSlug, home ) {
	if ( routeSlug.has( href ) ) {
		return href;
	}
	if ( href.startsWith( '#' ) ) {
		const key = href.slice( 1 ).replace( /^\//, '' ).split( '?' )[ 0 ];
		return '' === key ? home : routeSlug.has( key ) ? key : null;
	}
	const p = file && resolveRef( href.split( /[?#]/ )[ 0 ], file );
	return p && routeSlug.has( p ) ? p : null;
}

// Re-reads a link the routing reader left unresolved (a value built from a loop variable) through evalDeep:
// { values } or null when its logic node cannot be found.
function reread( exp, from ) {
	const m = /^(.+?):(\d+) \(logic\)(?: ([\w$]+): )?/.exec( from );
	const d = m && exp.drafts.find( ( x ) => x.file === m[ 1 ] && x.idx );
	if ( ! d ) {
		return null;
	}
	const at = d.idx.all.filter( ( n ) => d.idx.line( n ) === Number( m[ 2 ] ) );
	const node = m[ 3 ] ? at.find( ( n ) => 'ObjectProperty' === n.type && keyName( n ) === m[ 3 ] )?.value : at.find( ( n ) => 'CallExpression' === n.type && n.arguments[ 0 ] )?.arguments[ 0 ];
	return node ? { file: d.file, ...evalDeep( d.idx, node ) } : null;
}

// The link map: every routing link as { from, href, kind: 'row' | 'external' | 'control' | 'gap', slug?, error? },
// with one gap row per link no row holds.
function linkMap( exp, routing, routeSlug, home, gaps ) {
	const out = [];
	const reread_ = new Set();
	for ( const l of routing.links ) {
		const file = l.from.split( ':' )[ 0 ];
		if ( l.external || l.control ) {
			out.push( { from: l.from, href: l.href, kind: l.external ? 'external' : 'control' } );
			continue;
		}
		const route = l.route ?? ( l.partial ? null : routeOfHref( l.href, file, routeSlug, home ) );
		if ( route && routeSlug.has( route ) ) {
			out.push( { from: l.from, href: l.href, kind: 'row', slug: routeSlug.get( route ) } );
			continue;
		}
		const again = reread( exp, l.from );
		if ( again?.values.length && ! again.partial.length && ! again.unresolved.length ) {
			const hits = again.values.map( ( v ) => ( { v, route: routeOfHref( v, again.file, routeSlug, home ) } ) );
			if ( hits.every( ( h ) => h.route || EXTERNAL.test( h.v ) ) ) {
				reread_.add( l.from );
				hits.forEach( ( h ) => out.push( h.route ? { from: l.from, href: h.v, kind: 'row', slug: routeSlug.get( h.route ) } : { from: l.from, href: h.v, kind: 'external' } ) );
				continue;
			}
		}
		const why = routing.gaps.find( ( g ) => g.draftId === l.from )?.error || `${ JSON.stringify( l.href ) } reaches no page-map row`;
		out.push( { from: l.from, href: l.href, kind: 'gap', error: why } );
	}
	for ( const g of routing.gaps ) {
		if ( ! reread_.has( g.draftId ) ) {
			gaps.push( g );
		}
	}
	for ( const e of out.filter( ( x ) => 'gap' === x.kind && ! gaps.some( ( g ) => g.draftId === x.from ) ) ) {
		gaps.push( gap( 'link', e.from, e.error ) );
	}
	return out;
}

// A slug not yet taken (base, then base-2, base-3, …).
function unique( base, used ) {
	let s = base || 'page';
	for ( let i = 2; used.has( s ); i++ ) {
		s = `${ base }-${ i }`;
	}
	used.add( s );
	return s;
}

// FR-48-30: proposes the page map for one export folder. `routing` defaults to readRouting( { folder } );
// `surfacesHint` is handoff/surfaces.json's parsed object (read from the folder when undefined, none when null).
// `census` (FR-48-24) is accepted for the intake record's cross-reference and not needed here.
// Returns { rows, linkMap, gaps }.
export function proposePageMap( { folder, routing = null, census = null, surfacesHint } ) {
	void census;
	const exp = loadExport( folder );
	const route = routing || readRouting( { folder } );
	const gaps = [];
	const { rows, data } = routeRows( exp, route, gaps );
	const used = new Set();
	const routeSlug = new Map();
	// Two manifest pages naming one WordPress slug (a signed-out and a signed-in view) are one row.
	for ( const r of [ ...rows ] ) {
		const twin = r.explicit && rows.find( ( x ) => x !== r && x.explicit && x.slug === r.slug && routeSlug.has( x.route ) );
		if ( twin ) {
			routeSlug.set( r.route, twin.slug );
			rows.splice( rows.indexOf( r ), 1 );
			continue;
		}
		r.slug = unique( r.slug, used );
		routeSlug.set( r.route, r.slug );
	}
	rows.forEach( ( r ) => delete r.explicit );
	for ( const r of route.routes.filter( ( x ) => ! routeSlug.has( x.key ) ) ) {
		const twin = rows.find( ( row ) => row.slug === kebab( r.key ) );
		if ( twin ) {
			routeSlug.set( r.key, twin.slug );
		}
	}
	const home = route.links.find( ( l ) => /^#\/?$/.test( l.href ) && l.route )?.route || rows[ 0 ]?.route || null;
	const routeOfNode = ( d, node ) => ( data && d === data.d ? [ ...data.values ].find( ( [ , v ] ) => v.start <= node.start && node.end <= v.end )?.[ 0 ] ?? null : null );
	const hintFile = path.join( folder, 'surfaces.json' );
	const hint = undefined !== surfacesHint ? surfacesHint : fs.existsSync( hintFile ) ? JSON.parse( fs.readFileSync( hintFile, 'utf8' ) ) : null;
	const code = codeSurfaces( exp, routeOfNode );
	const checked = crossCheck( code.surfaces, hint );
	gaps.push( ...checked.gaps );
	const counts = ( kind ) => checked.surfaces.filter( ( s ) => s.kind === kind ).length;
	for ( const s of checked.surfaces ) {
		const name = /^(header|footer)$/.test( s.kind ) ? kebab( s.dc || '' ) : kebab( s.label ).replace( new RegExp( `^${ SLUG_PREFIX[ s.kind ] }-?` ), '' ) || kebab( s.dc || '' );
		const base = /^(header|footer)$/.test( s.kind ) && 1 === counts( s.kind ) ? s.kind : [ SLUG_PREFIX[ s.kind ], name ].filter( Boolean ).join( '-' );
		rows.push( { slug: unique( base, used ), title: s.title || s.label, parent: null, template: null,
			menus: s.menuItem ? [ { menu: s.menuItem.menu, position: s.menuItem.position, parentItem: null } ] : [],
			postType: KIND_POST_TYPE[ s.kind ], collection: 'static', flags: [], id: null } );
	}
	const bySlug = new Map( rows.map( ( r ) => [ r.slug, r ] ) );
	const rowOf = ( href, file ) => {
		const k = routeOfHref( href, file, routeSlug, home );
		return k ? bySlug.get( routeSlug.get( k ) ) : null;
	};
	// Menus: each item's first target that reaches a row puts that row in the menu.
	const groups = new Map();
	for ( const m of code.menus ) {
		const file = m.draftId.split( ':' )[ 0 ];
		const walk = ( items ) => items.forEach( ( it ) => {
			const row = it.targets.map( ( t ) => rowOf( t, file ) ).find( Boolean );
			if ( row && ! row.menus.some( ( x ) => x.menu === m.menu && x.parentItem === it.parentItem ) ) {
				row.menus.push( { menu: m.menu, position: it.position, parentItem: it.parentItem } );
			} else if ( ! row && it.targets.some( ( t ) => /^#.|\.dc\.html|^\//.test( t ) ) ) {
				gaps.push( gap( 'menu', m.draftId, `${ m.menu } item "${ it.label }" links to ${ it.targets.join( ', ' ) }, which no page-map row holds` ) );
			}
			if ( 'footer' !== m.region && ( row || it.children.length ) ) {
				const g = groups.get( it.label ) || { target: null, children: [] };
				groups.set( it.label, { target: g.target || row, children: [ ...g.children, ...it.children.map( ( c ) => c.targets.map( ( t ) => rowOf( t, file ) ).find( Boolean ) || null ) ] } );
			}
			walk( it.children );
		} );
		walk( m.items );
	}
	// Parents: a menu item with its own page is the parent of its children's pages, unless it only links to its
	// first child; then the manifest's parent; then the route hierarchy (a/b under a).
	for ( const { target, children } of groups.values() ) {
		if ( target && children.length && children[ 0 ] !== target ) {
			children.filter( ( c ) => c && c !== target && ! c.parent && 'page' === c.postType ).forEach( ( c ) => { c.parent = target.slug; } );
		}
	}
	for ( const r of rows ) {
		if ( r.draftParent ) {
			if ( bySlug.has( r.draftParent ) ) {
				r.parent = r.draftParent;
			} else {
				gaps.push( gap( 'page-map', `data-sgs-manifest ${ r.route }`, `parent "${ r.draftParent }" names no page-map row` ) );
			}
		}
		delete r.draftParent;
		const up = r.route?.includes( '/' ) && routeSlug.get( r.route.slice( 0, r.route.lastIndexOf( '/' ) ) );
		if ( ! r.parent && up ) {
			r.parent = up;
		}
	}
	return { rows, linkMap: linkMap( exp, route, routeSlug, home, gaps ), gaps };
}

// Problems with a page map: schema violations (data/page-map.schema.json), duplicate slugs and parents that name
// no row. Empty when the map is valid.
export function pageMapProblems( rows, ajv = loadAjv() ) {
	const out = [ ...schemaProblems( ajv, PAGE_MAP_SCHEMA, rows ) ];
	const slugs = new Set();
	for ( const r of Array.isArray( rows ) ? rows : [] ) {
		if ( slugs.has( r?.slug ) ) {
			out.push( `slug "${ r.slug }" is used by more than one row` );
		}
		slugs.add( r?.slug );
	}
	for ( const r of Array.isArray( rows ) ? rows : [] ) {
		if ( r?.parent && ! slugs.has( r.parent ) ) {
			out.push( `${ r.slug }: parent "${ r.parent }" names no row` );
		}
	}
	return out;
}
