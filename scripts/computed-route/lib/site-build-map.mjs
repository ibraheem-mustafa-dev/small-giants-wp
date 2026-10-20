// The page map as the site build reads and writes it (Spec 48 FR-48-55 over FR-48-30's confirmed
// sites/<client>/build/page-map.json): row keys, the build order, each row's tree and its hash, and the id write-back
// that changes nothing but `id`.
import crypto from 'crypto';
import fs from 'fs';
import path from 'path';

// The layout surfaces whose trees bind a menu, built after the menus; the active pointer each one takes (part 7).
export const LAYOUT_TYPES = { sgs_header: 'header', sgs_drawer: 'drawer', sgs_footer: 'footer' };
// Post types this script cannot build yet: a shop client's product template and catalogue pages (parts 1 and 6).
export const SHOP_TYPES = [ 'product', 'product_cat', 'shop' ];

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

export const treeHash = ( tree ) => crypto.createHash( 'sha256' ).update( JSON.stringify( tree ) ).digest( 'hex' );
