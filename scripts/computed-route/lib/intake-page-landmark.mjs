// Whether a census <header> or <footer> is a page's own (Spec 48 §3.4 step 1): a real landmark of that one page, never the
// heading area of a modal, drawer, card or article. Read from the draft's stamped templates (census `sources[].stamped`),
// by structure alone:
//   - no <article>, <section>, <aside>, <dialog>, <form> or `role="dialog"` ancestor in its component, and neither it nor
//     any ancestor, in its component or in the components that import it, is the root of another surface record (a page
//     record's root excepted: the page's own landmarks sit beside or inside it);
//   - a header comes before the page's content, a footer after it: exactly one page record's content (its root, or the <main>
//     inside a root that wraps the landmark) of its component lies inside the landmark's container on that side (a landmark
//     ahead of several pages' content serves them all, so it is the site's);
//   - it holds what the landmark holds: a header a navigation, a link around a picture (the logo) or to the site root, a
//     picture, an imported component, or the site's name (`siteName`); a footer a navigation, a link or an imported
//     component.
// The page it spans (its width) and sits at the top of are checked on the rendered page (lib/intake-skeletons.mjs).

const NOT_A_PAGE_LANDMARK = new Set( [ 'article', 'section', 'aside', 'dialog', 'form' ] );
const ROOT_HREF = /^(?:\.?\/|#\/?|index\.html?|home(?:\.dc)?\.html?)$/i;
const attrOf = ( e, name ) => ( e.attrs || [] ).find( ( [ n ] ) => n === name )?.[ 1 ] ?? null;

// o: { tag ('header'|'footer'), component, tpl, census ({ sources }), records (the surfaces.json records), tplsOf (a record's
// template ids), siteName? }. Returns { page: <the page record it belongs to> } or { why, heading? } (`heading`: the element is
// another element's own heading area, or another surface's, so it is no missing record either).
export function pageLandmark( { tag, component, tpl, census, records, tplsOf, siteName = null } ) {
	const stampedOf = ( c ) => census?.sources?.find( ( s ) => s.component === c )?.stamped?.elements ?? null;
	const els = stampedOf( component );
	const me = els?.find( ( e ) => String( e.n ) === String( tpl ) );
	if ( ! me ) {
		return { why: `the census holds no stamped template for ${ component }:${ tpl }` };
	}
	const at = new Map( els.map( ( e, i ) => [ String( e.n ), { e, i } ] ) );
	const chainOf = ( e ) => {
		const out = [];
		for ( let p = e.parent; null != p && at.has( String( p ) ) && out.length <= els.length; p = at.get( String( p ) ).e.parent ) {
			out.push( at.get( String( p ) ).e );
		}
		return out;
	};
	const up = chainOf( me );
	const bad = up.find( ( a ) => NOT_A_PAGE_LANDMARK.has( a.tag ) || /^(?:alert)?dialog$/i.test( attrOf( a, 'role' ) ?? '' ) );
	if ( bad ) {
		return { why: `it sits inside a <${ bad.tag }${ attrOf( bad, 'role' ) ? ` role="${ attrOf( bad, 'role' ) }"` : '' }> (${ component }:${ bad.n }), so it is that element's own heading area`, heading: true };
	}
	const roots = ( records || [] ).filter( ( r ) => 'page' !== r.kind ).flatMap( ( r ) => tplsOf( r ).slice( -1 ).map( ( t ) => ( { dc: r.dc, tpl: String( t ), id: r.id } ) ) );
	const hostsOf = ( c ) => ( census?.sources || [] ).flatMap( ( s ) => ( s.stamped?.elements || [] ).filter( ( e ) => 'dc-import' === e.tag && attrOf( e, 'name' ) === c ).map( ( e ) => ( { component: s.component, n: String( e.n ) } ) ) );
	const within = ( c, n, seen = new Set() ) => {
		const list = stampedOf( c );
		const key = `${ c }:${ n }`;
		if ( ! list || seen.has( key ) ) {
			return null;
		}
		seen.add( key );
		const index = new Map( list.map( ( e ) => [ String( e.n ), e ] ) );
		const chain = [ String( n ) ];
		for ( let p = index.get( String( n ) )?.parent; null != p && index.has( String( p ) ) && chain.length <= list.length; p = index.get( String( p ) ).parent ) {
			chain.push( String( p ) );
		}
		const hit = roots.find( ( r ) => r.dc === c && chain.includes( r.tpl ) && 'helmet' !== index.get( r.tpl )?.tag );
		return hit ?? hostsOf( c ).map( ( h ) => within( h.component, h.n, seen ) ).find( Boolean ) ?? null;
	};
	const inside = within( component, tpl );
	if ( inside ) {
		return { why: `it is, or sits inside, the root of surface ${ inside.id } (${ inside.dc }:${ inside.tpl })`, heading: true };
	}
	const container = new Set( [ String( me.parent ?? '' ) ] );
	const underContainer = ( e ) => null == me.parent || chainOf( e ).some( ( a ) => container.has( String( a.n ) ) ) || String( e.parent ) === String( me.parent );
	// A page's content: its record's root, or, where the record names the file's outer wrapper that holds the landmark, the
	// <main> inside it.
	const ahead = ( c ) => ( 'header' === tag ? c.i > at.get( String( me.n ) ).i : c.i < at.get( String( me.n ) ).i ) && underContainer( c.e );
	const pages = ( records || [] ).filter( ( r ) => 'page' === r.kind && r.dc === component && tplsOf( r ).length ).filter( ( r ) => {
		const root = at.get( String( tplsOf( r ).at( -1 ) ) );
		if ( ! root ) {
			return false;
		}
		const wraps = chainOf( me ).some( ( a ) => String( a.n ) === String( root.e.n ) );
		const content = wraps ? els.filter( ( e ) => 'main' === e.tag && chainOf( e ).some( ( a ) => String( a.n ) === String( root.e.n ) ) ).map( ( e ) => at.get( String( e.n ) ) ) : [ root ];
		return content.some( ( c ) => ! chainOf( c.e ).some( ( a ) => String( a.n ) === String( me.n ) ) && ahead( c ) );
	} );
	if ( 1 !== pages.length ) {
		return { why: pages.length ? `it ${ 'header' === tag ? 'precedes' : 'follows' } the content of ${ pages.length } pages (${ pages.map( ( p ) => p.id ).join( ', ' ) }), so it is the site's` : `no page's content ${ 'header' === tag ? 'follows' : 'precedes' } it in its container` };
	}
	const under = els.filter( ( e ) => e === me || chainOf( e ).some( ( a ) => String( a.n ) === String( me.n ) ) );
	const homeLink = ( a ) => 'a' === a.tag && ( ROOT_HREF.test( String( attrOf( a, 'href' ) ?? '' ).trim() ) || under.some( ( x ) => [ 'img', 'svg', 'picture' ].includes( x.tag ) && chainOf( x ).some( ( y ) => y.n === a.n ) ) );
	const holds = 'header' === tag
		? under.some( ( e ) => 'nav' === e.tag || 'img' === e.tag || 'dc-import' === e.tag || homeLink( e ) || 'navigation' === attrOf( e, 'role' ) ) || ( !! siteName && under.some( ( e ) => String( e.words ).toLowerCase().includes( String( siteName ).toLowerCase() ) ) )
		: under.some( ( e ) => 'nav' === e.tag || 'a' === e.tag || 'dc-import' === e.tag );
	return holds ? { page: pages[ 0 ] } : { why: `it holds no ${ 'header' === tag ? 'navigation, logo, link to the site root or site name' : 'link or navigation' }` };
}
