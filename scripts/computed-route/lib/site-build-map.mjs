// The page map as the site build reads and writes it (Spec 48 FR-48-55 over FR-48-30's confirmed
// sites/<client>/build/page-map.json): row keys, the build order, each row's tree and its hash, and the id write-back
// that changes nothing but `id`.
import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import { createRequire } from 'module';

const { slottedContainers } = createRequire( import.meta.url )( '../../lib/surface-tree-shape.js' );

// The layout surfaces whose trees bind a menu, built after the menus; the active pointer each one takes (part 7).
export const LAYOUT_TYPES = { sgs_header: 'header', sgs_drawer: 'drawer', sgs_footer: 'footer' };
// A shop client's rows (FR-48-55 parts 1 and 6, FR-48-56). `product` and `product_cat` rows make no post: the products
// and categories are WooCommerce's data, and the row's tree builds the site's own copy of its template. A `shop` row is
// the WooCommerce shop page (a `page`, whose id is `woocommerce_shop_page_id`) and its tree builds the archive template.
export const SHOP_TYPES = [ 'product', 'product_cat', 'shop' ];
// A `template` row (the order confirmation, a draft's search results or not-found page) makes no post either: it is a
// surface of the template it names (FR-48-56).
export const POSTLESS_TYPES = [ 'product', 'product_cat', 'template' ];
const TEMPLATE_DEFAULTS = { product: 'single-product', product_cat: 'archive-product', shop: 'archive-product' };

// WooCommerce's account page: an ordinary page whose content holds WooCommerce's account piece, `sgs/account`.
export const isAccountRow = ( row ) => 'page' === row?.postType && [ 'my-account', 'account' ].includes( row.slug );

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

// The page-map menus a drawer owns among the names a caller holds, as a stable order for a caller that has no page map in hand:
// `drawer` first, then the rest by name with numbers in numeric order. The draft's own order (a labelled group is named
// `drawer-<aria-label>`, so the names do not sort the way the groups sit) comes from lib/site-build-menus.mjs::surfaceMenus.
export const drawerMenuNames = ( menuNames ) => menuNames.filter( ( n ) => 'drawer' === n || n.startsWith( 'drawer-' ) )
	.sort( ( a, b ) => ( 'drawer' === a ? -1 : 'drawer' === b ? 1 : a.localeCompare( b, 'en', { numeric: true } ) ) );

