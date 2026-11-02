// A draft's hash route (`#/apply`, the Claude Design single-page navigation) as the permalink of the page the page map
// names for that route (FR-48-30 rows: `route`, `slug`, `parent`, `postType`). A route with no page row is no route.

// The permalink of one page row: its parents' slugs (the `parent` chain) then its own, or `/` for the home page.
export function permalinkOf( row, pages ) {
	if ( 'home' === row.route || 'home' === row.slug ) {
		return '/';
	}
	const parts = [ row.slug ];
	const seen = new Set( [ row.slug ] );
	for ( let p = row.parent; p; ) {
		if ( seen.has( p ) ) {
			return null;
		}
		seen.add( p );
		const up = pages.find( ( r ) => r.slug === p && 'page' === r.postType );
		if ( ! up ) {
			return null;
		}
		parts.unshift( up.slug );
		p = up.parent;
	}
	return `/${ parts.join( '/' ) }/`;
}

// The permalink for a `#/<route>` href, or null when the href is not a hash route or no page row carries the route.
// `#/` is the home route. A query or a trailing slash after the route is ignored.
export function hashRoutePermalink( href, pages ) {
	const m = /^#\/([^?#]*)/.exec( String( href ?? '' ).trim() );
	if ( ! m || ! Array.isArray( pages ) ) {
		return null;
	}
	const route = m[ 1 ].replace( /\/+$/, '' ) || 'home';
	const row = pages.find( ( r ) => 'page' === r.postType && r.route === route );
	return row ? permalinkOf( row, pages ) : null;
}
