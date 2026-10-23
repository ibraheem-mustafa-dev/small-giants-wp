// The page map as the site build reads and writes it (Spec 48 FR-48-55 over FR-48-30's confirmed
// sites/<client>/build/page-map.json): row keys, the build order, each row's tree and its hash, and the id write-back
// that changes nothing but `id`.
import crypto from 'crypto';
import fs from 'fs';
import path from 'path';

// The layout surfaces whose trees bind a menu, built after the menus; the active pointer each one takes (part 7).
export const LAYOUT_TYPES = { sgs_header: 'header', sgs_drawer: 'drawer', sgs_footer: 'footer' };
// A shop client's rows (FR-48-55 parts 1 and 6, FR-48-56). `product` and `product_cat` rows make no post: the products
// and categories are WooCommerce's data, and the row's tree builds the site's own copy of its template. A `shop` row is
// the WooCommerce shop page (a `page`, whose id is `woocommerce_shop_page_id`) and its tree builds the archive template.
export const SHOP_TYPES = [ 'product', 'product_cat', 'shop' ];
export const POSTLESS_TYPES = [ 'product', 'product_cat' ];
const TEMPLATE_DEFAULTS = { product: 'single-product', product_cat: 'archive-product', shop: 'archive-product' };

// The WordPress post type a row is made as.
export const wpType = ( row ) => ( 'shop' === row.postType ? 'page' : row.postType );
export const hasPost = ( row ) => ! POSTLESS_TYPES.includes( row.postType );
// The template a shop row's tree builds (FR-48-56): its own `template`, else its type's WooCommerce template; null for any other row.
export const builtTemplate = ( row ) => ( SHOP_TYPES.includes( row.postType ) ? row.template || TEMPLATE_DEFAULTS[ row.postType ] : null );

export const rowKey = ( row ) => `${ row.postType }:${ row.slug }`;

const format = ( rows ) => `${ JSON.stringify( rows, null, 2 ) }\n`;
const withoutId = ( row ) => JSON.stringify( { ...row, id: undefined } );

// The rows, refusing a file the write-back could not reproduce byte for byte, or two rows with one key.
export function readPageMap( file ) {
	const text = fs.readFileSync( file, 'utf8' );
	const rows = JSON.parse( text );
	if ( ! Array.isArray( rows ) ) {
		throw new Error( `${ file } is not an array of rows` );
	}
	if ( format( rows ) !== text ) {
		throw new Error( `${ file } is not in the two-space JSON layout the id write-back reproduces; nothing was changed` );
	}
	const seen = new Set();
	for ( const row of rows ) {
		if ( seen.has( rowKey( row ) ) ) {
			throw new Error( `two page-map rows share ${ rowKey( row ) }` );
		}
		seen.add( rowKey( row ) );
	}
	return rows;
}

// Writes `ids` (row key -> post id) into `original`'s rows and nothing else. Refuses when the file on disk no longer
// matches `original` beyond its ids (the map was edited while the run was building).
export function writePageMap( file, original, ids ) {
	const onDisk = JSON.parse( fs.readFileSync( file, 'utf8' ) );
	if ( onDisk.length !== original.length || onDisk.some( ( row, i ) => withoutId( row ) !== withoutId( original[ i ] ) ) ) {
		throw new Error( `${ file } changed while the site build ran; its ids so far: ${ JSON.stringify( ids ) }` );
	}
	const rows = original.map( ( row ) => ( ids[ rowKey( row ) ] ? { ...row, id: ids[ rowKey( row ) ] } : row ) );
	// Written beside the map and renamed over it, so a run stopped mid-write never leaves half a map.
	fs.writeFileSync( `${ file }.tmp`, format( rows ) );
	fs.renameSync( `${ file }.tmp`, file );
	return rows;
}

// The page row a row's `parent` names: by route, else by slug.
export function parentRow( rows, row ) {
	if ( ! row.parent ) {
		return null;
	}
	const pages = rows.filter( ( r ) => r.postType === row.postType );
	return pages.find( ( r ) => r.route === row.parent ) || pages.find( ( r ) => r.slug === row.parent ) || null;
}

// The build order: every content row with its parent before it (map order otherwise), then the layout rows. Throws
// on a parent cycle.
export function orderRows( rows ) {
	const out = [];
	const placing = new Set();
	const place = ( row ) => {
		if ( out.includes( row ) ) {
			return;
		}
		if ( placing.has( row ) ) {
			throw new Error( `the page map's parents loop through ${ rowKey( row ) }` );
		}
		placing.add( row );
		const parent = parentRow( rows, row );
		if ( parent ) {
			place( parent );
		}
		out.push( row );
	};
	rows.filter( ( r ) => ! LAYOUT_TYPES[ r.postType ] ).forEach( place );
	rows.filter( ( r ) => LAYOUT_TYPES[ r.postType ] ).forEach( place );
	return out;
}

// The page-map menu a layout surface binds: its own, except a drawer with no drawer menu, which binds the header menu
// (the bar and the drawer then share one menu and its mega panels, Spec 36 FR-36-6).
export const boundMenu = ( kind, menuNames ) => ( 'drawer' === kind && ! menuNames.includes( 'drawer' ) ? 'header' : kind );