// The page-map menu a layout surface binds: its own. A drawer binds the menu the page map made for its `index`-th
// navigation group (null when it has fewer menus than groups), except a drawer with no menu of its own, which binds the header
// menu (the bar and the drawer then share one menu and its mega panels, Spec 36 FR-36-6). `own`, when given, is the drawer
// surface's own menus in the draft's document order (lib/site-build-menus.mjs::surfaceMenus): the group binds `own[ index ]`
// when `menuNames` holds it, so a group whose menu is not made yet binds none instead of the next group's, and menus of
// another drawer never count. Without `own` (a caller that knows only the recorded names) the names are taken in
// drawerMenuNames' order.
export function boundMenu( kind, menuNames, index = 0, own = null ) {
	if ( 'drawer' !== kind ) {
		return kind;
	}
	if ( own?.length ) {
		return menuNames.includes( own[ index ] ) ? own[ index ] : null;
	}
	const named = drawerMenuNames( menuNames );
	return named.length ? named[ index ] ?? null : 'header';
}

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
// burger opens the active drawer), a drawer holds one menu block per menu it owns (drawerMenuNames) inside the drawer dialog; every other row is
// its title. `menuIds` holds an entry (0 until made) for every menu the page map names.
// A header or footer post's template locks one slotted root (`sgs/site-header`, `sgs/site-footer`) holding its rows
// (scripts/lib/surface-tree-shape.js, read from each container's edit.js TEMPLATE), so its placeholder is that root with
// its rows; the header's menu bar sits in its middle row.
// `own`, when given, is the drawer's own menu names in the draft's order (lib/site-build-menus.mjs::surfaceMenus).
export function placeholderTree( row, menuIds = {}, own = null ) {
	const kind = LAYOUT_TYPES[ row.postType ];
	const root = `sgs/site-${ kind }`;
	const rows = ( 'header' === kind || 'footer' === kind ) ? slottedContainers().get( root ) : null;
	if ( rows ) {
		const bar = { name: 'sgs/nav-bar-menu', attributes: { ref: menuIds.header || 0 } };
		return [ { name: root, innerBlocks: rows.map( ( r ) => ( { name: r.name, attributes: { rowSlot: r.rowSlot }, innerBlocks: 'header' === kind && 'middle' === r.rowSlot ? [ bar ] : [] } ) ) } ];
	}
	if ( 'header' === kind ) {
		return [ { name: 'sgs/nav-bar-menu', attributes: { ref: menuIds.header || 0 } } ];
	}
	if ( 'drawer' === kind ) {
		const names = own?.length ? own : drawerMenuNames( Object.keys( menuIds ) );
		return [ { name: 'sgs/nav-drawer', innerBlocks: ( names.length ? names : [ 'header' ] ).map( ( name ) => ( { name: 'sgs/nav-drawer-menu', attributes: { ref: menuIds[ name ] || 0 } } ) ) } ];
	}
	// The account page always holds WooCommerce's working account piece, so it is never a placeholder heading.
	if ( isAccountRow( row ) ) {
		return [ { name: 'sgs/account' } ];
	}
	// A post's design, its title included, is the site's own single copy (FR-48-56), so its placeholder is an empty body,
	// never a second title heading.
	if ( 'post' === row.postType ) {
		return [ { name: 'sgs/text', attributes: { text: '' } } ];
	}
	return [ { name: 'sgs/heading', attributes: { content: row.title, level: 'page' === row.postType ? 'h1' : 'h2' } } ];
}

// A row's stage 3 tree (sites/<client>/build/trees/<postType>/<slug>.json) when one exists, else its placeholder.
export function treeFor( repo, client, row, menuIds, own = null ) {
	const file = path.join( repo, 'sites', client, 'build', 'trees', row.postType, `${ row.slug }.json` );
	return fs.existsSync( file ) ? { tree: JSON.parse( fs.readFileSync( file, 'utf8' ) ), source: path.relative( repo, file ).split( path.sep ).join( '/' ) } : { tree: placeholderTree( row, menuIds, own ), source: 'placeholder' };
}

// The tree a shop row's template is built from: its stage 3 tree, else the same placeholder a page row gets (FR-48-55 part 1).
// A `shop` row's own page always takes the placeholder; its tree file is the template's.
export const templateTreeFor = ( repo, client, row ) => treeFor( repo, client, row, {} );
export const pageTreeFor = ( repo, client, row, menuIds, own = null ) => ( 'shop' === row.postType ? { tree: placeholderTree( row, menuIds, own ), source: 'placeholder' } : treeFor( repo, client, row, menuIds, own ) );

// The site a page map's ids were written for, recorded beside the map (`page-map.site`) because the map's own layout
// carries nothing but the ids; null before any run recorded one.
const idsSiteFile = ( mapFile ) => path.join( path.dirname( mapFile ), 'page-map.site' );
export const readIdsSite = ( mapFile ) => ( fs.existsSync( idsSiteFile( mapFile ) ) ? fs.readFileSync( idsSiteFile( mapFile ), 'utf8' ).trim() || null : null );
export const writeIdsSite = ( mapFile, site ) => fs.writeFileSync( idsSiteFile( mapFile ), `${ site }
` );

// The site a name stands for: a scratch copy (`scratchOf` in the calibration targets) holds its source's posts and ids, so it
// resolves to the source, following a chain of copies. Names in a `scratchOf` loop resolve to the first of them in sort order.
export function siteOf( name, targets = {} ) {
	const seen = [];
	let at = name;
	while ( at && Object.hasOwn( targets, at ) && targets[ at ]?.scratchOf ) {
		if ( seen.includes( at ) ) {
			return [ ...seen ].sort()[ 0 ];
		}
		seen.push( at );
		at = targets[ at ].scratchOf;
	}
	return at;
}

