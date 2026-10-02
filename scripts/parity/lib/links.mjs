// The links check for draft-live-walk.mjs (GAP-CHECKLIST.md section 14). A design draft is often a
// one-page prototype whose links are "#" and whose pages change by script, so internal destinations
// cannot be compared side by side. Three checks instead:
// - health: every visible live link has a real href ("#", empty and javascript: are dead) and a
//   same-origin target answers below 400;
// - real draft hrefs (tel:, mailto:, an external site) are compared with the live link of the same text;
// - the config's `links: { '<label>': '<live path or URL>' | [ ... ] }` table states where each label goes.
import { AUTO_EXCLUDE } from './auto-walk.mjs';

// In the page: every visible link under the root (or the page minus the header and footer), with its
// text (its words, else its aria-label, title or image alt), raw href and resolved URL.
function collectLinksIn( [ rootSel, exclude ] ) {
	const shown = ( e ) => e.getClientRects().length && 'hidden' !== getComputedStyle( e ).visibility;
	const root = rootSel ? [ ...document.querySelectorAll( rootSel ) ].find( shown ) : document;
	if ( ! root ) {
		return [];
	}
	const ex = rootSel ? [] : exclude.flatMap( ( s ) => [ ...document.querySelectorAll( s ) ] );
	return [ ...root.querySelectorAll( 'a[href]' ) ].filter( ( a ) => shown( a ) && ! ex.some( ( x ) => x.contains( a ) ) ).map( ( a ) => ( {
		text: ( a.innerText.trim() || a.getAttribute( 'aria-label' ) || a.getAttribute( 'title' ) || a.querySelector( 'img' )?.alt || '' ).replace( /\s+/g, ' ' ).trim().toLowerCase(),
		href: a.getAttribute( 'href' ).trim(),
		url: a.href,
	} ) );
}

export function collectLinks( page, side, cfg ) {
	const root = cfg.linkRoot?.[ side ] || cfg.auto?.root?.[ side ] || null;
	return page.evaluate( collectLinksIn, [ root, [ ...AUTO_EXCLUDE, ...( cfg.auto?.exclude?.[ side ] || [] ).filter( ( e ) => 'string' === typeof e ) ] ] ).catch( () => [] );
}

const statusCache = new Map();

// Live side: the HTTP status of each same-origin target, once per URL for the whole run. A 403, 429 or
// 503 is the host's bot check, not a broken link, and is left unjudged.
export async function probeLinks( ctx, page, links ) {
	const origin = new URL( page.url() ).origin;
	for ( const l of links ) {
		const u = new URL( l.url, origin );
		if ( u.origin !== origin || ! /^https?:$/.test( u.protocol ) || ( u.hash && u.pathname === new URL( page.url() ).pathname ) ) {
			continue;
		}
		const key = u.origin + u.pathname + u.search;
		if ( ! statusCache.has( key ) ) {
			let status = await ctx.request.head( key, { maxRedirects: 5, timeout: 15000 } ).then( ( r ) => r.status() ).catch( () => 0 );
			if ( 405 === status ) {
				status = await ctx.request.get( key, { maxRedirects: 5, timeout: 15000 } ).then( ( r ) => r.status() ).catch( () => 0 );
			}
			statusCache.set( key, status );
		}
		l.status = statusCache.get( key );
	}
	return links;
}

const DEAD = /^(#|javascript:.*|)$/i;
// A comparable form of a destination: tel: digits only, a web address without scheme, www. or a
// trailing slash, and a same-origin path as its path.
function norm( v, origin ) {
	if ( /^tel:/i.test( v ) ) {
		return 'tel:' + v.replace( /[^\d+]/g, '' );
	}
	if ( /^mailto:/i.test( v ) ) {
		return v.toLowerCase();
	}
	try {
		const u = new URL( v, origin );
		if ( u.origin === origin ) {
			return u.pathname.replace( /\/$/, '' ) || '/';
		}
		return ( u.host.replace( /^www\./, '' ) + u.pathname.replace( /\/$/, '' ) + u.search ).toLowerCase();
	} catch {
		return v;
	}
}
const realDraftHref = ( l, draftOrigin ) => ! DEAD.test( l.href ) && ! /\{\{/.test( l.href ) && ( /^(tel|mailto):/i.test( l.href ) || ( /^https?:/i.test( l.url ) && new URL( l.url ).origin !== draftOrigin && ! /fonts\.(googleapis|gstatic)\.com/.test( l.url ) ) );
const sameLabel = ( a, b ) => a && b && ( a === b || a.includes( b ) || b.includes( a ) );

// The rows for one state, each reported once per run (`seen` holds the keys already reported).
export function compareLinks( d, l, cfg, origins, seen ) {
	const rows = [];
	const add = ( key, draft, live ) => {
		if ( ! seen.has( key ) ) {
			seen.add( key );
			rows.push( { kind: 'link', key, draft, live } );
		}
	};
	// Health is the live site's: a --self run (both sides one site) has no live side to judge.
	for ( const x of origins.draft === origins.live ? [] : l || [] ) {
		if ( DEAD.test( x.href ) ) {
			add( `dead "${ x.text }"`, '-', x.href || '(empty)' );
		} else if ( x.status >= 400 && ! [ 403, 429, 503 ].includes( x.status ) ) {
			add( `broken "${ x.text }"`, '-', `${ norm( x.url, origins.live ) } ${ x.status }` );
		}
	}
	for ( const x of ( d || [] ).filter( ( y ) => realDraftHref( y, origins.draft ) ) ) {
		const want = norm( x.href, origins.draft );
		const mates = ( l || [] ).filter( ( y ) => sameLabel( y.text, x.text ) );
		if ( ! mates.length ) {
			add( `missing "${ x.text }"`, want, 'no link with this text' );
		} else if ( ! mates.some( ( y ) => norm( y.href, origins.live ) === want ) ) {
			add( `href "${ x.text }"`, want, mates.map( ( y ) => norm( y.href, origins.live ) ).join( ' | ' ) );
		}
	}
	// The table states live destinations: a --self run has no live side to hold to it.
	for ( const [ label, dest ] of Object.entries( origins.draft === origins.live ? {} : cfg.links || {} ) ) {
		const wants = ( Array.isArray( dest ) ? dest : [ dest ] ).map( ( v ) => norm( v, origins.live ) );
		const mates = ( l || [] ).filter( ( y ) => y.text === label.toLowerCase() );
		const wrong = mates.filter( ( y ) => ! wants.includes( norm( y.href, origins.live ) ) );
		if ( wrong.length ) {
			add( `table "${ label }"`, wants.join( ' | ' ), wrong.map( ( y ) => norm( y.href, origins.live ) ).join( ' | ' ) );
		}
	}
	return rows;
}

// A table label no state ever showed is reported once at the end of the run: the table promises a link.
export function unseenLabels( cfg, allLive, origins ) {
	return Object.keys( origins.draft === origins.live ? {} : cfg.links || {} ).filter( ( label ) => ! allLive.some( ( y ) => y.text === label.toLowerCase() ) )
		.map( ( label ) => ( { kind: 'link', key: `table "${ label }"`, draft: 'listed in links', live: 'no link with this text' } ) );
}
