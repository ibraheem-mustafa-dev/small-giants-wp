// The menu entries of rows that make no post (Spec 48 FR-48-55 part 3): a `product` row's header, drawer or footer menu
// entry is the draft's link to a product (`Product.dc.html?id=zookies&sub=1`, link text "Subscribe & save"), which a menu item
// can only open as a custom link to the product's own address. The site build makes that link itself:
//   - the link text is the draft's own text for the entry (the menu item the page map's entry was read from:
//     lib/intake-pagemap.mjs::proposePageMap's `menuItems`, matched by menu, position and parent item);
//   - the address is the draft href resolved by lib/draft-link.mjs::resolveDraftLink (the catalogue product's address, its
//     preselection and the draft's own remaining query, `?sub=1`, kept) on the product's real permalink, which exists once the
//     shop's products do: the catalogue step records it in catalogue.json's `sites.<site>.products`
//     (lib/site-build-catalogue.mjs). Before then the entry is pending, with the reason, and the menus plan makes no item for it.
// A `product_cat` row's entry is pending with its own reason: the draft catalogue records a product's category by name only and
// no step records a category's permalink, so there is no address to link to yet.
// `menuLinksFor` is the one resolver: the site build's menu plan and the site check's header check both ask it, so they cannot
// disagree about the text or the address a product entry has.
import { draftLinksFor, resolveDraftLink } from './draft-link.mjs';
import { loadCatalogue } from './catalogue-read.mjs';
import { rowKey } from './site-build-map.mjs';

export const LINK_TYPES = [ 'product', 'product_cat' ];

// The draft menu item behind a row's menu entry: the item of that menu at the entry's position under its parent item.
function draftItem( ctx, entry ) {
	const walk = ( items ) => items.flatMap( ( it ) => [ it, ...walk( it.children || [] ) ] );
	const menu = ( ctx.menuItems || [] ).find( ( m ) => m.menu === entry.menu );
	const item = menu ? walk( menu.items ).find( ( it ) => it.position === entry.position && ( it.parentItem || null ) === ( entry.parentItem || null ) ) : null;
	return item ? { item, file: menu.file } : null;
}

// `address` (a root-relative path with the preselection and any fragment) with the query the address left unexpressed
// (`dropped`, "?sub=1") merged into it: { path, search, fragment }.
function parts( address, dropped ) {
	const u = new URL( address, 'http://site.invalid' );
	new URLSearchParams( String( dropped || '' ).replace( /^\?/, '' ) ).forEach( ( v, k ) => u.searchParams.append( k, v ) );
	return { path: u.pathname, search: u.search, fragment: u.hash };
}

// The recorded product of `catalogue.sites[site]` whose permalink is at `path`, or null.
function recordedAt( catalogue, site, path ) {
	const products = catalogue?.sites?.[ site ]?.products || {};
	return Object.values( products ).find( ( p ) => p.permalink && new URL( p.permalink, 'http://site.invalid' ).pathname === path ) || null;
}

// For every product and product-category row of `rows`, each of its menu entries resolved:
//   { links: { <row key>: [ { menu, position, parentItem, text, url } ] }, pending: [ { rowKey, menu, text, why } ] }.
// `url` is the product's recorded permalink with the draft's query; `pending` entries have none yet. `ctx` is
// lib/draft-link.mjs::draftLinksFor's answer (null: no page map, so every entry is pending).
export function menuLinksFor( { rows, ctx, catalogue, site } ) {
	const links = {};
	const pending = [];
	for ( const row of rows.filter( ( r ) => LINK_TYPES.includes( r.postType ) && ( r.menus || [] ).length ) ) {
		const key = rowKey( row );
		for ( const entry of row.menus ) {
			const found = ctx ? draftItem( ctx, entry ) : null;
			const text = found?.item.label || null;
			const wait = ( why ) => pending.push( { rowKey: key, menu: entry.menu, text, why } );
			if ( ! found ) {
				wait( `the draft's ${ entry.menu } menu has no item at position ${ entry.position }; regenerate the page map (intake.mjs --page-map)` );
				continue;
			}
			if ( 'product' !== row.postType ) {
				wait( 'a product category has no address to link to yet (the draft catalogue records a product\'s categories by name and no step records a category\'s permalink)' );
				continue;
			}
			const hit = found.item.targets.map( ( t ) => resolveDraftLink( t, ctx, { file: found.file } ) )
				.find( ( r ) => 'address' === r.kind && ctx.routeRow.get( r.route ) && rowKey( ctx.routeRow.get( r.route ) ) === key );
			if ( ! hit ) {
				wait( `none of the draft item's links (${ found.item.targets.join( ', ' ) }) resolves to a product of the draft catalogue` );
				continue;
			}
			const { path, search, fragment } = parts( hit.value, hit.dropped );
			const product = recordedAt( catalogue, site, path );
			if ( ! product ) {
				wait( `the product at ${ path } is not recorded as built on ${ site } (catalogue.json sites.${ site }); run site-build.mjs --catalogue --apply first, then the menus` );
				continue;
			}
			links[ key ] = [ ...( links[ key ] || [] ), { menu: entry.menu, position: entry.position, parentItem: entry.parentItem || null, text, url: `${ product.permalink.replace( /[?#].*$/, '' ) }${ search }${ fragment }` } ];
		}
	}
	return { links, pending };
}

// The resolver for one client and site, reading the client's page map, routing and catalogue from disk.
export function menuLinksOf( { repo, client, site, rows } ) {
	return menuLinksFor( { rows, ctx: draftLinksFor( { repo, client } ), catalogue: loadCatalogue( repo, client ), site } );
}