// The site whose post ids a name holds: a scratch copy is the site it copies (`siteOf`), and a mirror is the test site it is a
// database copy of (`mirrorOf`), so a copy of a mirror holds its test site's ids.
const idsHolder = ( name, targets ) => {
	const site = siteOf( name, targets );
	return siteOf( ( site && Object.hasOwn( targets, site ) && targets[ site ]?.mirrorOf ) || site, targets );
};

// The rows as a run against `site` should plan from them: ids written for another site name nothing there, so they are
// dropped (a post carrying a row key is adopted, FR-48-17) and the run's write-back replaces them. A scratch copy counts as
// the site it copies and a mirror as its test site (`idsHolder` through `targets`); with no `targets` the names are compared
// as they stand.
export const rowsForSite = ( rows, idsSite, site, targets = {} ) => ( idsSite && idsHolder( idsSite, targets ) !== idsHolder( site, targets ) ? rows.map( ( r ) => ( { ...r, id: null } ) ) : rows );

// Whether the ids a page map holds for `idsSite` are only presumed to be `site`'s: they were written on a different name that
// holds the same ids (a mirror and the test site it is a copy of, or a scratch copy of either). The two databases drift after
// the copy (the clone is built on the mirror, then copied over), so such an id may name another post, or none, on `site`; the
// planner checks each one and falls back to the row key (lib/site-build-plan.mjs::planBuild, `provisionalIds`).
export const idsProvisional = ( idsSite, site, targets = {} ) => !! idsSite && idsSite !== site && idsHolder( idsSite, targets ) === idsHolder( site, targets );

export const treeHash = ( tree ) => crypto.createHash( 'sha256' ).update( JSON.stringify( tree ) ).digest( 'hex' );

// The identifier the menu blocks give a classic menu item (sgs/nav-bar-menu and sgs/nav-drawer-menu render.php::from_link
// over SGS_Nav_Menu_Source::classic_items_to_blocks, which passes the item's object id): `id:<object id>` whenever that id is
// not 0, else `label:<label>`. WordPress gives a custom link its own item id as object id, so a custom item's identifier is
// a fact of the site it was made on. `item` is a site state menu item ({ objectId, shown }).
export const itemIdentifier = ( item ) => ( Number( item.objectId ) ? `id:${ Number( item.objectId ) }` : `label:${ item.shown ?? item.title }` );

// The ids of the menus the site build made on a site, by menu name, and the identifier of each of their top-level items by
// the label it shows, kept in `sites/<client>/build/menu-map.json` ({ sites: { <site>: { menus: { <name>: <id> }, items:
// { <name>: { <label>: <identifier> } } } } }) so a skeleton can carry a navigation block's `ref` and its `disabledItemIds`
// (FR-48-58). `menus` is the site state's menu list; only a menu carrying the site build's own mark (owner equal to its
// slug) counts.
export function writeMenuMap( file, site, menus ) {
	const had = fs.existsSync( file ) ? JSON.parse( fs.readFileSync( file, 'utf8' ) ) : { sites: {} };
	const owned = menus.filter( ( m ) => m.owner === m.slug ).sort( ( a, b ) => a.slug.localeCompare( b.slug ) );
	const mine = Object.fromEntries( owned.map( ( m ) => [ m.slug, m.id ] ) );
	const items = Object.fromEntries( owned.map( ( m ) => [ m.slug, Object.fromEntries( ( m.items || [] ).filter( ( it ) => ! Number( it.parent ) ).map( ( it ) => [ it.shown ?? it.title, itemIdentifier( it ) ] ) ) ] ).filter( ( [ , v ] ) => Object.keys( v ).length ) );
	const { items: _stale, ...kept } = had.sites?.[ site ] || {};
	const next = { ...had, sites: { ...had.sites, [ site ]: { ...kept, menus: mine, ...( Object.keys( items ).length ? { items } : {} ) } } };
	fs.writeFileSync( file, `${ JSON.stringify( next, null, '	' ) }
` );
	return next;
}