// The layout surface kind a page-map menu feeds: the menu named like a kind, else the build manifest's surface of that
// name (its tree folder `sgs_<kind>`), else the kind its name starts with (`footer-shop`, `drawer-menu-links`); null when
// none. `surfaces` is sites/<client>/build/surfaces.json.
export function menuSurfaceKind( name, surfaces = {} ) {
	const kinds = Object.values( LAYOUT_TYPES );
	if ( kinds.includes( name ) ) {
		return name;
	}
	const fromTree = /(?:^|\/)sgs_([a-z]+)\//.exec( surfaces?.[ name ]?.tree || '' )?.[ 1 ];
	if ( kinds.includes( fromTree ) ) {
		return fromTree;
	}
	return kinds.find( ( k ) => String( name ).split( /[-_\s]+/ )[ 0 ] === k ) || null;
}

// The one-block placeholder tree a row gets until it has a stage 3 tree. A header binds its menu in a bar (whose
// burger opens the active drawer), a drawer binds its menu (boundMenu) inside the drawer dialog; every other row is
// its title. `menuIds` holds an entry (0 until made) for every menu the page map names.
export function placeholderTree( row, menuIds = {} ) {
	const kind = LAYOUT_TYPES[ row.postType ];
	if ( 'header' === kind ) {
		return [ { name: 'sgs/nav-bar-menu', attributes: { ref: menuIds.header || 0 } } ];
	}
	if ( 'drawer' === kind ) {
		return [ { name: 'sgs/nav-drawer', innerBlocks: [ { name: 'sgs/nav-drawer-menu', attributes: { ref: menuIds[ boundMenu( kind, Object.keys( menuIds ) ) ] || 0 } } ] } ];
	}
	return [ { name: 'sgs/heading', attributes: { content: row.title, level: [ 'page', 'post' ].includes( row.postType ) ? 'h1' : 'h2' } } ];
}

// A row's stage 3 tree (sites/<client>/build/trees/<postType>/<slug>.json) when one exists, else its placeholder.
export function treeFor( repo, client, row, menuIds ) {
	const file = path.join( repo, 'sites', client, 'build', 'trees', row.postType, `${ row.slug }.json` );
	return fs.existsSync( file ) ? { tree: JSON.parse( fs.readFileSync( file, 'utf8' ) ), source: path.relative( repo, file ).split( path.sep ).join( '/' ) } : { tree: placeholderTree( row, menuIds ), source: 'placeholder' };
}

// The tree a shop row's template is built from: its stage 3 tree, else the same placeholder a page row gets (FR-48-55 part 1).
// A `shop` row's own page always takes the placeholder; its tree file is the template's.
export const templateTreeFor = ( repo, client, row ) => treeFor( repo, client, row, {} );
export const pageTreeFor = ( repo, client, row, menuIds ) => ( 'shop' === row.postType ? { tree: placeholderTree( row, menuIds ), source: 'placeholder' } : treeFor( repo, client, row, menuIds ) );

// The site a page map's ids were written for, recorded beside the map (`page-map.site`) because the map's own layout
// carries nothing but the ids; null before any run recorded one.
const idsSiteFile = ( mapFile ) => path.join( path.dirname( mapFile ), 'page-map.site' );
export const readIdsSite = ( mapFile ) => ( fs.existsSync( idsSiteFile( mapFile ) ) ? fs.readFileSync( idsSiteFile( mapFile ), 'utf8' ).trim() || null : null );
export const writeIdsSite = ( mapFile, site ) => fs.writeFileSync( idsSiteFile( mapFile ), `${ site }
` );

// The rows as a run against `site` should plan from them: ids written for another site name nothing there, so they are
// dropped (a post carrying a row key is adopted, FR-48-17) and the run's write-back replaces them.
export const rowsForSite = ( rows, idsSite, site ) => ( idsSite && idsSite !== site ? rows.map( ( r ) => ( { ...r, id: null } ) ) : rows );

export const treeHash = ( tree ) => crypto.createHash( 'sha256' ).update( JSON.stringify( tree ) ).digest( 'hex' );

// The ids of the menus the site build made on a site, by menu name, kept in `sites/<client>/build/menu-map.json`
// ({ sites: { <site>: { menus: { <name>: <id> } } } }) so a skeleton can carry a navigation block's `ref` (FR-48-58).
// `menus` is the site state's menu list; only a menu carrying the site build's own mark (owner equal to its slug) counts.
export function writeMenuMap( file, site, menus ) {
	const had = fs.existsSync( file ) ? JSON.parse( fs.readFileSync( file, 'utf8' ) ) : { sites: {} };
	const mine = Object.fromEntries( menus.filter( ( m ) => m.owner === m.slug ).map( ( m ) => [ m.slug, m.id ] ).sort( ( a, b ) => a[ 0 ].localeCompare( b[ 0 ] ) ) );
	const next = { ...had, sites: { ...had.sites, [ site ]: { ...had.sites?.[ site ], menus: mine } } };
	fs.writeFileSync( file, `${ JSON.stringify( next, null, '	' ) }
` );
	return next;
}
